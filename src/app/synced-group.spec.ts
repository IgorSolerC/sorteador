import { TestBed } from '@angular/core/testing';

import { GROUP_STORE, USAGE_GUARD } from './firebase-app';
import {
  GroupEvent,
  GroupMember,
  ReviewCriterion,
  ReviewStatus,
  SpinRecord,
  memberId,
  replay,
} from './group-log';
import { GroupSnapshot } from './group-store';
import { Identity } from './identity';
import { capsuleColor } from './palette';
import { SyncedGroup } from './synced-group';
import { UsageGuard } from './usage-guard';

const GRUPO = 'demo';

function snapshotFrom(events: GroupEvent[]): GroupSnapshot {
  return {
    groupId: GRUPO,
    name: 'Clube de Jogos',
    logVersion: events.length,
    lastSpinAt: events.some((e) => e.type === 'spin') ? Date.now() - 120_000 : null,
    events,
    state: replay(GRUPO, events),
  };
}

class FakeStore {
  calls: string[] = [];
  events: GroupEvent[] = [];
  failWith: unknown = null;
  private clock = 1_700_000_000_000;

  seed(names: string[], spins = 0, emoji = '') {
    for (const name of names) {
      this.events.push({ type: 'member_added', at: (this.clock += 1000), name });
    }
    if (emoji) {
      for (const name of names) {
        this.events.push({
          type: 'member_styled',
          at: (this.clock += 1000),
          memberId: memberId(GRUPO, name),
          colorIndex: null,
          emoji,
        });
      }
    }
    for (let i = 0; i < spins; i += 1) {
      this.events.push({ type: 'spin', at: (this.clock += 1000) });
    }
    return this;
  }

  async load() {
    this.calls.push('load');
    if (this.failWith) throw this.failWith;
    return snapshotFrom(this.events);
  }

  async addMember(_id: string, name: string) {
    this.calls.push(`add:${name}`);
    if (this.failWith) throw this.failWith;
    this.events.push({ type: 'member_added', at: (this.clock += 1000), name });
  }

  async removeMember(_id: string, id: string) {
    this.calls.push(`remove:${id}`);
    this.events.push({ type: 'member_removed', at: (this.clock += 1000), memberId: id });
  }

  async styleMember(
    _id: string,
    alvo: string,
    style: { colorIndex?: number; emoji?: string },
  ) {
    this.calls.push(`style:${alvo}:${style.colorIndex}:${style.emoji}`);
    if (this.failWith) throw this.failWith;
    this.events.push({
      type: 'member_styled',
      at: (this.clock += 1000),
      memberId: alvo,
      colorIndex: style.colorIndex ?? null,
      emoji: style.emoji ?? null,
    });
  }

  async annotateSpin(
    _id: string,
    spinIndex: number,
    note: { title: string; description: string },
  ) {
    this.calls.push(`note:${spinIndex}:${note.title}`);
    if (this.failWith) throw this.failWith;
    this.events.push({
      type: 'spin_annotated',
      at: (this.clock += 1000),
      spinIndex,
      title: note.title,
      description: note.description,
    });
  }

  async reviewSpin(
    _id: string,
    spinIndex: number,
    review: {
      score: number;
      criteria?: Partial<Record<ReviewCriterion, number>>;
      status: ReviewStatus;
      hours?: number | null;
      text?: string;
    },
    actor: string,
  ) {
    this.calls.push(`review:${spinIndex}:${actor}:${review.score}:${review.status}`);
    if (this.failWith) throw this.failWith;
    this.events.push({
      type: 'spin_reviewed',
      at: (this.clock += 1000),
      spinIndex,
      actor,
      score: review.score,
      criteria: review.criteria ?? {},
      status: review.status,
      hours: review.hours ?? null,
      text: review.text ?? '',
      withdrawn: false,
    });
  }

  async withdrawReview(_id: string, spinIndex: number, actor: string) {
    this.calls.push(`unreview:${spinIndex}:${actor}`);
    if (this.failWith) throw this.failWith;
    this.events.push({
      type: 'spin_reviewed',
      at: (this.clock += 1000),
      spinIndex,
      actor,
      score: null,
      criteria: {},
      status: null,
      hours: null,
      text: '',
      withdrawn: true,
    });
  }

