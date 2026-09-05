import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { memberId, replay } from '../tmpjs/src/app/group-log.js';

/**
 * Um grupo de mentira que se parece com um de verdade: gente com cápsula escolhida, giros
 * de rodadas diferentes, jogos etiquetados, resenhas e mesas corrigidas. Uma captura de um grupo recém
 * criado não mostra nada do que o produto construiu.
 *
 * Escreve pelo Admin SDK, que não passa pelas rules. É de propósito: a espera de 30s entre
 * giros é real e obrigatória — semear cinco giros pelo caminho normal levaria dois minutos
 * e meio. O formato gravado aqui é exatamente o que a loja grava, e o replay que a tela usa
 * é o mesmo; o que se pula é só o relógio.
 */

process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';

initializeApp({ projectId: 'sorteador-ed1c9' });
const db = getFirestore();

const id = process.env['SEED_ID'] ?? 'demo';
const grupo = db.collection('grupos').doc(id);
const eventos = grupo.collection('eventos');

// Um grupo semeado duas vezes sobre o anterior viraria uma lista duplicada.
const antigos = await eventos.get();
await Promise.all(antigos.docs.map((d) => d.ref.delete()));

const PESSOAS = [
  { nome: 'Ana', cor: 12, emoji: '🎮' },
  { nome: 'Breno', cor: 3, emoji: '🍕' },
  { nome: 'Cecília', cor: 20, emoji: '🦄' },
  { nome: 'Davi', cor: 8, emoji: '🐙' },
  { nome: 'Elisa', cor: 16, emoji: '🎯' },
  { nome: 'Fátima', cor: 22, emoji: '' },
];

const ETIQUETAS = [
  {
    titulo: 'Click The Button!',
    descricao: 'Jogamos em cinco e terminou empatado. O modo cooperativo salvou a noite.',
  },
  {
    titulo: 'Overcooked 2',
    descricao: 'Ninguém se falou por vinte minutos depois da fase do barco.',
  },
  { titulo: 'Corrida de Bocha 3', descricao: '' },
  {
    titulo: 'Lethal Company',
    descricao: 'A melhor até agora. Já marcamos a revanche.',
  },
];

/**
 * As resenhas por giro. O grupo semeado precisa mostrar as faixas de verdade: um jogo com
 * meia dúzia de resenhas, um com uma só, um sem nenhuma, resenha sem os critérios
 * opcionais, tempo de jogo em umas e não em outras, e texto longo. Precisa cobrir também as três faixas da nota, porque é a nota
 * que decide a tinta na tela: um jogo que o clube amou, um mediano e um que foi um desastre.
 * As dificuldades são sempre um dos cinco degraus (0, 2, 5, 8, 10), que é o que a ficha
 * grava desde que ela virou uma escolha por palavra. Quem platinou pode trazer as duas
 * medidas da platina — e o grupo precisa de uma platina sem elas, porque respondê-las
 * continua sendo opcional.
 */
const RESENHAS = [
  [
    { autor: 'Ana', nota: 8, status: 'finalizado', horas: 3, diversao: 9, dificuldade: 2, historia: 5, qualidade: 8, jogabilidade: 8, texto: 'Simples até demais, mas não largamos por duas horas.' },
    { autor: 'Breno', nota: 7, status: 'incompleto', horas: 2, diversao: 8, dificuldade: 5 },
    { autor: 'Cecília', nota: 9, status: 'platinado', horas: 6, diversao: 10, dificuldade: 2, qualidade: 9, jogabilidade: 9, dificuldadePlatina: 2, diversaoPlatina: 9, texto: 'Platinei na mesma noite. O botão é uma piada boa que não cansa.' },
    { autor: 'Davi', nota: 6, status: 'incompleto', texto: 'Não é para mim, mas entendo a graça.' },
  ],
  [
    { autor: 'Ana', nota: 10, status: 'platinado', horas: 24, diversao: 10, dificuldade: 8, historia: 4, qualidade: 9, jogabilidade: 10, dificuldadePlatina: 10, diversaoPlatina: 5, texto: 'Melhor coop que já jogamos. A fase do barco é uma prova de amizade e a gente reprovou.' },
    { autor: 'Breno', nota: 9, status: 'finalizado', horas: 18, diversao: 10, dificuldade: 8, qualidade: 9 },
    { autor: 'Elisa', nota: 9, status: 'finalizado', horas: 21, diversao: 9, dificuldade: 8, jogabilidade: 8, texto: 'Grito muito. Nota alta mesmo assim.' },
    { autor: 'Fátima', nota: 8, status: 'incompleto', dificuldade: 10 },
    { autor: 'Cecília', nota: 10, status: 'platinado', diversao: 10, qualidade: 10, jogabilidade: 9 },
  ],
  [
    { autor: 'Davi', nota: 2, status: 'incompleto', horas: 4, diversao: 2, dificuldade: 8, historia: 3, qualidade: 4, jogabilidade: 2, texto: 'Desistimos na terceira fase. A câmera é inimiga e ninguém pediu isso.' },
    { autor: 'Elisa', nota: 4, status: 'incompleto', diversao: 3, dificuldade: 10, jogabilidade: 2 },
  ],
  [],
];

