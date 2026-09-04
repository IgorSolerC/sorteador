import { signal } from '@angular/core';

import { ReviewCriterion, ReviewStatus, SpinRecord, SpinSeat } from './group-log';
import { participantKey } from './naming';

/**
 * A orquestração da ficha do jogo: qual giro está aberto, qual face dela está à mostra, o
 * que o servidor respondeu, e o foco de quem abriu. A máquina e o álbum abrem a mesma
 * ficha sobre os mesmos giros, então esta parte vive fora dos dois — quem usa só diz como
 * gravar.
 *
 * Quatro faces e nunca quatro camadas. Empilhar um modal sobre o outro deixaria dois véus
 * e dois `aria-modal` disputando a mesma tecla Esc; aqui o Esc volta uma face por vez, e a
 * ficha é sempre para onde se volta.
 */
export type SheetFace = 'ficha' | 'resenha' | 'jogo' | 'mesa';

export interface NoteDraft {
  title: string;
  description: string;
}

export interface ReviewDraft {
  score: number | null;
  criteria: Partial<Record<ReviewCriterion, number>>;
  status: ReviewStatus | null;
  /** Quantas horas o jogo tomou. `null` é "não contei", e é o padrão. */
  hours: number | null;
  text: string;
}

export interface BenchWriters {
  /** Grava o jogo — título e descrição — e recarrega o grupo. Lançar aqui é recusar. */
  annotate(spinIndex: number, note: NoteDraft): Promise<void>;
  /** Grava a resenha de quem está assinando. */
  review(spinIndex: number, draft: ReviewDraft): Promise<void>;
  /** Retira a resenha de quem está assinando. */
  withdraw(spinIndex: number): Promise<void>;
  /** Põe ou tira alguém da mesa daquele jogo. Não toca no sorteio. */
  seat(spinIndex: number, memberId: string, seated: boolean): Promise<void>;
}

export class GameBench {
  readonly spinIndex = signal<number | null>(null);
  readonly face = signal<SheetFace>('ficha');
  readonly error = signal('');
  readonly saving = signal(false);
  private invoker: HTMLElement | null = null;

  constructor(
    private readonly document: Document,
    private readonly writers: BenchWriters,
    private readonly explain: (error: unknown) => string,
  ) {}

  /** A ficha abre para ler. Escrever é a decisão seguinte, e ela tem nome próprio. */
  open(spin: SpinRecord, event?: Event): void {
    this.invoker = (event?.currentTarget as HTMLElement | null) ?? null;
    this.error.set('');
    this.face.set('ficha');
    this.spinIndex.set(spin.index);
  }

  show(face: SheetFace): void {
    if (this.saving()) return;
    this.error.set('');
    this.face.set(face);
    // O foco entra na face nova; sem isto o teclado ficaria na face que saiu de vista.
    this.focusLater(face === 'ficha' ? 'sheet-close' : 'sheet-back');
  }

  /** Esc e "Voltar" andam uma face de cada vez; da ficha, saem da ficha. */
  back(): void {
    if (this.saving()) return;
    if (this.face() === 'ficha') this.close();
    else this.show('ficha');
  }

  close(): void {
    if (this.saving()) return;
    this.spinIndex.set(null);
    this.face.set('ficha');
    this.error.set('');
    const invoker = this.invoker;
    this.invoker = null;

    // Quem abriu recebe o foco de volta — mas só depois do desenho, porque o convite em
    // branco vira jogo escrito e some da página. Sem o segundo alvo o teclado ficaria
    // largado no topo do documento exatamente na vez em que o jogo foi escrito.
    window.setTimeout(() => {
      const target = invoker && this.document.contains(invoker)
        ? invoker
        : this.document.querySelector<HTMLElement>('.note-sticker');
      target?.focus();
    }, 0);
  }

  /** A resenha desta pessoa neste giro, quando ela já escreveu uma. */
  mine(spin: SpinRecord | null, author: string) {
    const key = participantKey(author);
    return key ? spin?.reviews.find((review) => review.authorKey === key) ?? null : null;
  }

  /** Devolve o aviso a mostrar quando deu certo, ou `null` quando a ficha segue aberta. */
  async commitNote(spin: SpinRecord, draft: NoteDraft): Promise<string | null> {
    const title = draft.title.trim();
    const description = draft.description.trim();

    // O título é o nome do jogo, e é ele que aparece no registro e no álbum. Sem ele a
    // descrição ficaria pendurada em nada, e ninguém saberia o que o clube jogou.
    if (!title && description) {
      this.error.set('Dê um nome ao jogo: é ele que aparece no registro.');
      return null;
    }
    if (!title && !description) {
      if (spin.note) return this.removeNote(spin);
      this.error.set('Escreva ao menos o nome do jogo para etiquetar este giro.');
      return null;
    }

    return this.write(
      () => this.writers.annotate(spin.index, { title, description }),
      `${title} entrou na cápsula de ${spin.winnerName}.`,
    );
  }

  removeNote(spin: SpinRecord): Promise<string | null> {
    return this.write(
      () => this.writers.annotate(spin.index, { title: '', description: '' }),
      `O jogo saiu da cápsula de ${spin.winnerName}. As resenhas continuam, e a retirada fica no registro.`,
    );
  }

  async commitReview(spin: SpinRecord, draft: ReviewDraft): Promise<string | null> {
    if (draft.score === null) {
      this.error.set('Dê a nota final: é a única nota que a resenha cobra.');
      return null;
    }
    if (draft.status === null) {
      this.error.set('Diga como você terminou: platinado, finalizado ou incompleto.');
      return null;
    }

    return this.write(
      () => this.writers.review(spin.index, draft),
      `Resenha guardada em ${spin.note?.title ?? 'a cápsula de ' + spin.winnerName}.`,
    );
  }

  removeReview(spin: SpinRecord): Promise<string | null> {
    return this.write(
      () => this.writers.withdraw(spin.index),
      'Sua resenha saiu da conta. A retirada fica no registro.',
    );
  }

  /**
   * Corrigir a mesa devolve à própria mesa, e não à ficha: quem está acertando o elenco
   * costuma acertar duas ou três pessoas seguidas, e voltar a cada uma seria uma viagem
   * de ida e volta por pessoa.
   */
  commitSeat(spin: SpinRecord, seat: SpinSeat, seated: boolean): Promise<string | null> {
    if (!seat.memberId) {
      this.error.set(`${seat.name} assinou uma resenha e não é do grupo: só saindo dela.`);
      return Promise.resolve(null);
    }
    return this.write(
      () => this.writers.seat(spin.index, seat.memberId, seated),
      seated
        ? `${seat.name} entrou na mesa deste jogo.`
        : `${seat.name} saiu da mesa deste jogo.`,
      'mesa',
    );
  }

  private async write(
    operation: () => Promise<void>,
    message: string,
    back: SheetFace = 'ficha',
  ): Promise<string | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    this.error.set('');
    try {
      await operation();
      // Baixar a bandeira antes de voltar: `show()` e `close()` se recusam a mexer numa
      // bancada que ainda está gravando.
      this.saving.set(false);
      this.show(back);
      return message;
    } catch (error) {
      // O erro fica na face, ao lado dos campos: voltar levaria embora o texto digitado.
      this.saving.set(false);
      this.error.set(this.explain(error));
      return null;
    }
  }

  private focusLater(id: string): void {
    window.setTimeout(() => this.document.getElementById(id)?.focus(), 0);
  }
}