  async spin() {
    this.calls.push('spin');
    if (this.failWith) throw this.failWith;
    this.events.push({ type: 'spin', at: (this.clock += 1000) });
  }
}

function memoryGuard() {
  let value: string | null = null;
  return new UsageGuard({ read: () => value, write: (v) => (value = v) });
}

/**
 * A maquina abre encenando a entrega, e a cena dura 4,3s. Aqui ela roda em movimento
 * reduzido, 120ms, que e o mesmo desligamento que o produto honra no navegador de quem
 * pediu menos movimento. Sem isto todo teste de conteudo veria a tela de Entregando.
 */
function reduzirMovimento(): void {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Abre a gaveta da colecao, que e onde a administracao mora agora. */
function abrirColecao(fixture: { componentInstance: unknown; detectChanges(): void }): void {
  (fixture.componentInstance as { openRoster(): void }).openRoster();
  fixture.detectChanges();
}

async function render(store: FakeStore, guard = memoryGuard()) {
  reduzirMovimento();
  await TestBed.configureTestingModule({
    imports: [SyncedGroup],
    providers: [
      { provide: GROUP_STORE, useValue: store },
      { provide: USAGE_GUARD, useValue: guard },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SyncedGroup);
  fixture.componentRef.setInput('groupId', GRUPO);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  // A cena de abertura termina antes de qualquer asseracao sobre o que esta na tela.
  await esperar(180);
  fixture.detectChanges();
  return fixture;
}

describe('modo sincronizado', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('um aviso novo não herda o relógio do anterior', async () => {
    // Corrigir duas cadeiras da mesa seguidas mostra dois avisos em poucos segundos. Com um
    // relógio por aviso em vez de um relógio por vez, o primeiro apagava o segundo no meio.
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));
    const aviso = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.toast span')?.textContent?.trim();
    const maquina = fixture.componentInstance as unknown as { showNotice(mensagem: string): void };

    vi.useFakeTimers();
    try {
      maquina.showNotice('primeiro');
      fixture.detectChanges();
      vi.advanceTimersByTime(3000);

      maquina.showNotice('segundo');
      fixture.detectChanges();
      // Passado o relógio do primeiro, o segundo ainda tem os seus 5,5s inteiros.
      vi.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(aviso()).toBe('segundo');

      vi.advanceTimersByTime(3000);
      fixture.detectChanges();
      expect(aviso()).toBe('');
    } finally {
      vi.useRealTimers();
    }
    fixture.destroy();
  });

  it('mostra o grupo carregado, não a tela de espera', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília']));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Abrindo a');
    expect(text).toContain('Clube de Jogos');
    expect(text).toContain('Ana');
    fixture.destroy();
  });

  it('anuncia quem saiu no último giro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await render(store);
    const vencedor = replay(GRUPO, store.events).lastSpin!.winnerName;

    const titulo = (fixture.nativeElement as HTMLElement).querySelector('#synced-title');
    expect(titulo?.textContent?.trim()).toBe(vencedor);
    fixture.destroy();
  });

  it('sem giro nenhum, convida a girar', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pronta para');
    fixture.destroy();
  });

  it('com menos de duas pessoas, não deixa girar', async () => {
    const fixture = await render(new FakeStore().seed(['Ana']));
    const botao = (fixture.nativeElement as HTMLElement)
      .querySelector('.primary-action') as HTMLButtonElement;

    expect(botao.disabled).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('quase vazio');
    fixture.destroy();
  });

  it('desenha uma cápsula por pessoa do bolo', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília', 'Davi']));
    const capsulas = (fixture.nativeElement as HTMLElement).querySelectorAll('.capsule');
    expect(capsulas.length).toBe(4);
    fixture.destroy();
  });

  it('depois do giro, o globo mostra o bolo daquele instante', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await render(store);
    // Três elegíveis no instante do giro, mesmo que o bolo já tenha dois.
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.capsule').length).toBe(3);
    fixture.destroy();
  });

  it('carrega alguém novo pela loja', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      addFromBench(name: string): Promise<void>;
    };

    await app.addFromBench('Gabriela');
    fixture.detectChanges();

    expect(store.calls).toContain('add:Gabriela');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Gabriela');
    fixture.destroy();
  });

  it('recusa nome repetido sem ir à rede', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      addFromBench(name: string): Promise<void>;
      rosterError: () => string;
    };

    await app.addFromBench('ana');

    expect(store.calls.filter((c) => c.startsWith('add:'))).toHaveLength(0);
    fixture.destroy();
  });

  it('remover tira dos ativos mas mantém no registro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      removeFromBench(m: GroupMember): Promise<void>;
      members(): readonly GroupMember[];
    };

    const breno = app.members().find((m) => m.name === 'Breno')!;
    await app.removeFromBench(breno);
    fixture.detectChanges();

    expect(store.calls).toContain(`remove:${memberId(GRUPO, 'Breno')}`);
    expect(app.members()).toHaveLength(2);
    fixture.destroy();
  });

  it('a parada de orçamento vira mensagem, não silêncio', async () => {
    const guard = memoryGuard();
    guard.stop('quota-exhausted');
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']), guard);

    const aviso = (fixture.nativeElement as HTMLElement).querySelector('.usage-note');
    expect(aviso?.textContent).toContain('Parada de segurança');
    fixture.destroy();
  });

  it('erro do servidor aparece para a pessoa', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno']);
    store.failWith = Object.assign(new Error('negado'), { code: 'permission-denied' });
    const fixture = await render(store);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Grupo não');
    fixture.destroy();
  });

  it('o link do grupo não carrega a lista', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));
    abrirColecao(fixture);
    const campo = (fixture.nativeElement as HTMLElement)
      .querySelector('.share-field input') as HTMLInputElement;

    expect(campo.value).toContain(`#/g/${GRUPO}`);
    expect(campo.value).not.toContain('grupo=');
    fixture.destroy();
  });

  it('o registro lista os giros gravados', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 2);
    const fixture = await render(store);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.chart-cell').length).toBe(2);
    fixture.destroy();
  });

  it('ao carregar, a roda já para na posição de repouso', async () => {
    // Sem isto os rótulos ficam calculados para o repouso enquanto a roda está em zero:
    // os nomes de baixo aparecem invertidos e a cápsula vencedora fica fora da calha.
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1));
    const app = fixture.componentInstance as unknown as {
      rotation: () => number;
      targetRotation(): number;
    };

    expect(app.rotation()).toBe(app.targetRotation());
    expect(app.rotation()).toBeGreaterThan(0);
    fixture.destroy();
  });

  it('quando o bolo esvazia, a rodada vira e todos voltam', async () => {
    // Três pessoas, três giros: a rodada 1 fecha e a 2 abre com o globo cheio de novo.
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 3));
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('R2');
    const noGlobo = (fixture.nativeElement as HTMLElement)
      .querySelectorAll('.serial-grid dd')[1]?.textContent?.trim();
    expect(noGlobo).toBe('3 / 3');
    fixture.destroy();
  });

  it('o registro separa as rodadas', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 3));
    const celulas = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.chart-cell')];
    const rodadas = celulas.map((c) => c.querySelector('.cell-month')?.textContent?.trim() ?? '');

    expect(rodadas.some((r) => r.includes('Rodada 1'))).toBe(true);
    expect(rodadas.some((r) => r.includes('Rodada 2'))).toBe(true);
    fixture.destroy();
  });

  it('assina quem operou, quando a pessoa se identifica', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno']);
    const fixture = await render(store);
    TestBed.inject(Identity).remember('  Igor  ');
    fixture.detectChanges();

    const app = fixture.componentInstance as unknown as { author: () => string };
    expect(app.author()).toBe('Igor');
    fixture.destroy();
  });

  it('mostra quando o que está na tela foi lido', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));
    const app = fixture.componentInstance as unknown as { loadedAgo: () => string };
    expect(app.loadedAgo()).toBe('agora');
    fixture.destroy();
  });

  it('atualizar busca o servidor de novo', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno']);
    const fixture = await render(store);
    const antes = store.calls.filter((c) => c === 'load').length;

    await (fixture.componentInstance as unknown as { refresh(): Promise<void> }).refresh();
    expect(store.calls.filter((c) => c === 'load').length).toBe(antes + 1);
    fixture.destroy();
  });

  it('a colecao e uma gaveta, nao uma secao da pagina', async () => {
    // A administracao saia meia pagina abaixo do palco e ficava aberta o tempo todo.
    // Agora ela so existe quando alguem pede, e a pagina fica com a maquina e o registro.
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.roster-card')).toBeNull();
    (raiz.querySelector('#roster-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const gaveta = raiz.querySelector('.roster-card');
    expect(gaveta).toBeTruthy();
    expect(gaveta?.getAttribute('aria-modal')).toBe('true');
    expect(raiz.querySelectorAll('.capsule-row').length).toBe(2);
    fixture.destroy();
  });

  it('trocar para um grupo que falha não mostra os dados do anterior', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cecília');

    store.failWith = Object.assign(new Error('sumiu'), { code: 'not-found' });
    fixture.componentRef.setInput('groupId', 'outro-grupo');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Cecília');
    expect(texto).toContain('Grupo não');
    fixture.destroy();
  });

  it('clicar em girar pede confirmação em vez de girar', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as { askToSpin(): void };

    app.askToSpin();
    fixture.detectChanges();

    const aviso = (fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]');
    expect(aviso?.textContent).toContain('Tem certeza');
    expect(aviso?.textContent).toContain('permanentemente');
    expect(store.calls).not.toContain('spin');
    fixture.destroy();
  });

  it('cancelar não gira', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      askToSpin(): void; cancelSpin(): void;
    };

    app.askToSpin();
    app.cancelSpin();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]')).toBeNull();
    expect(store.calls).not.toContain('spin');
    fixture.destroy();
  });

  it('confirmar gira de verdade', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      askToSpin(): void; confirmSpin(): Promise<void>;
    };

    app.askToSpin();
    await app.confirmSpin();

    expect(store.calls).toContain('spin');
    fixture.destroy();
  });
});

