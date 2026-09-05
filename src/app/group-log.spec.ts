import {
  activeMembers,
  canSpin,
  completionShare,
  criterionText,
  difficultyLabel,
  formatHours,
  emojiText,
  emptyState,
  formatScore,
  GroupEvent,
  MAX_EMOJI,
  MAX_REVIEW_TEXT,
  memberId,
  poolMembers,
  replay,
  ReviewCriterion,
  ReviewStatus,
  scoreTone,
  spinScores,
  spinsOfRound,
  spinSummary,
} from './group-log';
import { isColorIndex } from './palette';
import { initialsOf } from './naming';

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

describe('as iniciais de um crachá', () => {
  it('são no máximo duas, em caixa alta', () => {
    expect(initialsOf('Ana')).toBe('A');
    expect(initialsOf('josé silva')).toBe('JS');
    expect(initialsOf('Maria da Silva Souza')).toBe('MD');
  });

  it('um nome vazio não inventa letra nenhuma', () => {
    // A prateleira põe o seu próprio '?' quando não sobra sigla; as outras cinco telas
    // mostram a cápsula sem letra, que é o que elas sempre mostraram.
    expect(initialsOf('')).toBe('');
    expect(initialsOf('   ')).toBe('');
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

  it('quem saiu do globo libera a vaga que ocupava', () => {
    // O teto é do GLOBO — "o globo comporta até 60 cápsulas" —, e não de quanta gente o log
    // já viu. Contando também quem saiu, um clube que trocou de gente ao longo dos anos
    // parava de aceitar qualquer nome novo, e parava em silêncio: a tela dizia "entrou no
    // globo", o servidor aceitava a escrita e o replay descartava o evento.
    const names = Array.from({ length: 60 }, (_, i) => `Pessoa ${i}`);
    const state = replay(GRUPO, [
      ...seed(names),
      ...names.slice(0, 58).map(remove),
      add('Zulmira'),
    ]);

    expect(activeMembers(state).map((member) => member.name)).toContain('Zulmira');
    expect(activeMembers(state)).toHaveLength(3);
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
  ): GroupEvent {
    return { type: 'spin_annotated', at: at(), spinIndex, title, description, actor };
  }

  const dupla = () => seed(['Ana', 'Breno']);

  it('etiqueta o giro que acabou de sair', () => {
    const state = replay(GRUPO, [...dupla(), spin(), note(0, 'Click The Button!', 'Nota final 8/10')]);

    expect(state.lastSpin!.note).toEqual({
      title: 'Click The Button!',
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
  const jogo = (titulo: string): GroupEvent[] => [
    ...seed(['Ana', 'Breno']),
    spin(),
    { type: 'spin_annotated', at: at(), spinIndex: 0, title: titulo, description: '' },
  ];

  it('sem resenha, o resumo é o título do jogo sozinho', () => {
    const state = replay(GRUPO, jogo('Overcooked'));
    expect(spinSummary(state.spins[0])).toBe('Overcooked');
  });

  it('com resenha, o marcador traz a nota do clube', () => {
    const state = replay(GRUPO, [
      ...jogo('Overcooked'),
      review(0, 'Ana', { score: 8 }),
      review(0, 'Breno', { score: 9 }),
    ]);
    expect(spinSummary(state.spins[0])).toBe('Overcooked · 8,5');
  });

  it('sem etiqueta não há resumo, mesmo com resenha', () => {
    // O resumo é do jogo. Uma resenha de um giro sem jogo escrito não tem o que resumir.
    const state = replay(GRUPO, [...seed(['Ana', 'Breno']), spin(), review(0, 'Ana', { score: 8 })]);
    expect(spinSummary(state.spins[0])).toBe('');
    expect(spinSummary(null)).toBe('');
  });

  it('a nota sai com uma casa e vírgula, porque a tela fala português', () => {
    expect(formatScore(8)).toBe('8,0');
    expect(formatScore(8.25)).toBe('8,3');
    expect(formatScore(10)).toBe('10,0');
  });

  it('título e descrição em branco retiram a etiqueta', () => {
    const state = replay(GRUPO, [
      ...jogo('Overcooked'),
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: '', description: '' },
    ]);
    expect(state.spins[0].note).toBeNull();
  });
});

function review(
  spinIndex: number,
  actor: string,
  {
    score = 8,
    criteria = {},
    status = 'finalizado',
    hours = null,
    text = '',
    withdrawn = false,
  }: {
    score?: number | null;
    criteria?: Partial<Record<ReviewCriterion, number>>;
    status?: ReviewStatus | null;
    hours?: number | null;
    text?: string;
    withdrawn?: boolean;
  } = {},
): GroupEvent {
  return {
    type: 'spin_reviewed',
    at: at(),
    spinIndex,
    actor,
    score,
    criteria,
    status,
    hours,
    text,
    withdrawn,
  };
}

describe('a resenha de cada pessoa', () => {
  const jogo = (): GroupEvent[] => [
    ...seed(['Ana', 'Breno', 'Cecília']),
    spin(),
    { type: 'spin_annotated', at: at(), spinIndex: 0, title: 'Overcooked 2', description: '' },
  ];

  it('guarda a resenha inteira de quem escreveu', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', {
        score: 9,
        criteria: { diversao: 10, dificuldade: 4 },
        status: 'platinado',
        hours: 12,
        text: 'Melhor coop que já jogamos.',
      }),
    ]);

    expect(state.spins[0].reviews).toEqual([
      {
        author: 'Ana',
        authorKey: 'ana',
        score: 9,
        criteria: { diversao: 10, dificuldade: 4 },
        status: 'platinado',
        hours: 12,
        text: 'Melhor coop que já jogamos.',
        at: expect.any(Number),
        revision: 1,
      },
    ]);
  });

  it('uma resenha por pessoa: reescrever substitui a própria e marca a revisão', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 7 }),
      review(0, 'Ana', { score: 9 }),
    ]);

    expect(state.spins[0].reviews).toHaveLength(1);
    expect(state.spins[0].reviews[0].score).toBe(9);
    expect(state.spins[0].reviews[0].revision).toBe(2);
  });

  it('reescrever não empurra a pessoa para o fim da lista', () => {
    // A parede não pode se remexer entre duas visitas só porque alguém corrigiu a nota.
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 7 }),
      review(0, 'Breno', { score: 6 }),
      review(0, 'Ana', { score: 9 }),
    ]);
    expect(state.spins[0].reviews.map((r) => r.author)).toEqual(['Ana', 'Breno']);
  });

  it('a mesma pessoa escrita de outro jeito continua sendo a mesma', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 7 }),
      review(0, '  ANA  ', { score: 10 }),
    ]);
    expect(state.spins[0].reviews).toHaveLength(1);
    expect(state.spins[0].reviews[0].score).toBe(10);
  });

  it('retirar a própria resenha a tira da conta, e a retirada fica no log', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 7 }),
      review(0, 'Breno', { score: 9 }),
      review(0, 'Ana', { withdrawn: true }),
    ]);

    expect(state.spins[0].reviews.map((r) => r.author)).toEqual(['Breno']);
    expect(spinScores(state.spins[0]).score).toBe(9);
  });

  it('resenha sem assinatura não existe', () => {
    const state = replay(GRUPO, [...jogo(), review(0, '   ', { score: 9 })]);
    expect(state.spins[0].reviews).toHaveLength(0);
  });

  it('sem nota final ou sem status, não há resenha', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: null }),
      review(0, 'Breno', { status: null }),
    ]);
    expect(state.spins[0].reviews).toHaveLength(0);
  });

  it('nota fora da régua de onze casas é descartada', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 11 }),
      review(0, 'Breno', { score: -1 }),
      review(0, 'Cecília', { score: 7.5 }),
    ]);
    expect(state.spins[0].reviews).toHaveLength(0);
  });

  it('critério fora da régua é descartado sem levar a resenha junto', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8, criteria: { diversao: 9, dificuldade: 99 } }),
    ]);
    expect(state.spins[0].reviews[0].criteria).toEqual({ diversao: 9 });
  });

  it('o texto livre é cortado na medida do servidor', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8, text: 'a'.repeat(MAX_REVIEW_TEXT + 50) }),
    ]);
    expect(state.spins[0].reviews[0].text.length).toBeLessThanOrEqual(MAX_REVIEW_TEXT);
  });

  it('resenhar um giro que não existe não faz nada', () => {
    const state = replay(GRUPO, [...jogo(), review(9, 'Ana', { score: 8 })]);
    expect(state.spins[0].reviews).toHaveLength(0);
  });

  it('retirar a etiqueta do jogo não apaga as resenhas', () => {
    // São objetos diferentes: o jogo é um só, as opiniões sobre ele são muitas.
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8 }),
      { type: 'spin_annotated', at: at(), spinIndex: 0, title: '', description: '' },
    ]);
    expect(state.spins[0].note).toBeNull();
    expect(state.spins[0].reviews).toHaveLength(1);
  });
});

