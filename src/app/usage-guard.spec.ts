import { DEFAULT_BUDGET, UsageBudget, UsageGuard, UsageStore, utcDay } from './usage-guard';

function memoryStore(): UsageStore & { value: string | null } {
  return {
    value: null,
    read() {
      return this.value;
    },
    write(next: string) {
      this.value = next;
    },
  };
}

const DAY = Date.UTC(2026, 7, 29, 12, 0, 0);
const SMALL: UsageBudget = { reads: 10, writes: 4, warnAt: 0.7, burstCalls: 6, burstWindowMs: 1000 };

function guard(budget = SMALL, start = DAY) {
  let now = start;
  const store = memoryStore();
  const instance = new UsageGuard(store, () => now, budget);
  return { instance, store, advance: (ms: number) => (now += ms), at: () => now };
}

describe('guarda de uso', () => {
  describe('orçamento diário', () => {
    it('começa livre', () => {
      const { instance } = guard();
      expect(instance.state()).toBe('ok');
      expect(instance.canRead()).toBe(true);
      expect(instance.canWrite()).toBe(true);
    });

    it('avisa antes de bloquear', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 7; i += 1) {
        instance.recordRead();
        advance(2000);
      }
      expect(instance.state()).toBe('warning');
      expect(instance.canRead()).toBe(true);
    });

    it('para de ler ao estourar o orçamento de leitura', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 11; i += 1) {
        instance.recordRead();
        advance(2000);
      }
      expect(instance.state()).toBe('stopped');
      expect(instance.snapshot().stopReason).toBe('read-budget');
      expect(instance.canRead()).toBe(false);
      expect(instance.recordRead()).toBe(false);
    });

    it('para de escrever ao estourar o orçamento de escrita', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 5; i += 1) {
        instance.recordWrite();
        advance(2000);
      }
      expect(instance.snapshot().stopReason).toBe('write-budget');
      expect(instance.canWrite()).toBe(false);
    });

    it('bloqueio de leitura também impede escrita', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 11; i += 1) {
        instance.recordRead();
        advance(2000);
      }
      expect(instance.canWrite()).toBe(false);
    });

    it('recusa uma operação que passaria do teto, mesmo em lote', () => {
      const { instance } = guard();
      expect(instance.canRead(11)).toBe(false);
      expect(instance.canRead(10)).toBe(true);
    });
  });

  describe('estouro em rajada', () => {
    it('trata muitas chamadas em segundos como laço, não como pessoa', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 7; i += 1) {
        instance.recordRead();
        advance(10);
      }
      expect(instance.snapshot().stopReason).toBe('burst');
    });

    it('não confunde uso espaçado com rajada', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 8; i += 1) {
        instance.recordRead();
        advance(5000);
      }
      expect(instance.snapshot().stopReason).not.toBe('burst');
    });
  });

  describe('sinal do próprio Firebase', () => {
    it('resource-exhausted bloqueia na hora', () => {
      const { instance } = guard();
      instance.tripQuotaExhausted();
      expect(instance.state()).toBe('stopped');
      expect(instance.snapshot().stopReason).toBe('quota-exhausted');
      expect(instance.canRead()).toBe(false);
    });

    it('o primeiro motivo de bloqueio é o que fica', () => {
      const { instance } = guard();
      instance.tripQuotaExhausted();
      instance.stop('manual');
      expect(instance.snapshot().stopReason).toBe('quota-exhausted');
    });
  });

  describe('virada do dia', () => {
    it('a cota volta junto com a do Firebase, na virada UTC', () => {
      const { instance, advance } = guard();
      for (let i = 0; i < 11; i += 1) {
        instance.recordRead();
        advance(2000);
      }
      expect(instance.state()).toBe('stopped');

      advance(24 * 60 * 60 * 1000);
      expect(instance.state()).toBe('ok');
      expect(instance.snapshot().reads).toBe(0);
    });

    it('informa quando o bloqueio sai', () => {
      const { instance } = guard();
      instance.tripQuotaExhausted();
      expect(instance.snapshot().stoppedUntil).toBe('2026-08-30');
    });
  });

  describe('persistência', () => {
    it('o consumo sobrevive a um recarregamento no mesmo dia', () => {
      const store = memoryStore();
      const now = () => DAY;
      new UsageGuard(store, now, SMALL).recordRead(5);

      expect(new UsageGuard(store, now, SMALL).snapshot().reads).toBe(5);
    });

    it('o bloqueio sobrevive a um recarregamento', () => {
      const store = memoryStore();
      const now = () => DAY;
      new UsageGuard(store, now, SMALL).tripQuotaExhausted();

      expect(new UsageGuard(store, now, SMALL).state()).toBe('stopped');
    });

    it('o consumo de ontem não conta hoje', () => {
      const store = memoryStore();
      new UsageGuard(store, () => DAY, SMALL).recordRead(9);

      const amanha = new UsageGuard(store, () => DAY + 24 * 60 * 60 * 1000, SMALL);
      expect(amanha.snapshot().reads).toBe(0);
      expect(amanha.state()).toBe('ok');
    });

    it('armazenamento corrompido não derruba nem libera gasto', () => {
      const store = memoryStore();
      store.value = 'isso não é json';
      const instance = new UsageGuard(store, () => DAY, SMALL);
      expect(instance.state()).toBe('ok');
      expect(instance.snapshot().reads).toBe(0);
    });

    it('armazenamento bloqueado não impede o guarda de funcionar', () => {
      const throwing: UsageStore = {
        read() {
          throw new Error('bloqueado');
        },
        write() {
          throw new Error('bloqueado');
        },
      };
      const instance = new UsageGuard(throwing, () => DAY, SMALL);
      expect(instance.recordRead()).toBe(true);
      expect(instance.state()).toBe('ok');
    });
  });

  it('o orçamento padrão fica muito abaixo da cota gratuita do Spark', () => {
    // Spark dá na ordem de 50k leituras e 20k escritas por dia no projeto inteiro.
    expect(DEFAULT_BUDGET.reads).toBeLessThan(50_000 / 10);
    expect(DEFAULT_BUDGET.writes).toBeLessThan(20_000 / 10);
  });

  it('utcDay não escorrega por fuso', () => {
    expect(utcDay(Date.UTC(2026, 7, 29, 23, 59, 59))).toBe('2026-08-29');
    expect(utcDay(Date.UTC(2026, 7, 30, 0, 0, 1))).toBe('2026-08-30');
  });
});
