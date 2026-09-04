import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, WritableSignal, computed, effect, inject, input, signal, untracked } from '@angular/core';

import {
  GroupMember,
  MAX_MEMBERS,
  MIN_MEMBERS,
  SpinRecord,
  activeMembers,
  membersById,
  noteSummary,
  poolMembers,
} from './group-log';
import { GroupSnapshot, GroupStore, SPIN_COOLDOWN_MS, UsageBlockedError } from './group-store';
import { GROUP_STORE, USAGE_GUARD } from './firebase-app';
import { rememberGroup } from './recent-groups';
import { Machine, MachinePerson } from './machine';
import { capsuleColor, capsuleColorName, capsuleInk, capsuleTextOnEnamel } from './palette';
import { Confetti } from './confetti';
import { Identity } from './identity';
import { trapFocusWithin } from './focus-trap';
import { NoteBench } from './note-bench';
import { NoteEditor } from './note-editor';
import { CapsuleStyle, RosterBench } from './roster-bench';
import { normalizeName, participantKey } from './naming';

/**
 * O grupo sincronizado, que agora é o produto inteiro: o globo mostra o bolo da rodada e
 * o giro é um evento gravado com a hora do servidor.
 *
 * A cena, porém, é reencenável de propósito. Ela abre girando e volta a girar a um clique
 * no globo, sempre parando na mesma cápsula — o resultado está no registro desde que a
 * manivela virou, e nada aqui pode mudá-lo. É a diferença entre assistir e decidir, que é
 * a promessa do produto.
 */
@Component({
  selector: 'app-synced-group',
  imports: [CommonModule, Machine, NoteEditor, RosterBench, Confetti],
  templateUrl: './synced-group.html',
})
export class SyncedGroup {
  readonly groupId = input.required<string>();

  /** Pedido de trocar de pessoa, que a casca resolve reabrindo a porta. */
  readonly changeIdentity = input<() => void>(() => {});

  private readonly document = inject(DOCUMENT);
  private readonly store = inject(GROUP_STORE);
  private readonly guard = inject(USAGE_GUARD);
  private readonly identity = inject(Identity);

  protected readonly snapshot = signal<GroupSnapshot | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly busy = signal(false);
  protected readonly isSpinning = signal(false);
  protected readonly revealed = signal(true);
  protected readonly rotation = signal(0);
  protected readonly now = signal(Date.now());
  protected readonly lastLoadedAt = signal(0);
  protected readonly confirming = signal(false);

  /** A gaveta da coleção, com a lista e a bancada de cada cápsula. */
  protected readonly rosterOpen = signal(false);
  protected readonly rosterError = signal('');
  protected readonly restyled = signal(0);

  /** Um contador: cada passo é uma cápsula que abriu e soltou o que tinha dentro. */
  protected readonly celebration = signal(0);

  protected readonly author = this.identity.name;
  protected readonly authorInitials = this.identity.initials;
  protected readonly authorColor = this.identity.color;
  protected readonly authorInk = this.identity.ink;

  /** Uma cena por vez. Um token velho que volta de um `setTimeout` não encerra a atual. */
  private sceneToken = 0;
  private greeted = false;

  /** A bancada de etiquetas, a mesma que o álbum abre sobre os mesmos giros. */
  private readonly bench = new NoteBench(
    this.document,
    (spinIndex, note) =>
      this.store
        .annotateSpin(this.groupId(), spinIndex, note, this.author())
        .then(() => this.reload(this.groupId())),
    (error) => this.explain(error),
  );

  protected readonly editingSpinIndex = this.bench.spinIndex;
  protected readonly noteError = this.bench.error;
  protected readonly savingNote = this.bench.saving;

  protected readonly MIN_MEMBERS = MIN_MEMBERS;
  protected readonly MAX_MEMBERS = MAX_MEMBERS;

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
   *
   * As cores vêm de cada pessoa, não da posição dela no anel: quem escolheu menta é menta
   * no globo, no registro e no álbum, e continua menta quando o bolo muda de tamanho.
   */
  protected readonly displayed = computed<{
    people: readonly MachinePerson[];
    chosenIndex: number;
    winner: GroupMember | null;
  }>(() => {
    const snap = this.snapshot();
    if (!snap) return { people: [], chosenIndex: -1, winner: null };

    const byId = membersById(snap.state);
    const last = snap.state.lastSpin;
    if (last) {
      return {
        people: last.eligible.map((id) => toPerson(byId.get(id))),
        chosenIndex: last.eligible.indexOf(last.winnerId),
        winner: byId.get(last.winnerId) ?? null,
      };
    }
    return {
      people: poolMembers(snap.state).map((member) => toPerson(member)),
      chosenIndex: -1,
      winner: null,
    };
  });

  protected readonly winnerHex = computed(() => {
    const winner = this.displayed().winner;
    return capsuleColor(winner?.colorIndex ?? 0);
  });

  protected readonly winnerInk = computed(() => {
    const winner = this.displayed().winner;
    return capsuleInk(winner?.colorIndex ?? 0);
  });

