import { DOCUMENT } from '@angular/common';
import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Confetti } from './confetti';

describe('o confete do emoji', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('mantém as partículas novas e desenha o emoji no primeiro quadro', () => {
    const frames: FrameRequestCallback[] = [];
    const fillText = vi.fn();
    const context = {
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      restore: vi.fn(),
      fillText,
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
    const canvas = {
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const view = {
      matchMedia: () => ({ matches: false }),
      devicePixelRatio: 1,
      innerWidth: 1200,
      innerHeight: 800,
      performance: { now: () => 100 },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      },
      cancelAnimationFrame: vi.fn(),
    } as unknown as Window;
    const document = {
      defaultView: view,
      querySelector: () => null,
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
      emoji: () => string;
      fire(): void;
    };
    Object.defineProperty(confetti, 'emoji', { value: () => '🎮' });

    confetti.fire();
    expect(frames).toHaveLength(1);
    frames[0](116);

    expect(fillText).toHaveBeenCalledTimes(64);
    expect(fillText).toHaveBeenCalledWith('🎮', 0, 0);
  });
});
