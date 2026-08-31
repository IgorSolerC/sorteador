import { cert, initializeApp } from 'firebase-admin/app';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
// Recria, no emulador, o log real do grupo, para a migração ser ensaiada no mesmo terreno.
initializeApp({ projectId: 'sorteador-ed1c9' });
const db = getFirestore();
const id = 'zDsap8v8oGdr1oZQhR9q';
const base = Date.parse('2026-08-31T02:40:00.000Z');
const ev = [
  ['member_added', 6907, { nome: 'GU' }], ['member_added', 18146, { nome: 'GUU' }],
  ['spin', 21040, {}], ['member_removed', 29385, { memberId: '6135eb58e2579863' }],
  ['member_added', 33746, { nome: 'IGRU' }], ['member_added', 36594, { nome: 'BIEL' }],
  ['member_added', 40187, { nome: 'BERG' }], ['member_added', 42376, { nome: 'BRU' }],
  ['member_added', 45494, { nome: 'VITINHO' }], ['member_added', 48823, { nome: 'JULIAO' }],
  ['member_added', 54091, { nome: 'DUDU' }],
  ['member_added', 31585225, { nome: 'LARY' }],
];
await db.doc(`grupos/${id}`).set({
  nome: 'MinezadaGames', criadoEm: Timestamp.fromMillis(base - 1000),
  ultimoGiroEm: Timestamp.fromMillis(base + 21040), versaoLog: ev.length,
});
const antigos = await db.collection(`grupos/${id}/eventos`).get();
for (const d of antigos.docs) await d.ref.delete();
for (const [tipo, off, extra] of ev) {
  await db.collection(`grupos/${id}/eventos`).add({
    tipo, em: Timestamp.fromMillis(base + off), autor: 'IGRU', ...extra });
}
console.log('réplica criada com', ev.length, 'eventos');
process.exit(0);
