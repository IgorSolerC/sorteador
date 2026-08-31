import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../tmpjs/src/app/firebase-config.js';
import { replay } from '../tmpjs/src/app/group-log.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
await signInAnonymously(getAuth(app));

const id = process.argv[2];
const g = await getDoc(doc(db, 'grupos', id));
console.log('grupo:', g.data()?.nome, '| versaoLog:', g.data()?.versaoLog);

const snap = await getDocs(query(collection(db, 'grupos', id, 'eventos'), orderBy('em', 'asc')));
const eventos = [];
console.log('\n--- eventos crus ---');
for (const d of snap.docs) {
  const x = d.data();
  const ms = x.em?.toMillis?.();
  console.log(`${d.id}  ${x.tipo.padEnd(15)} ${new Date(ms).toISOString()}  ${x.nome ?? x.memberId ?? ''} ${x.autor ? '(por ' + x.autor + ')' : ''}`);
  eventos.push(
    x.tipo === 'member_added' ? { type: 'member_added', at: ms, name: x.nome, actor: x.autor }
    : x.tipo === 'member_removed' ? { type: 'member_removed', at: ms, memberId: x.memberId, actor: x.autor }
    : { type: 'spin', at: ms, actor: x.autor });
}

const state = replay(id, eventos);
console.log('\n--- giros derivados ---');
for (const s of state.spins) {
  console.log(`#${s.index} rodada ${s.round}  ${new Date(s.at).toISOString()}  vencedor: ${s.winnerName}  (elegíveis: ${s.eligible.length})`);
}
process.exit(0);
