import type { Auth } from 'firebase/auth';
import { signInAnonymously } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  GroupEvent,
  GroupState,
  MAX_NOTE_DESCRIPTION,
  MAX_NOTE_TITLE,
  MAX_HOURS,
  MAX_REVIEW_TEXT,
  MAX_SCORE,
  isPlatinumCriterion,
  isReactionEmoji,
  REVIEW_CRITERIA,
  REVIEW_STATUSES,
  ReviewCriterion,
  ReviewStatus,
  emojiText,
  noteText,
  replay,
} from './group-log';
import { isColorIndex } from './palette';
import { UsageGuard } from './usage-guard';

/**
 * A camada que fala com o Firestore. Duas regras a governam:
 *
 * 1. Toda ida à rede passa pelo UsageGuard. Se ele barrar, a operação não acontece —
 *    é assim que a cota nunca chega perto da parede.
 * 2. O vencedor nunca é lido de um campo; ele é derivado do log por `replay()`. O log
 *    fica em cache local e só o delta é buscado, então o caso comum custa 1 leitura.
 */

export class UsageBlockedError extends Error {
  constructor(readonly reason: string) {
    super(`Operação bloqueada pelo orçamento de uso (${reason}).`);
    this.name = 'UsageBlockedError';
  }
}

export interface GroupSnapshot {
  readonly groupId: string;
  readonly name: string;
  readonly logVersion: number;
  readonly lastSpinAt: number | null;
  readonly events: readonly GroupEvent[];
  readonly state: GroupState;
}

export interface LogCache {
  read(groupId: string): { logVersion: number; events: GroupEvent[] } | null;
  write(groupId: string, value: { logVersion: number; events: GroupEvent[] }): void;
}

export const SPIN_COOLDOWN_MS = 30_000;
const CACHE_PREFIX = 'mesa-do-mes:log:v1:';

export class GroupStore {
  constructor(
    private readonly db: Firestore,
    private readonly auth: Auth,
    private readonly guard: UsageGuard,
    private readonly cache: LogCache,
  ) {}

  async signIn(): Promise<string> {
    if (this.auth.currentUser) return this.auth.currentUser.uid;
    const credential = await signInAnonymously(this.auth);
    return credential.user.uid;
  }

  async createGroup(name: string): Promise<string> {
    this.requireBudget({ writes: 1 });
    await this.signIn();

    const ref = doc(collection(this.db, 'grupos'));
    await this.run(() =>
      setDoc(ref, {
        nome: name.trim().slice(0, 60),
        criadoEm: serverTimestamp(),
        ultimoGiroEm: null,
        versaoLog: 0,
      }),
    );
    this.guard.recordWrite(1);
    this.cache.write(ref.id, { logVersion: 0, events: [] });
    return ref.id;
  }

  /**
   * Uma leitura no caso comum: o doc do grupo diz quantos eventos existem, e se o cache
   * local já tem todos, nada mais é buscado.
   */
  async load(groupId: string): Promise<GroupSnapshot> {
    this.requireBudget({ reads: 1 });
    await this.signIn();

    const groupSnap = await this.run(() => getDoc(doc(this.db, 'grupos', groupId)));
    this.guard.recordRead(1);
    if (!groupSnap.exists()) throw new Error(`Grupo ${groupId} não encontrado.`);

    const data = groupSnap.data();
    const logVersion: number = data['versaoLog'] ?? 0;
    const cached = this.cache.read(groupId);
    // O cache só serve se for internamente coerente: tantos eventos quanto ele diz ter.
    const cacheIntegro = !!cached && cached.events.length === cached.logVersion;
    let events: GroupEvent[] = cacheIntegro ? cached!.events : [];

    if (!cacheIntegro || cached!.logVersion !== logVersion) {
      events = await this.fetchLog(groupId, logVersion, events);
      this.cache.write(groupId, { logVersion, events });
    }

    return {
      groupId,
      name: data['nome'] ?? '',
      logVersion,
      lastSpinAt: toMillis(data['ultimoGiroEm']),
      events,
      state: replay(groupId, events),
    };
  }

  addMember(groupId: string, name: string, actor = ''): Promise<void> {
    return this.append(groupId, { tipo: 'member_added', nome: name.trim().slice(0, 60) }, {}, actor);
  }

