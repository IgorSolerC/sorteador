import { CommonModule, DOCUMENT } from '@angular/common';
import { albumMetrics } from './album-metrics';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import {
  completionShare,
  owesReview,
  pendingReviews,
  formatScore,
  GroupMember,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUSES,
  reviewersLabel,
  ReviewCriterion,
  SpinRecord,
  SpinSeat,
  memberByAuthor,
  membersById,
  spinScores,
} from './group-log';
import { GroupSnapshot, UsageBlockedError } from './group-store';
import { GROUP_STORE } from './firebase-app';
import { Identity } from './identity';
import { participantKey } from './naming';
import { renderAlbumPoster } from './album-poster';
import { capsuleColor, capsuleInk } from './palette';
import { rememberGroup } from './recent-groups';
import { GameBench, NoteDraft, ReviewDraft, SheetFace } from './game-bench';
import { GameSheet } from './game-sheet';
import { OwedNote } from './owed-note';
import { Notice } from './notice';

/**
 * O álbum: toda cápsula que já saiu da máquina, com a etiqueta colada nela. A máquina
 * mostra o giro de agora; aqui mora o que o clube jogou, mês a mês, para trás.
 *
 * A página lê o mesmo log e não escreve nada além de etiqueta — nenhum giro acontece aqui.
 */

export interface WinnerTally {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly emoji: string;
  readonly wins: number;
  readonly labelled: number;
}

export interface RoundSection {
  /** O que a régua diz à esquerda: "Rodada 3", ou o critério que ordenou a parede. */
  readonly label: string;
  readonly spins: readonly SpinRecord[];
}

/**
 * Como a parede está ordenada. `rodada` é a ordem do registro — a mais nova primeiro, e a
 * régua de rodada separando as faixas —, e é o padrão porque o álbum é antes de tudo uma
 * linha do tempo. Qualquer outra ordem desmancha as rodadas: comparar a nota de jogos de
 * meses diferentes é justamente o que essas ordens servem para fazer.
 */
export type AlbumSort =
  | 'rodada' | 'nota' | 'tempo'
  | 'diversao' | 'historia' | 'qualidade' | 'jogabilidade' | 'dificuldade';

export const ALBUM_SORTS: readonly { readonly key: AlbumSort; readonly label: string }[] = [
  { key: 'rodada', label: 'Rodada' },
  { key: 'nota', label: 'Nota do clube' },
  { key: 'diversao', label: 'Diversão' },
  { key: 'historia', label: 'História' },
  { key: 'qualidade', label: 'Qualidade' },
  { key: 'jogabilidade', label: 'Jogabilidade' },
  { key: 'dificuldade', label: 'Dificuldade' },
  { key: 'tempo', label: 'Tempo de jogo' },
];

/** Inclinações fixas por posição: a parede nunca se remexe entre duas visitas. */
const TILTS = [-1.7, 1.1, -0.7, 1.8, -1.3, 0.8] as const;

@Component({
  selector: 'app-group-history',
  imports: [CommonModule, GameSheet, OwedNote],
  templateUrl: './group-history.html',
  styleUrl: './group-history.scss',
})
export class GroupHistory {
  readonly groupId = input.required<string>();
  /** Pedido de trocar de pessoa, que a casca resolve reabrindo a porta. */
  readonly changeIdentity = input<() => void>(() => {});

  private readonly document = inject(DOCUMENT);
  private readonly store = inject(GROUP_STORE);
  private readonly identity = inject(Identity);

  protected readonly author = this.identity.name;
  /**
   * O crachá do cabeçalho é a cápsula DESTA pessoa neste grupo: a cor que ela escolheu e o
   * emoji dela, os mesmos do aro, do registro, da gaveta e do álbum. A identidade visual de
   * uma pessoa é a mesma em toda parte do produto, e aqui era o último lugar onde não era —
   * a cor saía de um hash do nome, e o disco ficava de uma cor na barra e de outra dois
   * dedos abaixo, no mesmo giro dela.
   *
   * Fora de um grupo não há cápsula: a prateleira e a oficina continuam com a cor tirada do
   * nome, que é o que faz o crachá ser o mesmo em toda tela mesmo sem grupo nenhum. E quem
   * abre o link sem estar na lista também — um convidado não tem cápsula para vestir.
   */
  private readonly myCapsule = computed(() => memberByAuthor(this.everyone(), this.author()));

