import {
  CAPSULE_COLORS,
  CAPSULE_COLOR_COUNT,
  CAPSULE_COLOR_NAMES,
  capsuleColor,
  capsuleColorName,
  capsuleInk,
  capsuleTextOnEnamel,
  defaultColorIndex,
  isColorIndex,
} from './palette';

/** A legibilidade da paleta é medida nos dois lugares onde ela carrega texto. */

const ESMALTE = '#10233f';

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

describe('a paleta de cápsulas', () => {
  it('tem pelo menos vinte cores', () => {
    expect(CAPSULE_COLOR_COUNT).toBeGreaterThanOrEqual(20);
    expect(CAPSULE_COLORS).toHaveLength(CAPSULE_COLOR_COUNT);
  });

  it('cada cor tem um nome, para quem escolhe sem distinguir duas matizes', () => {
    expect(CAPSULE_COLOR_NAMES).toHaveLength(CAPSULE_COLOR_COUNT);
    expect(new Set(CAPSULE_COLOR_NAMES).size).toBe(CAPSULE_COLOR_COUNT);
    expect(CAPSULE_COLOR_NAMES.every((nome) => nome.length > 0)).toBe(true);
  });

  it('cada cor escolhe tinta clara ou escura com contraste AA', () => {
    const reprovadas = CAPSULE_COLORS
      .map((cor, i) => ({ cor, nome: CAPSULE_COLOR_NAMES[i], razao: contraste(capsuleInk(i), cor) }))
      .filter((c) => c.razao < 4.5);
    expect(reprovadas).toEqual([]);
  });

  it('o nome sobre esmalte usa a cor quando ela passa, e branco quando ela sumiria', () => {
    const reprovadas = CAPSULE_COLORS
      .map((_, i) => ({ nome: CAPSULE_COLOR_NAMES[i], razao: contraste(capsuleTextOnEnamel(i), ESMALTE) }))
      .filter((c) => c.razao < 4.5);
    expect(reprovadas).toEqual([]);
    expect(capsuleTextOnEnamel(0)).toBe('#FFFFFF');
    expect(capsuleTextOnEnamel(13)).toBe(CAPSULE_COLORS[13]);
  });

  it('não repete nenhuma cor', () => {
    expect(new Set(CAPSULE_COLORS).size).toBe(CAPSULE_COLOR_COUNT);
  });

  it('preserva exatamente a ordem da paleta JASC fornecida', () => {
    expect(CAPSULE_COLORS).toEqual([
      '#0F0F12', '#505359', '#B6BFBC', '#F2FBFF', '#5EE7FF', '#00A1DB',
      '#1D5BB8', '#1F2C66', '#1B5245', '#2E8F46', '#58D92E', '#CBFF70',
      '#FFFF8F', '#FFDF2B', '#F0771A', '#E32239', '#851540', '#401A24',
      '#9C3B30', '#C95D3C', '#ED8A5F', '#FFBCA6', '#EB75BE', '#77388C',
    ]);
  });
});

describe('a distribuição padrão', () => {
  it('percorre a paleta inteira sem repetir', () => {
    const vistas = new Set<number>();
    for (let posicao = 0; posicao < CAPSULE_COLOR_COUNT; posicao += 1) {
      vistas.add(defaultColorIndex(posicao));
    }
    expect(vistas.size).toBe(CAPSULE_COLOR_COUNT);
  });

  it('afasta cada nova cápsula da anterior na lista', () => {
    for (let posicao = 0; posicao + 1 < CAPSULE_COLOR_COUNT; posicao += 1) {
      const salto = Math.abs(defaultColorIndex(posicao + 1) - defaultColorIndex(posicao));
      const distanciaNaRoda = Math.min(salto, CAPSULE_COLOR_COUNT - salto);
      expect(distanciaNaRoda).toBeGreaterThanOrEqual(6);
    }
  });

  it('depois de dar a volta, recomeça em vez de sair da paleta', () => {
    expect(defaultColorIndex(CAPSULE_COLOR_COUNT)).toBe(defaultColorIndex(0));
    expect(defaultColorIndex(200)).toBeGreaterThanOrEqual(0);
    expect(defaultColorIndex(200)).toBeLessThan(CAPSULE_COLOR_COUNT);
  });
});

describe('a leitura de uma cor', () => {
  it('um índice fora da paleta volta para dentro dela', () => {
    expect(capsuleColor(CAPSULE_COLOR_COUNT)).toBe(CAPSULE_COLORS[0]);
    expect(capsuleColor(-1)).toBe(CAPSULE_COLORS[CAPSULE_COLOR_COUNT - 1]);
    expect(capsuleColorName(CAPSULE_COLOR_COUNT + 2)).toBe(CAPSULE_COLOR_NAMES[2]);
  });

  it('só um inteiro dentro da paleta é um índice de cor', () => {
    expect(isColorIndex(0)).toBe(true);
    expect(isColorIndex(CAPSULE_COLOR_COUNT - 1)).toBe(true);
    expect(isColorIndex(CAPSULE_COLOR_COUNT)).toBe(false);
    expect(isColorIndex(-1)).toBe(false);
    expect(isColorIndex(1.5)).toBe(false);
    expect(isColorIndex('3')).toBe(false);
    expect(isColorIndex(null)).toBe(false);
  });
});
