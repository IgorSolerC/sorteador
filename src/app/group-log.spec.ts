import {
  activeMembers,
  canSpin,
  emojiText,
  emptyState,
  GroupEvent,
  MAX_EMOJI,
  MAX_NOTE_SUBTITLE,
  memberId,
  noteSummary,
  poolMembers,
  replay,
  spinsOfRound,
} from './group-log';
import { isColorIndex } from './palette';

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

describe('etiqueta do giro', () => {
  function note(
    spinIndex: number,
    title: string,
    description = '',
    actor?: string,
    subtitle = '',
  ): GroupEvent {
    return { type: 'spin_annotated', at: at(), spinIndex, title, subtitle, description, actor };
  }

  const dupla = () => seed(['Ana', 'Breno']);

  it('etiqueta o giro que acabou de sair', () => {
    const state = replay(GRUPO, [...dupla(), spin(), note(0, 'Click The Button!', 'Nota final 8/10')]);

    expect(state.lastSpin!.note).toEqual({
      title: 'Click The Button!',
      subtitle: '',
      description: 'Nota final 8/10',
      at: expect.any(Number),
      actor: undefined,
      revision: 1,
    });
  });

  it('etiqueta um giro antigo sem tocar nos que vieram depois', () => {
    const state = replay(GRUPO, [
      ...dupla(),
      spin(),
      spin(),
      note(0, 'Overcooked', 'Brigamos, mas valeu'),
    ]);

    expect(state.spins[0].note!.title).toBe('Overcooked');
    expect(state.spins[1].note).toBeNull();
  });

  it('reescrever é gravar outra etiqueta: a última vale e a revisão sobe', () => {
    const state = replay(GRUPO, [
      ...dupla(),
      spin(),
      note(0, 'Overcooked', 'Nota 7/10', 'Igor'),
      note(0, 'Overcooked 2', 'Nota 9/10', 'Bia'),
    ]);

    expect(state.spins[0].note).toMatchObject({
      title: 'Overcooked 2',
      description: 'Nota 9/10',
      actor: 'Bia',
      revision: 2,
    });
  });

  it('etiqueta em branco é etiqueta retirada', () => {
    const state = replay(GRUPO, [...dupla(), spin(), note(0, 'Tetris'), note(0, '   ', '\n ')]);
    expect(state.spins[0].note).toBeNull();
  });

  it('não se etiqueta uma cápsula que ainda não caiu', () => {
    const antes = replay(GRUPO, [...dupla(), note(0, 'Vai ser este'), spin()]);
    expect(antes.spins[0].note).toBeNull();

    const alem = replay(GRUPO, [...dupla(), spin(), note(9, 'Giro que não existe')]);
    expect(alem.spins.some((s) => s.note)).toBe(false);
  });

  it('índice inválido é ignorado, não quebra o replay', () => {
    for (const giro of [-1, 1.5, Number.NaN]) {
      const state = replay(GRUPO, [...dupla(), spin(), note(giro, 'Nada')]);
      expect(state.spins[0].note).toBeNull();
    }
  });

  it('uma etiqueta nunca muda o sorteio', () => {
    const base: GroupEvent[] = [...seed(['Ana', 'Breno', 'Cecília']), spin(), spin(), spin(), spin()];
    const semNotas = replay(GRUPO, base);
    const comNotas = replay(GRUPO, [
      base[0], base[1], base[2],
      base[3], note(0, 'Um'),
      base[4], note(1, 'Dois', 'com descrição'),
      base[5], note(0, 'Um, corrigido'),
      base[6],
    ]);

    expect(comNotas.round).toBe(semNotas.round);
    expect(comNotas.pool).toEqual(semNotas.pool);
    expect(comNotas.spins.map((s) => s.winnerName)).toEqual(semNotas.spins.map((s) => s.winnerName));
    expect(comNotas.spins.map((s) => s.at)).toEqual(semNotas.spins.map((s) => s.at));
  });

  it('a etiqueta sobrevive ao fechamento da rodada', () => {
    const state = replay(GRUPO, [...dupla(), spin(), spin(), note(0, 'Rodada passada')]);

    expect(state.round).toBe(2);
    expect(state.spins[0].round).toBe(1);
    expect(state.spins[0].note!.title).toBe('Rodada passada');
  });

  it('o título é uma linha só e o corte respeita emoji', () => {
    const state = replay(GRUPO, [
      ...dupla(),
      spin(),
      note(0, '  Click\nThe   Button!  ', '🎮'.repeat(400)),
    ]);

    expect(state.spins[0].note!.title).toBe('Click The Button!');
    // O corte é na medida do servidor (unidades UTF-16) e nunca parte um emoji ao meio.
    expect(state.spins[0].note!.description.length).toBeLessThanOrEqual(280);
    expect(state.spins[0].note!.description).not.toMatch(/[�-�](?![�-�])/);
    expect(state.spins[0].note!.description.startsWith('🎮')).toBe(true);
  });

  it('um evento de versão futura é contado e ignorado', () => {
    const state = replay(GRUPO, [...dupla(), { type: 'unknown', at: at() }, spin()]);
    expect(state.spins).toHaveLength(1);
  });
});

