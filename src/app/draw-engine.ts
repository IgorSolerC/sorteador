export interface MonthlyDraw {
  readonly year: number;
  readonly month: number;
  readonly cycleIndex: number;
  readonly cyclePosition: number;
  readonly cycleStartSerial: number;
  readonly orderedParticipants: readonly string[];
  readonly winner: string;
  readonly fingerprint: string;
}

export interface CycleEntry {
  readonly year: number;
  readonly month: number;
  readonly participant: string;
  readonly status: 'drawn' | 'current' | 'waiting';
}

export function normalizeName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function participantKey(value: string): string {
  return normalizeName(value).toLowerCase();
}

export function normalizeParticipants(values: readonly string[]): string[] {
  const unique = new Map<string, string>();

  for (const value of values) {
    const name = normalizeName(value);
    if (name && !unique.has(participantKey(name))) {
      unique.set(participantKey(name), name);
    }
  }

  return [...unique.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, name]) => name);
}

export function calculateMonthlyDraw(
  values: readonly string[],
  year: number,
  month: number,
  startYear = year,
  startMonth = month,
): MonthlyDraw | null {
  const participants = normalizeParticipants(values);
  if (
    participants.length < 2 ||
    month < 1 || month > 12 ||
    startMonth < 1 || startMonth > 12
  ) {
    return null;
  }

  const serial = year * 12 + month - 1;
  const startSerial = startYear * 12 + startMonth - 1;
  if (serial < startSerial) return null;

  const elapsedMonths = serial - startSerial;
  const cyclePosition = positiveModulo(elapsedMonths, participants.length);
  const cycleIndex = Math.floor(elapsedMonths / participants.length);
  const identity = participants.map(participantKey).join('|');
  const fingerprint = hashString(`grupo:v2:${identity}:${startSerial}`).toString(16).padStart(8, '0');
  const seed = hashString(`sorteio:v2:${identity}:${startSerial}:${cycleIndex}`);
  const orderedParticipants = shuffle(participants, seed);

  return {
    year,
    month,
    cycleIndex,
    cyclePosition,
    cycleStartSerial: startSerial + cycleIndex * participants.length,
    orderedParticipants,
    winner: orderedParticipants[cyclePosition],
    fingerprint,
  };
}

export function getCycleEntries(draw: MonthlyDraw): CycleEntry[] {
  return draw.orderedParticipants.map((participant, index) => {
    const { year, month } = fromMonthSerial(draw.cycleStartSerial + index);
    return {
      year,
      month,
      participant,
      status: index < draw.cyclePosition ? 'drawn' : index === draw.cyclePosition ? 'current' : 'waiting',
    };
  });
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function shuffle<T>(values: readonly T[], seed: number): T[] {
  const result = [...values];
  const random = mulberry32(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function fromMonthSerial(serial: number): { year: number; month: number } {
  const year = Math.floor(serial / 12);
  return { year, month: positiveModulo(serial, 12) + 1 };
}
