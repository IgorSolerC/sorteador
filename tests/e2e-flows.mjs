import { spawn } from 'node:child_process';

/**
 * Fluxos que os testes de componente não alcançam porque dependem de navegação real:
 * criar um grupo do zero, cair num grupo que não existe, e o link interno que já derrubou
 * a rota uma vez.
 */

const base = process.argv[2] ?? 'http://localhost:4321';
// Pela rede o chunk tardio do Firebase demora bem mais que em localhost; sem folga aqui
// o primeiro passo falha e todos os seguintes cascateiam a partir de um id inválido.
const slow = Number(process.env['E2E_SLOW'] ?? 1);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9335;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--window-size=1440,1000',
  '--user-data-dir=' + process.env['TEMP'] + '/chrome-flows-' + Date.now(),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
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
const go = async (path, wait = 8000) => {
  wait = Math.round(wait * slow);
  await send('Page.navigate', { url: base + path });
  await sleep(wait);
};

await send('Page.enable');
await send('Runtime.enable');

// --- 1. criar um grupo do zero, clicando ---
await go('/#/novo', 5000);
const telaCriar = await evaluate(`(() => ({
  titulo: document.querySelector('#create-title')?.textContent?.replace(/\\s+/g,' ').trim(),
  temImportar: !!document.querySelector('.create-check'),
  botao: document.querySelector('.create-form .primary-action')?.textContent?.trim(),
}))()`);
check('a tela de criação abre', /máquina/i.test(telaCriar.titulo ?? ''), telaCriar.titulo);
check('oferece importar a lista atual', telaCriar.temImportar);

await evaluate(`(() => {
  const campo = document.querySelector('.create-field input');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(campo, 'Grupo E2E');
  campo.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await sleep(500);
await evaluate(`document.querySelector('.create-form .primary-action').click(); true`);
await sleep(Math.round(14000 * slow));

const depoisCriar = await evaluate(`(() => ({
  hash: location.hash,
  texto: document.body.innerText.slice(0, 200),
  capsulas: document.querySelectorAll('.capsule').length,
  nome: [...document.querySelectorAll('.serial-grid dd')].pop()?.textContent?.trim(),
}))()`);
check('criar leva para o grupo novo', /^#\/g\/[A-Za-z0-9_-]+$/.test(depoisCriar.hash), depoisCriar.hash);
check('o grupo novo já vem com as cápsulas importadas', depoisCriar.capsulas > 0, `${depoisCriar.capsulas}`);
check('o nome do grupo é o que foi digitado', depoisCriar.nome === 'Grupo E2E', depoisCriar.nome);

const criado = depoisCriar.hash.replace('#/g/', '');

// --- 2. o link interno não derruba a rota ---
await evaluate(`document.querySelector('.text-link').click(); true`);
await sleep(1500);
const depoisLink = await evaluate(`location.hash`);
check('clicar em "Ver a coleção" mantém a pessoa no grupo', depoisLink === `#/g/${criado}`, depoisLink);

// --- 3. grupo inexistente ---
await go('/#/g/naoexisteesse123', 8000);
const inexistente = await evaluate(`(() => ({
  texto: document.body.innerText.slice(0, 160),
  travado: document.body.innerText.includes('Abrindo a'),
}))()`);
check('grupo inexistente mostra recado, não trava',
  !inexistente.travado && /não|encontrado/i.test(inexistente.texto), inexistente.texto.slice(0, 70));

// --- 4. movimento reduzido ---
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await go(`/#/g/${criado}`, 8000);
const antesGiro = await evaluate(`Number((document.body.innerText.match(/GIROS\\s+(\\d+)/)||[])[1] ?? -1)`);
await evaluate(`(() => { const b = document.querySelector('.primary-action'); if (!b.disabled) b.click(); })()`);
await sleep(4000);
const reduzido = await evaluate(`(() => ({
  giros: Number((document.body.innerText.match(/GIROS\\s+(\\d+)/)||[])[1] ?? -1),
  girandoAinda: !!document.querySelector('.machine.is-spinning'),
}))()`);
check('com movimento reduzido o giro resolve rápido e não fica preso',
  !reduzido.girandoAinda, `giros ${antesGiro} → ${reduzido.giros}`);

// --- 5. o modo por link continua intacto ---
await send('Emulation.setEmulatedMedia', { features: [] });
await go('/#grupo=WyJaaWxkYSIsIll1cmkiLCJYYXZpZXIiLCJXYW5kYSJd&inicio=2026-05', 6000);
const legado = await evaluate(`(() => ({
  vencedor: document.querySelector('#result-title')?.textContent?.trim(),
  edicao: [...document.querySelectorAll('.serial-grid dd')].map(d => d.textContent.trim()).join('|'),
}))()`);
check('o modo por link segue com o resultado congelado',
  legado.vencedor === 'Zilda' && legado.edicao.includes('1B454935'), `${legado.vencedor} | ${legado.edicao}`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} fluxos verificados`);
console.log(`grupo criado no teste: ${criado}`);
ws.close();
chrome.kill();
process.exit(failed ? 1 : 0);
