import type { AlbumSort, RoundSection } from './group-history';
import { SpinRecord, formatScore, reviewersLabel, scoreTone, spinScores } from './group-log';
import { albumMetrics } from './album-metrics';

const CARD_W = 440;
const CARD_H = 428;
/** A faixa é a cápsula aberta, e é ela que carrega quem escolheu o jogo. */
const BAND_H = 128;
const GAP = 32;
const MARGIN = 56;
const HEADER = 240;
const INK = '#16233a';
const QUIET = '#5b6779';
const PAPER = '#faf6ec';
const PAPER_QUIET = '#f0e9d9';
const DISPLAY = '"Fredoka Variable", "Trebuchet MS", sans-serif';
const BODY = '"Atkinson Hyperlegible", sans-serif';
const MONO = '"Martian Mono", monospace';
const EMOJI = '"Segoe UI Emoji", sans-serif';
const TONES = { high: '#0b6f7d', mid: INK, low: '#a8481a', worst: '#ae1f16' };

export interface AlbumPosterInput {
  readonly groupName: string;
  readonly sections: readonly RoundSection[];
  readonly sort: AlbumSort;
  readonly sealedOf: (spin: SpinRecord) => boolean;
  readonly colorOf: (spin: SpinRecord) => string;
  readonly inkOf: (spin: SpinRecord) => string;
  readonly emojiOf: (spin: SpinRecord) => string;
}

