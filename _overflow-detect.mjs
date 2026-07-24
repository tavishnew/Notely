import WebSocket from 'ws';
import { spawn } from 'child_process';
import http from 'http';
import { existsSync, mkdirSync } from 'fs';

const URL = process.argv[2] || 'http://localhost:5173/';
const W = parseInt(process.argv[3] || '1440', 10);
const H = parseInt(process.argv[4] || '900', 10);

const userData = 'C:/Users/tavis/AppData/Local/Temp/cd-' + Date.now();
if (!existsSync(userData)) mkdirSync(userData, { recursive: true });

const chrome = spawn('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-dev-shm-usage',
  '--window-size=' + W + ',' + H,
  '--remote-debugging-port=9222',
  '--user-data-dir=' + userData,
  '--hide-scrollbars=false',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

chrome.stderr.on('data', () => {});

function get(url) {
  return new Promise((res, rej) => {
    http.get(url, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => res(JSON.parse(b)));
    }).on('error', rej);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await sleep(1800);
let tabs;
for (let i = 0; i < 12; i++) {
  try {
    tabs = await get('http://127.0.0.1:9222/json');
    if (tabs.length) break;
  } catch {}
  await sleep(500);
}
const tab = tabs.find((t) => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();
ws.on('message', (m) => {
  const msg = JSON.parse(m);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
await new Promise((r) => ws.on('open', r));
const send = (method, params) =>
  new Promise((res) => {
    const id = nextId++;
    pending.set(id, (m) => res(m));
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: W,
  height: H,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: URL });
await sleep(6000);

// Also wait for the spinner to finish by polling on document.title change or div presence
for (let i = 0; i < 30; i++) {
  const r = await send('Runtime.evaluate', { expression: 'document.body.innerText.includes(\"Loading\")', returnByValue: true });
  const v = r.result && r.result.result && r.result.result.result && r.result.result.result.value;
  if (!v) break;
  await sleep(500);
}
await sleep(2000);

const script = `
(function(){
  const lines = [];
  const rep = (msg) => lines.push(JSON.stringify(msg));
  const w = window.innerWidth, h = window.innerHeight;
  const docEl = document.documentElement, body = document.body;
  const dw = docEl.scrollWidth, dh = docEl.scrollHeight;
  const bw = body.scrollWidth, bh = body.scrollHeight;
  rep({ stage: 'dims', inner: [w,h], docScroll: [dw,dh], bodyScroll: [bw,bh], htmlHScroll: dw > w, bodyHScroll: bw > w, htmlVScroll: dh > h, bodyVScroll: bh > h, route: location.pathname });

  // Walk tree, collect parent chain of every element whose right > w + 0.5
  function path(el){
    const p = [];
    let cur = el;
    while (cur && cur.tagName) {
      let id = cur.id ? '#' + cur.id : '';
      let c = (cur.className && typeof cur.className === 'string' ? '.' + cur.className.trim().split(/\\s+/).slice(0,3).join('.') : '');
      c = c.slice(0, 80);
      p.unshift(cur.tagName + id + c);
      cur = cur.parentElement;
      if (p.length > 6) break;
    }
    return p.join(' > ');
  }
  const all = Array.from(document.querySelectorAll('*'));
  const overflowing = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    const farRight = r.right - w;
    const farLeft = -r.left;
    if (farRight > 0.5 || farLeft > 0.5) {
      const cs = getComputedStyle(el);
      overflowing.push({
        path: path(el),
        tag: el.tagName, id: el.id || null,
        cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 200),
        rect: { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
        farRight: +farRight.toFixed(1), farLeft: +farLeft.toFixed(1),
        pos: cs.position, overflow: cs.overflow, overflowX: cs.overflowX, transform: cs.transform,
      });
    }
  }
  overflowing.sort((a,b) => (b.farRight + b.farLeft) - (a.farRight + a.farLeft));
  rep({ stage: 'overflowing', viewportW: w, count: overflowing.length, top: overflowing.slice(0, 30) });

  // Also dump the body children and their rect to understand structure
  const bodyKids = [];
  for (const c of body.children) {
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    bodyKids.push({ tag: c.tagName, id: c.id, cls: (c.className||'').slice(0, 120),
                    rect: { l:+r.left.toFixed(1), t:+r.top.toFixed(1), r:+r.right.toFixed(1), b:+r.bottom.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) },
                    pos: cs.position, overflow: cs.overflow });
  }
  rep({ stage: 'bodyKids', kids: bodyKids });

  document.title = '__DONE__:' + encodeURIComponent(JSON.stringify(lines));
})();
`;

await send('Runtime.evaluate', { expression: script, returnByValue: true });
await sleep(500);
const t = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
ws.close();
chrome.kill();
if (t.result && t.result.result && t.result.result.result && t.result.result.result.value) {
  const raw = t.result.result.result.value.replace(/^__DONE__:/, '');
  try {
    const arr = JSON.parse(decodeURIComponent(raw));
    console.log(JSON.stringify(arr, null, 2));
  } catch (e) {
    console.log('parse fail', e);
    console.log(decodeURIComponent(raw).slice(0, 800));
  }
} else {
  console.log('no result top keys:', Object.keys(t.result?.result || {}));
  console.log('full:', JSON.stringify(t, null, 2).slice(0, 1500));
}
