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

// A porta pergunta quem e a pessoa antes de qualquer rota. Sem o cracha, nada abaixo dela
// chega a existir — e o teste veria a porta em vez da maquina.
await send('Page.navigate', { url: new URL(base).origin + new URL(base).pathname });
await sleep(2500);
await ev(`localStorage.setItem('mesa-do-mes:autor:v1', 'Teste de Ponta a Ponta')`);

const marca = 'E2E ' + Date.now();

// --- a máquina ---

await go(`#/g/${grupo}`);
check('a máquina carrega o grupo', !!(await ev(`!!document.querySelector('#synced-title')`)));
check('a cena de abertura terminou e o nome está na tela',
  (await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)) !== 'Entregando',
  String(await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)));
const girosNoRegistro = await conta('.cell-open');
check('o registro lista os giros', girosNoRegistro > 0, `${girosNoRegistro}`);

const abriuPeloPalco = await ev(`(() => {
  const alvo = document.querySelector('.note-sticker');
  if (!alvo) return 'sem etiqueta no palco';
  alvo.click();
  return 'ok';
})()`);
check('o palco abre a ficha do jogo', abriuPeloPalco === 'ok', String(abriuPeloPalco));
await sleep(900);
check('a ficha aparece', !!(await ev(`!!document.querySelector('[role="dialog"]')`)));

// A ficha abre para LER. As duas escritas são ações distintas, com nomes distintos.
const acoes = await ev(`[...document.querySelectorAll('.sheet-actions button')].map((b) => b.textContent.trim())`);
check('a ficha abre na face de leitura, com as duas escritas separadas',
  Array.isArray(acoes) && acoes.length === 3 && acoes[0].includes('resenha') && acoes[1].includes('jogo'),
  JSON.stringify(acoes));
check('a mesa entra em terceiro, como nota de rodapé',
  Array.isArray(acoes) && acoes[2].includes('A mesa'), JSON.stringify(acoes));
check('a face de leitura não tem formulário',
  !(await ev(`!!document.querySelector('#note-title, input[name=\"notaFinal\"]')`)));

// --- o jogo: título e descrição, compartilhados por todo o clube ---

await ev(`document.querySelector('.sheet-actions .note-cancel').click()`);
await sleep(700);
check('a face do jogo abre com o foco no nome dele',
  (await ev(`document.activeElement?.id`)) === 'note-title');
check('a nota média está ali, e é somente leitura',
  (await texto('.note-average')).includes('SOMENTE LEITURA') &&
  !(await ev(`!!document.querySelector('.note-average input, .note-average textarea')`)),
  await texto('.note-average'));

await digitar('note-title', marca);
await digitar('note-description', 'Descrição escrita pelo teste de ponta a ponta.');
await salvar();
await sleep(3200);

check('salvar o jogo devolve à ficha, sem fechar tudo',
  !!(await ev(`!!document.querySelector('[role="dialog"]')`)) &&
  !!(await ev(`!!document.querySelector('.sheet-actions')`)));
check('o nome do jogo aparece na ficha', (await texto('.sheet-card')).includes(marca));

// --- a resenha: de UMA pessoa, e ela é a única que pode reescrevê-la ---

await ev(`document.querySelector('.sheet-actions .secondary-action').click()`);
await sleep(700);
check('a régua da nota final tem onze casas',
  (await conta('input[name=\"notaFinal\"]')) === 11, `${await conta('input[name=\"notaFinal\"]')}`);
check('cada critério opcional ganha a casa do "não avaliei"',
  (await conta('input[name=\"diversao\"]')) === 12, `${await conta('input[name=\"diversao\"]')}`);
check('a dificuldade se responde por palavra, em cinco degraus mais o "não avaliei"',
  (await conta('input[name=\"dificuldade\"]')) === 6 &&
  (await texto('.score-ticks.is-named')).includes('Impossível'),
  await texto('.score-ticks.is-named'));
