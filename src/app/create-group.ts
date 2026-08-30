import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GROUP_STORE, USAGE_GUARD } from './firebase-app';
import { MAX_MEMBERS } from './group-log';
import { UsageBlockedError } from './group-store';
import { normalizeName } from './draw-engine';

/**
 * A porta de entrada do modo sincronizado. Também é onde a lista do modo por link vira um
 * grupo de verdade — o momento de criar é o único em que a importação faz sentido, porque
 * depois disso o grupo tem histórico próprio e trazer nomes de fora o reescreveria.
 */
@Component({
  selector: 'app-create-group',
  imports: [FormsModule],
  templateUrl: './create-group.html',
})
export class CreateGroup {
  /** A lista que o modo por link tem agora, oferecida como ponto de partida. */
  readonly seedNames = input<readonly string[]>([]);

  private readonly store = inject(GROUP_STORE);
  private readonly guard = inject(USAGE_GUARD);

  protected readonly name = signal('');
  protected readonly bringList = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly progress = signal('');

  protected readonly importable = computed(() =>
    this.seedNames().map(normalizeName).filter(Boolean).slice(0, MAX_MEMBERS),
  );

  protected readonly usageStopped = computed(() => this.guard.state() === 'stopped');

  protected async create(): Promise<void> {
    const name = this.name().trim() || 'Clube de Jogos';
    if (this.busy()) return;

    this.busy.set(true);
    this.error.set('');
    try {
      this.progress.set('Criando o grupo…');
      const id = await this.store.createGroup(name);

      if (this.bringList()) {
        const names = this.importable();
        for (const [index, person] of names.entries()) {
          this.progress.set(`Carregando cápsulas… ${index + 1} de ${names.length}`);
          await this.store.addMember(id, person);
        }
      }

      this.progress.set('Pronto. Abrindo o grupo…');
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
