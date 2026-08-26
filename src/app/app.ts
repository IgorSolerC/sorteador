import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  calculateMonthlyDraw,
  getCycleEntries,
  normalizeName,
  normalizeParticipants,
  participantKey,
} from './draw-engine';

const LEGACY_STORAGE_KEY = 'giro-do-mes:participants:v1';
const CONFIG_STORAGE_KEY = 'mesa-do-mes:configuration:v1';
const DEMO_PARTICIPANTS = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];
const CAPSULE_COLORS = ['#FFC53D', '#4FE0C8', '#FF6B7D', '#A78BFF', '#FF9A3C', '#FF8FC7'];

/** Globe geometry in the SVG's own 400x400 user space. */
const GLOBE = { cx: 200, cy: 200, inner: 96, equator: 118, outer: 168, label: 140 } as const;

/** Whole capsules resting in the globe's lower interior; fixed so the scene never reshuffles. */
const LOOSE_CAPSULES = [
  { cx: 160, cy: 250, rot: -18 }, { cx: 196, cy: 269, rot: 9 }, { cx: 232, cy: 252, rot: 24 },
  { cx: 148, cy: 224, rot: 38 }, { cx: 258, cy: 225, rot: -32 }, { cx: 178, cy: 279, rot: -6 },
  { cx: 224, cy: 283, rot: 16 }, { cx: 258, cy: 256, rot: -24 }, { cx: 138, cy: 261, rot: 12 },
] as const;
const LOOSE_RADIUS = 15;

export interface LooseCapsule {
  readonly color: string;
  readonly dome: string;
  readonly shell: string;
  readonly seam: string;
  readonly spot: string;
  readonly transform: string;
}

export interface Capsule {
  readonly name: string;
  readonly color: string;
  readonly dome: string;
  readonly clear: string;
  readonly seam: string;
  readonly gloss: string;
  readonly label: string;
  readonly labelPath: string;
  readonly fontSize: number;
}

interface GroupConfiguration {
  readonly participants: string[];
  readonly startMonth: string;
  readonly isShared: boolean;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
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

  protected readonly participants = signal<string[]>(this.initialConfiguration.participants);
  protected readonly startMonth = signal(this.initialConfiguration.startMonth);
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

  protected readonly startMonthLabel = computed(() => formatMonthLabel(this.startMonth()));
  protected readonly startsInFuture = computed(() =>
    monthSerial(this.year, this.month) < monthValueToSerial(this.startMonth()),
  );
  protected readonly draw = computed(() => {
    const start = parseMonthValue(this.startMonth());
    return start
      ? calculateMonthlyDraw(this.participants(), this.year, this.month, start.year, start.month)
      : null;
  });
  protected readonly cycleEntries = computed(() => {
    const draw = this.draw();
    return draw ? getCycleEntries(draw) : [];
  });
  /** One wedge per participant: coloured dome outside the equator, translucent shell inside. */
  protected readonly capsules = computed<Capsule[]>(() => {
    const people = this.draw()?.orderedParticipants ?? [];
    const count = people.length;
    if (!count) return [];

    const step = 360 / count;
    const gap = Math.min(1.6, step * 0.12);
    const rest = this.targetRotation();
    const fontSize = Math.min(17, Math.max(8, 46 / Math.sqrt(count)));
    const arcLength = (2 * Math.PI * GLOBE.label) / count;
    const budget = Math.floor((arcLength * 0.82) / (0.62 * fontSize));

    return people.map((name, index) => {
      const from = -90 + index * step + gap / 2;
      const to = -90 + (index + 1) * step - gap / 2;
      const atRest = (from + to) / 2 + rest;
      return {
        name,
        color: CAPSULE_COLORS[index % CAPSULE_COLORS.length],
        dome: annulus(from, to, GLOBE.equator, GLOBE.outer),
        clear: annulus(from, to, GLOBE.inner, GLOBE.equator),
        seam: arc(from, to, GLOBE.equator),
        gloss: arc(from + (to - from) * 0.12, from + (to - from) * 0.46, GLOBE.outer - 11),
        label: fitLabel(name, budget),
        labelPath: labelArc(from, to, GLOBE.label, atRest),
        fontSize,
      };
    });
  });

