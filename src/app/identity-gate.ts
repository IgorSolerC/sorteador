import {
  Component,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Identity, MAX_AUTHOR } from './identity';
import { Preferences } from './preferences';
import { capsuleColor, capsuleInkForColor, CAPSULE_COLOR_COUNT } from './palette';
import { hashString, initialsOf, normalizeName, participantKey } from './naming';

/** Uma pessoa que a porta oferece: a cápsula dela, como ela já existe no grupo. */
export interface GateCapsule {
  readonly name: string;
  readonly color: string;
  readonly ink: string;
  readonly emoji: string;
  readonly initials: string;
  readonly key: string;
}

export type RosterLookup = (groupId: string) => Promise<readonly GateCapsule[]>;

/**
 * Como a porta descobre quem já está no globo de um grupo.
 *
 * O Firebase entra por importação DINÂMICA, e é isso que a mantém fora do pacote inicial:
 * a prateleira e a oficina carregam a porta sem nunca ter uma lista a oferecer, e não
 * podem pagar 550KB de SDK por causa dela. Num grupo, o SDK vai ser carregado de todo
 * jeito um segundo depois.
 *
 * É um token, e não um `import` direto, pelo mesmo motivo de `GROUP_STORE`: assim um teste
 * consegue trocar a busca por uma falsa, e a porta deixa de exigir rede para ser desenhada.
 */
export const ROSTER_LOOKUP = new InjectionToken<RosterLookup>('RosterLookup', {
  providedIn: 'root',
  factory: () => async (groupId: string) => {
    const { groupStore } = await import('./firebase-app');
    const snapshot = await groupStore().load(groupId);
    // Filtrado aqui, e não pelo `activeMembers()` de `group-log`: importá-lo puxaria o
    // módulo inteiro do replay para o pacote inicial, que a prateleira carrega sem usar.
    return snapshot.state.members
      .filter((member) => member.active)
      .map((member) => {
        const color = capsuleColor(member.colorIndex);
        return {
          name: member.name,
          color,
          ink: capsuleInkForColor(color),
          emoji: member.emoji,
          initials: initialsOf(member.name),
          key: participantKey(member.name),
        };
      });
  },
});

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
  /**
   * O grupo que a pessoa está abrindo, quando ela está abrindo um. É ele que permite à
   * porta oferecer as cápsulas que já existem — sem isso, "Ana" e "Ana Paula" viram duas
   * pessoas no registro e ninguém percebe até o álbum estar dividido ao meio.
   */
  readonly groupId = input<string>('');
  readonly done = output<void>();
  readonly cancelled = output<void>();

  private readonly identity = inject(Identity);
  private readonly preferences = inject(Preferences);
  private readonly lookup = inject(ROSTER_LOOKUP);

  protected readonly MAX_AUTHOR = MAX_AUTHOR;
  protected readonly draft = signal(this.identity.name());
  protected readonly error = signal('');

  /** As cápsulas que já estão no globo deste grupo, para escolher em vez de digitar. */
  protected readonly roster = signal<readonly GateCapsule[]>([]);
  protected readonly looking = signal(false);
  /** Quem já digitou um nome fora da lista continua vendo o campo aberto. */
  protected readonly typing = signal(false);

  protected readonly blind = this.preferences.blind;

  /** A chave de quem está entrando, para marcar a própria cápsula na lista. */
  protected readonly currentKey = computed(() => participantKey(this.identity.name()));

  /** Com lista, o campo de texto é o caminho secundário — e só aparece quando pedido. */
  protected readonly showField = computed(() => !this.roster().length || this.typing());

  constructor() {
    effect(() => {
      const id = this.groupId();
      if (!id) return;
      // A porta não espera a rede: o campo já está na tela e funciona. As cápsulas entram
      // quando chegarem, e se não chegarem a porta continua sendo o que sempre foi.
      untracked(() => void this.lookForCapsules(id));
    });
  }

  /** Busca as cápsulas do grupo, e nunca deixa a porta esperando por elas. */
  private async lookForCapsules(id: string): Promise<void> {
    this.looking.set(true);
    try {
      this.roster.set(await this.lookup(id));
    } catch {
      // Cota estourada, grupo inexistente, rede caída: nada disso é motivo para travar a
      // entrada. Sem lista, digitar continua sendo o caminho — e é o único que sempre foi.
      this.roster.set([]);
    } finally {
      this.looking.set(false);
    }
  }

  /** Escolher uma cápsula é entrar: o nome vem do grupo, então não há o que corrigir. */
  protected choose(capsule: GateCapsule): void {
    this.identity.remember(capsule.name);
    this.error.set('');
    this.done.emit();
  }

  protected openField(): void {
    this.typing.set(true);
    window.setTimeout(() => document.getElementById('gate-name')?.focus(), 0);
  }

  protected toggleBlind(): void {
    this.preferences.setBlind(!this.blind());
  }

  protected readonly clean = computed(() => normalizeName(this.draft()));

  protected readonly initials = computed(() => initialsOf(this.clean()));

  /**
   * A cor sai do nome sendo digitado, não do que está guardado: a cápsula se pinta letra a
   * letra, e quem digita o mesmo nome vê a mesma cor toda vez.
   */
  protected readonly color = computed(() => {
    const name = this.clean().toLowerCase();
    // Vazia, a cápsula é a da marca: a primeira tela do produto não devia ser cinza.
    return name ? capsuleColor(hashString(`cracha:v1:${name}`) % CAPSULE_COLOR_COUNT) : 'var(--yellow)';
  });

  protected readonly ink = computed(() => capsuleInkForColor(this.color()));

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
