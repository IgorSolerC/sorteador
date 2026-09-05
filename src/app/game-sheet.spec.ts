import { TestBed } from '@angular/core/testing';

import {
  GroupMember,
  ReviewCriterion,
  ReviewStatus,
  SpinRecord,
  SpinReview,
  SpinSeat,
} from './group-log';
import { GameSheet } from './game-sheet';
import { SheetFace } from './game-bench';

/**
 * A ficha é só papel: ela não fala com o servidor. O que se prova aqui é que a face de
 * leitura mostra a conta certa, que a régua abre no que já está gravado, e que o rascunho
 * chega inteiro em quem vai gravá-lo.
 */

function review(overrides: Partial<SpinReview> = {}): SpinReview {
  return {
    author: 'Ana',
    authorKey: 'ana',
    score: 8,
    criteria: {},
    status: 'finalizado',
    hours: null,
    text: '',
    at: Date.parse('2026-08-02T19:30:00Z'),
    revision: 1,
    ...overrides,
  };
}

function spinRecord(overrides: Partial<SpinRecord> = {}): SpinRecord {
  return {
    index: 0,
    round: 1,
    at: Date.parse('2026-08-02T19:30:00Z'),
    eligible: ['a', 'b'],
    winnerId: 'a',
    winnerName: 'Gustavo',
    note: null,
    reviews: [],
    seated: [],
    ...overrides,
  };
}

function seat(name: string, memberId = name.toLowerCase()): SpinSeat {
  return { key: name.toLowerCase(), name, memberId };
}

function member(name: string): GroupMember {
  return {
    id: name.toLowerCase(),
    name,
    active: true,
    joinedAt: Date.parse('2026-01-01T00:00:00Z'),
    leftAt: null,
    colorIndex: 0,
    emoji: '',
  };
}