describe('etiqueta do giro', () => {
  afterEach(() => TestBed.resetTestingModule());

  type Bancada = {
    openSheet(spin: SpinRecord, event?: Event): void;
    showFace(face: 'ficha' | 'resenha' | 'jogo'): void;
    closeNote(): void;
    commitNote(draft: { title: string; description: string }): Promise<void>;
    removeNote(): Promise<void>;
    commitReview(draft: {
      score: number | null;
      criteria: Partial<Record<ReviewCriterion, number>>;
      status: ReviewStatus | null;
      text: string;
    }): Promise<void>;
    removeReview(): Promise<void>;
    noteError: () => string;
    sheetFace: () => 'ficha' | 'resenha' | 'jogo';
    editingSpin: () => SpinRecord | null;
  };

  const bancada = (fixture: { componentInstance: unknown }) =>
    fixture.componentInstance as unknown as Bancada;

  const spinsOf = (store: FakeStore) => replay(GRUPO, store.events).spins;

  it('um giro sem etiqueta oferece a etiqueta em branco', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 1));
    const branco = (fixture.nativeElement as HTMLElement).querySelector('.note-sticker.is-blank');

    expect(branco).not.toBeNull();
    expect(branco?.textContent).toContain('Escrever o jogo desta cápsula');
    fixture.destroy();
  });

  it('a etiqueta do último giro aparece no palco', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    store.events.push({
      type: 'spin_annotated', at: Date.now(), spinIndex: 0,
      title: 'Click The Button!', description: 'Nota final 8/10', actor: 'Igor',
    });
    const fixture = await render(store);
    const texto = (fixture.nativeElement as HTMLElement).querySelector('.note-sticker')?.textContent ?? '';

    expect(texto).toContain('Click The Button!');
    expect(texto).toContain('Nota final 8/10');
    expect(texto).toContain('Igor');
    fixture.destroy();
  });

  it('salvar grava a etiqueta e fecha a bancada', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('jogo');
    await app.commitNote({ title: 'Overcooked', description: 'Nota 9/10' });
    fixture.detectChanges();

    expect(store.calls).toContain('note:0:Overcooked');
    // Salvar o jogo devolve à ficha, e não à página: o passo seguinte natural é escrever
    // a resenha dele, e fechar tudo obrigaria a achar a mesma cápsula de novo.
    expect(app.editingSpin()).not.toBeNull();
    expect(app.sheetFace()).toBe('ficha');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Overcooked');
    fixture.destroy();
  });

  it('etiquetar um giro antigo usa o índice daquele giro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 2);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    await app.commitNote({ title: 'O primeiro de todos', description: '' });

    expect(store.calls).toContain('note:0:O primeiro de todos');
    expect(replay(GRUPO, store.events).spins[0].note?.title).toBe('O primeiro de todos');
    expect(replay(GRUPO, store.events).spins[1].note).toBeNull();
    fixture.destroy();
  });

  it('descrição sem título é recusada antes de ir à rede', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('jogo');
    await app.commitNote({ title: '', description: 'Só a descrição' });

    expect(store.calls.some((c) => c.startsWith('note:'))).toBe(false);
    expect(app.noteError()).toContain('nome ao jogo');
    expect(app.editingSpin()).not.toBeNull();
    fixture.destroy();
  });

  it('retirar grava a etiqueta em branco', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    store.events.push({
      type: 'spin_annotated', at: Date.now(), spinIndex: 0, title: 'Tetris', description: '',
    });
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    await app.removeNote();

    expect(store.calls).toContain('note:0:');
    expect(replay(GRUPO, store.events).spins[0].note).toBeNull();
    fixture.destroy();
  });

  it('toda célula do registro abre a bancada, não só a última', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno'], 2));
    const celulas = (fixture.nativeElement as HTMLElement).querySelectorAll('.cell-open');

    expect(celulas.length).toBe(2);
    (celulas[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const bancadaAberta = (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');
    expect(bancadaAberta).not.toBeNull();
    expect(bancadaAberta?.textContent).toContain('Cápsula 1');
    fixture.destroy();
  });

  it('um erro do servidor fica na bancada, sem perder o que foi digitado', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('jogo');
    store.failWith = { code: 'permission-denied' };
    await app.commitNote({ title: 'Pico Park', description: '' });
    fixture.detectChanges();

    // A face não volta: voltar levaria embora o texto digitado, e o erro tem que aparecer
    // ao lado dos campos que o causaram.
    expect(app.editingSpin()).not.toBeNull();
    expect(app.sheetFace()).toBe('jogo');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]')).not.toBeNull();
    expect(app.noteError()).toContain('recusou');
    expect((fixture.nativeElement as HTMLElement).querySelector('.field-error')?.textContent)
      .toContain('recusou');
    fixture.destroy();
  });
});

