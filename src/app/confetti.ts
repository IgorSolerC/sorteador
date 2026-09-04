import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, effect, inject, input } from '@angular/core';

/**
 * O confete da entrega: o emoji da pessoa saindo da cápsula que acabou de abrir.
 *
 * Não é um segundo momento animado — é a última batida do único que existe. A cápsula
 * cai, a cúpula abre, e o que estava dentro sai. Por isso ele dispara junto com a
 * revelação e nunca sozinho, e por isso `prefers-reduced-motion` o desliga por inteiro
 * em vez de encurtá-lo: um confete de 120ms é um piscar, não uma versão contida.
 *
 * Canvas, e não elementos: setenta partículas no DOM custariam setenta reflows por
 * quadro, e nada aqui precisa ser lido nem clicado.
 */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  spin: number; angle: number; scale: number; life: number;
}

const COUNT = 64;
const GRAVITY = 1500;
const LIFE_MS = 2600;

@Component({
  selector: 'app-confetti',
  template: `<canvas class="confetti" aria-hidden="true"></canvas>`,
})
export class Confetti {
  /** Um contador. Cada valor novo é uma explosão; o valor em si não significa nada. */
  readonly burst = input<number>(0);
  /** O símbolo que sai. Vazio faz sair a própria cápsula da pessoa. */
  readonly emoji = input<string>('');
  readonly color = input<string>('#FFC53D');

  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  private frame = 0;
  private particles: Particle[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    effect(() => {
      // O primeiro valor é o estado inicial, não uma entrega: só a partir do primeiro
      // incremento existe uma cápsula que abriu.
      if (this.burst() > 0) this.fire();
    });
  }

  private fire(): void {
    const view = this.document.defaultView;
    if (!view) return;
    if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = this.host.nativeElement.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const ratio = Math.min(view.devicePixelRatio || 1, 2);
    const width = view.innerWidth;
    const height = view.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const origin = this.origin(width, height);
    this.particles = Array.from({ length: COUNT }, () => {
      // Um leque para cima e para os lados, como algo que arrebentou de dentro.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.85;
      const speed = 420 + Math.random() * 560;
      return {
        x: origin.x + (Math.random() - 0.5) * 26,
        y: origin.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 9,
        scale: 0.72 + Math.random() * 0.7,
        life: LIFE_MS * (0.72 + Math.random() * 0.28),
      };
    });

    this.stop();
    let previous = view.performance.now();
    const step = (now: number) => {
      // Uma aba em segundo plano devolve saltos enormes; travar o passo evita que as
      // partículas atravessem a tela inteira num quadro só quando ela volta.
      const delta = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      context.clearRect(0, 0, width, height);

      let alive = 0;
      for (const particle of this.particles) {
        particle.life -= delta * 1000;
        if (particle.life <= 0) continue;
        alive += 1;
        particle.vy += GRAVITY * delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.angle += particle.spin * delta;
        this.paint(context, particle);
      }

      if (alive) this.frame = view.requestAnimationFrame(step);
      else this.stop();
    };
    this.frame = view.requestAnimationFrame(step);
  }

  /**
   * A bandeja, quando a máquina está na tela: o confete sai de onde a cápsula abriu.
   * Sem ela — no álbum, ou depois de rolar a página —, o alto do centro serve.
   */
  private origin(width: number, height: number): { x: number; y: number } {
    const box = this.document.querySelector('.delivery')?.getBoundingClientRect();
    if (box && box.width > 0 && box.bottom > 0 && box.top < height) {
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    }
    return { x: width / 2, y: height * 0.18 };
  }

  private paint(context: CanvasRenderingContext2D, particle: Particle): void {
    const fade = Math.min(1, particle.life / 600);
    context.save();
    context.globalAlpha = fade;
    context.translate(particle.x, particle.y);
    context.rotate(particle.angle);

    const symbol = this.emoji();
    if (symbol) {
      const size = 26 * particle.scale;
      context.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(symbol, 0, 0);
    } else {
      // Sem emoji, sai a própria cápsula: cúpula colorida sobre casca clara.
      const w = 11 * particle.scale;
      const h = 15 * particle.scale;
      context.fillStyle = this.color();
      context.beginPath();
      context.arc(0, 0, w / 2, Math.PI, 0);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255, 255, 255, .74)';
      context.fillRect(-w / 2, 0, w, h / 2);
    }
    context.restore();
  }

  private stop(): void {
    if (this.frame) {
      this.document.defaultView?.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    // Sem partícula nenhuma não há o que limpar, e pedir um contexto de canvas à toa
    // acorda o aviso de "não implementado" em todo ambiente que não desenha de verdade.
    if (!this.particles.length) return;
    this.particles = [];
    // A tela fica limpa: um último quadro congelado de emojis pendurados no ar seria
    // um segundo elemento animado que parou no meio, e não o fim da entrega.
    const canvas = this.host.nativeElement.querySelector('canvas');
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }
}
