import { hashString, normalizeName, participantKey } from './naming';
import { defaultColorIndex, isColorIndex } from './palette';

/**
 * O grupo sincronizado é um log de eventos append-only, e todo estado abaixo é derivado
 * dele por replay. Nada aqui lê um vencedor gravado: o log é a verdade, que é o que
 * mantém a promessa do produto — um resultado reproduzível e explicável mesmo depois de
 * o app ter ganhado um banco de dados.
 *
 * O imprevisível de um giro vem do carimbo de hora do servidor, que o cliente não
 * escolhe. Junto de um log que ninguém pode reescrever nem apagar, é isso que impede quem
 * tem o link de escrever a si mesmo um resultado.
 *
 * A etiqueta é O JOGO daquele giro: título e descrição, compartilhados por todo o clube.
 * As resenhas penduram nela — uma por pessoa, com as notas e o que ela achou — e a nota
 * média nunca é gravada, é derivada aqui. Uma média gravável seria estado derivado
 * gravável, exatamente o que este arquivo recusa.
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
  /** A etiqueta do giro: o jogo que o clube jogou. Uma só, e todo mundo pode reescrevê-la. */
  | {
      readonly type: 'spin_annotated';
      readonly at: number;
      readonly spinIndex: number;
      readonly title: string;
      readonly description: string;
      readonly actor?: string;
    }
  /**
   * A resenha de uma pessoa sobre o jogo daquele giro. Uma por pessoa: quem escreve de
   * novo reescreve a sua, e `withdrawn` a retira. Como tudo aqui, retirar é gravar.
   */
  | {
      readonly type: 'spin_reviewed';
      readonly at: number;
      readonly spinIndex: number;
      /** Obrigatório: uma resenha sem assinatura não é de ninguém, e ninguém a editaria. */
      readonly actor: string;
      readonly score: number | null;
      readonly criteria: Readonly<Partial<Record<ReviewCriterion, number>>>;
      readonly status: ReviewStatus | null;
      /** Quantas horas o jogo tomou. Opcional: `null` é "não contei". */
      readonly hours: number | null;
      readonly text: string;
      readonly withdrawn: boolean;
    }
  /**
   * Quem estava na mesa naquele jogo. É uma correção do elenco, e não do sorteio: o globo
   * daquele giro é imutável, porque é dele que o vencedor sai. Ela existe para quem entrou
   * no clube depois e jogou assim mesmo, e para quem estava no globo mas não apareceu.
   */
  | {
      readonly type: 'spin_seated';
      readonly at: number;
      readonly spinIndex: number;
      readonly memberId: string;
      readonly seated: boolean;
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
export const MAX_REVIEW_TEXT = 600;

/** Como a pessoa terminou o jogo. Obrigatório: é ele que dá denominador à conta do álbum. */
export type ReviewStatus = 'platinado' | 'finalizado' | 'incompleto';

export const REVIEW_STATUSES = ['platinado', 'finalizado', 'incompleto'] as const;

/**
 * Os cinco critérios que toda resenha aceita, na ordem em que a ficha os pergunta. Só a
 * nota final é obrigatória — quem quiser dizer apenas "8" diz apenas "8", e a ficha não
 * cobra o resto.
 */
export const BASE_CRITERIA = [
  'diversao', 'historia', 'qualidade', 'jogabilidade', 'dificuldade',
] as const;

/**
 * Os dois critérios que só existem para quem PLATINOU. Platinar é outro jogo dentro do
 * jogo: a caçada aos troféus tem uma dificuldade e uma graça próprias, que muitas vezes
 * não são as do jogo em si — há jogo delicioso de jogar e insuportável de platinar.
 *
 * Eles só são perguntados a quem marcou `platinado`, e só entram na média por essa mesma
 * porta: a média de "dificuldade de platinar" de quem não platinou não existe.
 */
export const PLATINUM_CRITERIA = ['diversaoPlatina', 'dificuldadePlatina'] as const;

export const REVIEW_CRITERIA = [...BASE_CRITERIA, ...PLATINUM_CRITERIA] as const;

export type ReviewCriterion = (typeof REVIEW_CRITERIA)[number];
export type PlatinumCriterion = (typeof PLATINUM_CRITERIA)[number];

/** O rótulo de cada critério, para quem escreve e para quem lê. */
export const REVIEW_CRITERION_LABELS: Readonly<Record<ReviewCriterion, string>> = {
  diversao: 'Diversão',
  historia: 'História',
  qualidade: 'Qualidade',
  jogabilidade: 'Jogabilidade',
  dificuldade: 'Dificuldade',
  diversaoPlatina: 'Diversão da platina',
  dificuldadePlatina: 'Dificuldade de platinar',
};

/** Se o critério é um dos dois que pendem da platina. */
export function isPlatinumCriterion(criterion: ReviewCriterion): boolean {
  return (PLATINUM_CRITERIA as readonly string[]).includes(criterion);
}

/**
 * Dificuldade não se responde com um número. Ninguém sabe dizer a diferença entre 6 e 7
 * de dificuldade, e a nota dela ficava perdida no meio de notas que são elogio — parecia
 * que difícil era bom. Ela vira uma escolha de cinco degraus, com as palavras que o clube
 * já usa. A dificuldade de platinar usa exatamente os mesmos degraus.
 *
 * Os degraus são gravados na mesma escala 0–10 de todo critério, e não num campo novo: as
 * rules, a média e o denominador continuam sendo exatamente os mesmos. O que muda é como
 * se pergunta e como se lê.
 */
export interface DifficultyLevel {
  readonly score: number;
  readonly label: string;
}

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  { score: 0, label: 'Nenhuma' },
  { score: 2, label: 'Fácil' },
  { score: 5, label: 'Médio' },
  { score: 8, label: 'Difícil' },
  { score: 10, label: 'Impossível' },
];