  removeMember(groupId: string, memberId: string, actor = ''): Promise<void> {
    return this.append(groupId, { tipo: 'member_removed', memberId }, {}, actor);
  }

  /**
   * Pinta a cápsula de alguém e escolhe o emoji que ela solta ao cair. Como tudo aqui, é
   * um evento novo e não uma edição: a cápsula anterior continua no log, e é por isso que
   * repintar não pode reescrever histórico nenhum.
   *
   * Os dois campos são independentes. Omitir um significa "deixe como está", o que permite
   * trocar só a cor sem apagar o emoji — e um evento por salvamento em vez de dois.
   */
  styleMember(
    groupId: string,
    memberId: string,
    style: { colorIndex?: number; emoji?: string },
    actor = '',
  ): Promise<void> {
    const cor = isColorIndex(style.colorIndex) ? style.colorIndex : undefined;
    const emoji = style.emoji === undefined ? undefined : emojiText(style.emoji);
    if (cor === undefined && emoji === undefined) {
      return Promise.reject(new Error('Nada a mudar na cápsula: nem cor nem emoji.'));
    }
    return this.append(
      groupId,
      {
        tipo: 'member_styled',
        memberId,
        ...(cor === undefined ? {} : { cor }),
        // Emoji vazio é emoji retirado, então a string vazia precisa chegar ao servidor.
        ...(emoji === undefined ? {} : { emoji }),
      },
      {},
      actor,
    );
  }

  /** Marca o giro no doc do grupo junto com o evento, que é o que as rules exigem. */
  spin(groupId: string, actor = ''): Promise<void> {
    return this.append(groupId, { tipo: 'spin' }, { ultimoGiroEm: serverTimestamp() }, actor);
  }

  /**
   * Cola (ou reescreve) a etiqueta de um giro. Não existe update no log: uma etiqueta nova
   * é outro evento, e o replay faz a última valer. Por isso anotar o giro de ontem e o de
   * um ano atrás é a mesma operação — o índice do giro é congelado assim que ele acontece.
   */
  annotateSpin(
    groupId: string,
    spinIndex: number,
    note: { title: string; description: string },
    actor = '',
  ): Promise<void> {
    if (!Number.isInteger(spinIndex) || spinIndex < 0) {
      return Promise.reject(new Error(`Índice de giro inválido: ${spinIndex}.`));
    }
    return this.append(
      groupId,
      {
        tipo: 'spin_annotated',
        giro: spinIndex,
        titulo: noteText(note.title, MAX_NOTE_TITLE, { singleLine: true }),
        descricao: noteText(note.description, MAX_NOTE_DESCRIPTION),
      },
      {},
      actor,
    );
  }

  /** Retirar a etiqueta é escrevê-la em branco; a retirada também fica no registro. */
  clearSpinNote(groupId: string, spinIndex: number, actor = ''): Promise<void> {
    return this.annotateSpin(groupId, spinIndex, { title: '', description: '' }, actor);
  }