  protected readonly authorColor = computed(() => {
    const mine = this.myCapsule();
    return mine ? capsuleColor(mine.colorIndex) : this.identity.color();
  });

  protected readonly authorInk = computed(() => {
    const mine = this.myCapsule();
    return mine ? capsuleInk(mine.colorIndex) : this.identity.ink();
  });

  /** O emoji da pessoa quando ela tem um; as iniciais quando não, como em toda cápsula. */
  protected readonly authorMark = computed(
    () => this.myCapsule()?.emoji || this.identity.initials(),
  );

  protected readonly snapshot = signal<GroupSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  /** O rodapé de confirmação. Um relógio por vez: ver `Notice`. */
  private readonly toast = new Notice();
  protected readonly notice = this.toast.text;
  /** Id da pessoa em foco; vazio é a parede inteira. */
  protected readonly filterId = signal('');

  private readonly bench = new GameBench(
    this.document,
    {
      annotate: (spinIndex, note) =>
        this.store
          .annotateSpin(this.groupId(), spinIndex, note, this.identity.name())
          .then(() => this.reload(this.groupId())),
      review: (spinIndex, draft) =>
        this.store
          .reviewSpin(
            this.groupId(),
            spinIndex,
            {
              score: draft.score!,
              criteria: draft.criteria,
              status: draft.status!,
              hours: draft.hours,
              text: draft.text,
            },
            this.identity.name(),
          )
          .then(() => this.reload(this.groupId())),
      withdraw: (spinIndex) =>
        this.store
          .withdrawReview(this.groupId(), spinIndex, this.identity.name())
          .then(() => this.reload(this.groupId())),
      seat: (spinIndex, memberId, seated) =>
        this.store
          .seatSpin(this.groupId(), spinIndex, memberId, seated, this.identity.name())
          .then(() => this.reload(this.groupId())),
      react: (spinIndex, target, emoji, reacted) =>
        this.store
          .reactToReview(this.groupId(), spinIndex, target, emoji, reacted, this.identity.name())
          .then(() => this.reload(this.groupId())),
    },
    (error) => explain(error),
  );

  protected readonly editingSpinIndex = this.bench.spinIndex;
  protected readonly sheetFace = this.bench.face;
  protected readonly noteError = this.bench.error;
  protected readonly savingNote = this.bench.saving;

  constructor() {
    effect(() => {
      const id = this.groupId();
      if (!id) return;
      if (untracked(this.snapshot)?.groupId !== id) this.snapshot.set(null);
      void this.reload(id);
    });
    // Ir do álbum para a máquina não pode deixar para trás um relógio que ainda vai apagar
    // um aviso de uma página que não está mais na tela.
    inject(DestroyRef).onDestroy(() => this.toast.stop());
  }

  // --- o que a parede mostra ---

  protected readonly spins = computed<readonly SpinRecord[]>(
    () => this.snapshot()?.state.spins ?? [],
  );

  protected readonly labelled = computed(() => this.spins().filter((spin) => spin.note).length);

  protected readonly SORTS = ALBUM_SORTS;
  protected readonly STATUSES = REVIEW_STATUSES;
  protected readonly STATUS_LABELS = REVIEW_STATUS_LABELS;

  /**
   * O boletim do álbum inteiro. A nota do clube é a média das notas dos JOGOS, não das
   * resenhas soltas: um jogo que cinco pessoas resenharam não pesa cinco vezes mais que
   * um que uma pessoa resenhou — a parede é de jogos.
   */
  protected readonly albumStats = computed(() => {
    const marcados = this.spins().map((spin) => spinScores(spin)).filter((conta) => conta.count);
    const resenhas = marcados.reduce((total, conta) => total + conta.count, 0);
    const platinados = marcados.reduce((total, conta) => total + conta.completion.platinado, 0);
    const soma = marcados.reduce((total, conta) => total + (conta.score ?? 0), 0);

    return {
      jogos: marcados.length,
      resenhas,
      score: marcados.length ? formatScore(soma / marcados.length) : '—',
      platinado: resenhas ? Math.round((platinados / resenhas) * 100) : 0,
    };
  });

