import type { AlbumSort, RoundSection } from './group-history';
import { SpinRecord, completionShare, spinScores } from './group-log';
import { albumMetrics } from './album-metrics';

const CARD_W = 480;
const CARD_H = 680;
const GAP = 32;
const MARGIN = 56;
const INK = '#16233a';
const QUIET = '#5b6779';
const PAPER = '#faf6ec';
const DISPLAY = '"Fredoka Variable", "Trebuchet MS", sans-serif';
const BODY = '"Atkinson Hyperlegible", sans-serif';
const MONO = '"Martian Mono", monospace';
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
  const header = columns === 1 ? 420 : 330;
  const width = MARGIN * 2 + columns * CARD_W + (columns - 1) * GAP;
  const height = header + rows * CARD_H + (rows - 1) * GAP + 104;
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
  const sortLabel = input.sort === 'rodada' || !cards.length ? 'Por rodada' : `Por ${albumMetrics(cards[0], input.sort).hero.label.toLowerCase()}`;
  text(ctx, `${cards.length} ${cards.length === 1 ? 'ficha' : 'fichas'} nesta coleção · ${sortLabel}`, MARGIN, 191, 17, '#bccde6', BODY);
  // O resumo acompanha o filtro. Um lacre também vale na imagem que sai do produto.
  const sealed = cards.some(input.sealedOf);
  const reviewed = cards.map(spinScores).filter((score) => score.count);
  const average = reviewed.length ? (reviewed.reduce((sum, score) => sum + score.score!, 0) / reviewed.length).toFixed(1).replace('.', ',') : '—';
  const stats = [
    ['NOTA DO CLUBE', sealed ? 'Lacrada' : average],
    ['RESENHAS', sealed ? 'Lacradas' : String(reviewed.reduce((sum, score) => sum + score.count, 0))],
    ['RODADAS', String(new Set(cards.map((spin) => spin.round)).size)],
  ];
  const statColumns = columns === 1 ? 2 : 3;
  stats.forEach(([label, value], i) => {
    const x = MARGIN + (i % statColumns) * ((width - MARGIN * 2) / statColumns);
    const y = 241 + Math.floor(i / statColumns) * 84;
    text(ctx, label, x, y, 12, '#bccde6', MONO, 700);
    text(ctx, value, x, y + 37, 32, '#ffffff', DISPLAY, 600);
  });
  cards.forEach((spin, i) => card(ctx, input, spin,
    MARGIN + (i % columns) * (CARD_W + GAP), header + Math.floor(i / columns) * (CARD_H + GAP)));
  text(ctx, 'Mesa do Mês', MARGIN, height - 52, 22, '#ffffff', DISPLAY, 600);
  text(ctx, `Coleção de ${date(Date.now())} · Médias das resenhas do clube`, MARGIN, height - 25, 13, '#bccde6', BODY);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível gerar o PNG.')), 'image/png'));
}

function card(ctx: CanvasRenderingContext2D, input: AlbumPosterInput, spin: SpinRecord, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = PAPER;
  ctx.beginPath(); ctx.roundRect(0, 0, CARD_W, CARD_H, 12); ctx.fill(); ctx.clip();
  // A faixa é a cápsula aberta: cor da pessoa, costura e cúpula impressas no papel.
  ctx.fillStyle = input.colorOf(spin);
  ctx.fillRect(0, 0, CARD_W, 100);
  ctx.fillStyle = input.inkOf(spin);
  ctx.globalAlpha = 0.12;
  ctx.beginPath(); ctx.arc(CARD_W - 20, 14, 110, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  text(ctx, spin.winnerName, 28, 44, 28, input.inkOf(spin), DISPLAY, 600, CARD_W - 120);
  text(ctx, `Escolheu · ${date(spin.at)}`, 28, 75, 14, input.inkOf(spin), BODY);
  text(ctx, input.emojiOf(spin), CARD_W - 76, 63, 38, input.inkOf(spin), '"Segoe UI Emoji", sans-serif');
  text(ctx, `CÁPSULA ${String(spin.index + 1).padStart(2, '0')} / RODADA ${spin.round}`, 28, 132, 12, QUIET, MONO, 700);
  paragraph(ctx, spin.note?.title ?? 'Sem jogo escrito', 28, 175, CARD_W - 56, 33, 35, 3, INK, DISPLAY, 600);
  perforation(ctx, 265);
  if (input.sealedOf(spin)) {
    text(ctx, 'Lacrado', 28, 331, 44, INK, DISPLAY, 600);
    paragraph(ctx, 'As notas ficam guardadas até você escrever a sua resenha.', 28, 375, CARD_W - 56, 20, 27, 3, QUIET, BODY);
    ctx.restore(); return;
  }
  const metrics = albumMetrics(spin, input.sort);
  const score = spinScores(spin);
  text(ctx, metrics.hero.value, 28, 325, metrics.hero.key === 'dificuldade' ? 40 : 54, TONES[metrics.hero.tone], DISPLAY, 600, CARD_W - 56);
  text(ctx, metrics.hero.label, 28, 352, 16, QUIET, BODY);
  text(ctx, `${score.count} de ${spin.seated.length} resenharam`, 28, 379, 12, QUIET, MONO, 700);
  metrics.secondary.forEach((metric, i) => {
    const mx = 28 + (i % 2) * 218;
    const my = 416 + Math.floor(i / 2) * 44;
    text(ctx, metric.label, mx, my, 13, QUIET, BODY);
    text(ctx, metric.value, mx, my + 20, 18, INK, DISPLAY, 600, 198);
  });
  if (!metrics.secondary.length) {
    paragraph(ctx, spin.note ? 'As próximas resenhas completam esta ficha.' : 'O próximo capítulo começa com o nome de um jogo.', 28, 427, CARD_W - 56, 20, 27, 3, QUIET, BODY);
  }
  if (score.count) {
    const share = completionShare(score);
    const parts = [
      { label: 'Platinado', value: share.platinado, color: '#0b6f7d' },
      { label: 'Finalizado', value: share.finalizado, color: INK },
      { label: 'Incompleto', value: share.incompleto, color: QUIET },
    ];
    let bx = 28;
    for (const part of parts) {
      ctx.fillStyle = part.color;
      const w = (CARD_W - 56) * part.value / 100;
      ctx.fillRect(bx, 550, w, 7); bx += w;
    }
    parts.forEach((part, i) => {
      text(ctx, `${part.value}%`, 28 + i * 146, 581, 20, part.color, DISPLAY, 600);
      text(ctx, part.label, 28 + i * 146, 601, 12, QUIET, BODY);
    });
  }
  paragraph(ctx, spin.note?.description ?? '', 28, 634, CARD_W - 56, 15, 20, 2, QUIET, BODY);
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