  protected readonly winnerText = computed(() => {
    const winner = this.displayed().winner;
    return capsuleTextOnEnamel(winner?.colorIndex ?? 0);
  });

  protected readonly winnerEmoji = computed(() => this.displayed().winner?.emoji ?? '');

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

  protected readonly albumUrl = computed(() => `${this.shareUrl()}/album`);

  /**
   * O giro que está sendo etiquetado, relido do snapshot a cada carga: assim a bancada
   * mostra a etiqueta que o servidor tem, não a que tinha quando ela abriu.
   */
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

  // --- a coleção ---

  protected async addFromBench(raw: string): Promise<void> {
    const name = normalizeName(raw);
    if (!this.snapshot()) return;

    if (!name) return this.rosterError.set('Digite um nome antes de carregar a cápsula.');
    if (name.length > 60) return this.rosterError.set('Use um nome com no máximo 60 caracteres.');
    if (this.members().some((m) => participantKey(m.name) === participantKey(name))) {
      return this.rosterError.set(`${name} já está no globo.`);
    }
    if (this.members().length >= MAX_MEMBERS) {
      return this.rosterError.set(`O globo comporta até ${MAX_MEMBERS} cápsulas.`);
    }

    this.rosterError.set('');
    await this.act(
      () => this.store.addMember(this.groupId(), name, this.author()),
      `${name} entrou no globo.`,
      this.rosterError,
    );
  }

  protected async removeFromBench(member: GroupMember): Promise<void> {
    await this.act(
      () => this.store.removeMember(this.groupId(), member.id, this.author()),
      `${member.name} saiu do globo, mas continua no histórico.`,
      this.rosterError,
    );
  }

  /** Pinta a cápsula de alguém e escolhe o que ela solta ao cair. */
  protected async restyle(style: CapsuleStyle): Promise<void> {
    const member = this.members().find((person) => person.id === style.memberId);
    if (!member) return;

    const cor = capsuleColorName(style.colorIndex).toLowerCase();
    const ok = await this.act(
      () =>
        this.store.styleMember(
          this.groupId(),
          style.memberId,
          { colorIndex: style.colorIndex, emoji: style.emoji },
          this.author(),
        ),
      `A cápsula de ${member.name} agora é ${cor}${style.emoji ? `, com ${style.emoji}` : ''}.`,
      this.rosterError,
    );
    // A gaveta só volta para a lista quando o servidor confirmou: falhar e voltar levaria
    // embora a cor que a pessoa acabou de escolher.
    if (ok) this.restyled.update((tick) => tick + 1);
  }

  protected openRoster(): void {
    this.rosterError.set('');
    this.rosterOpen.set(true);
  }

  protected closeRoster(): void {
    this.rosterOpen.set(false);
    this.document.getElementById('roster-button')?.focus();
  }

  // --- a etiqueta: o que o clube jogou, colado na cápsula que saiu ---

  /** Abre a bancada para um giro, seja o de agora ou um de um ano atrás. */
  protected openNote(spin: SpinRecord, event?: Event): void {
    this.bench.open(spin, event);
  }

  protected closeNote(): void {
    this.bench.close();
  }