async function render(
  spin: SpinRecord,
  face: SheetFace = 'ficha',
  author = 'Ana',
  members: readonly GroupMember[] = [],
) {
  await TestBed.configureTestingModule({ imports: [GameSheet] }).compileComponents();
  const fixture = TestBed.createComponent(GameSheet);
  fixture.componentRef.setInput('spin', spin);
  fixture.componentRef.setInput('face', face);
  fixture.componentRef.setInput('author', author);
  fixture.componentRef.setInput('members', members);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

const el = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

/** O ngModel propaga em microtask; sem esperar, o desenho seguinte reescreve o campo. */
async function digitar(
  fixture: Awaited<ReturnType<typeof render>>,
  id: string,
  texto: string,
): Promise<void> {
  const campo = el(fixture).querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement;
  campo.value = texto;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Marca uma casa da régua como um dedo marca: o clique no rótulo, não no input escondido. */
function marcar(fixture: Awaited<ReturnType<typeof render>>, grupo: string, valor: number): void {
  const ticks = [...el(fixture).querySelectorAll<HTMLInputElement>(`input[name="${grupo}"]`)];
  const alvo = ticks.find((input) => input.id === `nota-final-${valor}`)
    ?? ticks[valor + (grupo === 'notaFinal' ? 0 : 1)];
  alvo.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
}

describe('a ficha do jogo', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('abre para ler: o jogo, a nota do clube e as resenhas', async () => {
    const fixture = await render(spinRecord({
      note: { title: 'Overcooked 2', description: 'Cooperativo de cozinha.', at: Date.now(), revision: 1 },
      reviews: [
        review({ author: 'Ana', authorKey: 'ana', score: 10, status: 'platinado' }),
        review({ author: 'Breno', authorKey: 'breno', score: 9, text: 'Grito muito.' }),
      ],
    }));
    const texto = el(fixture).textContent ?? '';

    expect(texto).toContain('Overcooked 2');
    expect(texto).toContain('9,5');
    expect(texto).toContain('2 resenhas');
    expect(texto).toContain('Grito muito.');
    // Ler é o padrão: nenhum campo de formulário na primeira face.
    expect(el(fixture).querySelector('#note-title')).toBeNull();
    expect(el(fixture).querySelector('input[name="notaFinal"]')).toBeNull();
    fixture.destroy();
  });

  it('as duas ações de escrita são distintas e nomeadas', async () => {
    const fixture = await render(spinRecord());
    const acoes = [...el(fixture).querySelectorAll('.sheet-actions button')]
      .map((botao) => botao.textContent?.trim());

    // A mesa vem junto, mas em terceiro e como nota de rodapé: ela corrige o elenco de um
    // jogo antigo, e não pode disputar espaço com as duas decisões de escrita.
    expect(acoes.slice(0, 2)).toEqual(['Escrever minha resenha', 'Escrever o jogo']);
    expect(acoes[2]).toContain('A mesa');
    expect(el(fixture).querySelector('.sheet-actions .sheet-aside')).not.toBeNull();
    fixture.destroy();
  });

  it('quem já resenhou vê "editar", e a resenha dela vem marcada', async () => {
    const fixture = await render(spinRecord({
      reviews: [review({ author: 'Ana', authorKey: 'ana' })],
    }));

    expect(el(fixture).querySelector('.sheet-actions button')?.textContent)
      .toContain('Editar minha resenha');
    expect(el(fixture).querySelector('.review.is-mine')).not.toBeNull();
    fixture.destroy();
  });

  it('a resenha de outra pessoa não é marcada como minha', async () => {
    const fixture = await render(spinRecord({
      reviews: [review({ author: 'Breno', authorKey: 'breno' })],
    }), 'ficha', 'Ana');

    expect(el(fixture).querySelector('.review.is-mine')).toBeNull();
    expect(el(fixture).querySelector('.sheet-actions button')?.textContent)
      .toContain('Escrever minha resenha');
    fixture.destroy();
  });

  it('sem resenha nenhuma, a ficha diz isso em vez de mostrar um zero', async () => {
    const fixture = await render(spinRecord({
      note: { title: 'Pico Park', description: '', at: Date.now(), revision: 1 },
    }));

    expect(el(fixture).querySelector('.score-empty')).not.toBeNull();
    expect(el(fixture).querySelector('.score-hero')).toBeNull();
    fixture.destroy();
  });

  it('a média de um critério só conta quem o avaliou', async () => {
    const fixture = await render(spinRecord({
      reviews: [
        review({ authorKey: 'ana', score: 8, criteria: { diversao: 10, historia: 2 } }),
        review({ author: 'Breno', authorKey: 'breno', score: 6, criteria: { diversao: 8 } }),
      ],
    }));
    const linhas = [...el(fixture).querySelectorAll('.score-rules > div')]
      .map((linha) => linha.textContent?.replace(/\s+/g, ' ').trim());

    expect(linhas[0]).toContain('Diversão');
    expect(linhas[0]).toContain('9,0');
    expect(linhas[0]).toContain('2 votos');
    expect(linhas[1]).toContain('2,0');
    expect(linhas[1]).toContain('1 voto');
    fixture.destroy();
  });

  it('a barra de completude nomeia cada fatia, sem depender da cor', async () => {
    const fixture = await render(spinRecord({
      reviews: [
        review({ authorKey: 'ana', status: 'platinado' }),
        review({ authorKey: 'breno', status: 'incompleto' }),
      ],
    }));
    const legenda = el(fixture).querySelector('.completion-legend')?.textContent ?? '';

    expect(legenda).toContain('Platinado');
    expect(legenda).toContain('50%');
    expect(legenda).toContain('Incompleto');
    fixture.destroy();
  });
});

describe('minha resenha', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('a régua tem onze casas, e os critérios ganham a casa do "não avaliei"', async () => {
    const fixture = await render(spinRecord(), 'resenha');

    expect(el(fixture).querySelectorAll('input[name="notaFinal"]').length).toBe(11);
    expect(el(fixture).querySelectorAll('input[name="diversao"]').length).toBe(12);
    fixture.destroy();
  });

  it('abre no que já está gravado, e não em branco', async () => {
    const fixture = await render(spinRecord({
      reviews: [review({
        authorKey: 'ana',
        score: 9,
        criteria: { diversao: 7 } as Partial<Record<ReviewCriterion, number>>,
        status: 'platinado' as ReviewStatus,
        text: 'Melhor coop.',
      })],
    }), 'resenha');

    expect(el(fixture).querySelector('#nota-final-9')).toHaveProperty('checked', true);
    expect((el(fixture).querySelector('#review-text') as HTMLTextAreaElement).value)
      .toBe('Melhor coop.');
    expect(el(fixture).querySelector('.status-choice.is-platinado')?.classList)
      .toContain('is-on');
    expect(el(fixture).querySelector('.note-remove')).not.toBeNull();
    fixture.destroy();
  });

  it('sem resenha minha, não há o que retirar', async () => {
    const fixture = await render(spinRecord(), 'resenha');
    expect(el(fixture).querySelector('.note-remove')).toBeNull();
    fixture.destroy();
  });

  it('entrega o rascunho inteiro a quem vai gravar', async () => {
    const fixture = await render(spinRecord(), 'resenha');
    let entregue: unknown = null;
    fixture.componentInstance.commitReview.subscribe((valor) => (entregue = valor));

    marcar(fixture, 'notaFinal', 8);
    (el(fixture).querySelectorAll<HTMLInputElement>('input[name="completude"]')[0])
      .dispatchEvent(new Event('change', { bubbles: true }));
    marcar(fixture, 'diversao', 10);
    await digitar(fixture, 'review-hours', '12');
    await digitar(fixture, 'review-text', 'Jogamos em cinco.');
    (el(fixture).querySelector('.note-actions button') as HTMLButtonElement).click();

    expect(entregue).toEqual({
      score: 8,
      criteria: { diversao: 10 },
      status: 'platinado',
      hours: 12,
      text: 'Jogamos em cinco.',
    });
    fixture.destroy();
  });

  it('"não avaliei" apaga o critério em vez de gravar zero', async () => {
    // Zero é uma nota, e uma nota que ninguém deu não pode entrar na média do critério.
    const fixture = await render(spinRecord({
      reviews: [review({ authorKey: 'ana', criteria: { diversao: 6 } })],
    }), 'resenha');
    let entregue: { criteria: Record<string, number> } | null = null;
    fixture.componentInstance.commitReview.subscribe((valor) => (entregue = valor as never));

    const ticks = el(fixture).querySelectorAll<HTMLInputElement>('input[name="diversao"]');
    ticks[0].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    (el(fixture).querySelector('.note-actions button') as HTMLButtonElement).click();

    expect(entregue!.criteria).toEqual({});
    fixture.destroy();
  });

  it('uma recarga do grupo não apaga o que a pessoa está escrevendo', async () => {
    // A máquina recarrega sozinha quando a aba volta a ficar visível, e cada recarga
    // reconstrói os giros do zero — objeto novo, mesmo giro. Reencher os rascunhos ali
    // apagava a resenha meio escrita de quem só tinha ido conferir o nome do jogo.
    const fixture = await render(spinRecord(), 'resenha');

    marcar(fixture, 'notaFinal', 8);
    await digitar(fixture, 'review-text', 'Jogamos em cinco.');

    fixture.componentRef.setInput('spin', spinRecord());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((el(fixture).querySelector('#review-text') as HTMLTextAreaElement).value)
      .toBe('Jogamos em cinco.');
    expect(el(fixture).querySelector('#nota-final-8')).toHaveProperty('checked', true);
    fixture.destroy();
  });

  it('trocar de cápsula, porém, larga o rascunho da anterior', async () => {
    const fixture = await render(spinRecord(), 'resenha');

    marcar(fixture, 'notaFinal', 8);
    await digitar(fixture, 'review-text', 'Jogamos em cinco.');

    fixture.componentRef.setInput('spin', spinRecord({ index: 1 }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((el(fixture).querySelector('#review-text') as HTMLTextAreaElement).value).toBe('');
    expect(el(fixture).querySelector('#nota-final-8')).toHaveProperty('checked', false);
    fixture.destroy();
  });

  it('a gravação só é oferecida quando as duas obrigatórias estão respondidas', async () => {
    const fixture = await render(spinRecord(), 'resenha');
    const salvar = () => el(fixture).querySelector('.note-actions button') as HTMLButtonElement;

    expect(salvar().disabled).toBe(true);
    marcar(fixture, 'notaFinal', 7);
    expect(salvar().disabled).toBe(true);
    (el(fixture).querySelectorAll<HTMLInputElement>('input[name="completude"]')[1])
      .dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(salvar().disabled).toBe(false);
    fixture.destroy();
  });
});

describe('o jogo', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('a nota média ocupa o lugar do antigo subtítulo, e é somente leitura', async () => {
    const fixture = await render(spinRecord({
      note: { title: 'Tetris', description: '', at: Date.now(), revision: 1 },
      reviews: [review({ authorKey: 'ana', score: 7 }), review({ authorKey: 'breno', score: 8 })],
    }), 'jogo');
    const media = el(fixture).querySelector('.note-average');

    expect(media?.textContent).toContain('7,5');
    expect(media?.textContent).toContain('de 2 resenhas');
    // Nenhum campo editável dentro dela: a média se recebe, não se escreve.
    expect(media?.querySelector('input, textarea')).toBeNull();
    fixture.destroy();
  });

  it('entrega o jogo digitado a quem vai gravar', async () => {
    const fixture = await render(spinRecord(), 'jogo');
    let entregue: unknown = null;
    fixture.componentInstance.commitNote.subscribe((valor) => (entregue = valor));

    await digitar(fixture, 'note-title', 'Lethal Company');
    await digitar(fixture, 'note-description', 'Três noites seguidas.');
    (el(fixture).querySelector('.note-actions button') as HTMLButtonElement).click();

    expect(entregue).toEqual({ title: 'Lethal Company', description: 'Três noites seguidas.' });
    fixture.destroy();
  });
});

describe('as quatro tintas da nota', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('o boletim de um jogo amado sai em ciano e o de um desastre em vermelho', async () => {
    const amado = await render(spinRecord({
      reviews: [review({ authorKey: 'ana', score: 10 }), review({ authorKey: 'breno', score: 9 })],
    }));
    expect(el(amado).querySelector('.score-hero')!.classList.contains('is-high')).toBe(true);
    amado.destroy();

    TestBed.resetTestingModule();
    const largado = await render(spinRecord({
      reviews: [review({ authorKey: 'ana', score: 1 }), review({ authorKey: 'breno', score: 2 })],
    }));
    expect(el(largado).querySelector('.score-hero')!.classList.contains('is-worst')).toBe(true);
    largado.destroy();
  });

  it('a dificuldade é uma marca na régua, e não um filete com tinta', async () => {
    // Um filete ciano ali diria "tirou 8 em dificuldade", e dificuldade não se tira. Ela
    // também é a última da lista: as quatro que são elogio ficam juntas.
    const fixture = await render(spinRecord({
      reviews: [review({ authorKey: 'ana', score: 9, criteria: { diversao: 9, dificuldade: 8 } })],
    }));
    const reguas = [...el(fixture).querySelectorAll('.score-rule')];

    expect(reguas[0].classList.contains('is-high')).toBe(true);
    expect(reguas[1].classList.contains('is-flat')).toBe(true);
    expect(el(fixture).querySelector('.score-rules')!.textContent).toContain('Difícil');
    fixture.destroy();
  });

  it('a dificuldade se responde por palavra, e não por régua de onze casas', async () => {
    const fixture = await render(spinRecord(), 'resenha');
    const regua = el(fixture).querySelector('.score-ticks.is-named')!;
    const degraus = [...regua.querySelectorAll('.score-tick span:not(.visually-hidden)')];

    // Cinco degraus mais a casa do "não avaliei", na mesma fileira das outras réguas.
    expect(regua.querySelectorAll('.score-tick').length).toBe(6);
    expect(degraus.map((d) => d.textContent!.trim()))
      .toEqual(['—', 'Nenhuma', 'Fácil', 'Médio', 'Difícil', 'Impossível']);
    expect(el(fixture).querySelectorAll('input[name="dificuldade"]').length).toBe(6);
    fixture.destroy();
  });

  it('a exigência é da metade do formulário, e não de cada campo', async () => {
    // Cinco selos de "obrigatória"/"opcional" nos rótulos viravam ruído, e em duas posições
    // diferentes. Quem não vê o cabeçalho recebe a exigência por `aria-required`.
    const fixture = await render(spinRecord(), 'resenha');
    const faixas = [...el(fixture).querySelectorAll('.band-title')].map((b) => b.textContent?.trim());
    const exigidos = el(fixture).querySelectorAll('[aria-required="true"]');

    expect(faixas).toEqual(['O que a resenha cobra', 'O resto, se você quiser']);
    expect(exigidos.length).toBe(2);
    expect(el(fixture).querySelector('.sheet-form')!.textContent).not.toContain('obrigatória');
    fixture.destroy();
  });

  it('sem ninguém platinando, a legenda perde o ouro em vez de prometer 0%', async () => {
    const fixture = await render(spinRecord({
      reviews: [review({ authorKey: 'ana', score: 6, status: 'finalizado' })],
    }));
    const platina = el(fixture).querySelector('.completion-legend .is-platinado')!;

    expect(platina.classList.contains('is-zero')).toBe(true);
    expect(platina.textContent).toContain('0%');
    fixture.destroy();
  });

  it('a régua da resenha ensina o temperamento antes de a nota existir', async () => {
    const fixture = await render(spinRecord(), 'resenha');
    const casa = (id: string) => el(fixture).querySelector(`#${id}`)!.parentElement!;

    expect(casa('nota-final-9').classList.contains('is-high')).toBe(true);
    expect(casa('nota-final-3').classList.contains('is-low')).toBe(true);
    expect(casa('nota-final-1').classList.contains('is-worst')).toBe(true);
    expect(casa('nota-final-6').classList.contains('is-mid')).toBe(true);
    fixture.destroy();
  });
});

