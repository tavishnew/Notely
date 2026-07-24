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

(async () => {
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

  // Wait for the spinner to finish by polling on document.title change or div presence
  for (let i = 0; i < 30; i++) {
    const r = await send('Runtime.evaluate', { expression: 'document.body.innerText.includes(\"Loading\")', returnByValue: true });
    const v = r.result && r.result.result && r.result.result.result && r.result.result.result.value;
    if (!v) break;
    await sleep(500);
  }
  await sleep(2000);

  // Now run our overflow detection script
  const script = `
  (function(){
    const w = window.innerWidth, h = window.innerHeight;
    const docEl = document.documentElement, body = document.body;
    const dw = docEl.scrollWidth, dh = docEl.scrollHeight;
    const bw = body.scrollWidth, bh = body.scrollHeight;
    
    // Walk tree, collect parent chain of every element whose right > w + 0.5 or left < -0.5 or bottom > h + 0.5 or top < -0.5
    function path(el){
      const p = [];
      let cur = el;
      while (cur && cur.tagName) {
        let id = cur.id ? '#' + cur.id : '';
        let c = (cur.className && typeof cur.className === 'string' ? '.' + cur.className.trim().split(/\s+/).slice(0,3).join('.') : '');
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
      const farBottom = r.bottom - h;
      const farTop = -r.top;
      if (farRight > 0.5 || farLeft > 0.5 || farBottom > 0.5 || farTop > 0.5) {
        const cs = getComputedStyle(el);
        overflowing.push({
          path: path(el),
          tag: el.tagName, id: el.id || null,
          cls: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 200),
          rect: { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
          farRight: +farRight.toFixed(1), farLeft: +farLeft.toFixed(1), farBottom: +farBottom.toFixed(1), farTop: +farTop.toFixed(1),
          pos: cs.position, overflow: cs.overflow, overflowX: cs.overflowX, overflowY: cs.overflowY, transform: cs.transform,
        });
      }
    }
    overflowing.sort((a,b) => (Math.abs(b.farRight) + Math.abs(b.farLeft) + Math.abs(b.farBottom) + Math.abs(b.farTop)) - (Math.abs(a.farRight) + Math.abs(a.farLeft) + Math.abs(a.farBottom) + Math.abs(a.farTop)));
    
    // Also dump the body children and their rect to understand structure
    const bodyKids = [];
    for (const c of body.children) {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      bodyKids.push({ tag: c.tagName, id: c.id, cls: (c.className||'').slice(0, 120),
                    rect: { l:+r.left.toFixed(1), t:+r.top.toFixed(1), r:+r.right.toFixed(1), b:+r.bottom.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1) },
                    pos: cs.position, overflow: cs.overflow });
    }
    
    return {
      dims: { inner: [w,h], docScroll: [dw,dh], bodyScroll: [bw,bh], htmlHScroll: dw > w, bodyHScroll: bw > w, htmlVScroll: dh > h, bodyVScroll: bh > h, route: location.pathname },
      overflowing: overflowing.slice(0, 30),
      bodyKids: bodyKids,
      viewport: { w, h }
    };
  })();
  `;

  const result = await send('Runtime.evaluate', { expression: script, returnByValue: true });
  ws.close();
  chrome.kill();
  
  if (result.result && result.result.result) {
    const value = result.result.result;
    // The value is an object, but it might be a remote object. We need to get its properties.
    // However, since we returned a plain object, we can get it by value if we set returnByValue: true? 
    // Actually, we set returnByValue: true in the evaluate call, so the result should be a copy.
    // But the DevTools protocol returns a remote object by default. We used returnByValue: true, so we should get the value directly.
    // Let's check the structure: result.result.result is the remote object, and if we set returnByValue: true, then result.result.result.value should be the actual value.
    // However, looking at the previous output, we had to go through result.result.result.value to get the string.
    // So let's try to get the value from result.result.result.value.
    // But if we returned an object, the value might be an object representation.
    // Let's just print the raw value and see.
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log('no result');
    console.log(JSON.stringify(result, null, 2));
  }
})();