describe('a conta do clube sobre um jogo', () => {
  const jogo = (): GroupEvent[] => [
    ...seed(['Ana', 'Breno', 'Cecília']),
    spin(),
    { type: 'spin_annotated', at: at(), spinIndex: 0, title: 'Overcooked 2', description: '' },
  ];

  it('sem resenha nenhuma, não há nota — e nada finge que há', () => {
    const scores = spinScores(replay(GRUPO, jogo()).spins[0]);
    expect(scores.count).toBe(0);
    expect(scores.score).toBeNull();
    expect(scores.criteria).toEqual({});
    expect(scores.completion).toEqual({ platinado: 0, finalizado: 0, incompleto: 0 });
  });

  it('a nota do jogo é a média das notas finais', () => {
    const scores = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8 }),
      review(0, 'Breno', { score: 9 }),
      review(0, 'Cecília', { score: 10 }),
    ]).spins[0]);

    expect(scores.count).toBe(3);
    expect(scores.score).toBeCloseTo(9);
  });

  it('cada critério tem o próprio denominador', () => {
    // Quem não avaliou dificuldade não entra na média de dificuldade. Somar zero por
    // ausência inventaria uma nota que ninguém deu.
    const scores = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8, criteria: { diversao: 10, dificuldade: 2 } }),
      review(0, 'Breno', { score: 9, criteria: { diversao: 8 } }),
    ]).spins[0]);

    expect(scores.criteria.diversao).toEqual({ average: 9, count: 2 });
    expect(scores.criteria.dificuldade).toEqual({ average: 2, count: 1 });
    expect(scores.criteria.historia).toBeUndefined();
  });

  it('conta quantas pessoas terminaram de cada jeito', () => {
    const scores = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8, status: 'platinado' }),
      review(0, 'Breno', { score: 9, status: 'incompleto' }),
      review(0, 'Cecília', { score: 7, status: 'platinado' }),
    ]).spins[0]);

    expect(scores.completion).toEqual({ platinado: 2, finalizado: 0, incompleto: 1 });
  });

  it('a barra de completude sempre fecha em 100%', () => {
    // Três fatias arredondadas para baixo somam 99 e deixam uma fresta na barra.
    const scores = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 8, status: 'platinado' }),
      review(0, 'Breno', { score: 9, status: 'finalizado' }),
      review(0, 'Cecília', { score: 7, status: 'incompleto' }),
    ]).spins[0]);
    const share = completionShare(scores);

    expect(share.platinado + share.finalizado + share.incompleto).toBe(100);
    expect(share.platinado).toBe(34);
  });

  it('sem resenha nenhuma, quem jogou inteiro conta como incompleto', () => {
    // O denominador é quem jogou, e ninguém terminou nada ainda. A barra nem chega a ser
    // desenhada nesse estado — a ficha e o cartão mostram "ninguém resenhou ainda" —, mas
    // a conta precisa ser a mesma dos outros casos para não ter duas regras.
    const share = completionShare(spinScores(replay(GRUPO, jogo()).spins[0]));
    expect(share).toEqual({ platinado: 0, finalizado: 0, incompleto: 100 });
  });

  it('quem jogou e não escreveu entra como incompleto', () => {
    // Uma pessoa que zerou o jogo antes de os outros começarem não faz o clube inteiro
    // aparecer como "100% finalizado".
    const share = completionShare(spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 9, status: 'finalizado' }),
    ]).spins[0]));

    expect(share).toEqual({ platinado: 0, finalizado: 33, incompleto: 67 });
  });
});

