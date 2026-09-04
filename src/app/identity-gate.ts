import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Identity, MAX_AUTHOR } from './identity';
import { capsuleColor, CAPSULE_COLOR_COUNT } from './palette';
import { hashString, normalizeName } from './naming';

/**
 * A porta. Ninguém entra na máquina sem dizer quem é, porque tudo que se faz aqui fica
 * gravado num registro que o clube vai reler meses depois — e um registro de giros
 * anônimos não conta história nenhuma.
 *
 * A cápsula à esquerda se monta enquanto a pessoa digita, com as iniciais dela dentro e
 * numa cor tirada do próprio nome. É a primeira coisa que a porta ensina: neste produto,
 * uma pessoa é uma cápsula.
 */
@Component({
  selector: 'app-identity-gate',
  imports: [FormsModule],
  templateUrl: './identity-gate.html',
})
export class IdentityGate {
  /** Trocar de pessoa reabre a porta já preenchida, com um jeito de desistir. */
  readonly changing = input<boolean>(false);
  readonly done = output<void>();
  readonly cancelled = output<void>();

  private readonly identity = inject(Identity);

  protected readonly MAX_AUTHOR = MAX_AUTHOR;
  protected readonly draft = signal(this.identity.name());
  protected readonly error = signal('');

  protected readonly clean = computed(() => normalizeName(this.draft()));

  protected readonly initials = computed(() => {
    const parts = this.clean().split(' ').filter(Boolean);
    if (!parts.length) return '';
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  });

  /**
   * A cor sai do nome sendo digitado, não do que está guardado: a cápsula se pinta letra a
   * letra, e quem digita o mesmo nome vê a mesma cor toda vez.
   */
  protected readonly color = computed(() => {
    const name = this.clean().toLowerCase();
    // Vazia, a cápsula é a da marca: a primeira tela do produto não devia ser cinza.
    return name ? capsuleColor(hashString(`cracha:v1:${name}`) % CAPSULE_COLOR_COUNT) : 'var(--yellow)';
  });

  protected submit(): void {
    const name = this.clean();
    if (!name) {
      this.error.set('Escreva seu nome para entrar. Ele fica no registro ao lado do que você fizer.');
      return;
    }
    this.identity.remember(name);
    this.error.set('');
    this.done.emit();
  }

  protected cancel(): void {
    this.draft.set(this.identity.name());
    this.error.set('');
    this.cancelled.emit();
  }

  protected update(value: string): void {
    this.draft.set(value);
    if (this.error()) this.error.set('');
  }
}
