import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

/**
 * As rules rodam contra o emulador local, então esta suíte não precisa de projeto nem de
 * rede. É o único lugar onde o modelo de segurança é de fato provado: todo o resto assume
 * que ele vale.
 */

const testEnv = await initializeTestEnvironment({
  projectId: 'mesa-do-mes-rules-test',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

const results = [];
async function it(name, body) {
  try {
    await body();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

const GRUPO = 'grupo-de-teste';
const alice = () => testEnv.authenticatedContext('alice').firestore();
const anonimo = () => testEnv.unauthenticatedContext().firestore();

const grupoNovo = {
  nome: 'Clube de Jogos',
  criadoEm: serverTimestamp(),
  ultimoGiroEm: null,
  versaoLog: 0,
};

async function comGrupo(extra = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'grupos', GRUPO), {
      ...grupoNovo,
      criadoEm: new Date(),
      ...extra,
    });
  });
}

/** Um evento só entra em lote com o incremento do contador, como as rules exigem. */
function gravaEvento(db, dados, { versaoAtual = 0, incremento = 1, grupoExtra = {} } = {}) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'grupos', GRUPO, 'eventos')), dados);
  batch.update(doc(db, 'grupos', GRUPO), {
    versaoLog: versaoAtual + incremento,
    ...grupoExtra,
  });
  return batch.commit();
}

function eventoSozinho(db, dados) {
  return addDoc(collection(db, 'grupos', GRUPO, 'eventos'), dados);
}

const entrada = (nome = 'Ana') => ({ tipo: 'member_added', em: serverTimestamp(), nome });
const giro = () => ({ tipo: 'spin', em: serverTimestamp() });

// --- quem pode falar com o banco ---

await it('sem autenticação, nada é lido', async () => {
  await comGrupo();
  await assertFails(getDoc(doc(anonimo(), 'grupos', GRUPO)));
});

await it('sem autenticação, nada é escrito', async () => {
  await assertFails(setDoc(doc(anonimo(), 'grupos', 'outro'), grupoNovo));
});

await it('autenticado lê um grupo que conhece pelo id', async () => {
  await comGrupo();
  await assertSucceeds(getDoc(doc(alice(), 'grupos', GRUPO)));
});

await it('ninguém lista grupos: o link tem que continuar sendo o segredo', async () => {
  await comGrupo();
  await assertFails(getDocs(collection(alice(), 'grupos')));
});

await it('quem tem o link lê o log inteiro', async () => {
  await comGrupo();
  await assertSucceeds(getDocs(collection(alice(), 'grupos', GRUPO, 'eventos')));
});

// --- criação e forma do grupo ---

await it('cria um grupo bem formado', async () => {
  await assertSucceeds(setDoc(doc(alice(), 'grupos', 'novo-grupo'), grupoNovo));
});

await it('recusa grupo que já nasce com giro registrado', async () => {
  await assertFails(
    setDoc(doc(alice(), 'grupos', 'g2'), { ...grupoNovo, ultimoGiroEm: serverTimestamp() }),
  );
});

await it('recusa grupo com contador de log adiantado', async () => {
  await assertFails(setDoc(doc(alice(), 'grupos', 'g3'), { ...grupoNovo, versaoLog: 7 }));
});

await it('recusa campo desconhecido no grupo', async () => {
  await assertFails(setDoc(doc(alice(), 'grupos', 'g4'), { ...grupoNovo, admin: true }));
});

await it('recusa o antigo campo de estado derivado', async () => {
  await assertFails(
    setDoc(doc(alice(), 'grupos', 'g5'), { ...grupoNovo, estado: { ultimoVencedor: 'Ana' } }),
  );
});

await it('recusa nome vazio', async () => {
  await assertFails(setDoc(doc(alice(), 'grupos', 'g6'), { ...grupoNovo, nome: '' }));
});

await it('nenhum grupo pode ser apagado', async () => {
  await comGrupo();
  await assertFails(deleteDoc(doc(alice(), 'grupos', GRUPO)));
});

// --- o log é append-only, que é o coração do modelo ---

await it('aceita um evento carimbado pelo servidor, em lote com o contador', async () => {
  await comGrupo();
  await assertSucceeds(gravaEvento(alice(), entrada()));
});

await it('BURACO FECHADO: evento sozinho, sem mexer no contador, é recusado', async () => {
  await comGrupo({ versaoLog: 5 });
  await assertFails(eventoSozinho(alice(), entrada('Furtivo')));
});

await it('recusa evento com contador pulando', async () => {
  await comGrupo({ versaoLog: 5 });
  await assertFails(gravaEvento(alice(), entrada(), { versaoAtual: 5, incremento: 4 }));
});

