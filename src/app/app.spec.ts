import { TestBed } from '@angular/core/testing';
import { App, isNewGroupRoute, readAlbumGroupId, readSyncedGroupId } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('creates the monthly draw experience', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('main')).toBeTruthy();
    fixture.destroy();
  });

  it('sobrevive a um link de grupo corrompido', () => {
    window.location.hash = '#grupo=n%C3%A3o-%C3%A9-base64&inicio=2026-05';
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('main')).toBeTruthy();
    window.location.hash = '';
    fixture.destroy();
  });

  it('carrega a lista de um link de grupo válido', () => {
    window.location.hash = '#grupo=WyJaaWxkYSIsIll1cmkiLCJYYXZpZXIiLCJXYW5kYSJd&inicio=2026-05';
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Zilda');
    window.location.hash = '';
    fixture.destroy();
  });

  it('preserva o mês já anunciado quando entra alguém novo', () => {
    // O clube rodou o mês corrente com seis pessoas; agora entra a sétima.
    //
    // O início é o próprio mês de hoje, e não uma data fixa: com um mês fixo o histórico
    // cresce a cada virada de calendário, e a busca passa a ter que satisfazer meses
    // consecutivos do mesmo ciclo ao mesmo tempo — o que é insatisfazível por construção,
    // porque dentro de um ciclo ninguém repete. Ancorado em hoje, o alvo é sempre um só.
    const clube = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];
    const hoje = new Date();
    const mesCorrente = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    localStorage.setItem(
      'mesa-do-mes:configuration:v1',
      JSON.stringify({ participants: clube, startMonth: mesCorrente }),
    );

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      participants: { set(value: string[]): void };
      seed: () => string;
      draw: () => { winner: string } | null;
      historyMonths: () => Array<{ key: string; year: number; month: number; chosen: string }>;
      setHistoryWinner(key: string, winner: string): void;
      searchSeed(): void;
      seedSearchState: () => string;
      addParticipant(): void;
      draftName: { set(value: string): void };
    };
    fixture.detectChanges();

    const vencedorOriginal = app.draw()!.winner;
    const mesAnunciado = app.historyMonths()[0].key;

    app.draftName.set('Gabriela');
    app.addParticipant();
    fixture.detectChanges();

    app.setHistoryWinner(mesAnunciado, vencedorOriginal);
    app.searchSeed();
    fixture.detectChanges();

    expect(['found', 'unchanged']).toContain(app.seedSearchState());
    expect(app.draw()!.winner).toBe(vencedorOriginal);

    localStorage.clear();
    fixture.destroy();
  });
});

describe('roteamento por hash', () => {
  it('reconhece um grupo sincronizado', () => {
    expect(readSyncedGroupId('#/g/abc123')).toBe('abc123');
    expect(readSyncedGroupId('/g/abc123')).toBe('abc123');
  });

  it('ignora o formato do modo por link', () => {
    expect(readSyncedGroupId('#grupo=WyJBIl0&inicio=2026-08')).toBe('');
  });

  it('ignora hash vazio ou lixo', () => {
    for (const hash of ['', '#', '#/g/', '#/g/tem espaço', '#/outro/abc', '#/g/a/b']) {
      expect(readSyncedGroupId(hash)).toBe('');
    }
  });

  it('aceita id longo do Firestore e recusa exagero', () => {
    expect(readSyncedGroupId('#/g/' + 'a'.repeat(20))).toHaveLength(20);
    expect(readSyncedGroupId('#/g/' + 'a'.repeat(65))).toBe('');
  });
});

describe('rota de criação', () => {
  it('reconhece #/novo', () => {
    expect(isNewGroupRoute('#/novo')).toBe(true);
    expect(isNewGroupRoute('#/novo/')).toBe(true);
    expect(isNewGroupRoute('/novo')).toBe(true);
  });

  it('não confunde com as outras rotas', () => {
    for (const hash of ['', '#', '#/g/abc', '#grupo=WyJBIl0', '#/novos', '#/novo/abc']) {
      expect(isNewGroupRoute(hash)).toBe(false);
    }
  });
});

describe('rota do álbum', () => {
  it('reconhece #/g/<id>/album', () => {
    expect(readAlbumGroupId('#/g/abc123/album')).toBe('abc123');
    expect(readAlbumGroupId('#/g/abc123/album/')).toBe('abc123');
    expect(readAlbumGroupId('/g/abc123/album')).toBe('abc123');
  });

  it('não rouba as rotas que já existiam', () => {
    for (const hash of ['', '#', '#/g/abc123', '#/novo', '#grupo=WyJBIl0&inicio=2026-08']) {
      expect(readAlbumGroupId(hash)).toBe('');
    }
    // E o caminho contrário: a máquina continua sendo só `#/g/<id>`.
    expect(readSyncedGroupId('#/g/abc123/album')).toBe('');
    expect(isNewGroupRoute('#/g/abc123/album')).toBe(false);
  });

  it('recusa lixo no lugar do id', () => {
    for (const hash of ['#/g//album', '#/g/tem espaço/album', '#/g/' + 'a'.repeat(65) + '/album']) {
      expect(readAlbumGroupId(hash)).toBe('');
    }
  });
});
