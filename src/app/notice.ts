import { signal } from '@angular/core';

/**
 * O aviso do rodapé: a frase curta que confirma o que acabou de ser gravado.
 *
 * Um relógio por vez, e nunca um relógio por aviso. Cada aviso marcava a própria saída, e o
 * relógio do anterior continuava correndo: corrigir duas cadeiras da mesa em sequência —
 * que é como se corrige uma mesa — fazia o primeiro apagar o segundo no meio da leitura.
 *
 * Vive fora dos componentes porque a máquina e o álbum mostram o mesmo rodapé, e porque o
 * relógio precisa morrer junto com a tela: um aviso de uma página que já saiu não volta.
 */
export const NOTICE_MS = 5500;

export class Notice {
  private timer = 0;

  /** O que está escrito no rodapé agora. Vazio é o rodapé recolhido. */
  readonly text = signal('');

  show(message: string): void {
    this.stop();
    this.text.set(message);
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.text.set('');
    }, NOTICE_MS);
  }

  dismiss(): void {
    this.stop();
    this.text.set('');
  }

  /** Sair da tela leva o relógio junto. Chamado na destruição de quem mostra o aviso. */
  stop(): void {
    if (!this.timer) return;
    window.clearTimeout(this.timer);
    this.timer = 0;
  }
}