/**
 * Os critérios que se respondem em palavra, e não em número. São as duas dificuldades — a
 * do jogo e a da platina —, pelo mesmo motivo: dificuldade não tem direção, e uma nota ali
 * pareceria elogio.
 */
export const NAMED_CRITERIA = ['dificuldade', 'dificuldadePlatina'] as const;

export function isNamedCriterion(criterion: ReviewCriterion): boolean {
  return (NAMED_CRITERIA as readonly string[]).includes(criterion);
}

/** O degrau mais próximo de uma nota. A média cai entre dois, e ela nomeia o vizinho. */
export function difficultyLabel(score: number): string {
  let perto = DIFFICULTY_LEVELS[0];
  for (const level of DIFFICULTY_LEVELS) {
    if (Math.abs(level.score - score) < Math.abs(perto.score - score)) perto = level;
  }
  return perto.label;
}

/**
 * Como o valor de um critério se lê. `average` distingue os dois casos que existem: a
 * média do clube tem casa decimal (`8,5`), a nota de uma pessoa é o inteiro que ela
 * marcou (`8`). As duas dificuldades ignoram os dois casos e respondem em palavra.
 */
export function criterionText(
  criterion: ReviewCriterion,
  score: number,
  average = false,
): string {
  if (isNamedCriterion(criterion)) return difficultyLabel(score);
  return average ? formatScore(score) : String(score);
}

export const REVIEW_STATUS_LABELS: Readonly<Record<ReviewStatus, string>> = {
  platinado: 'Platinado',
  finalizado: 'Finalizado',
  incompleto: 'Incompleto',
};

/** Toda nota é um inteiro de 0 a 10. Meia nota vira discussão, e a régua é de onze casas. */
export const MAX_SCORE = 10;

/**
 * O tempo de jogo é em horas inteiras. Meia hora não muda a conversa do clube, e um
 * inteiro é o que as rules sabem validar sem margem. O teto é folgado de propósito: há
 * jogo que toma mil horas de uma pessoa, e um teto apertado viraria uma discussão.
 */
export const MAX_HOURS = 2000;

/**
 * O que uma pessoa achou do jogo daquele giro. Ela pende da etiqueta e nunca a substitui:
 * o jogo é um só, as opiniões sobre ele são muitas.
 */
export interface SpinReview {
  /** Quem escreveu, como ela assinou. Não é verificado — é o mesmo crachá de sempre. */
  readonly author: string;
  /** A chave que faz duas assinaturas serem a mesma pessoa: a normalização congelada. */
  readonly authorKey: string;
  readonly score: number;
  readonly criteria: Readonly<Partial<Record<ReviewCriterion, number>>>;
  readonly status: ReviewStatus;
  /** Quantas horas o jogo tomou desta pessoa. `null` quando ela não contou. */
  readonly hours: number | null;
  readonly text: string;
  readonly at: number;
  /** 1 na primeira escrita; a partir de 2 a resenha foi reescrita. */
  readonly revision: number;
}