describe('a resenha de cada pessoa', () => {
  afterEach(() => TestBed.resetTestingModule());

  type Bancada = {
    openSheet(spin: SpinRecord, event?: Event): void;
    showFace(face: 'ficha' | 'resenha' | 'jogo'): void;
    commitReview(draft: {
      score: number | null;
      criteria: Partial<Record<ReviewCriterion, number>>;
      status: ReviewStatus | null;
      text: string;
    }): Promise<void>;
    removeReview(): Promise<void>;
    noteError: () => string;
    sheetFace: () => 'ficha' | 'resenha' | 'jogo';
    editingSpin: () => SpinRecord | null;
  };

  const bancada = (fixture: { componentInstance: unknown }) =>
    fixture.componentInstance as unknown as Bancada;
  const spinsOf = (store: FakeStore) => replay(GRUPO, store.events).spins;

  const rascunho = (over: Record<string, unknown> = {}) => ({
    score: 8,
    criteria: {},
    status: 'finalizado' as ReviewStatus,
    text: '',
    ...over,
  }) as never;

  it('grava a resenha assinada por quem está com o app aberto', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('resenha');
    await app.commitReview(rascunho({ score: 9, status: 'platinado', criteria: { diversao: 10 } }));
    fixture.detectChanges();

    expect(store.calls.some((c) => c.startsWith('review:0:'))).toBe(true);
    const resenhas = replay(GRUPO, store.events).spins[0].reviews;
    expect(resenhas).toHaveLength(1);
    expect(resenhas[0].score).toBe(9);
    expect(resenhas[0].status).toBe('platinado');
    expect(resenhas[0].criteria).toEqual({ diversao: 10 });
    // Gravar devolve à ficha, que é onde a nota do clube acabou de mudar.
    expect(app.sheetFace()).toBe('ficha');
    fixture.destroy();
  });

  it('sem nota final, a resenha nem chega à rede', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('resenha');
    await app.commitReview(rascunho({ score: null }));

    expect(store.calls.some((c) => c.startsWith('review:'))).toBe(false);
    expect(app.noteError()).toContain('nota final');
    expect(app.sheetFace()).toBe('resenha');
    fixture.destroy();
  });

  it('sem completude, a resenha nem chega à rede', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('resenha');
    await app.commitReview(rascunho({ status: null }));

    expect(store.calls.some((c) => c.startsWith('review:'))).toBe(false);
    expect(app.noteError()).toContain('terminou');
    fixture.destroy();
  });

  it('retirar a própria resenha a tira da conta do clube', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('resenha');
    await app.commitReview(rascunho({ score: 7 }));
    await app.removeReview();

    expect(store.calls.some((c) => c.startsWith('unreview:0:'))).toBe(true);
    expect(replay(GRUPO, store.events).spins[0].reviews).toHaveLength(0);
    fixture.destroy();
  });

  it('a nota do clube aparece no registro depois da primeira resenha', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    store.events.push({
      type: 'spin_annotated', at: Date.now(), spinIndex: 0, title: 'Tetris', description: '',
    });
    const fixture = await render(store);
    const app = bancada(fixture);

    app.openSheet(spinsOf(store)[0]);
    app.showFace('resenha');
    await app.commitReview(rascunho({ score: 6 }));
    fixture.detectChanges();

    const celula = (fixture.nativeElement as HTMLElement).querySelector('.cell-note');
    expect(celula?.textContent).toContain('Tetris · 6,0');
    fixture.destroy();
  });
});

