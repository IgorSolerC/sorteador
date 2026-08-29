import { TestBed } from '@angular/core/testing';
import { App, readSyncedGroupId } from './app';

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
    // O clube rodou agosto/2026 com seis pessoas; agora entra a sétima.
    const clube = ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima'];
    localStorage.setItem(
      'mesa-do-mes:configuration:v1',
      JSON.stringify({ participants: clube, startMonth: '2026-08' }),
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
