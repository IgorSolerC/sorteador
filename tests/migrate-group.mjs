import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';

import { replay } from '../tmpjs/src/app/group-log.js';
import { planMigration, toEvent as planToEvent } from './migration-plan.mjs';

/**
 * Reescreve o log de um grupo com credencial de administrador, que é a única forma de
 * datar eventos no passado: as security rules exigem `em == request.time` justamente para
 * impedir que quem tem o link escreva história.
 *
 * Usar isto é o dono do projeto exercendo um poder que os membros do grupo não têm. Só
 * se justifica numa migração declarada, como trazer o histórico de outro site.
 *
 * Sempre grava um backup do estado anterior antes de tocar em qualquer coisa, e aceita
 * --dry para mostrar o plano sem escrever nada.
 */

const args = process.argv.slice(2);
const groupId = args[0];
const dry = args.includes('--dry');
// Quantos giros preservar, do mais antigo para o mais novo. Descartar um giro apaga o
// resultado de alguém, então é opção explícita e nunca o padrão.
const manterArg = args.find((a) => a.startsWith('--manter-giros='));
const manterGiros = manterArg ? Number(manterArg.split('=')[1]) : Infinity;
const keyPath = process.env['SA_KEY'] ?? '';
const emulator = !!process.env['FIRESTORE_EMULATOR_HOST'];

if (!groupId) {
  console.error('uso: node tests/migrate-group.mjs <grupoId> [--dry]');
  process.exit(1);
}

if (!emulator && !keyPath) {
  console.error('Falta a chave de administrador em SA_KEY.');
  console.error();
  console.error(String.raw`PowerShell:  $env:SA_KEY = "C:\caminho\para\chave.json"`);
  console.error(String.raw`cmd.exe:     set SA_KEY=C:\caminho\para\chave.json`);
  console.error('bash:        export SA_KEY=/c/caminho/para/chave.json');
  process.exit(1);
}
if (!emulator && !existsSync(keyPath)) {
  console.error(`Não achei a chave em: ${keyPath}`);
  process.exit(1);
}

initializeApp(
  emulator
    ? { projectId: process.env['GCLOUD_PROJECT'] ?? 'sorteador-ed1c9' }
    : { credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) },
);
const db = getFirestore();

/** Ordem e horários da nova história. Tudo em UTC; 21:00Z é 18:00 no fuso de Brasília. */
const MEMBROS = ['BERG', 'BIEL', 'BRU', 'DUDU', 'GU', 'IGRU', 'JULIAO', 'LARY', 'VITINHO'];
const AUTOR = 'IGRU';
const PRIMEIRO_GIRO = Date.parse('2026-08-27T21:00:00.000Z');

const toEvent = planToEvent;

// --- 1. lê e guarda o que existe hoje ---
const grupoRef = db.doc(`grupos/${groupId}`);
const grupoSnap = await grupoRef.get();
if (!grupoSnap.exists) {
  console.error(`grupo ${groupId} não encontrado`);
  process.exit(1);
}
const eventosSnap = await grupoRef.collection('eventos').orderBy('em', 'asc').get();
const antes = eventosSnap.docs.map((d) => ({
  id: d.id,
  ...d.data(),
  ms: d.data().em?.toMillis?.() ?? 0,
}));

const backup = { groupId, grupo: grupoSnap.data(), eventos: antes, salvoEm: new Date().toISOString() };
const backupPath = `backup-${groupId}-${Date.now()}.json`;
writeFileSync(backupPath, JSON.stringify(backup, null, 2));

const estadoAntes = replay(groupId, antes.map(toEvent));
console.log('--- antes ---');
console.log('eventos:', antes.length, '| versaoLog:', grupoSnap.data()?.versaoLog);
console.log('ativos:', estadoAntes.members.filter((m) => m.active).map((m) => m.name).join(', '));
console.log('giros:', estadoAntes.spins.map((s) => `#${s.index} ${s.winnerName} (${s.eligible.length} elegíveis)`).join(' | '));
console.log('backup:', backupPath);

// --- 2. monta a nova história preservando TODOS os giros que já aconteceram ---
// O primeiro é redatado para a migração; os seguintes mantêm o instante real, porque
// aconteceram aqui de verdade. Apagar um giro seria apagar o resultado de alguém.
const girosAtuais = estadoAntes.spins
  .slice(0, manterGiros)
  .map((s, i) => ({ winner: s.winnerName, at: i === 0 ? PRIMEIRO_GIRO : s.at }));

const descartados = estadoAntes.spins.slice(manterGiros);
if (descartados.length) {
  console.log('DESCARTADOS:', descartados.map((s) => `#${s.index} ${s.winnerName}`).join(', '));
}
if (!girosAtuais.length) {
  console.error('o grupo não tem giro nenhum para preservar');
  process.exit(1);
}

const plano = planMigration(groupId, { members: MEMBROS, actor: AUTOR, spins: girosAtuais });
if (!plano) {
  console.error('não achei instantes que reproduzam todos os vencedores');
  process.exit(1);
}
const { novos, state, spinTimes } = plano;
const escolhido = spinTimes[spinTimes.length - 1];

console.log();
console.log('--- depois ---');
console.log('eventos:', novos.length);
console.log('ativos:', state.members.filter((m) => m.active).map((m) => m.name).join(', '));
for (const g of state.spins) {
  console.log(`giro #${g.index}:`, g.winnerName, '@', new Date(g.at).toISOString(),
              `(${g.eligible.length} elegíveis)`);
}
console.log('no globo:', state.pool.length, '| rodada:', state.round);

if (dry) {
  console.log('\n--dry: nada foi escrito.');
  process.exit(0);
}

// --- 3. troca o log inteiro numa transação só ---
const batch = db.batch();
for (const doc of eventosSnap.docs) batch.delete(doc.ref);
for (const evento of novos) {
  batch.set(grupoRef.collection('eventos').doc(), {
    tipo: evento.tipo,
    em: Timestamp.fromMillis(evento.ms),
    ...(evento.nome ? { nome: evento.nome } : {}),
    ...(evento.autor ? { autor: evento.autor } : {}),
  });
}
batch.update(grupoRef, {
  versaoLog: novos.length,
  ultimoGiroEm: Timestamp.fromMillis(escolhido),
});
await batch.commit();

console.log('\nescrito. conferindo…');
const conferir = await grupoRef.collection('eventos').orderBy('em', 'asc').get();
const depois = replay(groupId, conferir.docs.map((d) => toEvent({ ...d.data(), ms: d.data().em.toMillis() })));
console.log('ativos:', depois.members.filter((m) => m.active).map((m) => m.name).join(', '));
for (const g of depois.spins) {
  console.log(`giro #${g.index}:`, g.winnerName, '@', new Date(g.at).toISOString(),
              `(${g.eligible.length} elegíveis)`);
}
console.log('no globo:', depois.pool.length);
process.exit(0);