/**
 * Abre a máquina sem esperar a cena de abertura terminar — é o único jeito de observar a
 * própria cena, que todo o resto do arquivo pula de propósito.
 */
async function renderNoAto(store: FakeStore) {
  reduzirMovimento();
  await TestBed.configureTestingModule({
    imports: [SyncedGroup],
    providers: [
      { provide: GROUP_STORE, useValue: store },
      { provide: USAGE_GUARD, useValue: memoryGuard() },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(SyncedGroup);
  fixture.componentRef.setInput('groupId', GRUPO);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('a cena de abertura', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('a máquina abre girando, e o nome só aparece no fim', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await renderNoAto(store);
    const app = fixture.componentInstance as unknown as {
      isSpinning(): boolean;
      rotation(): number;
      targetRotation(): number;
    };

    expect(app.isSpinning()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Entregando');

    await esperar(200);
    fixture.detectChanges();

    expect(app.isSpinning()).toBe(false);
    expect(app.rotation()).toBe(app.targetRotation());
    const vencedor = replay(GRUPO, store.events).lastSpin!.winnerName;
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(vencedor);
    fixture.destroy();
  });

  it('sem giro nenhum não há cena: não se encena o que não aconteceu', async () => {
    const fixture = await renderNoAto(new FakeStore().seed(['Ana', 'Breno']));
    const app = fixture.componentInstance as unknown as { isSpinning(): boolean };

    expect(app.isSpinning()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pronta para');
    fixture.destroy();
  });

  it('abrir a página não grava nada', async () => {
    // A cena é reencenação. Se ela escrevesse, abrir o link duas vezes mudaria o resultado.
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await renderNoAto(store);
    await esperar(200);

    expect(store.calls.filter((c) => c !== 'load')).toEqual([]);
    fixture.destroy();
  });
});

describe('reencenar a entrega', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('clicar no globo gira de novo e para na mesma cápsula', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      isSpinning(): boolean;
      rotation(): number;
      targetRotation(): number;
      displayed(): { chosenIndex: number };
    };

    const antes = app.displayed().chosenIndex;
    const destino = app.targetRotation();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.machine-replay')!.click();
    fixture.detectChanges();
    expect(app.isSpinning()).toBe(true);

    // O novo destino precisa estar voltas completas à frente. Repetir o mesmo valor fazia
    // o navegador consolidar o estado e mostrar só a revelação, sem a roleta rodando.
    await esperar(50);
    fixture.detectChanges();
    expect(app.rotation()).toBeGreaterThan(destino);

    await esperar(150);
    fixture.detectChanges();

    expect(app.isSpinning()).toBe(false);
    expect(app.displayed().chosenIndex).toBe(antes);
    expect(app.rotation()).toBe(destino);
    expect(store.calls.filter((c) => c !== 'load')).toEqual([]);
    fixture.destroy();
  });

  it('a máquina não é clicável enquanto entrega', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await renderNoAto(store);
    const botao = (fixture.nativeElement as HTMLElement)
      .querySelector('.machine-replay') as HTMLButtonElement;

    expect(botao.disabled).toBe(true);
    await esperar(200);
    fixture.detectChanges();
    expect(botao.disabled).toBe(false);
    fixture.destroy();
  });

  it('sem cápsula entregue, o globo não encena nada', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno']));
    const app = fixture.componentInstance as unknown as {
      replayScene(): void;
      isSpinning(): boolean;
    };

    app.replayScene();
    expect(app.isSpinning()).toBe(false);
    fixture.destroy();
  });
});

