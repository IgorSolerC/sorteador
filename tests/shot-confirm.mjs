import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9336;
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars',
  `--remote-debugging-port=${port}`,'--window-size=1440,900',
  '--user-data-dir='+process.env['TEMP']+'/chrome-cfm-'+Date.now(),'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i=0;i<60;i++){ try{ const l=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const p=l.find(t=>t.type==='page'); if(p){ ws=new WebSocket(p.webSocketDebuggerUrl); break; } }catch{} await sleep(400); }
await new Promise(r=>ws.onopen=r);
let id=0; const pend=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}};
const send=(method,params={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method,params}));});
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate',{url:process.argv[2]}); await sleep(Number(process.env["W"] ?? 11000));
const diag=await send('Runtime.evaluate',{expression:`(()=>{
  const b=document.getElementById('spin-button');
  return JSON.stringify({ achou: !!b, texto: b?.textContent?.trim(), desabilitado: b?.disabled });
})()`,returnByValue:true});
console.log('botão:', diag.result.value);
await send('Runtime.evaluate',{expression:`(()=>{const b=document.getElementById('spin-button'); if(!b) return 'sem botao'; b.click(); return 'clicado';})()`,returnByValue:true});
await sleep(1200);
const {result}=await send('Runtime.evaluate',{expression:`document.querySelector('[role="alertdialog"]')?.innerText ?? 'SEM AVISO'`,returnByValue:true});
console.log(result.value);
const shot=await send('Page.captureScreenshot',{format:'png'});
writeFileSync('.impeccable/review/confirmacao.png',Buffer.from(shot.data,'base64'));
ws.close(); chrome.kill(); process.exit(0);
