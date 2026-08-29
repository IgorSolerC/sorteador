import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { GroupStore, memoryLogCache } from '../tmpjs/src/app/group-store.js';
import { UsageGuard } from '../tmpjs/src/app/usage-guard.js';
import { FIREBASE_CONFIG } from '../tmpjs/src/app/firebase-config.js';

const app = initializeApp(FIREBASE_CONFIG);
let v = null;
const guard = new UsageGuard({ read: () => v, write: (x) => (v = x) });
const store = new GroupStore(getFirestore(app), getAuth(app), guard, memoryLogCache());

console.log('criando…');
const id = await store.createGroup('Clube de Jogos (teste)');
console.log('grupo criado:', id);
for (const nome of ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa', 'Fátima']) {
  await store.addMember(id, nome);
  console.log('  +', nome);
}
await store.spin(id);
const snap = await store.load(id);
console.log('GRUPO=' + id);
console.log('vencedor:', snap.state.lastSpin?.winnerName, '| bolo:', snap.state.pool.length,
            '| eventos:', snap.logVersion, '| leituras:', guard.snapshot().reads,
            '| escritas:', guard.snapshot().writes);

// O Firestore mantém a conexão aberta e o processo nunca sairia sozinho.
process.exit(0);
