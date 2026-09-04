import { TestBed } from '@angular/core/testing';

import { SpinRecord } from './group-log';
import { NoteEditor } from './note-editor';

/**
 * A bancada é só formulário: ela não fala com o servidor. O que se prova aqui é que o
 * rascunho da pessoa chega inteiro em quem vai gravá-lo, e que nada o apaga pelo caminho.
 */

function spinRecord(overrides: Partial<SpinRecord> = {}): SpinRecord {
  return {
    index: 0,
    round: 1,
    at: Date.parse('2026-08-02T19:30:00Z'),
    eligible: ['a', 'b'],
    winnerId: 'a',
    winnerName: 'Gustavo',
    note: null,
    ...overrides,
  };
}

async function render(spin: SpinRecord) {
  await TestBed.configureTestingModule({ imports: [NoteEditor] }).compileComponents();
  const fixture = TestBed.createComponent(NoteEditor);
  fixture.componentRef.setInput('spin', spin);
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

describe('bancada da etiqueta', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('abre em branco para um giro sem etiqueta', async () => {
    const fixture = await render(spinRecord());
    expect((el(fixture).querySelector('#note-title') as HTMLInputElement).value).toBe('');
    expect(el(fixture).textContent).toContain('Colar etiqueta');
    expect(el(fixture).querySelector('.note-remove')).toBeNull();
    fixture.destroy();
  });

  it('parte do que já está gravado quando a etiqueta existe', async () => {
    const fixture = await render(spinRecord({
      note: { subtitle: '', title: 'Tetris', description: 'Nota 7/10', at: Date.now(), revision: 1 },
    }));

    expect((el(fixture).querySelector('#note-title') as HTMLInputElement).value).toBe('Tetris');
    expect((el(fixture).querySelector('#note-description') as HTMLTextAreaElement).value)
      .toBe('Nota 7/10');
    expect(el(fixture).textContent).toContain('Salvar etiqueta');
    expect(el(fixture).querySelector('.note-remove')).not.toBeNull();
    fixture.destroy();
  });

  it('entrega o que foi digitado a quem vai gravar', async () => {
    const fixture = await render(spinRecord());
    let entregue: { title: string; subtitle: string; description: string } | null = null;
    fixture.componentInstance.commit.subscribe((v) => (entregue = v));

    await digitar(fixture, 'note-title', 'Click The Button!');
    await digitar(fixture, 'note-subtitle', 'Nota 8/10');
    await digitar(fixture, 'note-description', 'Jogamos em cinco.');
    (el(fixture).querySelector('.note-actions button[type="submit"]') as HTMLButtonElement).click();

    expect(entregue).toEqual({
      title: 'Click The Button!',
      subtitle: 'Nota 8/10',
      description: 'Jogamos em cinco.',
    });
    fixture.destroy();
  });

  it('um erro não apaga o rascunho', async () => {
    const fixture = await render(spinRecord());
    await digitar(fixture, 'note-title', 'Pico Park');

    // É assim que o pai reage a uma recusa do servidor: erro na bancada, bancada aberta.
    fixture.componentRef.setInput('error', 'O servidor recusou a operação.');
    fixture.detectChanges();

    expect((el(fixture).querySelector('#note-title') as HTMLInputElement).value).toBe('Pico Park');
    expect(el(fixture).querySelector('.field-error')?.textContent).toContain('recusou');
    fixture.destroy();
  });

  it('enquanto salva, nada é entregue duas vezes', async () => {
    const fixture = await render(spinRecord());
    let vezes = 0;
    fixture.componentInstance.commit.subscribe(() => (vezes += 1));

    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    const botao = el(fixture).querySelector('.note-actions button[type="submit"]') as HTMLButtonElement;

    expect(botao.disabled).toBe(true);
    expect(el(fixture).textContent).toContain('Colando…');
    expect(vezes).toBe(0);
    fixture.destroy();
  });

  it('os campos param no limite que o servidor mede', async () => {
    const fixture = await render(spinRecord());
    const titulo = el(fixture).querySelector('#note-title') as HTMLInputElement;
    const descricao = el(fixture).querySelector('#note-description') as HTMLTextAreaElement;

    expect(titulo.getAttribute('maxlength')).toBe('80');
    expect(descricao.getAttribute('maxlength')).toBe('280');
    fixture.destroy();
  });

  it('o contador acusa quando o campo enche', async () => {
    const fixture = await render(spinRecord());
    await digitar(fixture, 'note-title', 'x'.repeat(80));

    const contador = el(fixture).querySelector('.note-field-head b');
    expect(contador?.textContent?.trim()).toBe('80/80');
    expect(contador?.classList.contains('is-full')).toBe(true);
    fixture.destroy();
  });

  it('cancelar e Esc pedem para fechar sem gravar', async () => {
    const fixture = await render(spinRecord());
    let fechou = 0;
    let gravou = 0;
    fixture.componentInstance.dismiss.subscribe(() => (fechou += 1));
    fixture.componentInstance.commit.subscribe(() => (gravou += 1));

    (el(fixture).querySelector('.note-cancel') as HTMLButtonElement).click();
    el(fixture).querySelector('#note-card')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fechou).toBe(2);
    expect(gravou).toBe(0);
    fixture.destroy();
  });

  it('trocar de giro troca o rascunho', async () => {
    const fixture = await render(spinRecord());
    await digitar(fixture, 'note-title', 'Do primeiro giro');

    fixture.componentRef.setInput('spin', spinRecord({
      index: 3,
      winnerName: 'Elisa',
      note: { subtitle: '', title: 'Do quarto', description: '', at: Date.now(), revision: 1 },
    }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((el(fixture).querySelector('#note-title') as HTMLInputElement).value).toBe('Do quarto');
    expect(el(fixture).textContent).toContain('Elisa');
    expect(el(fixture).textContent).toContain('Cápsula 4');
    fixture.destroy();
  });
});
