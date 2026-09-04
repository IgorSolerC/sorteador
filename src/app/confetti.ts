import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, effect, inject, input, untracked } from '@angular/core';

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
 *
 * A folha é absoluta e fica onde nasceu, então rolar a página leva o confete junto — o
 * que a entrega derrubou caiu num lugar, e não na tela de quem olha.
 */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  spin: number; angle: number; scale: number; life: number;
}

const COUNT = 64;
const GRAVITY = 1500;
const LIFE_MS = 2600;
/** O maior `scale` que uma partícula sorteia: o carimbo nasce nele e daí só encolhe. */
const MAX_SCALE = 1.42;
const EMOJI_SIZE = 26;
const CAPSULE_WIDTH = 11;
const CAPSULE_HEIGHT = 15;
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

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

  /** Uma partícula rasterizada uma vez; daí em diante ela é copiada, nunca redesenhada. */
  private stamp: HTMLCanvasElement | null = null;
  private stampKey = '';
  /** Metade do lado do carimbo, em pixels de CSS e no tamanho em que ele foi rasterizado. */
  private stampReach = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    effect(() => {
      // O primeiro valor é o estado inicial, não uma entrega: só a partir do primeiro
      // incremento existe uma cápsula que abriu.
      //
      // `untracked` porque montar o carimbo lê o emoji e a cor. Sem ele o efeito passaria
      // a observar os dois, e repintar a cápsula de quem acabou de ganhar soltaria um
      // confete que ninguém pediu — a Regra do Momento Único quebrada por um clique na
      // gaveta da coleção.
      if (this.burst() > 0) untracked(() => this.fire());
    });
  }

  private fire(): void {
    const view = this.document.defaultView;
    if (!view) return;
    if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = this.host.nativeElement.querySelector('canvas');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    // Uma entrega nova interrompe a anterior, e interromper vem antes de tudo: a limpeza
    // depois de semear esvaziava a chuva antes do primeiro quadro.
    this.stop();

    const ratio = Math.min(view.devicePixelRatio || 1, 2);
    // A viewport sem as barras de rolagem. `innerWidth` as inclui, e uma folha absoluta
    // dessa largura empurraria uma barra horizontal para dentro da página por 2,6s.
    const page = this.document.documentElement;
    const width = page.clientWidth;
    const height = page.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.place(canvas);
    if (!this.carve(ratio)) return;

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
   * Assenta a folha exatamente sobre a viewport de agora, e a deixa lá: o confete rola
   * com a página em vez de pairar sobre ela.
   *
   * O deslocamento é medido, não calculado a partir do scroll — assim ele continua certo
   * se um dia a folha nascer dentro de um ancestral posicionado.
   */
  private place(canvas: HTMLCanvasElement): void {
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    const box = canvas.getBoundingClientRect();
    canvas.style.top = `${-box.top}px`;
    canvas.style.left = `${-box.left}px`;
  }

  /**
   * Rasteriza a partícula uma única vez, no maior tamanho que ela pode ter.
   *
   * `fillText` de emoji sob rotação erra o cache de glifos do navegador em toda chamada, e
   * o preço acompanha a área do canvas: medido no Chrome, 64 emojis girando custavam 109ms
   * por quadro numa tela de 2560x1440 e 43ms numa de celular — o mesmo defeito, invisível
   * no aparelho pequeno. Copiando um carimbo pronto, os três tamanhos passam a fechar o
   * quadro dentro do intervalo do monitor.
   */
  private carve(ratio: number): boolean {
    const symbol = this.emoji();
    const color = this.color();
    const key = `${symbol}|${color}|${ratio}`;
    if (this.stamp && this.stampKey === key) return true;

    // O alcance é medido a partir do centro de rotação, que no emoji é o meio do glifo e
    // na cápsula é a costura — por isso a metade mais alta dela é que dita o quadrado.
    const reach = symbol
      ? Math.ceil(EMOJI_SIZE * MAX_SCALE * 0.75)
      : Math.ceil((CAPSULE_HEIGHT / 2) * MAX_SCALE) + 1;

    const stamp = this.document.createElement('canvas');
    stamp.width = Math.round(reach * 2 * ratio);
    stamp.height = stamp.width;
    const ink = stamp.getContext('2d');
    if (!ink) return false;
    ink.setTransform(ratio, 0, 0, ratio, reach * ratio, reach * ratio);

    if (symbol) {
      ink.font = `${EMOJI_SIZE * MAX_SCALE}px ${EMOJI_FONT}`;
      ink.textAlign = 'center';
      ink.textBaseline = 'middle';
      ink.fillText(symbol, 0, 0);
    } else {
      // Sem emoji, sai a própria cápsula: cúpula colorida sobre casca clara.
      const w = CAPSULE_WIDTH * MAX_SCALE;
      const h = CAPSULE_HEIGHT * MAX_SCALE;
      ink.fillStyle = color;
      ink.beginPath();
      ink.arc(0, 0, w / 2, Math.PI, 0);
      ink.closePath();
      ink.fill();
      ink.fillStyle = 'rgba(255, 255, 255, .74)';
      ink.fillRect(-w / 2, 0, w, h / 2);
    }

    this.stamp = stamp;
    this.stampKey = key;
    this.stampReach = reach;
    return true;
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
    const stamp = this.stamp;
    if (!stamp) return;
    const reach = this.stampReach * (particle.scale / MAX_SCALE);
    context.save();
    context.globalAlpha = Math.min(1, particle.life / 600);
    context.translate(particle.x, particle.y);
    context.rotate(particle.angle);
    context.drawImage(stamp, -reach, -reach, reach * 2, reach * 2);
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
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    // E a folha volta a não ocupar nada. Agora que ela é absoluta, um retângulo do tamanho
    // da tela parado no documento continuaria sendo uma camada de composição viva, e no
    // fim de uma página curta ainda empurraria uma barra de rolagem.
    canvas.style.width = '0px';
    canvas.style.height = '0px';
  }
}