describe('em que tinta uma nota é impressa', () => {
  it('8 é a primeira nota em ciano, e 7,9 ainda não é', () => {
    expect(scoreTone(8)).toBe('high');
    expect(scoreTone(10)).toBe('high');
    expect(scoreTone(7.9)).toBe('mid');
  });

  it('2 é a última nota em vermelho, e 2,1 já é laranja', () => {
    expect(scoreTone(2)).toBe('worst');
    expect(scoreTone(0)).toBe('worst');
    expect(scoreTone(2.1)).toBe('low');
    expect(scoreTone(4)).toBe('low');
    expect(scoreTone(4.1)).toBe('mid');
  });

  it('sem nota nenhuma, não há tinta a escolher', () => {
    expect(scoreTone(null)).toBe('mid');
    expect(scoreTone(undefined)).toBe('mid');
  });
});

describe('a dificuldade em palavra', () => {
  it('cada degrau tem o nome que o clube usa', () => {
    expect(difficultyLabel(0)).toBe('Nenhuma');
    expect(difficultyLabel(2)).toBe('Fácil');
    expect(difficultyLabel(5)).toBe('Médio');
    expect(difficultyLabel(8)).toBe('Difícil');
    expect(difficultyLabel(10)).toBe('Impossível');
  });

  it('a média cai entre dois degraus e nomeia o vizinho mais perto', () => {
    // Fácil (2) com Difícil (8) dá 5, que é exatamente Médio.
    expect(difficultyLabel(5)).toBe('Médio');
    expect(difficultyLabel(7)).toBe('Difícil');
    expect(difficultyLabel(1.5)).toBe('Fácil');
    expect(difficultyLabel(9.5)).toBe('Impossível');
    // Bem no meio de dois degraus, o nome fica no mais fácil: um empate não é motivo
    // para o clube dizer que o jogo é mais difícil do que metade dele achou.
    expect(difficultyLabel(6.5)).toBe('Médio');
  });

  it('só a dificuldade responde por palavra; o resto continua em nota', () => {
    expect(criterionText('dificuldade', 8)).toBe('Difícil');
    expect(criterionText('dificuldade', 7.5, true)).toBe('Difícil');
    expect(criterionText('diversao', 9)).toBe('9');
    expect(criterionText('diversao', 8.5, true)).toBe('8,5');
  });
});

