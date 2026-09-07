import { DOCUMENT } from '@angular/common';
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
import { MAX_EMOJI, emojiText } from './group-log';
import {
  CAPSULE_COLORS,
  CAPSULE_COLOR_COUNT,
  SUGGESTED_EMOJI,
  capsuleColor,
  capsuleColorName,
  capsuleInkForColor,
} from './palette';
import { hashString, initialsOf, normalizeName, participantKey } from './naming';

/** Uma pessoa que a porta oferece: a cápsula dela, como ela já existe no grupo. */
export interface GateCapsule {
  readonly name: string;
  readonly color: string;
  readonly ink: string;
  readonly emoji: string;
  readonly initials: string;
  readonly key: string;
  /** Posição na paleta, e não um hexadecimal: é o que a pintura grava. */
  readonly colorIndex: number;
  /** O id no grupo. Vazio quando a busca é de uma versão que ainda não o trazia. */
  readonly memberId: string;
}

export type RosterLookup = (groupId: string) => Promise<readonly GateCapsule[]>;

/** O que a porta grava quando alguém repinta a própria cápsula. */
export type CapsulePaint = (
  groupId: string,
  memberId: string,
  style: { colorIndex: number; emoji: string },
  actor: string,
) => Promise<void>;

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
      .map((member) => ({
        ...gateCapsule(member.name, member.colorIndex, member.emoji),
        memberId: member.id,
      }));
  },
});

/**
 * Como a porta grava a cápsula de quem está entrando. Pelo mesmo motivo de
 * `ROSTER_LOOKUP`: o Firebase entra por importação dinâmica, para a prateleira e a oficina
 * continuarem carregando a porta sem 550KB de SDK, e é um token para um teste conseguir
 * trocá-lo por uma gravação falsa.
 */
export const CAPSULE_PAINT = new InjectionToken<CapsulePaint>('CapsulePaint', {
  providedIn: 'root',
  factory: () => async (groupId, memberId, style, actor) => {
    const { groupStore } = await import('./firebase-app');
    await groupStore().styleMember(groupId, memberId, style, actor);
  },
});

/** Uma cápsula da porta montada a partir da posição na paleta, que é o que o log guarda. */
function gateCapsule(name: string, colorIndex: number, emoji: string): GateCapsule {
  const color = capsuleColor(colorIndex);
  return {
    name,
    color,
    ink: capsuleInkForColor(color),
    emoji,
    initials: initialsOf(name),
    key: participantKey(name),
    colorIndex,
    memberId: '',
  };
}