describe('a mesa de um jogo', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('a nota do clube diz de quantos que jogaram as resenhas vieram', async () => {
    const fixture = await render(spinRecord({
      seated: [seat('Ana'), seat('Breno'), seat('Cecília'), seat('Davi')],
      reviews: [review({ authorKey: 'ana', score: 8 }), review({ authorKey: 'breno', score: 6 })],
    }));

    expect(el(fixture).querySelector('.score-hero')!.textContent!.replace(/\s+/g, ' '))
      .toContain('2 resenhas de 4');
    fixture.destroy();
  });

  it('a entrada da mesa é uma nota de rodapé, e diz quantos jogaram', async () => {
    const fixture = await render(spinRecord({ seated: [seat('Ana'), seat('Breno')] }));
    const aside = el(fixture).querySelector('.sheet-aside')!;

    expect(aside.textContent).toContain('2 pessoas');
    fixture.destroy();
  });

  it('lista quem jogou e oferece quem do grupo ainda pode entrar', async () => {
    const fixture = await render(
      spinRecord({ seated: [seat('Ana')] }),
      'mesa',
      'Ana',
      [member('Ana'), member('Breno')],
    );
    const naMesa = [...el(fixture).querySelectorAll('.seat:not(.is-off) .seat-who strong')]
      .map((n) => n.textContent);
    const fora = [...el(fixture).querySelectorAll('.seat.is-off .seat-who strong')]
      .map((n) => n.textContent);

    expect(naMesa).toEqual(['Ana']);
    expect(fora).toEqual(['Breno']);
    fixture.destroy();
  });

  it('quem resenhou não recebe a saída da mesa; quem não resenhou recebe', async () => {
    // Tirar quem escreveu deixaria "1 resenha de 0". A saída dela é retirar a resenha.
    const fixture = await render(
      spinRecord({
        seated: [seat('Ana'), seat('Breno')],
        reviews: [review({ author: 'Ana', authorKey: 'ana' })],
      }),
      'mesa',
      'Ana',
      [member('Ana'), member('Breno')],
    );
    const linhas = [...el(fixture).querySelectorAll('.seat')];

    expect(linhas[0].querySelector('.seat-out')).toBeNull();
    expect(linhas[1].querySelector('.seat-out')).not.toBeNull();
    expect(el(fixture).querySelector('.seats-foot')!.textContent).toContain('retirar a resenha');
    fixture.destroy();
  });

  it('entrega a cadeira mexida a quem vai gravar, com o lado para que ela foi', async () => {
    const fixture = await render(
      spinRecord({ seated: [seat('Ana')] }),
      'mesa',
      'Ana',
      [member('Ana'), member('Breno')],
    );
    let entregue: unknown = null;
    fixture.componentInstance.commitSeat.subscribe((valor) => (entregue = valor));

    (el(fixture).querySelector('.seat.is-off .seat-in') as HTMLButtonElement).click();

    expect(entregue).toEqual({
      seat: { key: 'breno', name: 'Breno', memberId: 'breno' },
      seated: true,
    });
    fixture.destroy();
  });
});
