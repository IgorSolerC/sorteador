import { Injectable, inject } from '@angular/core';

import { Preferences } from './preferences';

/**
 * A voz da máquina, sintetizada.
 *
 * Nenhum arquivo de áudio: o projeto vive no plano gratuito, sem Storage, e um `.mp3` de
 * catraca custaria mais bytes que o app inteiro. Tudo aqui sai de osciladores e de um
 * segundo de ruído branco gerado uma vez.
 *
 * Três decisões que não são estéticas:
 *
 * 1. **O tique acompanha a curva, e não um relógio constante.** A roleta desacelera em
 *    `cubic-bezier(.12, .72, .12, 1)`, e um tique regular sobre uma imagem que freia soa
 *    como outro objeto. Aqui cada tique é agendado no instante em que a roda passa por
 *    mais um vinte-e-quatro avos de volta — então o som freia junto, porque é a mesma
 *    conta.
 * 2. **Nada toca sem gesto.** A máquina encena a entrega sozinha ao abrir a página, e o
 *    navegador barraria o áudio ali de todo jeito; pior, se deixasse passar, seria
 *    barulho que ninguém pediu. Só `spin()` e o replay no globo — os dois com dedo em
 *    cima — chamam esta classe.
 * 3. **Uma cena por vez.** Cada cena tem o próprio nó de ganho; começar outra desliga o
 *    anterior de uma vez, em vez de deixar dois trens de tique correndo sobrepostos.
 */
@Injectable({ providedIn: 'root' })
export class MachineSound {
  private readonly preferences = inject(Preferences);

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private scene: GainNode | null = null;

  /**
   * A cena da entrega: os tiques da roda freando, e o baque quando a cápsula chega. As
   * durações são as mesmas do CSS — mudar uma sem a outra descasa o som da imagem.
   */
  spin(durationMs: number, ticks = 26): void {
    const ctx = this.open();
    if (!ctx) return;

    const scene = this.newScene(ctx);
    const start = ctx.currentTime + 0.02;
    const duration = Math.max(durationMs, 0) / 1000;

    // Um tique por fração de volta. O instante de cada um é a curva do CSS invertida: em
    // que segundo a animação já andou k/N do caminho.
    for (let k = 1; k <= ticks; k += 1) {
      const when = start + easeInverse(k / ticks) * duration;
      // Os últimos tiques são os que se ouvem: o começo é uma rajada e some sozinha.
      this.tick(ctx, scene, when, 0.22 + 0.78 * (k / ticks));
    }

    this.thud(ctx, scene, start + duration + 0.59);
  }

  /** A cúpula abrindo, logo depois do baque. É o momento em que o confete sai. */
  celebrate(): void {
    const ctx = this.open();
    if (!ctx || !this.scene) return;
    this.pop(ctx, this.scene, ctx.currentTime + 0.02);
  }

  /** Desliga o que estiver soando. Uma cena nova nunca se soma à anterior. */
  stop(): void {
    if (!this.scene || !this.context) return;
    const gain = this.scene.gain;
    gain.cancelScheduledValues(this.context.currentTime);
    gain.setValueAtTime(gain.value, this.context.currentTime);
    gain.linearRampToValueAtTime(0, this.context.currentTime + 0.08);
    this.scene = null;
  }

  /**
   * Abre o contexto na primeira vez que alguém pede som — nunca antes. Um `AudioContext`
   * criado no arranque nasce suspenso, aparece como aba que "está tocando" e não toca
   * nada. Devolve `null` quando o som está desligado ou o navegador não tem Web Audio.
   */
  private open(): AudioContext | null {
    if (!this.preferences.sound()) return null;

    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      this.master = this.context.createGain();
      // A máquina é um objeto de mesa, não um show. Alto o bastante para se ouvir num
      // celular na mão, baixo o bastante para não assustar quem esqueceu que ligou.
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
    }
    // Um contexto criado fora de um gesto nasce suspenso; o gesto que chega aqui o destrava.
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private newScene(ctx: AudioContext): GainNode {
    this.stop();
    const scene = ctx.createGain();
    scene.gain.value = 1;
    scene.connect(this.master!);
    this.scene = scene;
    return scene;
  }

  /** Um dente da catraca: um estalo curto de ruído filtrado, e nada mais. */
  private tick(ctx: AudioContext, out: GainNode, when: number, level: number): void {
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2100;
    band.Q.value = 6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.5 * level, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);

    source.connect(band).connect(gain).connect(out);
    source.start(when);
    source.stop(when + 0.06);
  }

  /** A cápsula chegando na bandeja: um corpo grave que cai, com a batida de plástico. */
  private thud(ctx: AudioContext, out: GainNode, when: number): void {
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(180, when);
    body.frequency.exponentialRampToValueAtTime(58, when + 0.18);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0, when);
    bodyGain.gain.linearRampToValueAtTime(0.9, when + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
    body.connect(bodyGain).connect(out);
    body.start(when);
    body.stop(when + 0.4);

    const knock = ctx.createBufferSource();
    knock.buffer = this.noiseBuffer(ctx);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    const knockGain = ctx.createGain();
    knockGain.gain.setValueAtTime(0, when);
    knockGain.gain.linearRampToValueAtTime(0.4, when + 0.004);
    knockGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
    knock.connect(low).connect(knockGain).connect(out);
    knock.start(when);
    knock.stop(when + 0.12);
  }

  /** A cúpula abrindo: duas notas curtas, a segunda uma quinta acima. */
  private pop(ctx: AudioContext, out: GainNode, when: number): void {
    for (const [delay, freq] of [[0, 660], [0.09, 990]] as const) {
      const tone = ctx.createOscillator();
      tone.type = 'triangle';
      tone.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, when + delay);
      gain.gain.linearRampToValueAtTime(0.32, when + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + delay + 0.26);
      tone.connect(gain).connect(out);
      tone.start(when + delay);
      tone.stop(when + delay + 0.3);
    }
  }

  /** Um segundo de ruído branco, gerado uma vez e copiado por cada estalo. */
  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }
}

/**
 * A curva do CSS, ao contrário: dado um avanço da animação, em que fração do tempo ele
 * acontece. `cubic-bezier(.12, .72, .12, 1)` é a mesma de `--spin`, e é por isso que os
 * tiques freiam exatamente quando a roda freia.
 *
 * Busca binária em vez de Newton porque a curva é monótona, trinta passos bastam para o
 * ouvido, e uma cena inteira custa vinte e seis destas — medido em microssegundos.
 */
export function easeInverse(progress: number, x1 = 0.12, y1 = 0.72, x2 = 0.12, y2 = 1): number {
  const alvo = Math.min(Math.max(progress, 0), 1);
  let baixo = 0;
  let alto = 1;
  for (let i = 0; i < 30; i += 1) {
    const meio = (baixo + alto) / 2;
    if (bezier(meio, y1, y2) < alvo) baixo = meio;
    else alto = meio;
  }
  const t = (baixo + alto) / 2;
  return bezier(t, x1, x2);
}

/** Um eixo da curva de Bézier cúbica com âncoras em 0 e 1. */
function bezier(t: number, a: number, b: number): number {
  const u = 1 - t;
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t;
}
