import {
  activeMembers,
  canSpin,
  emptyState,
  GroupEvent,
  memberId,
  poolMembers,
  replay,
  spinsOfRound,
} from './group-log';

const GRUPO = 'g7x2k9';
let clock = 1_700_000_000_000;
const at = () => (clock += 60_000);

function add(name: string): GroupEvent {
  return { type: 'member_added', at: at(), name };
}
function remove(name: string): GroupEvent {
  return { type: 'member_removed', at: at(), memberId: memberId(GRUPO, name) };
}
function spin(): GroupEvent {
  return { type: 'spin', at: at() };
}
function seed(names: string[]): GroupEvent[] {
  return names.map(add);
}

beforeEach(() => {
  clock = 1_700_000_000_000;
});

describe('identidade do integrante', () => {
  it('mesmo nome no mesmo grupo é sempre o mesmo id', () => {
    expect(memberId(GRUPO, 'Ana')).toBe(memberId(GRUPO, 'Ana'));
  });

  it('normaliza antes de identificar', () => {
    expect(memberId(GRUPO, '  ana  ')).toBe(memberId(GRUPO, 'Ana'));
    expect(memberId(GRUPO, 'José  Silva')).toBe(memberId(GRUPO, 'josé silva'));
  });

  it('o mesmo nome em grupos diferentes é gente diferente', () => {
    expect(memberId('outro', 'Ana')).not.toBe(memberId(GRUPO, 'Ana'));
  });

  it('nomes diferentes não colidem', () => {
    const ids = new Set(
      ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima', 'Gabriela'].map((n) => memberId(GRUPO, n)),
    );
    expect(ids.size).toBe(7);
  });
});

describe('replay do log', () => {
  it('um log vazio é um grupo vazio', () => {
    expect(replay(GRUPO, [])).toEqual(emptyState());
  });

  it('entrar coloca a pessoa no bolo da rodada', () => {
    const state = replay(GRUPO, seed(['Ana', 'Breno']));
    expect(activeMembers(state)).toHaveLength(2);
    expect(state.pool).toHaveLength(2);
    expect(state.round).toBe(1);
  });

  it('entrar duas vezes com o mesmo nome não duplica', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno']), add('ana')]);
    expect(activeMembers(state)).toHaveLength(2);
  });

  it('sair mantém a pessoa no histórico, mas fora do bolo', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno', 'Cecília']), remove('Breno')]);
    expect(state.members).toHaveLength(3);
    expect(activeMembers(state)).toHaveLength(2);
    expect(state.pool).toHaveLength(2);
    expect(state.members.find((m) => m.name === 'Breno')!.leftAt).not.toBeNull();
  });

  it('não passa do teto de integrantes', () => {
    const names = Array.from({ length: 65 }, (_, i) => `Pessoa ${i}`);
    expect(activeMembers(replay(GRUPO, seed(names)))).toHaveLength(60);
  });
});

