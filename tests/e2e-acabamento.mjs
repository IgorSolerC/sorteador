import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

// Áudio e impressão pedem um navegador: mocks não provam que há sinal nem pixels.
const base = 'http://localhost:4200/?emu=1';
const output = '.impeccable/review/2026-09-06';
mkdirSync(output, { recursive: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--hide-scrollbars', '--remote-debugging-port=9373',
  `--user-data-dir=${process.env.TEMP}/chrome-acabamento-${Date.now()}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
for (let i = 0; i < 40; i++) {
  try {
    const tabs = await (await fetch('http://127.0.0.1:9373/json')).json();
    ws = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
    break;
  } catch { await sleep(250); }
}
await new Promise((resolve) => ws.onopen = resolve);
let id = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const next = ++id; pending.set(next, resolve); ws.send(JSON.stringify({ id: next, method, params }));
});
const ev = async (expression) => {
  const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (response.result?.exceptionDetails) throw new Error(JSON.stringify(response.result.exceptionDetails));
  return response.result?.result?.value;
};
let failures = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; failures += !ok; console.log(`${ok ? 'ok' : 'FALHOU'} ${name} ${detail}`); };
const shot = async (name) => {
  const capture = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${output}/${name}.png`, Buffer.from(capture.result.data, 'base64'));
};
try {
  await send('Page.enable');
  await send('Page.navigate', { url: base }); await sleep(2000);
  await ev(`localStorage.setItem('mesa-do-mes:autor:v1', 'Ana'); localStorage.setItem('mesa-do-mes:som:v1', '1')`);
  await send('Page.navigate', { url: base + '#/g/demo' });
  await send('Page.reload'); await sleep(8000);
  const audio = await ev(`(async () => {
    const component = ng.getComponent(document.querySelector('app-synced-group'));
    const sound = component.machineSound;
    const ctx = new OfflineAudioContext(1, 44100 * 7, 44100);
    sound.context = ctx; sound.noise = null;
    sound.master = ctx.createGain(); sound.master.gain.value = .32; sound.master.connect(ctx.destination);
    sound.spin(4300);
    sound.pop(ctx, sound.scene, 5.05);
    const buffer = await ctx.startRendering(); const data = buffer.getChannelData(0);
    const rms = [0, 1, 2, 3, 4].map((s) => {
      const chunk = data.slice(s * 44100, (s + .25) * 44100);
      return Math.sqrt(chunk.reduce((n, v) => n + v * v, 0) / chunk.length);
    });
    const peak = data.reduce((n, v) => Math.max(n, Math.abs(v)), 0);
    const bytes = new Uint8Array(data.length * 2 + 44); const view = new DataView(bytes.buffer);
    const str = (offset, text) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    str(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); str(8, 'WAVEfmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 44100, true); view.setUint32(28, 88200, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    str(36, 'data'); view.setUint32(40, data.length * 2, true);
    data.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true));
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { rms, peak, wav: btoa(binary) };
  })()`);
  writeFileSync(`${output}/roleta.wav`, Buffer.from(audio.wav, 'base64'));
  check('rolamento tem sinal em todos os segundos do giro', audio.rms.every((value) => value > .001), JSON.stringify(audio.rms));
  check('áudio não satura', audio.peak < .95, `pico=${audio.peak}`);
  const variants = await ev(`(async () => {
    const sound = ng.getComponent(document.querySelector('app-synced-group')).machineSound;
    const render = async (muted) => {
      const ctx = new OfflineAudioContext(1, 44100 * 2, 44100);
      sound.context = ctx; sound.noise = null; sound.scene = null;
      sound.master = ctx.createGain(); sound.master.connect(ctx.destination);
      sound.preferences.setSound(!muted); sound.spin(0);
      const buffer = await ctx.startRendering();
      return [...buffer.getChannelData(0)];
    };
    const muted = await render(true), reduced = await render(false);
    return { muted: muted.every(v => v === 0), reduced: reduced.slice(44100).every(v => v === 0) && reduced.some(v => Math.abs(v) > .001) };
  })()`);
  check('som desligado produz silêncio', variants.muted);
  check('movimento reduzido tem entrega curta, sem rolamento longo', variants.reduced);
  await send('Page.navigate', { url: base + '#/g/demo/album' }); await sleep(4000);
  await ev(`[...document.querySelectorAll('.sort-options button')].find(b => b.textContent.trim() === 'Dificuldade').click()`); await sleep(250);
  check('dificuldade aparece no destaque', await ev(`document.querySelector('.album-score').innerText.toLowerCase().includes('dificuldade')`));
  check('nota geral passa ao resumo', await ev(`document.querySelector('.album-criteria').innerText.includes('NOTA DO CLUBE')`));
  for (const width of [1440, 900, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await ev(`document.querySelector('.album-sort').scrollIntoView()`); await sleep(300);
    check(`álbum cabe em ${width}px`, await ev(`document.documentElement.scrollWidth <= innerWidth`));
    await shot(`album-${width}`);
  }
  await ev(`window.posterTexts=[]; const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.posterTexts.push(String(t));return fill.call(this,t,...a)};
    const original=URL.createObjectURL; URL.createObjectURL=function(blob){window.posterBlob=blob;return original.call(this,blob)};
    document.querySelector('.album-save button').click()`); await sleep(1200);
  const poster = await ev(`new Promise(resolve => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(window.posterBlob) })`);
  writeFileSync(`${output}/album.png`, Buffer.from(poster.split(',')[1], 'base64'));
  check('PNG inclui critérios, completude e rodada', await ev(`['Dificuldade','Platinado','Finalizado','Incompleto'].every(t=>posterTexts.includes(t)) && posterTexts.some(t=>t.includes('RODADA'))`));
  check('PNG não inclui credencial do grupo', await ev(`!posterTexts.some(t=>t.includes('#/g/') || t.includes('http'))`));
  await ev(`document.querySelector('.people-chip:not(.is-all)').click()`); await sleep(200);
  await ev(`document.querySelector('.album-save button').click()`); await sleep(800);
  const single = await ev(`new Promise(resolve => { const r=new FileReader(); r.onload=()=>resolve(r.result); r.readAsDataURL(window.posterBlob) })`);
  writeFileSync(`${output}/album-filtrado.png`, Buffer.from(single.split(',')[1], 'base64'));
  await ev(`document.querySelector('.people-chip.is-all').click()`); await sleep(200);
  await ev(`document.querySelector('.album-card').click()`); await sleep(400);
  await ev(`document.querySelector('.review-reactions').scrollIntoView({block:'center'})`); await sleep(150);
  await shot('reacoes-mobile');
  check('resenha usa apenas um controle compacto', await ev(`document.querySelectorAll('.review:first-child .reaction').length === 0 && document.querySelectorAll('.review:first-child .reaction-trigger').length === 1`));
  for (const width of [1440, 900, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await ev(`document.querySelector('.review:first-child .reaction-trigger').scrollIntoView({block:'center'})`); await sleep(200);
    await shot('reacoes-compactas-' + width);
    await ev(`document.querySelector('.review:first-child .reaction-trigger').click()`); await sleep(200);
    const bounds = await ev(`(() => { const el=document.querySelector('.reaction-popover:popover-open'); const r=el.getBoundingClientRect(); const t=document.querySelector('.review:first-child .reaction-trigger').getBoundingClientRect(); const s=getComputedStyle(el); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,triggerBottom:t.bottom,paddingTop:parseFloat(s.paddingTop),paddingBottom:parseFloat(s.paddingBottom)} })()`);
    check('seletor cabe na tela de ' + width, bounds.left >= 0 && bounds.right <= bounds.width && bounds.top >= 0 && bounds.bottom <= bounds.height, JSON.stringify(bounds));
    check('seletor preserva a resenha em ' + width, bounds.top >= bounds.triggerBottom, JSON.stringify(bounds));
    check('moldura vertical é enxuta em ' + width, bounds.paddingTop <= 4.1 && bounds.paddingBottom <= 4.1, JSON.stringify(bounds));
    await shot('reacoes-abertas-' + width);
    check('nove escolhas com alvos de 44px em ' + width, await ev(`(() => {const b=[...document.querySelectorAll('.review:first-child .reaction')];return b.length===9 && b.every(e=>e.getBoundingClientRect().width>=44 && e.getBoundingClientRect().height>=44)})()`));
    check('opções aposentadas estão ausentes em ' + width, await ev(`![...document.querySelectorAll('.review:first-child .reaction')].some(b => /🏆|🎮|👍/.test(b.textContent))`));
    if (width === 390) {
      check('segunda fileira móvel fica centralizada', await ev(`(() => { const p=document.querySelector('.reaction-popover:popover-open').getBoundingClientRect(); const buttons=[...document.querySelectorAll('.review:first-child .reaction')].map(el=>el.getBoundingClientRect()); const last=buttons.slice(5); return Math.abs(last.reduce((sum,r)=>sum+r.left+r.width/2,0)/last.length-(p.left+p.width/2))<1 })()`));
    }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(200);
    check('Esc fecha só o seletor em ' + width, await ev(`!!document.querySelector('#sheet-card') && !document.querySelector('.reaction-popover:popover-open') && document.activeElement.classList.contains('reaction-trigger')`));
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await ev(`document.querySelector('.review:first-child .reaction-trigger').scrollIntoView({block:'center'})`); await sleep(250);
  const triggerRect = await ev(`(() => { const r=document.querySelector('.review:first-child .reaction-trigger').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2} })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...triggerRect }); await sleep(160);
  check('passagem breve do mouse não abre o seletor', await ev(`!document.querySelector('.reaction-popover:popover-open')`));
  await sleep(180);
  check('hover abre sem deslocar o foco', await ev(`!!document.querySelector('.reaction-popover:popover-open') && !document.querySelector('.reaction-popover').contains(document.activeElement)`));
  const pickerRect = await ev(`(() => {const r=document.querySelector('.reaction-popover:popover-open').getBoundingClientRect();return {x:r.x+20,y:r.y+20}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...pickerRect }); await sleep(350);
  check('o seletor continua aberto ao levar o mouse até ele', await ev(`!!document.querySelector('.reaction-popover:popover-open')`));
  check('o nome da escolha aparece junto ao emoji', await ev(`(() => { const b=document.querySelector('.reaction:hover'); const s=getComputedStyle(b,'::after'); return b?.dataset.name==='Surpresa' && s.content.includes('Surpresa') && Number(s.opacity)===1 })()`));
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 10, y: 10 }); await sleep(300);
  check('sair do seletor recolhe a interface', await ev(`!document.querySelector('.reaction-popover:popover-open')`));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await ev(`document.querySelector('.review:first-child .reaction-trigger').scrollIntoView({block:'center'})`); await sleep(200);
  const touchRect = await ev(`(() => { const r=document.querySelector('.review:first-child .reaction-trigger').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2} })()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touchRect, radiusX: 2, radiusY: 2, force: 1, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(180);
  check('toque abre o seletor sem depender de hover', await ev(`!!document.querySelector('.reaction-popover:popover-open')`));
  // A escolha segue o mesmo caminho depois de toque ou mouse; fazê-la aqui também garante
  // que o painel não fica preso num estado intermediário da emulação móvel.
  await ev(`document.querySelector('.review:first-child .reaction:last-child').click()`);
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // Uma reação nova precisa atravessar o servidor, não só aparecer sob o dedo.
  await sleep(1800);
  check('escolher recolhe o seletor e atualiza o resumo', await ev(`!document.querySelector('.reaction-popover:popover-open') && document.querySelector('.review:first-child .reaction-trigger').classList.contains('is-on')`));
  await ev(`document.querySelector('.review:first-child .reaction-trigger').click()`); await sleep(100);
  check('a reação escolhida está marcada ao reabrir', await ev(`document.querySelector('.review:first-child .reaction:last-child').getAttribute('aria-pressed') === 'true'`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 10, y: 10, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 10, button: 'left', clickCount: 1 }); await sleep(100);
  check('clicar fora fecha o seletor', await ev(`!document.querySelector('.reaction-popover:popover-open')`));
  // O clique fora também pode fechar a ficha: abra-a de novo para o teste do lacre.
  await ev(`if(!document.querySelector('#sheet-card')) document.querySelector('.album-card').click()`); await sleep(150);
  await ev(`document.querySelector('#sheet-close').click(); localStorage.setItem('mesa-do-mes:cego:v1','1')`);
  await send('Page.reload'); await sleep(3000);

  // O lacre pelo caminho de verdade, e não com `sealedOf` trocado: quem foi sorteado numa
  // rodada continua jogando os jogos seguintes dela, e o modo cego tem de lacrar a nota
  // deles. Enquanto a mesa saía do globo do giro, esta pessoa não devia resenha nenhuma
  // depois de sair — e o modo cego "não fazia nada" para ela, que é o defeito relatado.
  const sorteada = await ev(`(() => {
    const app = ng.getComponent(document.querySelector('app-group-history'));
    const spins = app.snapshot().state.spins;
    return { nome: spins[0].winnerName, fora: !spins[3].eligible.includes(spins[0].winnerId) };
  })()`);
  check('quem ganhou o primeiro giro já saiu do globo do quarto', sorteada.fora, JSON.stringify(sorteada));
  await ev(`localStorage.setItem('mesa-do-mes:autor:v1', ${JSON.stringify(sorteada.nome)})`);
  await send('Page.reload'); await sleep(3000);
  const lacre = await ev(`(() => {
    const cartoes = [...document.querySelectorAll('.album-card')];
    const alvo = cartoes.find((c) => c.querySelector('.album-title')?.textContent.includes('Lethal Company'));
    return { achou: !!alvo, lacrado: !!alvo?.querySelector('.album-sealed'), nota: !!alvo?.querySelector('.album-score') };
  })()`);
  check('o modo cego lacra o jogo que quem já foi sorteada ainda deve', lacre.lacrado && !lacre.nota, JSON.stringify(lacre));
  await ev(`document.querySelector('.album-card .album-sealed').closest('.album-card').click()`); await sleep(300);
  check('a ficha desse jogo também abre lacrada', await ev(`!!document.querySelector('.sheet-seal') && !document.querySelector('.scoreboard')`));
  await shot('lacre-de-quem-ja-saiu');
  await ev(`document.querySelector('#sheet-close').click(); localStorage.setItem('mesa-do-mes:autor:v1','Ana')`);
  await send('Page.reload'); await sleep(3000);

  await ev(`const app=ng.getComponent(document.querySelector('app-group-history'));
    app.sealedOf=()=>true; window.posterTexts=[];
    const fill=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(t,...a){posterTexts.push(String(t));return fill.call(this,t,...a)};
    document.querySelector('.album-save button').click()`); await sleep(800);
  check('exportação respeita o lacre', await ev(`posterTexts.includes('Lacrado') && !posterTexts.includes('Platinado') && !posterTexts.includes('Finalizado')`));
} finally {
  console.log(`${checks - failures}/${checks} verificações de acabamento`);
  ws.close(); chrome.kill();
}
process.exitCode = failures ? 1 : 0;