/** Uma coleção impressa, sem URL: o link do grupo é uma credencial, nunca um ornamento. */
export async function renderAlbumPoster(input: AlbumPosterInput): Promise<Blob> {
  await document.fonts?.ready;
  // A família variável precisa do nome registrado no @font-face, não do nome comercial.
  await document.fonts?.load(`600 32px ${DISPLAY}`);
  const cards = input.sections.flatMap((section) => section.spins);
  const columns = cards.length <= 1 ? 1 : cards.length <= 8 ? 2 : cards.length <= 18 ? 3 : cards.length <= 48 ? 4 : 8;
  const rows = Math.max(1, Math.ceil(cards.length / columns));
  const width = MARGIN * 2 + columns * CARD_W + (columns - 1) * GAP;
  const height = HEADER + rows * CARD_H + (rows - 1) * GAP + 104;
  // Álbuns longos não podem exceder o limite de dimensão ou consumir centenas de MB.
  const scale = Math.min(2, 16384 / width, 16384 / height, Math.sqrt(32_000_000 / (width * height)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não desenha em canvas.');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#10233f';
  ctx.fillRect(0, 0, width, height);
  text(ctx, input.groupName, MARGIN, 110, 64, '#ffffff', DISPLAY, 600, width - MARGIN * 2);
  text(ctx, 'O álbum do clube', MARGIN, 153, 26, '#bccde6', BODY);
  // A ordem da parede continua sendo dita: a imagem sai na sequência que está na tela, e
  // sem essa linha uma coleção ordenada por diversão pareceria fora de ordem.
  const sortLabel = input.sort === 'rodada' || !cards.length ? 'Por rodada' : `Por ${albumMetrics(cards[0], input.sort).hero.label.toLowerCase()}`;
  text(ctx, `${cards.length} ${cards.length === 1 ? 'ficha' : 'fichas'} nesta coleção · ${sortLabel}`, MARGIN, 191, 17, '#bccde6', BODY);
  cards.forEach((spin, i) => card(ctx, input, spin,
    MARGIN + (i % columns) * (CARD_W + GAP), HEADER + Math.floor(i / columns) * (CARD_H + GAP)));
  text(ctx, 'Mesa do Mês', MARGIN, height - 52, 22, '#ffffff', DISPLAY, 600);
  text(ctx, `Coleção de ${date(Date.now())} · A nota é a média das resenhas do clube`, MARGIN, height - 25, 13, '#bccde6', BODY);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível gerar o PNG.')), 'image/png'));
}

/**
 * Uma ficha impressa diz três coisas, e só três: quem escolheu, o que o clube jogou e a
 * nota que ele deu. A imagem é lida no grupo do clube, longe do produto e num tamanho que
 * ninguém amplia — critérios, completude e descrição chegavam ali como letra miúda que só
 * competia com o que importa. Quem quer o boletim inteiro abre a ficha do jogo.
 */
function card(ctx: CanvasRenderingContext2D, input: AlbumPosterInput, spin: SpinRecord, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = spin.note ? PAPER : PAPER_QUIET;
  ctx.beginPath(); ctx.roundRect(0, 0, CARD_W, CARD_H, 12); ctx.fill(); ctx.clip();
  // A faixa é a cápsula aberta: cor da pessoa, cúpula e tinta AA dela impressas no papel.
  const ink = input.inkOf(spin);
  ctx.fillStyle = input.colorOf(spin);
  ctx.fillRect(0, 0, CARD_W, BAND_H);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.12;
  ctx.beginPath(); ctx.arc(CARD_W - 24, 10, 104, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Sem emoji escolhido a inicial ocupa o lugar dele: a faixa tem uma coluna só, e um
  // símbolo ausente deixaria o nome deslizando de cartão para cartão.
  const emoji = input.emojiOf(spin);
  text(ctx, emoji || spin.winnerName.slice(0, 1).toUpperCase(), 30, 86, 46, ink, emoji ? EMOJI : DISPLAY, 600);
  text(ctx, spin.winnerName, 96, 68, 30, ink, DISPLAY, 600, CARD_W - 124);
  text(ctx, 'escolheu', 96, 94, 15, ink, BODY);
  // Cápsula em branco é papel silencioso, e não diz também que não tem nota: sem jogo
  // escrito, a nota ausente é a mesma ausência dita duas vezes.
  if (!spin.note) {
    text(ctx, 'Sem jogo escrito', 28, 200, 26, QUIET, DISPLAY, 600, CARD_W - 56);
    // O fio tracejado é o que ainda não foi escrito, como na parede — e ele mora no papel,
    // não em cima da faixa, onde a cor da pessoa engoliria a linha em metade das cápsulas.
    // Ele também toma o lugar do picote: duas linhas na mesma altura brigam, e o picote
    // separa a identidade de um conteúdo que aqui ainda não existe.
    ctx.strokeStyle = 'rgba(22, 35, 58, .28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.roundRect(10, BAND_H + 10, CARD_W - 20, CARD_H - BAND_H - 20, 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  perforation(ctx, BAND_H + 26);
  paragraph(ctx, spin.note.title, 28, 200, CARD_W - 56, 32, 37, 3, INK, DISPLAY, 600);
  const score = spinScores(spin);
  if (input.sealedOf(spin)) {
    // O lacre vale na imagem, e o que ele esconde é a média — não a fila que a espera.
    if (score.count) text(ctx, reviewersLabel(score.count), 28, 316, 15, QUIET, BODY, 400, CARD_W - 56);
    text(ctx, 'Lacrada', 28, 378, 56, QUIET, DISPLAY, 600);
  } else {
    text(ctx, score.score === null ? '—' : formatScore(score.score), 28, 378, 96, TONES[scoreTone(score.score)], DISPLAY, 600, CARD_W - 56);
  }
  text(ctx, 'NOTA DO CLUBE', 28, 404, 12, QUIET, MONO, 700);
  ctx.restore();
}

function perforation(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.fillStyle = QUIET; ctx.globalAlpha = 0.4;
  for (let x = 18; x < CARD_W - 18; x += 9) {
    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, font: string, weight = 400, maxWidth = Infinity): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillText(ellipsize(ctx, value, maxWidth), x, y);
}

function ellipsize(ctx: CanvasRenderingContext2D, value: string, width: number): string {
  if (ctx.measureText(value).width <= width) return value;
  const chars = Array.from(value);
  while (chars.length && ctx.measureText(chars.join('') + '…').width > width) chars.pop();
  return chars.join('').trimEnd() + '…';
}

function paragraph(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, lineHeight: number, lines: number, color: string, font: string, weight = 400): void {
  ctx.font = `${weight} ${size}px ${font}`;
  const words = value.trim().split(/\s+/);
  for (let line = 0; line < lines && words.length; line++) {
    let content = words.shift()!;
    if (line === lines - 1) content += words.length ? ' ' + words.splice(0).join(' ') : '';
    else while (words.length && ctx.measureText(content + ' ' + words[0]).width <= width) content += ' ' + words.shift();
    text(ctx, content, x, y + line * lineHeight, size, color, font, weight, width);
  }
}

function date(ms: number): string {
  return new Date(ms).toLocaleDateString('pt-BR');
}