await it('recusa evento com contador parado', async () => {
  await comGrupo({ versaoLog: 5 });
  await assertFails(gravaEvento(alice(), entrada(), { versaoAtual: 5, incremento: 0 }));
});

await it('recusa evento com hora escolhida pelo cliente', async () => {
  await comGrupo();
  await assertFails(
    gravaEvento(alice(), { tipo: 'member_added', em: new Date('2020-01-01'), nome: 'Ana' }),
  );
});

await it('recusa tipo de evento inventado', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), { tipo: 'definir_vencedor', em: serverTimestamp() }));
});

await it('recusa evento que tenta gravar um vencedor', async () => {
  await comGrupo();
  await assertFails(
    gravaEvento(alice(), { tipo: 'spin', em: serverTimestamp(), vencedor: 'Ana' }),
  );
});

await it('recusa entrada sem nome', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), { tipo: 'member_added', em: serverTimestamp() }));
});

await it('recusa nome absurdamente longo', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), entrada('x'.repeat(61))));
});

await it('recusa saída sem memberId', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), { tipo: 'member_removed', em: serverTimestamp() }));
});

await it('um evento gravado não pode ser reescrito', async () => {
  await comGrupo();
  let ref;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    ref = await addDoc(collection(ctx.firestore(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin',
      em: new Date(),
    });
  });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id), { tipo: 'member_added' }),
  );
});

await it('um evento gravado não pode ser apagado', async () => {
  await comGrupo();
  let ref;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    ref = await addDoc(collection(ctx.firestore(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin',
      em: new Date(),
    });
  });
  await assertFails(deleteDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id)));
});

// --- espera entre giros ---

await it('aceita o primeiro giro do grupo', async () => {
  await comGrupo({ ultimoGiroEm: null });
  await assertSucceeds(
    gravaEvento(alice(), giro(), { grupoExtra: { ultimoGiroEm: serverTimestamp() } }),
  );
});

await it('recusa um giro logo depois do anterior', async () => {
  await comGrupo({ ultimoGiroEm: new Date() });
  await assertFails(
    gravaEvento(alice(), giro(), { grupoExtra: { ultimoGiroEm: serverTimestamp() } }),
  );
});

await it('aceita um giro passada a espera', async () => {
  await comGrupo({ ultimoGiroEm: new Date(Date.now() - 60_000) });
  await assertSucceeds(
    gravaEvento(alice(), giro(), { grupoExtra: { ultimoGiroEm: serverTimestamp() } }),
  );
});

await it('a espera não bloqueia entrada e saída de gente', async () => {
  await comGrupo({ ultimoGiroEm: new Date() });
  await assertSucceeds(gravaEvento(alice(), entrada('Gabriela')));
});

await it('a marca do último giro não pode ser antedatada', async () => {
  await comGrupo({ ultimoGiroEm: null });
  await assertFails(
    gravaEvento(alice(), giro(), { grupoExtra: { ultimoGiroEm: new Date('2020-01-01') } }),
  );
});

// --- o doc do grupo não guarda mais nada derivado ---

await it('BURACO FECHADO: não dá para plantar um vencedor no doc do grupo', async () => {
  await comGrupo({ versaoLog: 1 });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO), {
      versaoLog: 2,
      estado: { ultimoVencedor: { nome: 'Impostor' } },
    }),
  );
});

await it('o nome do grupo não muda numa atualização', async () => {
  await comGrupo({ versaoLog: 1 });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 2, nome: 'Outro Clube' }),
  );
});

await it('a data de criação não pode ser reescrita', async () => {
  await comGrupo({ versaoLog: 1 });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 2, criadoEm: serverTimestamp() }),
  );
});

await it('o contador não anda para trás', async () => {
  await comGrupo({ versaoLog: 3 });
  await assertFails(updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 2 }));
});

// --- nada fora do desenho existe ---

await it('coleções fora do desenho são inacessíveis', async () => {
  await assertFails(setDoc(doc(alice(), 'qualquer', 'coisa'), { a: 1 }));
});

await it('subcoleção inventada dentro do grupo é inacessível', async () => {
  await comGrupo();
  await assertFails(setDoc(doc(alice(), 'grupos', GRUPO, 'segredos', 'x'), { a: 1 }));
});

await testEnv.cleanup();

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}`);
  if (!r.ok) console.log(`        ${r.error?.message?.split('\n')[0] ?? r.error}`);
}
console.log(`\n${results.length - failed.length}/${results.length} regras verificadas`);
assert.equal(failed.length, 0, `${failed.length} teste(s) de regra falharam`);
