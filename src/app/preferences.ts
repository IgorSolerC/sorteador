import { Injectable, signal } from '@angular/core';

const SOUND_KEY = 'mesa-do-mes:som:v1';
const BLIND_KEY = 'mesa-do-mes:cego:v1';

/**
 * O que este aparelho prefere — e só ele. Nada disto sai daqui, nada disto entra no
 * registro do grupo: são duas chaves de `localStorage`, ao lado do crachá, e é por isso
 * que as duas moram na porta, que já é o lugar onde este aparelho diz quem é.
 *
 * **Som** começa desligado. Uma página que faz barulho sem ser convidada é a coisa mais
 * odiada da web, e a máquina só ganha voz quando alguém pede.
 *
 * **Modo cego** também começa desligado, e por outro motivo: ele esconde informação que
 * já estava na tela, e ligar isso sozinho para alguém seria decidir por ela.
 */
@Injectable({ providedIn: 'root' })
export class Preferences {
  private readonly soundOn = signal(readFlag(SOUND_KEY));
  private readonly blindOn = signal(readFlag(BLIND_KEY));

  /** Se a máquina faz barulho ao entregar uma cápsula. */
  readonly sound = this.soundOn.asReadonly();

  /**
   * Se a nota do clube fica lacrada nos jogos que esta pessoa jogou e ainda não resenhou.
   * Serve contra a ancoragem: ler "9,2" antes de dar a própria nota move a própria nota.
   */
  readonly blind = this.blindOn.asReadonly();

  setSound(on: boolean): void {
    this.soundOn.set(on);
    writeFlag(SOUND_KEY, on);
  }

  setBlind(on: boolean): void {
    this.blindOn.set(on);
    writeFlag(BLIND_KEY, on);
  }
}

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    // Sem armazenamento a preferência vale só nesta sessão, e o padrão desligado é o
    // seguro nos dois casos: nem barulho nem informação escondida sem alguém pedir.
    return false;
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // Ver acima: a preferência ainda vale nesta sessão, e some na próxima visita.
  }
}