  /**
   * Grava (ou reescreve) a resenha de UMA pessoa sobre o jogo daquele giro. A assinatura é
   * obrigatória e é ela que identifica a resenha: sem nome não há de quem ela seja, e
   * ninguém conseguiria editá-la depois. Como tudo aqui, reescrever é outro evento.
   */
  reviewSpin(
    groupId: string,
    spinIndex: number,
    review: {
      score: number;
      criteria?: Partial<Record<ReviewCriterion, number | null>>;
      status: ReviewStatus;
      hours?: number | null;
      text?: string;
    },
    actor: string,
  ): Promise<void> {
    if (!Number.isInteger(spinIndex) || spinIndex < 0) {
      return Promise.reject(new Error(`Índice de giro inválido: ${spinIndex}.`));
    }
    if (!actor.trim()) {
      return Promise.reject(new Error('Uma resenha precisa de assinatura.'));
    }
    if (!isScore(review.score)) {
      return Promise.reject(new Error(`Nota final inválida: ${review.score}.`));
    }
    if (!REVIEW_STATUSES.includes(review.status)) {
      return Promise.reject(new Error(`Status de completude inválido: ${review.status}.`));
    }
    // Horas é opcional: ausente é "não contei". Presente, tem que ser um inteiro de
    // verdade — meia hora não muda a conversa e as rules só sabem validar inteiro.
    const horas = review.hours ?? null;
    if (horas !== null
      && (!Number.isInteger(horas) || horas < 1 || horas > MAX_HOURS)) {
      return Promise.reject(new Error(`Tempo de jogo inválido: ${horas}.`));
    }

    // Critério sem nota não vai como `null`: ele simplesmente não vai. Chave ausente é
    // "não avaliei", e é assim que a média de cada critério mantém o próprio denominador.
    //
    // Os dois da platina só vão com `platinado`. Quem marca a platina, responde as duas e
    // depois troca para `finalizado` deixa as notas no rascunho da tela; gravá-las escreveria
    // no log uma resenha que se contradiz, e o log não se reescreve nem se apaga.
    const notas: Record<string, number> = {};
    for (const criterion of REVIEW_CRITERIA) {
      if (review.status !== 'platinado' && isPlatinumCriterion(criterion)) continue;
      const nota = review.criteria?.[criterion];
      if (isScore(nota)) notas[criterion] = nota;
    }

    const texto = noteText(review.text ?? '', MAX_REVIEW_TEXT);
    return this.append(
      groupId,
      {
        tipo: 'spin_reviewed',
        giro: spinIndex,
        nota: review.score,
        status: review.status,
        ...(horas === null ? {} : { horas }),
        ...notas,
        ...(texto ? { texto } : {}),
      },
      {},
      actor,
    );
  }

  /** Retirar a própria resenha. A retirada é um evento como qualquer outro. */
  withdrawReview(groupId: string, spinIndex: number, actor: string): Promise<void> {
    if (!Number.isInteger(spinIndex) || spinIndex < 0) {
      return Promise.reject(new Error(`Índice de giro inválido: ${spinIndex}.`));
    }
    if (!actor.trim()) {
      return Promise.reject(new Error('Uma resenha precisa de assinatura.'));
    }
    return this.append(
      groupId,
      { tipo: 'spin_reviewed', giro: spinIndex, retirada: true },
      {},
      actor,
    );
  }

  /**
   * Põe ou tira alguém da mesa daquele jogo. Corrige o elenco, nunca o sorteio: o globo
   * do giro é imutável e é dele que o vencedor sai, então nada aqui pode mudar quem
   * ganhou, quem já saiu na rodada ou quem ainda falta.
   */
  seatSpin(
    groupId: string,
    spinIndex: number,
    memberId: string,
    seated: boolean,
    actor = '',
  ): Promise<void> {
    if (!Number.isInteger(spinIndex) || spinIndex < 0) {
      return Promise.reject(new Error(`Índice de giro inválido: ${spinIndex}.`));
    }
    if (!memberId.trim()) {
      return Promise.reject(new Error('Uma cadeira precisa de uma pessoa.'));
    }
    return this.append(
      groupId,
      { tipo: 'spin_seated', giro: spinIndex, memberId, mesa: seated === true },
      {},
      actor,
    );
  }

  /**
   * Liga ou desliga a reação DESTA pessoa a UMA resenha. Como tudo aqui, desligar também é
   * gravar: o log guarda que ela reagiu e que depois tirou, e o replay soma o que sobrou.
   *
   * O alvo é a chave de quem escreveu a resenha, e não um `memberId`: quem assina uma
   * resenha não precisa ser do grupo, e a chave é o que casa as duas pontas.
   */
  reactToReview(
    groupId: string,
    spinIndex: number,
    target: string,
    emoji: string,
    reacted: boolean,
    actor: string,
  ): Promise<void> {
    if (!Number.isInteger(spinIndex) || spinIndex < 0) {
      return Promise.reject(new Error(`Índice de giro inválido: ${spinIndex}.`));
    }
    if (!actor.trim()) {
      return Promise.reject(new Error('Uma reação precisa de assinatura.'));
    }
    if (!target.trim()) {
      return Promise.reject(new Error('Uma reação precisa de uma resenha.'));
    }
    if (!isReactionEmoji(emoji)) {
      return Promise.reject(new Error(`Reação fora da lista: ${emoji}.`));
    }
    return this.append(
      groupId,
      {
        tipo: 'review_reacted',
        giro: spinIndex,
        alvo: target.slice(0, 60),
        emoji,
        reagiu: reacted === true,
      },
      {},
      actor,
    );
  }

