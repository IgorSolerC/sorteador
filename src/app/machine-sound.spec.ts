import { easeInverse } from './machine-sound';

/**
 * O som da máquina é sintetizado, e a única parte dele que dá para provar sem ouvido é a
 * que o faz acompanhar a imagem: em que instante cada tique da catraca cai.
 *
 * Se esta conta estiver errada, os tiques saem regulares sobre uma roda que freia — e o
 * resultado soa como outro objeto, não como a máquina que está na tela.
 */
describe('a catraca acompanha a curva da roleta', () => {
  it('começa no começo e termina no fim', () => {
    expect(easeInverse(0)).toBeCloseTo(0, 5);
    expect(easeInverse(1)).toBeCloseTo(1, 5);
  });

  it('nunca anda para trás: um tique não pode soar antes do anterior', () => {
    let anterior = -1;
    for (let k = 0; k <= 40; k += 1) {
      const t = easeInverse(k / 40);
      expect(t).toBeGreaterThanOrEqual(anterior);
      anterior = t;
    }
  });

  it('a roda anda quase metade do caminho no primeiro quinto do tempo', () => {
    // É a assinatura de `cubic-bezier(.12, .72, .12, 1)`: sai rápido e freia longo. Se
    // esta medida cair para perto de 0,2, a curva virou linear e o som perdeu o sentido.
    expect(easeInverse(0.45)).toBeLessThan(0.2);
  });

  it('os tiques abrem espaço entre si conforme a roda freia', () => {
    // 26 tiques, os mesmos da cena. O intervalo entre os dois últimos tem que ser muitas
    // vezes maior que o dos dois primeiros: é isso que se ouve como freada.
    const instantes = Array.from({ length: 27 }, (_, k) => easeInverse(k / 26));
    const primeiro = instantes[1] - instantes[0];
    const ultimo = instantes[26] - instantes[25];

    expect(ultimo).toBeGreaterThan(primeiro * 10);
  });
});
