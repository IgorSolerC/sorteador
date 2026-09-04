import { spawn } from 'node:child_process';

/**
 * O ciclo da etiqueta num navegador de verdade, contra o Firestore (emulador ou produção).
 *
 * É o único lugar onde o servidor participa da conta: os testes de componente usam uma loja
 * falsa, e as rules só são exercitadas aqui de ponta a ponta — colar, reescrever, retirar,
 * e o álbum lendo o mesmo log. Os dois bugs que apareceram no desenho desta feature
 * (a medida do texto e o foco depois de salvar) só eram visíveis daqui.
 *
 * Uso: node tests/e2e-etiqueta.mjs <base> <grupoId>
 *   node tests/e2e-etiqueta.mjs "http://localhost:4200/?emu=1" demo
 */

const base = process.argv[2] ?? 'http://localhost:4200/?emu=1';
const grupo = process.argv[3] ?? 'demo';
const CHROME = process.env['CHROME'] ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = Number(process.env['CDP_PORT'] ?? 9371);
const carga = Number(process.env['E2E_WAIT'] ?? 11000);

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, '--window-size=1440,1200',
  '--user-data-dir=' + (process.env['TEMP'] ?? '/tmp') + '/chrome-etq-' + Date.now(),
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${ok || !detail ? '' : ' -> ' + detail}`);
};

let ws;
for (let i = 0; i < 60; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = list.find((t) => t.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {
    // Chrome ainda subindo.
  }
  await sleep(400);
}
if (!ws) throw new Error('Chrome não abriu a porta de depuração');
await new Promise((resolve) => (ws.onopen = resolve));

let id = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const next = ++id;
    pending.set(next, resolve);
    ws.send(JSON.stringify({ id: next, method, params }));
  });
const ev = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value;
const go = async (hash, wait = carga) => {
  await send('Page.navigate', { url: base + hash });
  await sleep(wait);
};

/** Digita como o teclado digita: o setter nativo mais um input que borbulha. */
const digitar = (elementId, texto) => ev(`(() => {
  const el = document.getElementById(${JSON.stringify(elementId)});
  if (!el) return 'sem campo';
  const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(texto)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return el.value;
})()`);

const salvar = () => ev(`document.querySelector('.note-actions button[type="submit"]').click()`);
const texto = (selector) => ev(`document.querySelector(${JSON.stringify(selector)})?.innerText ?? ''`);
const conta = (selector) => ev(`document.querySelectorAll(${JSON.stringify(selector)}).length`);

await send('Page.enable');
await send('Runtime.enable');

const marca = 'E2E ' + Date.now();

// --- a máquina ---

await go(`#/g/${grupo}`);
check('a máquina carrega o grupo', !!(await ev(`!!document.querySelector('#synced-title')`)));
const girosNoRegistro = await conta('.cell-open');
check('o registro lista os giros', girosNoRegistro > 0, `${girosNoRegistro}`);

const abriuPeloPalco = await ev(`(() => {
  const alvo = document.querySelector('.note-sticker.is-blank') || document.querySelector('.note-edit');
  if (!alvo) return 'sem etiqueta no palco';
  alvo.click();
  return 'ok';
})()`);
check('o palco abre a bancada da etiqueta', abriuPeloPalco === 'ok', String(abriuPeloPalco));
await sleep(900);
check('a bancada aparece', !!(await ev(`!!document.querySelector('[role="dialog"]')`)));
check('o foco cai no primeiro campo', (await ev(`document.activeElement?.id`)) === 'note-title');

await digitar('note-title', marca);
await digitar('note-description', 'Descrição escrita pelo teste de ponta a ponta.');
await salvar();
await sleep(3200);

check('a bancada fecha depois de gravar', !(await ev(`!!document.querySelector('[role="dialog"]')`)));
check('a etiqueta aparece no palco', (await texto('.note-sticker')).includes(marca));
check('o foco volta para um controle, não para o corpo da página',
  (await ev(`document.activeElement?.tagName`)) !== 'BODY',
  String(await ev(`document.activeElement?.className || document.activeElement?.tagName`)));