  static nextSpinAllowedAt(snapshot: GroupSnapshot): number | null {
    return snapshot.lastSpinAt === null ? null : snapshot.lastSpinAt + SPIN_COOLDOWN_MS;
  }

  /**
   * Busca só o que falta. Com `versaoLog` confiável — as rules garantem que ele sobe junto
   * com cada evento — o delta é exatamente `versaoLog - o que já tenho`.
   */
  private async fetchLog(
    groupId: string,
    logVersion: number,
    known: readonly GroupEvent[],
  ): Promise<GroupEvent[]> {
    const missing = logVersion - known.length;
    if (missing <= 0) return [...known];

    this.requireBudget({ reads: missing });
    const events = collection(this.db, 'grupos', groupId, 'eventos');
    // Do mais novo para trás, exatamente o que falta, e depois na ordem do log.
    const snap = await this.run(() => getDocs(query(events, orderBy('em', 'desc'), limit(missing))));
    this.guard.recordRead(snap.size);

    const fresh = snap.docs
      .map((document) => toEvent(document.data()))
      .filter((event): event is GroupEvent => !!event)
      .reverse();

    return [...known, ...fresh];
  }

  private async append(
    groupId: string,
    payload: Record<string, unknown>,
    groupExtra: Record<string, unknown> = {},
    actor = '',
  ): Promise<void> {
    this.requireBudget({ reads: 1, writes: 2 });
    await this.signIn();

    // O contador precisa do valor atual do servidor: as rules exigem exatamente +1, então
    // uma escrita concorrente falha em vez de furar a fila.
    const groupRef = doc(this.db, 'grupos', groupId);
    const groupSnap = await this.run(() => getDoc(groupRef));
    this.guard.recordRead(1);
    if (!groupSnap.exists()) throw new Error(`Grupo ${groupId} não encontrado.`);

    const logVersion: number = groupSnap.data()['versaoLog'] ?? 0;
    const batch = writeBatch(this.db);
    const assinado = actor.trim().slice(0, 60);
    batch.set(doc(collection(this.db, 'grupos', groupId, 'eventos')), {
      ...payload,
      em: serverTimestamp(),
      ...(assinado ? { autor: assinado } : {}),
    });
    batch.update(groupRef, { versaoLog: logVersion + 1, ...groupExtra });

    await this.run(() => batch.commit());
    this.guard.recordWrite(2);
  }

  private requireBudget({ reads = 0, writes = 0 }: { reads?: number; writes?: number }): void {
    if (reads && !this.guard.canRead(reads)) {
      throw new UsageBlockedError(this.guard.snapshot().stopReason ?? 'read-budget');
    }
    if (writes && !this.guard.canWrite(writes)) {
      throw new UsageBlockedError(this.guard.snapshot().stopReason ?? 'write-budget');
    }
  }

  /** O próprio Firestore avisando que a cota acabou é motivo para parar de vez. */
  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if ((error as { code?: string })?.code === 'resource-exhausted') {
        this.guard.tripQuotaExhausted();
      }
      throw error;
    }
  }
}

export function browserLogCache(storage: Storage | undefined): LogCache {
  return {
    read(groupId) {
      try {
        const raw = storage?.getItem(CACHE_PREFIX + groupId);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { logVersion: number; events: GroupEvent[] };
        return Array.isArray(parsed?.events) && typeof parsed.logVersion === 'number'
          ? parsed
          : null;
      } catch {
        return null;
      }
    },
    write(groupId, value) {
      try {
        storage?.setItem(CACHE_PREFIX + groupId, JSON.stringify(value));
      } catch {
        // Cache indisponível custa leituras, nunca correção.
      }
    },
  };
}

export function memoryLogCache(): LogCache {
  const store = new Map<string, { logVersion: number; events: GroupEvent[] }>();
  return {
    read: (groupId) => store.get(groupId) ?? null,
    write: (groupId, value) => void store.set(groupId, value),
  };
}

