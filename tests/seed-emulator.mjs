import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { memberId, replay } from '../tmpjs/src/app/group-log.js';

/**
 * Um grupo de mentira que se parece com um de verdade: gente com cápsula escolhida, giros
 * de rodadas diferentes e etiquetas com título e subtítulo. Uma captura de um grupo recém
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
    subtitulo: 'Nota 8/10',
    descricao: 'Jogamos em cinco e terminou empatado. O modo cooperativo salvou a noite.',
  },
  {
    titulo: 'Overcooked 2',
    subtitulo: 'Nota 9/10',
    descricao: 'Ninguém se falou por vinte minutos depois da fase do barco.',
  },
  { titulo: 'Pico Park', subtitulo: 'Nota 7/10', descricao: '' },
  {
    titulo: 'Lethal Company',
    subtitulo: 'Nota 10/10',
    descricao: 'A melhor até agora. Já marcamos a revanche.',
  },
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

let ultimoGiro = null;
for (let i = 0; i < 5; i += 1) {
  await grava({ tipo: 'spin', autor: 'Igor' }, 24 * 4);
  ultimoGiro = log[log.length - 1].em;
  if (ETIQUETAS[i]) await grava({ tipo: 'spin_annotated', giro: i, autor: 'Bia', ...ETIQUETAS[i] }, 2);
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
        title: d.titulo, subtitle: d.subtitulo ?? '', description: d.descricao, actor: d.autor,
      };
    default: return { type: 'unknown', at };
  }
}
