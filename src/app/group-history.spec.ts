import { TestBed } from '@angular/core/testing';

import { GROUP_STORE } from './firebase-app';
import { GroupEvent, ReviewCriterion, ReviewStatus, replay } from './group-log';
import { GroupSnapshot } from './group-store';
import { GroupHistory } from './group-history';

const GRUPO = 'demo';

class FakeStore {
  calls: string[] = [];
  events: GroupEvent[] = [];
  failWith: unknown = null;
  private clock = 1_700_000_000_000;

  seed(names: string[], spins = 0) {
    for (const name of names) {
      this.events.push({ type: 'member_added', at: (this.clock += 1000), name });
    }
    for (let i = 0; i < spins; i += 1) {
      this.events.push({ type: 'spin', at: (this.clock += 1000), actor: 'Igor' });
    }
    return this;
  }

  label(spinIndex: number, title: string, description = '', actor = 'Bia') {
    this.events.push({
      type: 'spin_annotated', at: (this.clock += 1000), spinIndex, title, description, actor,
    });
    return this;
  }

  review(
    spinIndex: number,
    actor: string,
    score: number,
    status: ReviewStatus = 'finalizado',
    extra: { criteria?: Partial<Record<ReviewCriterion, number>>; hours?: number } = {},
  ) {
    this.events.push({
      type: 'spin_reviewed', at: (this.clock += 1000), spinIndex, actor,
      score, criteria: extra.criteria ?? {}, status, hours: extra.hours ?? null,
      text: '', withdrawn: false,
    });
    return this;
  }

  async load(): Promise<GroupSnapshot> {
    this.calls.push('load');
    if (this.failWith) throw this.failWith;
    return {
      groupId: GRUPO,
      name: 'Clube de Jogos',
      logVersion: this.events.length,
      lastSpinAt: null,
      events: this.events,
      state: replay(GRUPO, this.events),
    };
  }

  async annotateSpin(
    _id: string,
    spinIndex: number,
    note: { title: string; description: string },
  ) {
    this.calls.push(`note:${spinIndex}:${note.title}`);
    if (this.failWith) throw this.failWith;
    this.label(spinIndex, note.title, note.description, '');
  }
}

