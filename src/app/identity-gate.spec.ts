import { TestBed } from '@angular/core/testing';

import { Identity } from './identity';
import { IdentityGate } from './identity-gate';

/**
 * A porta é a única tela que todo mundo vê, e a única que não pode ser pulada. O que se
 * prova aqui é que ela não deixa passar em branco, que grava o nome normalizado, e que a
 * cápsula do lado é a mesma para o mesmo nome — a promessa que a coleção depois cumpre.
 */
async function render() {
  await TestBed.configureTestingModule({ imports: [IdentityGate] }).compileComponents();
  const fixture = TestBed.createComponent(IdentityGate);
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