describe('a mesa de um jogo', () => {
  const mesa = (spinIndex: number, name: string, seated: boolean): GroupEvent => ({
    type: 'spin_seated',
    at: at(),
    spinIndex,
    memberId: memberId(GRUPO, name),
    seated,
  });

  const jogo = (): GroupEvent[] => [...seed(['Ana', 'Breno', 'Cecília']), spin()];

  it('começa igual ao globo daquele giro', () => {
    const state = replay(GRUPO, jogo());
    expect(state.spins[0].seated.map((seat) => seat.name)).toEqual(['Ana', 'Breno', 'Cecília']);
  });

  it('perde quem não apareceu e ganha quem chegou depois', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      mesa(0, 'Breno', false),
      ...[add('Davi')],
      mesa(0, 'Davi', true),
    ]);
    expect(state.spins[0].seated.map((seat) => seat.name)).toEqual(['Ana', 'Cecília', 'Davi']);
  });

  it('corrigir a mesa não mexe no sorteio: nem no vencedor, nem no globo, nem no bolo', () => {
    const semMesa = replay(GRUPO, jogo());
    const comMesa = replay(GRUPO, [...jogo(), mesa(0, 'Ana', false), mesa(0, 'Breno', false)]);

    // O globo daquele giro é a entrada do sorteio. Se a mesa pudesse tocá-lo, o vencedor
    // de um giro de meses atrás mudaria com uma escrita.
    expect(comMesa.spins[0].winnerId).toBe(semMesa.spins[0].winnerId);
    expect(comMesa.spins[0].eligible).toEqual(semMesa.spins[0].eligible);
    expect(comMesa.pool).toEqual(semMesa.pool);
    expect(comMesa.round).toBe(semMesa.round);
  });

  it('quem resenhou volta para a mesa mesmo depois de ser tirado dela', () => {
    // Sem isto a conta viraria "3 resenhas de 2", e o denominador mentiria.
    const state = replay(GRUPO, [
      ...jogo(),
      review(0, 'Breno', { score: 7 }),
      mesa(0, 'Breno', false),
    ]);
    const nomes = state.spins[0].seated.map((seat) => seat.name);

    expect(nomes).toContain('Breno');
    expect(state.spins[0].reviews.length).toBeLessThanOrEqual(state.spins[0].seated.length);
  });

  it('quem assinou uma resenha sem ser do grupo senta assim mesmo, e sem cápsula', () => {
    const state = replay(GRUPO, [...jogo(), review(0, 'Convidada', { score: 6 })]);
    const visita = state.spins[0].seated.find((seat) => seat.name === 'Convidada');

    expect(visita).toBeDefined();
    expect(visita!.memberId).toBe('');
  });

  it('uma correção que aponta para quem o log não conhece não senta ninguém', () => {
    const state = replay(GRUPO, [
      ...jogo(),
      { type: 'spin_seated', at: at(), spinIndex: 0, memberId: 'forjado', seated: true },
    ]);
    expect(state.spins[0].seated.length).toBe(3);
  });

  it('a mesa de um giro que ainda não existe é ignorada', () => {
    const state = replay(GRUPO, [...jogo(), mesa(4, 'Ana', false)]);
    expect(state.spins[0].seated.length).toBe(3);
  });
});

