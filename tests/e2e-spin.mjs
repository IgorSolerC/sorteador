import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/**
 * Percorre o fluxo do giro num navegador de verdade, contra o Firestore de produção.
 * É a única prova de que a interface, a camada de dados e as rules fecham juntas — os
 * outros testes provam cada peça isolada.
 */

const groupId = process.argv[2];
const base = process.argv[3] ?? 'http://localhost:4321';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9334;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--window-size=1440,1000',
  '--user-data-dir=' + process.env['TEMP'] + '/chrome-e2e-' + Date.now(),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ' → ' + detail}`);
};

async function target() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* subindo */ }
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

const evaluate = async (expression) => {
  const { result } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  return result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: `${base}/#/g/${groupId}` });
await sleep(9000);

// --- estado inicial ---
const inicial = await evaluate(`(() => {
  const t = document.body.innerText;
  return {
    carregou: !t.includes('Abrindo a'),
    capsulas: document.querySelectorAll('.capsule').length,
    giros: Number((t.match(/GIROS\\s+(\\d+)/) || [])[1] ?? -1),
    vencedor: document.querySelector('#synced-title')?.textContent?.trim(),
    botao: document.querySelector('.primary-action')?.textContent?.trim(),
    desabilitado: document.querySelector('.primary-action')?.disabled,
    registros: document.querySelectorAll('.chart-cell').length,
  };
})()`);

check('a página carrega contra produção', inicial.carregou);
check('o globo desenha cápsulas', inicial.capsulas > 0, `${inicial.capsulas}`);
check('o registro lista os giros', inicial.registros === inicial.giros,
  `registros=${inicial.registros} giros=${inicial.giros}`);

// --- espera do servidor visível ---
const esperando = /Aguarde/.test(inicial.botao ?? '');
check('a espera entre giros aparece no botão quando vale',
  esperando ? inicial.desabilitado === true : inicial.desabilitado === false,
  `botão="${inicial.botao}" desabilitado=${inicial.desabilitado}`);

if (esperando) {
  console.log('       (aguardando a janela de 30s do servidor abrir…)');
  await sleep(32000);
}

// --- o giro ---
const antes = inicial.giros;
await evaluate(`document.querySelector('.primary-action').click(); true`);
await sleep(1500);

const durante = await evaluate(`(() => ({
  texto: document.querySelector('#synced-title')?.textContent?.trim(),
  girando: !!document.querySelector('.machine.is-spinning'),
}))()`);
check('o giro entra em animação', durante.girando, `título="${durante.texto}"`);

await sleep(9000);

const depois = await evaluate(`(() => {
  const t = document.body.innerText;
  const campo = document.querySelector('.machine-front');
  return {
    giros: Number((t.match(/GIROS\\s+(\\d+)/) || [])[1] ?? -1),
    vencedor: document.querySelector('#synced-title')?.textContent?.trim(),
    registros: document.querySelectorAll('.chart-cell').length,
    girandoAinda: !!document.querySelector('.machine.is-spinning'),
    rotacao: campo?.querySelector('.capsule-field')?.style.transform ?? '',
    botao: document.querySelector('.primary-action')?.textContent?.trim(),
    erro: document.querySelector('.synced-error')?.textContent?.trim() ?? '',
  };
})()`);

check('o giro foi gravado no servidor', depois.giros === antes + 1, `${antes} → ${depois.giros}`);
check('a animação termina', !depois.girandoAinda);
check('o registro cresceu junto', depois.registros === depois.giros,
  `registros=${depois.registros} giros=${depois.giros}`);
check('a roda parou numa posição calculada', /rotate\(/.test(depois.rotacao), depois.rotacao);
check('um vencedor é anunciado', !!depois.vencedor && depois.vencedor.length > 0, depois.vencedor);
check('nenhum erro na tela', depois.erro === '', depois.erro);
check('o botão volta a mostrar a espera', /Aguarde/.test(depois.botao ?? ''), `botão="${depois.botao}"`);

// --- segundo giro imediato tem que ser negado pelo servidor ---
await evaluate(`(() => { const b = document.querySelector('.primary-action'); b.disabled = false; b.click(); })()`);
await sleep(6000);
const negado = await evaluate(`(() => ({
  giros: Number((document.body.innerText.match(/GIROS\\s+(\\d+)/) || [])[1] ?? -1),
  erro: document.querySelector('.synced-error')?.textContent?.trim() ?? '',
}))()`);
check('o servidor nega o giro dentro da espera, mesmo forçando o botão',
  negado.giros === depois.giros, `giros=${negado.giros} erro="${negado.erro.slice(0, 60)}"`);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync('.impeccable/review/e2e-giro.png', Buffer.from(shot.data, 'base64'));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificações de ponta a ponta`);
ws.close();
chrome.kill();
process.exit(failed ? 1 : 0);
