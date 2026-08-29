import { TestBed } from '@angular/core/testing';

import { GROUP_STORE, USAGE_GUARD } from './firebase-app';
import { GroupEvent, memberId, replay } from './group-log';
import { GroupSnapshot } from './group-store';
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

  seed(names: string[], spins = 0) {
    for (const name of names) {
      this.events.push({ type: 'member_added', at: (this.clock += 1000), name });
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

async function render(store: FakeStore, guard = memoryGuard()) {
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
  return fixture;
}

describe('modo sincronizado', () => {
  afterEach(() => TestBed.resetTestingModule());

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
      draftName: { set(v: string): void };
      addMember(): Promise<void>;
    };

    app.draftName.set('Gabriela');
    await app.addMember();
    fixture.detectChanges();

    expect(store.calls).toContain('add:Gabriela');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Gabriela');
    fixture.destroy();
  });

  it('recusa nome repetido sem ir à rede', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      draftName: { set(v: string): void };
      addMember(): Promise<void>;
    };

    app.draftName.set('ana');
    await app.addMember();

    expect(store.calls.filter((c) => c.startsWith('add:'))).toHaveLength(0);
    fixture.destroy();
  });

  it('remover tira dos ativos mas mantém no registro', async () => {
    const store = new FakeStore().seed(['Ana', 'Breno', 'Cecília']);
    const fixture = await render(store);
    const app = fixture.componentInstance as unknown as {
      removeMember(m: { id: string; name: string }): Promise<void>;
    };

    await app.removeMember({ id: memberId(GRUPO, 'Breno'), name: 'Breno' });
    fixture.detectChanges();

    expect(store.calls.some((c) => c.startsWith('remove:'))).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.roster-list li').length).toBe(2);
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
    const app = fixture.componentInstance as unknown as {
      updateAuthor(v: string): void;
      author: () => string;
    };

    app.updateAuthor('  Igor  ');
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
});