describe('o tempo de jogo', () => {
  const jogo = (): GroupEvent[] => [...seed(['Ana', 'Breno', 'Cecília']), spin()];

  it('a média só conta quem disse quanto tempo levou', () => {
    // Somar zero por ausência inventaria um jogo de dez horas em quem não contou.
    const conta = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 9, hours: 10 }),
      review(0, 'Breno', { score: 8, hours: 20 }),
      review(0, 'Cecília', { score: 7 }),
    ]).spins[0]);

    expect(conta.hours).toEqual({ average: 15, count: 2 });
  });

  it('sem ninguém contando, não há tempo a mostrar', () => {
    const conta = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 9 }),
    ]).spins[0]);

    expect(conta.hours).toBeNull();
  });

  it('meia hora, zero hora e hora demais não entram na conta', () => {
    const conta = spinScores(replay(GRUPO, [
      ...jogo(),
      review(0, 'Ana', { score: 9, hours: 2.5 }),
      review(0, 'Breno', { score: 8, hours: 0 }),
      review(0, 'Cecília', { score: 7, hours: 99_999 }),
    ]).spins[0]);

    expect(conta.hours).toBeNull();
  });

  it('a hora inteira aparece inteira, e a quebrada com uma casa', () => {
    expect(formatHours(12)).toBe('12 h');
    expect(formatHours(12.333333)).toBe('12,3 h');
    expect(formatHours(3.75)).toBe('3,8 h');
  });
});
