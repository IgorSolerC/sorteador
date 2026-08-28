import { calculateMonthlyDraw, findSeedForHistory } from './draw-engine';

describe('semente', () => {
  const clube = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];

  describe('compatibilidade', () => {
    it('semente vazia devolve exatamente o resultado sem semente', () => {
      const semSemente = calculateMonthlyDraw(clube, 2026, 8, 2026, 8)!;
      const comVazia = calculateMonthlyDraw(clube, 2026, 8, 2026, 8, '')!;
      expect(comVazia).toEqual(semSemente);
      expect(comVazia.winner).toBe('Fátima');
      expect(comVazia.fingerprint).toBe('9dc4e223');
    });

    it('uma semente muda o vencedor e a edição', () => {
      const base = calculateMonthlyDraw(clube, 2026, 8, 2026, 8)!;
      const comSemente = calculateMonthlyDraw(clube, 2026, 8, 2026, 8, 'abacaxi')!;
      expect(comSemente.fingerprint).not.toBe(base.fingerprint);
    });

    it('a mesma semente é reproduzível', () => {
      const um = calculateMonthlyDraw(clube, 2026, 8, 2026, 8, 'minha semente')!;
      const dois = calculateMonthlyDraw(clube, 2026, 8, 2026, 8, 'minha semente')!;
      expect(dois.winner).toBe(um.winner);
      expect(dois.orderedParticipants).toEqual(um.orderedParticipants);
    });

    it('aceita qualquer sequência de caracteres', () => {
      for (const semente of ['1', 'a b c', 'ÁÉÍ-ção', '🎲', ':::', 'x'.repeat(200)]) {
        const draw = calculateMonthlyDraw(clube, 2026, 8, 2026, 8, semente);
        expect(draw).not.toBeNull();
        expect(clube).toContain(draw!.winner);
      }
    });
  });

  describe('preservar o histórico ao entrar alguém novo', () => {
    // O caso real: o clube rodou agosto/2026 com seis pessoas e Fátima ganhou.
    // Em seguida entrou a Gabriela. Sem semente, agosto passaria a apontar outra pessoa.
    const ampliado = [...clube, 'Gabriela'];

    it('sem semente, entrar alguém reescreve o mês já anunciado', () => {
      const antes = calculateMonthlyDraw(clube, 2026, 8, 2026, 8)!;
      const depois = calculateMonthlyDraw(ampliado, 2026, 8, 2026, 8)!;
      expect(antes.winner).toBe('Fátima');
      expect(depois.winner).not.toBe('Fátima');
    });

    it('encontra uma semente que devolve agosto para a Fátima', () => {
      const { seed, attempts } = findSeedForHistory(ampliado, 2026, 8, [
        { year: 2026, month: 8, winner: 'Fátima' },
      ]);

      expect(seed).not.toBeNull();
      expect(attempts).toBeLessThan(500);

      const corrigido = calculateMonthlyDraw(ampliado, 2026, 8, 2026, 8, seed!)!;
      expect(corrigido.winner).toBe('Fátima');
      expect(corrigido.orderedParticipants).toHaveLength(7);
      expect(corrigido.orderedParticipants).toContain('Gabriela');
    });

    it('preserva vários meses de histórico de uma vez', () => {
      const historico = [
        { year: 2026, month: 8, winner: 'Fátima' },
        { year: 2026, month: 9, winner: 'Cecília' },
        { year: 2026, month: 10, winner: 'Ana' },
      ];
      const { seed } = findSeedForHistory(ampliado, 2026, 8, historico);
      expect(seed).not.toBeNull();

      for (const alvo of historico) {
        const draw = calculateMonthlyDraw(ampliado, alvo.year, alvo.month, 2026, 8, seed!)!;
        expect(draw.winner).toBe(alvo.winner);
      }
    });

    it('a busca é determinística: mesma entrada, mesma semente', () => {
      const alvos = [{ year: 2026, month: 8, winner: 'Fátima' }];
      const um = findSeedForHistory(ampliado, 2026, 8, alvos);
      const dois = findSeedForHistory(ampliado, 2026, 8, alvos);
      expect(dois.seed).toBe(um.seed);
    });

    it('devolve semente vazia quando o histórico já bate', () => {
      const { seed, attempts } = findSeedForHistory(clube, 2026, 8, [
        { year: 2026, month: 8, winner: 'Fátima' },
      ]);
      expect(seed).toBe('');
      expect(attempts).toBe(1);
    });

    it('sem alvos, não há o que procurar', () => {
      expect(findSeedForHistory(ampliado, 2026, 8, [])).toEqual({ seed: '', attempts: 0 });
    });

    it('desiste quando o alvo é alguém que saiu da lista', () => {
      const { seed } = findSeedForHistory(ampliado, 2026, 8, [
        { year: 2026, month: 8, winner: 'Quem Saiu' },
      ]);
      expect(seed).toBeNull();
    });

    it('desiste quando dois meses do mesmo ciclo pedem a mesma pessoa', () => {
      // Impossível por construção: dentro de um ciclo ninguém sai duas vezes.
      const { seed } = findSeedForHistory(ampliado, 2026, 8, [
        { year: 2026, month: 8, winner: 'Fátima' },
        { year: 2026, month: 9, winner: 'Fátima' },
      ], 2000);
      expect(seed).toBeNull();
    });
  });
});
