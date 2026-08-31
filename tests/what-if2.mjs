import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../tmpjs/src/app/firebase-config.js';
import { replay } from '../tmpjs/src/app/group-log.js';

/**
 * Só lê e simula: não escreve nada. Serve para saber, antes de mexer no Console, qual
 * vencedor cada carimbo de hora produziria — já que o vencedor é derivado da hora, não
 * guardado.
 */

const app = initializeApp(FIREBASE_CONFIG);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const id = process.argv[2];
const alvoISO = process.argv[3] ?? '2026-08-27T21:00:00.000Z';

const snap = await getDocs(query(collection(db, 'grupos', id, 'eventos'), orderBy('em', 'asc')));
const docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), ms: d.data().em.toMillis() }));

const toEvent = (x) =>
  x.tipo === 'member_added' ? { type: 'member_added', at: x.ms, name: x.nome }
  : x.tipo === 'member_removed' ? { type: 'member_removed', at: x.ms, memberId: x.memberId }
  : { type: 'spin', at: x.ms };

const atual = replay(id, docs.map(toEvent));
const querido = atual.spins[0]?.winnerName;
console.log('vencedor hoje:', querido, '@', new Date(docs[2].ms).toISOString());

const ALVO = Date.parse(alvoISO);

/** Move as duas entradas e o giro para a data alvo, preservando a ordem causal. */
function cenario(offsetGiro) {
  const movidos = docs.map((x, i) => {
    if (i === 0) return { ...x, ms: ALVO - 120_000 };
    if (i === 1) return { ...x, ms: ALVO - 60_000 };
    if (i === 2) return { ...x, ms: ALVO + offsetGiro };
    return x;
  });
  return { state: replay(id, movidos.map(toEvent)), movidos };
}

console.log('giro exatamente no alvo →', cenario(0).state.spins[0]?.winnerName ?? '(sem giro)');

let achou = null;
for (let ms = 0; ms < 60_000 && achou === null; ms += 1) {
  if (cenario(ms).state.spins[0]?.winnerName === querido) achou = ms;
}

if (achou === null) {
  console.log(`nenhum instante nesse minuto preserva ${querido}`);
} else {
  const { movidos, state } = cenario(achou);
  console.log(`\n>>> PRESERVA ${querido} com o giro em ${new Date(ALVO + achou).toISOString()}`);
  console.log('\nvalores a gravar no campo "em" de cada evento:');
  for (const x of movidos.slice(0, 3)) {
    console.log(`  ${x.id}  ${x.tipo.padEnd(14)} ${(x.nome ?? '').padEnd(6)} ->  ${new Date(x.ms).toISOString()}`);
  }
  console.log('\nderivado:', state.spins.map((s) => `#${s.index} ${s.winnerName}`).join(', '));
}
process.exit(0);