/**
 * Em unidades UTF-16, que é o que `size()` conta nas rules. Um emoji simples ocupa 2;
 * uma família com juntores e seletores de variação chega perto de 16, e é por isso que
 * o teto não é 2 nem 4.
 */
export const MAX_EMOJI = 16;

/**
 * Uma cadeira na mesa de um jogo. `memberId` fica vazio quando quem resenhou não é (nem
 * foi) do grupo: a assinatura de uma resenha não é verificada, e quem escreveu jogou.
 */
export interface SpinSeat {
  /** A chave da pessoa: a mesma normalização que identifica a resenha dela. */
  readonly key: string;
  readonly name: string;
  readonly memberId: string;
}

export interface SpinRecord {
  readonly index: number;
  readonly round: number;
  readonly at: number;
  /** Quem apertou a manivela, quando se identificou. Não é verificado. */
  readonly actor?: string;
  /** Quem estava no bolo quando a manivela virou, para o histórico se ler daqui a anos. */
  readonly eligible: readonly string[];
  readonly winnerId: string;
  readonly winnerName: string;
  /** O JOGO desta cápsula: título e descrição, quando alguém etiquetou. */
  readonly note: SpinNote | null;
  /** Uma resenha por pessoa, na ordem em que a primeira versão de cada uma foi escrita. */
  readonly reviews: readonly SpinReview[];
  /**
   * Quem jogou. Começa igual ao globo daquele giro e pode ser corrigida; quem resenhou
   * entra sempre, porque escrever sobre o jogo é a prova de que jogou. É o denominador de
   * "X resenhas de Y", e nunca uma entrada do sorteio.
   */
  readonly seated: readonly SpinSeat[];
}

export interface GroupState {
  readonly members: readonly GroupMember[];
  readonly round: number;
  /** Os ids que ainda faltam sair na rodada aberta. */
  readonly pool: readonly string[];
  readonly spins: readonly SpinRecord[];
  readonly lastSpin: SpinRecord | null;
}

export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 60;

