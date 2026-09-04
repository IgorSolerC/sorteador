import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MAX_NOTE_DESCRIPTION, MAX_NOTE_TITLE, SpinRecord } from './group-log';
import { capsuleColor } from './machine';

/**
 * A bancada onde a etiqueta é escrita. Ela não fala com o servidor: recebe o giro, devolve
 * o texto, e quem a abriu decide o que fazer com ele. É por isso que a máquina e o álbum
 * conseguem usar a mesma bancada sem duplicar uma linha de formulário.
 */
@Component({
  selector: 'app-note-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './note-editor.html',
})
export class NoteEditor {
  readonly spin = input.required<SpinRecord>();
  readonly saving = input<boolean>(false);
  readonly error = input<string>('');

  readonly commit = output<{ title: string; description: string }>();
  readonly remove = output<void>();
  readonly dismiss = output<void>();

  private readonly document = inject(DOCUMENT);

  protected readonly title = signal('');
  protected readonly description = signal('');

  protected readonly MAX_NOTE_TITLE = MAX_NOTE_TITLE;
  protected readonly MAX_NOTE_DESCRIPTION = MAX_NOTE_DESCRIPTION;

  /** A cor da pessoa, a mesma do aro do globo e do disco da coleção. */
  protected readonly capsule = computed(() => capsuleColor(this.spin().index));

  constructor() {
    effect(() => {
      const spin = this.spin();
      this.title.set(spin.note?.title ?? '');
      this.description.set(spin.note?.description ?? '');
      // O foco vai para o primeiro campo depois que o Angular desenha a bancada.
      window.setTimeout(() => this.document.getElementById('note-title')?.focus(), 0);
    });
  }

  protected submit(): void {
    if (this.saving()) return;
    this.commit.emit({ title: this.title(), description: this.description() });
  }

  protected askRemove(): void {
    if (this.saving()) return;
    this.remove.emit();
  }

  protected close(): void {
    if (this.saving()) return;
    this.dismiss.emit();
  }

  /** A bancada é modal, então o Tab circula dentro dela em vez de sair por baixo. */
  protected trapFocus(event: Event): void {
    const key = event as KeyboardEvent;
    const card = this.document.getElementById('note-card');
    if (!card) return;
    const focusable = [
      ...card.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea'),
    ];
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (key.shiftKey && active === first) {
      key.preventDefault();
      last.focus();
    } else if (!key.shiftKey && active === last) {
      key.preventDefault();
      first.focus();
    }
  }
}
