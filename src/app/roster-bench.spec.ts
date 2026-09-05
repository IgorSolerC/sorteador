import { TestBed } from '@angular/core/testing';

import { GroupMember } from './group-log';
import { CAPSULE_COLORS, capsuleColor } from './palette';
import { CapsuleStyle, RosterBench } from './roster-bench';

/**
 * A gaveta é só formulário: ela não fala com o servidor. O que se prova aqui é que a
 * escolha de cor e emoji chega inteira em quem vai gravá-la, que a gaveta nunca abre uma
 * segunda camada, e que ela só volta para a lista quando a gravação foi confirmada.
 */
function member(overrides: Partial<GroupMember> = {}): GroupMember {
  return {
    id: 'a1',
    name: 'Gustavo Lima',
    active: true,
    joinedAt: 1,
    leftAt: null,
    colorIndex: 0,
    emoji: '',
    ...overrides,
  };
}

async function render(members: readonly GroupMember[]) {
  await TestBed.configureTestingModule({ imports: [RosterBench] }).compileComponents();
  const fixture = TestBed.createComponent(RosterBench);
  fixture.componentRef.setInput('members', members);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

const el = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

function abrirCapsula(fixture: Awaited<ReturnType<typeof render>>, indice = 0): void {
  ([...el(fixture).querySelectorAll('.capsule-row')][indice] as HTMLButtonElement).click();
  fixture.detectChanges();
}

describe('a gaveta dos integrantes', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('abre na lista, com uma linha por cápsula', async () => {
    const fixture = await render([member(), member({ id: 'b2', name: 'Ana' })]);

    expect(el(fixture).querySelectorAll('.capsule-row')).toHaveLength(2);
    expect(el(fixture).querySelector('.color-grid')).toBeNull();
    fixture.destroy();
  });

  it('a bancada de uma cápsula troca a face da gaveta, sem empilhar outra', async () => {
    // Dois modais sobrepostos deixariam dois véus e dois `aria-modal` disputando o Esc.
    const fixture = await render([member()]);
    abrirCapsula(fixture);

    expect(el(fixture).querySelectorAll('[aria-modal="true"]')).toHaveLength(1);
    expect(el(fixture).querySelectorAll('.roster-scrim')).toHaveLength(1);
    expect(el(fixture).querySelector('.color-grid')).toBeTruthy();
    expect(el(fixture).querySelector('.capsule-row')).toBeNull();
    fixture.destroy();
  });

  it('oferece a paleta inteira, cada cor com o próprio nome', async () => {
    const fixture = await render([member()]);
    abrirCapsula(fixture);
    const chips = [...el(fixture).querySelectorAll('.color-chip')];

    expect(chips).toHaveLength(CAPSULE_COLORS.length);
    expect(chips.every((c) => (c.getAttribute('aria-label') ?? '').length > 0)).toBe(true);
    fixture.destroy();
  });

  it('a cor escolhida chega em quem vai gravar', async () => {
    const fixture = await render([member({ colorIndex: 0 })]);
    let gravado: CapsuleStyle | null = null;
    fixture.componentInstance.restyle.subscribe((v) => (gravado = v));

    abrirCapsula(fixture);
    ([...el(fixture).querySelectorAll('.color-chip')][7] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement).click();

    expect(gravado).toEqual({ memberId: 'a1', colorIndex: 7, emoji: '' });
    fixture.destroy();
  });

  it('o emoji escolhido chega junto, e clicar de novo o retira', async () => {
    const fixture = await render([member()]);
    let gravado: CapsuleStyle | null = null;
    fixture.componentInstance.restyle.subscribe((v) => (gravado = v));

    abrirCapsula(fixture);
    const primeiro = el(fixture).querySelector('.emoji-chip') as HTMLButtonElement;
    primeiro.click();
    fixture.detectChanges();
    expect(primeiro.getAttribute('aria-pressed')).toBe('true');

    primeiro.click();
    fixture.detectChanges();
    expect(primeiro.getAttribute('aria-pressed')).toBe('false');

    primeiro.click();
    fixture.detectChanges();
    (el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement).click();

    expect(gravado).not.toBeNull();
    expect((gravado as unknown as CapsuleStyle).emoji.length).toBeGreaterThan(0);
    fixture.destroy();
  });

  it('a prévia mostra a cápsula que a pessoa vai ficar', async () => {
    const fixture = await render([member({ colorIndex: 0 })]);
    abrirCapsula(fixture);

    ([...el(fixture).querySelectorAll('.color-chip')][3] as HTMLButtonElement).click();
    fixture.detectChanges();
    const previa = el(fixture).querySelector('.capsule-preview') as HTMLElement;

    expect(previa.style.getPropertyValue('--capsule')).toBe(capsuleColor(3));
    // Sem emoji, a prévia mostra as iniciais; com emoji, o emoji.
    expect(el(fixture).querySelector('.capsule-preview-mark')?.textContent?.trim()).toBe('GL');
    (el(fixture).querySelector('.emoji-chip') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el(fixture).querySelector('.capsule-preview-mark')?.textContent?.trim()).not.toBe('GL');
    fixture.destroy();
  });

  it('sem nada mudado, não há o que gravar', async () => {
    // Uma escrita que não muda nada custa uma escrita da cota e polui o registro.
    const fixture = await render([member({ colorIndex: 4, emoji: '🎮' })]);
    abrirCapsula(fixture);
    const salvar = el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement;

    expect(salvar.disabled).toBe(true);
    fixture.destroy();
  });

  it('a gaveta só volta para a lista quando a gravação é confirmada', async () => {
    const fixture = await render([member()]);
    abrirCapsula(fixture);
    ([...el(fixture).querySelectorAll('.color-chip')][6] as HTMLButtonElement).click();
    fixture.detectChanges();

    // Enquanto o servidor não confirmou, a escolha continua na tela.
    expect(el(fixture).querySelector('.color-grid')).toBeTruthy();

    fixture.componentRef.setInput('restyled', 1);
    fixture.detectChanges();
    expect(el(fixture).querySelector('.color-grid')).toBeNull();
    expect(el(fixture).querySelector('.capsule-row')).toBeTruthy();
    fixture.destroy();
  });

  it('depois de salvar uma cápsula ainda abre a bancada de outra pessoa', async () => {
    const fixture = await render([member(), member({ id: 'b2', name: 'Ana' })]);
    abrirCapsula(fixture);
    fixture.componentRef.setInput('restyled', 1);
    fixture.detectChanges();

    abrirCapsula(fixture, 1);
    fixture.detectChanges();

    expect(el(fixture).querySelector('.color-grid')).toBeTruthy();
    expect(el(fixture).querySelector('.capsule-title')?.textContent).toContain('Ana');
    fixture.destroy();
  });

  it('tirar do globo avisa quem vai gravar', async () => {
    const fixture = await render([member()]);
    let removido: GroupMember | null = null;
    fixture.componentInstance.remove.subscribe((v) => (removido = v));

    abrirCapsula(fixture);
    (el(fixture).querySelector('.note-remove') as HTMLButtonElement).click();

    expect((removido as unknown as GroupMember)?.id).toBe('a1');
    fixture.destroy();
  });

  it('um nome em branco não vai à rede', async () => {
    const fixture = await render([]);
    let pedidos = 0;
    fixture.componentInstance.add.subscribe(() => (pedidos += 1));

    (el(fixture).querySelector('.add-form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(pedidos).toBe(0);
    expect(el(fixture).querySelector('.field-error')?.textContent).toContain('Digite um nome');
    fixture.destroy();
  });

  it('o globo vazio se explica em vez de ficar em branco', async () => {
    const fixture = await render([]);
    expect(el(fixture).querySelector('.roster-empty')?.textContent).toContain('globo está vazio');
    fixture.destroy();
  });
});
