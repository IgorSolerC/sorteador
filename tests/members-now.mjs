import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../tmpjs/src/app/firebase-config.js';
import { activeMembers, poolMembers, replay } from '../tmpjs/src/app/group-log.js';
const app = initializeApp(FIREBASE_CONFIG);
await signInAnonymously(getAuth(app));
const db = getFirestore(app);
const id = process.argv[2];
const snap = await getDocs(query(collection(db, 'grupos', id, 'eventos'), orderBy('em', 'asc')));
const ev = snap.docs.map((d) => { const x = d.data(), ms = x.em.toMillis();
  return x.tipo === 'member_added' ? { type:'member_added', at:ms, name:x.nome }
    : x.tipo === 'member_removed' ? { type:'member_removed', at:ms, memberId:x.memberId }
    : { type:'spin', at:ms }; });
const st = replay(id, ev);
console.log('ATIVOS  :', activeMembers(st).map(m=>m.name).join(', '));
console.log('NO BOLO :', poolMembers(st).map(m=>m.name).join(', '));
console.log('rodada', st.round, '| giros', st.spins.length, '| primeiro vencedor:', st.spins[0]?.winnerName,
            '| elegíveis naquele giro:', st.spins[0]?.eligible.length);
process.exit(0);
