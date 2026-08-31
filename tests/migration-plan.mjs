import { replay } from '../tmpjs/src/app/group-log.js';

/**
 * A parte da migração que decide o que gravar, separada da que grava. Sendo pura, ela pode
 * ser testada sem tocar em banco nenhum — e é onde mora o risco, porque é ela que escolhe
 * o instante do giro que faz o vencedor certo sair.
 */

export function toEvent(x) {
  return x.tipo === 'member_added' ? { type: 'member_added', at: x.ms, name: x.nome }
    : x.tipo === 'member_removed' ? { type: 'member_removed', at: x.ms, memberId: x.memberId }
    : { type: 'spin', at: x.ms };
}

/**
 * Monta a história declarada: todo mundo entra antes, e o giro cai num instante escolhido
 * para produzir o vencedor informado. O instante é procurado, não inventado — o sorteio
 * continua sendo derivado da hora, então a hora é o único grau de liberdade.
 */
export function planMigration(groupId, {
  members,
  winner,
  actor = '',
  spinAt,
  gapMs = 60_000,
  maxSearchMs = 200_000,
}) {
  const entradas = members.map((nome, i) => ({
    tipo: 'member_added',
    nome,
    ...(actor ? { autor: actor } : {}),
    ms: spinAt - (members.length - i) * gapMs,
  }));

  const comGiro = (ms) => {
    const novos = [...entradas, { tipo: 'spin', ...(actor ? { autor: actor } : {}), ms }];
    return { novos, state: replay(groupId, novos.map(toEvent)) };
  };

  for (let offset = 0; offset < maxSearchMs; offset += 1) {
    const tentativa = comGiro(spinAt + offset);
    if (tentativa.state.spins[0]?.winnerName === winner) {
      return { ...tentativa, spinAt: spinAt + offset, offset };
    }
  }
  return null;
}