/**
 * O id de um membro sai do grupo mais o nome normalizado, então o mesmo nome no mesmo
 * grupo é sempre a mesma pessoa — sair e voltar preserva o histórico dela, que é o que
 * mantém a regra de não repetir de pé mesmo com a lista mudando.
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
  // Resenhas por giro e, dentro dele, por pessoa. O `Map` de dentro guarda a ordem em que
  // cada pessoa apareceu pela primeira vez: reescrever a própria resenha não empurra
  // ninguém para o fim da lista, e a parede não se remexe entre duas visitas.
  const reviews = new Map<number, Map<string, SpinReview>>();
  // As correções de mesa por giro: memberId -> está na mesa. A última correção de cada
  // pessoa é a que vale, como em toda coisa reescrita neste log.
  const seating = new Map<number, Map<string, boolean>>();
  let round = 1;
  let pool: string[] = [];
  // Quem já saiu na rodada aberta; voltar ao grupo não pode limpar isto.
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
        // O teto é do GLOBO, e não de quanta gente o log já viu: quem saiu libera a vaga
        // que ocupava. Contando o mapa inteiro, um clube que trocou de gente ao longo dos
        // anos parava de aceitar nome novo em silêncio — a tela dizia "entrou no globo" e o
        // evento era descartado aqui, depois de o servidor já ter gasto a escrita.
        const noGlobo = [...members.values()].filter((member) => member.active).length;
        if (!existing && noGlobo >= MAX_MEMBERS) break;

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
          reviews: [],
          seated: [],
        });

        drawnThisRound.add(winnerId);
        pool = available.filter((id) => id !== winnerId);

        // A rodada fecha quando o bolo esvazia; a seguinte começa com todo mundo ativo.
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
        // As resenhas continuam: o jogo saiu da tela, o que as pessoas acharam não.
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

      case 'spin_reviewed': {
        // Vale o mesmo da etiqueta: só se resenha uma cápsula que já caiu na bandeja.
        if (!Number.isInteger(event.spinIndex)) break;
        if (event.spinIndex < 0 || event.spinIndex >= spins.length) break;

        // Sem assinatura não há de quem seja a resenha, e ninguém conseguiria editá-la.
        const author = normalizeName(event.actor ?? '').slice(0, 60);
        const key = participantKey(author);
        if (!key) break;

        const written = reviews.get(event.spinIndex) ?? new Map<string, SpinReview>();
        const previous = written.get(key);

        if (event.withdrawn) {
          written.delete(key);
          reviews.set(event.spinIndex, written);
          break;
        }

        // Nota final e status são o mínimo de uma resenha. Um evento sem os dois não
        // descreve opinião nenhuma; ele fica no log e o replay o ignora, como todo evento
        // que não forma nada.
        const score = asScore(event.score);
        const status = asStatus(event.status);
        if (score === null || status === null) break;

        written.set(key, {
          author,
          authorKey: key,
          score,
          criteria: asCriteria(event.criteria, status),
          status,
          hours: asHours(event.hours),
          text: noteText(event.text, MAX_REVIEW_TEXT),
          at: event.at,
          revision: (previous?.revision ?? 0) + 1,
        });
        reviews.set(event.spinIndex, written);
        break;
      }

      case 'spin_seated': {
        // Como a etiqueta e a resenha: só se corrige a mesa de uma cápsula que já caiu.
        if (!Number.isInteger(event.spinIndex)) break;
        if (event.spinIndex < 0 || event.spinIndex >= spins.length) break;
        if (typeof event.memberId !== 'string' || !event.memberId) break;

        const mesa = seating.get(event.spinIndex) ?? new Map<string, boolean>();
        mesa.set(event.memberId, event.seated === true);
        seating.set(event.spinIndex, mesa);
        break;
      }

      // Um evento de uma versão mais nova do app: contado, nunca interpretado.
      case 'unknown':
        break;
    }
  }

  // A chave de participante de cada membro, para casar a assinatura de uma resenha com a
  // pessoa do grupo. As duas saem da mesma normalização congelada.
  const byKey = new Map<string, GroupMember>();
  for (const member of members.values()) byKey.set(participantKey(member.name), member);

  const annotated: SpinRecord[] = spins.map((spin) => {
    const written = [...(reviews.get(spin.index)?.values() ?? [])];
    return {
      ...spin,
      note: notes.get(spin.index) ?? null,
      reviews: written,
      seated: seatsOf(members, byKey, spin, seating.get(spin.index), written),
    };
  });

  return {
    members: [...members.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
    round,
    pool,
    spins: annotated,
    lastSpin: annotated.length ? annotated[annotated.length - 1] : null,
  };
}

/**
 * A mesa de um giro: quem estava no globo, mais quem foi posto depois, menos quem foi
 * tirado — e sempre, por cima de tudo, quem resenhou.
 *
 * A ordem das três camadas é o que mantém "X resenhas de Y" honesto: uma resenha nunca
 * pode ficar de fora da conta, então tirar da mesa quem já escreveu não tem efeito. A
 * tela também não oferece essa saída; aqui é onde ela é impossível.
 */
