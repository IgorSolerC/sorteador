import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../tmpjs/src/app/firebase-config.js';
import { replay } from '../tmpjs/src/app/group-log.js';

const app = initializeApp(FIREBASE_CONFIG);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const id = process.argv[2];
const alvoISO = process.argv[3];

const snap = await getDocs(query(collection(db, 'grupos', id, 'eventos'), orderBy('em', 'asc')));
const base = snap.docs.map((d) => {
  const x = d.data(), ms = x.em.toMillis();
  return x.tipo === 'member_added' ? { type: 'member_added', at: ms, name: x.nome }
    : x.tipo === 'member_removed' ? { type: 'member_removed', at: ms, memberId: x.memberId }
    : { type: 'spin', at: ms };
});
const idxGiro = base.findIndex((e) => e.type === 'spin');

const comData = (ms) => {
  const copia = base.map((e, i) => (i === idxGiro ? { ...e, at: ms } : e));
  // O log tem que continuar em ordem cronológica para o replay fazer sentido.
  copia.sort((a, b) => a.at - b.at);
  return replay(id, copia);
};

const atual = replay(id, base);
console.log('hoje:', atual.spins[0]?.winnerName, '@', new Date(base[idxGiro].at).toISOString());

const alvo = Date.parse(alvoISO);
const noAlvo = comData(alvo);
console.log('no alvo exato:', noAlvo.spins[0]?.winnerName, '@', alvoISO);

// Procura, dentro do mesmo minuto, um instante que preserve o vencedor atual.
const querido = atual.spins[0].winnerName;
let achou = null;
for (let ms = 0; ms < 60_000 && !achou; ms += 1) {
  const r = comData(alvo + ms);
  if (r.spins[0]?.winnerName === querido) achou = alvo + ms;
}
console.log(achou
  ? `preserva ${querido}: ${new Date(achou).toISOString()}  (+${achou - alvo}ms dentro do minuto)`
  : `nenhum instante nesse minuto preserva ${querido}`);
process.exit(0);
