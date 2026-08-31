import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GroupMember, MAX_MEMBERS, MIN_MEMBERS, activeMembers, poolMembers } from './group-log';
import { GroupSnapshot, GroupStore, SPIN_COOLDOWN_MS, UsageBlockedError } from './group-store';
import { GROUP_STORE, USAGE_GUARD } from './firebase-app';
import { Machine, capsuleColor } from './machine';
import { normalizeName, participantKey } from './draw-engine';

/**
 * O modo sincronizado. A mesma máquina, mas o globo mostra o bolo da rodada em vez de um
 * cálculo por mês, e o giro é um evento gravado — não uma reencenação.
 */
@Component({
  selector: 'app-synced-group',
  imports: [CommonModule, FormsModule, Machine],
  templateUrl: './synced-group.html',
})
export class SyncedGroup {
  readonly groupId = input.required<string>();

  private readonly document = inject(DOCUMENT);
  private readonly store = inject(GROUP_STORE);
  private readonly guard = inject(USAGE_GUARD);

  protected readonly snapshot = signal<GroupSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly draftName = signal('');
  protected readonly formError = signal('');
  protected readonly busy = signal(false);
  protected readonly isSpinning = signal(false);
  protected readonly revealed = signal(true);
  protected readonly rotation = signal(0);
  protected readonly now = signal(Date.now());
  protected readonly lastLoadedAt = signal(0);
  protected readonly author = signal(readAuthor());
  protected readonly confirming = signal(false);

  protected readonly MIN_MEMBERS = MIN_MEMBERS;

  constructor() {
    effect(() => {
      const id = this.groupId();
      if (!id) return;
      // Trocar de grupo tem que limpar o anterior: senão uma carga que falha deixa os
      // dados do grupo antigo na tela, passando por dados do novo.
      if (untracked(this.snapshot)?.groupId !== id) this.snapshot.set(null);
      void this.reload(id);
    });
    window.setInterval(() => this.now.set(Date.now()), 1000);
    this.document.addEventListener('visibilitychange', () => {
      const parado = Date.now() - this.lastLoadedAt() > REFRESH_MIN_INTERVAL_MS;
      if (this.document.visibilityState === 'visible' && parado && !this.busy()) {
        void this.reload(this.groupId());
      }
    });
  }

  // --- o que a máquina mostra ---

  /**
   * Depois de um giro, o globo mostra o bolo como ele estava naquele instante, com a
   * cápsula vencedora na calha. É a foto do que aconteceu, não do que sobrou.
   */
  protected readonly displayed = computed(() => {
    const snap = this.snapshot();
    if (!snap) return { names: [] as string[], chosenIndex: -1 };

    const byId = new Map(snap.state.members.map((m) => [m.id, m]));
    const last = snap.state.lastSpin;
    if (last) {
      const names = last.eligible.map((id) => byId.get(id)?.name ?? '—');
      return { names, chosenIndex: last.eligible.indexOf(last.winnerId) };
    }
    return { names: poolMembers(snap.state).map((m) => m.name), chosenIndex: -1 };
  });

  protected readonly winnerColor = computed(() => {
    const index = this.displayed().chosenIndex;
    return index < 0 ? capsuleColor(0) : capsuleColor(index);
  });

  protected readonly members = computed<readonly GroupMember[]>(() => {
    const snap = this.snapshot();
    return snap ? activeMembers(snap.state) : [];
  });

  protected readonly pool = computed<readonly GroupMember[]>(() => {
    const snap = this.snapshot();
    return snap ? poolMembers(snap.state) : [];
  });

  protected readonly canSpinNow = computed(() => {
    const snap = this.snapshot();
    if (!snap || this.busy() || this.isSpinning()) return false;
    return this.members().length >= MIN_MEMBERS &&
      snap.state.pool.length > 0 &&
      this.secondsUntilSpin() === 0;
  });

  /** A espera é imposta pelas rules; aqui ela só fica visível antes de o servidor negar. */
  protected readonly secondsUntilSpin = computed(() => {
    const snap = this.snapshot();
    const next = snap ? GroupStore.nextSpinAllowedAt(snap) : null;
    if (next === null) return 0;
    return Math.max(0, Math.ceil((next - this.now()) / 1000));
  });

  protected readonly usage = computed(() => {
    this.now();
    return this.guard.snapshot();
  });

  protected readonly shareUrl = computed(
    () => `${location.href.split('#')[0]}#/g/${this.groupId()}`,
  );

  // --- ações ---

  protected async addMember(): Promise<void> {
    const name = normalizeName(this.draftName());
    const snap = this.snapshot();
    if (!snap) return;

    if (!name) return this.formError.set('Digite um nome antes de adicionar.');
    if (name.length > 60) return this.formError.set('Use um nome com no máximo 60 caracteres.');
    if (this.members().some((m) => participantKey(m.name) === participantKey(name))) {
      return this.formError.set(`${name} já está no globo.`);
    }
    if (this.members().length >= MAX_MEMBERS) {
      return this.formError.set(`O globo comporta até ${MAX_MEMBERS} cápsulas.`);
    }

    this.formError.set('');
    await this.act(() => this.store.addMember(this.groupId(), name, this.author()), `${name} entrou no globo.`);
    this.draftName.set('');
  }