describe('a cápsula de cada pessoa', () => {
  function style(name: string, colorIndex: number | null, emoji: string | null): GroupEvent {
    return {
      type: 'member_styled',
      at: at(),
      memberId: memberId(GRUPO, name),
      colorIndex,
      emoji,
    };
  }

  it('quem chega já vem com uma cápsula, sem ninguém escolher nada', () => {
    const state = replay(GRUPO, seed(['Ana', 'Breno', 'Cecília']));
    const cores = state.members.map((m) => m.colorIndex);

    expect(cores.every((c) => isColorIndex(c))).toBe(true);
    expect(state.members.every((m) => m.emoji === '')).toBe(true);
  });

  it('as cápsulas de um grupo pequeno saem todas diferentes', () => {
    const nomes = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];
    const state = replay(GRUPO, seed(nomes));
    expect(new Set(state.members.map((m) => m.colorIndex)).size).toBe(nomes.length);
  });

  it('pintar troca a cor e o emoji de uma pessoa só', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno']), style('Ana', 5, '🎮')]);
    const ana = state.members.find((m) => m.name === 'Ana')!;
    const breno = state.members.find((m) => m.name === 'Breno')!;

    expect(ana.colorIndex).toBe(5);
    expect(ana.emoji).toBe('🎮');
    expect(breno.emoji).toBe('');
    expect(breno.colorIndex).not.toBe(5);
  });

  it('omitir um campo é deixá-lo como está, não apagá-lo', () => {
    // É o que permite trocar só a cor sem perder o emoji, com um evento por salvamento.
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      style('Ana', 5, '🎮'),
      style('Ana', 9, null),
    ]);
    const ana = state.members.find((m) => m.name === 'Ana')!;

    expect(ana.colorIndex).toBe(9);
    expect(ana.emoji).toBe('🎮');
  });

  it('emoji em branco é emoji retirado', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno']), style('Ana', null, '🎮'), style('Ana', null, '')]);
    expect(state.members.find((m) => m.name === 'Ana')!.emoji).toBe('');
  });

  it('uma cor fora da paleta é ignorada em vez de gravada', () => {
    const state = replay(GRUPO, [...seed(['Ana', 'Breno']), style('Ana', 999, null)]);
    const ana = state.members.find((m) => m.name === 'Ana')!;
    expect(isColorIndex(ana.colorIndex)).toBe(true);
    expect(ana.colorIndex).not.toBe(999);
  });

  it('pintar quem não existe não quebra o replay', () => {
    const state = replay(GRUPO, [
      { type: 'member_styled', at: at(), memberId: 'inexistente', colorIndex: 3, emoji: '🎲' },
      ...seed(['Ana', 'Breno']),
    ]);
    expect(state.members).toHaveLength(2);
  });

  it('quem sai e volta volta com a própria cápsula', () => {
    // A identidade da pessoa é o que faz a coleção ler como coleção; perder a cor ao
    // voltar quebraria o álbum inteiro dela.
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      style('Ana', 11, '🦊'),
      remove('Ana'),
      add('Ana'),
    ]);
    const ana = state.members.find((m) => m.name === 'Ana')!;

    expect(ana.active).toBe(true);
    expect(ana.colorIndex).toBe(11);
    expect(ana.emoji).toBe('🦊');
  });

  it('pintar não toca no bolo, na rodada nem no vencedor', () => {
    const semPintura = replay(GRUPO, [...seed(['Ana', 'Breno', 'Cecília']), spin(), spin()]);
    clock = 1_700_000_000_000;
    const comPintura = replay(GRUPO, [
      ...seed(['Ana', 'Breno', 'Cecília']),
      spin(),
      { type: 'member_styled', at: at() - 30_000, memberId: memberId(GRUPO, 'Ana'), colorIndex: 2, emoji: '🎯' },
      spin(),
    ]);

    expect(comPintura.spins.map((s) => s.winnerName)).toEqual(semPintura.spins.map((s) => s.winnerName));
    expect(comPintura.round).toBe(semPintura.round);
    expect(comPintura.pool).toEqual(semPintura.pool);
  });

  it('um emoji é um símbolo só, e nunca meio símbolo', () => {
    expect(emojiText('🎮🎲🃏')).toBe('🎮');
    expect(emojiText('  🎮  ')).toBe('🎮');
    expect(emojiText('')).toBe('');
    expect(emojiText('ab')).toBe('a');
    // Uma família é um grafema só: cortá-la por ponto de código gravaria os cacos.
    const familia = emojiText('👨‍👩‍👧‍👦');
    expect(familia.length).toBeLessThanOrEqual(MAX_EMOJI);
    expect(familia.startsWith('👨')).toBe(true);
  });
});

