import { calculateMonthlyDraw, getCycleEntries, normalizeParticipants } from './draw-engine';

describe('draw engine', () => {
  const people = ['Ana', 'Breno', 'Cecilia', 'Davi', 'Elisa'];

  it('returns the same winner regardless of input order', () => {
    const first = calculateMonthlyDraw(people, 2026, 8);
    const second = calculateMonthlyDraw([...people].reverse(), 2026, 8);

    expect(first?.winner).toBe(second?.winner);
    expect(first?.fingerprint).toBe(second?.fingerprint);
  });

  it('draws everybody exactly once inside a complete cycle', () => {
    const reference = calculateMonthlyDraw(people, 2026, 8, 2026, 6)!;
    const winners = Array.from({ length: people.length }, (_, offset) => {
      const serial = reference.cycleStartSerial + offset;
      const year = Math.floor(serial / 12);
      const month = (serial % 12) + 1;
      return calculateMonthlyDraw(people, year, month, 2026, 6)!.winner;
    });

    expect(new Set(winners).size).toBe(people.length);
    expect(new Set(winners)).toEqual(new Set(people));
  });

  it('marks past, current and protected entries in the cycle', () => {
    const draw = calculateMonthlyDraw(people, 2026, 8, 2026, 6)!;
    const entries = getCycleEntries(draw);

    expect(entries.filter((entry) => entry.status === 'current')).toHaveLength(1);
    expect(entries[draw.cyclePosition].participant).toBe(draw.winner);
    expect(entries.slice(0, draw.cyclePosition).every((entry) => entry.status === 'drawn')).toBe(true);
    expect(entries.slice(draw.cyclePosition + 1).every((entry) => entry.status === 'waiting')).toBe(true);
  });

  it('normalizes whitespace and rejects duplicate names case-insensitively', () => {
    expect(normalizeParticipants(['  Ana  Maria ', 'ana maria', 'Breno'])).toEqual(['Ana Maria', 'Breno']);
  });

  it('requires at least two participants', () => {
    expect(calculateMonthlyDraw([], 2026, 8)).toBeNull();
    expect(calculateMonthlyDraw(['Ana'], 2026, 8)).toBeNull();
  });

  it('does not create a result or cycle history before the configured start month', () => {
    expect(calculateMonthlyDraw(people, 2026, 7, 2026, 8)).toBeNull();

    const firstMonth = calculateMonthlyDraw(people, 2026, 8, 2026, 8)!;
    expect(firstMonth.cyclePosition).toBe(0);
    expect(firstMonth.cycleStartSerial).toBe(2026 * 12 + 7);
  });
});
