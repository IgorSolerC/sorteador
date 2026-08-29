import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { capsuleColor, Machine } from './machine';
import { CreateGroup } from './create-group';
import { SyncedGroup } from './synced-group';
import { FormsModule } from '@angular/forms';
import { decodeParticipants, encodeParticipants } from './share-link';
import {
  calculateMonthlyDraw,
  findSeedForHistory,
  getCycleEntries,
  normalizeName,
  normalizeParticipants,
  participantKey,
} from './draw-engine';

const LEGACY_STORAGE_KEY = 'giro-do-mes:participants:v1';
const CONFIG_STORAGE_KEY = 'mesa-do-mes:configuration:v1';
const MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const PICKER_STEPS: Record<string, number> = {
  ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4,
};
const DEMO_PARTICIPANTS = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];

/** Globe geometry in the SVG's own 400x400 user space. */

/** Whole capsules resting in the globe's lower interior; fixed so the scene never reshuffles. */



interface GroupConfiguration {
  readonly participants: string[];
  readonly startMonth: string;
  readonly seed: string;
  readonly isShared: boolean;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, Machine, SyncedGroup, CreateGroup],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly now = new Date();
  private readonly initialConfiguration = this.loadConfiguration();
  private spinTimer?: number;
  private spinToken = 0;
  private noticeTimer?: number;

  protected readonly year = this.now.getFullYear();
  protected readonly month = this.now.getMonth() + 1;
  protected readonly monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(this.now);

  /** `#/g/<id>` abre o grupo sincronizado; qualquer outra coisa segue o modo por link. */
  protected readonly syncedGroupId = signal(readSyncedGroupId(this.document.defaultView?.location.hash ?? ''));
  protected readonly creatingGroup = signal(isNewGroupRoute(this.document.defaultView?.location.hash ?? ''));

  protected readonly participants = signal<string[]>(this.initialConfiguration.participants);
  protected readonly startMonth = signal(this.initialConfiguration.startMonth);
  protected readonly seed = signal(this.initialConfiguration.seed);
  protected readonly seedSearchState = signal<'idle' | 'searching' | 'found' | 'unchanged' | 'failed'>('idle');
  protected readonly historyChoice = signal<Record<string, string>>({});
  protected readonly draftName = signal('');
  protected readonly formError = signal('');
  protected readonly startMonthError = signal('');
  protected readonly notice = signal('');
  protected readonly lastRemoval = signal<{ name: string; index: number } | null>(null);
  protected readonly shareUrl = signal('');
  protected readonly sharedList = signal(this.initialConfiguration.isShared);
  protected readonly isSpinning = signal(false);
  protected readonly isRevealed = signal(true);
  protected readonly wheelRotation = signal(0);
  protected readonly pickerOpen = signal(false);
  protected readonly pickerYear = signal(this.now.getFullYear());

  /** Months already lived through, which a roster change would silently rewrite. */
  protected readonly historyMonths = computed(() => {
    const start = parseMonthValue(this.startMonth());
    if (!start) return [];
    const startSerial = monthSerial(start.year, start.month);
    const nowSerial = monthSerial(this.year, this.month);
    const count = Math.min(nowSerial - startSerial + 1, 36);
    if (count < 1) return [];

    const choices = this.historyChoice();
    return Array.from({ length: count }, (_, index) => {
      const { year, month } = fromSerial(startSerial + index);
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const draw = calculateMonthlyDraw(
        this.participants(), year, month, start.year, start.month, this.seed(),
      );
      return { key, year, month, current: draw?.winner ?? '', chosen: choices[key] ?? draw?.winner ?? '' };
    });
  });

  protected readonly historyDiffers = computed(
    () => this.historyMonths().some((entry) => entry.chosen && entry.chosen !== entry.current),
  );

  protected readonly startMonthLabel = computed(() => formatMonthLabel(this.startMonth()));
  protected readonly pickerMonths = computed(() => {
    const selected = parseMonthValue(this.startMonth());
    const year = this.pickerYear();
    return MONTH_NUMBERS.map((month) => ({
      month,
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(new Date(2024, month - 1, 1)).replace('.', ''),
      full: new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(new Date(2024, month - 1, 1)),
      isSelected: !!selected && selected.year === year && selected.month === month,
    }));
  });
  protected readonly startsInFuture = computed(() =>
    monthSerial(this.year, this.month) < monthValueToSerial(this.startMonth()),
  );
  protected readonly draw = computed(() => {
    const start = parseMonthValue(this.startMonth());
    return start
      ? calculateMonthlyDraw(this.participants(), this.year, this.month, start.year, start.month, this.seed())
      : null;
  });
  protected readonly cycleEntries = computed(() => {
    const draw = this.draw();
    return draw ? getCycleEntries(draw) : [];
  });



  protected readonly waitingCount = computed(
    () => this.cycleEntries().filter((entry) => entry.status === 'waiting').length,
  );

  protected readonly winnerColor = computed(() => {
    const draw = this.draw();
    if (!draw) return capsuleColor(0);
    return capsuleColor(draw.cyclePosition);
  });

  constructor() {
    this.document.defaultView?.addEventListener('hashchange', () => this.syncRoute());
    window.setTimeout(() => this.spinOnEntry(), 280);
  }

  private syncRoute(): void {
    const hash = this.document.defaultView?.location.hash ?? '';
    this.syncedGroupId.set(readSyncedGroupId(hash));
    this.creatingGroup.set(isNewGroupRoute(hash));
  }

  protected addParticipant(): void {
    const name = normalizeName(this.draftName());
    if (!name) {
      this.formError.set('Digite um nome antes de adicionar.');
      return;
    }
    if (name.length > 60) {
      this.formError.set('Use um nome com no máximo 60 caracteres.');
      return;
    }
    if (this.participants().some((person) => participantKey(person) === participantKey(name))) {
      this.formError.set(`${name} já está na lista.`);
      return;
    }
    if (this.participants().length >= 60) {
      this.formError.set('A lista comporta até 60 participantes.');
      return;
    }

    this.updateParticipants([...this.participants(), name]);
    this.draftName.set('');
    this.formError.set('');
    this.showNotice(`${name} entrou no próximo cálculo.`);
  }

  protected removeParticipant(name: string): void {
    const index = this.participants().indexOf(name);
    this.updateParticipants(this.participants().filter((person) => person !== name));
    this.lastRemoval.set({ name, index });
    this.showNotice(`${name} foi removido da lista.`, true);
  }

  protected undoRemoval(): void {
    const removal = this.lastRemoval();
    if (!removal) return;
    const restored = [...this.participants()];
    restored.splice(Math.min(removal.index, restored.length), 0, removal.name);
    this.updateParticipants(restored);
    this.lastRemoval.set(null);
    this.showNotice(`${removal.name} voltou para a lista.`);
  }

  protected dismissNotice(): void {
    this.notice.set('');
    this.lastRemoval.set(null);
    if (this.noticeTimer) window.clearTimeout(this.noticeTimer);
  }

  protected replayDraw(): void {
    if (!this.draw() || this.isSpinning()) return;
    this.startSpin();
  }

  protected async copyGroupLink(): Promise<void> {
    const encoded = encodeParticipants(this.participants());
    const semente = this.seed() ? `&semente=${encodeURIComponent(this.seed())}` : '';
    const url = `${window.location.href.split('#')[0]}#grupo=${encoded}&inicio=${this.startMonth()}${semente}`;
    this.shareUrl.set(url);
    try {
      await navigator.clipboard.writeText(url);
      this.showNotice('Link do grupo copiado. O mesmo link gera o mesmo resultado.');
    } catch {
      this.showNotice('Copie o link exibido abaixo para compartilhar o grupo.');
    }
  }

  protected selectShareUrl(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected togglePicker(): void {
    const open = !this.pickerOpen();
    if (open) {
      const selected = parseMonthValue(this.startMonth());
      this.pickerYear.set(selected?.year ?? this.year);
      this.pickerOpen.set(true);
      // role="dialog" owes the keyboard the focus, landing on the month already chosen.
      this.focusMonth(selected?.month ?? 1);
      return;
    }
    this.pickerOpen.set(false);
  }

  protected closePicker(restoreFocus = true): void {
    if (!this.pickerOpen()) return;
    this.pickerOpen.set(false);
    if (restoreFocus) this.document.getElementById('start-month')?.focus();
  }

  protected stepPickerYear(delta: number): void {
    this.pickerYear.update((year) => Math.min(9999, Math.max(1, year + delta)));
  }

  protected chooseMonth(month: number): void {
    this.updateStartMonth(`${this.pickerYear()}-${String(month).padStart(2, '0')}`);
    this.closePicker();
  }

  /** Arrow keys walk the grid and roll into the neighbouring year at the edges. */
  protected onPickerKeydown(event: KeyboardEvent, month: number): void {
    const step = PICKER_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const target = month + step;
    if (target < 1) {
      this.stepPickerYear(-1);
      this.focusMonth(target + 12);
    } else if (target > 12) {
      this.stepPickerYear(1);
      this.focusMonth(target - 12);
    } else {
      this.focusMonth(target);
    }
  }

  private focusMonth(month: number): void {
    window.setTimeout(() => this.document.getElementById(`start-month-${month}`)?.focus());
  }

  protected updateSeed(value: string): void {
    this.seed.set(value.trim());
    this.seedSearchState.set('idle');
    this.sharedList.set(false);
    this.shareUrl.set('');
    this.saveConfiguration();
    this.replayAfterConfigChange();
  }

  protected setHistoryWinner(key: string, winner: string): void {
    this.historyChoice.update((choices) => ({ ...choices, [key]: winner }));
    this.seedSearchState.set('idle');
  }

  /** Hunts for a seed that puts every already-announced month back on the right person. */
  protected searchSeed(): void {
    const start = parseMonthValue(this.startMonth());
    if (!start) return;
    const targets = this.historyMonths()
      .filter((entry) => entry.chosen)
      .map((entry) => ({ year: entry.year, month: entry.month, winner: entry.chosen }));
    if (!targets.length) return;

    this.seedSearchState.set('searching');
    const wasAlreadyRight = targets.every((target) => {
      const draw = calculateMonthlyDraw(
        this.participants(), target.year, target.month, start.year, start.month, this.seed(),
      );
      return draw?.winner === target.winner;
    });
    if (wasAlreadyRight) {
      this.seedSearchState.set('unchanged');
      return;
    }

    const { seed } = findSeedForHistory(this.participants(), start.year, start.month, targets);
    if (seed === null) {
      this.seedSearchState.set('failed');
      return;
    }

    this.seed.set(seed);
    this.seedSearchState.set('found');
    this.sharedList.set(false);
    this.shareUrl.set('');
    this.saveConfiguration();
    this.replayAfterConfigChange();
  }

  private replayAfterConfigChange(): void {
    this.isSpinning.set(false);
    this.isRevealed.set(true);
    window.setTimeout(() => this.wheelRotation.set(this.targetRotation()));
  }

  protected updateStartMonth(value: string): void {
    if (!parseMonthValue(value)) {
      this.startMonthError.set('Informe um mês de início válido.');
      return;
    }

    this.startMonth.set(value);
    this.startMonthError.set('');
    this.sharedList.set(false);
    this.shareUrl.set('');
    this.saveConfiguration();
    this.isSpinning.set(false);
    this.isRevealed.set(true);
    window.setTimeout(() => this.wheelRotation.set(this.targetRotation()));
  }

  /**
   * A bare `#participantes` jump would overwrite the shared group fragment, so a visitor who
   * arrived by link and then reloaded would lose the machine they were sent. Scroll instead.
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

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  }

  /** The colour a person carries on the globe, the chart and the roster alike. */
  protected personColor(name: string): string {
    const people = this.draw()?.orderedParticipants ?? [];
    const index = people.findIndex((person) => participantKey(person) === participantKey(name));
    return index < 0 ? 'transparent' : capsuleColor(index);
  }

  protected monthShort(month: number): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(new Date(2024, month - 1, 1)).replace('.', '');
  }

  protected trackPerson(_: number, name: string): string {
    return participantKey(name);
  }

  private spinOnEntry(): void {
    if (this.draw()) this.startSpin();
  }

  private startSpin(): void {
    const draw = this.draw();
    if (!draw) return;
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = reducedMotion ? 120 : 4300;

    const token = ++this.spinToken;
    this.isSpinning.set(false);
    this.isRevealed.set(false);
    this.wheelRotation.set(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        // A background tab throttles rAF, so the timer below may already have settled this spin.
        if (token !== this.spinToken) return;
        this.isSpinning.set(true);
        this.wheelRotation.set(this.targetRotation());
      });
    });
    this.spinTimer = window.setTimeout(() => {
      this.spinToken++;
      this.wheelRotation.set(this.targetRotation());
      this.isSpinning.set(false);
      this.isRevealed.set(true);
    }, duration);
  }

  protected targetRotation(): number {
    const draw = this.draw();
    if (!draw) return 0;
    const sector = 360 / draw.orderedParticipants.length;
    const winnerCenter = draw.cyclePosition * sector + sector / 2;
    // The chute sits at six o'clock, so the winning capsule has to land there.
    return 360 * 7 + 180 - winnerCenter;
  }

  private updateParticipants(participants: string[]): void {
    this.participants.set(participants);
    this.sharedList.set(false);
    this.shareUrl.set('');
    this.saveConfiguration();
    window.setTimeout(() => {
      this.wheelRotation.set(this.targetRotation());
      this.isRevealed.set(true);
    });
  }

  private showNotice(message: string, keepUndo = false): void {
    if (!keepUndo) this.lastRemoval.set(null);
    if (this.noticeTimer) window.clearTimeout(this.noticeTimer);
    this.notice.set(message);
    this.noticeTimer = window.setTimeout(() => {
      this.notice.set('');
      this.lastRemoval.set(null);
    }, 5500);
  }

  private loadConfiguration(): GroupConfiguration {
    const shared = this.readConfigurationFromHash();
    if (shared) return { ...shared, isShared: true };

    const currentStartMonth = this.currentMonthValue();
    try {
      const saved = this.safeStorageGet(CONFIG_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (isStoredConfiguration(parsed)) {
        return {
          participants: normalizeParticipants(parsed.participants.slice(0, 60)),
          startMonth: parsed.startMonth,
          seed: typeof parsed.seed === 'string' ? parsed.seed : '',
          isShared: false,
        };
      }
    } catch {
      // The fallback below keeps the app useful when storage is unavailable.
    }

    try {
      const legacy = this.safeStorageGet(LEGACY_STORAGE_KEY);
      const parsed = legacy ? JSON.parse(legacy) : null;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return { participants: normalizeParticipants(parsed.slice(0, 60)), startMonth: currentStartMonth, seed: '', isShared: false };
      }
    } catch {
      // A demonstrative list keeps the app useful when storage is unavailable.
    }
    return { participants: DEMO_PARTICIPANTS, startMonth: currentStartMonth, seed: '', isShared: false };
  }

  private readConfigurationFromHash(): Omit<GroupConfiguration, 'isShared'> | null {
    const hash = this.document.defaultView?.location.hash.slice(1) ?? '';
    const parameters = new URLSearchParams(hash);
    const encoded = parameters.get('grupo');
    const startMonth = parameters.get('inicio');
    if (!encoded) return null;
    try {
      const parsed = decodeParticipants(encoded);
      if (parsed.length < 2) return null;
      return {
        participants: parsed,
        startMonth: parseMonthValue(startMonth ?? '') ? startMonth! : this.currentMonthValue(),
        seed: parameters.get('semente') ?? parameters.get('seed') ?? '',
      };
    } catch {
      return null;
    }
  }

  private currentMonthValue(): string {
    return `${this.now.getFullYear()}-${String(this.now.getMonth() + 1).padStart(2, '0')}`;
  }

  private saveConfiguration(): void {
    this.safeStorageSet(CONFIG_STORAGE_KEY, JSON.stringify({
      participants: this.participants(),
      startMonth: this.startMonth(),
      seed: this.seed(),
    }));
  }

  private safeStorageGet(key: string): string | null {
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private safeStorageSet(key: string, value: string): void {
    try {
      this.document.defaultView?.localStorage.setItem(key, value);
    } catch {
      // The deterministic draw still works when storage is blocked.
    }
  }
}