check('a exigência é da metade do formulário, e não de cada campo',
  (await conta('.band-title')) === 2 && (await conta('[aria-required="true"]')) === 2,
  `${await conta('.band-title')} faixas, ${await conta('[aria-required="true"]')} exigidos`);
check('sem as duas obrigatórias, a gravação não é oferecida',
  (await ev(`document.querySelector('.note-actions button').disabled`)) === true);

await ev(`document.querySelector('#nota-final-9').click()`);
await sleep(200);
await ev(`document.querySelectorAll('input[name="completude"]')[0].click()`);
await sleep(200);
await ev(`document.querySelectorAll('input[name="diversao"]')[11].click()`);
await sleep(200);

// A platina abre duas perguntas que não existem para quem não platinou, e elas continuam
// dentro da faixa opcional: a folha cobra duas coisas, e não três.
check('marcar a platina abre as duas perguntas dela',
  (await conta('.platina-extra')) === 1 &&
  (await conta('input[name="diversaoPlatina"]')) === 12 &&
  (await conta('input[name="dificuldadePlatina"]')) === 6,
  await texto('.platina-extra'));
check('a diversão da platina vem antes da dificuldade de platinar',
  (await texto('.platina-extra')).indexOf('DIVERSÃO DA PLATINA')
    < (await texto('.platina-extra')).indexOf('DIFICULDADE DE PLATINAR'),
  await texto('.platina-extra'));
check('a platina não vira uma terceira faixa do formulário',
  (await conta('.band-title')) === 2, `${await conta('.band-title')}`);

await ev(`document.querySelectorAll('input[name="diversaoPlatina"]')[11].click()`);
await sleep(200);
await ev(`document.querySelectorAll('input[name="dificuldadePlatina"]')[4].click()`);
await sleep(200);
await digitar('review-hours', '12');
await digitar('review-text', 'Resenha escrita pelo teste de ponta a ponta.');
check('com nota e completude, a gravação é oferecida',
  (await ev(`document.querySelector('.note-actions button').disabled`)) === false);

await salvar();
await sleep(3500);

check('gravar a resenha devolve à ficha', !!(await ev(`!!document.querySelector('.sheet-actions')`)));
check('a resenha aparece na ficha com quem a escreveu',
  (await texto('.reviews')).includes('Teste de Ponta a Ponta') &&
  (await texto('.reviews')).includes('Resenha escrita pelo teste'),
  await texto('.reviews'));
check('a minha resenha é a que fica marcada como minha',
  (await conta('.review.is-mine')) === 1, `${await conta('.review.is-mine')}`);
check('a nota do clube aparece no boletim',
  (await texto('.score-hero')).includes('9,0'), await texto('.score-hero'));
check('o tempo de jogo volta do servidor e vira média',
  (await texto('.score-time')).includes('12 h'), await texto('.score-time'));
check('o boletim diz de quantas pessoas que jogaram as resenhas vieram',
  /\d+ RESENHAS? DE \d+/.test(await texto('.score-hero')), await texto('.score-hero'));
check('a completude vira porcentagem escrita, e não só cor',
  (await texto('.completion-legend')).includes('PLATINADO'), await texto('.completion-legend'));
check('as duas médias da platina voltam do servidor e fecham o boletim',
  (await conta('.score-rules > div.is-platina')) === 2 &&
  (await texto('.score-rules')).includes('DIVERSÃO DA PLATINA') &&
  (await texto('.score-rules')).includes('DIFICULDADE DE PLATINAR'),
  await texto('.score-rules'));
check('a dificuldade de platinar volta em palavra, e não em nota',
  (await texto('.score-rules')).includes('Difícil'), await texto('.score-rules'));
check('a ação da resenha passa a ser editar a minha',
  (await ev(`document.querySelector('.sheet-actions .secondary-action').textContent.trim()`))
    .includes('Editar minha resenha'));

// --- reagir a uma resenha: o caminho inteiro, do dedo até a rule e de volta ---

const fileira = `[...document.querySelectorAll('.review.is-mine .reaction')]`;
check('cada resenha traz os quatro emoji, e nenhum a mais',
  (await ev(`${fileira}.map((b) => b.innerText.trim()).join('')`)) === '😯🔥😭😂',
  await ev(`${fileira}.map((b) => b.innerText.trim()).join('')`));
