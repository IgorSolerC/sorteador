import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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

await it('BURACO FECHADO: um giro que não carimba o relógio é recusado', async () => {
  // Sem esta regra a espera de 30s era conselho: bastava gravar o giro sem mexer na marca
  // para o relógio ficar parado e o giro seguinte passar na hora, quantas vezes quisesse.
  await comGrupo({ ultimoGiroEm: null });
  await assertFails(gravaEvento(alice(), giro()));
});

await it('um giro não pode carimbar o relógio com hora escolhida pelo cliente', async () => {
  await comGrupo({ ultimoGiroEm: null });
  await assertFails(
    gravaEvento(alice(), giro(), { grupoExtra: { ultimoGiroEm: new Date(2000, 0, 1) } }),
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

// --- etiquetas de giro ---

const etiqueta = (giroIndex = 0, extra = {}) => ({
  tipo: 'spin_annotated',
  em: serverTimestamp(),
  giro: giroIndex,
  titulo: 'Click The Button!',
  descricao: 'Nota final 8/10',
  ...extra,
});

await it('etiqueta um giro já registrado, em lote com o contador', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), etiqueta(0), { versaoAtual: 2 }));
});

await it('etiqueta sozinha, sem mexer no contador, é recusada', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(eventoSozinho(alice(), etiqueta(0)));
});

await it('recusa etiqueta de um giro além do fim do log', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), etiqueta(7), { versaoAtual: 2 }));
});

await it('recusa índice de giro negativo', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), etiqueta(-1), { versaoAtual: 2 }));
});

await it('recusa índice de giro fracionário', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), etiqueta(1.5), { versaoAtual: 2 }));
});

await it('recusa índice de giro que não é número', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), etiqueta('0'), { versaoAtual: 2 }));
});

await it('recusa título longo demais', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), etiqueta(0, { titulo: 'x'.repeat(81) }), { versaoAtual: 2 }),
  );
});

await it('recusa descrição longa demais', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), etiqueta(0, { descricao: 'x'.repeat(281) }), { versaoAtual: 2 }),
  );
});

await it('aceita etiqueta em branco: é assim que se retira uma', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(
    gravaEvento(alice(), etiqueta(0, { titulo: '', descricao: '' }), { versaoAtual: 2 }),
  );
});

await it('recusa etiqueta que também tenta entrar alguém no grupo', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), etiqueta(0, { nome: 'Impostor' }), { versaoAtual: 2 }));
});

await it('recusa campo de etiqueta num evento que não é etiqueta', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), { ...entrada('Ana'), titulo: 'Contrabando' }, { versaoAtual: 2 }),
  );
});

await it('a espera entre giros não bloqueia etiquetar', async () => {
  await comGrupo({ versaoLog: 2, ultimoGiroEm: new Date() });
  await assertSucceeds(gravaEvento(alice(), etiqueta(0), { versaoAtual: 2 }));
});

await it('etiquetar não pode empurrar a espera do próximo giro', async () => {
  await comGrupo({ versaoLog: 2, ultimoGiroEm: null });
  await assertFails(
    gravaEvento(alice(), etiqueta(0), {
      versaoAtual: 2,
      grupoExtra: { ultimoGiroEm: serverTimestamp() },
    }),
  );
});

await it('entrar no grupo também não pode empurrar a espera do giro', async () => {
  await comGrupo({ ultimoGiroEm: null });
  await assertFails(
    gravaEvento(alice(), entrada('Gabriela'), { grupoExtra: { ultimoGiroEm: serverTimestamp() } }),
  );
});

await it('uma etiqueta gravada não pode ser reescrita nem apagada', async () => {
  await comGrupo({ versaoLog: 2 });
  let ref;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    ref = await addDoc(collection(ctx.firestore(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin_annotated',
      em: new Date(),
      giro: 0,
      titulo: 'Tetris',
      descricao: '',
    });
  });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id), { titulo: 'Outro jogo' }),
  );
  await assertFails(deleteDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id)));
});

// --- subtítulo: saiu do produto, mas a rule continua aceitando a chave ---

await it('aceita etiqueta com subtítulo, de uma aba que ainda não recarregou', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(
    gravaEvento(alice(), etiqueta(0, { subtitulo: 'Nota 8/10' }), { versaoAtual: 2 }),
  );
});

await it('recusa subtítulo longo demais', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), etiqueta(0, { subtitulo: 'x'.repeat(61) }), { versaoAtual: 2 }),
  );
});

await it('aceita etiqueta só com subtítulo: o replay decide o resto', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(
    gravaEvento(alice(), etiqueta(0, { titulo: '', subtitulo: 'Nota 8/10' }), { versaoAtual: 2 }),
  );
});

