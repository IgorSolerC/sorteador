import { TestBed } from '@angular/core/testing';

import { Identity } from './identity';
import { GateCapsule, IdentityGate, ROSTER_LOOKUP } from './identity-gate';
import { Preferences } from './preferences';

/**
 * A porta é a única tela que todo mundo vê, e a única que não pode ser pulada. O que se
 * prova aqui é que ela não deixa passar em branco, que grava o nome normalizado, e que a
 * cápsula do lado é a mesma para o mesmo nome — a promessa que a coleção depois cumpre.
 */
function capsule(name: string, emoji = ''): GateCapsule {
  return {
    name,
    color: '#5EE7FF',
    ink: '#0a1830',
    emoji,
    initials: name.slice(0, 1).toUpperCase(),
    key: name.toLowerCase(),
  };
}

async function render({
  groupId = '',
  changing = false,
  roster = [] as readonly GateCapsule[],
  lookup = null as null | (() => Promise<readonly GateCapsule[]>),
} = {}) {
  await TestBed.configureTestingModule({
    imports: [IdentityGate],
    providers: [{ provide: ROSTER_LOOKUP, useValue: lookup ?? (async () => roster) }],
  }).compileComponents();
  const fixture = TestBed.createComponent(IdentityGate);
  fixture.componentRef.setInput('groupId', groupId);
  fixture.componentRef.setInput('changing', changing);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

const el = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

async function digitar(
  fixture: Awaited<ReturnType<typeof render>>,
  texto: string,
): Promise<void> {
  const campo = el(fixture).querySelector('#gate-name') as HTMLInputElement;
  campo.value = texto;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  fixture.detectChanges();
}

function enviar(fixture: Awaited<ReturnType<typeof render>>): void {
  (el(fixture).querySelector('.gate-form') as HTMLFormElement)
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

describe('a porta', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('recusa entrar sem nome e diz por quê', async () => {
    const fixture = await render();
    let saiu = 0;
    fixture.componentInstance.done.subscribe(() => (saiu += 1));

    enviar(fixture);

    expect(saiu).toBe(0);
    expect(el(fixture).querySelector('.field-error')?.textContent).toContain('Escreva seu nome');
    fixture.destroy();
  });

  it('um nome só de espaços também é nome nenhum', async () => {
    const fixture = await render();
    await digitar(fixture, '    ');
    enviar(fixture);

    expect(TestBed.inject(Identity).name()).toBe('');
    expect(el(fixture).querySelector('.field-error')).not.toBeNull();
    fixture.destroy();
  });

  it('grava o nome normalizado e abre a passagem', async () => {
    const fixture = await render();
    let saiu = 0;
    fixture.componentInstance.done.subscribe(() => (saiu += 1));

    await digitar(fixture, '  Mariana   Souza  ');
    enviar(fixture);

    expect(TestBed.inject(Identity).name()).toBe('Mariana Souza');
    expect(saiu).toBe(1);
    fixture.destroy();
  });

  it('a cápsula se monta enquanto a pessoa digita', async () => {
    const fixture = await render();
    expect(el(fixture).querySelector('.gate-initials')?.textContent?.trim()).toBe('');

    await digitar(fixture, 'Mariana Souza');
    expect(el(fixture).querySelector('.gate-initials')?.textContent?.trim()).toBe('MS');
    fixture.destroy();
  });

  it('o mesmo nome dá sempre a mesma cor', async () => {
    const primeira = await render();
    await digitar(primeira, 'Mariana Souza');
    const cor = (primeira.componentInstance as unknown as { color(): string }).color();
    primeira.destroy();
    TestBed.resetTestingModule();

    const segunda = await render();
    await digitar(segunda, 'mariana souza');
    expect((segunda.componentInstance as unknown as { color(): string }).color()).toBe(cor);
    expect(cor).toMatch(/^#[0-9A-F]{6}$/);
    segunda.destroy();
  });

  it('quem já entrou pode desistir da troca sem perder o nome', async () => {
    const fixture = await render();
    TestBed.inject(Identity).remember('Igor Soler');
    fixture.componentRef.setInput('changing', true);
    fixture.detectChanges();

    let desistiu = 0;
    fixture.componentInstance.cancelled.subscribe(() => (desistiu += 1));
    (el(fixture).querySelector('.gate-actions .text-link') as HTMLButtonElement).click();

    expect(desistiu).toBe(1);
    expect(TestBed.inject(Identity).name()).toBe('Igor Soler');
    fixture.destroy();
  });
});

describe('a porta oferece as cápsulas que o grupo já tem', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('fora de um grupo, ela continua sendo um campo de texto', async () => {
    // A prateleira e a oficina não têm lista nenhuma a oferecer.
    const fixture = await render();
    expect(el(fixture).querySelector('.gate-people')).toBeNull();
    expect(el(fixture).querySelector('#gate-name')).not.toBeNull();
    fixture.destroy();
  });

  it('num grupo, ela mostra uma cápsula por pessoa do globo', async () => {
    const fixture = await render({
      groupId: 'demo',
      roster: [capsule('Ana Paula', '🦄'), capsule('Breno')],
    });
    const nomes = [...el(fixture).querySelectorAll('.gate-person')]
      .map((botao) => botao.textContent?.trim());

    expect(nomes.length).toBe(2);
    expect(nomes[0]).toContain('Ana Paula');
    expect(nomes[0]).toContain('🦄');
    fixture.destroy();
  });

  it('tocar numa cápsula entra com o nome EXATO do globo', async () => {
    // É o defeito que isto existe para fechar: digitar "Ana" onde o globo diz "Ana Paula"
    // cria uma segunda pessoa em silêncio, e o álbum só conta isso meses depois.
    const fixture = await render({ groupId: 'demo', roster: [capsule('Ana Paula')] });
    let saiu = 0;
    fixture.componentInstance.done.subscribe(() => (saiu += 1));

    (el(fixture).querySelector('.gate-person') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(TestBed.inject(Identity).name()).toBe('Ana Paula');
    expect(saiu).toBe(1);
    fixture.destroy();
  });

  it('com lista, digitar é o caminho de baixo — e ele continua existindo', async () => {
    const fixture = await render({ groupId: 'demo', roster: [capsule('Ana Paula')] });

    expect(el(fixture).querySelector('#gate-name')).toBeNull();
    (el(fixture).querySelector('.gate-otherwise') as HTMLButtonElement).click();
    fixture.detectChanges();
    // O campo acabou de nascer dentro de um `@if`, e o `ngModel` dele só se liga no
    // microtask seguinte: sem esperar, o `input` do teste bate num campo sem ligação.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el(fixture).querySelector('#gate-name')).not.toBeNull();
    await digitar(fixture, 'Zé de Fora');
    enviar(fixture);
    expect(TestBed.inject(Identity).name()).toBe('Zé de Fora');
    fixture.destroy();
  });

  it('uma busca que falha não tranca a porta', async () => {
    // Cota estourada, grupo inexistente, rede caída: nada disso pode impedir alguém de
    // entrar. Sem lista, digitar continua sendo o caminho — e é o que sempre foi.
    const fixture = await render({
      groupId: 'demo',
      lookup: async () => { throw new Error('cota estourada'); },
    });

    expect(el(fixture).querySelector('.gate-people')).toBeNull();
    expect(el(fixture).querySelector('#gate-name')).not.toBeNull();
    fixture.destroy();
  });

  it('na primeira visita a porta é uma pergunta só, sem painel de preferências', async () => {
    const fixture = await render({ changing: false });
    expect(el(fixture).querySelector('.gate-prefs')).toBeNull();
    fixture.destroy();
  });

  it('quem já entrou uma vez encontra o modo cego ao trocar de pessoa', async () => {
    const fixture = await render({ changing: true });
    const chave = el(fixture).querySelector('.gate-switch') as HTMLButtonElement;
    expect(chave.getAttribute('aria-pressed')).toBe('false');

    chave.click();
    fixture.detectChanges();

    expect(TestBed.inject(Preferences).blind()).toBe(true);
    expect(chave.getAttribute('aria-pressed')).toBe('true');
    fixture.destroy();
  });
});
