import { Component, computed, input } from '@angular/core';

/**
 * A máquina de cápsulas, sozinha. Ela não sabe de onde vêm os nomes — se de um cálculo
 * determinístico por mês ou do bolo de uma rodada sincronizada. Recebe a lista, quem foi
 * escolhido e o estado do giro, e desenha.
 *
 * A geometria mora aqui porque é dela: caminhos de anel, arcos de rótulo e o encaixe do
 * nome na curva do aro.
 */

export const CAPSULE_COLORS = ['#FFC53D', '#4FE0C8', '#FF6B7D', '#A78BFF', '#FF9A3C', '#FF8FC7'];

/** Geometria do globo no espaço 400x400 do próprio SVG. */
const GLOBE = { cx: 200, cy: 200, inner: 96, equator: 118, outer: 168, label: 140 } as const;

/** Cápsulas inteiras repousando no fundo do globo; fixas para a cena nunca se remexer. */
const LOOSE_CAPSULES = [
  { cx: 160, cy: 250, rot: -18 }, { cx: 196, cy: 269, rot: 9 }, { cx: 232, cy: 252, rot: 24 },
  { cx: 148, cy: 224, rot: 38 }, { cx: 258, cy: 225, rot: -32 }, { cx: 178, cy: 279, rot: -6 },
  { cx: 224, cy: 283, rot: 16 }, { cx: 258, cy: 256, rot: -24 }, { cx: 138, cy: 261, rot: 12 },
] as const;
const LOOSE_RADIUS = 15;

export interface Capsule {
  readonly name: string;
  readonly color: string;
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

export function capsuleColor(index: number): string {
  return CAPSULE_COLORS[((index % CAPSULE_COLORS.length) + CAPSULE_COLORS.length) % CAPSULE_COLORS.length];
}

@Component({
  selector: 'app-machine',
  templateUrl: './machine.html',
})
export class Machine {
  /** Os nomes no globo, na ordem em que ocupam as cápsulas. */
  readonly names = input.required<readonly string[]>();
  /** Qual cápsula está na calha; -1 enquanto nada foi entregue. */
  readonly chosenIndex = input<number>(-1);
  readonly revealed = input<boolean>(true);
  readonly rotation = input<number>(0);
  /** Rotação de repouso, para os nomes decidirem a direção do arco já parados. */
  readonly restRotation = input<number>(0);
  readonly caption = input<string>('');

  protected readonly capsules = computed<Capsule[]>(() => {
    const people = this.names();
    const count = people.length;
    if (!count) return [];

    const step = 360 / count;
    const gap = Math.min(1.6, step * 0.12);
    const fontSize = Math.min(17, Math.max(8, 46 / Math.sqrt(count)));
    const arcLength = (2 * Math.PI * GLOBE.label) / count;
    const budget = Math.floor((arcLength * 0.82) / (0.62 * fontSize));
    const rest = this.restRotation();

    return people.map((name, index) => {
      const from = -90 + index * step + gap / 2;
      const to = -90 + (index + 1) * step - gap / 2;
      const atRest = (from + to) / 2 + rest;
      return {
        name,
        color: capsuleColor(index),
        dome: annulus(from, to, GLOBE.equator, GLOBE.outer),
        clear: annulus(from, to, GLOBE.inner, GLOBE.equator),
        seam: arc(from, to, GLOBE.equator),
        gloss: arc(from + (to - from) * 0.12, from + (to - from) * 0.46, GLOBE.outer - 11),
        label: fitLabel(name, budget),
        labelPath: labelArc(from, to, GLOBE.label, atRest),
        fontSize,
      };
    });
  });

  protected readonly looseCapsules = computed<LooseCapsule[]>(() =>
    LOOSE_CAPSULES.map((capsule, index) => {
      const { cx, cy } = capsule;
      const r = LOOSE_RADIUS;
      return {
        color: capsuleColor(index),
        dome: `M${cx - r} ${cy}a${r} ${r} 0 0 1 ${r * 2} 0Z`,
        shell: `M${cx - r} ${cy}a${r} ${r} 0 0 0 ${r * 2} 0Z`,
        seam: `M${cx - r - 1} ${cy}h${r * 2 + 2}`,
        spot: `M${cx - r * 0.62} ${cy - r * 0.42}a${r * 0.72} ${r * 0.72} 0 0 1 ${r * 0.5} ${-r * 0.42}`,
        transform: `rotate(${capsule.rot} ${cx} ${cy})`,
      };
    }),
  );

  /** O canelado que o aro cromado promete, desenhado em vez de sugerido. */
  protected readonly flutes = computed<string[]>(() =>
    Array.from({ length: 84 }, (_, index) => {
      const angle = (index * 360) / 84;
      return `M${point(angle, 171)}L${point(angle, 183)}`;
    }),
  );

  protected readonly winnerColor = computed(() => {
    const index = this.chosenIndex();
    return index < 0 ? capsuleColor(0) : capsuleColor(index);
  });

  protected trackCapsule(index: number, capsule: Capsule): string {
    return `${index}:${capsule.name}`;
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
