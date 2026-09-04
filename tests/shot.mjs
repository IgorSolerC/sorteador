import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

/**
 * Captura esperando tempo REAL, em vez de `--virtual-time-budget`.
 * O tempo virtual adianta o relógio e atropela I/O de rede de longa duração, como os
 * streams do Firestore — o que faz uma página perfeitamente boa parecer travada.
 */

const url = process.argv[2];
const out = process.argv[3] ?? 'shot.png';
const waitMs = Number(process.argv[4] ?? 8000);
const width = Number(process.argv[5] ?? 1440);
const height = Number(process.argv[6] ?? 1000);

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--window-size=${width},${height}`,
  '--user-data-dir=' + process.env['TEMP'] + '/chrome-cdp-' + Date.now(),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 60; i += 1) {
    try {
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

const logs = [];
await send('Runtime.enable');
await send('Log.enable');
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Log.entryAdded') logs.push(`[${msg.params.entry.level}] ${msg.params.entry.text}`);
  if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push(`[console] ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
});

await send('Page.enable');

/**
 * A porta pergunta quem é a pessoa antes de qualquer coisa, então uma captura da máquina
 * precisa chegar já identificada. Carrega a origem, escreve o crachá, e só então navega.
 */
if (process.env['SHOT_AUTOR']) {
  const origem = new URL(url);
  await send('Page.navigate', { url: origem.origin + origem.pathname });
  await sleep(1200);
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('mesa-do-mes:autor:v1', ${JSON.stringify(process.env['SHOT_AUTOR'])})`,
  });
}

await send('Page.navigate', { url });
await sleep(waitMs);

// Uma tela que só existe depois de um clique — a gaveta, a bancada — precisa do clique.
for (const seletor of (process.env['SHOT_CLICK'] ?? '').split('|').filter(Boolean)) {
  const { result: clique } = await send('Runtime.evaluate', {
    expression: `(() => { const alvo = document.querySelector(${JSON.stringify(seletor)}); if (!alvo) return 'não achei ' + ${JSON.stringify(seletor)}; alvo.click(); return 'cliquei em ' + ${JSON.stringify(seletor)}; })()`,
    returnByValue: true,
  });
  console.log('---', clique.value);
  await sleep(900);
}

const { result } = await send('Runtime.evaluate', {
  expression: 'document.body.innerText.slice(0, 400)',
  returnByValue: true,
});
console.log('--- texto na tela ---');
console.log(result.value);
if (logs.length) {
  console.log('--- console ---');
  for (const line of logs.slice(0, 20)) console.log(line);
}

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log('--- capturado em', out);

ws.close();
chrome.kill();
process.exit(0);
