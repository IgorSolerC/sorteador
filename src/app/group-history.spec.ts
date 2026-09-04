import { TestBed } from '@angular/core/testing';

import { GROUP_STORE } from './firebase-app';
import { GroupEvent, replay } from './group-log';
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

  label(spinIndex: number, title: string, description = '', actor = 'Bia', subtitle = '') {
    this.events.push({
      type: 'spin_annotated', at: (this.clock += 1000), spinIndex, title, subtitle, description, actor,
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
    note: { title: string; subtitle: string; description: string },
  ) {
    this.calls.push(`note:${spinIndex}:${note.title}`);
    if (this.failWith) throw this.failWith;
    this.label(spinIndex, note.title, note.description, '', note.subtitle);
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
    const cartao = el(fixture).querySelector('.album-card')!.textContent ?? '';

    expect(cartao).toContain('Click The Button!');
    expect(cartao).toContain('Nota final 8/10');
    expect(cartao).toContain('etiquetada por Igor');
    fixture.destroy();
  });

  it('um giro sem etiqueta convida a escrever', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 1));
    const cartao = el(fixture).querySelector('.album-card')!;

    expect(cartao.classList.contains('is-blank')).toBe(true);
    expect(cartao.textContent).toContain('Sem etiqueta');
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
    expect(el(fixture).querySelector('.album-filter-state')?.textContent).toContain('Mostrando as');
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
      openNote(spin: { index: number }): void;
      commitNote(draft: { title: string; subtitle: string; description: string }): Promise<void>;
    };

    app.openNote({ index: 0 } as never);
    await app.commitNote({ subtitle: '', title: 'O primeiro de todos', description: '' });
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
