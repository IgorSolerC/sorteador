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

// --- 0. a porta: ninguém entra sem dizer quem é ---
await go('/', 5000);
const naPorta = await evaluate(`(() => ({
  porta: !!document.querySelector('.gate'),
  prateleira: !!document.querySelector('.home-stage'),
}))()`);
check('sem crachá, a porta é a única coisa na tela', naPorta.porta && !naPorta.prateleira,
  JSON.stringify(naPorta));

await evaluate(`(() => {
  const campo = document.querySelector('#gate-name');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(campo, 'Teste de Fluxos');
  campo.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await sleep(500);
await evaluate(`document.querySelector('.gate-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); true`);
await sleep(1500);
const depoisDaPorta = await evaluate(`(() => ({
  porta: !!document.querySelector('.gate'),
  prateleira: !!document.querySelector('.home-stage'),
  cracha: document.querySelector('.who-name')?.textContent?.trim(),
}))()`);
check('entrar na mesa abre a prateleira e põe o crachá no topo',
  !depoisDaPorta.porta && depoisDaPorta.prateleira && depoisDaPorta.cracha === 'Teste de Fluxos',
  JSON.stringify(depoisDaPorta));

// --- 1. criar um grupo do zero, clicando ---
await go('/#/novo', 5000);
const telaCriar = await evaluate(`(() => ({
  titulo: document.querySelector('#create-title')?.textContent?.replace(/\\s+/g,' ').trim(),
  temImportar: !!document.querySelector('.create-check'),
  botao: document.querySelector('.create-form .primary-action')?.textContent?.trim(),
}))()`);
check('a tela de criação abre', /máquina/i.test(telaCriar.titulo ?? ''), telaCriar.titulo);
check('oferece entrar já como a primeira cápsula', telaCriar.temImportar);

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
check('quem monta a máquina já entra como a primeira cápsula', depoisCriar.capsulas === 1,
  `${depoisCriar.capsulas}`);
check('o nome do grupo é o que foi digitado', depoisCriar.nome === 'Grupo E2E', depoisCriar.nome);

const criado = depoisCriar.hash.replace('#/g/', '');

// --- 2. a gaveta da coleção abre e fecha sem sair da rota ---
await evaluate(`document.querySelector('#roster-button').click(); true`);
await sleep(1200);
const naGaveta = await evaluate(`(() => ({
  aberta: !!document.querySelector('.roster-card'),
  linhas: document.querySelectorAll('.capsule-row').length,
  hash: location.hash,
}))()`);
check('a coleção abre numa gaveta, sem trocar de rota',
  naGaveta.aberta && naGaveta.hash === `#/g/${criado}`, JSON.stringify(naGaveta));
check('a gaveta já lista quem montou a máquina', naGaveta.linhas === 1, `${naGaveta.linhas}`);

await evaluate(`document.querySelector('.roster-close').click(); true`);
await sleep(900);
check('fechar a gaveta devolve a máquina',
  (await evaluate(`!document.querySelector('.roster-card') && location.hash`)) === `#/g/${criado}`);

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

// --- 5. um link do formato antigo não abre uma máquina de mentira ---
// O modo por link estático saiu. Um link em circulação daquele formato tem que cair na
// prateleira, que explica o que fazer, e nunca montar um grupo a partir do próprio endereço.
await send('Emulation.setEmulatedMedia', { features: [] });
await go('/#grupo=WyJaaWxkYSIsIll1cmkiLCJYYXZpZXIiLCJXYW5kYSJd&inicio=2026-05', 6000);
const legado = await evaluate(`(() => ({
  prateleira: !!document.querySelector('.home-stage'),
  capsulas: document.querySelectorAll('.capsule').length,
  temZilda: document.body.innerText.includes('Zilda'),
}))()`);
check('um link do formato antigo cai na prateleira, sem inventar um grupo',
  legado.prateleira && legado.capsulas === 0 && !legado.temZilda, JSON.stringify(legado));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} fluxos verificados`);
console.log(`grupo criado no teste: ${criado}`);
ws.close();
chrome.kill();
process.exit(failed ? 1 : 0);