check('sem ninguém ter reagido, a fileira toda está apagada',
  (await ev(`${fileira}.every((b) => b.classList.contains('is-empty'))`)) === true);

await ev(`${fileira}[1].click()`);
await sleep(2500);
check('reagir grava e volta do servidor com a minha marcada',
  (await ev(`${fileira}[1].getAttribute('aria-pressed')`)) === 'true' &&
  (await ev(`${fileira}[1].innerText.replace(/\s+/g, '')`)).includes('1'),
  await ev(`${fileira}[1].innerText`));
check('a reação diz quem foi, para quem não vê o emoji',
  (await ev(`${fileira}[1].getAttribute('aria-label')`)).startsWith('Fogo — '),
  await ev(`${fileira}[1].getAttribute('aria-label')`));
check('as outras três continuam vazias: uma reação é de um emoji só',
  (await ev(`${fileira}.filter((b) => b.classList.contains('is-empty')).length`)) === 3);

await ev(`${fileira}[1].click()`);
await sleep(2500);
check('apertar de novo desliga a minha, e desligar também é gravar',
  (await ev(`${fileira}[1].getAttribute('aria-pressed')`)) === 'false' &&
  (await ev(`${fileira}[1].classList.contains('is-empty')`)) === true);

// --- a mesa: corrigir o elenco de um jogo sem tocar no sorteio ---

const vencedorAntesDaMesa = await ev(`document.querySelector('#synced-title')?.textContent?.trim()`);
await ev(`document.querySelector('.sheet-aside').click()`);
await sleep(800);
check('a mesa abre na mesma ficha, sem empilhar outro modal',
  (await conta('[aria-modal="true"]')) === 1 && (await conta('.seats')) > 0);

const naMesaAntes = await conta('.seat:not(.is-off)');
check('a mesa lista quem jogou', naMesaAntes > 0, `${naMesaAntes}`);
check('quem já resenhou não tem saída pela mesa',
  (await ev(`(() => {
    const linhas = [...document.querySelectorAll('.seat:not(.is-off)')];
    const minha = linhas.find((l) => l.innerText.includes('Teste de Ponta a Ponta'));
    return minha ? !minha.querySelector('.seat-out') : 'sem a minha linha';
  })()`)) === true);

const podeTirar = await conta('.seat:not(.is-off) .seat-out');
if (podeTirar) {
  await ev(`document.querySelector('.seat:not(.is-off) .seat-out').click()`);
  await sleep(3500);
  check('tirar alguém da mesa devolve à própria mesa, e a lista encolhe',
    (await conta('.seats')) > 0 && (await conta('.seat:not(.is-off)')) === naMesaAntes - 1,
    `${naMesaAntes} -> ${await conta('.seat:not(.is-off)')}`);

  await ev(`document.querySelector('.seat.is-off .seat-in').click()`);
  await sleep(3500);
  check('pôr de volta devolve a mesa ao tamanho de antes',
    (await conta('.seat:not(.is-off)')) === naMesaAntes,
    `${await conta('.seat:not(.is-off)')} para ${naMesaAntes}`);
}

await ev(`document.querySelector('#sheet-back').click()`);
await sleep(700);
check('voltar da mesa cai na ficha, e não fecha tudo',
  !!(await ev(`!!document.querySelector('.sheet-actions')`)));

await ev(`document.querySelector('#sheet-close').click()`);
await sleep(900);
check('a ficha fecha', !(await ev(`!!document.querySelector('[role="dialog"]')`)));
check('corrigir a mesa não mexeu no vencedor do giro',
  (await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)) === vencedorAntesDaMesa,
  `${vencedorAntesDaMesa} -> ${await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)}`);
check('o registro mostra o jogo e a nota do clube numa linha',
  (await ev(`[...document.querySelectorAll('.cell-note')].some((c) => c.textContent.includes(${JSON.stringify(marca)}) && c.textContent.includes('· 9,0'))`)) === true);