  /**
   * Quem está no grupo hoje e quem já saiu dele: o álbum precisa dos dois, porque uma
   * pessoa que deixou o clube continua tendo cápsulas na parede.
   */
  private readonly people = computed<ReadonlyMap<string, GroupMember>>(() => {
    const snap = this.snapshot();
    return snap ? membersById(snap.state) : new Map();
  });

  /**
   * Todo mundo que o grupo já teve. A mesa de um giro de um ano atrás pode precisar de
   * quem saiu do clube depois, então aqui não vale só quem está ativo hoje.
   */
  protected readonly everyone = computed<readonly GroupMember[]>(() => {
    const snap = this.snapshot();
    return snap ? [...membersById(snap.state).values()] : [];
  });

  /** Uma pessoa por cápsula que já saiu, com quantas vezes saiu e quantas foi etiquetada. */
  protected readonly winners = computed<readonly WinnerTally[]>(() => {
    const tally = new Map<string, {
      id: string; name: string; color: string; emoji: string; wins: number; labelled: number;
    }>();
    const people = this.people();
    for (const spin of this.spins()) {
      const found = tally.get(spin.winnerId);
      if (found) {
        found.wins += 1;
        if (spin.note) found.labelled += 1;
        continue;
      }
      // A cor é a da pessoa, não a da posição da cápsula: quem escolheu menta é menta na
      // parede inteira, e continua menta depois de sair do grupo.
      const member = people.get(spin.winnerId);
      tally.set(spin.winnerId, {
        id: spin.winnerId,
        name: spin.winnerName,
        color: capsuleColor(member?.colorIndex ?? 0),
        emoji: member?.emoji ?? '',
        wins: 1,
        labelled: spin.note ? 1 : 0,
      });
    }
    return [...tally.values()].sort(
      (a, b) => b.wins - a.wins || a.name.localeCompare(b.name, 'pt-BR'),
    );
  });

  /**
   * Rodadas da mais nova para a mais antiga, e dentro de cada uma o giro mais recente
   * primeiro: quem abre o álbum quer ver o que acabou de acontecer, não a origem.
   */
  protected readonly sort = signal<AlbumSort>('rodada');

  protected readonly rounds = computed<readonly RoundSection[]>(() => {
    const focus = this.filterId();
    const visiveis = this.spins().filter((spin) => !focus || spin.winnerId === focus);
    const ordem = this.sort();

    if (ordem !== 'rodada') {
      // Uma ordem por medida fura as rodadas de propósito: ela existe para comparar jogos
      // de meses diferentes, e uma régua de rodada por cartão não separaria nada.
      const nome = ALBUM_SORTS.find((option) => option.key === ordem)?.label ?? '';
      const ranked = [...visiveis].sort((a, b) => {
        const ordenado = (this.rankOf(b, ordem) ?? -1) - (this.rankOf(a, ordem) ?? -1);
        // Empate — e todo jogo sem nota nenhuma empata em -1 — cai na ordem do registro.
        return ordenado || b.index - a.index;
      });
      return ranked.length ? [{ label: `Por ${nome.toLowerCase()}`, spins: ranked }] : [];
    }

    const byRound = new Map<number, SpinRecord[]>();
    for (const spin of visiveis) {
      const list = byRound.get(spin.round);
      if (list) list.push(spin);
      else byRound.set(spin.round, [spin]);
    }

    return [...byRound.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([round, spins]) => ({ label: `Rodada ${round}`, spins: [...spins].reverse() }));
  });

  /** O valor por onde a parede se ordena. `null` é "este jogo não tem o que comparar". */
  private rankOf(spin: SpinRecord, ordem: AlbumSort): number | null {
    const conta = spinScores(spin);
    if (ordem === 'nota') return conta.score;
    if (ordem === 'tempo') return conta.hours?.average ?? null;
    return conta.criteria[ordem as ReviewCriterion]?.average ?? null;
  }

  protected orderBy(key: AlbumSort): void {
    this.sort.set(key);
  }

