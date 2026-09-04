import { DOCUMENT } from '@angular/common';
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Confetti } from './confetti';

/**
 * Um banco de canvas falso. O que estes testes medem não é o desenho — é quantas vezes
 * ele é pedido, e onde a folha assenta.
 */
function bench({ top = 0, left = 0 } = {}) {
  const frames: FrameRequestCallback[] = [];
  const sheet = fakeContext();
  const ink = fakeContext();

  const canvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '', top: '', left: '' },
    getContext: () => sheet,
    getBoundingClientRect: () => ({ top, left }),
  } as unknown as HTMLCanvasElement;

  const stamp = {
    width: 0,
    height: 0,
    getContext: () => ink,
  } as unknown as HTMLCanvasElement;

  const view = {
    matchMedia: () => ({ matches: false }),
    devicePixelRatio: 2,
    performance: { now: () => 100 },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    },
    cancelAnimationFrame: vi.fn(),
  } as unknown as Window;

  const document = {
    defaultView: view,
    documentElement: { clientWidth: 1200, clientHeight: 800 },
    querySelector: () => null,
    createElement: () => stamp,
  } as unknown as Document;

  const host = {
    nativeElement: { querySelector: () => canvas },
  } as unknown as ElementRef<HTMLElement>;

  TestBed.configureTestingModule({
    providers: [
      { provide: DOCUMENT, useValue: document },
      { provide: ElementRef, useValue: host },
    ],
  });

  const confetti = TestBed.runInInjectionContext(() => new Confetti()) as unknown as {
    fire(): void;
  };
  Object.defineProperty(confetti, 'emoji', { value: () => '🎮' });

  return { confetti, canvas, stamp, sheet, ink, frames };
}

function fakeContext() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('o confete do emoji', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rasteriza o emoji uma vez e copia o carimbo em cada partícula', () => {
    const { confetti, stamp, sheet, ink, frames } = bench();

    confetti.fire();
    expect(frames).toHaveLength(1);
    frames[0](116);

    // O defeito que isto tranca: um `fillText` por partícula e por quadro erra o cache de
    // glifos do navegador, e a conta engasga o desktop justamente por ele ter mais pixels.
    expect(ink.fillText).toHaveBeenCalledTimes(1);
    expect(ink.fillText).toHaveBeenCalledWith('🎮', 0, 0);
    expect(sheet.fillText).not.toHaveBeenCalled();
    expect(sheet.drawImage).toHaveBeenCalledTimes(64);
    const copies = (sheet.drawImage as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(copies.every((call) => call[0] === stamp)).toBe(true);
    // O carimbo nasce no maior tamanho sorteado e daí só encolhe: assim nenhuma partícula
    // é ampliada, que é o que borraria o emoji.
    expect(copies.every((call) => (call[3] as number) <= 56.001)).toBe(true);

    // Segundo quadro: continua sem rasterizar nada de novo.
    frames[1](132);
    expect(ink.fillText).toHaveBeenCalledTimes(1);
    expect(sheet.drawImage).toHaveBeenCalledTimes(128);
  });

  it('assenta a folha sobre a viewport de agora, para o confete rolar com a página', () => {
    const { confetti, canvas } = bench({ top: 240, left: 0 });

    confetti.fire();

    // A folha é absoluta: para cobrir a tela ela sobe o tanto que o bloco que a contém
    // desceu. Fixa, ela pairaria sobre a página enquanto o confete deveria ficar onde caiu.
    expect(canvas.style.top).toBe('-240px');
    expect(canvas.style.left).toBe('0px');
    expect(canvas.style.width).toBe('1200px');
    expect(canvas.style.height).toBe('800px');
    expect(canvas.width).toBe(2400);
  });

  it('encolhe a folha quando a última partícula morre', () => {
    const { confetti, canvas, frames } = bench();

    confetti.fire();
    let now = 116;
    for (let index = 0; index < frames.length && index < 200; index += 1) {
      now += 60;
      frames[index](now);
    }

    // Uma folha absoluta do tamanho da tela parada no documento continuaria sendo uma
    // camada de composição — e, no fim de uma página curta, uma barra de rolagem.
    expect(canvas.style.width).toBe('0px');
    expect(canvas.style.height).toBe('0px');
  });
});
