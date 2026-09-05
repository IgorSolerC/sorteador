import { RoundSection } from './group-history';
import { ScoreTone, SpinRecord } from './group-log';

/**
 * O álbum como imagem: a parede desenhada num canvas, para sair do produto e ir parar no
 * grupo do clube.
 *
 * Ela é **desenhada**, e não fotografada. Uma captura do DOM precisaria de biblioteca, e o
 * resultado seria uma foto de uma página — com barra de rolagem, corte no lugar errado e a
 * densidade de uma tela. Aqui o pôster é um objeto próprio, com a mesma paleta e as mesmas
 * fontes, montado na medida de uma imagem.
 *
 * **O link do grupo nunca entra.** O link é a credencial: quem o tem, escreve. Uma imagem
 * que o clube manda no grupo é pública para sempre, e um QR ou uma URL impressa nela seria
 * entregar a máquina a quem passasse os olhos.
 */

const LARGURA_CARTAO = 460;
const ALTURA_CARTAO = 210;
const ESPACO = 26;
const MARGEM = 64;

/** As mesmas tintas do produto. Um pôster com outra paleta seria de outro produto. */
const CORES = {
  esmalte: '#10233f',
  esmalteFundo: '#0a1830',
  papel: '#faf6ec',
  papelQuieto: '#f0e9d9',
  tinta: '#16233a',
  tintaCalma: '#5b6779',
  ceu: '#bccde6',
  cromo: '#e3eaf2',
  cromoCalmo: '#93a6be',
  branco: '#ffffff',
  notaAlta: '#0b6f7d',
  notaBaixa: '#a8481a',
  notaPessima: '#ae1f16',
} as const;

const TINTA_DA_NOTA: Readonly<Record<ScoreTone, string>> = {
  high: CORES.notaAlta,
  mid: CORES.tinta,
  low: CORES.notaBaixa,
  worst: CORES.notaPessima,
};

export interface AlbumPosterInput {
  readonly groupName: string;
  /** As faixas como estão na tela: o filtro de pessoa e a ordem escolhida valem aqui. */
  readonly sections: readonly RoundSection[];
  readonly stats: { readonly score: string; readonly platinado: number; readonly jogos: number; readonly resenhas: number };
  readonly rounds: number;
  readonly colorOf: (spin: SpinRecord) => string;
  readonly inkOf: (spin: SpinRecord) => string;
  readonly emojiOf: (spin: SpinRecord) => string;
  readonly averageOf: (spin: SpinRecord) => string;
  readonly toneOf: (spin: SpinRecord) => ScoreTone;
}

export async function renderAlbumPoster(input: AlbumPosterInput): Promise<Blob> {
  // Sem esperar as fontes, o primeiro pôster de uma visita sai em Times New Roman: o
  // canvas não espera o `@font-face` como o texto da página espera.
  await document.fonts?.ready;

  const cartoes = input.sections.flatMap((section) => section.spins);
  const colunas = colunasPara(cartoes.length);
  const linhas = Math.max(Math.ceil(cartoes.length / colunas), 1);

  const largura = MARGEM * 2 + colunas * LARGURA_CARTAO + (colunas - 1) * ESPACO;
  const alturaCabecalho = 300;
  const alturaRodape = 96;
  const altura = alturaCabecalho + linhas * ALTURA_CARTAO + (linhas - 1) * ESPACO + alturaRodape;

  // Dois pixels por ponto: a imagem é lida em celular, onde uma tela de 1x fica borrada.
  const escala = 2;
  const canvas = document.createElement('canvas');
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não desenha em canvas.');
  ctx.scale(escala, escala);

  fundo(ctx, largura, altura);
  cabecalho(ctx, input, largura);

  cartoes.forEach((spin, i) => {
    const x = MARGEM + (i % colunas) * (LARGURA_CARTAO + ESPACO);
    const y = alturaCabecalho + Math.floor(i / colunas) * (ALTURA_CARTAO + ESPACO);
    cartao(ctx, input, spin, x, y);
  });

  rodape(ctx, largura, altura, cartoes.length);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('O canvas não virou imagem.'))),
      'image/png',
    );
  });
}

/**
 * Quantas colunas. Um álbum de oito anos em três colunas viraria uma tira de 20.000px de
 * altura, que nenhum aplicativo de mensagem abre — e o Chrome nem desenha. As faixas
 * crescem com a parede para o pôster continuar tendo proporção de pôster.
 */
function colunasPara(total: number): number {
  if (total <= 4) return Math.max(total, 1);
  if (total <= 12) return 3;
  if (total <= 40) return 4;
  if (total <= 90) return 6;
  return 8;
}

function fundo(ctx: CanvasRenderingContext2D, largura: number, altura: number): void {
  const brilho = ctx.createRadialGradient(largura * 0.3, 0, 40, largura * 0.3, 0, altura);
  brilho.addColorStop(0, CORES.esmalte);
  brilho.addColorStop(1, CORES.esmalteFundo);
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, largura, altura);
}