async function render(store: FakeStore) {
  await TestBed.configureTestingModule({
    imports: [GroupHistory],
    providers: [{ provide: GROUP_STORE, useValue: store }],
  }).compileComponents();

  const fixture = TestBed.createComponent(GroupHistory);
  fixture.componentRef.setInput('groupId', GRUPO);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

const el = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;
const texts = (fixture: { nativeElement: unknown }, selector: string) =>
  [...el(fixture).querySelectorAll(selector)].map((node) => node.textContent?.trim() ?? '');

describe('o álbum', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('mostra uma cápsula por giro', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 3));
    expect(el(fixture).querySelectorAll('.album-card').length).toBe(3);
    fixture.destroy();
  });

  it('abre pela cápsula mais recente, não pela origem', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 3);
    const fixture = await render(store);
    const ultimo = replay(GRUPO, store.events).lastSpin!;

    expect(texts(fixture, '.album-card .album-serial')[0]).toContain(`Cápsula ${ultimo.index + 1}`);
    fixture.destroy();
  });

  it('agrupa por rodada, da mais nova para a mais antiga', async () => {
    // Duas pessoas e três giros: a rodada 1 fecha com dois e a 2 começa.
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 3));
    const rodadas = texts(fixture, '.round-rule');

    expect(rodadas.length).toBe(2);
    expect(rodadas[0]).toContain('Rodada 2');
    expect(rodadas[1]).toContain('Rodada 1');
    fixture.destroy();
  });

  it('a etiqueta aparece no cartão', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1)
      .label(0, 'Click The Button!', 'Nota final 8/10', 'Igor');
    const fixture = await render(store);
    const botao = el(fixture).querySelector('.album-card')!;
    const cartao = botao.textContent ?? '';

    expect(cartao).toContain('Click The Button!');
    expect(cartao).toContain('Nota final 8/10');
    // O nome de quem ganhou está no alto do cartão, em 1.42rem. Repeti-lo em miúdo no
    // rodapé era a mesma informação duas vezes; para quem não vê o cartão, ele continua
    // no nome acessível do botão, que é o que o leitor de tela anuncia.
    expect(cartao).toContain('Breno');
    expect(cartao).not.toContain('saiu para');
    expect(botao.getAttribute('aria-label')).toContain('saiu para Breno');
    fixture.destroy();
  });

  it('um giro sem etiqueta convida a escrever', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 1));
    const cartao = el(fixture).querySelector('.album-card')!;

    expect(cartao.classList.contains('is-blank')).toBe(true);
    expect(cartao.textContent).toContain('Sem jogo escrito');
    fixture.destroy();
  });

  it('conta quantas vezes cada pessoa saiu', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 4);
    const fixture = await render(store);
    const estado = replay(GRUPO, store.events);
    const esperado = new Set(estado.spins.map((spin) => spin.winnerName)).size;

    // Um chip por pessoa, mais o "Todas".
    expect(el(fixture).querySelectorAll('.people-chip').length).toBe(esperado + 1);
    expect(texts(fixture, '.people-chip')[0]).toContain('Todas');
    fixture.destroy();
  });

  it('focar numa pessoa reduz a parede só às cápsulas dela', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 4);
    const fixture = await render(store);
    const estado = replay(GRUPO, store.events);

    const chips = [...el(fixture).querySelectorAll('.people-chip')] as HTMLButtonElement[];
    const nome = chips[1].textContent?.trim().split(' ')[0] ?? '';
    chips[1].click();
    fixture.detectChanges();

    const esperado = estado.spins.filter((spin) => spin.winnerName.startsWith(nome)).length;
    expect(el(fixture).querySelectorAll('.album-card').length).toBe(esperado);
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    expect(el(fixture).querySelector('.album-filter-state')?.textContent).toContain('Mostrando os');
    fixture.destroy();
  });

  it('clicar de novo no mesmo chip devolve a parede inteira', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 4));
    const chip = el(fixture).querySelectorAll('.people-chip')[1] as HTMLButtonElement;

    chip.click();
    fixture.detectChanges();
    chip.click();
    fixture.detectChanges();

    expect(el(fixture).querySelectorAll('.album-card').length).toBe(4);
    expect(el(fixture).querySelector('.album-filter-state')?.textContent)
      .toContain('álbum inteiro');
    fixture.destroy();
  });

  it('um cartão abre a bancada daquele giro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 2);
    const fixture = await render(store);
    (el(fixture).querySelectorAll('.album-card')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    const bancada = el(fixture).querySelector('[role="dialog"]');
    expect(bancada).not.toBeNull();
    // O segundo cartão é o giro mais antigo, a cápsula 1.
    expect(bancada?.textContent).toContain('Cápsula 1');
    fixture.destroy();
  });

  it('etiquetar pelo álbum grava no índice daquele giro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 3);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      openSheet(spin: { index: number }): void;
      commitNote(draft: { title: string; description: string }): Promise<void>;
    };

    app.openSheet({ index: 0 } as never);
    await app.commitNote({ title: 'O primeiro de todos', description: '' });
    fixture.detectChanges();

    expect(store.calls).toContain('note:0:O primeiro de todos');
    expect(replay(GRUPO, store.events).spins[0].note?.title).toBe('O primeiro de todos');
    fixture.destroy();
  });

  it('sem giro nenhum, o álbum explica que começa no primeiro', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));

    expect(el(fixture).querySelector('.album-empty')).not.toBeNull();
    expect(el(fixture).textContent).toContain('sem cápsulas');
    expect(el(fixture).querySelectorAll('.album-card').length).toBe(0);
    // Sem ninguém sorteado, a fileira de pessoas nem aparece.
    expect(el(fixture).querySelector('.album-people')).toBeNull();
    fixture.destroy();
  });

  it('um grupo que não carrega vira recado, não tela vazia', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    store.failWith = Object.assign(new Error('sumiu'), { code: 'permission-denied' });
    const fixture = await render(store);

    expect(el(fixture).querySelector('.album-error')?.textContent).toContain('recusou');
    fixture.destroy();
  });

  it('a cor de uma pessoa é a mesma em todo o álbum', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 4);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      winners: () => readonly { id: string; color: string }[];
    };

    const cores = app.winners().map((w) => w.color);
    expect(new Set(cores).size).toBe(cores.length);
    fixture.destroy();
  });
});