check('o palco mostra a nota do clube ao lado do jogo',
  (await texto('.note-sticker')).includes(marca) && (await texto('.note-sticker')).includes('9,0'),
  await texto('.note-sticker'));
check('o foco volta para um controle, não para o corpo da página',
  (await ev(`document.activeElement?.tagName`)) !== 'BODY',
  String(await ev(`document.activeElement?.className || document.activeElement?.tagName`)));
check('nenhum erro na tela', (await ev(`document.querySelector('.synced-error')?.textContent ?? ''`)) === '');

// Reescrever a própria resenha: o log é append-only, então a segunda vira revisão e a
// primeira sai da conta sem sair do registro.
await ev(`document.querySelector('.note-sticker').click()`);
await sleep(900);
await ev(`document.querySelector('.sheet-actions .secondary-action').click()`);
await sleep(700);
check('a resenha reabre no que já estava gravado',
  (await ev(`document.querySelector('#nota-final-9').checked`)) === true);
await ev(`document.querySelector('#nota-final-6').click()`);
await sleep(200);
await salvar();
await sleep(3500);
check('reescrever a própria resenha refaz a nota do clube',
  (await texto('.score-hero')).includes('6,0'), await texto('.score-hero'));
check('continua havendo uma resenha minha só',
  (await conta('.review')) === 1, `${await conta('.review')}`);

await ev(`document.querySelector('#sheet-close').click()`);
await sleep(900);

// --- a gaveta dos integrantes e a cápsula de cada pessoa ---

await ev(`document.querySelector('#roster-button').click()`);
await sleep(800);
check('os integrantes abrem numa gaveta', !!(await ev(`!!document.querySelector('.roster-card')`)));
check('a gaveta lista uma linha por cápsula', (await conta('.capsule-row')) > 1);

// A pessoa pintada precisa já ter saído para a conferência seguinte encontrá-la no registro.
// Com cinco giros e seis pessoas, escolher sempre a primeira linha tornava o teste dependente
// de qual foi a única cápsula ainda sem entrega.
const nomeNaGaveta = await ev(`(() => {
  const registro = [...document.querySelectorAll('.cell-open')].map((c) => c.textContent);
  const linhas = [...document.querySelectorAll('.capsule-row')];
  const alvo = linhas.find((linha) => {
    const nome = linha.querySelector('.capsule-who strong')?.textContent?.trim();
    return nome && registro.some((texto) => texto.includes(nome));
  }) || linhas[0];
  alvo.dataset.e2eTarget = 'true';
  return alvo.querySelector('.capsule-who strong')?.textContent?.trim();
})()`);
await ev(`document.querySelector('[data-e2e-target="true"]').click()`);
await sleep(700);
check('a bancada da cápsula troca a face da gaveta, sem empilhar outra',
  (await conta('[aria-modal="true"]')) === 1 && (await conta('.roster-scrim')) === 1);
check('a paleta inteira está na bancada', (await conta('.color-chip')) === 24, `${await conta('.color-chip')}`);

// Escolhe uma cor que não é a atual e um emoji, e grava contra o servidor de verdade.
const escolheu = await ev(`(() => {
  const chips = [...document.querySelectorAll('.color-chip')];
  const atual = chips.findIndex((c) => c.classList.contains('is-on'));
  const alvo = chips[(atual + 7) % chips.length];
  alvo.click();
  return alvo.getAttribute('aria-label');
})()`);
await ev(`document.querySelectorAll('.emoji-chip')[3].click()`);
await sleep(300);
await ev(`document.querySelector('.note-actions .secondary-action').click()`);
await sleep(3500);

check('pintar a cápsula volta para a lista da gaveta',
  !!(await ev(`!!document.querySelector('.capsule-row')`)) && !(await ev(`!!document.querySelector('.color-grid')`)));
check('a cor escolhida aparece na linha da pessoa',
  (await ev(`document.body.innerText.includes(${JSON.stringify(String(escolheu).toUpperCase())})`)) === true,
  String(escolheu));