function cabecalho(ctx: CanvasRenderingContext2D, input: AlbumPosterInput, largura: number): void {
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = CORES.cromoCalmo;
  ctx.font = '700 15px "Martian Mono", ui-monospace, monospace';
  ctx.fillText('MESA DO MÊS · O ÁLBUM', MARGEM, 84);

  ctx.fillStyle = CORES.branco;
  ctx.font = '600 76px Fredoka, "Trebuchet MS", sans-serif';
  ctx.fillText(corta(ctx, input.groupName, largura - MARGEM * 2), MARGEM, 164);

  const conta: readonly [string, string][] = [
    ['NOTA DO CLUBE', input.stats.score],
    ['PLATINADO', `${input.stats.platinado}%`],
    ['JOGOS COM NOTA', String(input.stats.jogos)],
    ['RESENHAS', String(input.stats.resenhas)],
    ['RODADAS', String(input.rounds)],
  ];

  let x = MARGEM;
  for (const [rotulo, valor] of conta) {
    ctx.fillStyle = CORES.cromoCalmo;
    ctx.font = '700 13px "Martian Mono", ui-monospace, monospace';
    ctx.fillText(rotulo, x, 214);
    ctx.fillStyle = CORES.branco;
    ctx.font = '600 30px Fredoka, "Trebuchet MS", sans-serif';
    ctx.fillText(valor, x, 248);
    x += Math.max(ctx.measureText(rotulo).width, 150) + 44;
  }
}

function cartao(
  ctx: CanvasRenderingContext2D,
  input: AlbumPosterInput,
  spin: SpinRecord,
  x: number,
  y: number,
): void {
  const branco = !spin.note;

  ctx.save();
  ctx.shadowColor = 'rgba(4, 10, 22, .45)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = branco ? CORES.papelQuieto : CORES.papel;
  caixa(ctx, x, y, LARGURA_CARTAO, ALTURA_CARTAO, 12);
  ctx.fill();
  ctx.restore();

  // A cápsula da pessoa, achatada como a do registro: cúpula por cima, casca por baixo.
  const capX = x + 26;
  const capY = y + 26;
  ctx.fillStyle = input.colorOf(spin);
  caixa(ctx, capX, capY, 46, 34, 17, 17, 6, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(233, 242, 252, .5)';
  caixa(ctx, capX, capY + 20, 46, 14, 0, 0, 6, 6);
  ctx.fill();

  const emoji = input.emojiOf(spin);
  if (emoji) {
    ctx.font = '18px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, capX + 23, capY + 20);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = CORES.tintaCalma;
  ctx.font = '700 12px "Martian Mono", ui-monospace, monospace';
  ctx.fillText(`CÁPSULA ${spin.index + 1} · ${data(spin.at)}`, capX + 62, capY + 14);

  ctx.fillStyle = CORES.tinta;
  ctx.font = '600 22px Fredoka, "Trebuchet MS", sans-serif';
  ctx.fillText(corta(ctx, spin.winnerName, LARGURA_CARTAO - 130), capX + 62, capY + 38);

  // O picote do bloquinho, a mesma marca de impressor do cartão na tela.
  ctx.fillStyle = 'rgba(22, 35, 58, .34)';
  for (let px = x + 20; px < x + LARGURA_CARTAO - 20; px += 9) {
    ctx.beginPath();
    ctx.arc(px, y + 84, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = branco ? CORES.tintaCalma : CORES.tinta;
  ctx.font = branco
    ? '700 13px "Martian Mono", ui-monospace, monospace'
    : '600 26px Fredoka, "Trebuchet MS", sans-serif';
  ctx.fillText(
    branco ? 'SEM JOGO ESCRITO' : corta(ctx, spin.note!.title, LARGURA_CARTAO - 150),
    x + 26,
    y + 124,
  );

  const nota = input.averageOf(spin);
  if (nota) {
    ctx.textAlign = 'right';
    ctx.fillStyle = TINTA_DA_NOTA[input.toneOf(spin)];
    ctx.font = '600 46px Fredoka, "Trebuchet MS", sans-serif';
    ctx.fillText(nota, x + LARGURA_CARTAO - 26, y + 130);
    ctx.textAlign = 'left';
  }

  if (spin.note) {
    ctx.fillStyle = CORES.tintaCalma;
    ctx.font = '700 12px "Martian Mono", ui-monospace, monospace';
    const linha = spin.reviews.length
      ? `${spin.reviews.length} DE ${spin.seated.length} RESENHARAM`
      : 'AINDA SEM RESENHA';
    ctx.fillText(linha, x + 26, y + 156);

    if (spin.note.description) {
      ctx.fillStyle = CORES.tintaCalma;
      ctx.font = '400 14px "Atkinson Hyperlegible", sans-serif';
      ctx.fillText(corta(ctx, spin.note.description, LARGURA_CARTAO - 52), x + 26, y + 182);
    }
  }
}

function rodape(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  total: number,
): void {
  ctx.fillStyle = CORES.ceu;
  ctx.font = '700 13px "Martian Mono", ui-monospace, monospace';
  ctx.fillText(
    `${total} ${total === 1 ? 'CÁPSULA' : 'CÁPSULAS'} · ${data(Date.now())}`,
    MARGEM,
    altura - 46,
  );

  ctx.fillStyle = CORES.cromoCalmo;
  ctx.font = '400 14px "Atkinson Hyperlegible", sans-serif';
  ctx.textAlign = 'right';
  // Sem link, e é de propósito: quem tem o link do grupo escreve nele.
  ctx.fillText('A nota do clube é recontada das resenhas, nunca gravada.', largura - MARGEM, altura - 46);
  ctx.textAlign = 'left';
}

/** Um retângulo de cantos arredondados, com raio por canto quando os quatro diferem. */
function caixa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr = tl,
  br = tl,
  bl = tl,
): void {
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/** Corta com reticências na medida real do texto, e não num número de caracteres. */
function corta(ctx: CanvasRenderingContext2D, texto: string, largura: number): string {
  if (ctx.measureText(texto).width <= largura) return texto;
  let curto = texto;
  while (curto.length > 1 && ctx.measureText(`${curto}…`).width > largura) {
    curto = curto.slice(0, -1);
  }
  return `${curto.trimEnd()}…`;
}

function data(ms: number): string {
  const d = new Date(ms);
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
