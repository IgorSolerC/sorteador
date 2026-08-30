/**
 * Keeps the app from ever reaching a billable Firebase quota.
 *
 * The real guarantee is the project staying on the Spark plan: with no billing account
 * attached Google cannot charge, and an exhausted quota simply returns errors until the
 * daily reset. This guard's job is the layer above that — never get near the wall, and
 * degrade with a clear message instead of hammering a dead endpoint.
 *
 * Budgets are per device per UTC day and deliberately far below the project-wide free
 * tier, so a runaway loop or a leaked link burns one device's allowance, not the project's.
 */

export type UsageState = 'ok' | 'warning' | 'stopped';

export type StopReason =
  | 'read-budget'
  | 'write-budget'
  | 'burst'
  | 'quota-exhausted'
  | 'manual';

export interface UsageBudget {
  readonly reads: number;
  readonly writes: number;
  /** Fraction of a budget at which the app starts telling the user. */
  readonly warnAt: number;
  /** More calls than this inside the window means a loop, not a person. */
  readonly burstCalls: number;
  readonly burstWindowMs: number;
}

/**
 * Spark's daily allowance is roughly 50k reads and 20k writes across the whole project.
 * A person opening the app a few dozen times a day uses single digits of each, so these
 * caps are unreachable by real use and trip long before anything project-wide does.
 */
export const DEFAULT_BUDGET: UsageBudget = {
  reads: 1_500,
  writes: 300,
  warnAt: 0.7,
  burstCalls: 40,
  burstWindowMs: 10_000,
};

export interface UsageSnapshot {
  readonly day: string;
  readonly reads: number;
  readonly writes: number;
  readonly state: UsageState;
  readonly stopReason: StopReason | null;
  readonly stoppedUntil: string | null;
}

export interface UsageStore {
  read(): string | null;
  write(value: string): void;
}

interface StoredUsage {
  day: string;
  reads: number;
  writes: number;
  stopReason: StopReason | null;
}

const STORAGE_KEY = 'mesa-do-mes:uso:v1';

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export class UsageGuard {
  private usage: StoredUsage;
  private recentCalls: number[] = [];

  constructor(
    private readonly store: UsageStore,
    private readonly now: () => number = () => Date.now(),
    private readonly budget: UsageBudget = DEFAULT_BUDGET,
  ) {
    this.usage = this.load();
  }

  snapshot(): UsageSnapshot {
    this.rollDay();
    return {
      day: this.usage.day,
      reads: this.usage.reads,
      writes: this.usage.writes,
      state: this.state(),
      stopReason: this.usage.stopReason,
      stoppedUntil: this.usage.stopReason ? nextDay(this.usage.day) : null,
    };
  }

  state(): UsageState {
    this.rollDay();
    if (this.usage.stopReason) return 'stopped';

    const worst = Math.max(
      this.usage.reads / this.budget.reads,
      this.usage.writes / this.budget.writes,
    );
    return worst >= this.budget.warnAt ? 'warning' : 'ok';
  }

  canRead(count = 1): boolean {
    this.rollDay();
    return !this.usage.stopReason && this.usage.reads + count <= this.budget.reads;
  }

  canWrite(count = 1): boolean {
    this.rollDay();
    return !this.usage.stopReason && this.usage.writes + count <= this.budget.writes;
  }

  /** Records a read and reports whether the caller may keep going. */
  recordRead(count = 1): boolean {
    return this.record('read', count);
  }

  recordWrite(count = 1): boolean {
    return this.record('write', count);
  }

  /** Firestore answering `resource-exhausted` means the project itself hit its ceiling. */
  tripQuotaExhausted(): void {
    this.stop('quota-exhausted');
  }

  stop(reason: StopReason): void {
    this.rollDay();
    if (this.usage.stopReason) return;
    this.usage = { ...this.usage, stopReason: reason };
    this.persist();
  }

  /** Only for a person deliberately clearing the block; the day's counters stay. */
  resume(): void {
    this.rollDay();
    this.usage = { ...this.usage, stopReason: null };
    this.recentCalls = [];
    this.persist();
  }

  private record(kind: 'read' | 'write', count: number): boolean {
    this.rollDay();
    if (this.usage.stopReason) return false;

    if (this.isBursting(count)) {
      this.stop('burst');
      return false;
    }

    this.usage = kind === 'read'
      ? { ...this.usage, reads: this.usage.reads + count }
      : { ...this.usage, writes: this.usage.writes + count };

    if (this.usage.reads > this.budget.reads) this.usage.stopReason = 'read-budget';
    else if (this.usage.writes > this.budget.writes) this.usage.stopReason = 'write-budget';

    this.persist();
    return !this.usage.stopReason;
  }

  private isBursting(count: number): boolean {
    const now = this.now();
    const since = now - this.budget.burstWindowMs;
    this.recentCalls = this.recentCalls.filter((stamp) => stamp > since);
    for (let index = 0; index < count; index += 1) this.recentCalls.push(now);
    return this.recentCalls.length > this.budget.burstCalls;
  }

  private rollDay(): void {
    const today = utcDay(this.now());
    if (this.usage.day === today) return;
    // A new UTC day resets Firebase's quota too, so the block lifts with it.
    this.usage = { day: today, reads: 0, writes: 0, stopReason: null };
    this.recentCalls = [];
    this.persist();
  }

  private load(): StoredUsage {
    const fresh: StoredUsage = { day: utcDay(this.now()), reads: 0, writes: 0, stopReason: null };
    try {
      const raw = this.store.read();
      if (!raw) return fresh;
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredUsage(parsed)) return fresh;
      return parsed.day === fresh.day ? parsed : fresh;
    } catch {
      return fresh;
    }
  }

  private persist(): void {
    try {
      this.store.write(JSON.stringify(this.usage));
    } catch {
      // A blocked storage costs us the memory of the count, never a spend.
    }
  }
}

export function browserUsageStore(storage: Storage | undefined): UsageStore {
  return {
    read: () => {
      try {
        return storage?.getItem(STORAGE_KEY) ?? null;
      } catch {
        return null;
      }
    },
    write: (value: string) => {
      try {
        storage?.setItem(STORAGE_KEY, value);
      } catch {
        // Ignored on purpose: see persist().
      }
    },
  };
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function isStoredUsage(value: unknown): value is StoredUsage {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate['day'] === 'string' &&
    typeof candidate['reads'] === 'number' &&
    typeof candidate['writes'] === 'number' &&
    (candidate['stopReason'] === null || typeof candidate['stopReason'] === 'string');
}