await ev(`document.querySelectorAll('.capsule-row')[1].click()`);
await sleep(300);
check('depois de salvar uma cápsula, a bancada de outra pessoa ainda abre',
  !!(await ev(`!!document.querySelector('.color-grid')`)));
await ev(`document.querySelector('#capsule-back').click()`);
await sleep(300);

await ev(`document.querySelector('.roster-close').click()`);
await sleep(600);
check('fechar a gaveta devolve a página', !(await ev(`!!document.querySelector('.roster-card')`)));
check('a cápsula pintada muda a cor no registro',
  (await ev(`(() => {
    const alvo = [...document.querySelectorAll('.cell-open')].find((c) => c.textContent.includes(${JSON.stringify(nomeNaGaveta)}));
    return alvo ? getComputedStyle(alvo.querySelector('.cell-capsule')).backgroundColor : 'sem célula';
  })()`)) !== 'sem célula');

// --- reencenar a entrega: a cena roda de novo e não escreve nada ---

const antesDaCena = await ev(`document.querySelector('#synced-title')?.textContent?.trim()`);
await ev(`document.querySelector('.machine-replay').click()`);
await sleep(600);
check('clicar no globo recomeça a cena',
  (await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)) === 'Entregando');
await sleep(4000);
check('o emoji vencedor vira uma chuva desenhada no canvas',
  (await ev(`(() => {
    const canvas = document.querySelector('.confetti');
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return 0;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let pintados = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) pintados += 1;
    return pintados;
  })()`)) > 0);
await sleep(2000);
check('a cena termina na mesma cápsula de antes',
  (await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)) === antesDaCena,
  `${antesDaCena} -> ${await ev(`document.querySelector('#synced-title')?.textContent?.trim()`)}`);

// --- o álbum ---

await go(`#/g/${grupo}/album`);
check('o álbum carrega', (await ev(`document.querySelector('#album-title')?.textContent?.trim()`)) === 'O álbum');

const cartoes = await conta('.album-card');
check('o álbum mostra uma cápsula por giro', cartoes === girosNoRegistro, `${cartoes} para ${girosNoRegistro} giros`);
check('o jogo escrito na máquina aparece no álbum',
  (await ev(`document.body.innerText.includes(${JSON.stringify(marca)})`)) === true);
check('o cartão do álbum mostra a nota do clube',
  (await ev(`[...document.querySelectorAll('.album-score')].some((e) => e.innerText.includes('6,0'))`)) === true);
check('o boletim do álbum resume o clube inteiro',
  (await texto('.album-stats')).includes('NOTA DO CLUBE'), await texto('.album-stats'));
// O resumo do cartão tem teto: as duas medidas da platina ficam para a ficha, que abre a
// um clique daqui. Numa parede de dezenas de cartões, duas linhas que só existem para
// alguns jogos alongam todos e não deixam nenhum mais fácil de comparar.
check('o resumo dos cartões não carrega as medidas da platina',
  (await ev(`[...document.querySelectorAll('.album-criteria')]
    .every((e) => !/PLATINA/i.test(e.innerText))`)) === true,
  await texto('.album-criteria'));
check('há um chip por pessoa que já saiu', (await conta('.people-chip')) > 1);

// A ordem da parede: por padrão o registro, e qualquer outra fura as rodadas de propósito.
check('a parede abre na ordem do registro, com régua de rodada',
  (await texto('.round-rule')).includes('RODADA'), await texto('.round-rule'));
check('o seletor de ordem oferece a nota, cada critério e o tempo',
  (await conta('.sort-options button')) === 8, `${await conta('.sort-options button')}`);

const ordemDeAntes = await ev(`[...document.querySelectorAll('.album-title')].map((t) => t.textContent.trim())`);
await ev(`[...document.querySelectorAll('.sort-options button')].find((b) => b.textContent.trim() === 'Nota do clube').click()`);
await sleep(700);
check('ordenar por nota desmancha as rodadas e reordena a parede',
  (await texto('.round-rule')).includes('NOTA DO CLUBE') &&
  (await conta('.round-rule')) === 1 &&
  JSON.stringify(await ev(`[...document.querySelectorAll('.album-title')].map((t) => t.textContent.trim())`))
    !== JSON.stringify(ordemDeAntes),
  await texto('.round-rule'));
