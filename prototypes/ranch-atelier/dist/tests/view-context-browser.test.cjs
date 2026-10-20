const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync(require('node:path').join(__dirname, '../view-context.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function browser(paired = true) {
  const events = {}, timers = [], intervals = [], requests = [], elements = [];
  const storage = new Map(paired ? [['ranch-view-pair-v1', 'a'.repeat(64)]] : []);
  const element = () => ({ style: {}, dataset: {}, setAttribute() {}, getAttribute() { return null; }, matches() { return false; }, getClientRects() { return []; } });
  const sandbox = { console, URLSearchParams, crypto: webcrypto, AbortSignal, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1, scrollX: 0, scrollY: 0,
    location: { hash: '', pathname: '/scene-generator', search: '' }, history: { replaceState() {} },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    sessionStorage: { getItem: () => null, setItem() {} },
    setTimeout: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; }, clearTimeout() {}, setInterval(fn) { intervals.push(fn); },
    html2canvas: () => new Promise(() => {}),
    fetch: async (url, options) => {
      if (url === '/view-build.json') return { ok: true, json: async () => ({ buildId: 'test-build' }) };
      requests.push(JSON.parse(options.body)); return { ok: true };
    },
    MutationObserver: class { observe() {} },
    document: { readyState: 'complete', hidden: false, visibilityState: 'visible', title: 'Scene Generator', documentElement: {},
      hasFocus: () => true, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
      createElement: element, addEventListener: (name, fn) => { events[name] = fn; },
      body: { append: e => elements.push(e) }, head: { append: e => e.onload?.() }
    }
  };
  sandbox.window = { addEventListener: (name, fn) => { events[name] = fn; } };
  vm.runInNewContext(source, sandbox);
  return { events, timers, intervals, requests, elements, sandbox };
}
test('missing pairing is visible; storage pairing starts an already-open tab', async () => {
  const b = browser(false);
  assert.match(b.elements[0].textContent, /disconnected/);
  b.timers.find(t => t.ms === 1500).fn(); await flush();
  assert.equal(b.requests.length, 0);
  b.events.storage({ key: 'ranch-view-pair-v1', newValue: 'a'.repeat(64) }); await flush();
  assert.equal(b.requests[0].slug, '/scene-generator');
});
test('hung image capture cannot block state, reconnect, or pause', async () => {
  const b = browser();
  b.timers.find(t => t.ms === 1500).fn(); await flush();
  assert.equal(b.requests.length, 1, 'state arrives before image capture completes');
  b.events.online(); await flush();
  assert.equal(b.requests.length, 2, 'heartbeat is independent of image capture');
  b.elements[0].onclick(); await flush();
  assert.equal(b.requests.at(-1).sharing, false);
  assert.equal(b.requests.at(-1).context, undefined);
  assert.equal(b.requests.at(-1).image, null);
});
test('capture timeout reports degraded images and continues structured state', async () => {
  const b = browser(); b.timers.find(t => t.ms === 1500).fn(); await flush();
  b.timers.find(t => t.ms === 10000).fn(); await flush();
  assert.match(b.requests.at(-1).captureError, /timed out/);
  assert.equal(b.requests.at(-1).slug, '/scene-generator');
  assert.equal(b.requests.at(-1).bridgeVersion, '2.0.0');
});

test('command polling awaits completion, survives receipt retry, and stops while paused', async () => {
  const b=browser();await flush();let executed=0,delivered=0,failReceipt=true;
  const ledger=new Map();b.sandbox.sessionStorage.getItem=k=>ledger.get(k)||null;b.sandbox.sessionStorage.setItem=(k,v)=>ledger.set(k,v);
  const command={id:'command-1234567890'};
  b.sandbox.window.RanchActions={describe:()=>({providers:[]}),execute:async()=>{executed++;return {id:command.id,status:'succeeded',afterRevision:2};}};
  b.sandbox.fetch=async(url,options)=>{
    if(url.startsWith('/api/app-actions')){
      if(!options.method)return {ok:true,json:async()=>({commands:[command]})};
      const body=JSON.parse(options.body);
      if(body.kind==='receipt'){if(failReceipt)throw Error('offline');delivered++;}
      return {ok:true};
    }
    return {ok:true};
  };
  await b.intervals[0]();assert.equal(executed,1);assert.equal(delivered,0);
  failReceipt=false;await b.intervals[0]();assert.equal(executed,1);assert.equal(delivered,1);
  b.elements[0].onclick();await flush();await b.intervals[0]();assert.equal(delivered,1);
});