/**
 * A porta. Ninguém entra na máquina sem dizer quem é, porque tudo que se faz aqui fica
 * gravado num registro que o clube vai reler meses depois — e um registro de giros
 * anônimos não conta história nenhuma.
 *
 * A cápsula à esquerda se monta enquanto a pessoa digita, com as iniciais dela dentro e
 * numa cor tirada do próprio nome. É a primeira coisa que a porta ensina: neste produto,
 * uma pessoa é uma cápsula.
 *
 * E quando o globo RECONHECE o crachá, ela para de ser um ensaio: a cápsula grande passa a
 * ser a de verdade — a cor que a pessoa escolheu e o emoji dela — e a porta abre a bancada
 * que a repinta, com a peça de 340px servindo de prévia ao vivo. Três faces e nunca três
 * camadas: a pergunta, a bancada, e o campo de texto que a pergunta abre.
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
  private readonly lookup = inject(ROSTER_LOOKUP);
  private readonly paint = inject(CAPSULE_PAINT);
  private readonly document = inject(DOCUMENT);

  protected readonly MAX_AUTHOR = MAX_AUTHOR;
  protected readonly MAX_EMOJI = MAX_EMOJI;
  protected readonly COLORS = CAPSULE_COLORS;
  protected readonly EMOJI = SUGGESTED_EMOJI;
  protected readonly draft = signal(this.identity.name());
  protected readonly error = signal('');

  /** As cápsulas que já estão no globo deste grupo, para escolher em vez de digitar. */
  protected readonly roster = signal<readonly GateCapsule[]>([]);
  protected readonly looking = signal(false);
  /** Quem já digitou um nome fora da lista continua vendo o campo aberto. */
  protected readonly typing = signal(false);

  /** A chave de quem está entrando, para marcar a própria cápsula na lista. */
  protected readonly currentKey = computed(() => participantKey(this.identity.name()));

  /**
   * A minha cápsula neste grupo, quando o globo me conhece pelo crachá. É a única
   * condição da bancada: a porta só oferece repintar a cápsula de quem ela reconheceu.
   */
  protected readonly mine = computed<GateCapsule | null>(() => {
    const key = this.currentKey();
    return key ? this.roster().find((capsule) => capsule.key === key) ?? null : null;
  });

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

  protected readonly clean = computed(() => normalizeName(this.draft()));

  /**
   * Quando a cápsula grande é a MINHA de verdade, e não o ensaio pelo nome digitado.
   *
   * Digitar outro nome a devolve ao ensaio: ela é a prévia de quem está entrando, e
   * mostrar a minha cor debaixo do nome de outra pessoa mentiria sobre as duas.
   */
  private readonly showingMine = computed<GateCapsule | null>(() => {
    const mine = this.mine();
    if (!mine) return null;
    if (this.painting()) return mine;
    return this.typing() && participantKey(this.clean()) !== mine.key ? null : mine;
  });

  protected readonly initials = computed(
    () => this.showingMine()?.initials ?? initialsOf(this.clean()),
  );

  /**
   * O que aparece dentro da cúpula: o emoji da pessoa quando ela tem um, e as iniciais
   * quando não. Na bancada é o rascunho, para a peça de 340px ser a prévia da pintura.
   */
  protected readonly mark = computed(() => {
    if (this.painting()) return this.draftEmoji() || this.initials();
    return this.showingMine()?.emoji || this.initials();
  });

  /**
   * A cor sai do nome sendo digitado — a cápsula se pinta letra a letra, e quem digita o
   * mesmo nome vê a mesma cor toda vez. Só que quem o globo já conhece não é um ensaio:
   * para ela a cápsula é a de verdade, a que ela mesma escolheu, porque a identidade
   * visual de uma pessoa é a mesma em toda parte do produto — e era esta a única tela
   * onde ela não era.
   */
  protected readonly color = computed(() => {
    if (this.painting()) return capsuleColor(this.draftColor());
    const mine = this.showingMine();
    if (mine) return mine.color;
    const name = this.clean().toLowerCase();
    // Vazia, a cápsula é a da marca: a primeira tela do produto não devia ser cinza.
    return name ? capsuleColor(hashString(`cracha:v1:${name}`) % CAPSULE_COLOR_COUNT) : 'var(--yellow)';
  });

  protected readonly ink = computed(() => capsuleInkForColor(this.color()));

  // --- a bancada da porta: repintar a minha própria cápsula ---

  protected readonly painting = signal(false);
  protected readonly draftColor = signal(0);
  protected readonly draftEmoji = signal('');
  protected readonly saving = signal(false);
  protected readonly paintError = signal('');
  /** O que acabou de ser gravado, dito uma vez ao voltar da bancada. */
  protected readonly painted = signal('');

  protected readonly dirty = computed(() => {
    const mine = this.mine();
    if (!mine) return false;
    return mine.colorIndex !== this.draftColor() || mine.emoji !== this.draftEmoji();
  });

  protected colorName(index: number): string {
    return capsuleColorName(index);
  }

  protected openPaint(): void {
    const mine = this.mine();
    if (!mine) return;
    this.draftColor.set(mine.colorIndex);
    this.draftEmoji.set(mine.emoji);
    this.paintError.set('');
    this.painted.set('');
    this.painting.set(true);
    // O foco entra na bancada; sem isto o teclado ficaria na porta que saiu de vista.
    window.setTimeout(() => this.document.getElementById('gate-bench-back')?.focus(), 0);
  }

  protected closePaint(): void {
    if (this.saving()) return;
    // O erro é da bancada: desistir dela o apaga. Deixá-lo de pé poria um "Tente de novo"
    // ao lado da linha de entrada, alertando sobre uma tentativa já abandonada.
    this.paintError.set('');
    this.painting.set(false);
    window.setTimeout(() => this.document.getElementById('gate-paint')?.focus(), 0);
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

  /**
   * Grava a cápsula e só volta para a porta quando o servidor confirma. Voltar ao emitir
   * levaria embora a cor que a pessoa acabou de escolher se a gravação falhasse, e ela
   * teria de escolher tudo de novo sem saber por quê — é a mesma regra da gaveta.
   */
  protected async savePaint(): Promise<void> {
    const mine = this.mine();
    const id = this.groupId();
    if (!mine || !id || !this.dirty() || this.saving()) return;
    if (!mine.memberId) {
      this.paintError.set('Esta cápsula não pode ser pintada daqui. Abra os integrantes na máquina.');
      return;
    }

    const colorIndex = this.draftColor();
    const emoji = this.draftEmoji();
    this.saving.set(true);
    this.paintError.set('');
    try {
      await this.paint(id, mine.memberId, { colorIndex, emoji }, this.identity.name());
      // A lista da porta é atualizada aqui em vez de por uma busca nova: a gravação já
      // custou duas escritas, e reler o log para descobrir a cor que esta tela acabou de
      // escolher gastaria uma leitura para não saber nada de novo.
      this.roster.update((list) => list.map((capsule) => (
        capsule.key === mine.key
          ? { ...gateCapsule(capsule.name, colorIndex, emoji), memberId: capsule.memberId }
          : capsule
      )));
      this.painted.set(
        `Sua cápsula agora é ${capsuleColorName(colorIndex).toLowerCase()}${emoji ? `, com ${emoji}` : ', sem emoji'}.`,
      );
      this.painting.set(false);
      window.setTimeout(() => this.document.getElementById('gate-paint')?.focus(), 0);
    } catch {
      this.paintError.set('Não deu para pintar a cápsula. Tente de novo.');
    } finally {
      this.saving.set(false);
    }
  }

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
