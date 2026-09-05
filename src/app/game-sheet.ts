import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BASE_CRITERIA,
  completionShare,
  criterionText,
  DIFFICULTY_LEVELS,
  formatHours,
  formatScore,
  isNamedCriterion,
  isPlatinumCriterion,
  MAX_HOURS,
  MAX_NOTE_DESCRIPTION,
  MAX_NOTE_TITLE,
  MAX_REVIEW_TEXT,
  MAX_SCORE,
  PLATINUM_CRITERIA,
  REVIEW_CRITERIA,
  REVIEW_CRITERION_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUSES,
  GroupMember,
  ReviewCriterion,
  ReviewStatus,
  ScoreTone,
  scoreTone,
  SpinRecord,
  SpinReview,
  SpinSeat,
  spinScores,
} from './group-log';
import { NoteDraft, ReviewDraft, SheetFace } from './game-bench';
import { trapFocusWithin } from './focus-trap';
import { capsuleColor, capsuleInkForColor, CAPSULE_COLOR_COUNT } from './palette';
import { hashString, initialsOf, participantKey } from './naming';

/**
 * A ficha do jogo: o papel que fica colado na cápsula depois que ela caiu.
 *
 * Ela abre para LER. Antes, tocar numa cápsula abria o formulário direto, e ler virava
 * escrever sem querer; agora a primeira face é o boletim do clube — a nota, as médias de
 * cada critério, como cada um terminou e o que cada um escreveu. Escrever é a decisão
 * seguinte, e são duas decisões diferentes com nomes diferentes: **o jogo** é de todo
 * mundo, **a resenha** é de cada um.
 *
 * Três faces dentro do mesmo papel, nunca três camadas: um segundo `aria-modal` por cima
 * do primeiro deixaria dois véus disputando a mesma tecla Esc.
 */
@Component({
  selector: 'app-game-sheet',
  imports: [CommonModule, FormsModule],
  templateUrl: './game-sheet.html',
})
export class GameSheet {
  readonly spin = input.required<SpinRecord>();
  readonly face = input<SheetFace>('ficha');
  readonly saving = input<boolean>(false);
  readonly error = input<string>('');
  /** A cor da pessoa que ganhou a cápsula, a mesma do globo, do registro e do álbum. */
  readonly capsule = input<string>('#FFC53D');
  readonly capsuleEmoji = input<string>('');
  /** Quem está com o app aberto: é a resenha dela que a ficha oferece para escrever. */
  readonly author = input<string>('');
  /** O grupo inteiro, para a mesa saber quem ainda pode ser posto nela. */
  readonly members = input<readonly GroupMember[]>([]);

  readonly showFace = output<SheetFace>();
  readonly commitNote = output<NoteDraft>();
  readonly removeNote = output<void>();
  readonly commitReview = output<ReviewDraft>();
  readonly removeReview = output<void>();
  readonly commitSeat = output<{ seat: SpinSeat; seated: boolean }>();
  readonly dismiss = output<void>();

  private readonly document = inject(DOCUMENT);

  protected readonly MAX_NOTE_TITLE = MAX_NOTE_TITLE;
  protected readonly MAX_NOTE_DESCRIPTION = MAX_NOTE_DESCRIPTION;
  protected readonly MAX_REVIEW_TEXT = MAX_REVIEW_TEXT;
  protected readonly CRITERIA = REVIEW_CRITERIA;
  /** As cinco que toda resenha aceita, e as duas que só quem platinou responde. */
  protected readonly BASE_CRITERIA = BASE_CRITERIA;
  protected readonly PLATINUM_CRITERIA = PLATINUM_CRITERIA;
  protected readonly CRITERION_LABELS = REVIEW_CRITERION_LABELS;
  protected readonly STATUSES = REVIEW_STATUSES;
  protected readonly STATUS_LABELS = REVIEW_STATUS_LABELS;
  protected readonly LEVELS = DIFFICULTY_LEVELS;
  /** A régua da nota: onze casas, de 0 a 10. */
  protected readonly TICKS = Array.from({ length: MAX_SCORE + 1 }, (_, index) => index);

  // --- o boletim ---

  protected readonly scores = computed(() => spinScores(this.spin()));
  protected readonly share = computed(() => completionShare(this.scores()));

  protected readonly average = computed(() => {
    const score = this.scores().score;
    return score === null ? '' : formatScore(score);
  });

  /** O temperamento da nota do clube: é ele que decide se o número brilha ou fede. */
  protected readonly heroTone = computed(() => scoreTone(this.scores().score));

  /**
   * As médias por critério, só as que alguém avaliou, na ordem em que a ficha pergunta.
   * As duas da platina fecham a lista e vêm marcadas: elas têm outro denominador — só
   * quem platinou pôde respondê-las —, e é a marca que impede lê-las como as outras.
   */
  protected readonly criteriaAverages = computed(() =>
    this.CRITERIA.map((criterion) => ({
      criterion,
      label: this.CRITERION_LABELS[criterion],
      platina: isPlatinumCriterion(criterion),
      ...this.scores().criteria[criterion],
    })).filter((row): row is typeof row & { average: number; count: number } =>
      row.average !== undefined,
    ),
  );

