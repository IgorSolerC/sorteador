import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { CAPSULE_COLORS, capsuleInk } from '../tmpjs/src/app/palette.js';

/** Regressões de pintura SVG em um Chrome real. Não grava eventos. */

const url = process.argv[2] ?? 'http://localhost:4200/?emu=1#/g/demo';
const destino = new URL(url);
assert.ok(['localhost', '127.0.0.1'].includes(destino.hostname) && destino.searchParams.get('emu') === '1', 'Use somente a prévia local com emulador');
const width = 1440;
const height = 1000;

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/**
 * A porta de depuração é sorteada pelo próprio Chrome (`0`) e lida do perfil, e não fixada
 * em 9683.
 *
 * `chrome.kill()` no Windows derruba o processo pai e deixa os filhos vivos. Um Chrome de
 * uma rodada anterior continuava segurando a porta fixa, a rodada seguinte não conseguia
 * abri-la, e o `fetch` respondia com os alvos do navegador **velho** — a suíte inteira caía
 * em "A máquina precisa estar carregada" dirigindo um `about:blank` de outra execução. Uma
 * em quatro, sem nada errado no app.
 */
const perfil = process.env['TEMP'] + '/chrome-cdp-' + Date.now();
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--window-size=${width},${height}`,
  '--user-data-dir=' + perfil,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  let port = 0;
  for (let i = 0; i < 60; i += 1) {
    try {
      if (!port) port = Number(readFileSync(perfil + '/DevToolsActivePort', 'utf8').trim().split(/\s+/)[0]);
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome ainda subindo.
    }
    await sleep(400);
  }
  throw new Error('Chrome não abriu a porta de depuração');
}

const ws = new WebSocket(await target());
await new Promise((resolve) => (ws.onopen = resolve));

let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });


const avaliar = async (fn, dados) => {
  const resposta = await send('Runtime.evaluate', {
    expression: '(' + fn.toString() + ')(' + JSON.stringify(dados ?? null) + ')',
    returnByValue: true,
  });
  if (resposta.exceptionDetails) throw new Error(resposta.exceptionDetails.text);
  return resposta.result.value;
};
let total = 0, falhas = 0;
function conferir(nome, ok, detalhe) {
  total++;
  if (!ok) falhas++;
  console.log((ok ? 'ok   ' : 'FAIL ') + nome + (ok ? '' : ' — ' + JSON.stringify(detalhe)));
}
try {
  await send('Page.enable');
  await send('Page.navigate', {url: destino.origin + '/?emu=1'});
  await sleep(1200);
  await avaliar(() => localStorage.setItem('mesa-do-mes:autor:v1', 'Visitante'));
  await send('Page.navigate', {url});
  await send('Page.reload', {});
  await sleep(10000);
  assert.ok(await avaliar(() => !!document.querySelector('.machine-front')), 'A máquina precisa estar carregada');

  const pintura = await avaliar(() => {
    const svg = document.querySelector('.machine-front');
    const sombras = ['.body-plate', '.globe-well', '.crank-plate'].map(seletor => {
      const alvo = svg.querySelector(seletor), css = getComputedStyle(alvo);
      const id = css.filter.match(/#([^")]+)/)?.[1];
      const filtro = id && svg.querySelector('#' + id);
      if (!filtro) return {seletor, cabe: false};
      const caixa = alvo.getBBox(), borda = css.stroke === 'none' ? 0 : parseFloat(css.strokeWidth) / 2;
      let x = caixa.x - borda, y = caixa.y - borda, direita = caixa.x + caixa.width + borda, baixo = caixa.y + caixa.height + borda;
      for (const sombra of filtro.querySelectorAll('feDropShadow')) {
        const dx = Number(sombra.getAttribute('dx')), dy = Number(sombra.getAttribute('dy'));
        const margem = 3 * Number(sombra.getAttribute('stdDeviation'));
        const anterior = {x,y,direita,baixo};
        x = Math.min(x, anterior.x + dx - margem); y = Math.min(y, anterior.y + dy - margem);
        direita = Math.max(direita, anterior.direita + dx + margem); baixo = Math.max(baixo, anterior.baixo + dy + margem);
      }
      const fx = Number(filtro.getAttribute('x')), fy = Number(filtro.getAttribute('y'));
      return {seletor, cabe: filtro.getAttribute('filterUnits') === 'userSpaceOnUse' && x >= fx && y >= fy && direita <= fx + Number(filtro.getAttribute('width')) && baixo <= fy + Number(filtro.getAttribute('height'))};
    });
    return {overflow: getComputedStyle(svg).overflow, vidro: Number(svg.querySelector('.globe-glass').getAttribute('r')), sombras};
  });
  conferir('a borda do SVG deixa a sombra terminar', pintura.overflow === 'visible', pintura);
  for (const sombra of pintura.sombras) conferir('a região do filtro contém a sombra inteira de ' + sombra.seletor, sombra.cabe, sombra);
  conferir('o vidro termina antes dos nomes e da tinta do aro', pintura.vidro >= 96 && pintura.vidro < 125, pintura.vidro);

  const movimento = await avaliar(() => {
    const svg = document.querySelector('.machine-front'), roda = svg.querySelector('.capsule-field');
    const original = roda.style.transform;
    const centros = [0,90,180,270].map(graus => {
      roda.style.transform = 'rotate(' + graus + 'deg)';
      const p = new DOMPoint(200,200).matrixTransform(svg.getCTM().inverse().multiply(roda.getCTM()));
      return {graus, x:p.x, y:p.y};
    });
    roda.style.transform = original;
    const maquina = document.querySelector('.machine');
    maquina.classList.add('is-spinning');
    const monte = svg.querySelector('.loose'), recorte = monte.closest('[clip-path]');
    const animacao = monte.getAnimations()[0];
    const pontos = [];
    if (animacao && recorte) {
      animacao.pause();
      for (const fase of [0,.22,.58,1]) {
        animacao.currentTime = Number(animacao.effect.getTiming().duration) * fase;
        const p = new DOMPoint(200,200).matrixTransform(svg.getCTM().inverse().multiply(recorte.getCTM()));
        pontos.push({fase,x:p.x,y:p.y});
      }
    }
    maquina.classList.remove('is-spinning');
    return {centros,pontos};
  });
  const centralizado = p => Math.abs(p.x - 200) < .01 && Math.abs(p.y - 200) < .01;
  conferir('o eixo do aro não oscila em quatro ângulos', movimento.centros.every(centralizado), movimento.centros);
  conferir('o recorte fica parado nas quatro fases do balanço', movimento.pontos.length === 4 && movimento.pontos.every(centralizado), movimento.pontos);

  const tintas = await avaliar(paleta => {
    const palco = document.querySelector('.draw-stage'), domo = document.querySelector('.capsule.is-chosen .capsule-dome');
    const nome = domo.parentElement.querySelector('.capsule-name');
    const puxador = document.querySelector('.crank-knob');
    const anteriores = [palco.getAttribute('style'),domo.getAttribute('fill'),nome.getAttribute('style'),puxador.getAttribute('style')];
    // Mede a tinta assentada, sem colher o primeiro quadro de uma transição.
    puxador.style.transition = 'none';
    const lum = cor => {
      const rgb = cor.match(/[\d.]+/g).slice(0,3).map(Number).map(v => (v/=255) <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
      return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    };
    const contraste = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const resultados = paleta.map(({cor,tinta}) => {
      palco.style.setProperty('--live',cor); palco.style.setProperty('--live-ink',tinta);
      domo.setAttribute('fill',cor); nome.style.fill = tinta;
      return {cor, filtro:getComputedStyle(domo).filter, contraste:contraste(getComputedStyle(domo).fill,getComputedStyle(nome).fill),
        puxador:contraste(getComputedStyle(puxador).fill,getComputedStyle(document.querySelector('#chrome stop[offset="0.34"]')).stopColor)};
    });
    palco.setAttribute('style',anteriores[0] ?? ''); domo.setAttribute('fill',anteriores[1]); nome.setAttribute('style',anteriores[2] ?? ''); puxador.setAttribute('style',anteriores[3] ?? '');
    return resultados;
  }, CAPSULE_COLORS.map((cor,i) => ({cor,tinta:capsuleInk(i)})));
  conferir('a seleção preserva a tinta nas 24 cores', tintas.every(t => t.filtro === 'none'), tintas);
  conferir('os nomes preservam 4,5:1 nas 24 cores', tintas.every(t => t.contraste >= 4.5), tintas);
  conferir('o puxador continua definido sobre o cromo nas 24 cores', tintas.every(t => t.puxador >= 4.5), tintas);
  console.log('Contraste mínimo dos nomes: ' + Math.min(...tintas.map(t=>t.contraste)).toFixed(3));
  console.log('Contraste mínimo do puxador: ' + Math.min(...tintas.map(t=>t.puxador)).toFixed(3));

  for (const largura of [320,390,900,1440]) {
    await send('Emulation.setDeviceMetricsOverride', {width:largura,height:1000,deviceScaleFactor:1,mobile:false});
    const medida = await avaliar(() => {
      const p = document.querySelector('.machine-front').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,esquerda:p.left,direita:p.right,largura:innerWidth};
    });
    conferir('a máquina cabe em ' + largura + ' px', medida.overflow <= 0 && medida.esquerda >= 0 && medida.direita <= medida.largura, medida);
  }
  console.log('\n' + (total-falhas) + '/' + total + ' verificações da roleta');
} finally {
  ws.close(); chrome.kill();
}
process.exit(falhas ? 1 : 0);
