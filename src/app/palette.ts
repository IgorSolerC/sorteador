/**
 * As 24 tintas da paleta JASC escolhida para as cápsulas, na ordem em que foram
 * fornecidas. O índice faz parte do log, então os valores podem ser afinados, mas nunca
 * reordenados: a posição 7 continua sendo a cápsula 7 em todos os grupos existentes.
 *
 * A coleção inclui de propósito neutros e tons profundos, em vez de uma rampa só de
 * cores claras. Por isso texto e ferragens não presumem mais tinta escura: `capsuleInk`
 * escolhe, de forma medida, a tinta que alcança contraste AA sobre cada cápsula.
 */
export const CAPSULE_COLORS = [
  '#0F0F12', '#505359', '#B6BFBC', '#F2FBFF', '#5EE7FF', '#00A1DB',
  '#1D5BB8', '#1F2C66', '#1B5245', '#2E8F46', '#58D92E', '#CBFF70',
  '#FFFF8F', '#FFDF2B', '#F0771A', '#E32239', '#851540', '#401A24',
  '#9C3B30', '#C95D3C', '#ED8A5F', '#FFBCA6', '#EB75BE', '#77388C',
] as const;

/** O nome de cada cor, para quem escolhe sem enxergar a diferença entre duas matizes. */
export const CAPSULE_COLOR_NAMES = [
  'Breu', 'Grafite', 'Névoa', 'Gelo', 'Ciano', 'Azul-piscina',
  'Cobalto', 'Índigo', 'Pinho', 'Folha', 'Lima', 'Broto',
  'Baunilha', 'Girassol', 'Tangerina', 'Carmim', 'Vinho', 'Ameixa',
  'Tijolo', 'Terracota', 'Salmão', 'Pêssego', 'Rosa', 'Roxo',
] as const;

export const CAPSULE_COLOR_COUNT = CAPSULE_COLORS.length;

/**
 * A paleta alterna neutros, frios, verdes, quentes e violetas. O passo 11 é primo com 24,
 * então percorre as vinte e quatro sem repetir e evita entregar aos primeiros membros uma
 * sequência inteira do mesmo trecho da lista.
 *
 * O passo precisa ser primo com o tamanho da paleta, senão ele fecha um ciclo curto e
 * repete: com 24 cores, um passo 9 visita oito e volta ao começo.
 */
const STRIDE = 11;

export function defaultColorIndex(position: number): number {
  return (Math.max(0, Math.trunc(position)) * STRIDE) % CAPSULE_COLOR_COUNT;
}

export function capsuleColor(index: number): string {
  const count = CAPSULE_COLOR_COUNT;
  return CAPSULE_COLORS[(((Math.trunc(index) || 0) % count) + count) % count];
}

export function capsuleColorName(index: number): string {
  const count = CAPSULE_COLOR_COUNT;
  return CAPSULE_COLOR_NAMES[(((Math.trunc(index) || 0) % count) + count) % count];
}

// A tinta mais escura da própria paleta alcança AA até nos dois meios-tons limítrofes.
const DARK_INK = '#0F0F12';
const LIGHT_INK = '#FFFFFF';
const ENAMEL = '#10233F';

/** Tinta AA para iniciais, nomes e ferragens desenhados sobre uma cápsula. */
export function capsuleInk(index: number): string {
  return capsuleInkForColor(capsuleColor(index));
}

export function capsuleInkForColor(color: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return DARK_INK;
  return contrast(color, DARK_INK) >= contrast(color, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}

/**
 * Cor do nome quando ele vive sobre o esmalte, e não dentro da cápsula. Tons profundos
 * continuam presentes na máquina e no brilho, mas o nome passa para branco para não sumir.
 */
export function capsuleTextOnEnamel(index: number): string {
  const color = capsuleColor(index);
  return contrast(color, ENAMEL) >= 4.5 ? color : LIGHT_INK;
}

function luminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isColorIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < CAPSULE_COLOR_COUNT;
}
