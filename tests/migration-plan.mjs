import { replay } from '../tmpjs/src/app/group-log.js';

/**
 * A parte da migração que decide o que gravar, separada da que grava. Sendo pura, ela pode
 * ser testada sem tocar em banco nenhum — e é onde mora o risco, porque é ela que escolhe
 * os instantes que fazem os vencedores certos saírem.
 */

export function toEvent(x) {
  return x.tipo === 'member_added' ? { type: 'member_added', at: x.ms, name: x.nome }
    : x.tipo === 'member_removed' ? { type: 'member_removed', at: x.ms, memberId: x.memberId }
    : { type: 'spin', at: x.ms };
}

/**
 * Monta a história declarada: todo mundo entra antes, e cada giro cai num instante
 * escolhido para produzir o vencedor informado. Os instantes são procurados, não
 * inventados — o sorteio continua derivado da hora, e a hora é o único grau de liberdade.
 *
 * `spins` é a lista de giros a reproduzir, do mais antigo ao mais novo. Cada um pode
 * declarar o instante desejado; a busca começa nele e anda para frente.
 */
export function planMigration(groupId, {
  members,
  spins,
  actor = '',
  gapMs = 60_000,
  maxSearchMs = 200_000,
}) {
  const primeiro = spins[0].at;
  const entradas = members.map((nome, i) => ({
    tipo: 'member_added',
    nome,
    ...(actor ? { autor: actor } : {}),
    ms: primeiro - (members.length - i) * gapMs,
  }));

  const escolhidos = [];
  for (const desejado of spins) {
    let achou = null;
    for (let offset = 0; offset < maxSearchMs && achou === null; offset += 1) {
      const tentativa = [
        ...entradas,
        ...escolhidos,
        { tipo: 'spin', ...(actor ? { autor: actor } : {}), ms: desejado.at + offset },
      ];
      const state = replay(groupId, tentativa.map(toEvent));
      const saiu = state.spins[escolhidos.length]?.winnerName;
      if (saiu === desejado.winner) achou = desejado.at + offset;
    }
    if (achou === null) return null;
    escolhidos.push({ tipo: 'spin', ...(actor ? { autor: actor } : {}), ms: achou });
  }

  const novos = [...entradas, ...escolhidos];
  return { novos, state: replay(groupId, novos.map(toEvent)), spinTimes: escolhidos.map((s) => s.ms) };
}
