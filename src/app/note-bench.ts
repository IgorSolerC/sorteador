import { signal } from '@angular/core';

import { SpinRecord } from './group-log';

/**
 * A orquestração da bancada de etiquetas: qual giro está aberto, o que o servidor
 * respondeu, e o foco de quem abriu. A máquina e o álbum abrem a mesma bancada sobre os
 * mesmos giros, então esta parte vive fora dos dois — quem usa só diz como gravar.
 */
export class NoteBench {
  readonly spinIndex = signal<number | null>(null);
  readonly error = signal('');
  readonly saving = signal(false);
  private invoker: HTMLElement | null = null;

  constructor(
    private readonly document: Document,
    /** Grava a etiqueta e recarrega o grupo. Lançar aqui é o jeito de recusar. */
    private readonly persist: (
      spinIndex: number,
      note: { title: string; subtitle: string; description: string },
    ) => Promise<void>,
    private readonly explain: (error: unknown) => string,
  ) {}

  open(spin: SpinRecord, event?: Event): void {
    this.invoker = (event?.currentTarget as HTMLElement | null) ?? null;
    this.error.set('');
    this.spinIndex.set(spin.index);
  }

  close(): void {
    if (this.saving()) return;
    this.spinIndex.set(null);
    this.error.set('');
    const invoker = this.invoker;
    this.invoker = null;

    // Quem abriu recebe o foco de volta — mas só depois do desenho, porque o convite em
    // branco vira etiqueta escrita e some da página. Sem o segundo alvo o teclado ficaria
    // largado no topo do documento exatamente na vez em que a etiqueta foi colada.
    window.setTimeout(() => {
      const target = invoker && this.document.contains(invoker)
        ? invoker
        : this.document.querySelector<HTMLElement>('.note-edit');
      target?.focus();
    }, 0);
  }

  /** Devolve o aviso a mostrar quando deu certo, ou `null` quando a bancada segue aberta. */
  async commit(
    spin: SpinRecord,
    draft: { title: string; subtitle: string; description: string },
  ): Promise<string | null> {
    if (this.saving()) return null;

    const title = draft.title.trim();
    const subtitle = draft.subtitle.trim();
    const description = draft.description.trim();
    // O título é a âncora do resumo `TÍTULO ● SUBTÍTULO`: sem ele o registro mostraria
    // uma linha que começa no marcador, e ninguém saberia o que foi jogado.
    if (!title && (subtitle || description)) {
      this.error.set('Dê um título à etiqueta: é ele que aparece no registro.');
      return null;
    }
    if (!title && !subtitle && !description) {
      if (spin.note) return this.remove(spin);
      this.error.set('Escreva ao menos um título para etiquetar este giro.');
      return null;
    }

    return this.write(
      spin,
      { title, subtitle, description },
      `Etiqueta colada em ${spin.winnerName}.`,
    );
  }

  remove(spin: SpinRecord): Promise<string | null> {
    return this.write(
      spin,
      { title: '', subtitle: '', description: '' },
      `Etiqueta retirada de ${spin.winnerName}. A retirada fica no registro.`,
    );
  }

  private async write(
    spin: SpinRecord,
    note: { title: string; subtitle: string; description: string },
    message: string,
  ): Promise<string | null> {
    this.saving.set(true);
    this.error.set('');
    try {
      await this.persist(spin.index, note);
      this.saving.set(false);
      this.close();
      return message;
    } catch (error) {
      // O erro fica na bancada, ao lado dos campos: fechá-la levaria embora o texto digitado.
      this.error.set(this.explain(error));
      return null;
    } finally {
      this.saving.set(false);
    }
  }
}
