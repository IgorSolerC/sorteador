import { spawn } from 'node:child_process';

/**
 * Fumaça no site publicado, não no build local: confere que o GitHub Pages está servindo
 * a versão com etiqueta e álbum, e que as duas páginas abrem contra o Firestore de
 * produção. Só lê — nenhuma escrita no grupo de ninguém.
 *
 *   npm run smoke:site -- <grupoId>
 */
import { writeFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9381;
const BASE = 'https://igorsolerc.github.io/sorteador/';
const GRUPO = process.argv[2] ?? 'zDsap8v8oGdr1oZQhR9q';

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--window-size=1440,1600',
  '--user-data-dir=' + process.env['TEMP'] + '/chrome-prd-' + Date.now(), 'about:blank'], { stdio: 'ignore' });

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
const results = [];
const check = (n, ok, d = '') => { results.push(ok); console.log(`${ok ? '  ok  ' : ' FAIL '} ${n}${ok || !d ? '' : ' -> ' + d}`); };

await send('Page.enable'); await send('Runtime.enable');

// A porta pergunta quem é a pessoa antes de qualquer rota, e um perfil de navegador novo
// nunca tem crachá. Sem isto a fumaça veria a porta e reportaria a máquina como quebrada.
await send('Page.navigate', { url: BASE });
await sleep(6000);
check('a porta aparece para quem chega sem crachá', await ev(`!!document.querySelector('.gate')`));
await ev(`localStorage.setItem('mesa-do-mes:autor:v1', 'Fumaça')`);

await send('Page.navigate', { url: `${BASE}#/g/${GRUPO}` });
// Ir de /base/ para /base/#rota é só troca de hash: o navegador não recarrega, e o app
// segue de pé com o crachá que ele leu antes de existir. Um reload resolve.
await sleep(600);
await send('Page.reload', { ignoreCache: false });
// A máquina abre encenando a entrega: 4,3s de cena antes de o nome aparecer.
await sleep(18000);
const vencedor = await ev(`document.querySelector('#synced-title')?.textContent?.trim() ?? ''`);
check('a máquina abre em produção', !!vencedor && vencedor !== 'Entregando', vencedor);
check('os integrantes são uma gaveta no cabeçalho', await ev(`!!document.querySelector('#roster-button')`));
check('a etiqueta do palco existe no build publicado',
  (await ev(`!!document.querySelector('.note-sticker')`)) === true);
check('as células do registro abrem a etiqueta',
  (await ev(`document.querySelectorAll('.cell-open').length`)) > 0);
check('o link do álbum está na máquina',
  (await ev(`!!document.querySelector('a[href$="/album"]')`)) === true);
check('nenhum erro na tela', (await ev(`document.querySelector('.synced-error')?.textContent ?? ''`)) === '');
const shot1 = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync('.impeccable/review/prod-maquina.png', Buffer.from(shot1.data, 'base64'));

await send('Page.navigate', { url: `${BASE}#/g/${GRUPO}/album` });
await sleep(14000);
check('o álbum abre em produção',
  (await ev(`document.querySelector('#album-title')?.textContent?.trim()`)) === 'O álbum');
const cartoes = await ev(`document.querySelectorAll('.album-card').length`);
check('o álbum mostra as cápsulas do grupo real', cartoes > 0, `${cartoes} cartões`);
check('os chips de pessoa aparecem', (await ev(`document.querySelectorAll('.people-chip').length`)) > 1);
check('sem overflow horizontal', (await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)) === 0);
check('o título da aba nomeia o grupo', (await ev(`document.title`)).startsWith('O álbum ·'), await ev(`document.title`));
const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync('.impeccable/review/prod-album.png', Buffer.from(shot2.data, 'base64'));

await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(1500);
check('sem overflow no celular', (await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`)) === 0);
const shot3 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
writeFileSync('.impeccable/review/prod-album-mobile.png', Buffer.from(shot3.data, 'base64'));

const falhas = results.filter((r) => !r).length;
console.log(`\n${results.length - falhas}/${results.length} verificações no site publicado`);
ws.close(); chrome.kill(); process.exit(falhas ? 1 : 0);
