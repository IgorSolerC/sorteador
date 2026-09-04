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
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.value;

await send('Page.enable'); await send('Runtime.enable');

const SONDA = `(() => {
  const lum = (c) => {
    const m = c.match(/[\\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bgOf = (el) => {
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg.match(/[\\d.]+/g);
      if (m && (m.length < 4 || Number(m[3]) > 0.9)) return bg;
      node = node.parentElement;
    }
    return 'rgb(16, 35, 63)';
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
    const razao = ratio(cs.color, bgOf(el));
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
  ['prateleira', 'http://localhost:4200/?emu=1'],
  ['máquina', 'http://localhost:4200/?emu=1#/g/demo'],
  ['gaveta', 'http://localhost:4200/?emu=1#/g/demo', { clique: '#roster-button' }],
  ['bancada da cápsula', 'http://localhost:4200/?emu=1#/g/demo', { clique: '#roster-button|.capsule-row' }],
  ['ficha do jogo', 'http://localhost:4200/?emu=1#/g/demo', { clique: '.cell-open' }],
  ['ficha: minha resenha', 'http://localhost:4200/?emu=1#/g/demo',
    { clique: '.cell-open|.sheet-actions .secondary-action' }],
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
  for (const [w, h] of larguras) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
    // A porta é a única tela que se quer ver sem crachá; todas as outras vivem atrás dela.
    await send('Page.navigate', { url: new URL(url).origin });
    await sleep(1200);
    await ev(opcoes.anonimo
      ? `localStorage.removeItem('mesa-do-mes:autor:v1')`
      : `localStorage.setItem('mesa-do-mes:autor:v1', 'Igor Soler')`);
    await send('Page.navigate', { url });
    await sleep(url.includes('/g/') ? 11000 : 5000);
    for (const seletor of (opcoes.clique ?? '').split('|').filter(Boolean)) {
      await ev(`(document.querySelector(${JSON.stringify(seletor)}) ?? {}).click?.()`);
      await sleep(900);
    }
    const bruto = await ev(SONDA);
    const r = JSON.parse(bruto);
    const falhas = r.overflow > 0 || r.alvosPequenos.length || r.contrasteBaixo.length ||
      r.saltosDeTitulo.length || r.controlesSemNome || r.imagensSemAlt || r.svgSemRotulo || r.h1 !== 1;
    if (falhas) problemas += 1;
    console.log(`\n== ${nome} @ ${w}px ==`);
    console.log('  overflow horizontal:', r.overflow);
    console.log('  h1 na página:', r.h1, '| saltos de título:', r.saltosDeTitulo.join(', ') || 'nenhum');
    console.log('  controles sem nome:', r.controlesSemNome, '| img sem alt:', r.imagensSemAlt, '| svg sem rótulo:', r.svgSemRotulo);
    console.log('  alvos abaixo de 44px:', r.alvosPequenos.length ? JSON.stringify(r.alvosPequenos) : 'nenhum');
    console.log('  contraste abaixo do mínimo:', r.contrasteBaixo.length ? JSON.stringify(r.contrasteBaixo) : 'nenhum');
  }
}

console.log(`\n${problemas} combinação(ões) de página/largura com achados.`);
ws.close(); chrome.kill(); process.exit(0);
