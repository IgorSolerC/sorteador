// Auditoria medida: alvos de toque, contraste, hierarquia de títulos e overflow.
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9361;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--window-size=1440,1200',
  '--user-data-dir=' + process.env['TEMP'] + '/chrome-aud-' + Date.now(), 'about:blank'],
  { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60; i++) {
  try {
    const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const p = l.find((t) => t.type === 'page');
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(400);
}
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (m, p = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');

const SONDA = `(async () => {
  const lum = (c) => {
    const m = c.match(/[\\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const rgb = (c) => {
    const m = (c || '').match(/[\\d.]+/g);
    if (!m) return null;
    return { r: Number(m[0]), g: Number(m[1]), b: Number(m[2]), a: m.length > 3 ? Number(m[3]) : 1 };
  };
  const sobre = (frente, fundo) => ({
    r: frente.r * frente.a + fundo.r * (1 - frente.a),
    g: frente.g * frente.a + fundo.g * (1 - frente.a),
    b: frente.b * frente.a + fundo.b * (1 - frente.a),
    a: 1,
  });
  const texto = (c) => 'rgb(' + Math.round(c.r) + ', ' + Math.round(c.g) + ', ' + Math.round(c.b) + ')';
  // O html pinta --enamel: ler o computado devolve rgb() resolvido, e um token hexadecimal
  // cru passaria pelo parser como um numero so.
  const esmalte = rgb(getComputedStyle(document.documentElement).backgroundColor) ?? { r: 16, g: 35, b: 63, a: 1 };

  // O cenario e uma imagem em ::before ATRAS do documento: ela cobre o fundo do body, e e
  // ela que aparece por baixo dos veus. Ler os pixels dela e a unica forma de saber o que
  // esta de fato sob um texto -- o caminho de estilos so diz o que estaria sem a foto.
  const cenario = await (async () => {
    const cs = getComputedStyle(document.body, '::before');
    if (cs.content === 'none' || cs.display === 'none') return { estado: 'ausente' };
    const url = (cs.backgroundImage.match(/url\\("([^"]+)"\\)/) || [])[1];
    if (!url) return { estado: 'ausente' };
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const tela = document.createElement('canvas');
      tela.width = img.naturalWidth; tela.height = img.naturalHeight;
      const ctx = tela.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, tela.width, tela.height).data;
      const banda = parseFloat(cs.height);
      const caixa = document.body.clientWidth;
      // A camada da imagem e a ultima do atalho; cover escolhe a maior escala que cobre.
      const posicao = cs.backgroundPosition.split(',').pop().trim().split(/\\s+/);
      const pctX = posicao[0].endsWith('%') ? parseFloat(posicao[0]) / 100 : 0.5;
      const escala = Math.max(caixa / tela.width, banda / tela.height);
      const offX = (caixa - tela.width * escala) * pctX;
      return { estado: 'medido', px, w: tela.width, h: tela.height, banda, escala, offX };
    } catch (erro) {
      return { estado: 'falhou', motivo: String(erro) };
    }
  })();

  // O veu de esmalte do fim da imagem (transparent 72%) so clareia o pior caso, entao
  // entra na conta; abaixo da banda o fundo volta a ser o esmalte solido do body.
  const ESMALTE_SO = [esmalte];
  let sobOCenario = 0;
  const baseSobOCenario = (doc) => {
    if (cenario.estado !== 'medido') return ESMALTE_SO;
    const y0 = Math.max(0, doc.topo), y1 = Math.min(cenario.banda, doc.base);
    if (y1 <= y0) return ESMALTE_SO;
    const passo = 3;
    let claro = null, escuro = null, claroL = -1, escuroL = 2;
    for (let y = y0; y < y1; y += passo) {
      const iy = Math.floor(y / cenario.escala);
      if (iy < 0 || iy >= cenario.h) continue;
      const t = y / cenario.banda;
      const veu = { r: esmalte.r, g: esmalte.g, b: esmalte.b, a: t <= 0.72 ? 0 : Math.min(1, (t - 0.72) / 0.28) };
      for (let x = Math.max(0, doc.esquerda); x < doc.direita; x += passo) {
        const ix = Math.floor((x - cenario.offX) / cenario.escala);
        if (ix < 0 || ix >= cenario.w) continue;
        const i = (iy * cenario.w + ix) * 4;
        const cor = sobre(veu, { r: cenario.px[i], g: cenario.px[i + 1], b: cenario.px[i + 2], a: 1 });
        const l = lum(texto(cor));
        if (l > claroL) { claroL = l; claro = cor; }
        if (l < escuroL) { escuroL = l; escuro = cor; }
      }
    }
    if (!claro) return ESMALTE_SO;
    // Texto que passa da banda continua sobre esmalte: ele entra como terceiro candidato.
    return doc.base > cenario.banda ? [claro, escuro, esmalte] : [claro, escuro];
  };

  // Devolve TODOS os fundos plausiveis sob o elemento; o contraste usa o pior deles.
  const fundosDe = (el) => {
    const camadas = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const cor = rgb(cs.backgroundColor);
      if (cor && cor.a >= 0.999) return [cor];
      if (cor && cor.a > 0) camadas.push(cor);
      if (cs.backgroundImage !== 'none') {
        // Num gradiente, a parada mais transparente e a que menos cobre: e o pior caso.
        const paradas = (cs.backgroundImage.match(/rgba?\\([^)]*\\)/g) || []).map(rgb).filter(Boolean);
        if (paradas.length) camadas.push(paradas.reduce((pior, c) => (c.a < pior.a ? c : pior)));
      }
      node = node.parentElement;
    }
    const r = el.getBoundingClientRect();
    const doc = {
      esquerda: r.left + window.scrollX, direita: r.right + window.scrollX,
      topo: r.top + window.scrollY, base: r.bottom + window.scrollY,
    };
    const bases = baseSobOCenario(doc);
    if (bases !== ESMALTE_SO) sobOCenario += 1;
    return bases.map((base) => camadas.reduceRight((fundo, camada) => sobre(camada, fundo), base));
  };
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b);
    if (la === null || lb === null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  // O alvo de toque de uma caixa de seleção é o rótulo que a envolve, e não o quadradinho:
  // quem toca em "Entrar como a primeira cápsula" marca a caixa. Medir só o INPUT acusava
  // um alvo de 20px onde a área clicável de verdade tem a linha inteira.
  const alvoReal = (el) => {
    if (el.tagName !== 'INPUT' || (el.type !== 'checkbox' && el.type !== 'radio')) return el;
    // A sonda vive dentro de um template literal, então nada de crase aninhada aqui.
    const rotulo = el.closest('label') ??
      (el.id ? document.querySelector('label[for="' + el.id + '"]') : null);
    return rotulo ?? el;
  };

  const alvos = [];
  for (const el of document.querySelectorAll('button, a[href], input, textarea, [role="button"]')) {
    const r = alvoReal(el).getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.height < 44 || r.width < 24) {
      alvos.push({ tag: el.tagName, cls: el.className.toString().slice(0, 46), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }

  const contraste = [];
  let folga = { sobra: Infinity };
  for (const el of document.querySelectorAll('p, span, strong, b, dd, dt, h1, h2, h3, li, label, button, a')) {
    if (!el.textContent || !el.textContent.trim()) continue;
    if (el.querySelector('*') && el.childElementCount > 0 && !el.matches('button, a, strong, b, span, dd, dt')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const px = parseFloat(cs.fontSize);
    const grande = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    const alvo = grande ? 3 : 4.5;
    const razoes = fundosDe(el).map((fundo) => ratio(cs.color, texto(fundo))).filter((v) => v !== null);
    const razao = razoes.length ? Math.min(...razoes) : null;
    if (razao !== null && razao - alvo < folga.sobra) {
      folga = { sobra: razao - alvo, razao: Number(razao.toFixed(2)), alvo, cls: el.className.toString().slice(0, 40) || el.tagName };
    }
    if (razao !== null && razao < alvo) {
      contraste.push({ cls: el.className.toString().slice(0, 40) || el.tagName, px: Math.round(px), razao: Number(razao.toFixed(2)), alvo });
    }
  }

  const titulos = [...document.querySelectorAll('h1, h2, h3, h4')].map((h) => Number(h.tagName[1]));
  const saltos = [];
  for (let i = 1; i < titulos.length; i++) {
    if (titulos[i] - titulos[i - 1] > 1) saltos.push(titulos[i - 1] + ' -> ' + titulos[i]);
  }

  const semNome = [...document.querySelectorAll('button, a[href]')].filter((el) => {
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim();
    return !t;
  }).length;

  return JSON.stringify({
    cenario: cenario.estado + (cenario.motivo ? ': ' + cenario.motivo : ''),
    sobOCenario,
    folga: folga.sobra === Infinity ? null : folga,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    alvosPequenos: alvos,
    contrasteBaixo: contraste,
    h1: document.querySelectorAll('h1').length,
    saltosDeTitulo: saltos,
    controlesSemNome: semNome,
    imagensSemAlt: [...document.querySelectorAll('img')].filter((i) => !i.alt).length,
    // Um aria-hidden num ancestral já esconde a subárvore inteira: exigir o atributo no
    // próprio SVG acusava decoração que a árvore de acessibilidade nunca chega a ver.
    svgSemRotulo: [...document.querySelectorAll('svg')].filter(
      (s) => !s.closest('[aria-hidden="true"]') && !s.getAttribute('aria-label') && !s.querySelector('title'),
    ).length,
  });
})()`;

const paginas = [
  ['porta', 'http://localhost:4200/?emu=1', { anonimo: true }],
  // A porta de um grupo é outra tela: ela oferece as cápsulas que já existem nele, e é
  // por elas que se entra. As duas precisam passar por contraste e alvo de toque.
  ['porta do grupo', 'http://localhost:4200/?emu=1#/g/demo', { anonimo: true }],
  // A bancada da porta é a única superfície de papel fora da máquina, e é a única tela em
  // que a peça de 340px é a prévia de uma escolha em vez de um retrato.
  ['bancada da porta', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.who-chip|.gate-paint', autor: 'Ana' }],
  ['prateleira', 'http://localhost:4200/?emu=1'],
  ['máquina', 'http://localhost:4200/?emu=1#/g/demo'],
  ['gaveta', 'http://localhost:4200/?emu=1#/g/demo', { clique: '#roster-button' }],
  ['bancada da cápsula', 'http://localhost:4200/?emu=1#/g/demo', { clique: '#roster-button|.capsule-row' }],
  ['ficha do jogo', 'http://localhost:4200/?emu=1#/g/demo', { clique: '.cell-open' }],
  ['seletor de reações', 'http://localhost:4200/?emu=1#/g/demo', { clique: '.cell-open|.reaction-trigger' }],
  ['ficha: minha resenha', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.cell-open|.sheet-actions .secondary-action' }],
  // O lacre é uma tela por si: papel silencioso, fio tracejado e duas ações. Ele não tem
  // interruptor — basta ser alguém que jogou e não resenhou, e Cecília é essa pessoa no
  // grupo semeado. A resenha com a platina marcada também é uma tela por si: ela abre duas
  // fileiras que não existem nas outras, e é o único ponto do formulário com a tinta fria.
  ['ficha lacrada', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.chart-cell:nth-child(4) .cell-open', autor: 'Cecília' }],
  ['álbum lacrado', 'http://localhost:4200/?emu=1#/g/demo/album', { autor: 'Cecília' }],
  ['ficha: a platina', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.cell-open|.sheet-actions .secondary-action|.status-choice.is-platinado' }],
  ['ficha: o jogo', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.cell-open|.sheet-actions .note-cancel' }],
  ['ficha: a mesa', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.cell-open|.sheet-actions .sheet-aside' }],
  ['álbum', 'http://localhost:4200/?emu=1#/g/demo/album'],
  ['oficina', 'http://localhost:4200/?emu=1#/novo'],
];
const larguras = [[1440, 1200], [900, 1200], [390, 844]];

let problemas = 0;
for (const [nome, url, opcoes = {}] of paginas) {
  if (process.env.A11Y_FILTER && !new RegExp(process.env.A11Y_FILTER).test(nome)) continue;
  for (const [w, h] of larguras) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
    // A porta é a única tela que se quer ver sem crachá; todas as outras vivem atrás dela.
    await send('Page.navigate', { url: new URL(url).origin });
    await sleep(1200);
    await ev(opcoes.anonimo
      ? `localStorage.removeItem('mesa-do-mes:autor:v1')`
      : `localStorage.setItem('mesa-do-mes:autor:v1', ${JSON.stringify(opcoes.autor ?? 'Igor Soler')})`);
    await send('Page.navigate', { url });
    // Espera pela PÁGINA, e não por um número de segundos. Toda tela deste produto tem um
    // h1; enquanto não há nenhum, o que está na tela não é a tela — e medir aí acusava
    // "h1 na página: 0" na máquina em 390px de vez em quando, porque a coluna do resultado
    // ainda não havia desenhado quando os 11s acabavam.
    for (let i = 0; i < 60; i += 1) {
      if (await ev(`document.querySelectorAll('h1').length >= 1`)) break;
      await sleep(500);
    }
    await sleep(url.includes('/g/') ? 2500 : 900);
    for (const seletor of (opcoes.clique ?? '').split('|').filter(Boolean)) {
      await ev(`(document.querySelector(${JSON.stringify(seletor)}) ?? {}).click?.()`);
      await sleep(900);
    }
    const bruto = await ev(SONDA);
    const r = JSON.parse(bruto);
    const falhas = r.cenario !== 'medido' ||
      r.overflow > 0 || r.alvosPequenos.length || r.contrasteBaixo.length ||
      r.saltosDeTitulo.length || r.controlesSemNome || r.imagensSemAlt || r.svgSemRotulo || r.h1 !== 1;
    if (falhas) problemas += 1;
    console.log(`\n== ${nome} @ ${w}px ==`);
    console.log('  overflow horizontal:', r.overflow);
    console.log('  h1 na página:', r.h1, '| saltos de título:', r.saltosDeTitulo.join(', ') || 'nenhum');
    console.log('  controles sem nome:', r.controlesSemNome, '| img sem alt:', r.imagensSemAlt, '| svg sem rótulo:', r.svgSemRotulo);
    console.log('  alvos abaixo de 44px:', r.alvosPequenos.length ? JSON.stringify(r.alvosPequenos) : 'nenhum');
    console.log('  cenário sob os véus:', r.cenario, '| textos medidos contra a foto:', r.sobOCenario);
    console.log('  menor folga de contraste:', r.folga ? r.folga.razao + ':1 (alvo ' + r.folga.alvo + ') em ' + r.folga.cls : 'sem texto medido');
    console.log('  contraste abaixo do mínimo:', r.contrasteBaixo.length ? JSON.stringify(r.contrasteBaixo) : 'nenhum');
  }
}

console.log(`\n${problemas} combinação(ões) de página/largura com achados.`);
ws.close(); chrome.kill(); process.exit(0);
