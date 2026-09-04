import { Component, computed, input, output } from '@angular/core';

import { capsuleColor } from './palette';

/**
 * A máquina de cápsulas, sozinha. Ela não sabe de onde vêm as pessoas nem quem escolheu a
 * cor de cada uma: recebe a lista pronta, quem foi escolhido e o estado do giro, e desenha.
 *
 * A geometria mora aqui porque é dela: caminhos de anel, arcos de rótulo e o encaixe do
 * nome na curva do aro.
 */

/** Uma pessoa como a máquina precisa dela: um nome, uma cor e o símbolo que ela solta. */
export interface MachinePerson {
  readonly name: string;
  readonly color: string;
  readonly ink: string;
  readonly emoji: string;
}

/** Geometria do globo no espaço 400x400 do próprio SVG. */
const GLOBE = { cx: 200, cy: 200, inner: 96, equator: 118, outer: 168, label: 140 } as const;

/**
 * Cápsulas inteiras repousando no fundo do globo; fixas para a cena nunca se remexer.
 *
 * Todas assentam na curva inferior do núcleo, entre o cubo e o anel das cunhas: o centro
 * fica a 64–78 do centro do globo, então a borda externa para em 95 (o núcleo começa em
 * `GLOBE.inner` = 96) e a interna em 49 (o anel do cubo tem raio 44). Antes elas chegavam
 * a 109 e o anel das cunhas, que pinta depois, cortava quatro delas ao meio; as duas do
 * topo ainda eram fatiadas pelo cubo. A folga também absorve o deslocamento da animação
 * `settle`, que sobe 7px e gira 4° em torno de (200, 240).
 */
const LOOSE_CAPSULES = [
  // Cinco assentadas na curva do fundo…
  { cx: 259, cy: 250, rot: -14 }, { cx: 233, cy: 271, rot: 22 }, { cx: 200, cy: 278, rot: -6 },
  { cx: 167, cy: 271, rot: 15 }, { cx: 141, cy: 250, rot: -25 },
  // …e quatro encaixadas nas valas entre elas, que por virem depois pintam à frente.
  { cx: 239, cy: 250, rot: 33 }, { cx: 213, cy: 263, rot: -19 },
  { cx: 187, cy: 263, rot: 9 }, { cx: 161, cy: 250, rot: 28 },
] as const;
const LOOSE_RADIUS = 15;

export interface Capsule {
  readonly name: string;
  readonly color: string;
  readonly ink: string;
  readonly dome: string;
  readonly clear: string;
  readonly seam: string;
  readonly gloss: string;
  readonly label: string;
  readonly labelPath: string;
  readonly fontSize: number;
}

export interface LooseCapsule {
  readonly color: string;
  readonly dome: string;
  readonly shell: string;
  readonly seam: string;
  readonly spot: string;
  readonly transform: string;
}

@Component({
  selector: 'app-machine',
  templateUrl: './machine.html',
})
export class Machine {
  /** As pessoas no globo, na ordem em que ocupam as cápsulas. */
  readonly people = input.required<readonly MachinePerson[]>();
  /** Qual cápsula está na calha; -1 enquanto nada foi entregue. */
  readonly chosenIndex = input<number>(-1);
  readonly revealed = input<boolean>(true);
  readonly rotation = input<number>(0);
  /** Rotação de repouso, para os nomes decidirem a direção do arco já parados. */
  readonly restRotation = input<number>(0);
  readonly caption = input<string>('');
  /** Trava o controle enquanto a entrega acontece; girar duas vezes ao mesmo tempo não é uma cena. */
  readonly busy = input<boolean>(false);

  /** Alguém pediu a cena de novo. Só a cena: o resultado já está decidido. */
  readonly replay = output<void>();