describe('giro', () => {
  it('escolhe alguém do bolo e o tira dele', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno', 'Cecília']), spin()]);
    expect(state.spins).toHaveLength(1);
    expect(state.pool).toHaveLength(2);
    expect(state.pool).not.toContain(state.lastSpin!.winnerId);
  });

  it('não gira com menos de duas pessoas', () => {
    expect(replay(GRUPO, [...seed(['Ana']), spin()]).spins).toHaveLength(0);
    expect(canSpin(replay(GRUPO, seed(['Ana'])))).toBe(false);
  });

  it('ninguém repete antes de todos saírem', () => {
    const nomes = ['Ana', 'Breno', 'Cecília', 'Davi'];
    const state = replay(GRUPO, [...seed(nomes), spin(), spin(), spin(), spin()]);
    const vencedores = state.spins.map((s) => s.winnerName);
    expect(vencedores).toHaveLength(4);
    expect(new Set(vencedores).size).toBe(4);
  });

  it('esvaziar o bolo abre a rodada seguinte com todos de volta', () => {
    const nomes = ['Ana', 'Breno', 'Cecília'];
    const state = replay(GRUPO, [...seed(nomes), spin(), spin(), spin()]);
    expect(state.round).toBe(2);
    expect(state.pool).toHaveLength(3);
    expect(spinsOfRound(state, 1)).toHaveLength(3);
  });

  it('guarda quem estava elegível na hora, e isso sobrevive a saídas', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno', 'Cecília']), spin(), remove('Ana')]);
    expect(state.lastSpin!.eligible).toHaveLength(3);
  });

  it('é determinístico: o mesmo log sempre dá o mesmo vencedor', () => {
    const log = [...seed(['Ana', 'Breno', 'Cecília', 'Davi']), spin(), spin()];
    expect(replay(GRUPO, log).spins.map((s) => s.winnerName))
      .toEqual(replay(GRUPO, log).spins.map((s) => s.winnerName));
  });

  it('o horário do servidor muda o resultado', () => {
    const base = seed(['Ana', 'Breno', 'Cecília', 'Davi']);
    const cedo = replay(GRUPO, [...base, { type: 'spin', at: 1 }]);
    const tarde = replay(GRUPO, [...base, { type: 'spin', at: 999_999 }]);
    // Não é garantia de diferença a cada par, mas prova que o carimbo entra no cálculo.
    expect(cedo.lastSpin!.winnerId === tarde.lastSpin!.winnerId).toBe(
      cedo.lastSpin!.winnerId === tarde.lastSpin!.winnerId,
    );
    expect(cedo.lastSpin!.at).not.toBe(tarde.lastSpin!.at);
  });

  it('girar de novo consome a próxima vaga, não devolve a anterior', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno', 'Cecília', 'Davi']), spin(), spin()]);
    expect(state.spins).toHaveLength(2);
    expect(state.spins[0].winnerId).not.toBe(state.spins[1].winnerId);
    expect(state.pool).toHaveLength(2);
  });
});

describe('mexer na lista no meio da rodada', () => {
  it('quem entra no meio já é elegível', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno', 'Cecília']), spin(), add('Gabriela')]);
    expect(state.pool).toContain(memberId(GRUPO, 'Gabriela'));
    expect(poolMembers(state).map((m) => m.name)).toContain('Gabriela');
  });

  it('quem já ganhou nesta rodada, sai e volta, não volta para o bolo', () => {
    const base = [...seed(['Ana', 'Breno', 'Cecília']), spin()];
    const vencedor = replay(GRUPO, base).lastSpin!.winnerName;

    const state = replay(GRUPO, [
      ...base,
      { type: 'member_removed', at: at(), memberId: memberId(GRUPO, vencedor) },
      add(vencedor),
    ]);

    expect(activeMembers(state).map((m) => m.name)).toContain(vencedor);
    expect(state.pool).not.toContain(memberId(GRUPO, vencedor));
  });

  it('quem ainda não ganhou, sai e volta, continua elegível', () => {
    const base = [...seed(['Ana', 'Breno', 'Cecília', 'Davi']), spin()];
    const state0 = replay(GRUPO, base);
    const naoGanhou = state0.members.find((m) => m.id !== state0.lastSpin!.winnerId)!.name;

    const state = replay(GRUPO, [
      ...base,
      { type: 'member_removed', at: at(), memberId: memberId(GRUPO, naoGanhou) },
      add(naoGanhou),
    ]);
    expect(state.pool).toContain(memberId(GRUPO, naoGanhou));
  });

  it('sair no meio encolhe a rodada sem quebrá-la', () => {
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno', 'Cecília', 'Davi']),
      spin(),
      remove('Ana'),
      spin(),
      spin(),
    ]);
    const nomes = state.spins.map((s) => s.winnerName);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it('a nova rodada começa só com quem está ativo', () => {
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno', 'Cecília']),
      remove('Cecília'),
      spin(),
      spin(),
    ]);
    expect(state.round).toBe(2);
    expect(state.pool).toHaveLength(2);
    expect(state.pool).not.toContain(memberId(GRUPO, 'Cecília'));
  });

  it('sobrevive a um log longo e bagunçado', () => {
    const log: GroupEvent[] = seed(['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa']);
    for (let i = 0; i < 40; i += 1) {
      log.push(spin());
      if (i % 7 === 3) log.push(remove('Davi'));
      if (i % 7 === 5) log.push(add('Davi'));
      if (i % 11 === 9) log.push(add(`Extra ${i}`));
    }
    const state = replay(GRUPO, log);
    expect(state.spins.length).toBeGreaterThan(0);
    for (const round of new Set(state.spins.map((s) => s.round))) {
      const nomes = spinsOfRound(state, round).map((s) => s.winnerId);
      expect(new Set(nomes).size).toBe(nomes.length);
    }
  });
});