check('a parede ordenada continua com todos os cartões',
  (await conta('.album-card')) === cartoes, `${await conta('.album-card')} de ${cartoes}`);

await ev(`[...document.querySelectorAll('.sort-options button')].find((b) => b.textContent.trim() === 'Rodada').click()`);
await sleep(700);
check('voltar para a rodada devolve as réguas',
  (await conta('.round-rule')) >= 1 && (await texto('.round-rule')).includes('RODADA'));

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
check('o cartão mais antigo abre a ficha',
  typeof abriuRetro === 'string' && abriuRetro.includes('ficha'), String(abriuRetro));
await sleep(900);
// Pelo álbum vale a mesma separação: a ficha abre para ler, escrever é a decisão seguinte.
await ev(`document.querySelector('.sheet-actions .note-cancel').click()`);
await sleep(700);
await digitar('note-title', retro);
await salvar();
await sleep(3200);
check('o giro antigo ganha o jogo pelo álbum',
  (await ev(`document.body.innerText.includes(${JSON.stringify(retro)})`)) === true);

// E a resenha retroativa também: quem jogou há um ano ainda pode dar a nota dele. O
// cartão mais antigo é o mais resenhado do grupo semeado, então o que se prova aqui é que
// a minha entra na conta que já existia — não que ela vire a conta inteira.
const resenhasAntes = Number(await ev(`(() => {
  const c = [...document.querySelectorAll('.album-card')];
  const texto = c[c.length - 1].innerText.match(/(\\d+) RESENHAS?/);
  return texto ? texto[1] : 0;
})()`));

await ev(`document.querySelector('.sheet-actions .secondary-action').click()`);
await sleep(700);
await ev(`document.querySelector('#nota-final-4').click()`);
await sleep(200);
await ev(`document.querySelectorAll('input[name="completude"]')[2].click()`);
await sleep(200);
await salvar();
await sleep(3500);

check('o giro antigo aceita resenha pelo álbum',
  (await texto('.reviews')).includes('Teste de Ponta a Ponta') &&
  (await conta('.review.is-mine')) === 1,
  await texto('.reviews'));
check('a minha resenha entra na conta que já existia, sem virar a conta inteira',
  (await ev(`document.querySelector('.score-hero b').textContent.trim()`)) !== '4,0' &&
  Number(await ev(`document.querySelector('.score-hero').innerText.match(/(\\d+) RESENHAS?/)[1]`))
    === resenhasAntes + 1,
  `${resenhasAntes} -> ${await texto('.score-hero')}`);
await ev(`document.querySelector('#sheet-close').click()`);
await sleep(700);

// Retirar devolve o cartão ao estado em branco, e a retirada fica no registro.
const brancosAntes = await conta('.album-card.is-blank');
await ev(`(() => { const c = [...document.querySelectorAll('.album-card')]; c[c.length - 1].click(); })()`);
await sleep(900);
await ev(`document.querySelector('.sheet-actions .note-cancel').click()`);
await sleep(700);
await ev(`document.querySelector('.note-remove').click()`);
await sleep(3500);
check('retirar o jogo devolve a cápsula ao estado sem jogo escrito',
  (await conta('.album-card.is-blank')) === brancosAntes + 1,
  `${brancosAntes} -> ${await conta('.album-card.is-blank')}`);
check('retirar o jogo não apagou as resenhas dele',
  Number(await ev(`(() => {
    const c = [...document.querySelectorAll('.album-card')];
    const achado = c[c.length - 1].innerText.match(/(\\d+) RESENHAS?/);
    return achado ? achado[1] : 0;
  })()`)) === resenhasAntes + 1);
await ev(`document.querySelector('#sheet-close').click()`);
await sleep(700);

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