function seatsOf(
  members: ReadonlyMap<string, GroupMember>,
  byKey: ReadonlyMap<string, GroupMember>,
  spin: SpinRecord,
  fixes: ReadonlyMap<string, boolean> | undefined,
  written: readonly SpinReview[],
): readonly SpinSeat[] {
  const seats = new Map<string, SpinSeat>();

  const sit = (member: GroupMember) => {
    const key = participantKey(member.name);
    if (key) seats.set(key, { key, name: member.name, memberId: member.id });
  };

  for (const id of spin.eligible) {
    const member = members.get(id);
    if (member) sit(member);
  }

  for (const [id, seated] of fixes ?? []) {
    const member = members.get(id);
    // Uma correção que aponta para alguém que o log não conhece não senta ninguém.
    if (!member) continue;
    if (seated) sit(member);
    else seats.delete(participantKey(member.name));
  }

  for (const review of written) {
    if (seats.has(review.authorKey)) continue;
    // Quem assinou uma resenha pode nem ser do grupo: a assinatura não é verificada. Ela
    // senta com o nome que escreveu, e sem cápsula quando o grupo não a conhece.
    const member = byKey.get(review.authorKey);
    seats.set(review.authorKey, {
      key: review.authorKey,
      name: member?.name ?? review.author,
      memberId: member?.id ?? '',
    });
  }

  return [...seats.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
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
 * O resumo de um giro numa linha só: `TÍTULO · 8,4`. É o que a célula do registro mostra
 * quando o espaço não dá para o jogo inteiro. Sem resenha, o título sozinho — a metade
 * depois do marcador só existe quando o clube deu uma nota.
 */
export function spinSummary(spin: SpinRecord | null | undefined): string {
  if (!spin?.note) return '';
  const average = spinScores(spin).score;
  return average === null ? spin.note.title : `${spin.note.title} · ${formatScore(average)}`;
}

/**
 * Horas na tela. A média cai em quebrado — três pessoas com 10, 12 e 15 dão 12,33 —, e uma
 * casa decimal já é mais precisão do que o clube discute; `12 h` inteiro é o caso comum.
 */
export function formatHours(value: number): string {
  const arredondado = Math.round(value * 10) / 10;
  return Number.isInteger(arredondado)
    ? `${arredondado} h`
    : `${arredondado.toFixed(1).replace('.', ',')} h`;
}

/** Uma casa decimal e vírgula, porque a tela fala português. `8` continua sendo `8,0`. */
export function formatScore(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/**
 * O temperamento de uma nota: em qual das quatro tintas ela é impressa.
 *
 * De 8 para cima o jogo é um feito do clube e sai em ciano, com faísca. De 2 para baixo
 * ele foi um desastre e sai em vermelho; entre 2 e 4, em laranja. O miolo — a maior parte
 * das notas — fica em tinta preta, e é justamente isso que faz os extremos serem vistos.
 *
 * A faixa é a mesma em toda parte — ficha, álbum e registro — justamente para que a cor
 * signifique sempre a mesma coisa. Ela é derivada, como toda a conta: nunca gravada.
 */
export type ScoreTone = 'high' | 'mid' | 'low' | 'worst';

export const SCORE_HIGH = 8;
export const SCORE_LOW = 4;
export const SCORE_WORST = 2;

export function scoreTone(score: number | null | undefined): ScoreTone {
  if (score === null || score === undefined) return 'mid';
  if (score >= SCORE_HIGH) return 'high';
  if (score <= SCORE_WORST) return 'worst';
  if (score <= SCORE_LOW) return 'low';
  return 'mid';
}

/**
 * A conta do clube sobre um jogo, derivada das resenhas e nunca gravada: a média das notas
 * finais, a média de cada critério entre quem o avaliou, e quantas pessoas terminaram de
 * cada jeito. Uma média gravável seria um número que alguém poderia escrever à mão.
 */
export interface SpinScores {
  /** Quantas pessoas resenharam. É o denominador das notas. */
  readonly count: number;
  /** Quantas pessoas jogaram. É o denominador da completude. */
  readonly seats: number;
  /** Quantas jogaram e ainda não escreveram. Elas contam como incompleto. */
  readonly pending: number;
  /** O tempo médio que o jogo tomou, entre quem contou. `null` quando ninguém contou. */
  readonly hours: { readonly average: number; readonly count: number } | null;
  /** A nota do jogo para o clube: a média das notas finais. `null` sem resenha nenhuma. */
  readonly score: number | null;
  readonly criteria: Readonly<Partial<Record<ReviewCriterion, { average: number; count: number }>>>;
  readonly completion: Readonly<Record<ReviewStatus, number>>;
}

export function spinScores(spin: SpinRecord | null | undefined): SpinScores {
  const reviews = spin?.reviews ?? [];
  const completion: Record<ReviewStatus, number> = { platinado: 0, finalizado: 0, incompleto: 0 };
  const criteria: Partial<Record<ReviewCriterion, { average: number; count: number }>> = {};
  // Quem jogou e não escreveu ainda conta: é o que impede que uma pessoa que zerou o jogo
  // antes dos outros começarem apareça como "100% finalizado" para o clube inteiro.
  const seats = Math.max(spin?.seated.length ?? 0, reviews.length);

  if (!reviews.length) {
    return { count: 0, seats, pending: seats, hours: null, score: null, criteria, completion };
  }

  let total = 0;
  let horas = 0;
  let contaram = 0;
  for (const review of reviews) {
    total += review.score;
    completion[review.status] += 1;
    if (review.hours !== null) {
      horas += review.hours;
      contaram += 1;
    }
  }

  for (const criterion of REVIEW_CRITERIA) {
    // Cada critério tem o próprio denominador: quem não avaliou dificuldade não entra na
    // média de dificuldade. Somar zero por ausência inventaria uma nota que ninguém deu.
    let soma = 0;
    let quantos = 0;
    for (const review of reviews) {
      const nota = review.criteria[criterion];
      if (nota === undefined) continue;
      soma += nota;
      quantos += 1;
    }
    if (quantos) criteria[criterion] = { average: soma / quantos, count: quantos };
  }

  return {
    count: reviews.length,
    seats,
    pending: Math.max(seats - reviews.length, 0),
    hours: contaram ? { average: horas / contaram, count: contaram } : null,
    score: total / reviews.length,
    criteria,
    completion,
  };
}

/** A fatia de cada jeito de terminar, em porcentagem inteira que soma 100. */
/**
 * A completude do jogo para o clube inteiro, e não só para quem escreveu.
 *
 * O denominador é quem JOGOU, não quem resenhou, e quem jogou e ainda não escreveu entra
 * como incompleto. Sem isso, uma pessoa que zerou o jogo antes de os outros começarem
 * fazia o cartão dizer "100% finalizado" — o clube inteiro herdava a noite de uma pessoa.
 */
export function completionShare(scores: SpinScores): Readonly<Record<ReviewStatus, number>> {
  const share: Record<ReviewStatus, number> = { platinado: 0, finalizado: 0, incompleto: 0 };
  const total = scores.seats;
  if (!total) return share;

  const contagem: Record<ReviewStatus, number> = {
    platinado: scores.completion.platinado,
    finalizado: scores.completion.finalizado,
    incompleto: scores.completion.incompleto + scores.pending,
  };

  // Arredondar as três para baixo perde até dois pontos, e uma barra que soma 98% mostra
  // uma fresta. A maior fatia absorve a sobra, que é onde ela menos se nota.
  let atribuido = 0;
  let maior: ReviewStatus = 'platinado';
  for (const status of REVIEW_STATUSES) {
    share[status] = Math.floor((contagem[status] / total) * 100);
    atribuido += share[status];
    if (contagem[status] > contagem[maior]) maior = status;
  }
  share[maior] += 100 - atribuido;
  return share;
}

/** Uma nota só vale se for inteiro de 0 a 10: a régua da ficha tem onze casas, não mais. */
function asScore(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_SCORE
    ? (value as number)
    : null;
}

/** Horas inteiras, de 1 até o teto. Zero hora não é um tempo de jogo: é a ausência dele. */
function asHours(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_HOURS
    ? (value as number)
    : null;
}

function asStatus(value: unknown): ReviewStatus | null {
  return REVIEW_STATUSES.includes(value as ReviewStatus) ? (value as ReviewStatus) : null;
}

/**
 * Só os critérios conhecidos, e só com nota válida. O resto é descartado.
 *
 * Os dois da platina pendem do status: uma resenha que não platinou não tem dificuldade de
 * platinar, e uma nota dessas num evento de quem marcou `finalizado` é contradição. O log
 * é para sempre e não se reescreve, então quem decide o que ela significa é o replay —
 * como sempre foi com todo campo que sobra num evento.
 */
function asCriteria(
  value: Readonly<Partial<Record<ReviewCriterion, number>>> | null | undefined,
  status: ReviewStatus,
): Readonly<Partial<Record<ReviewCriterion, number>>> {
  const kept: Partial<Record<ReviewCriterion, number>> = {};
  if (!value) return kept;
  for (const criterion of REVIEW_CRITERIA) {
    if (status !== 'platinado' && isPlatinumCriterion(criterion)) continue;
    const score = asScore(value[criterion]);
    if (score !== null) kept[criterion] = score;
  }
  return kept;
}

/** A única entrada imprevisível de um giro é o relógio do servidor, que o cliente não põe. */
function pickIndex(groupId: string, spinIndex: number, at: number, pool: readonly string[]): number {
  return hashString(`giro:v1:${groupId}:${spinIndex}:${at}:${pool.join('|')}`) % pool.length;
}

export function activeMembers(state: GroupState): readonly GroupMember[] {
  return state.members.filter((member) => member.active);
}

export function canSpin(state: GroupState): boolean {
  return activeMembers(state).length >= MIN_MEMBERS && state.pool.length > 0;
}

/** Quem ainda está no globo nesta rodada, na ordem em que o bolo os guarda. */
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
