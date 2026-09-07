import { TestBed } from '@angular/core/testing';

import { Identity } from './identity';
import { CAPSULE_PAINT, CapsulePaint, GateCapsule, IdentityGate, ROSTER_LOOKUP } from './identity-gate';
import { capsuleColor } from './palette';

/**
 * A porta é a única tela que todo mundo vê, e a única que não pode ser pulada. O que se
 * prova aqui é que ela não deixa passar em branco, que grava o nome normalizado, e que a
 * cápsula do lado é a mesma para o mesmo nome — a promessa que a coleção depois cumpre.
 */
function capsule(name: string, emoji = '', colorIndex = 4): GateCapsule {
  return {
    name,
    color: capsuleColor(colorIndex),
    ink: '#0a1830',
    emoji,
    initials: name.slice(0, 1).toUpperCase(),
    key: name.toLowerCase(),
    colorIndex,
    memberId: `id-${name.toLowerCase()}`,
  };
}

/** As pinturas que a porta pediu ao servidor, para o teste conferir o que ela grava. */
const pinturas: { memberId: string; colorIndex: number; emoji: string; actor: string }[] = [];

async function render({
  groupId = '',
  changing = false,
  roster = [] as readonly GateCapsule[],
  lookup = null as null | (() => Promise<readonly GateCapsule[]>),
  paint = null as null | CapsulePaint,
} = {}) {
  await TestBed.configureTestingModule({
    imports: [IdentityGate],
    providers: [
      { provide: ROSTER_LOOKUP, useValue: lookup ?? (async () => roster) },
      {
        provide: CAPSULE_PAINT,
        useValue: paint ?? (async (_id: string, memberId: string, style: { colorIndex: number; emoji: string }, actor: string) => {
          pinturas.push({ memberId, ...style, actor });
        }),
      },
    ],
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
    (el(fixture).querySelector('.gate-back') as HTMLButtonElement).click();

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

  it('a porta não tem mais painel de preferência nenhuma', async () => {
    // O lacre da nota deixou de ser um interruptor por aparelho, e o som mora na máquina.
    const fixture = await render({ changing: true });
    expect(el(fixture).querySelector('.gate-switch')).toBeNull();
    expect(el(fixture).querySelector('.gate-prefs')).toBeNull();
    fixture.destroy();
  });

  it('quem está trocando de pessoa volta por um botão de voltar, e não por uma terceira resposta', async () => {
    const fixture = await render({ changing: true });
    TestBed.inject(Identity).remember('Igor Soler');
    fixture.detectChanges();
    let desistiu = 0;
    fixture.componentInstance.cancelled.subscribe(() => (desistiu += 1));

    expect(el(fixture).textContent).not.toContain('Continuar como estou');
    (el(fixture).querySelector('.gate-back') as HTMLButtonElement).click();

    expect(desistiu).toBe(1);
    expect(TestBed.inject(Identity).name()).toBe('Igor Soler');
    fixture.destroy();
  });
});

describe('a bancada da porta: repintar a própria cápsula', () => {
  beforeEach(() => {
    window.localStorage.clear();
    pinturas.length = 0;
  });
  afterEach(() => {
    window.localStorage.clear();
    TestBed.resetTestingModule();
  });

  /** A porta de um grupo, com o crachá de alguém que o globo já conhece. */
  async function comCracha(name = 'Ana Paula', roster = [capsule('Ana Paula', '🦄', 7), capsule('Breno')]) {
    window.localStorage.setItem('mesa-do-mes:autor:v1', name);
    return render({ groupId: 'demo', changing: true, roster });
  }

  it('quem o globo não conhece não recebe a bancada', async () => {
    // A porta continua sendo uma pergunta só para quem chega: não há cápsula dela ainda.
    const fixture = await comCracha('Zé de Fora');
    expect(el(fixture).querySelector('.gate-paint')).toBeNull();
    fixture.destroy();
  });

  it('fora de um grupo não há cápsula a pintar', async () => {
    window.localStorage.setItem('mesa-do-mes:autor:v1', 'Ana Paula');
    const fixture = await render({ changing: true });
    expect(el(fixture).querySelector('.gate-paint')).toBeNull();
    fixture.destroy();
  });

  it('quem o globo reconhece vê a própria cápsula, e não um ensaio pelo nome', async () => {
    // Era a única tela do produto onde a cor de uma pessoa não era a que ela escolheu:
    // aqui ela saía de um hash do nome, e a máquina, o registro e o álbum diziam outra.
    const fixture = await comCracha();
    const componente = fixture.componentInstance as unknown as { color(): string };

    expect(componente.color()).toBe(capsuleColor(7));
    expect(el(fixture).querySelector('.gate-initials')?.textContent?.trim()).toBe('🦄');
    expect(el(fixture).querySelector('.gate-paint')?.textContent).toContain('🦄');
    fixture.destroy();
  });

  it('a cápsula grande é a prévia da pintura, enquanto ela é escolhida', async () => {
    const fixture = await comCracha();
    (el(fixture).querySelector('.gate-paint') as HTMLButtonElement).click();
    fixture.detectChanges();
    const componente = fixture.componentInstance as unknown as { color(): string };

    (el(fixture).querySelectorAll('.color-chip')[19] as HTMLButtonElement).click();
    (el(fixture).querySelector('.emoji-grid .emoji-chip') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(componente.color()).toBe(capsuleColor(19));
    expect(el(fixture).querySelector('.gate-initials')?.textContent?.trim()).toBe('🎮');
    // A porta troca de face, e não de camada: a pergunta sai de cena em vez de ficar atrás.
    expect(el(fixture).querySelector('.gate-copy')).toBeNull();
    fixture.destroy();
  });

  it('salvar grava a posição na paleta, assinada por quem escolheu', async () => {
    const fixture = await comCracha();
    (el(fixture).querySelector('.gate-paint') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelectorAll('.color-chip')[19] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(pinturas).toEqual([
      { memberId: 'id-ana paula', colorIndex: 19, emoji: '🦄', actor: 'Ana Paula' },
    ]);
    // Confirmado pelo servidor, a porta volta e já mostra a cápsula nova em toda parte.
    expect(el(fixture).querySelector('.gate-bench')).toBeNull();
    expect(el(fixture).querySelector('.gate-painted')?.textContent).toContain('terracota');
    expect(el(fixture).querySelector('.gate-person-capsule')?.getAttribute('style')?.toUpperCase())
      .toContain(capsuleColor(19).toUpperCase());
    fixture.destroy();
  });

  it('sem mudar nada, não há o que gravar', async () => {
    const fixture = await comCracha();
    (el(fixture).querySelector('.gate-paint') as HTMLButtonElement).click();
    fixture.detectChanges();

    const salvar = el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement;
    expect(salvar.disabled).toBe(true);
    fixture.destroy();
  });

  it('uma gravação que falha não leva embora a cor escolhida', async () => {
    // Voltar para a porta ao falhar obrigaria a pessoa a escolher tudo de novo sem saber
    // por quê. É a mesma regra da bancada da gaveta.
    window.localStorage.setItem('mesa-do-mes:autor:v1', 'Ana Paula');
    const fixture = await render({
      groupId: 'demo',
      changing: true,
      roster: [capsule('Ana Paula', '🦄', 7)],
      paint: async () => { throw new Error('cota estourada'); },
    });
    (el(fixture).querySelector('.gate-paint') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelectorAll('.color-chip')[19] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el(fixture).querySelector('.gate-bench')).not.toBeNull();
    expect(el(fixture).querySelector('.gate-bench .field-error')?.textContent)
      .toContain('Tente de novo');
    expect((fixture.componentInstance as unknown as { color(): string }).color())
      .toBe(capsuleColor(19));
    fixture.destroy();
  });

  it('desistir da bancada apaga o erro dela', async () => {
    // Um "Tente de novo" ao lado da linha de entrada alertaria sobre uma tentativa que a
    // pessoa já abandonou — e que ela não tem como repetir sem reabrir a bancada.
    window.localStorage.setItem('mesa-do-mes:autor:v1', 'Ana Paula');
    const fixture = await render({
      groupId: 'demo',
      changing: true,
      roster: [capsule('Ana Paula', '🦄', 7)],
      paint: async () => { throw new Error('cota estourada'); },
    });
    (el(fixture).querySelector('.gate-paint') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelectorAll('.color-chip')[19] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelector('.note-actions .secondary-action') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el(fixture).querySelector('.gate-bench .field-error')).not.toBeNull();

    (el(fixture).querySelector('.note-actions .note-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el(fixture).querySelector('.gate-mine .field-error')).toBeNull();
    fixture.destroy();
  });

  it('voltar da bancada devolve a porta sem gravar nada', async () => {
    const fixture = await comCracha();
    (el(fixture).querySelector('.gate-paint') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el(fixture).querySelectorAll('.color-chip')[19] as HTMLButtonElement).click();
    fixture.detectChanges();

    (el(fixture).querySelector('.note-actions .note-cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(pinturas).toEqual([]);
    expect(el(fixture).querySelector('.gate-copy')).not.toBeNull();
    expect((fixture.componentInstance as unknown as { color(): string }).color())
      .toBe(capsuleColor(7));
    fixture.destroy();
  });

  it('digitar o nome de outra pessoa devolve a cápsula ao ensaio', async () => {
    // Mostrar a MINHA cor debaixo do nome de outra pessoa mentiria sobre as duas.
    const fixture = await comCracha();
    (el(fixture).querySelector('.gate-otherwise') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await digitar(fixture, 'Zulmira');

    expect((fixture.componentInstance as unknown as { color(): string }).color())
      .not.toBe(capsuleColor(7));
    expect(el(fixture).querySelector('.gate-initials')?.textContent?.trim()).toBe('Z');
    fixture.destroy();
  });
});
