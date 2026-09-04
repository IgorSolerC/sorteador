import { hashString, normalizeName, participantKey } from './naming';
import { CAPSULE_COLOR_COUNT, defaultColorIndex, isColorIndex } from './palette';

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
  /**
   * A aparência de uma cápsula: a cor dela na paleta e o emoji que sai como confete
   * quando ela cai. Só descreve a pessoa — nunca toca no bolo, na rodada nem no vencedor.
   */
  | {
      readonly type: 'member_styled';
      readonly at: number;
      readonly memberId: string;
      readonly colorIndex: number | null;
      readonly emoji: string | null;
      readonly actor?: string;
    }
  | { readonly type: 'spin'; readonly at: number; readonly actor?: string }
  | {
      readonly type: 'spin_annotated';
      readonly at: number;
      readonly spinIndex: number;
      readonly title: string;
      readonly subtitle: string;
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
  /** Posição na paleta, não um hexadecimal: a paleta pode ser reafinada sem reescrever o log. */
  readonly colorIndex: number;
  /** Um único símbolo, ou vazio. É ele que vira confete quando a cápsula sai. */
  readonly emoji: string;
}

/**
 * A etiqueta colada na cápsula depois que ela saiu: o que foi escolhido e como foi.
 * Ela descreve o giro e nunca participa dele — ver `replay()`, onde uma anotação não
 * toca no bolo, na rodada nem no vencedor.
 */
export interface SpinNote {
  readonly title: string;
  /** A segunda metade do resumo, depois do marcador: o placar, a nota, quem ganhou. */
  readonly subtitle: string;
  readonly description: string;
  /** Quando a etiqueta ficou como está, não quando o giro aconteceu. */
  readonly at: number;
  /** Quem escreveu esta versão da etiqueta. Não é verificado. */
  readonly actor?: string;
  /** 1 na primeira escrita; a partir de 2 a etiqueta foi reescrita. */
  readonly revision: number;
}

export const MAX_NOTE_TITLE = 80;
export const MAX_NOTE_SUBTITLE = 60;
export const MAX_NOTE_DESCRIPTION = 280;

/**
 * Em unidades UTF-16, que é o que `size()` conta nas rules. Um emoji simples ocupa 2;
 * uma família com juntores e seletores de variação chega perto de 16, e é por isso que
 * o teto não é 2 nem 4.
 */
export const MAX_EMOJI = 16;

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
          // Quem volta volta com a própria cápsula. Quem chega recebe a próxima cor do
          // passo, que é o que espalha as primeiras pessoas pela roda inteira em vez de
          // entregar seis vizinhas de matiz às seis primeiras.
          colorIndex: existing?.colorIndex ?? defaultColorIndex(members.size),
          emoji: existing?.emoji ?? '',
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

      case 'member_styled': {
        // Pintar uma cápsula que não existe não é erro: é um evento cujo alvo o log ainda
        // não criou. Ele fica gravado e o replay o ignora, como todo evento sem alvo.
        // Quem já saiu do globo continua pintável — o álbum mostra as cápsulas dela.
        const existing = members.get(event.memberId);
        if (!existing) break;
        members.set(existing.id, {
          ...existing,
          colorIndex: isColorIndex(event.colorIndex) ? event.colorIndex : existing.colorIndex,
          emoji: typeof event.emoji === 'string' ? emojiText(event.emoji) : existing.emoji,
        });
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
        const subtitle = noteText(event.subtitle, MAX_NOTE_SUBTITLE, { singleLine: true });
        const description = noteText(event.description, MAX_NOTE_DESCRIPTION);

        // Etiqueta em branco é etiqueta retirada — e a retirada também fica no log.
        if (!title && !subtitle && !description) {
          notes.delete(event.spinIndex);
          break;
        }

        notes.set(event.spinIndex, {
          title,
          subtitle,
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

/**
 * Um emoji é um símbolo, não um texto curto. Cortar por ponto de código partiria uma
 * bandeira ou uma família ao meio e gravaria os cacos, então o corte é por grafema — o
 * que o navegador desenha como uma coisa só.
 */
export function emojiText(value: string): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.replace(/\s+/g, '');
  if (!trimmed) return '';

  const first = firstGrapheme(trimmed);
  // Um grafema maior que o teto não cabe no servidor. Guardar um pedaço dele gravaria
  // cacos, então não se guarda nada — e o campo continua vazio, que é um estado válido.
  return first.length <= MAX_EMOJI ? first : '';
}

/** Juntor de largura zero, seletores de variação, tons de pele e marcas de bandeira. */
const JOINERS = /[‍︎️\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u;

function firstGrapheme(value: string): string {
  const withSegmenter = (Intl as unknown as {
    Segmenter?: new (locale: string, options: { granularity: string }) => {
      segment(input: string): Iterable<{ segment: string }>;
    };
  }).Segmenter;

  if (withSegmenter) {
    for (const { segment } of new withSegmenter('pt-BR', { granularity: 'grapheme' }).segment(value)) {
      return segment;
    }
    return '';
  }

  // Sem `Intl.Segmenter`, junta manualmente o que vem colado: um ponto de código, e
  // enquanto o próximo for juntor, ele mais o que ele junta.
  const points = [...value];
  let taken = points[0] ?? '';
  let index = 1;
  while (index < points.length && JOINERS.test(points[index])) {
    taken += points[index];
    index += 1;
    if (points[index] && points[index - 1] === '‍') {
      taken += points[index];
      index += 1;
    }
  }
  return taken;
}

/**
 * O resumo de uma etiqueta numa linha só: `TÍTULO ● SUBTÍTULO`. É o que a célula do
 * registro e o cartão do álbum mostram quando o espaço não dá para o texto inteiro.
 */
export function noteSummary(note: SpinNote | null | undefined): string {
  if (!note) return '';
  return note.subtitle ? `${note.title} ● ${note.subtitle}` : note.title;
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
  const byId = membersById(state);
  return state.pool.map((id) => byId.get(id)).filter((member): member is GroupMember => !!member);
}

/**
 * Inclui quem já saiu do globo, de propósito: a cor e o emoji de uma pessoa identificam
 * as cápsulas dela no álbum inteiro, e o álbum vai muito além de quem está no grupo hoje.
 */
export function membersById(state: GroupState): ReadonlyMap<string, GroupMember> {
  return new Map(state.members.map((member) => [member.id, member]));
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

export { CAPSULE_COLOR_COUNT };