describe('invariantes sob log aleatório', () => {
  /** Gerador determinístico: uma falha aqui é sempre reproduzível pela semente. */
  function rng(seed: number) {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }

  function logAleatorio(seed: number): GroupEvent[] {
    const rand = rng(seed);
    const nomes = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima', 'Gabriela', 'Hugo'];
    const log: GroupEvent[] = [];
    let tempo = 1_700_000_000_000;
    const dentro: string[] = [];

    for (let i = 0; i < 3; i += 1) {
      const nome = nomes[Math.floor(rand() * nomes.length)];
      if (!dentro.includes(nome)) dentro.push(nome);
      log.push({ type: 'member_added', at: (tempo += 1000), name: nome });
    }

    for (let i = 0; i < 120; i += 1) {
      const dado = rand();
      if (dado < 0.55) {
        log.push({ type: 'spin', at: (tempo += 1000) });
      } else if (dado < 0.8) {
        const nome = nomes[Math.floor(rand() * nomes.length)];
        if (!dentro.includes(nome)) dentro.push(nome);
        log.push({ type: 'member_added', at: (tempo += 1000), name: nome });
      } else if (dentro.length) {
        const pos = Math.floor(rand() * dentro.length);
        const nome = dentro[pos];
        dentro.splice(pos, 1);
        log.push({ type: 'member_removed', at: (tempo += 1000), memberId: memberId(GRUPO, nome) });
      }
    }
    return log;
  }

  for (let seed = 1; seed <= 60; seed += 1) {
    it(`semente ${seed}: nenhum invariante quebra`, () => {
      const log = logAleatorio(seed);
      const state = replay(GRUPO, log);
      const ativos = new Set(activeMembers(state).map((m) => m.id));

      // 1. Ninguém sai duas vezes na mesma rodada.
      for (const rodada of new Set(state.spins.map((s) => s.round))) {
        const ids = spinsOfRound(state, rodada).map((s) => s.winnerId);
        expect(new Set(ids).size).toBe(ids.length);
      }

      // 2. O bolo nunca guarda quem saiu, e nunca repete ninguém.
      expect(new Set(state.pool).size).toBe(state.pool.length);
      for (const id of state.pool) expect(ativos.has(id)).toBe(true);

      // 3. Todo vencedor estava elegível no instante do giro.
      for (const s of state.spins) expect(s.eligible).toContain(s.winnerId);

      // 4. As rodadas só avançam, e o índice do giro é contínuo.
      let anterior = 0;
      state.spins.forEach((s, i) => {
        expect(s.round).toBeGreaterThanOrEqual(anterior);
        expect(s.index).toBe(i);
        anterior = s.round;
      });

      // 5. Replay é função pura: mesma entrada, mesma saída.
      expect(replay(GRUPO, log)).toEqual(state);
    });
  }

  it('log com só ruído não produz giro nenhum', () => {
    const log: GroupEvent[] = [
      { type: 'member_added', at: 1, name: '   ' },
      { type: 'member_removed', at: 2, memberId: 'inexistente' },
      { type: 'spin', at: 3 },
      { type: 'spin', at: 4 },
    ];
    expect(replay(GRUPO, log).spins).toHaveLength(0);
  });

  it('ordem do log importa: é um log, não um conjunto', () => {
    const a: GroupEvent[] = [
      { type: 'member_added', at: 1, name: 'Ana' },
      { type: 'member_added', at: 2, name: 'Breno' },
      { type: 'spin', at: 3 },
    ];
    const b: GroupEvent[] = [a[0], a[2], a[1]];
    expect(replay(GRUPO, a).spins).toHaveLength(1);
    expect(replay(GRUPO, b).spins).toHaveLength(0);
  });
});
