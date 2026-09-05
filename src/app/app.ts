import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { CreateGroup } from './create-group';
import { GroupHistory } from './group-history';
import { Home } from './home';
import { Identity } from './identity';
import { IdentityGate } from './identity-gate';
import { SyncedGroup } from './synced-group';

/**
 * A casca: lê a rota do fragmento e decide qual peça desce. Não há router do Angular aqui
 * de propósito — o app é publicado no GitHub Pages, que não reescreve caminhos, então a
 * rota mora no hash e um `hashchange` basta.
 *
 * Antes desta casca existia um segundo produto inteiro: um sorteio mensal determinístico
 * que vivia dentro do próprio link, sem servidor. Ele saiu. Duas máquinas com regras
 * diferentes na mesma página custavam duas explicações a cada tela, e a que ficou faz
 * tudo que a outra fazia — sem exigir que se gere um link novo a cada pessoa que entra.
 */
@Component({
  selector: 'app-root',
  imports: [Home, IdentityGate, SyncedGroup, CreateGroup, GroupHistory],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly identity = inject(Identity);

  private readonly hash = signal(this.document.defaultView?.location.hash ?? '');

  protected readonly syncedGroupId = computed(() => readSyncedGroupId(this.hash()));
  protected readonly albumGroupId = computed(() => readAlbumGroupId(this.hash()));
  protected readonly creatingGroup = computed(() => isNewGroupRoute(this.hash()));

  /** Quem já se identificou passa direto; quem não, vê a porta e nada mais. */
  protected readonly known = this.identity.known;
  protected readonly changingIdentity = signal(false);

  /**
   * Passado às páginas para que o crachá do cabeçalho reabra a porta. Uma função, e não um
   * `output`, porque quem a usa está a dois componentes de distância e o caminho de eventos
   * teria de ser reencaminhado por cada um deles.
   */
  protected readonly askIdentityChange = () => this.openIdentity();

  constructor() {
    // O ouvinte sai junto com a casca. Um ouvinte que sobrevive a ela continua escrevendo
    // num componente destruído a cada mudança de rota — a mesma armadilha que o relógio e
    // o `visibilitychange` da máquina já custaram uma vez.
    const view = this.document.defaultView;
    const rota = () => this.hash.set(view?.location.hash ?? '');
    view?.addEventListener('hashchange', rota);
    inject(DestroyRef).onDestroy(() => view?.removeEventListener('hashchange', rota));
  }

  protected openIdentity(): void {
    this.changingIdentity.set(true);
  }

  protected closeIdentity(): void {
    this.changingIdentity.set(false);
  }
}

export function readSyncedGroupId(hash: string): string {
  const match = /^#?\/g\/([A-Za-z0-9_-]{1,64})$/.exec(hash.trim());
  return match ? match[1] : '';
}

/** `#/novo` abre a criação de grupo. */
export function isNewGroupRoute(hash: string): boolean {
  return /^#?\/novo\/?$/.test(hash.trim());
}

/** `#/g/<id>/album` abre o álbum daquele grupo; `#/g/<id>` continua abrindo a máquina. */
export function readAlbumGroupId(hash: string): string {
  const match = /^#?\/g\/([A-Za-z0-9_-]{1,64})\/album\/?$/.exec(hash.trim());
  return match ? match[1] : '';
}