  protected readonly capsules = computed<Capsule[]>(() => {
    const people = this.people();
    const count = people.length;
    if (!count) return [];

    const step = 360 / count;
    const gap = Math.min(1.6, step * 0.12);
    const fontSize = Math.min(17, Math.max(8, 46 / Math.sqrt(count)));
    const arcLength = (2 * Math.PI * GLOBE.label) / count;
    const budget = Math.floor((arcLength * 0.82) / (0.62 * fontSize));
    const rest = this.restRotation();

    return people.map((person, index) => {
      const from = -90 + index * step + gap / 2;
      const to = -90 + (index + 1) * step - gap / 2;
      const atRest = (from + to) / 2 + rest;
      return {
        name: person.name,
        color: person.color,
        ink: person.ink,
        dome: annulus(from, to, GLOBE.equator, GLOBE.outer),
        clear: annulus(from, to, GLOBE.inner, GLOBE.equator),
        seam: arc(from, to, GLOBE.equator),
        gloss: arc(from + (to - from) * 0.12, from + (to - from) * 0.46, GLOBE.outer - 11),
        label: fitLabel(person.name, budget),
        labelPath: labelArc(from, to, GLOBE.label, atRest),
        fontSize,
      };
    });
  });

  /**
   * As cápsulas soltas no fundo usam as cores do próprio grupo, cicladas. Um interior
   * pintado com uma paleta que não é a do globo lia como cena decorativa; com as cores
   * de quem está lá dentro, o monte é o mesmo material das cunhas.
   */
  protected readonly looseCapsules = computed<LooseCapsule[]>(() => {
    const colors = this.people().map((person) => person.color);
    return LOOSE_CAPSULES.map((capsule, index) => {
      const { cx, cy } = capsule;
      const r = LOOSE_RADIUS;
      return {
        color: colors.length ? colors[index % colors.length] : capsuleColor(index),
        dome: `M${cx - r} ${cy}a${r} ${r} 0 0 1 ${r * 2} 0Z`,
        shell: `M${cx - r} ${cy}a${r} ${r} 0 0 0 ${r * 2} 0Z`,
        seam: `M${cx - r - 1} ${cy}h${r * 2 + 2}`,
        spot: `M${cx - r * 0.62} ${cy - r * 0.42}a${r * 0.72} ${r * 0.72} 0 0 1 ${r * 0.5} ${-r * 0.42}`,
        transform: `rotate(${capsule.rot} ${cx} ${cy})`,
      };
    });
  });

  /** O canelado que o aro cromado promete, desenhado em vez de sugerido. */
  protected readonly flutes = computed<string[]>(() =>
    Array.from({ length: 84 }, (_, index) => {
      const angle = (index * 360) / 84;
      return `M${point(angle, 171)}L${point(angle, 183)}`;
    }),
  );

  protected readonly winner = computed<MachinePerson | null>(() => {
    const index = this.chosenIndex();
    return index < 0 ? null : this.people()[index] ?? null;
  });

  protected readonly winnerColor = computed(() => this.winner()?.color ?? capsuleColor(0));

  protected trackCapsule(index: number, capsule: Capsule): string {
    return `${index}:${capsule.name}`;
  }

  protected askReplay(): void {
    if (!this.busy()) this.replay.emit();
  }
}

function point(angle: number, radius: number): string {
  const radians = (angle * Math.PI) / 180;
  return `${(GLOBE.cx + radius * Math.cos(radians)).toFixed(2)} ${(GLOBE.cy + radius * Math.sin(radians)).toFixed(2)}`;
}

function annulus(from: number, to: number, inner: number, outer: number): string {
  const large = to - from > 180 ? 1 : 0;
  return `M${point(from, outer)}A${outer} ${outer} 0 ${large} 1 ${point(to, outer)}` +
    `L${point(to, inner)}A${inner} ${inner} 0 ${large} 0 ${point(from, inner)}Z`;
}

function arc(from: number, to: number, radius: number): string {
  const large = to - from > 180 ? 1 : 0;
  return `M${point(from, radius)}A${radius} ${radius} 0 ${large} 1 ${point(to, radius)}`;
}

/** Nomes acompanham o aro, então quem repousa embaixo precisa do arco invertido. */
function labelArc(from: number, to: number, radius: number, atRest: number): string {
  const middle = ((atRest + 180) % 360 + 360) % 360 - 180;
  if (middle < 0) return arc(from, to, radius);
  const large = to - from > 180 ? 1 : 0;
  return `M${point(to, radius)}A${radius} ${radius} 0 ${large} 0 ${point(from, radius)}`;
}

/** Cabe o primeiro nome se o arco permitir, senão iniciais, senão uma letra. */
function fitLabel(name: string, budget: number): string {
  if (budget < 1) return '';
  const first = name.split(' ')[0];
  if (budget >= first.length) return first;
  const short = name.split(' ').slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
  if (budget >= short.length) return short;
  return short.slice(0, 1);
}