function toMillis(value: unknown): number | null {
  const candidate = value as { toMillis?: () => number } | null | undefined;
  return typeof candidate?.toMillis === 'function' ? candidate.toMillis() : null;
}

function isScore(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_SCORE;
}

function toCriteria(data: Record<string, unknown>): Partial<Record<ReviewCriterion, number>> {
  const criteria: Partial<Record<ReviewCriterion, number>> = {};
  for (const criterion of REVIEW_CRITERIA) {
    const value = data[criterion];
    if (typeof value === 'number') criteria[criterion] = value;
  }
  return criteria;
}

function toEvent(data: Record<string, unknown>): GroupEvent | null {
  const at = toMillis(data['em']);
  if (at === null) return null;
  const actor = typeof data['autor'] === 'string' ? data['autor'] : undefined;

  switch (data['tipo']) {
    case 'member_added':
      return typeof data['nome'] === 'string'
        ? { type: 'member_added', at, name: data['nome'], actor }
        : null;
    case 'member_removed':
      return typeof data['memberId'] === 'string'
        ? { type: 'member_removed', at, memberId: data['memberId'], actor }
        : null;
    case 'member_styled':
      return typeof data['memberId'] === 'string'
        ? {
            type: 'member_styled',
            at,
            memberId: data['memberId'],
            // `null` diz "não veio no evento", que o replay lê como "deixe como está".
            colorIndex: typeof data['cor'] === 'number' ? data['cor'] : null,
            emoji: typeof data['emoji'] === 'string' ? data['emoji'] : null,
            actor,
          }
        : null;
    case 'spin':
      return { type: 'spin', at, actor };
    case 'spin_annotated':
      // `subtitulo` existe em eventos gravados antes de setembro de 2026 e não é mais
      // lido: o lugar dele na tela virou a nota média, derivada das resenhas. O texto
      // antigo continua no log — apagá-lo faria a contagem local nunca fechar com
      // `versaoLog` — e simplesmente não chega ao replay.
      return typeof data['giro'] === 'number'
        ? {
            type: 'spin_annotated',
            at,
            spinIndex: data['giro'],
            title: typeof data['titulo'] === 'string' ? data['titulo'] : '',
            description: typeof data['descricao'] === 'string' ? data['descricao'] : '',
            actor,
          }
        : null;
    case 'spin_seated':
      return typeof data['giro'] === 'number' && typeof data['memberId'] === 'string'
        ? {
            type: 'spin_seated',
            at,
            spinIndex: data['giro'],
            memberId: data['memberId'],
            seated: data['mesa'] === true,
            actor,
          }
        : null;
    case 'review_reacted':
      // Sem assinatura, sem alvo ou sem emoji não há reação nenhuma a formar — e a rule do
      // servidor já exige os três, então isto é a mesma guarda vista do lado do cliente.
      return typeof data['giro'] === 'number' && actor && typeof data['alvo'] === 'string'
        ? {
            type: 'review_reacted',
            at,
            spinIndex: data['giro'],
            target: data['alvo'],
            emoji: typeof data['emoji'] === 'string' ? data['emoji'] : '',
            reacted: data['reagiu'] === true,
            actor,
          }
        : null;
    case 'spin_reviewed':
      // A rule exige `autor` numa resenha, então um evento sem ele não existe no servidor.
      // A guarda aqui é a mesma das outras: o que não forma um evento não vira um.
      return typeof data['giro'] === 'number' && actor
        ? {
            type: 'spin_reviewed',
            at,
            spinIndex: data['giro'],
            actor,
            score: typeof data['nota'] === 'number' ? data['nota'] : null,
            criteria: toCriteria(data),
            status: typeof data['status'] === 'string' ? (data['status'] as ReviewStatus) : null,
            hours: typeof data['horas'] === 'number' ? data['horas'] : null,
            text: typeof data['texto'] === 'string' ? data['texto'] : '',
            withdrawn: data['retirada'] === true,
          }
        : null;
    default:
      // Um evento de uma versão mais nova do app. Descartá-lo faria a contagem local ficar
      // menor que `versaoLog` para sempre, o cache ser julgado incoerente e o log inteiro
      // ser rebuscado em toda abertura. Ele entra inerte só para a conta fechar.
      return { type: 'unknown', at };
  }
}