await it('uma etiqueta sem o campo de subtítulo continua entrando', async () => {
  // É o que uma aba aberta antes do deploy manda. Recusá-la quebraria quem está com o
  // app na tela exatamente no minuto da publicação.
  await comGrupo({ versaoLog: 2 });
  const { subtitulo, ...semSubtitulo } = etiqueta(0, { subtitulo: 'x' });
  await assertSucceeds(gravaEvento(alice(), semSubtitulo, { versaoAtual: 2 }));
});

await it('recusa subtítulo num evento que não é etiqueta', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), { ...entrada('Ana'), subtitulo: 'Contrabando' }, { versaoAtual: 2 }),
  );
});

// --- a resenha de cada pessoa ---

const resenha = (giroIndex = 0, extra = {}) => ({
  tipo: 'spin_reviewed',
  em: serverTimestamp(),
  giro: giroIndex,
  autor: 'Ana',
  nota: 8,
  status: 'finalizado',
  ...extra,
});

await it('aceita a resenha mínima: nota final, completude e assinatura', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), resenha(0), { versaoAtual: 2 }));
});

await it('aceita a resenha inteira, com os cinco critérios e o texto', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), resenha(0, {
    diversao: 10, dificuldade: 0, historia: 5, qualidade: 9, jogabilidade: 7,
    texto: 'Melhor coop que já jogamos.',
  }), { versaoAtual: 2 }));
});

await it('recusa resenha sem assinatura: ela não seria de ninguém', async () => {
  // Sem autor não há de quem a resenha seja, e ninguém conseguiria editá-la depois.
  await comGrupo({ versaoLog: 2 });
  const { autor, ...semAutor } = resenha(0);
  await assertFails(gravaEvento(alice(), semAutor, { versaoAtual: 2 }));
});

await it('recusa resenha sem nota final', async () => {
  await comGrupo({ versaoLog: 2 });
  const { nota, ...semNota } = resenha(0);
  await assertFails(gravaEvento(alice(), semNota, { versaoAtual: 2 }));
});

await it('recusa resenha sem completude', async () => {
  await comGrupo({ versaoLog: 2 });
  const { status, ...semStatus } = resenha(0);
  await assertFails(gravaEvento(alice(), semStatus, { versaoAtual: 2 }));
});

await it('recusa nota acima da régua de onze casas', async () => {
  // Uma nota fora da régua envenenaria a média daquele jogo para sempre: o log não se
  // reescreve, e a média é derivada dele.
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { nota: 11 }), { versaoAtual: 2 }));
});

await it('recusa nota negativa', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { nota: -1 }), { versaoAtual: 2 }));
});

await it('recusa nota quebrada: a régua é de inteiros', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { nota: 7.5 }), { versaoAtual: 2 }));
});

await it('recusa critério fora da régua', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { dificuldade: 99 }), { versaoAtual: 2 }));
});

await it('recusa completude inventada', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { status: 'zerado' }), { versaoAtual: 2 }));
});

await it('recusa texto de resenha longo demais', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), resenha(0, { texto: 'x'.repeat(601) }), { versaoAtual: 2 }),
  );
});

await it('aceita o tempo de jogo em horas inteiras, e ele é opcional', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), resenha(0, { horas: 24 }), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), resenha(0), { versaoAtual: 2 }));
});

await it('recusa tempo de jogo quebrado, zerado ou absurdo', async () => {
  // Zero hora não é um tempo: é a ausência dele, e a ausência se diz não mandando a chave.
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { horas: 2.5 }), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { horas: 0 }), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { horas: 99999 }), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(0, { horas: '24' }), { versaoAtual: 2 }));
});

await it('recusa tempo de jogo num evento que não é resenha, e numa retirada', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), { ...entrada('Ana'), horas: 3 }, { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), {
    tipo: 'spin_reviewed', em: serverTimestamp(), giro: 0, autor: 'Ana', retirada: true, horas: 3,
  }, { versaoAtual: 2 }));
});

await it('recusa resenha de um giro que ainda não aconteceu', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), resenha(9), { versaoAtual: 2 }));
});

await it('aceita a retirada da própria resenha, sem nota nenhuma junto', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), {
    tipo: 'spin_reviewed', em: serverTimestamp(), giro: 0, autor: 'Ana', retirada: true,
  }, { versaoAtual: 2 }));
});

await it('recusa retirada que ainda carrega nota: ela não retira nada', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), {
    tipo: 'spin_reviewed', em: serverTimestamp(), giro: 0, autor: 'Ana',
    retirada: true, nota: 8, status: 'finalizado',
  }, { versaoAtual: 2 }));
});