  protected async commitNote(draft: {
    title: string;
    subtitle: string;
    description: string;
  }): Promise<void> {
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

  protected summaryOf(spin: SpinRecord): string {
    return noteSummary(spin.note);
  }

  // --- o giro ---

  protected askToSpin(): void {
    if (!this.canSpinNow()) return;
    this.confirming.set(true);
    // Um diálogo que abre sem levar o foco junto deixa quem usa teclado atrás dele.
    window.setTimeout(() => this.document.getElementById('confirm-spin')?.focus(), 0);
  }

  /** O diálogo diz `aria-modal="true"`; sem prender o Tab isso seria uma promessa falsa. */
  protected trapConfirmFocus(event: Event): void {
    trapFocusWithin(this.document, 'confirm-card', event);
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

    this.isSpinning.set(true);
    this.revealed.set(false);
    this.rotation.set(0);

    try {
      await this.store.spin(this.groupId(), this.author());
      await this.reload(this.groupId(), { keepSpinning: true });
      this.playScene();
    } catch (error) {
      this.sceneToken += 1;
      this.isSpinning.set(false);
      this.revealed.set(true);
      this.report(error);
    }
  }

  /**
   * Reencena a entrega. Não escreve nada e não pode mudar nada: a rotação de destino sai
   * do mesmo registro, então a cápsula para exatamente onde parou da primeira vez.
   */
  protected replayScene(): void {
    if (this.isSpinning() || this.displayed().chosenIndex < 0) return;
    this.playScene();
  }

  /** Toda encenação completa a entrega: se a cápsula tem emoji, ele cai como confete. */
  private playScene(): void {
    if (this.displayed().chosenIndex < 0) return;
    const restingTarget = this.targetRotation();
    const current = this.rotation();
    const finalAngle = ((restingTarget % 360) + 360) % 360;
    const firstEquivalentAhead = finalAngle + Math.ceil((current - finalAngle) / 360) * 360;
    // Cada reencenação continua a partir do repouso atual. Voltar a zero e chegar no
    // mesmo destino dentro do mesmo quadro fazia o navegador consolidar os dois estados,
    // então a roleta parecia não girar.
    const animatedTarget = firstEquivalentAhead + 360 * 7;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const token = ++this.sceneToken;

    this.isSpinning.set(true);
    this.revealed.set(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        // Uma aba em segundo plano estrangula o rAF, e o relógio abaixo pode já ter
        // encerrado esta cena antes de o quadro chegar.
        if (token !== this.sceneToken) return;
        this.rotation.set(animatedTarget);
      });
    });

    window.setTimeout(() => {
      if (token !== this.sceneToken) return;
      // O ângulo equivalente sem as voltas acumuladas mantém os números pequenos e não
      // produz salto visível: as duas posições diferem apenas por voltas completas.
      this.rotation.set(restingTarget);
      this.isSpinning.set(false);
      this.revealed.set(true);
      this.celebration.update((tick) => tick + 1);
    }, reducedMotion ? 120 : 4300);
  }

  protected targetRotation(): number {
    const { people, chosenIndex } = this.displayed();
    if (chosenIndex < 0 || !people.length) return 0;
    const sector = 360 / people.length;
    // A calha fica às seis horas, então é lá que a cápsula escolhida tem que parar.
    return 360 * 7 + 180 - (chosenIndex * sector + sector / 2);
  }

  // --- o resto ---

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl());
      this.showNotice('Link copiado. Quem abrir entra no mesmo grupo.');
    } catch {
      this.showNotice('Copie o link do campo abaixo do botão.');
    }
  }

  protected colorOf(spin: SpinRecord): string {
    const snap = this.snapshot();
    if (!snap) return capsuleColor(0);
    return capsuleColor(membersById(snap.state).get(spin.winnerId)?.colorIndex ?? 0);
  }

  protected emojiOf(spin: SpinRecord): string {
    const snap = this.snapshot();
    return snap ? membersById(snap.state).get(spin.winnerId)?.emoji ?? '' : '';
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

  protected askIdentityChange(): void {
    this.changeIdentity()();
  }

  // --- infraestrutura ---

  /** Devolve se a operação passou, para quem precisa reagir só ao sucesso. */
  private async act(
    operation: () => Promise<void>,
    message: string,
    into: WritableSignal<string> = this.error,
  ): Promise<boolean> {
    this.busy.set(true);
    try {
      await operation();
      await this.reload(this.groupId());
      this.showNotice(message);
      into.set('');
      return true;
    } catch (error) {
      into.set(this.explain(error));
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private async reload(id: string, { keepSpinning = false } = {}): Promise<void> {
    if (!keepSpinning) this.loading.set(true);
    try {
      const snapshot = await this.store.load(id);
      this.snapshot.set(snapshot);
      this.lastLoadedAt.set(Date.now());
      this.error.set('');
      // O título da aba nomeia o grupo: uma máquina aberta entre dez abas precisa se anunciar.
      this.document.title = `${snapshot.name} · Mesa do Mês`;
      rememberGroup(snapshot.groupId, snapshot.name);

      // Sem giro animado, ninguém posiciona a roda: ela ficaria em zero enquanto os
      // rótulos já foram calculados para o repouso, e os nomes de baixo apareceriam
      // invertidos com a cápsula vencedora fora da calha.
      if (!keepSpinning) this.rotation.set(this.targetRotation());

      // A máquina abre girando e celebra a cápsula que já estava entregue. Durante um
      // giro verdadeiro, porém, `spin()` já é dono da cena; iniciar outra aqui faria as
      // duas disputarem o mesmo token antes de o primeiro quadro chegar.
      if (!keepSpinning && !this.greeted && snapshot.state.lastSpin) {
        this.greeted = true;
        this.playScene();
      }
    } catch (error) {
      this.report(error);
    } finally {
      this.loading.set(false);
    }
  }

  private report(error: unknown): void {
    this.error.set(this.explain(error));
  }

  private explain(error: unknown): string {
    if (error instanceof UsageBlockedError) {
      return 'A máquina parou por segurança: o uso do dia bateu no limite que protege a cota gratuita. ' +
        'Ela volta sozinha na virada do dia.';
    }
    const code = (error as { code?: string })?.code;
    if (code === 'permission-denied') {
      return 'O servidor recusou a operação. Se foi um giro, a espera entre giros ainda não passou.';
    }
    return (error as Error)?.message ?? 'Algo deu errado ao falar com o servidor.';
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    window.setTimeout(() => this.notice.set(''), 5500);
  }

  protected readonly SPIN_COOLDOWN_S = SPIN_COOLDOWN_MS / 1000;
}

const REFRESH_MIN_INTERVAL_MS = 20_000;

/** Uma pessoa vira o que a máquina precisa: nome, cor e o símbolo que ela solta. */
function toPerson(member: GroupMember | undefined): MachinePerson {
  return {
    name: member?.name ?? '—',
    color: capsuleColor(member?.colorIndex ?? 0),
    ink: capsuleInk(member?.colorIndex ?? 0),
    emoji: member?.emoji ?? '',
  };
}
