import { Injectable, signal } from '@angular/core';

const SOUND_KEY = 'mesa-do-mes:som:v1';

/**
 * O que este aparelho prefere — e só ele. Nada disto sai daqui e nada disto entra no
 * registro do grupo.
 *
 * **Som** começa desligado. Uma página que faz barulho sem ser convidada é a coisa mais
 * odiada da web, e a máquina só ganha voz quando alguém pede.
 *
 * O lacre da nota do clube **não mora mais aqui**: ele deixou de ser uma escolha e passou a
 * ser como o produto funciona — a nota de um jogo que esta pessoa jogou e não resenhou fica
 * lacrada para ela, sempre. Era a única preferência que mudava a conta que o clube lê, e
 * uma conta que depende de um interruptor por aparelho não é a mesma conta para todos.
 */
@Injectable({ providedIn: 'root' })
export class Preferences {
  private readonly soundOn = signal(readFlag(SOUND_KEY));

  /** Se a máquina faz barulho ao entregar uma cápsula. */
  readonly sound = this.soundOn.asReadonly();

  setSound(on: boolean): void {
    this.soundOn.set(on);
    writeFlag(SOUND_KEY, on);
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