await it('recusa campo de resenha num evento que não é resenha', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), { ...entrada('Ana'), nota: 10 }, { versaoAtual: 2 }),
  );
  await assertFails(
    gravaEvento(alice(), { ...etiqueta(0), status: 'platinado' }, { versaoAtual: 2 }),
  );
});

await it('recusa campo de etiqueta numa resenha', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(
    gravaEvento(alice(), resenha(0, { titulo: 'Contrabando' }), { versaoAtual: 2 }),
  );
});

await it('uma resenha não pode empurrar a espera do próximo giro', async () => {
  const agora = new Date();
  await comGrupo({ versaoLog: 2, ultimoGiroEm: agora });
  await assertFails(gravaEvento(alice(), resenha(0), {
    versaoAtual: 2,
    grupoExtra: { ultimoGiroEm: serverTimestamp() },
  }));
});

await it('uma resenha gravada não pode ser reescrita nem apagada', async () => {
  // Reescrever é gravar outra; o replay faz a última valer. O log em si é imutável.
  await comGrupo({ versaoLog: 2 });
  let ref;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    ref = await addDoc(collection(ctx.firestore(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin_reviewed', em: new Date(), giro: 0, autor: 'Ana', nota: 8, status: 'finalizado',
    });
  });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id), { nota: 10 }),
  );
  await assertFails(deleteDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id)));
});

// --- a mesa de um jogo: quem jogou, nunca quem estava no globo ---

const cadeira = (extra = {}) => ({
  tipo: 'spin_seated',
  em: serverTimestamp(),
  giro: 0,
  memberId: 'a1b2c3d4e5f60718',
  mesa: true,
  autor: 'Ana',
  ...extra,
});

await it('aceita pôr e tirar alguém da mesa de um giro que já aconteceu', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), cadeira(), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertSucceeds(gravaEvento(alice(), cadeira({ mesa: false }), { versaoAtual: 2 }));
});

await it('recusa mesa de um giro que ainda não aconteceu', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), cadeira({ giro: 9 }), { versaoAtual: 2 }));
});

await it('recusa mesa sem pessoa, e mesa que não diz de que lado está', async () => {
  await comGrupo({ versaoLog: 2 });
  const { memberId, ...semPessoa } = cadeira();
  await assertFails(gravaEvento(alice(), semPessoa, { versaoAtual: 2 }));

  await comGrupo({ versaoLog: 2 });
  const { mesa, ...semLado } = cadeira();
  await assertFails(gravaEvento(alice(), semLado, { versaoAtual: 2 }));

  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), cadeira({ mesa: 'sim' }), { versaoAtual: 2 }));
});

await it('recusa campo de mesa num evento que não é mesa', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), { ...entrada('Ana'), mesa: true }, { versaoAtual: 2 }));
  await assertFails(gravaEvento(alice(), { ...etiqueta(0), mesa: true }, { versaoAtual: 2 }));
});

await it('recusa mesa que carrega nota, etiqueta ou pintura junto', async () => {
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), cadeira({ nota: 8 }), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), cadeira({ titulo: 'Contrabando' }), { versaoAtual: 2 }));
  await comGrupo({ versaoLog: 2 });
  await assertFails(gravaEvento(alice(), cadeira({ cor: 3 }), { versaoAtual: 2 }));
});

await it('a mesa não pode empurrar a espera do próximo giro', async () => {
  // Corrigir o elenco em rajada travaria a máquina do grupo inteiro sem girar uma vez.
  const agora = new Date();
  await comGrupo({ versaoLog: 2, ultimoGiroEm: agora });
  await assertFails(gravaEvento(alice(), cadeira(), {
    versaoAtual: 2,
    grupoExtra: { ultimoGiroEm: serverTimestamp() },
  }));
});

await it('uma cadeira gravada não pode ser reescrita nem apagada', async () => {
  await comGrupo({ versaoLog: 2 });
  let ref;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    ref = await addDoc(collection(ctx.firestore(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'spin_seated', em: new Date(), giro: 0, memberId: 'a1b2c3d4e5f60718', mesa: true,
    });
  });
  await assertFails(
    updateDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id), { mesa: false }),
  );
  await assertFails(deleteDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id)));
});

// --- a cápsula de cada pessoa: cor e emoji ---

const pintura = (extra = {}) => ({
  tipo: 'member_styled',
  em: serverTimestamp(),
  memberId: 'a1b2c3d4e5f60718',
  cor: 5,
  ...extra,
});

