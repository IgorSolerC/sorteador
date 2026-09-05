/**
 * Nomes e a impressão digital que os identifica. Era o rodapé do antigo motor de sorteio
 * mensal; sobrevive a ele porque o log sincronizado depende das duas coisas: `participantKey`
 * é o que faz a mesma pessoa ser a mesma cápsula, e `hashString` é o que transforma o
 * carimbo do servidor no giro.
 *
 * A normalização mantém suas asperezas de propósito: `josé silva` e `jose silva` continuam
 * sendo chaves distintas. Unificá-las mudaria a identidade — e portanto o histórico — de
 * quem já está num grupo.
 */
export function normalizeName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

export function participantKey(value: string): string {
  return normalizeName(value).toLowerCase();
}

/**
 * As iniciais de um crachá: no máximo duas letras, em caixa alta. É o que aparece dentro de
 * uma cápsula quando a pessoa não escolheu emoji.
 *
 * Mora aqui porque é uma conta sobre nome, e porque ela estava copiada em seis lugares — a
 * porta, a prateleira, os integrantes, a ficha, o crachá e o rótulo do globo. Seis cópias da
 * mesma linha são seis chances de a mesma pessoa aparecer com duas siglas diferentes.
 */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
