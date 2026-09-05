import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GroupMember, MAX_EMOJI, emojiText } from './group-log';
import { CAPSULE_COLORS, capsuleColor, capsuleColorName, capsuleInk } from './palette';
import { trapFocusWithin } from './focus-trap';
import { initialsOf } from './naming';

/**
 * A gaveta dos integrantes. Antes tudo isto era uma seção de duas colunas ocupando a metade de
 * baixo da página: um formulário, uma lista e um bloco de compartilhar, permanentemente
 * abertos para uma tarefa que se faz uma vez por mês. A página inteira era administração.
 *
 * Agora a administração mora numa gaveta, e a gaveta é de papel — pela Regra da Única
 * Quebra, papel é exatamente onde se opera. Ela tem duas faces e nunca duas camadas: a
 * lista, e a bancada de uma cápsula. Empilhar um segundo modal sobre o primeiro deixaria
 * dois véus e dois `aria-modal` disputando a mesma tecla Esc.
 */

export interface CapsuleStyle {
  readonly memberId: string;
  readonly colorIndex: number;
  readonly emoji: string;
}

/** Um ponto de partida para quem não quer procurar um emoji: o mundo de um clube de jogos. */
const SUGGESTED_EMOJI = [
  '🎮', '🕹️', '🎲', '🃏', '♟️', '🎯',
  '🏆', '🥇', '💥', '👾', '🚀', '⚡',
  '🔥', '🌟', '🎨', '🎬', '🎧', '🎪',
  '🍕', '🍻', '🦊', '🦄', '🐙', '🐸',
] as const;

@Component({
  selector: 'app-roster-bench',
  imports: [CommonModule, FormsModule],
  templateUrl: './roster-bench.html',
})
export class RosterBench {
  readonly members = input.required<readonly GroupMember[]>();
  readonly busy = input<boolean>(false);
  readonly error = input<string>('');
  readonly shareUrl = input<string>('');
  readonly maxMembers = input<number>(60);
  /**
   * Um contador que sobe a cada cápsula que o servidor confirmou ter pintado. A gaveta só
   * volta para a lista aí: voltar ao emitir levaria embora a cor escolhida se a gravação
   * falhasse, e a pessoa teria de escolher tudo de novo sem saber por quê.
   */
  readonly restyled = input<number>(0);

  readonly add = output<string>();
  readonly remove = output<GroupMember>();
  readonly restyle = output<CapsuleStyle>();
  readonly copyLink = output<void>();
  readonly dismiss = output<void>();

  private readonly document = inject(DOCUMENT);

  protected readonly COLORS = CAPSULE_COLORS;
  protected readonly EMOJI = SUGGESTED_EMOJI;
  protected readonly MAX_EMOJI = MAX_EMOJI;

  protected readonly draftName = signal('');
  protected readonly nameError = signal('');

  /** Quem está na bancada; vazio é a lista. */
  protected readonly editingId = signal('');
  protected readonly draftColor = signal(0);
  protected readonly draftEmoji = signal('');

  protected readonly editing = computed<GroupMember | null>(() => {
    const id = this.editingId();
    return id ? this.members().find((member) => member.id === id) ?? null : null;
  });

  protected readonly previewColor = computed(() => capsuleColor(this.draftColor()));
  protected readonly previewInk = computed(() => capsuleInk(this.draftColor()));

  protected readonly dirty = computed(() => {
    const member = this.editing();
    if (!member) return false;
    return member.colorIndex !== this.draftColor() || member.emoji !== this.draftEmoji();
  });

  constructor() {
    effect(() => {
      // `back()` lê `editingId`. Sem `untracked`, essa leitura fazia o efeito observar a
      // pessoa em edição; depois do primeiro salvamento, abrir qualquer outra disparava o
      // efeito de novo e fechava a bancada no mesmo instante.
      if (this.restyled() > 0) untracked(() => this.back());
    });
  }

  protected colorFor(index: number): string {
    return capsuleColor(index);
  }

  protected colorName(index: number): string {
    return capsuleColorName(index);
  }

  protected inkFor(index: number): string {
    return capsuleInk(index);
  }

  protected initials(name: string): string {
    return initialsOf(name);
  }

  // --- a lista ---

  protected submitName(): void {
    const name = this.draftName().trim();
    if (!name) {
      this.nameError.set('Digite um nome antes de carregar a cápsula.');
      return;
    }
    this.nameError.set('');
    this.add.emit(name);
    this.draftName.set('');
  }

  protected updateName(value: string): void {
    this.draftName.set(value);
    if (this.nameError()) this.nameError.set('');
  }

  protected askRemove(member: GroupMember): void {
    this.remove.emit(member);
  }

  // --- a bancada de uma cápsula ---

  protected open(member: GroupMember): void {
    this.editingId.set(member.id);
    this.draftColor.set(member.colorIndex);
    this.draftEmoji.set(member.emoji);
    // O foco entra na bancada; sem isto o teclado ficaria na lista que saiu de vista.
    window.setTimeout(() => this.document.getElementById('capsule-back')?.focus(), 0);
  }

  protected back(): void {
    const id = this.editingId();
    this.editingId.set('');
    window.setTimeout(() => this.document.getElementById(`member-${id}`)?.focus(), 0);
  }

  protected chooseColor(index: number): void {
    this.draftColor.set(index);
  }

  protected chooseEmoji(value: string): void {
    this.draftEmoji.update((current) => (current === value ? '' : value));
  }

  protected clearEmoji(): void {
    this.draftEmoji.set('');
  }

  /** O que for digitado ou colado vira um símbolo só — o mesmo corte que o servidor faz. */
  protected typeEmoji(value: string): void {
    this.draftEmoji.set(emojiText(value));
  }

  protected save(): void {
    const member = this.editing();
    if (!member || !this.dirty()) return;
    this.restyle.emit({
      memberId: member.id,
      colorIndex: this.draftColor(),
      emoji: this.draftEmoji(),
    });
  }

  // --- a gaveta ---

  protected close(): void {
    if (this.busy()) return;
    this.dismiss.emit();
  }

  protected trapFocus(event: Event): void {
    trapFocusWithin(this.document, 'roster-card', event);
  }
}