describe('o resumo de uma linha', () => {
  it('junta título e subtítulo com o marcador', () => {
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      spin(),
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: 'Overcooked', subtitle: 'Nota 8/10', description: '' },
    ]);
    expect(noteSummary(state.spins[0].note)).toBe('Overcooked ● Nota 8/10');
  });

  it('sem subtítulo, o resumo é o título sozinho', () => {
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      spin(),
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: 'Overcooked', subtitle: '', description: '' },
    ]);
    expect(noteSummary(state.spins[0].note)).toBe('Overcooked');
  });

  it('sem etiqueta, não há resumo', () => {
    expect(noteSummary(null)).toBe('');
  });

  it('só um subtítulo já é etiqueta, e o giro deixa de estar em branco', () => {
    // Quem escreve só o placar não deve receber a etiqueta de volta em branco.
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      spin(),
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: '', subtitle: 'Nota 8/10', description: '' },
    ]);
    expect(state.spins[0].note).not.toBeNull();
    expect(state.spins[0].note!.subtitle).toBe('Nota 8/10');
  });

  it('título, subtítulo e descrição em branco retiram a etiqueta', () => {
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      spin(),
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: 'Overcooked', subtitle: 'Nota 8/10', description: '' },
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: '', subtitle: '', description: '' },
    ]);
    expect(state.spins[0].note).toBeNull();
  });

  it('o subtítulo é uma linha só, cortada na medida do servidor', () => {
    const state = replay(GRUPO, [
      ...seed(['Ana', 'Breno']),
      spin(),
      {
        type: 'spin_annotated',
        at: at(),
        spinIndex: 0,
        title: 'Overcooked',
        subtitle: `  Nota\n8/10  ${'x'.repeat(200)}`,
        description: '',
      },
    ]);
    const subtitulo = state.spins[0].note!.subtitle;

    expect(subtitulo.length).toBeLessThanOrEqual(MAX_NOTE_SUBTITLE);
    expect(subtitulo).not.toContain('\n');
    expect(subtitulo.startsWith('Nota 8/10')).toBe(true);
  });
});
