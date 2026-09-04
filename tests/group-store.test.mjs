import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { GroupStore, UsageBlockedError, memoryLogCache } from '../tmpjs/src/app/group-store.js';
import { UsageGuard } from '../tmpjs/src/app/usage-guard.js';
import { activeMembers } from '../tmpjs/src/app/group-log.js';

/**
 * Integração de verdade: a camada de dados contra o Firestore com as rules publicadas,
 * rodando no emulador. É aqui que se prova que o desenho fecha — que as rules aceitam
 * exatamente o que a camada escreve, e recusam o resto.
 */

const app = initializeApp({ projectId: 'mesa-do-mes-store-test', apiKey: 'fake' });
const db = getFirestore(app);
const auth = getAuth(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

const results = [];
async function it(name, body) {
  try {
    await body();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

function memoryStore() {
  let value = null;
  return { read: () => value, write: (v) => (value = v) };
}

function novaLoja(budget) {
  const guard = new UsageGuard(memoryStore(), () => Date.now(), budget);
  return { store: new GroupStore(db, auth, guard, memoryLogCache()), guard };
}

const FOLGADO = { reads: 500, writes: 500, warnAt: 0.9, burstCalls: 10_000, burstWindowMs: 1000 };

await it('cria um grupo e ele nasce vazio', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube de Jogos');
  const snap = await store.load(id);

  assert.equal(snap.name, 'Clube de Jogos');
  assert.equal(snap.logVersion, 0);
  assert.equal(snap.events.length, 0);
  assert.equal(activeMembers(snap.state).length, 0);
});

await it('adiciona gente e o estado sai do log', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.addMember(id, 'Cecília');

  const snap = await store.load(id);
  assert.equal(snap.logVersion, 3);
  assert.deepEqual(activeMembers(snap.state).map((m) => m.name), ['Ana', 'Breno', 'Cecília']);
  assert.equal(snap.state.pool.length, 3);
});

await it('gira e o vencedor sai do bolo', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno', 'Cecília']) await store.addMember(id, nome);
  await store.spin(id);

  const snap = await store.load(id);
  assert.ok(snap.state.lastSpin, 'deveria ter um giro');
  assert.equal(snap.state.pool.length, 2);
  assert.ok(!snap.state.pool.includes(snap.state.lastSpin.winnerId));
  assert.ok(snap.lastSpinAt !== null, 'o giro carimba o grupo');
});

await it('a espera entre giros é imposta pelas rules, não pelo cliente', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno', 'Cecília']) await store.addMember(id, nome);
  await store.spin(id);

  await assert.rejects(() => store.spin(id), 'o segundo giro imediato tem que ser negado');
});

await it('remover mantém a pessoa no histórico', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno', 'Cecília']) await store.addMember(id, nome);

  const antes = await store.load(id);
  const ana = antes.state.members.find((m) => m.name === 'Ana');
  await store.removeMember(id, ana.id);

  const depois = await store.load(id);
  assert.equal(depois.state.members.length, 3, 'continua no histórico');
  assert.equal(activeMembers(depois.state).length, 2, 'mas fora dos ativos');
});

await it('a segunda leitura com cache em dia custa 1 leitura', async () => {
  const { store, guard } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno', 'Cecília']) await store.addMember(id, nome);

  await store.load(id);
  const antes = guard.snapshot().reads;
  await store.load(id);
  const gasto = guard.snapshot().reads - antes;

  assert.equal(gasto, 1, `esperava 1 leitura, gastou ${gasto}`);
});

await it('só o delta é buscado quando aparecem eventos novos', async () => {
  const { store, guard } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno', 'Cecília']) await store.addMember(id, nome);
  await store.load(id);

  // Outro dispositivo escreve; este só sabe pelo contador.
  const outro = novaLoja(FOLGADO).store;
  await outro.addMember(id, 'Davi');

  const antes = guard.snapshot().reads;
  const snap = await store.load(id);
  const gasto = guard.snapshot().reads - antes;

  assert.equal(gasto, 2, `1 do grupo + 1 do evento novo, gastou ${gasto}`);
  assert.equal(snap.logVersion, 4);
  assert.deepEqual(
    activeMembers(snap.state).map((m) => m.name),
    ['Ana', 'Breno', 'Cecília', 'Davi'],
  );
});

await it('o log chega na ordem certa depois de um delta', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno']) await store.addMember(id, nome);
  await store.load(id);
  for (const nome of ['Cecília', 'Davi']) await store.addMember(id, nome);

  const snap = await store.load(id);
  assert.deepEqual(
    snap.events.map((e) => e.name),
    ['Ana', 'Breno', 'Cecília', 'Davi'],
  );
});

await it('o guarda barra a leitura antes de ela acontecer', async () => {
  const { store, guard } = novaLoja({ ...FOLGADO, reads: 3 });
  const id = await store.createGroup('Clube');
  guard.stop('manual');

  await assert.rejects(() => store.load(id), (e) => e instanceof UsageBlockedError);
});

await it('o guarda barra a escrita antes de ela acontecer', async () => {
  const { store, guard } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  guard.stop('manual');

  await assert.rejects(() => store.addMember(id, 'Ana'), (e) => e instanceof UsageBlockedError);
});