  /**
   * A mesma escolha vinda do seletor do celular. O valor de um `<select>` é uma string
   * qualquer, então ele é conferido contra a lista antes de virar ordem: um `value`
   * inventado no console deixaria a parede sem régua e sem cartão nenhum.
   */
  protected orderByValue(event: Event): void {
    const value = (event.target as HTMLSelectElement | null)?.value ?? '';
    const option = ALBUM_SORTS.find((sort) => sort.key === value);
    if (option) this.sort.set(option.key);
  }

  protected metricsOf(spin: SpinRecord) {
    return albumMetrics(spin, this.sort());
  }

  protected readonly visibleCount = computed(() =>
    this.rounds().reduce((total, section) => total + section.spins.length, 0),
  );

  protected readonly focused = computed<WinnerTally | null>(() => {
    const id = this.filterId();
    return id ? this.winners().find((winner) => winner.id === id) ?? null : null;
  });

  protected readonly editingSpin = computed<SpinRecord | null>(() => {
    const index = this.editingSpinIndex();
    const snap = this.snapshot();
    if (index === null || !snap) return null;
    return snap.state.spins[index] ?? null;
  });

  protected readonly editingColor = computed(() => {
    const spin = this.editingSpin();
    return spin ? this.colorOf(spin) : capsuleColor(0);
  });

  protected readonly editingEmoji = computed(() => {
    const spin = this.editingSpin();
    return spin ? this.emojiOf(spin) : '';
  });

  protected readonly machineUrl = computed(
    () => `${location.href.split('#')[0]}#/g/${this.groupId()}`,
  );

  protected colorOf(spin: SpinRecord): string {
    return capsuleColor(this.people().get(spin.winnerId)?.colorIndex ?? 0);
  }

  protected inkOf(spin: SpinRecord): string {
    return capsuleInk(this.people().get(spin.winnerId)?.colorIndex ?? 0);
  }

  protected emojiOf(spin: SpinRecord): string {
    return this.people().get(spin.winnerId)?.emoji ?? '';
  }

  // --- o boletim de um jogo, que é o que o cartão do álbum mostra ---

  protected scoresOf(spin: SpinRecord) {
    return spinScores(spin);
  }

  protected shareOf(spin: SpinRecord) {
    return completionShare(spinScores(spin));
  }

  /** Quantas pessoas já escreveram sobre um jogo. É o que um cartão lacrado ainda diz. */
  protected readonly reviewersLabel = reviewersLabel;

  // --- o lacre e o que esta pessoa deve ---

  private readonly myKey = computed(() => participantKey(this.identity.name()));

  /**
   * Um cartão fica lacrado quando esta pessoa jogou aquele jogo e ainda não resenhou.
   * Sempre, e não sob um interruptor: ver `sealed` em `game-sheet.ts`.
   */
  /**
   * Um giro **sem jogo escrito** nunca lacra: não há nota a esconder, e o cartão já diz a
   * ausência uma vez. Dizer "Sem jogo escrito" e "Lacrado até você resenhar" no mesmo
   * cartão é a mesma ausência dita duas vezes — e a segunda ainda promete um boletim que
   * não existe. `pendingReviews()` e o pôster já conferiam o jogo antes; a parede, não.
   */
  protected sealedOf(spin: SpinRecord): boolean {
    return !!spin.note && owesReview(spin, this.myKey());
  }

  protected readonly pending = computed(() => {
    const state = this.snapshot()?.state;
    return state ? pendingReviews(state, this.myKey()) : [];
  });

  /** A cor da cápsula de um giro, como a plaqueta das pendências a pede: já ligada a `this`. */
  protected readonly capsuleOf = (spin: SpinRecord): string => this.colorOf(spin);

  protected openReview({ spin, event }: { spin: SpinRecord; event: Event }): void {
    this.bench.open(spin, event);
    this.bench.show('resenha');
  }

  // --- o álbum como imagem ---

  protected readonly saving = signal(false);

