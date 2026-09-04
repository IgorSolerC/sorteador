import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GROUP_STORE, USAGE_GUARD } from './firebase-app';
import { Identity } from './identity';
import { UsageBlockedError } from './group-store';
import { rememberGroup } from './recent-groups';

/**
 * A oficina: onde uma máquina nova é montada. É a única porta de entrada para um grupo que
 * ainda não existe — depois disto, o link é o grupo.
 *
 * Quem monta entra como a primeira cápsula por padrão. Antes o passo seguinte à criação era
 * um globo vazio com um formulário, e a primeira coisa que a pessoa fazia era digitar o
 * próprio nome — que a porta já tinha perguntado.
 */
@Component({
  selector: 'app-create-group',
  imports: [FormsModule],
  templateUrl: './create-group.html',
})
export class CreateGroup {
  private readonly store = inject(GROUP_STORE);
  private readonly guard = inject(USAGE_GUARD);
  private readonly identity = inject(Identity);

  protected readonly author = this.identity.name;

  protected readonly name = signal('');
  protected readonly joinAsFirst = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly progress = signal('');

  protected readonly usageStopped = computed(() => this.guard.state() === 'stopped');

  protected async create(): Promise<void> {
    const name = this.name().trim() || 'Clube de Jogos';
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set('');
    try {
      this.progress.set('Montando a máquina…');
      const id = await this.store.createGroup(name);
      rememberGroup(id, name);

      if (this.joinAsFirst() && this.author()) {
        this.progress.set('Carregando a sua cápsula…');
        await this.store.addMember(id, this.author(), this.author());
      }

      this.progress.set('Pronto. Abrindo a máquina…');
      location.hash = `#/g/${id}`;
    } catch (error) {
      this.progress.set('');
      this.error.set(
        error instanceof UsageBlockedError
          ? 'A máquina parou por segurança: o uso do dia bateu no limite que protege a cota ' +
            'gratuita. Ela volta sozinha na virada do dia.'
          : (error as Error)?.message ?? 'Não consegui falar com o servidor.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
