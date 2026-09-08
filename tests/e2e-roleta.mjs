import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
    awaitPromise: true,
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
    const sombras = ['.body-plate', '.globe-well'].map(seletor => {
      const alvo = svg.querySelector(seletor), css = getComputedStyle(alvo);
      const id = css.filter.match(/#([^")]+)/)?.[1];
      const filtro = id && svg.querySelector('#' + id);
      if (!filtro) return {seletor, cabe: false};
      // A peça que carrega o atlas é um `svg` encaixado, e o que ela pinta é o seu
      // viewport — não o `getBBox()` do grupo, que devolve o atlas inteiro sem o recorte
      // e acusava uma região faltando 286 unidades no topo com a sombra já contida.
      const encaixado = alvo.tagName === 'g' ? alvo.querySelector(':scope > svg') : null;
      const caixa = encaixado
        ? { x: Number(encaixado.getAttribute('x')), y: Number(encaixado.getAttribute('y')),
            width: Number(encaixado.getAttribute('width')), height: Number(encaixado.getAttribute('height')) }
        : alvo.getBBox();
      const borda = css.stroke === 'none' ? 0 : parseFloat(css.strokeWidth) / 2;
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
    const anel = [...svg.querySelectorAll('#verniz-fora-nomes circle')].map(c => ({r: Number(c.getAttribute('r')), tinta: c.getAttribute('fill')}));
    const nome = svg.querySelector('.capsule-name');
    return {overflow: getComputedStyle(svg).overflow, anel, corpo: Number(getComputedStyle(nome).fontSize.replace('px','')), sombras};
  });
  conferir('a borda do SVG deixa a sombra terminar', pintura.overflow === 'visible', pintura);
  for (const sombra of pintura.sombras) conferir('a região do filtro contém a sombra inteira de ' + sombra.seletor, sombra.cabe, sombra);
  // A faixa preservada é a que fica entre o furo preto de dentro e o de fora da máscara.
  const dentro = pintura.anel.find(c => c.tinta === 'black' && c.r < 128)?.r ?? 0;
  const fora = pintura.anel.filter(c => c.tinta === 'black').map(c => c.r).sort((a,b) => b-a)[0] ?? 0;
  const meio = pintura.corpo / 2;
  conferir('a máscara do verniz devolve a faixa dos nomes intacta', dentro <= 140 - meio && fora >= 140 + meio,
    {dentro, fora, corpo: pintura.corpo});

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

  const luzDaManivela = await avaliar(() => {
    const svg = document.querySelector('.machine-front');
    const braco = svg.querySelector('.crank-arm');
    const luz = svg.querySelector('.luz-manivela');
    const sombra = svg.querySelector('#sombra-braco feDropShadow');
    if (!luz || !sombra) return { vetores: [], desfoque: 0 };
    const anterior = braco.style.transform;
    const vetores = [0,90,180,270].map(graus => {
      braco.style.transform = `rotate(${graus}deg)`;
      const matriz = svg.getCTM().inverse().multiply(luz.getCTM());
      const dx = Number(sombra.getAttribute('dx')), dy = Number(sombra.getAttribute('dy'));
      return { x: matriz.a * dx + matriz.c * dy, y: matriz.b * dx + matriz.d * dy };
    });
    braco.style.transform = anterior;
    return { vetores, desfoque: Number(sombra.getAttribute('stdDeviation')) };
  });
  conferir('a luz não gira com o braço: sombra suave cai para baixo em quatro ângulos',
    luzDaManivela.desfoque >= 2 && luzDaManivela.vetores.length === 4 && luzDaManivela.vetores.every(v =>
      v.y > 0 && Math.abs(v.x - luzDaManivela.vetores[0].x) < .01 && Math.abs(v.y - luzDaManivela.vetores[0].y) < .01), luzDaManivela);

  // A espessura e os discos agora pertencem ao render. As dimensões do atlas precisam
  // coincidir com seus recortes; uma troca de imagem não pode deslocar as peças.
  const materiais = await avaliar(async () => {
    return Promise.all(['material-maquina', 'material-capsula'].map(async id => {
      const elemento = document.getElementById(id);
      const imagem = new Image();
      imagem.src = elemento.getAttribute('href');
      await imagem.decode();
      return { id, registrado: imagem.naturalWidth === Number(elemento.getAttribute('width'))
        && imagem.naturalHeight === Number(elemento.getAttribute('height')) };
    }));
  });
  conferir('os dois materiais carregam nas dimensões dos recortes', materiais.length === 2 && materiais.every(m => m.registrado), materiais);

  const tintas = await avaliar(paleta => {
    const palco = document.querySelector('.draw-stage'), domo = document.querySelector('.capsule.is-chosen .capsule-dome');
    const nome = domo.parentElement.querySelector('.capsule-name');
    const anteriores = [palco.getAttribute('style'),domo.getAttribute('fill'),nome.getAttribute('style')];
    // Mede a tinta assentada, sem colher o primeiro quadro de uma transição.
    const lum = cor => {
      const rgb = cor.match(/[\d.]+/g).slice(0,3).map(Number).map(v => (v/=255) <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
      return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    };
    const contraste = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const resultados = paleta.map(({cor,tinta}) => {
      palco.style.setProperty('--live',cor); palco.style.setProperty('--live-ink',tinta);
      domo.setAttribute('fill',cor); nome.style.fill = tinta;
      return {cor, filtro:getComputedStyle(domo).filter, contraste:contraste(getComputedStyle(domo).fill,getComputedStyle(nome).fill)};
    });
    palco.setAttribute('style',anteriores[0] ?? ''); domo.setAttribute('fill',anteriores[1]); nome.setAttribute('style',anteriores[2] ?? '');
    return resultados;
  }, CAPSULE_COLORS.map((cor,i) => ({cor,tinta:capsuleInk(i)})));
  conferir('a seleção preserva a tinta nas 24 cores', tintas.every(t => t.filtro === 'none'), tintas);
  conferir('os nomes preservam 4,5:1 nas 24 cores', tintas.every(t => t.contraste >= 4.5), tintas);
  console.log('Contraste mínimo dos nomes: ' + Math.min(...tintas.map(t=>t.contraste)).toFixed(3));

  for (const largura of [320,390,900,1440]) {
    await send('Emulation.setDeviceMetricsOverride', {width:largura,height:1000,deviceScaleFactor:1,mobile:false});
    const medida = await avaliar(() => {
      const p = document.querySelector('.machine-front').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,esquerda:p.left,direita:p.right,largura:innerWidth};
    });
    conferir('a máquina cabe em ' + largura + ' px', medida.overflow <= 0 && medida.esquerda >= 0 && medida.direita <= medida.largura, medida);
    // A captura usa a mesma viewport medida: --window-size sozinho arredonda o celular para 500px.
    if (process.env['ROLETA_CAPTURAS'] && [390,1440].includes(largura)) {
      const pasta = process.env['ROLETA_CAPTURAS'];
      mkdirSync(pasta, { recursive: true });
      await sleep(1000);
      const captura = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync(`${pasta}/roleta-${largura}.png`, Buffer.from(captura.data, 'base64'));
    }
  }
  console.log('\n' + (total-falhas) + '/' + total + ' verificações da roleta');
} finally {
  ws.close(); chrome.kill();
}
process.exit(falhas ? 1 : 0);
