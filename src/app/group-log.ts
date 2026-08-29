import { hashString, normalizeName, participantKey } from './draw-engine';

/**
 * The synced group is an append-only log of events, and every piece of state below is
 * derived from it by replaying that log. Nothing here reads a stored winner: the log is
 * the truth, which keeps the product's promise that a result is reproducible and
 * explainable even after the app grew a database.
 *
 * The randomness of a spin comes from the server's timestamp, which the client cannot
 * choose. Combined with a log nobody may edit or delete, that is what stops a person
 * holding the link from writing themselves a result.
 */

export type GroupEvent =
  | { readonly type: 'member_added'; readonly at: number; readonly name: string; readonly actor?: string }
  | { readonly type: 'member_removed'; readonly at: number; readonly memberId: string; readonly actor?: string }
  | { readonly type: 'spin'; readonly at: number; readonly actor?: string };

export interface GroupMember {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly joinedAt: number;
  readonly leftAt: number | null;
}

export interface SpinRecord {
  readonly index: number;
  readonly round: number;
  readonly at: number;
  /** Who was in the pool when the crank turned, so history stays readable years later. */
  readonly eligible: readonly string[];
  readonly winnerId: string;
  readonly winnerName: string;
}

export interface GroupState {
  readonly members: readonly GroupMember[];
  readonly round: number;
  /** Member ids still to be drawn in the current round. */
  readonly pool: readonly string[];
  readonly spins: readonly SpinRecord[];
  readonly lastSpin: SpinRecord | null;
}

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 60;

/**
 * A member's id is derived from the group and the normalized name, so the same name in
 * the same group is always the same person — leaving and coming back keeps their history,
 * which is what makes the no-repeat rule hold across roster churn.
 */
export function memberId(groupId: string, name: string): string {
  const key = `${groupId}:${participantKey(name)}`;
  const high = hashString(`membro:v1:${key}`).toString(16).padStart(8, '0');
  const low = hashString(`membro:v1:spread:${key}`).toString(16).padStart(8, '0');
  return `${high}${low}`;
}

export function emptyState(): GroupState {
  return { members: [], round: 1, pool: [], spins: [], lastSpin: null };
}

export function replay(groupId: string, events: readonly GroupEvent[]): GroupState {
  const members = new Map<string, GroupMember>();
  const spins: SpinRecord[] = [];
  let round = 1;
  let pool: string[] = [];
  // Who has already been drawn in the round now open; a rejoin must not clear this.
  let drawnThisRound = new Set<string>();

  const activeIds = () =>
    [...members.values()].filter((member) => member.active).map((member) => member.id).sort();

  for (const event of events) {
    switch (event.type) {
      case 'member_added': {
        const name = normalizeName(event.name);
        if (!name) break;
        const id = memberId(groupId, name);
        const existing = members.get(id);

        if (existing?.active) break;
        if (!existing && members.size >= MAX_MEMBERS) break;

        members.set(id, {
          id,
          name,
          active: true,
          joinedAt: existing?.joinedAt ?? event.at,
          leftAt: null,
        });
        // Joining mid-round means eligible at once, unless this person already went.
        if (!pool.includes(id) && !drawnThisRound.has(id)) pool = [...pool, id].sort();
        break;
      }

      case 'member_removed': {
        const existing = members.get(event.memberId);
        if (!existing?.active) break;
        members.set(existing.id, { ...existing, active: false, leftAt: event.at });
        pool = pool.filter((id) => id !== existing.id);
        break;
      }

      case 'spin': {
        const available = pool.filter((id) => members.get(id)?.active);
        const active = activeIds();
        if (active.length < MIN_MEMBERS || !available.length) break;

        const index = spins.length;
        const winnerId = available[pickIndex(groupId, index, event.at, available)];
        const winner = members.get(winnerId)!;

        spins.push({
          index,
          round,
          at: event.at,
          eligible: available,
          winnerId,
          winnerName: winner.name,
        });

        drawnThisRound.add(winnerId);
        pool = available.filter((id) => id !== winnerId);

        // A round closes when the pool empties; everyone active starts the next one.
        if (!pool.length) {
          round += 1;
          pool = activeIds();
          drawnThisRound = new Set();
        }
        break;
      }
    }
  }

  return {
    members: [...members.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    round,
    pool,
    spins,
    lastSpin: spins.length ? spins[spins.length - 1] : null,
  };
}

/** The spin's only unpredictable input is the server's clock, which the client never sets. */
function pickIndex(groupId: string, spinIndex: number, at: number, pool: readonly string[]): number {
  return hashString(`giro:v1:${groupId}:${spinIndex}:${at}:${pool.join('|')}`) % pool.length;
}

export function activeMembers(state: GroupState): readonly GroupMember[] {
  return state.members.filter((member) => member.active);
}

export function canSpin(state: GroupState): boolean {
  return activeMembers(state).length >= MIN_MEMBERS && state.pool.length > 0;
}

/** The members still in the globe this round, in the order the pool holds them. */
export function poolMembers(state: GroupState): readonly GroupMember[] {
  const byId = new Map(state.members.map((member) => [member.id, member]));
  return state.pool.map((id) => byId.get(id)).filter((member): member is GroupMember => !!member);
}

export function spinsOfRound(state: GroupState, round: number): readonly SpinRecord[] {
  return state.spins.filter((spin) => spin.round === round);
}
