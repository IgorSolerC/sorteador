import { Injectable, computed, signal } from '@angular/core';

import { hashString, normalizeName } from './naming';
import { capsuleColor, CAPSULE_COLOR_COUNT } from './palette';

const AUTHOR_KEY = 'mesa-do-mes:autor:v1';
export const MAX_AUTHOR = 60;

/**
 * Quem está mexendo na máquina. Antes era um campo opcional escondido no fim da coleção,
 * e o resultado era um registro cheio de giros sem assinatura: quando o clube abria o
 * álbum meses depois, ninguém sabia quem tinha girado nem quem tinha etiquetado.
 *
 * Agora a assinatura é a porta de entrada e vem antes de tudo. Ela não é uma conta e não
 * prova nada — o servidor continua sem saber quem é quem, e as rules continuam tratando o
 * link como a credencial. É um crachá que a pessoa escreve para si mesma, e é exatamente
 * por isso que trocá-lo é um clique, não um logout.
 *
 * Vive num serviço, e não em cada componente, porque a máquina, o álbum e a bancada de
 * etiquetas precisam do mesmo nome. Duas leituras separadas do mesmo `localStorage` já
 * tinham divergido uma vez, e o álbum gravava etiquetas sem assinatura.
 */
@Injectable({ providedIn: 'root' })
export class Identity {
  private readonly value = signal(readStored());

  /** O nome como ele será gravado no registro. Vazio significa que ninguém se identificou. */
  readonly name = this.value.asReadonly();

  readonly known = computed(() => this.value().length > 0);

  /**
   * A cor do crachá, tirada do próprio nome. Não é a cápsula da pessoa dentro de um grupo
   * — essa ela escolhe — mas faz o crachá ser sempre o mesmo em toda tela e em toda visita.
   */
  readonly color = computed(() => {
    const name = this.value().toLowerCase();
    return name ? capsuleColor(hashString(`cracha:v1:${name}`) % CAPSULE_COLOR_COUNT) : 'var(--chrome-dim)';
  });

  /** As iniciais do crachá, no máximo duas. */
  readonly initials = computed(() =>
    this.value().split(' ').slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join(''),
  );

  /** Devolve o nome aceito, ou vazio quando não sobrou nada depois de normalizar. */
  remember(value: string): string {
    const name = normalizeName(value).slice(0, MAX_AUTHOR);
    this.value.set(name);
    write(name);
    return name;
  }

  forget(): void {
    this.value.set('');
    write('');
  }
}

function readStored(): string {
  try {
    return normalizeName(window.localStorage.getItem(AUTHOR_KEY) ?? '').slice(0, MAX_AUTHOR);
  } catch {
    return '';
  }
}

function write(name: string): void {
  try {
    if (name) window.localStorage.setItem(AUTHOR_KEY, name);
    else window.localStorage.removeItem(AUTHOR_KEY);
  } catch {
    // Sem armazenamento, o crachá vale só nesta sessão — e a porta pergunta de novo
    // na próxima visita, que é melhor do que gravar giros sem assinatura.
  }
}