function parseMonthValue(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 1 && month >= 1 && month <= 12 ? { year, month } : null;
}

function monthSerial(year: number, month: number): number {
  return year * 12 + month - 1;
}

function monthValueToSerial(value: string): number {
  const month = parseMonthValue(value);
  return month ? monthSerial(month.year, month.month) : Number.POSITIVE_INFINITY;
}

function formatMonthLabel(value: string): string {
  const month = parseMonthValue(value);
  return month
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(month.year, month.month - 1, 1))
    : 'mês informado';
}

function isStoredConfiguration(
  value: unknown,
): value is { participants: string[]; startMonth: string; seed?: string } {
  return typeof value === 'object' && value !== null &&
    Array.isArray((value as { participants?: unknown }).participants) &&
    (value as { participants: unknown[] }).participants.every((person) => typeof person === 'string') &&
    typeof (value as { startMonth?: unknown }).startMonth === 'string' &&
    parseMonthValue((value as { startMonth: string }).startMonth) !== null;
}






function fromSerial(serial: number): { year: number; month: number } {
  return { year: Math.floor(serial / 12), month: (serial % 12) + 1 };
}

export function readSyncedGroupId(hash: string): string {
  const match = /^#?\/g\/([A-Za-z0-9_-]{1,64})$/.exec(hash.trim());
  return match ? match[1] : '';
}

/** `#/novo` abre a criação de grupo; o resto continua caindo no modo por link. */
export function isNewGroupRoute(hash: string): boolean {
  return /^#?\/novo\/?$/.test(hash.trim());
}
