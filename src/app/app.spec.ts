import { TestBed } from '@angular/core/testing';

import { App, isNewGroupRoute, readAlbumGroupId, readSyncedGroupId } from './app';
import { Identity } from './identity';

/**
 * A casca faz duas coisas: guarda a porta e lê a rota. O que fica atrás dela tem teste
 * próprio; aqui o que importa é que ninguém passa sem se identificar.
 */
describe('App', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.location.hash = '';
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  afterEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('pergunta quem é a pessoa antes de qualquer outra coisa', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.gate')).toBeTruthy();
    // Nada da aplicação existe atrás da porta: nem a prateleira, nem a barra do topo.
    expect(raiz.querySelector('app-home')).toBeNull();
    expect(raiz.querySelector('.topbar-actions')).toBeNull();
    fixture.destroy();
  });

  it('um nome em branco não abre a porta', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    (raiz.querySelector('.gate-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(raiz.querySelector('.gate')).toBeTruthy();
    expect(raiz.querySelector('.field-error')?.textContent).toContain('Escreva seu nome');
    fixture.destroy();
  });

  it('quem já se identificou entra direto na prateleira', () => {
    TestBed.inject(Identity).remember('Igor Soler');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('.gate')).toBeNull();
    expect(raiz.querySelector('.home-stage')).toBeTruthy();
    expect(raiz.textContent).toContain('Igor');
    fixture.destroy();
  });

  it('o crachá do topo reabre a porta, agora com jeito de desistir', () => {
    TestBed.inject(Identity).remember('Igor Soler');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    (raiz.querySelector('.who-chip') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('.gate')).toBeTruthy();
    // Quem já está dentro pode voltar; quem nunca entrou, não tem para onde voltar.
    expect(raiz.textContent).toContain('Continuar como estou');
    fixture.destroy();
  });

  it('trocar de pessoa reescreve a assinatura e fecha a porta', async () => {
    const identity = TestBed.inject(Identity);
    identity.remember('Igor Soler');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;

    (raiz.querySelector('.who-chip') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const campo = raiz.querySelector('#gate-name') as HTMLInputElement;
    campo.value = 'Mariana Souza';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    // ngModel propaga num microtask: sem esperar, o Angular reescreve o valor antigo.
    await fixture.whenStable();
    fixture.detectChanges();
    (raiz.querySelector('.gate-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(identity.name()).toBe('Mariana Souza');
    expect(raiz.querySelector('.gate')).toBeNull();
    fixture.destroy();
  });
});

describe('rotas no fragmento', () => {
  it('reconhece a máquina de um grupo', () => {
    expect(readSyncedGroupId('#/g/abc123')).toBe('abc123');
    expect(readSyncedGroupId('#/g/abc123/album')).toBe('');
    expect(readSyncedGroupId('#/novo')).toBe('');
  });

  it('reconhece o álbum de um grupo', () => {
    expect(readAlbumGroupId('#/g/abc123/album')).toBe('abc123');
    expect(readAlbumGroupId('#/g/abc123/album/')).toBe('abc123');
    expect(readAlbumGroupId('#/g/abc123')).toBe('');
  });

  it('reconhece a oficina', () => {
    expect(isNewGroupRoute('#/novo')).toBe(true);
    expect(isNewGroupRoute('#/novo/')).toBe(true);
    expect(isNewGroupRoute('#/g/abc')).toBe(false);
  });

  it('um link do formato antigo não abre grupo nenhum', () => {
    // O modo por link saiu. Um link em circulação cai na prateleira, que explica o que
    // fazer, em vez de abrir uma máquina de mentira montada a partir do próprio endereço.
    const antigo = '#grupo=WyJaaWxkYSIsIll1cmkiXQ&inicio=2026-05';
    expect(readSyncedGroupId(antigo)).toBe('');
    expect(readAlbumGroupId(antigo)).toBe('');
    expect(isNewGroupRoute(antigo)).toBe(false);
  });
});
