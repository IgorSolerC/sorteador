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

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
