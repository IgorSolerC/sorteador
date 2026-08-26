import { calculateMonthlyDraw, getCycleEntries, normalizeParticipants } from './draw-engine';
import { decodeParticipants, encodeParticipants } from './share-link';

/**
 * The app is in use and links are already in circulation. Everything asserted here is a
 * promise to people holding those links: the same configuration must keep producing the
 * same person, in the same order, under the same edition code, forever.
 *
 * These vectors were captured from the deployed build. A change that breaks one of them
 * breaks somebody's link — if a change is genuinely wanted, it needs a new format version
 * alongside the old one, never an edit to the numbers below.
 */
describe('compatibilidade com links já compartilhados', () => {
  describe('formato do fragmento', () => {
    it('mantém a codificação base64url exata para uma lista sem acentos', () => {
      expect(encodeParticipants(['Zilda', 'Yuri', 'Xavier', 'Wanda']))
        .toBe('WyJaaWxkYSIsIll1cmkiLCJYYXZpZXIiLCJXYW5kYSJd');
    });

    it('mantém a codificação exata para nomes acentuados, sem padding', () => {
      expect(encodeParticipants(['Cecília', 'Fátima'])).toBe('WyJDZWPDrWxpYSIsIkbDoXRpbWEiXQ');
    });

    it('decodifica um fragmento antigo na mesma lista normalizada', () => {
      expect(decodeParticipants('WyJaaWxkYSIsIll1cmkiLCJYYXZpZXIiLCJXYW5kYSJd'))
        .toEqual(['Wanda', 'Xavier', 'Yuri', 'Zilda']);
    });

    it('sobrevive a uma volta completa', () => {
      expect(decodeParticipants(encodeParticipants(['Cecília', 'Fátima', 'Ana'])))
        .toEqual(['Ana', 'Cecília', 'Fátima']);
    });

    it('sinaliza um fragmento corrompido para o chamador tratar', () => {
      // O contrato é este: decode lança, e quem lê o hash protege a página.
      // A garantia de que a página não quebra está em app.spec.ts.
      expect(() => decodeParticipants('não-é-base64')).toThrow();
    });
  });

  describe('ordenação normalizada', () => {
    it('mantém a ordem de chave exata, acentos incluídos', () => {
      // 'josé silva' e 'jose silva' são chaves distintas: as duas ficam. Comportamento
      // congelado — uni-las agora mudaria o vencedor de quem já usa essas listas.
      expect(normalizeParticipants(['  José  Silva ', 'jose silva', 'Ana', 'ana', 'Ábaco']))
        .toEqual(['Ana', 'jose silva', 'José Silva', 'Ábaco']);
    });
  });

  describe('resultados congelados', () => {
    const clube = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];
    const quarteto = ['Zilda', 'Yuri', 'Xavier', 'Wanda'];

    it('lista demo, agosto/2026, início agosto/2026', () => {
      const draw = calculateMonthlyDraw(clube, 2026, 8, 2026, 8)!;
      expect(draw.winner).toBe('Fátima');
      expect(draw.fingerprint).toBe('9dc4e223');
      expect(draw.cyclePosition).toBe(0);
      expect(draw.cycleIndex).toBe(0);
      expect(draw.orderedParticipants)
        .toEqual(['Fátima', 'Cecília', 'Ana', 'Elisa', 'Davi', 'Breno']);
    });

    it('mesma lista no ciclo seguinte reembaralha, mas de forma reproduzível', () => {
      const draw = calculateMonthlyDraw(clube, 2027, 3, 2026, 8)!;
      expect(draw.winner).toBe('Breno');
      expect(draw.fingerprint).toBe('9dc4e223');
      expect(draw.cycleIndex).toBe(1);
      expect(draw.orderedParticipants)
        .toEqual(['Ana', 'Breno', 'Cecília', 'Davi', 'Fátima', 'Elisa']);
    });

    it('link compartilhado de quatro pessoas, início maio/2026', () => {
      const draw = calculateMonthlyDraw(quarteto, 2026, 8, 2026, 5)!;
      expect(draw.winner).toBe('Zilda');
      expect(draw.fingerprint).toBe('1b454935');
      expect(draw.cyclePosition).toBe(3);
      expect(draw.orderedParticipants).toEqual(['Xavier', 'Wanda', 'Yuri', 'Zilda']);
    });

    it('muitos ciclos adiante continua determinístico', () => {
      const draw = calculateMonthlyDraw(quarteto, 2029, 12, 2026, 5)!;
      expect(draw.winner).toBe('Xavier');
      expect(draw.cycleIndex).toBe(10);
      expect(draw.orderedParticipants).toEqual(['Yuri', 'Zilda', 'Wanda', 'Xavier']);
    });

    it('duplicatas e espaços colapsam do mesmo jeito de antes', () => {
      const draw = calculateMonthlyDraw(['ana', 'ANA ', ' Bruno', 'bruno', 'Carla'], 2026, 9, 2026, 1)!;
      expect(draw.winner).toBe('Bruno');
      expect(draw.fingerprint).toBe('4fc51aeb');
      expect(draw.orderedParticipants).toEqual(['Carla', 'ana', 'Bruno']);
    });

    it('dupla com início muito anterior', () => {
      const draw = calculateMonthlyDraw(['Ana', 'Breno'], 2030, 1, 2024, 6)!;
      expect(draw.winner).toBe('Ana');
      expect(draw.fingerprint).toBe('e77ee8ee');
      expect(draw.cycleIndex).toBe(33);
    });
  });

  describe('sequência de meses', () => {
    it('mantém meses e estados exatos a partir do início do ciclo', () => {
      const draw = calculateMonthlyDraw(['Zilda', 'Yuri', 'Xavier', 'Wanda'], 2026, 8, 2026, 5)!;
      expect(getCycleEntries(draw).map((e) => `${e.month}/${e.year} ${e.participant} ${e.status}`))
        .toEqual([
          '5/2026 Xavier drawn',
          '6/2026 Wanda drawn',
          '7/2026 Yuri drawn',
          '8/2026 Zilda current',
        ]);
    });
  });

  describe('limites que já valiam', () => {
    it('não produz resultado antes da data de início', () => {
      expect(calculateMonthlyDraw(['Ana', 'Breno'], 2026, 4, 2026, 5)).toBeNull();
    });

    it('não produz resultado com menos de duas pessoas', () => {
      expect(calculateMonthlyDraw(['Ana'], 2026, 8, 2026, 8)).toBeNull();
    });
  });
});
