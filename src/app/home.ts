import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';

import { Identity } from './identity';
import { RecentGroup, forgetGroup, listGroups } from './recent-groups';
import { capsuleColor, capsuleInkForColor, CAPSULE_COLOR_COUNT } from './palette';
import { hashString } from './naming';

/**
 * A porta da casa. Ela existe porque o modo por link saiu: antes a raiz era uma máquina
 * de demonstração com seis nomes inventados, e a única forma de voltar a um grupo real era
 * caçar o link. Agora a raiz mostra as máquinas que este aparelho conhece e oferece uma nova.
 *
 * Nada aqui fala com o servidor. A lista é local, e é por isso que a página abre instantânea
 * e sem gastar uma leitura da cota.
 */
@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
})
export class Home {
  readonly changeIdentity = output<void>();

  private readonly identity = inject(Identity);

  protected readonly author = this.identity.name;
  protected readonly authorInitials = this.identity.initials;

  protected readonly groups = signal<readonly RecentGroup[]>(listGroups());

  protected readonly greeting = computed(() => this.author().split(' ')[0]);

  /** A mesma cor que a porta mostrou no crachá: a pessoa é sempre a mesma cápsula. */
  protected readonly color = this.identity.color;
  protected readonly ink = this.identity.ink;

  protected linkTo(group: RecentGroup): string {
    return `#/g/${group.id}`;
  }

  protected colorOf(group: RecentGroup): string {
    return capsuleColor(hashString(`maquina:v1:${group.id}`) % CAPSULE_COLOR_COUNT);
  }

  protected inkOf(group: RecentGroup): string {
    return capsuleInkForColor(this.colorOf(group));
  }

  protected initials(name: string): string {
    const parts = name.split(' ').filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
  }

  protected forget(group: RecentGroup, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    forgetGroup(group.id);
    this.groups.set(listGroups());
  }
}
