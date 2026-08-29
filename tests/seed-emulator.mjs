import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { GroupStore, memoryLogCache } from '../tmpjs/src/app/group-store.js';
import { UsageGuard } from '../tmpjs/src/app/usage-guard.js';

const app = initializeApp({ projectId: 'sorteador-ed1c9', apiKey: 'fake' });
const db = getFirestore(app);
const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

let v = null;
const guard = new UsageGuard({ read: () => v, write: (x) => (v = x) }, () => Date.now(),
  { reads: 9999, writes: 9999, warnAt: 0.99, burstCalls: 99999, burstWindowMs: 1000 });
const store = new GroupStore(db, auth, guard, memoryLogCache());

const id = process.env['SEED_ID'] ?? 'demo';
await store.createGroup('Clube de Jogos');
// Usa um id previsível para a captura: recria o doc com o id fixo.
const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
await setDoc(doc(db, 'grupos', id), {
  nome: 'Clube de Jogos', criadoEm: serverTimestamp(), ultimoGiroEm: null, versaoLog: 0,
});
for (const nome of ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima']) {
  await store.addMember(id, nome);
}
await store.spin(id);
const snap = await store.load(id);
console.log('grupo semeado:', id, '| vencedor:', snap.state.lastSpin?.winnerName,
            '| bolo:', snap.state.pool.length, '| eventos:', snap.logVersion);