describe('a cápsula de cada pessoa na máquina', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('a cor no globo é a que a pessoa escolheu, não a posição dela no anel', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      restyle(s: { memberId: string; colorIndex: number; emoji: string }): Promise<void>;
      displayed(): { people: readonly { name: string; color: string; emoji: string }[] };
    };

    await app.restyle({ memberId: memberId(GRUPO, 'Breno'), colorIndex: 13, emoji: '🦊' });
    fixture.detectChanges();

    const breno = app.displayed().people.find((p) => p.name === 'Breno')!;
    expect(breno.color).toBe(capsuleColor(13));
    expect(breno.emoji).toBe('🦊');
    fixture.destroy();
  });

  it('pintar não muda quem já saiu do globo', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      restyle(s: { memberId: string; colorIndex: number; emoji: string }): Promise<void>;
      displayed(): { winner: { name: string } | null };
    };

    const antes = app.displayed().winner!.name;
    await app.restyle({ memberId: memberId(GRUPO, 'Ana'), colorIndex: 3, emoji: '🎲' });
    fixture.detectChanges();

    expect(app.displayed().winner!.name).toBe(antes);
    fixture.destroy();
  });

  it('a cor de um giro no registro acompanha a pessoa, não o índice do giro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno'], 1);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      restyle(s: { memberId: string; colorIndex: number; emoji: string }): Promise<void>;
      displayed(): { winner: { id: string } | null };
      colorOf(spin: SpinRecord): string;
      snapshot(): { state: { spins: readonly SpinRecord[] } } | null;
    };

    const vencedorId = app.displayed().winner!.id;
    await app.restyle({ memberId: vencedorId, colorIndex: 17, emoji: '' });
    fixture.detectChanges();

    expect(app.colorOf(app.snapshot()!.state.spins[0])).toBe(capsuleColor(17));
    fixture.destroy();
  });
});