describe('as quatro tintas da nota no álbum', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('o cartão de um jogo amado sai em ciano e o de um jogo ruim em laranja', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 2)
      .label(0, 'Overcooked 2').review(0, 'Ana', 10).review(0, 'Breno', 9)
      .label(1, 'Corrida de Bocha 3').review(1, 'Ana', 3).review(1, 'Breno', 4);
    const fixture = await render(store);
    // A parede vai do giro mais novo para o mais antigo.
    const notas = [...el(fixture).querySelectorAll('.album-score')];

    expect(notas[0].classList.contains('is-low')).toBe(true);
    expect(notas[1].classList.contains('is-high')).toBe(true);
    fixture.destroy();
  });

  it('um jogo mediano fica em tinta, e é isso que faz os outros dois serem vistos', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1)
      .label(0, 'Pico Park').review(0, 'Ana', 6).review(0, 'Breno', 7);
    const fixture = await render(store);
    const nota = el(fixture).querySelector('.album-score')!;

    expect(nota.classList.contains('is-mid')).toBe(true);
    expect(nota.textContent).toContain('6,5');
    fixture.destroy();
  });

  it('o resumo do cartão não carrega as duas medidas da platina', async () => {
    // Numa parede de dezenas de cartões, duas linhas que só existem para alguns jogos
    // alongam todos e não deixam nenhum mais fácil de comparar. Elas estão na ficha, a um
    // clique daqui — o cartão inteiro é o botão que a abre.
    const store = new FakeStore().seed(['Ana', 'Breno'], 1)
      .label(0, 'Hollow Knight')
      .review(0, 'Ana', 10, 'platinado', {
        criteria: { diversao: 9, dificuldadePlatina: 10, diversaoPlatina: 6 },
      });
    const fixture = await render(store);
    const resumo = el(fixture).querySelector('.album-criteria')!;

    expect(resumo.textContent).toContain('Diversão');
    expect(resumo.textContent).not.toContain('platinar');
    expect(resumo.textContent).not.toContain('platina');
    fixture.destroy();
  });

  it('a cápsula sem jogo escrito não repete que também não tem nota', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 1));
    const cartao = el(fixture).querySelector('.album-card')!;

    expect(cartao.querySelector('.album-score')).toBeNull();
    expect(cartao.textContent).toContain('Abra para escrever o jogo');
    fixture.destroy();
  });
});

describe('a ordem da parede', () => {
  afterEach(() => TestBed.resetTestingModule());

  const wall = () => new FakeStore().seed(['Ana', 'Breno'], 3)
    .label(0, 'Primeiro').review(0, 'Ana', 5, 'finalizado', { criteria: { historia: 9 }, hours: 30 })
    .label(1, 'Segundo').review(1, 'Ana', 9, 'finalizado', { criteria: { historia: 2 }, hours: 4 })
    .label(2, 'Terceiro').review(2, 'Ana', 7, 'finalizado', { criteria: { historia: 5 } });

  const titulos = (fixture: Awaited<ReturnType<typeof render>>) =>
    [...el(fixture).querySelectorAll('.album-title')].map((t) => t.textContent?.trim());

  it('o padrão é a ordem do registro, e ela mantém as réguas de rodada', async () => {
    const fixture = await render(wall());
    expect(el(fixture).querySelector('.round-rule')!.textContent).toContain('Rodada');
    fixture.destroy();
  });

  it('ordenar por nota do clube põe o mais bem votado na frente', async () => {
    const fixture = await render(wall());
    (el(fixture).querySelectorAll('.sort-options button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(titulos(fixture)).toEqual(['Segundo', 'Terceiro', 'Primeiro']);
    // Uma ordem por medida fura as rodadas: ela existe para comparar jogos de meses
    // diferentes, e uma régua por cartão não separaria nada.
    expect(el(fixture).querySelector('.round-rule')!.textContent).toContain('Por nota do clube');
    fixture.destroy();
  });

  it('ordenar por um critério usa a média daquele critério, e não a nota final', async () => {
    const fixture = await render(wall());
    const historia = [...el(fixture).querySelectorAll('.sort-options button')]
      .find((b) => b.textContent?.trim() === 'História') as HTMLButtonElement;
    historia.click();
    fixture.detectChanges();

    expect(titulos(fixture)).toEqual(['Primeiro', 'Terceiro', 'Segundo']);
    fixture.destroy();
  });

  it('ordenar por tempo joga para o fim quem ninguém cronometrou', async () => {
    const fixture = await render(wall());
    const tempo = [...el(fixture).querySelectorAll('.sort-options button')]
      .find((b) => b.textContent?.trim() === 'Tempo de jogo') as HTMLButtonElement;
    tempo.click();
    fixture.detectChanges();

    expect(titulos(fixture)).toEqual(['Primeiro', 'Segundo', 'Terceiro']);
    fixture.destroy();
  });
});
