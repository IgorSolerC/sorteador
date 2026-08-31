import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

import { planMigration, toEvent } from './migration-plan.mjs';
import { activeMembers, memberId, replay } from '../tmpjs/src/app/group-log.js';

/**
 * Ensaia a migração contra o emulador, sobre uma réplica do log real, antes de ela tocar
 * produção. Uma migração que reescreve histórico não deveria estrear no dado de verdade.
 */

initializeApp({ projectId: 'migracao-teste' });
const db = getFirestore();

const results = [];
async function it(name, body) {
  try {
    await body();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

const GRUPO = 'grupo-replica';
const MEMBROS = ['BERG', 'BIEL', 'BRU', 'DUDU', 'GU', 'IGRU', 'JULIAO', 'LARY', 'VITINHO'];
const GIRO_ALVO = Date.parse('2026-08-27T21:00:00.000Z');

/** O log real, tal como está hoje: dois entram, giram com dois, e os outros chegam depois. */
const LOG_REAL = [
  ['member_added', 6907, { nome: 'GU' }], ['member_added', 18146, { nome: 'GUU' }],
  ['spin', 21040, {}], ['member_removed', 29385, { memberId: memberId(GRUPO, 'GUU') }],
  ['member_added', 33746, { nome: 'IGRU' }], ['member_added', 36594, { nome: 'BIEL' }],
  ['member_added', 40187, { nome: 'BERG' }], ['member_added', 42376, { nome: 'BRU' }],
  ['member_added', 45494, { nome: 'VITINHO' }], ['member_added', 48823, { nome: 'JULIAO' }],
  ['member_added', 54091, { nome: 'DUDU' }], ['member_added', 31585225, { nome: 'LARY' }],
];
const BASE = Date.parse('2026-08-31T02:40:00.000Z');

async function semearReplica() {
  const antigos = await db.collection(`grupos/${GRUPO}/eventos`).get();
  await Promise.all(antigos.docs.map((d) => d.ref.delete()));
  await db.doc(`grupos/${GRUPO}`).set({
    nome: 'MinezadaGames',
    criadoEm: Timestamp.fromMillis(BASE - 1000),
    ultimoGiroEm: Timestamp.fromMillis(BASE + 21040),
    versaoLog: LOG_REAL.length,
  });
  for (const [tipo, off, extra] of LOG_REAL) {
    await db.collection(`grupos/${GRUPO}/eventos`).add({
      tipo, em: Timestamp.fromMillis(BASE + off), autor: 'IGRU', ...extra,
    });
  }
}

async function lerEstado() {
  const snap = await db.collection(`grupos/${GRUPO}/eventos`).orderBy('em', 'asc').get();
  const docs = snap.docs.map((d) => ({ ...d.data(), ms: d.data().em.toMillis() }));
  return { docs, state: replay(GRUPO, docs.map(toEvent)) };
}

async function aplicar(plano) {
  const grupoRef = db.doc(`grupos/${GRUPO}`);
  const atuais = await grupoRef.collection('eventos').get();
  const batch = db.batch();
  for (const d of atuais.docs) batch.delete(d.ref);
  for (const e of plano.novos) {
    batch.set(grupoRef.collection('eventos').doc(), {
      tipo: e.tipo,
      em: Timestamp.fromMillis(e.ms),
      ...(e.nome ? { nome: e.nome } : {}),
      ...(e.autor ? { autor: e.autor } : {}),
    });
  }
  batch.update(grupoRef, {
    versaoLog: plano.novos.length,
    ultimoGiroEm: Timestamp.fromMillis(plano.spinTimes[plano.spinTimes.length - 1]),
  });
  await batch.commit();
}

// --- o plano, sem banco ---

await it('o plano acha um instante que faz o vencedor pedido sair', () => {
  const plano = planMigration(GRUPO, { members: MEMBROS, spins: [{ winner: 'GU', at: GIRO_ALVO }] });
  assert.ok(plano, 'deveria achar um instante');
  assert.equal(plano.state.spins[0].winnerName, 'GU');
});

await it('o giro fica no minuto pedido, não em outro', () => {
  const plano = planMigration(GRUPO, { members: MEMBROS, spins: [{ winner: 'GU', at: GIRO_ALVO }] });
  assert.ok(plano.spinTimes[0] - GIRO_ALVO < 60_000, `saiu ${plano.spinTimes[0] - GIRO_ALVO}ms depois do alvo`);
});

await it('todo mundo está elegível no giro, que é o ponto da migração', () => {
  const plano = planMigration(GRUPO, { members: MEMBROS, spins: [{ winner: 'GU', at: GIRO_ALVO }] });
  assert.equal(plano.state.spins[0].eligible.length, MEMBROS.length);
});

await it('o plano é determinístico', () => {
  const a = planMigration(GRUPO, { members: MEMBROS, spins: [{ winner: 'GU', at: GIRO_ALVO }] });
  const b = planMigration(GRUPO, { members: MEMBROS, spins: [{ winner: 'GU', at: GIRO_ALVO }] });
  assert.deepEqual(a.spinTimes, b.spinTimes);
});

await it('funciona para qualquer vencedor da lista, não só o GU', () => {
  for (const nome of MEMBROS) {
    const plano = planMigration(GRUPO, { members: MEMBROS, spins: [{ winner: nome, at: GIRO_ALVO }] });
    assert.ok(plano, `não achou instante para ${nome}`);
    assert.equal(plano.state.spins[0].winnerName, nome);
  }
});

await it('desiste quando o vencedor não está na lista', () => {
  const plano = planMigration(GRUPO, {
    members: MEMBROS, spins: [{ winner: 'NINGUEM', at: GIRO_ALVO }], maxSearchMs: 5000,
  });
  assert.equal(plano, null);
});

// --- a aplicação, contra o emulador ---

await it('a réplica reproduz o problema real: giro com só 2 elegíveis', async () => {
  await semearReplica();
  const { state } = await lerEstado();
  assert.equal(state.spins[0].eligible.length, 2);
  assert.equal(state.spins[0].winnerName, 'GU');
  assert.equal(activeMembers(state).length, 9);
});

await it('depois da migração o giro tem os 9 elegíveis e o GU ganha', async () => {
  await semearReplica();
  const plano = planMigration(GRUPO, {
    members: MEMBROS, actor: 'IGRU', spins: [{ winner: 'GU', at: GIRO_ALVO }],
  });
  await aplicar(plano);

  const { state, docs } = await lerEstado();
  assert.equal(docs.length, MEMBROS.length + 1, 'nove entradas e um giro');
  assert.equal(state.spins.length, 1);
  assert.equal(state.spins[0].winnerName, 'GU');
  assert.equal(state.spins[0].eligible.length, 9);
  assert.deepEqual(activeMembers(state).map((m) => m.name), MEMBROS);
});

await it('o ciclo fica coerente: rodada 1, GU fora, oito no globo', async () => {
  const { state } = await lerEstado();
  assert.equal(state.round, 1);
  assert.equal(state.pool.length, 8);
  assert.ok(!state.pool.includes(state.spins[0].winnerId));
});

await it('o GUU some e o contador bate com o log', async () => {
  const { state } = await lerEstado();
  assert.ok(!state.members.some((m) => m.name === 'GUU'), 'GUU não deveria existir');
  const grupo = await db.doc(`grupos/${GRUPO}`).get();
  const eventos = await db.collection(`grupos/${GRUPO}/eventos`).get();
  assert.equal(grupo.data().versaoLog, eventos.size);
});

await it('o giro cai na data pedida', async () => {
  const { state } = await lerEstado();
  const quando = new Date(state.spins[0].at).toISOString();
  assert.ok(quando.startsWith('2026-08-27T21:00'), `caiu em ${quando}`);
});

await it('rodar de novo dá o mesmo resultado', async () => {
  const antes = (await lerEstado()).state.spins[0];
  const plano = planMigration(GRUPO, {
    members: MEMBROS, actor: 'IGRU', spins: [{ winner: 'GU', at: GIRO_ALVO }],
  });
  await aplicar(plano);
  const depois = (await lerEstado()).state.spins[0];
  assert.equal(depois.winnerName, antes.winnerName);
  assert.equal(depois.at, antes.at);
});


await it('preserva mais de um giro, cada um com o vencedor certo', async () => {
  await semearReplica();
  const SEGUNDO = GIRO_ALVO + 4 * 24 * 60 * 60 * 1000;
  const plano = planMigration(GRUPO, {
    members: MEMBROS, actor: 'IGRU',
    spins: [{ winner: 'GU', at: GIRO_ALVO }, { winner: 'VITINHO', at: SEGUNDO }],
  });
  assert.ok(plano, 'deveria achar instantes para os dois');
  await aplicar(plano);

  const { state } = await lerEstado();
  assert.equal(state.spins.length, 2);
  assert.equal(state.spins[0].winnerName, 'GU');
  assert.equal(state.spins[1].winnerName, 'VITINHO');
  assert.equal(state.spins[0].eligible.length, 9);
  assert.equal(state.spins[1].eligible.length, 8);
  assert.equal(state.pool.length, 7);
});

for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}`);
  if (!r.ok) console.log(`        ${r.error?.message?.split('\n')[0] ?? r.error}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações da migração`);
process.exit(failed ? 1 : 0);