await it('pinta a cápsula de alguém, em lote com o contador', async () => {
  await comGrupo();
  await assertSucceeds(gravaEvento(alice(), pintura()));
});

await it('aceita cor e emoji na mesma pintura', async () => {
  await comGrupo();
  await assertSucceeds(gravaEvento(alice(), pintura({ emoji: '🎮' })));
});

await it('aceita pintura só de emoji: trocar o símbolo não muda a cor', async () => {
  await comGrupo();
  const { cor, ...semCor } = pintura();
  await assertSucceeds(gravaEvento(alice(), { ...semCor, emoji: '🎲' }));
});

await it('aceita emoji em branco: é assim que se retira o símbolo', async () => {
  await comGrupo();
  const { cor, ...semCor } = pintura();
  await assertSucceeds(gravaEvento(alice(), { ...semCor, emoji: '' }));
});

await it('recusa pintura sem cor e sem emoji: não mudaria nada e custaria uma escrita', async () => {
  await comGrupo();
  const { cor, ...semCor } = pintura();
  await assertFails(gravaEvento(alice(), semCor));
});

await it('recusa cor fora da paleta', async () => {
  // A cor é uma posição na paleta, nunca um hexadecimal livre: é o que garante que toda
  // cápsula continue passando no contraste sem as regras precisarem calcular contraste.
  await comGrupo();
  await assertFails(gravaEvento(alice(), pintura({ cor: 24 })));
});

await it('recusa cor negativa', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), pintura({ cor: -1 })));
});

await it('recusa cor fracionária', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), pintura({ cor: 2.5 })));
});

await it('recusa cor que não é número', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), pintura({ cor: '5' })));
});

await it('recusa emoji longo demais', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), pintura({ emoji: 'x'.repeat(17) })));
});

await it('recusa pintura sem alvo', async () => {
  await comGrupo();
  const { memberId, ...semAlvo } = pintura();
  await assertFails(gravaEvento(alice(), semAlvo));
});

await it('recusa pintura que também tenta entrar alguém no grupo', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), pintura({ nome: 'Impostor' })));
});

await it('recusa campo de pintura num evento que não é pintura', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), { ...entrada('Ana'), cor: 3 }));
});

await it('recusa emoji num evento que não é pintura', async () => {
  await comGrupo();
  await assertFails(gravaEvento(alice(), { ...entrada('Ana'), emoji: '🎮' }));
});

await it('pintar não pode empurrar a espera do próximo giro', async () => {
  await comGrupo({ ultimoGiroEm: null });
  await assertFails(
    gravaEvento(alice(), pintura(), { grupoExtra: { ultimoGiroEm: serverTimestamp() } }),
  );
});

await it('a espera entre giros não bloqueia pintar', async () => {
  await comGrupo({ ultimoGiroEm: new Date() });
  await assertSucceeds(gravaEvento(alice(), pintura()));
});

await it('uma pintura gravada não pode ser reescrita', async () => {
  // Repintar é outro evento; o log continua sendo a verdade.
  await comGrupo();
  let ref;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    ref = await addDoc(collection(ctx.firestore(), 'grupos', GRUPO, 'eventos'), {
      tipo: 'member_styled', em: new Date(), memberId: 'a1b2c3d4e5f60718', cor: 5,
    });
  });
  await assertFails(
    setDoc(doc(alice(), 'grupos', GRUPO, 'eventos', ref.id), { cor: 9 }, { merge: true }),
  );
});

// --- o teto da paleta nas regras acompanha a paleta do app ---

await it('o limite de cor nas regras é o tamanho real da paleta', async () => {
  const { CAPSULE_COLOR_COUNT } = await import('../tmpjs/src/app/palette.js');
  const regras = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const teto = /d\.cor\s*<\s*(\d+)/.exec(regras);
  if (!teto) throw new Error('não achei o teto de cor nas regras');
  if (Number(teto[1]) !== CAPSULE_COLOR_COUNT) {
    throw new Error(
      `as regras aceitam cor < ${teto[1]} e a paleta tem ${CAPSULE_COLOR_COUNT} cores. ` +
      'Crescer a paleta sem mexer nas regras deixa as cores novas sendo recusadas pelo servidor.',
    );
  }
});

await testEnv.cleanup();

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? '  ok  ' : ' FAIL '} ${r.name}`);
  if (!r.ok) console.log(`        ${r.error?.message?.split('\n')[0] ?? r.error}`);
}
console.log(`\n${results.length - failed.length}/${results.length} regras verificadas`);
assert.equal(failed.length, 0, `${failed.length} teste(s) de regra falharam`);
