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
  | { readonly type: 'spin'; readonly at: number; readonly actor?: string }
  | {
      readonly type: 'spin_annotated';
      readonly at: number;
      readonly spinIndex: number;
      readonly title: string;
      readonly description: string;
      readonly actor?: string;
    }
  /**
   * Um evento que este código ainda não entende — gravado por uma versão mais nova do app.
   * Ele existe para que a contagem bata com `versaoLog`; o replay o ignora.
   */
  | { readonly type: 'unknown'; readonly at: number };

export interface GroupMember {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly joinedAt: number;
  readonly leftAt: number | null;
}

/**
 * A etiqueta colada na cápsula depois que ela saiu: o que foi escolhido e como foi.
 * Ela descreve o giro e nunca participa dele — ver `replay()`, onde uma anotação não
 * toca no bolo, na rodada nem no vencedor.
 */
export interface SpinNote {
  readonly title: string;
  readonly description: string;
  /** Quando a etiqueta ficou como está, não quando o giro aconteceu. */
  readonly at: number;
  /** Quem escreveu esta versão da etiqueta. Não é verificado. */
  readonly actor?: string;
  /** 1 na primeira escrita; a partir de 2 a etiqueta foi reescrita. */
  readonly revision: number;
}

export const MAX_NOTE_TITLE = 80;
export const MAX_NOTE_DESCRIPTION = 280;

export interface SpinRecord {
  readonly index: number;
  readonly round: number;
  readonly at: number;
  /** Quem apertou a manivela, quando se identificou. Não é verificado. */
  readonly actor?: string;
  /** Who was in the pool when the crank turned, so history stays readable years later. */
  readonly eligible: readonly string[];
  readonly winnerId: string;
  readonly winnerName: string;
  /** O que foi jogado e como foi, quando alguém etiquetou. */
  readonly note: SpinNote | null;
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
  // Etiquetas por índice de giro. A última anotação de um giro é a que vale; as anteriores
  // continuam no log, que é o que permite mostrar "editado por" sem poder reescrever nada.
  const notes = new Map<number, SpinNote>();
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
          actor: event.actor,
          eligible: available,
          winnerId,
          winnerName: winner.name,
          note: null,
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

      case 'spin_annotated': {
        // Só se etiqueta uma cápsula que já caiu na bandeja. Sem isto daria para escrever
        // a etiqueta do próximo giro antes de ele acontecer, e a etiqueta viraria aposta.
        if (!Number.isInteger(event.spinIndex)) break;
        if (event.spinIndex < 0 || event.spinIndex >= spins.length) break;

        const title = noteText(event.title, MAX_NOTE_TITLE, { singleLine: true });
        const description = noteText(event.description, MAX_NOTE_DESCRIPTION);

        // Etiqueta em branco é etiqueta retirada — e a retirada também fica no log.
        if (!title && !description) {
          notes.delete(event.spinIndex);
          break;
        }

        notes.set(event.spinIndex, {
          title,
          description,
          at: event.at,
          actor: event.actor,
          revision: (notes.get(event.spinIndex)?.revision ?? 0) + 1,
        });
        break;
      }

      // Um evento de uma versão mais nova do app: contado, nunca interpretado.
      case 'unknown':
        break;
    }
  }

  const annotated: SpinRecord[] = notes.size
    ? spins.map((spin) => ({ ...spin, note: notes.get(spin.index) ?? null }))
    : spins;

  return {
    members: [...members.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    round,
    pool,
    spins: annotated,
    lastSpin: annotated.length ? annotated[annotated.length - 1] : null,
  };
}

/**
 * Texto de etiqueta, cortado exatamente na medida que o servidor usa. `size()` nas rules
 * conta unidades UTF-16 — o mesmo que `.length` — mas um `slice` cru nessa medida parte um
 * par substituto ao meio e grava meio emoji. Então o corte anda de caractere em caractere
 * e para antes de estourar o orçamento em unidades. "Nota 8/10 🎮" é uso real aqui.
 */
export function noteText(value: string, max: number, { singleLine = false } = {}): string {
  if (typeof value !== 'string') return '';
  const collapsed = singleLine
    ? value.replace(/\s+/g, ' ')
    : value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');

  const trimmed = collapsed.trim();
  if (trimmed.length <= max) return trimmed;

  let cut = '';
  for (const character of trimmed) {
    if (cut.length + character.length > max) break;
    cut += character;
  }
  return cut.trim();
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

/** A etiqueta de um giro, se alguém colou uma. */
export function spinNote(state: GroupState, spinIndex: number): SpinNote | null {
  return state.spins[spinIndex]?.note ?? null;
}

/** Só os giros já etiquetados — a estante do que o clube jogou. */
export function annotatedSpins(state: GroupState): readonly SpinRecord[] {
  return state.spins.filter((spin) => spin.note);
}