  protected async removeMember(member: GroupMember): Promise<void> {
    await this.act(
      () => this.store.removeMember(this.groupId(), member.id, this.author()),
      `${member.name} saiu do globo, mas continua no histórico.`,
    );
  }

  protected askToSpin(): void {
    if (!this.canSpinNow()) return;
    this.confirming.set(true);
  }

  protected cancelSpin(): void {
    this.confirming.set(false);
    this.document.getElementById('spin-button')?.focus();
  }

  protected async confirmSpin(): Promise<void> {
    this.confirming.set(false);
    await this.spin();
  }

  private async spin(): Promise<void> {
    if (!this.canSpinNow()) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.isSpinning.set(true);
    this.revealed.set(false);
    this.rotation.set(0);

    try {
      await this.store.spin(this.groupId(), this.author());
      await this.reload(this.groupId(), { keepSpinning: true });
      const target = this.targetRotation();
      window.requestAnimationFrame(() => this.rotation.set(target));
      window.setTimeout(() => {
        this.isSpinning.set(false);
        this.revealed.set(true);
      }, reducedMotion ? 120 : 4300);
    } catch (error) {
      this.isSpinning.set(false);
      this.revealed.set(true);
      this.report(error);
    }
  }

  protected targetRotation(): number {
    const { names, chosenIndex } = this.displayed();
    if (chosenIndex < 0 || !names.length) return 0;
    const sector = 360 / names.length;
    // A calha fica às seis horas, então é lá que a cápsula escolhida tem que parar.
    return 360 * 7 + 180 - (chosenIndex * sector + sector / 2);
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.showNotice('Link copiado. Quem abrir entra no mesmo grupo.');
    } catch {
      this.showNotice('Copie o link exibido abaixo.');
    }
  }

  protected colorFor(index: number): string {
    return capsuleColor(index);
  }

  protected updateAuthor(value: string): void {
    const name = value.trim().slice(0, 60);
    this.author.set(name);
    try {
      window.localStorage.setItem(AUTHOR_KEY, name);
    } catch {
      // Sem armazenamento, a assinatura vale só nesta sessão.
    }
  }

  /**
   * Um `#participantes` cru trocaria o hash e derrubaria a rota `#/g/<id>`: a pessoa seria
   * expulsa do grupo de volta para o modo por link. Rola em vez de navegar.
   */
  protected jumpToRoster(event: Event): void {
    const target = this.document.getElementById('participantes');
    if (!target) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  protected async refresh(): Promise<void> {
    if (this.busy()) return;
    await this.reload(this.groupId());
  }

  /** Há quanto tempo o que está na tela veio do servidor. */
  protected readonly loadedAgo = computed(() => {
    const at = this.lastLoadedAt();
    if (!at) return '';
    const seconds = Math.floor((this.now() - at) / 1000);
    if (seconds < 10) return 'agora';
    if (seconds < 60) return `há ${seconds}s`;
    return `há ${Math.floor(seconds / 60)}min`;
  });

  protected dismissNotice(): void {
    this.notice.set('');
  }

  // --- infraestrutura ---

  private async act(operation: () => Promise<void>, message: string): Promise<void> {
    this.busy.set(true);
    try {
      await operation();
      await this.reload(this.groupId());
      this.showNotice(message);
    } catch (error) {
      this.report(error);
    } finally {
      this.busy.set(false);
    }
  }

  private async reload(id: string, { keepSpinning = false } = {}): Promise<void> {
    if (!keepSpinning) this.loading.set(true);
    try {
      this.snapshot.set(await this.store.load(id));
      this.lastLoadedAt.set(Date.now());
      this.error.set('');
      // Sem giro animado, ninguém posiciona a roda: ela ficaria em zero enquanto os
      // rótulos já foram calculados para o repouso, e os nomes de baixo apareceriam
      // invertidos com a cápsula vencedora fora da calha.
      if (!keepSpinning) this.rotation.set(this.targetRotation());
    } catch (error) {
      this.report(error);
    } finally {
      this.loading.set(false);
    }
  }

  private report(error: unknown): void {
    if (error instanceof UsageBlockedError) {
      this.error.set(
        'A máquina parou por segurança: o uso do dia bateu no limite que protege a cota gratuita. ' +
        'Ela volta sozinha na virada do dia.',
      );
      return;
    }
    const code = (error as { code?: string })?.code;
    if (code === 'permission-denied') {
      this.error.set('O servidor recusou a operação. Se foi um giro, a espera entre giros ainda não passou.');
      return;
    }
    this.error.set((error as Error)?.message ?? 'Algo deu errado ao falar com o servidor.');
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    window.setTimeout(() => this.notice.set(''), 5500);
  }

  protected readonly SPIN_COOLDOWN_S = SPIN_COOLDOWN_MS / 1000;
}

const AUTHOR_KEY = 'mesa-do-mes:autor:v1';
const REFRESH_MIN_INTERVAL_MS = 20_000;

function readAuthor(): string {
  try {
    return window.localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    return '';
  }
}
