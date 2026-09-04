/**
 * As cores de cápsula. Uma volta completa na roda de matizes em 24 passos, com a
 * luminosidade acompanhando o formato do gamut sRGB — alta no amarelo-verde, onde há
 * croma de sobra; mais baixa no azul-violeta, onde só existe cor se a tinta escurecer.
 * É uma rampa, não um zigue-zague, e é isso que faz o conjunto ler como uma caixa de
 * cápsulas de plástico em vez de um sortido aleatório.
 *
 * Toda cor daqui passa de 4.5:1 sobre o esmalte E aceita tinta escura por cima com a
 * mesma folga — a Regra da Cápsula Portante, verificada nos dois sentidos. A pior aqui
 * é o coral, com 5.73 e 6.45. Uma cor nova só entra se cumprir os dois lados.
 *
 * As seis primeiras cores do produto continuam no conjunto, nas matizes onde sempre
 * estiveram: quem já tem uma cápsula não a perde por causa de uma paleta maior.
 */
export const CAPSULE_COLORS = [
  '#FF6B7D', '#FF9985', '#FF9C70', '#FF9A3C', '#FFC277', '#FFC53D',
  '#F1D100', '#D5DC04', '#B1E546', '#83EA6C', '#42EC8E', '#00E7AE',
  '#4FE0C8', '#00D7D6', '#00CFE4', '#00C6F4', '#38BCFF', '#65B2FF',
  '#80A9FF', '#97A0FF', '#A78BFF', '#CF89FF', '#F27FEA', '#FF8FC7',
] as const;

/** O nome de cada cor, para quem escolhe sem enxergar a diferença entre duas matizes. */
export const CAPSULE_COLOR_NAMES = [
  'Coral', 'Salmão', 'Pêssego', 'Tangerina', 'Areia', 'Âmbar',
  'Ouro', 'Limão', 'Lima', 'Broto', 'Trevo', 'Jade',
  'Menta', 'Turquesa', 'Piscina', 'Céu', 'Anil', 'Azulejo',
  'Pervinca', 'Lavanda', 'Violeta', 'Orquídea', 'Magenta', 'Rosa',
] as const;

export const CAPSULE_COLOR_COUNT = CAPSULE_COLORS.length;

/**
 * Vinte e quatro matizes em volta da roda são vinte e quatro vizinhas parecidas: duas
 * cores separadas por 15° são parecidas mesmo, e nenhuma escolha de paleta conserta isso.
 * Quem conserta é a ordem de distribuição — o passo 11 é primo com 24, então percorre as
 * vinte e quatro sem repetir nenhuma, e coloca cada nova cápsula a 165° da anterior, quase
 * do outro lado da roda. As seis primeiras pessoas de um grupo saem coral, jade, magenta,
 * broto, violeta e limão.
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

export function isColorIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < CAPSULE_COLOR_COUNT;
}