  protected readonly reviews = computed(() => this.spin().reviews);

  // --- a mesa ---

  /** Quem jogou. É o denominador de "X resenhas de Y". */
  protected readonly seats = computed(() => this.spin().seated);

  /** Quem é do grupo e não está na mesa deste jogo — o que a mesa oferece para pôr. */
  protected readonly away = computed<readonly SpinSeat[]>(() => {
    const sitting = new Set(this.seats().map((seat) => seat.key));
    return this.members()
      .map((member) => ({
        key: participantKey(member.name),
        name: member.name,
        memberId: member.id,
      }))
      .filter((seat) => seat.key && !sitting.has(seat.key));
  });

  /** A resenha de quem está com o app aberto, quando ela já escreveu uma. */
  protected readonly mine = computed<SpinReview | null>(() => {
    const key = participantKey(this.author());
    return key ? this.reviews().find((review) => review.authorKey === key) ?? null : null;
  });

  // --- o jogo (face 3) ---

  protected readonly title = signal('');
  protected readonly description = signal('');

  // --- minha resenha (face 2) ---

  protected readonly score = signal<number | null>(null);
  protected readonly status = signal<ReviewStatus | null>(null);
  protected readonly text = signal('');
  /** `null` é o campo vazio, que é o padrão: contar o tempo é opcional. */
  protected readonly hours = signal<number | null>(null);
  private readonly criteria = signal<Partial<Record<ReviewCriterion, number>>>({});

  protected readonly draftReady = computed(() => this.score() !== null && this.status() !== null);

  /** A tinta que mantém a inicial legível dentro da cápsula de quem ganhou. */
  protected readonly capsuleInk = computed(() => capsuleInkForColor(this.capsule()));

  /**
   * De quem é o rascunho que está na tela: qual giro, e quem assina. Recarregar o grupo
   * reconstrói todos os giros do zero, então o objeto muda sem o giro mudar — e é por isso
   * que a identidade do rascunho não pode ser o objeto.
   */
  private rascunhoDe = '';

  constructor() {
    effect(() => {
      // Quando a ficha muda de giro, os rascunhos voltam a ser o que o servidor tem: abrir
      // a cápsula de outra pessoa não pode herdar a nota que ficou na tela.
      //
      // Mas só quando ela muda de giro. A máquina recarrega sozinha ao voltar para a aba, e
      // reencher os campos a cada recarga apagava a resenha meio escrita de quem tinha só
      // ido conferir o nome do jogo noutro lugar.
      const spin = this.spin();
      const rascunho = `${spin.index}:${participantKey(this.author())}`;
      if (rascunho === this.rascunhoDe) return;
      this.rascunhoDe = rascunho;

      this.title.set(spin.note?.title ?? '');
      this.description.set(spin.note?.description ?? '');

      const mine = this.mine();
      this.score.set(mine?.score ?? null);
      this.status.set(mine?.status ?? null);
      this.text.set(mine?.text ?? '');
      this.hours.set(mine?.hours ?? null);
      this.criteria.set({ ...(mine?.criteria ?? {}) });
    });

    effect(() => {
      // O foco entra na face que apareceu, depois que o Angular a desenha. Na resenha ele
      // cai na régua da nota final — que é a única obrigatória e a primeira coisa a fazer —
      // e na casa que já está marcada, para quem está editando não perder o lugar.
      const face = this.face();
      const first = face === 'resenha'
        ? `nota-final-${untracked(this.score) ?? 0}`
        : face === 'jogo' ? 'note-title'
        : face === 'mesa' ? 'sheet-back' : 'sheet-close';
      window.setTimeout(() => this.document.getElementById(first)?.focus(), 0);
    });
  }

  // --- leitura ---

  protected reviewerColor(review: SpinReview): string {
    return capsuleColor(hashString(`cracha:v1:${review.authorKey}`) % CAPSULE_COLOR_COUNT);
  }

  /**
   * A cor de quem está na mesa. Quem é do grupo usa a cápsula que ela mesma pintou; quem
   * só assinou uma resenha recebe a cor tirada do próprio nome, a mesma do crachá.
   */
  protected seatColor(seat: SpinSeat): string {
    const member = this.members().find((person) => person.id === seat.memberId);
    return member
      ? capsuleColor(member.colorIndex)
      : capsuleColor(hashString(`cracha:v1:${seat.key}`) % CAPSULE_COLOR_COUNT);
  }

  protected seatInk(seat: SpinSeat): string {
    return capsuleInkForColor(this.seatColor(seat));
  }

  protected seatEmoji(seat: SpinSeat): string {
    return this.members().find((person) => person.id === seat.memberId)?.emoji ?? '';
  }