check('nenhum erro na tela', (await ev(`document.querySelector('.synced-error')?.textContent ?? ''`)) === '');

// Reescrever: o log é append-only, então a segunda etiqueta vira revisão.
await ev(`document.querySelector('.note-edit').click()`);
await sleep(900);
await digitar('note-title', marca + ' II');
await salvar();
await sleep(3200);
check('reescrever mantém a etiqueta e marca a revisão',
  (await texto('.note-sticker')).includes(marca + ' II'), await texto('.note-sticker'));

// --- o álbum ---

await go(`#/g/${grupo}/album`);
check('o álbum carrega', (await ev(`document.querySelector('#album-title')?.textContent?.trim()`)) === 'O álbum');

const cartoes = await conta('.album-card');
check('o álbum mostra uma cápsula por giro', cartoes === girosNoRegistro, `${cartoes} para ${girosNoRegistro} giros`);
check('a etiqueta gravada na máquina aparece no álbum',
  (await ev(`document.body.innerText.includes(${JSON.stringify(marca + ' II')})`)) === true);
check('há um chip por pessoa que já saiu', (await conta('.people-chip')) > 1);

const antesDoFiltro = await conta('.album-card');
await ev(`document.querySelectorAll('.people-chip')[1].click()`);
await sleep(700);
const depoisDoFiltro = await conta('.album-card');
check('focar numa pessoa reduz a parede', depoisDoFiltro > 0 && depoisDoFiltro <= antesDoFiltro,
  `${antesDoFiltro} -> ${depoisDoFiltro}`);
await ev(`document.querySelector('.people-chip.is-all').click()`);
await sleep(500);
check('voltar para "Todas" devolve a parede inteira', (await conta('.album-card')) === antesDoFiltro);

// Etiquetar um giro antigo pelo álbum: é o caso retroativo, no caminho do servidor.
const retro = 'RETRO ' + Date.now();
const abriuRetro = await ev(`(() => {
  const cartoes = [...document.querySelectorAll('.album-card')];
  const alvo = cartoes[cartoes.length - 1];
  if (!alvo) return 'sem cartão';
  alvo.click();
  return alvo.getAttribute('aria-label');
})()`);
check('o cartão mais antigo abre a bancada', typeof abriuRetro === 'string' && abriuRetro.includes('cápsula'), String(abriuRetro));
await sleep(900);
await digitar('note-title', retro);
await salvar();
await sleep(3200);
check('o giro antigo fica etiquetado pelo álbum',
  (await ev(`document.body.innerText.includes(${JSON.stringify(retro)})`)) === true);

// Retirar devolve o cartão ao estado em branco, e a retirada fica no registro.
const brancosAntes = await conta('.album-card.is-blank');
await ev(`(() => { const c = [...document.querySelectorAll('.album-card')]; c[c.length - 1].click(); })()`);
await sleep(900);
await ev(`document.querySelector('.note-remove').click()`);
await sleep(3200);
check('retirar devolve a cápsula ao estado sem etiqueta',
  (await conta('.album-card.is-blank')) === brancosAntes + 1,
  `${brancosAntes} -> ${await conta('.album-card.is-blank')}`);

// --- a ida e volta entre as duas páginas ---

await go(`#/g/${grupo}`, 8000);
check('voltar para a máquina mantém a rota do grupo',
  (await ev(`location.hash`)) === `#/g/${grupo}`, String(await ev(`location.hash`)));
check('o link para o álbum existe na máquina',
  (await ev(`!!document.querySelector('a[href$="/album"]')`)) === true);

const falhas = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - falhas}/${results.length} verificações de ponta a ponta`);
ws.close();
chrome.kill();
process.exit(falhas ? 1 : 0);