await it('orçamento apertado impede o gasto em vez de estourar', async () => {
  const { store, guard } = novaLoja({ ...FOLGADO, writes: 2 });
  await assert.rejects(async () => {
    const id = await store.createGroup('Clube');
    await store.addMember(id, 'Ana');
    await store.addMember(id, 'Breno');
  }, (e) => e instanceof UsageBlockedError);
  assert.ok(guard.snapshot().writes <= 2, 'não passou do orçamento');
});

await it('um grupo inexistente falha claro', async () => {
  const { store } = novaLoja(FOLGADO);
  await assert.rejects(() => store.load('nao-existe'));
});

await it('duas rodadas completas não repetem ninguém dentro da rodada', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  for (const nome of ['Ana', 'Breno', 'Cecília']) await store.addMember(id, nome);

  // A espera de 30s é real, então este teste força o tempo do lado do log:
  // gira uma vez e confere a regra no replay, que é onde ela vive.
  await store.spin(id);
  const snap = await store.load(id);
  const rodada1 = snap.state.spins.filter((s) => s.round === 1).map((s) => s.winnerId);
  assert.equal(new Set(rodada1).size, rodada1.length);
});

await it('etiqueta um giro e a etiqueta volta do log', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.spin(id);

  await store.annotateSpin(id, 0, { title: 'Click The Button!', description: 'Nota final 8/10' }, 'Igor');

  const snap = await store.load(id);
  assert.equal(snap.state.lastSpin.note.title, 'Click The Button!');
  assert.equal(snap.state.lastSpin.note.description, 'Nota final 8/10');
  assert.equal(snap.state.lastSpin.note.actor, 'Igor');
  assert.equal(snap.state.lastSpin.note.revision, 1);
});

await it('outro aparelho lê a etiqueta pelo delta, sem reler o log inteiro', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.spin(id);

  // Um segundo cliente, cache próprio, já em dia com o log.
  const outro = novaLoja(FOLGADO);
  await outro.store.load(id);
  const antes = outro.guard.snapshot().reads;

  await store.annotateSpin(id, 0, { title: 'Overcooked', description: '' });
  const snap = await outro.store.load(id);

  assert.equal(snap.state.spins[0].note.title, 'Overcooked');
  // 1 leitura do doc do grupo + 1 do único evento novo.
  assert.equal(outro.guard.snapshot().reads - antes, 2);
});

await it('reescrever a etiqueta é outro evento, e a última vale', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.spin(id);

  await store.annotateSpin(id, 0, { title: 'Tetris', description: 'Nota 7/10' }, 'Ana');
  await store.annotateSpin(id, 0, { title: 'Tetris Effect', description: 'Nota 9/10' }, 'Breno');

  const snap = await store.load(id);
  assert.equal(snap.state.spins[0].note.title, 'Tetris Effect');
  assert.equal(snap.state.spins[0].note.revision, 2);
  assert.equal(snap.state.spins[0].note.actor, 'Breno');
  // Nada foi reescrito: as três escritas continuam no log.
  assert.equal(snap.logVersion, 5);
});

await it('retirar a etiqueta é gravá-la em branco', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.spin(id);
  await store.annotateSpin(id, 0, { title: 'Tetris', description: '' });
  await store.clearSpinNote(id, 0);

  const snap = await store.load(id);
  assert.equal(snap.state.spins[0].note, null);
});

await it('texto longo com emoji atravessa as rules em vez de ser recusado', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.spin(id);

  await store.annotateSpin(id, 0, { title: '🎮'.repeat(200), description: '🕹️'.repeat(600) });

  const snap = await store.load(id);
  // As rules medem em unidades UTF-16; o cliente corta na mesma medida, sem partir emoji.
  assert.ok(snap.state.spins[0].note.title.length <= 80);
  assert.ok(snap.state.spins[0].note.description.length <= 280);
  assert.ok([...snap.state.spins[0].note.title].every((c) => c.codePointAt(0) !== 0xfffd));
  assert.equal(snap.state.spins[0].note.title, '🎮'.repeat(40));
});

await it('etiquetar não gasta a espera do próximo giro', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');
  await store.addMember(id, 'Breno');
  await store.spin(id);
  const antes = (await store.load(id)).lastSpinAt;

  await store.annotateSpin(id, 0, { title: 'Pico Park', description: '' });

  assert.equal((await store.load(id)).lastSpinAt, antes);
});

await it('etiquetar um giro que não existe é recusado pelo servidor', async () => {
  const { store } = novaLoja(FOLGADO);
  const id = await store.createGroup('Clube');
  await store.addMember(id, 'Ana');

  await assert.rejects(() => store.annotateSpin(id, 99, { title: 'Fantasma', description: '' }));
  await assert.rejects(() => store.annotateSpin(id, -1, { title: 'Fantasma', description: '' }));
});

for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}`);
  if (!r.ok) console.log(`        ${r.error?.message?.split('\n')[0] ?? r.error}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} integrações verificadas`);
process.exit(failed ? 1 : 0);