describe('o confete da entrega', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('a cena automática ao abrir celebra com o emoji da pessoa sorteada', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1, '🎮'));
    const app = fixture.componentInstance as unknown as {
      celebration(): number;
      winnerEmoji(): string;
    };

    expect(app.celebration()).toBe(1);
    expect(app.winnerEmoji()).toBe('🎮');
    fixture.destroy();
  });

  it('clicar na roleta solta outra chuva do emoji', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 1, '🦊'));
    const app = fixture.componentInstance as unknown as {
      celebration(): number;
      winnerEmoji(): string;
    };

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.machine-replay')!.click();
    await esperar(200);
    fixture.detectChanges();

    expect(app.celebration()).toBe(2);
    expect(app.winnerEmoji()).toBe('🦊');
    fixture.destroy();
  });

  it('um giro verdadeiro também celebra com o emoji da nova vencedora', async () => {
    const fixture = await render(new FakeStore().seed(['Ana', 'Breno', 'Cecília'], 0, '🎯'));
    const app = fixture.componentInstance as unknown as {
      askToSpin(): void;
      confirmSpin(): Promise<void>;
      celebration(): number;
      winnerEmoji(): string;
    };

    app.askToSpin();
    await app.confirmSpin();
    await esperar(200);
    fixture.detectChanges();

    expect(app.celebration()).toBe(1);
    expect(app.winnerEmoji()).toBe('🎯');
    fixture.destroy();
  });
});
