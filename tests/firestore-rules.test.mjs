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
} from 'firebase/firestore';

/**
 * Rules run against the local emulator, so this suite needs no Firebase project and no
 * network. It is the only place the security model is actually proven: everything else
 * assumes the rules hold.
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
  estado: { membros: [], rodada: 1, bolo: [], ultimoVencedor: null },
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

await it('recusa nome vazio', async () => {
  await assertFails(setDoc(doc(alice(), 'grupos', 'g5'), { ...grupoNovo, nome: '' }));
});

await it('nenhum grupo pode ser apagado', async () => {
  await comGrupo();
  await assertFails(deleteDoc(doc(alice(), 'grupos', GRUPO)));
});

// --- o log é append-only, que é o coração do modelo ---

await it('aceita um evento carimbado pelo servidor', async () => {
  await comGrupo();
  await assertSucceeds(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'member_added',
      em: serverTimestamp(),
      nome: 'Ana',
    }),
  );
});

await it('recusa evento com hora escolhida pelo cliente', async () => {
  await comGrupo();
  await assertFails(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'member_added',
      em: new Date('2020-01-01'),
      nome: 'Ana',
    }),
  );
});

await it('recusa tipo de evento inventado', async () => {
  await comGrupo();
  await assertFails(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'definir_vencedor',
      em: serverTimestamp(),
      nome: 'Ana',
    }),
  );
});

await it('recusa evento que tenta gravar um vencedor', async () => {
  await comGrupo();
  await assertFails(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin',
      em: serverTimestamp(),
      vencedor: 'Ana',
    }),
  );
});

await it('recusa entrada sem nome', async () => {
  await comGrupo();
  await assertFails(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'member_added',
      em: serverTimestamp(),
    }),
  );
});

await it('recusa nome absurdamente longo', async () => {
  await comGrupo();
  await assertFails(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'member_added',
      em: serverTimestamp(),
      nome: 'x'.repeat(61),
    }),
  );
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
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin',
      em: serverTimestamp(),
    }),
  );
});

await it('recusa um giro logo depois do anterior', async () => {
  await comGrupo({ ultimoGiroEm: new Date() });
  await assertFails(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin',
      em: serverTimestamp(),
    }),
  );
});

await it('aceita um giro passada a espera', async () => {
  await comGrupo({ ultimoGiroEm: new Date(Date.now() - 60_000) });
  await assertSucceeds(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin',
      em: serverTimestamp(),
    }),
  );
});

await it('a espera não bloqueia entrada e saída de gente', async () => {
  await comGrupo({ ultimoGiroEm: new Date() });
  await assertSucceeds(
    addDoc(collection(alice(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'member_added',
      em: serverTimestamp(),
      nome: 'Gabriela',
    }),
  );
});

// --- contador de log ---

await it('o contador anda de um em um', async () => {
  await comGrupo({ versaoLog: 3 });
  await assertSucceeds(updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 4 }));
});

await it('o contador não pula', async () => {
  await comGrupo({ versaoLog: 3 });
  await assertFails(updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 9 }));
});

await it('o contador não anda para trás', async () => {
  await comGrupo({ versaoLog: 3 });
  await assertFails(updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 2 }));
});

await it('o nome do grupo não muda numa atualização de estado', async () => {
  await comGrupo({ versaoLog: 1 });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO), { versaoLog: 2, nome: 'Outro Clube' }),
  );
});

// --- nada fora do desenho existe ---

await it('coleções fora do desenho são inacessíveis', async () => {
  await assertFails(setDoc(doc(alice(), 'qualquer', 'coisa'), { a: 1 }));
});

await testEnv.cleanup();

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}`);
  if (!r.ok) console.log(`        ${r.error?.message?.split('\n')[0] ?? r.error}`);
}
console.log(`\n${results.length - failed.length}/${results.length} regras verificadas`);
assert.equal(failed.length, 0, `${failed.length} teste(s) de regra falharam`);
