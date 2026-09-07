import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { REACTION_LABELS, ReactionTally } from './group-log';
import { participantKey } from './naming';

let nextId = 0;

/** O resumo pertence à resenha; as escolhas só aparecem quando alguém quer reagir. */
@Component({
  selector: 'app-review-reactions',
  host: { class: 'review-reactions' },
  template: `
    <button #trigger type="button" class="reaction-trigger" [class.is-on]="mine()"
      [attr.aria-expanded]="expanded()" [attr.aria-controls]="panelId" [attr.aria-label]="summaryLabel()"
      [attr.aria-busy]="saving()" [title]="summaryLabel()" [disabled]="saving()" (click)="toggle($event)"
      (pointerenter)="hover($event)" (pointerleave)="leave($event)" (keydown.escape)="escape($event)">
      @if (total()) {
        <span class="reaction-summary" aria-hidden="true">
          @for (tally of popular(); track tally.emoji) { <span>{{ tally.emoji }}</span> }
        </span>
        <b aria-hidden="true">{{ total() }}</b>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" />
          <path d="M8 14a4.5 4.5 0 0 0 8 0M8.5 8.5v1M15.5 8.5v1" /></svg>
        <span>Reagir</span>
      }
      @if (mine()) { <span class="reaction-own" aria-hidden="true"></span> }
    </button>
    <div #panel [id]="panelId" popover="auto" class="reaction-popover" role="group"
      [attr.aria-label]="'Reagir à resenha de ' + author()" (toggle)="onToggle($event)"
      (pointerenter)="cancelTimer()" (pointerleave)="leave($event)" (keydown.escape)="escape($event)">
      @if (expanded()) {
        @for (tally of offered(); track tally.emoji) {
          <button type="button" class="reaction" [class.is-on]="tally.mine" [class.is-empty]="!tally.count"
            [attr.aria-pressed]="tally.mine" [attr.aria-label]="label(tally)" [title]="label(tally)"
            [attr.data-name]="reactionName(tally)" [disabled]="saving()" (click)="choose(tally)">
            <span aria-hidden="true">{{ tally.emoji }}</span>
            @if (tally.count) { <b aria-hidden="true">{{ tally.count > 99 ? '99+' : tally.count }}</b> }
          </button>
        }
      }
    </div>
  `,
})
export class ReviewReactions {
  readonly tallies = input.required<readonly ReactionTally[]>();
  readonly author = input.required<string>();
  readonly saving = input(false);
  readonly selectReaction = output<ReactionTally>();
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly panelId = `reaction-picker-${nextId++}`;
  protected readonly expanded = signal(false);
  // Aposentar escolhas não apaga o log nem quebra as abas antigas que ainda as enviam.
  protected readonly offered = computed(() => this.tallies().filter(t => !['🏆', '🎮', '👍'].includes(t.emoji)));
  protected readonly total = computed(() => this.offered().reduce((sum, t) => sum + t.count, 0));
  protected readonly mine = computed(() => this.offered().some(t => t.mine));
  protected readonly popular = computed(() => [...this.offered()].filter(t => t.count).sort((a, b) => b.count - a.count).slice(0, 3));
  protected readonly summaryLabel = computed(() => {
    if (this.saving()) return `Salvando reação na resenha de ${this.author()}`;
    if (!this.total()) return `Reagir à resenha de ${this.author()}`;
    const people = new Set(this.offered().flatMap(t => t.names.map(participantKey))).size;
    const details = this.offered().filter(t => t.count).map(t => `${REACTION_LABELS[t.emoji]}: ${t.names.join(', ')}`).join('. ');
    return `${this.total()} ${this.total() === 1 ? 'reação' : 'reações'} de ${people} ${people === 1 ? 'pessoa' : 'pessoas'}. ${details}.${this.mine() ? ' Você já reagiu.' : ''} Abrir reações.`;
  });

  constructor() {
    const dismiss = () => this.close(false);
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    inject(DestroyRef).onDestroy(() => {
      this.cancelTimer();
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    });
  }

  protected label(tally: ReactionTally): string {
    return `${REACTION_LABELS[tally.emoji]} — ${tally.count ? tally.names.join(', ') : 'ninguém ainda'}`;
  }

  protected reactionName(tally: ReactionTally): string { return REACTION_LABELS[tally.emoji]; }

  protected cancelTimer(): void { clearTimeout(this.timer); }

  protected hover(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || this.saving()) return;
    this.cancelTimer();
    // Uma pausa curta separa a intenção de reagir de um ponteiro que só atravessou a resenha.
    this.timer = setTimeout(() => this.open(false), 280);
  }

  protected leave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    this.cancelTimer();
    this.timer = setTimeout(() => {
      // Quem está usando o teclado não perde o seletor porque moveu o mouse sem querer.
      if (!this.panel().nativeElement.contains(document.activeElement)) this.close(false);
    }, 220);
  }

  protected toggle(event: MouseEvent): void {
    this.cancelTimer();
    if (this.expanded()) this.close(true);
    else this.open(event.detail === 0);
  }

  private open(focus: boolean): void {
    if (this.saving() || this.expanded()) return;
    this.expanded.set(true);
    this.changeDetector.detectChanges();
    const panel = this.panel().nativeElement;
    const anchor = this.trigger().nativeElement.getBoundingClientRect();
    panel.showPopover?.();
    const bounds = panel.getBoundingClientRect();
    // A camada abre depois do controle para não cobrir a resenha que a pessoa está julgando.
    // Perto do fim da tela, inverte inteira e deixa o nome contextual no lado livre.
    const labelRoom = 30;
    const below = anchor.bottom + bounds.height + labelRoom + 8 <= innerHeight
      || anchor.top < bounds.height + labelRoom + 14;
    panel.classList.toggle('is-above', !below);
    panel.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - bounds.width - 8))}px`;
    const top = below ? anchor.bottom + 6 : anchor.top - bounds.height - 6;
    panel.style.top = `${Math.max(8, Math.min(top, innerHeight - bounds.height - 8))}px`;
    if (focus) panel.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }

  protected onToggle(event: Event): void {
    if ((event as ToggleEvent).newState === 'closed') {
      this.cancelTimer();
      this.expanded.set(false);
    }
  }

  protected escape(event: Event): void {
    if (!this.expanded()) return;
    event.stopPropagation(); event.preventDefault(); this.close(true);
  }

  protected choose(tally: ReactionTally): void {
    if (this.saving()) return;
    this.close(true);
    this.selectReaction.emit(tally);
  }

  private close(focus: boolean): void {
    this.cancelTimer();
    if (!this.expanded()) return;
    this.panel().nativeElement.hidePopover?.();
    this.expanded.set(false);
    if (focus) this.trigger().nativeElement.focus({ preventScroll: true });
  }
}