  /**
   * Desenha a parede num canvas e a entrega como PNG. É o que sai do produto e vai parar
   * no grupo do clube — por isso ela leva o nome, a conta e as cápsulas, e **nunca o
   * link**: o link é a credencial deste grupo, e uma imagem compartilhada é pública.
   *
   * Sai o que está na tela: o filtro de pessoa e a ordem escolhida valem para a imagem
   * também. Quem separou os dez melhores quer a parede dos dez melhores.
   */
  protected async savePoster(): Promise<void> {
    const snap = this.snapshot();
    if (!snap || this.saving()) return;
    this.saving.set(true);
    try {
      const blob = await renderAlbumPoster({
        groupName: snap.name,
        sections: this.rounds(),
        sort: this.sort(),
        sealedOf: (spin) => this.sealedOf(spin),
        colorOf: (spin) => this.colorOf(spin),
        inkOf: (spin) => this.inkOf(spin),
        emojiOf: (spin) => this.emojiOf(spin),
      });
      const url = URL.createObjectURL(blob);
      const link = this.document.createElement('a');
      link.href = url;
      link.download = `album-${slug(snap.name)}.png`;
      link.click();
      // Sem revogar, cada salvamento deixa a imagem inteira presa na memória da aba.
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      this.showNotice('O álbum foi salvo como imagem.');
    } catch {
      this.showNotice('Não deu para desenhar a imagem do álbum neste navegador.');
    } finally {
      this.saving.set(false);
    }
  }

  protected askIdentityChange(): void {
    this.changeIdentity()();
  }

  protected tiltFor(index: number): string {
    return `${TILTS[index % TILTS.length]}deg`;
  }

  // --- ações ---

  protected focusOn(id: string): void {
    this.filterId.update((current) => (current === id ? '' : id));
  }

  protected clearFocus(): void {
    this.filterId.set('');
  }

  protected openSheet(spin: SpinRecord, event?: Event): void {
    this.bench.open(spin, event);
  }

  protected showFace(face: SheetFace): void {
    this.bench.show(face);
  }

  protected closeNote(): void {
    this.bench.close();
  }

  protected async commitNote(draft: NoteDraft): Promise<void> {
    await this.afterBench((spin) => this.bench.commitNote(spin, draft));
  }

  protected async removeNote(): Promise<void> {
    await this.afterBench((spin) => this.bench.removeNote(spin));
  }

  protected async commitReview(draft: ReviewDraft): Promise<void> {
    await this.afterBench((spin) => this.bench.commitReview(spin, draft));
  }

  protected async removeReview(): Promise<void> {
    await this.afterBench((spin) => this.bench.removeReview(spin));
  }

  protected async commitSeat(change: { seat: SpinSeat; seated: boolean }): Promise<void> {
    await this.afterBench((spin) => this.bench.commitSeat(spin, change.seat, change.seated));
  }

  /**
   * Reagir não avisa nada no rodapé: o resultado já está na fileira, embaixo do dedo. Um
   * aviso por emoji encheria a tela de recados sobre a própria mão de quem os leu.
   */
  protected async commitReaction(
    change: { target: string; emoji: string; reacted: boolean },
  ): Promise<void> {
    const spin = this.editingSpin();
    if (!spin) return;
    await this.bench.commitReaction(spin, change.target, change.emoji, change.reacted);
  }

  private async afterBench(operation: (spin: SpinRecord) => Promise<string | null>): Promise<void> {
    const spin = this.editingSpin();
    if (!spin) return;
    const message = await operation(spin);
    if (message) this.showNotice(message);
  }

  protected dismissNotice(): void {
    this.toast.dismiss();
  }

  // --- infraestrutura ---

  private async reload(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const snapshot = await this.store.load(id);
      this.snapshot.set(snapshot);
      this.error.set('');
      // O título da aba nomeia o grupo: um álbum aberto entre dez abas precisa se anunciar.
      this.document.title = `O álbum · ${snapshot.name} · Mesa do Mês`;
      rememberGroup(snapshot.groupId, snapshot.name);
    } catch (error) {
      this.error.set(explain(error));
    } finally {
      this.loading.set(false);
    }
  }

  private showNotice(message: string): void {
    this.toast.show(message);
  }
}

function explain(error: unknown): string {
  if (error instanceof UsageBlockedError) {
    return 'O álbum parou por segurança: muitos pedidos hoje. Ele volta na virada do dia.';
  }
  if ((error as { code?: string })?.code === 'permission-denied') {
    return 'O servidor recusou a operação.';
  }
  return (error as Error)?.message ?? 'Algo deu errado ao falar com o servidor.';
}

/** O nome do arquivo: só o que um sistema de arquivos aceita sem discutir. */
function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'clube';
}