  protected readonly looseCapsules = computed<LooseCapsule[]>(() =>
    LOOSE_CAPSULES.map((capsule, index) => {
      const { cx, cy } = capsule;
      const r = LOOSE_RADIUS;
      return {
        color: CAPSULE_COLORS[index % CAPSULE_COLORS.length],
        dome: `M${cx - r} ${cy}a${r} ${r} 0 0 1 ${r * 2} 0Z`,
        shell: `M${cx - r} ${cy}a${r} ${r} 0 0 0 ${r * 2} 0Z`,
        seam: `M${cx - r - 1} ${cy}h${r * 2 + 2}`,
        spot: `M${cx - r * 0.62} ${cy - r * 0.42}a${r * 0.72} ${r * 0.72} 0 0 1 ${r * 0.5} ${-r * 0.42}`,
        transform: `rotate(${capsule.rot} ${cx} ${cy})`,
      };
    }),
  );

  /** The knurling OWN-WORLD names on the chrome ring, drawn rather than implied. */
  protected readonly flutes = computed<string[]>(() =>
    Array.from({ length: 84 }, (_, index) => {
      const angle = (index * 360) / 84;
      return `M${point(angle, 171)}L${point(angle, 183)}`;
    }),
  );

  protected readonly waitingCount = computed(
    () => this.cycleEntries().filter((entry) => entry.status === 'waiting').length,
  );

  protected readonly winnerColor = computed(() => {
    const draw = this.draw();
    if (!draw) return CAPSULE_COLORS[0];
    return CAPSULE_COLORS[draw.cyclePosition % CAPSULE_COLORS.length];
  });

  constructor() {
    window.setTimeout(() => this.spinOnEntry(), 280);
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
    const url = `${window.location.href.split('#')[0]}#grupo=${encoded}&inicio=${this.startMonth()}`;
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
    return index < 0 ? 'transparent' : CAPSULE_COLORS[index % CAPSULE_COLORS.length];
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
        return { participants: normalizeParticipants(parsed.slice(0, 60)), startMonth: currentStartMonth, isShared: false };
      }
    } catch {
      // A demonstrative list keeps the app useful when storage is unavailable.
    }
    return { participants: DEMO_PARTICIPANTS, startMonth: currentStartMonth, isShared: false };
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
      return { participants: parsed, startMonth: parseMonthValue(startMonth ?? '') ? startMonth! : this.currentMonthValue() };
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

function encodeParticipants(participants: readonly string[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(participants));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeParticipants(encoded: string): string[] {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) return [];
  return normalizeParticipants(
    parsed.slice(0, 60).map(normalizeName).filter((name) => name.length > 0 && name.length <= 60),
  );
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

function isStoredConfiguration(value: unknown): value is { participants: string[]; startMonth: string } {
  return typeof value === 'object' && value !== null &&
    Array.isArray((value as { participants?: unknown }).participants) &&
    (value as { participants: unknown[] }).participants.every((person) => typeof person === 'string') &&
    typeof (value as { startMonth?: unknown }).startMonth === 'string' &&
    parseMonthValue((value as { startMonth: string }).startMonth) !== null;
}

function point(angle: number, radius: number): string {
  const radians = (angle * Math.PI) / 180;
  return `${(GLOBE.cx + radius * Math.cos(radians)).toFixed(2)} ${(GLOBE.cy + radius * Math.sin(radians)).toFixed(2)}`;
}

function annulus(from: number, to: number, inner: number, outer: number): string {
  const large = to - from > 180 ? 1 : 0;
  return `M${point(from, outer)}A${outer} ${outer} 0 ${large} 1 ${point(to, outer)}` +
    `L${point(to, inner)}A${inner} ${inner} 0 ${large} 0 ${point(from, inner)}Z`;
}

function arc(from: number, to: number, radius: number): string {
  const large = to - from > 180 ? 1 : 0;
  return `M${point(from, radius)}A${radius} ${radius} 0 ${large} 1 ${point(to, radius)}`;
}

/** Names ride the rim, so capsules resting on the lower half need their arc reversed to stay readable. */
function labelArc(from: number, to: number, radius: number, atRest: number): string {
  const middle = ((atRest + 180) % 360 + 360) % 360 - 180;
  if (middle < 0) return arc(from, to, radius);
  const large = to - from > 180 ? 1 : 0;
  return `M${point(to, radius)}A${radius} ${radius} 0 ${large} 0 ${point(from, radius)}`;
}

/** Fit the first name if the arc allows it, then initials, then a single letter. */
function fitLabel(name: string, budget: number): string {
  if (budget < 1) return '';
  const first = name.split(' ')[0];
  if (budget >= first.length) return first;
  const short = name.split(' ').slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  if (budget >= short.length) return short;
  return short.slice(0, 1);
}