  /** A resenha de quem está na mesa, quando ela já escreveu uma. */
  protected seatReview(seat: SpinSeat): SpinReview | null {
    return this.reviews().find((review) => review.authorKey === seat.key) ?? null;
  }

  protected setSeat(seat: SpinSeat, seated: boolean): void {
    if (!this.saving()) this.commitSeat.emit({ seat, seated });
  }

  protected reviewerInk(review: SpinReview): string {
    return capsuleInkForColor(this.reviewerColor(review));
  }

  protected initials(name: string): string {
    return initialsOf(name);
  }

  protected show(score: number): string {
    return formatScore(score);
  }

  protected readonly MAX_HOURS = MAX_HOURS;

  protected time(value: number): string {
    return formatHours(value);
  }

  /**
   * O campo vazio é "não contei", e nunca um erro — contar o tempo é opcional. Quem digita
   * `2,5` recebe `3`: horas são inteiras aqui, e arredondar é melhor do que descartar em
   * silêncio o que a pessoa acabou de escrever.
   */
  private draftHours(): number | null {
    const digitado = this.hours();
    if (typeof digitado !== 'number' || !Number.isFinite(digitado)) return null;
    const inteiro = Math.round(digitado);
    return inteiro >= 1 ? Math.min(inteiro, MAX_HOURS) : null;
  }

  /** Como a média de um critério se lê: em nota, ou em palavra quando é dificuldade. */
  protected reads(criterion: ReviewCriterion, score: number): string {
    return criterionText(criterion, score, true);
  }

  protected tone(score: number | null): ScoreTone {
    return scoreTone(score);
  }

  /**
   * A régua de um critério. Dificuldade não é quantidade, é posição: ela vira um traço na
   * escala em vez de um filete que enche, e não recebe tinta nenhuma. Um filete colorido
   * ali diria "tirou 8 em dificuldade", e dificuldade não se tira.
   */
  protected ruleClass(criterion: ReviewCriterion, score: number): string {
    return isNamedCriterion(criterion)
      ? 'score-rule is-flat'
      : `score-rule is-${scoreTone(score)}`;
  }

  /** Se o critério se responde em palavra: as duas dificuldades, e só elas. */
  protected named(criterion: ReviewCriterion): boolean {
    return isNamedCriterion(criterion);
  }

  /**
   * O rótulo de um critério. É um método, e não o mapa direto no template, porque a
   * fileira é desenhada uma vez só num `ng-template` — e o contexto dele chega sem tipo,
   * que é o que o compilador recusa indexar.
   */
  protected labelOf(criterion: ReviewCriterion): string {
    return this.CRITERION_LABELS[criterion];
  }

  /** Onde a média cai na régua de 0 a 10, em porcentagem da largura. */
  protected reach(score: number): string {
    return `${(score / MAX_SCORE) * 100}%`;
  }

  /** As notas por critério de uma resenha, já com rótulo, na ordem da ficha. */
  protected criteriaOf(review: SpinReview): readonly { label: string; value: string }[] {
    return this.CRITERIA
      .filter((criterion) => review.criteria[criterion] !== undefined)
      .map((criterion) => ({
        label: this.CRITERION_LABELS[criterion],
        value: criterionText(criterion, review.criteria[criterion]!),
      }));
  }

  // --- escrita ---

  protected criterionScore(criterion: ReviewCriterion): number | null {
    return this.criteria()[criterion] ?? null;
  }

  /** `null` é "não avaliei", e é uma escolha de verdade: ela some da média do critério. */
  protected setCriterion(criterion: ReviewCriterion, value: number | null): void {
    this.criteria.update((current) => {
      const next = { ...current };
      if (value === null) delete next[criterion];
      else next[criterion] = value;
      return next;
    });
  }

  protected submitReview(): void {
    if (this.saving()) return;
    this.commitReview.emit({
      score: this.score(),
      criteria: this.criteria(),
      status: this.status(),
      hours: this.draftHours(),
      text: this.text(),
    });
  }

  protected submitNote(): void {
    if (this.saving()) return;
    this.commitNote.emit({ title: this.title(), description: this.description() });
  }

  protected askRemoveNote(): void {
    if (!this.saving()) this.removeNote.emit();
  }

  protected askRemoveReview(): void {
    if (!this.saving()) this.removeReview.emit();
  }

  // --- a gaveta ---

  protected go(face: SheetFace): void {
    if (!this.saving()) this.showFace.emit(face);
  }

  protected close(): void {
    if (!this.saving()) this.dismiss.emit();
  }

  /** Esc anda uma face por vez; da ficha, sai da ficha. */
  protected escape(): void {
    if (this.saving()) return;
    if (this.face() === 'ficha') this.dismiss.emit();
    else this.showFace.emit('ficha');
  }

  /** A ficha é modal, então o Tab circula dentro dela em vez de sair por baixo. */
  protected trapFocus(event: Event): void {
    trapFocusWithin(this.document, 'sheet-card', event);
  }
}
