import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../src/app/firebase-config.js';

/**
 * Toca o projeto de verdade, não o emulador. Só para confirmar o que o emulador não
 * consegue provar: que a auth anônima está ligada e que as rules publicadas são as certas.
 * Escreve o mínimo possível, porque as rules proíbem apagar — lixo aqui é permanente.
 */

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const results = [];
async function check(name, body) {
  try {
    await body();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error?.code ?? error?.message ?? String(error) });
  }
}
async function shouldFail(name, body) {
  try {
    await body();
    results.push({ name, ok: false, error: 'PASSOU quando deveria ter sido negado' });
  } catch {
    results.push({ name, ok: true });
  }
}

const grupoId = process.env['SMOKE_GROUP'] ?? 'smoke-permanente';

await check('auth anônima está ligada', async () => {
  const cred = await signInAnonymously(auth);
  if (!cred.user.uid) throw new Error('sem uid');
});

await check('cria o grupo de fumaça (ou já existe)', async () => {
  const snap = await getDoc(doc(db, 'grupos', grupoId));
  if (snap.exists()) return;
  await setDoc(doc(db, 'grupos', grupoId), {
    nome: 'TESTE — pode ignorar',
    criadoEm: serverTimestamp(),
    ultimoGiroEm: null,
    versaoLog: 0,
  });
});

await check('lê o grupo pelo id', async () => {
  const snap = await getDoc(doc(db, 'grupos', grupoId));
  if (!snap.exists()) throw new Error('não encontrado');
});

await shouldFail('não consegue listar grupos', async () => {
  await getDocs(collection(db, 'grupos'));
});

await shouldFail('não consegue apagar o grupo', async () => {
  await deleteDoc(doc(db, 'grupos', grupoId));
});

await shouldFail('não aceita hora escolhida pelo cliente', async () => {
  await addDoc(collection(db, 'grupos', grupoId, 'eventos'), {
    tipo: 'member_added',
    em: new Date('2020-01-01'),
    nome: 'Impostor',
  });
});

await shouldFail('não aceita evento que carrega vencedor', async () => {
  await addDoc(collection(db, 'grupos', grupoId, 'eventos'), {
    tipo: 'spin',
    em: serverTimestamp(),
    vencedor: 'Impostor',
  });
});

await shouldFail('não aceita tipo de evento inventado', async () => {
  await addDoc(collection(db, 'grupos', grupoId, 'eventos'), {
    tipo: 'definir_vencedor',
    em: serverTimestamp(),
  });
});

await shouldFail('não escreve fora do desenho', async () => {
  await setDoc(doc(db, 'qualquer', 'coisa'), { a: 1 });
});

await shouldFail('o contador de log não pula', async () => {
  await updateDoc(doc(db, 'grupos', grupoId), { versaoLog: 999 });
});

for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}${r.ok ? '' : ' → ' + r.error}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações em PRODUÇÃO`);
process.exit(failed ? 1 : 0);
