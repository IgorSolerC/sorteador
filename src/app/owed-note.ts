import { Component, input, output } from '@angular/core';

import { SpinRecord } from './group-log';

/**
 * A plaqueta do que esta pessoa deve ao clube: quantas resenhas, e — quando é mais de uma —
 * qual jogo ela vai resenhar agora.
 *
 * A escolha existe porque a ordem em que o clube joga não é a ordem em que cada um termina.
 * Quem acabou o segundo jogo antes do primeiro só tinha o atalho para o mais novo: para
 * resenhar o outro, saía daqui e procurava a cápsula na parede. Com mais de uma pendência,
 * todas ficam à mão — e nenhuma em amarelo, porque não há resposta certa entre elas e um
 * comprimido de ação primária diria que há.
 *
 * A plaqueta é a mesma nas duas telas que a mostram, a máquina e o álbum. Ela mora aqui
 * para continuar sendo uma só: duplicada, divergia na primeira mudança.
 */
@Component({
  selector: 'app-owed-note',
  host: { class: 'owed-note', '[class.owed-choice]': 'spins().length > 1' },
  template: `
    @if (spins().length === 1) {
      <span>
        Você jogou <strong>1</strong> jogo que ainda não resenhou
        — {{ spins()[0].note?.title }}{{ ponto(spins()[0].note?.title) }}
      </span>
      <button type="button" class="owed-action" (click)="choose(spins()[0], $event)">
        Escrever a minha
      </button>
    } @else {
      <span>
        Você jogou <strong>{{ spins().length }}</strong> jogos que ainda não resenhou.
      </span>
      <ul class="owed-picks">
        @for (spin of spins(); track spin.index) {
          <li>
            <button
              type="button"
              class="owed-pick"
              [style.--capsule]="capsuleOf()(spin)"
              [attr.aria-label]="'Escrever a minha resenha de ' + spin.note?.title"
              (click)="choose(spin, $event)"
            >
              <span class="chip-capsule" aria-hidden="true"></span>
              <span class="owed-pick-name">{{ spin.note?.title }}</span>
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class OwedNote {
  /** Os jogos que esta pessoa jogou e ainda não resenhou, do mais novo para trás. */
  readonly spins = input.required<readonly SpinRecord[]>();

  /** A cor da cápsula de um giro. Cada tela já sabe calculá-la, e as duas do mesmo jeito. */
  readonly capsuleOf = input.required<(spin: SpinRecord) => string>();

  /**
   * O evento vai junto porque quem abre a ficha recebe o foco de volta ao fechá-la, e o
   * alvo desse retorno é o comprimido que foi clicado — não a plaqueta.
   */
  readonly pick = output<{ spin: SpinRecord; event: Event }>();

  /**
   * "Click The Button!." — o título é do jogo, e traz a própria pontuação. Duas não se
   * somam, e a frase termina na do título quando ela existe.
   */
  protected ponto(titulo: string | undefined): string {
    return titulo && /[.!?…]$/.test(titulo) ? '' : '.';
  }

  protected choose(spin: SpinRecord, event: Event): void {
    this.pick.emit({ spin, event });
  }
}
