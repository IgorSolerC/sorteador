// Semeia o emulador com giros e etiquetas, para teste manual e para as capturas.
//   npm run emu:free && firebase emulators:start --only firestore,auth --project sorteador-ed1c9
//   node tests/seed-etiquetas.mjs        (SEED_ID=<id> muda o grupo; padrão "demo")
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore(initializeApp({ projectId: 'sorteador-ed1c9' }));
const ID = process.env.SEED_ID ?? 'demo';
const base = Date.now() - 300 * 24 * 60 * 60_000;
const at = (m) => new Date(base + m * 60_000);

const eventos = [];
let t = 0;
for (const nome of ['Ana', 'Breno', 'Cecília', 'Davi', 'Elisa']) {
  eventos.push({ tipo: 'member_added', em: at((t += 1)), nome });
}

// Sete giros: a rodada 1 fecha com cinco, a 2 fica pela metade.
const autores = ['Igor', 'Bia', 'Igor', 'Nina', 'Bia', 'Igor', 'Nina'];
for (const autor of autores) eventos.push({ tipo: 'spin', em: at((t += 43_200)), autor });

// Etiquetas de tamanhos bem diferentes, para a parede provar que aguenta os extremos.
const etiquetas = [
  [0, 'Click The Button!', 'Nota final 8/10. Jogamos em cinco e ninguém quis parar antes das duas da manhã.', 'Igor'],
  [1, 'Overcooked 2', 'Nota 6/10 — brigamos por causa da cozinha do navio e ficou por isso mesmo.', 'Bia'],
  [2, 'Tetris Effect: Connected', '', 'Igor'],
  [4, 'Um título propositalmente longo para ver onde a etiqueta decide quebrar a linha', 'Descrição longa de propósito, para medir a altura do cartão e o corte em quatro linhas: ' + 'jogamos muito, rimos mais ainda, e no fim ninguém lembrava o placar. '.repeat(3), 'Nina'],
  [6, 'Pico Park', 'Nota 9/10 🎮 Cooperação pura. Repetiríamos.', 'Bia'],
];
for (const [giro, titulo, descricao, autor] of etiquetas) {
  eventos.push({ tipo: 'spin_annotated', em: at((t += 30)), giro, titulo, descricao, autor });
}

const grupo = db.collection('grupos').doc(ID);
const antigos = await grupo.collection('eventos').get();
await Promise.all(antigos.docs.map((d) => d.ref.delete()));
await grupo.set({
  nome: 'Clube de Jogos',
  criadoEm: at(0),
  // Antiga o bastante para o botão de girar já nascer liberado.
  ultimoGiroEm: new Date(Date.now() - 5 * 60_000),
  versaoLog: eventos.length,
});
for (const e of eventos) await grupo.collection('eventos').add(e);

console.log(`grupo "${ID}" semeado: 5 pessoas, 7 giros, ${etiquetas.length} etiquetas`);
process.exit(0);
