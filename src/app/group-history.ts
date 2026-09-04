import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { SpinRecord } from './group-log';
import { GroupSnapshot, UsageBlockedError } from './group-store';
import { GROUP_STORE } from './firebase-app';
import { capsuleColor } from './machine';
import { NoteBench } from './note-bench';
import { NoteEditor } from './note-editor';

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
  readonly wins: number;
  readonly labelled: number;
}

export interface RoundSection {
  readonly round: number;
  readonly spins: readonly SpinRecord[];
}

/** Inclinações fixas por posição: a parede nunca se remexe entre duas visitas. */
const TILTS = [-1.7, 1.1, -0.7, 1.8, -1.3, 0.8] as const;

@Component({
  selector: 'app-group-history',
  imports: [CommonModule, NoteEditor],
  templateUrl: './group-history.html',
})
export class GroupHistory {
  readonly groupId = input.required<string>();

  private readonly document = inject(DOCUMENT);
  private readonly store = inject(GROUP_STORE);

  protected readonly snapshot = signal<GroupSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  /** Id da pessoa em foco; vazio é a parede inteira. */
  protected readonly filterId = signal('');

  private readonly bench = new NoteBench(
    this.document,
    (spinIndex, note) =>
      this.store
        .annotateSpin(this.groupId(), spinIndex, note, readAuthor())
        .then(() => this.reload(this.groupId())),
    (error) => explain(error),
  );

  protected readonly editingSpinIndex = this.bench.spinIndex;
  protected readonly noteError = this.bench.error;
  protected readonly savingNote = this.bench.saving;

  constructor() {
    effect(() => {
      const id = this.groupId();
      if (!id) return;
      if (untracked(this.snapshot)?.groupId !== id) this.snapshot.set(null);
      void this.reload(id);
    });
  }

  // --- o que a parede mostra ---

  protected readonly spins = computed<readonly SpinRecord[]>(
    () => this.snapshot()?.state.spins ?? [],
  );

  protected readonly labelled = computed(() => this.spins().filter((spin) => spin.note).length);

  /** Uma pessoa por cápsula que já saiu, com quantas vezes saiu e quantas foi etiquetada. */
  protected readonly winners = computed<readonly WinnerTally[]>(() => {
    const tally = new Map<string, { id: string; name: string; color: string; wins: number; labelled: number }>();
    for (const spin of this.spins()) {
      const found = tally.get(spin.winnerId);
      if (found) {
        found.wins += 1;
        if (spin.note) found.labelled += 1;
        continue;
      }
      // A cor é a da primeira cápsula da pessoa: assim ela é sempre a mesma no álbum.
      tally.set(spin.winnerId, {
        id: spin.winnerId,
        name: spin.winnerName,
        color: capsuleColor(spin.index),
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
  protected readonly rounds = computed<readonly RoundSection[]>(() => {
    const focus = this.filterId();
    const byRound = new Map<number, SpinRecord[]>();

    for (const spin of this.spins()) {
      if (focus && spin.winnerId !== focus) continue;
      const list = byRound.get(spin.round);
      if (list) list.push(spin);
      else byRound.set(spin.round, [spin]);
    }

    return [...byRound.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([round, spins]) => ({ round, spins: [...spins].reverse() }));
  });

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

  protected readonly machineUrl = computed(
    () => `${location.href.split('#')[0]}#/g/${this.groupId()}`,
  );

  protected colorFor(index: number): string {
    return capsuleColor(index);
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

  protected openNote(spin: SpinRecord, event?: Event): void {
    this.bench.open(spin, event);
  }

  protected closeNote(): void {
    this.bench.close();
  }

  protected async commitNote(draft: { title: string; description: string }): Promise<void> {
    const spin = this.editingSpin();
    if (!spin) return;
    const message = await this.bench.commit(spin, draft);
    if (message) this.showNotice(message);
  }

  protected async removeNote(): Promise<void> {
    const spin = this.editingSpin();
    if (!spin) return;
    const message = await this.bench.remove(spin);
    if (message) this.showNotice(message);
  }

  protected dismissNotice(): void {
    this.notice.set('');
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
    } catch (error) {
      this.error.set(explain(error));
    } finally {
      this.loading.set(false);
    }
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    window.setTimeout(() => this.notice.set(''), 5500);
  }
}

const AUTHOR_KEY = 'mesa-do-mes:autor:v1';

function readAuthor(): string {
  try {
    return window.localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    return '';
  }
}

function explain(error: unknown): string {
  if (error instanceof UsageBlockedError) {
    return 'O álbum parou por segurança: o uso do dia bateu no limite que protege a cota ' +
      'gratuita. Ele volta sozinho na virada do dia.';
  }
  if ((error as { code?: string })?.code === 'permission-denied') {
    return 'O servidor recusou a operação.';
  }
  return (error as Error)?.message ?? 'Algo deu errado ao falar com o servidor.';
}