// Um mês de história, um evento a cada poucas horas, para as datas na tela fazerem sentido.
let relogio = Date.now() - 30 * 24 * 60 * 60 * 1000;
const daqui = (horas) => new Date((relogio += horas * 60 * 60 * 1000));

const log = [];
async function grava(dados, horas = 3) {
  const em = daqui(horas);
  await eventos.add({ ...dados, em });
  log.push({ ...dados, em });
}

await grupo.set({
  nome: 'Clube de Jogos',
  criadoEm: new Date(relogio),
  ultimoGiroEm: null,
  versaoLog: 0,
});

for (const pessoa of PESSOAS) await grava({ tipo: 'member_added', nome: pessoa.nome, autor: 'Igor' }, 0.2);
for (const pessoa of PESSOAS) {
  await grava({
    tipo: 'member_styled',
    memberId: memberId(id, pessoa.nome),
    cor: pessoa.cor,
    emoji: pessoa.emoji,
    autor: pessoa.nome,
  }, 0.1);
}

/**
 * Correções de mesa. O grupo semeado precisa de pelo menos uma, porque "X resenhas de Y"
 * só se lê direito quando Y não é sempre o tamanho do globo: aqui Fátima entrou no clube
 * e não foi à noite do primeiro jogo.
 */
const MESAS = [[{ pessoa: 'Fátima', mesa: false }], [], [], [], []];

let ultimoGiro = null;
for (let i = 0; i < 5; i += 1) {
  await grava({ tipo: 'spin', autor: 'Igor' }, 24 * 4);
  ultimoGiro = log[log.length - 1].em;
  if (ETIQUETAS[i]) await grava({ tipo: 'spin_annotated', giro: i, autor: 'Bia', ...ETIQUETAS[i] }, 2);
  for (const resenha of RESENHAS[i] ?? []) {
    const { autor, texto, ...notas } = resenha;
    await grava({ tipo: 'spin_reviewed', giro: i, autor, ...notas, ...(texto ? { texto } : {}) }, 0.4);
  }
  for (const cadeira of MESAS[i] ?? []) {
    await grava({
      tipo: 'spin_seated', giro: i, memberId: memberId(id, cadeira.pessoa),
      mesa: cadeira.mesa, autor: 'Bia',
    }, 0.2);
  }
}

await grupo.update({ versaoLog: log.length, ultimoGiroEm: ultimoGiro });

// Confere pelo mesmo replay que a tela usa: se o formato estiver errado, aparece aqui.
const estado = replay(id, log.map((e) => paraEvento(e)));
console.log(
  'grupo semeado:', id,
  '| vencedor:', estado.lastSpin?.winnerName,
  '| rodada:', estado.round,
  '| giros:', estado.spins.length,
  '| etiquetados:', estado.spins.filter((s) => s.note).length,
  '| resenhas:', estado.spins.reduce((t, s) => t + s.reviews.length, 0),
  '| mesas:', estado.spins.map((s) => `${s.reviews.length}/${s.seated.length}`).join(' '),
  '| bolo:', estado.pool.length,
  '| eventos:', log.length,
);
for (const m of estado.members) console.log('   ', m.name, '· cor', m.colorIndex, m.emoji);

function paraEvento(d) {
  const at = d.em.getTime();
  switch (d.tipo) {
    case 'member_added': return { type: 'member_added', at, name: d.nome, actor: d.autor };
    case 'member_styled':
      return {
        type: 'member_styled', at, memberId: d.memberId,
        colorIndex: typeof d.cor === 'number' ? d.cor : null,
        emoji: typeof d.emoji === 'string' ? d.emoji : null,
      };
    case 'spin': return { type: 'spin', at, actor: d.autor };
    case 'spin_annotated':
      return {
        type: 'spin_annotated', at, spinIndex: d.giro,
        title: d.titulo, description: d.descricao, actor: d.autor,
      };
    case 'spin_seated':
      return {
        type: 'spin_seated', at, spinIndex: d.giro, memberId: d.memberId,
        seated: d.mesa === true, actor: d.autor,
      };
    case 'spin_reviewed':
      return {
        type: 'spin_reviewed', at, spinIndex: d.giro, actor: d.autor,
        score: typeof d.nota === 'number' ? d.nota : null,
        criteria: {
          diversao: d.diversao, dificuldade: d.dificuldade, historia: d.historia,
          qualidade: d.qualidade, jogabilidade: d.jogabilidade,
          dificuldadePlatina: d.dificuldadePlatina, diversaoPlatina: d.diversaoPlatina,
        },
        status: d.status ?? null,
        hours: typeof d.horas === 'number' ? d.horas : null,
        text: d.texto ?? '',
        withdrawn: d.retirada === true,
      };
    default: return { type: 'unknown', at };
  }
}
