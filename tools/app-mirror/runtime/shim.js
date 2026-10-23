// Abbie's World mirror shim. build.mjs injects this as the first script of every mirrored page.
// It lets the unmodified app run as a Claude page: the app asks for root paths (/simulations/x.mjs,
// /review/feed.json) and clean routes (/sandbox, /models/cow); the page is served from an unknown
// folder with no rewrites, and models and pictures sit inside a few packs (.glb is not a publishable
// type and a page may hold only ~500 files). Everything here is presentation plumbing: nothing is added
// to the world.
(() => {
  'use strict';
  if (window.__awMirror) return;
  const me = document.currentScript;
  const ROOT = new URL(me.getAttribute('data-root') || './', document.baseURI).href;
  const ORIGIN = location.origin;
  const HOSTS = /^(?:https?:)?\/\/(?:abbies-ranch-atelier\.vercel\.app|ranch\.abbies\.world|app\.abbies\.world|www\.abbies\.world|abbies\.world)(?=\/|$)/i;

  // The index is small; a synchronous read keeps every later lookup synchronous.
  let index = { loose: [], packed: {}, rewrites: [], screens: [] };
  try {
    const x = new XMLHttpRequest();
    x.open('GET', ROOT + '_mirror/index.json', false);
    x.send();
    if (x.status === 200) index = JSON.parse(x.responseText);
  } catch {}
  const loose = new Set(index.loose);
  const rewrites = index.rewrites.map(([re, dest]) => [new RegExp(re), dest]);

  const exists = (p) => loose.has(p) || Object.prototype.hasOwnProperty.call(index.packed, p);
  // A site path (no leading slash, no query) to the mirrored file that serves it, the way Vercel would.
  function fileFor(p) {
    p = p.replace(/^\/+/, '');
    if (p === '' ) return 'simulations/index.html';
    if (exists(p)) return p;
    const d = p.replace(/\/?$/, '/');
    if (exists(d + 'index.html')) return d + 'index.html';
    if (exists(p + '.html')) return p + '.html';
    for (const [re, dest] of rewrites) {
      const m = ('/' + p).match(re);
      if (!m) continue;
      const f = dest.replace(/\$(\d)/g, (_, i) => m[+i] || '').replace(/^\/+/, '').split('?')[0];
      if (exists(f)) return f;
      if (exists(f.replace(/\/?$/, '/') + 'index.html')) return f.replace(/\/?$/, '/') + 'index.html';
    }
    return null;
  }

  // Where a URL the app asked for lives in the mirror: {path, rest} for our own files, null for elsewhere.
  function locate(u) {
    if (u == null) return null;
    let s = String(u);
    if (/^(data|blob|about|javascript|mailto|tel):/i.test(s)) return null;
    s = s.replace(HOSTS, '');
    let url;
    try { url = new URL(s, document.baseURI); } catch { return null; }
    if (url.origin !== ORIGIN) return null;
    const href = url.origin + url.pathname;
    const path = decodeURIComponent(href.startsWith(ROOT) ? href.slice(ROOT.length) : url.pathname.slice(1));
    return { path, rest: url.search + url.hash, url };
  }

  // ---- packs ----
  const packs = new Map();
  const loadPack = (id) => {
    if (!packs.has(id)) packs.set(id, fetchOrig(ROOT + '_mirror/packs/' + id).then((r) => { if (!r.ok) throw new Error('pack ' + id); return r.arrayBuffer(); }));
    return packs.get(id);
  };
  const blobs = new Map();
  async function packBlob(p) {
    const [id, off, len, type] = index.packed[p];
    const buf = await loadPack(id);
    return new Blob([new Uint8Array(buf, off, len)], { type });
  }
  function packURL(p) {
    if (!blobs.has(p)) blobs.set(p, packBlob(p).then((b) => URL.createObjectURL(b)));
    return blobs.get(p);
  }

  // ---- fetch and XHR ----
  const fetchOrig = window.fetch.bind(window);
  const listeners = new Set();
  const post = (msg) => { try { parent !== window && parent.postMessage({ source: 'aw-mirror', ...msg }, '*'); } catch {} };
  window.fetch = async function (input, init) {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    const loc = locate(raw);
    if (!loc) return fetchOrig(input, init);
    const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (/^api\//.test(loc.path)) return api(loc, method, init);
    if (/^r2\//.test(loc.path)) return new Response('{"error":"The model library is not in the mirror"}', { status: 404, headers: { 'content-type': 'application/json' } });
    const f = fileFor(loc.path);
    if (!f) { post({ type: 'missing', path: loc.path }); return new Response('Not in the mirror: ' + loc.path, { status: 404 }); }
    if (index.packed[f]) return new Response(await packBlob(f), { status: 200, headers: { 'content-type': index.packed[f][3] } });
    return fetchOrig(ROOT + f + loc.rest, init && { ...init });
  };

  // The live site's server routes don't exist here. Feedback goes to the mirror's own marks; the rest answer "offline".
  async function api(loc, method, init) {
    const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (loc.path === 'api/feedback' && method === 'POST') {
      let payload = {};
      try { payload = JSON.parse(init?.body || '{}'); } catch {}
      post({ type: 'feedback', payload });
      return json(200, { ok: true, mirror: true });
    }
    if (loc.path.startsWith('api/me')) return json(200, { user: null, mirror: true });
    return json(503, { error: 'Server features are not in the mirror', mirror: true });
  }

  const XO = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, u, ...rest) {
    const loc = locate(u);
    if (loc && !/^(api|r2|_mirror)\//.test(loc.path)) {
      const f = fileFor(loc.path);
      if (f && !index.packed[f]) u = ROOT + f + loc.rest;
      else if (f) console.warn('[mirror] XHR to a packed file is not supported:', f);
    }
    return XO.call(this, method, u, ...rest);
  };

  // ---- src, href, poster on elements, Image(), workers ----
  function mapSync(u) {
    const loc = locate(u);
    if (!loc || /^(api|r2|_mirror)\//.test(loc.path)) return { now: u };
    const f = fileFor(loc.path);
    if (!f) return { now: u };
    if (index.packed[f]) return { later: packURL(f) };
    return { now: ROOT + f + loc.rest };
  }
  const MARK = Symbol('aw');
  function patchProp(proto, prop) {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    if (!d || !d.set) return;
    Object.defineProperty(proto, prop, {
      ...d,
      set(v) {
        const m = mapSync(v);
        if (m.later) { const el = this; el[MARK] = v; m.later.then((b) => { if (el[MARK] === v) d.set.call(el, b); }); return; }
        d.set.call(this, m.now);
      },
    });
  }
  for (const C of [window.HTMLImageElement, window.HTMLSourceElement, window.HTMLMediaElement, window.HTMLScriptElement, window.HTMLIFrameElement, window.HTMLInputElement]) if (C) patchProp(C.prototype, 'src');
  if (window.HTMLVideoElement) patchProp(HTMLVideoElement.prototype, 'poster');
  patchProp(HTMLLinkElement.prototype, 'href');
  const SA = Element.prototype.setAttribute;
  const ATTRS = /^(src|poster)$/i;
  Element.prototype.setAttribute = function (name, value) {
    if (ATTRS.test(name) || (name.toLowerCase() === 'href' && this instanceof HTMLLinkElement)) {
      const m = mapSync(value);
      if (m.later) { const el = this; el[MARK] = value; m.later.then((b) => { if (el[MARK] === value) SA.call(el, name, b); }); return; }
      return SA.call(this, name, m.now);
    }
    return SA.call(this, name, value);
  };
  // Elements parsed from HTML (including innerHTML) never pass through the setters above.
  function fix(el) {
    if (el.nodeType !== 1) return;
    for (const a of ['src', 'poster']) {
      const v = el.getAttribute(a);
      if (!v || el[MARK] === v || /^(blob|data):/.test(v)) continue;
      const m = mapSync(v);
      if (m.later) { el[MARK] = v; m.later.then((b) => { if (el.getAttribute(a) === v) SA.call(el, a, b); }); }
      else if (m.now !== v && locate(v)) { el[MARK] = v; SA.call(el, a, m.now); }
    }
    const st = el.getAttribute('style');
    if (st && /url\(/.test(st) && !el[MARK + 's']) {
      el[MARK + 's'] = 1;
      st.replace(/url\((['"]?)([^'")]+)\1\)/g, (all, q, u) => {
        const m = mapSync(u);
        if (m.later) m.later.then((b) => el.setAttribute('style', el.getAttribute('style').split(u).join(b)));
        else if (m.now !== u) el.setAttribute('style', el.getAttribute('style').split(u).join(m.now));
        return all;
      });
    }
  }
  new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === 'attributes') fix(r.target);
      else for (const n of r.addedNodes) { if (n.nodeType !== 1) continue; fix(n); n.querySelectorAll?.('[src],[poster],[style*="url("]').forEach(fix); }
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'poster', 'style'] });

  const W = window.Worker;
  if (W) window.Worker = class extends W { constructor(u, o) { super(mapSync(u instanceof URL ? u.href : u).now, o); } };

  // ---- links between screens ----
  function routeHref(href) {
    const loc = locate(href);
    if (!loc) return null;
    const f = fileFor(loc.path);
    if (!f || !f.endsWith('.html')) return null;
    // Clean routes that carry an id in the path (/models/cow) keep it as ?id= for the file that serves them.
    let rest = loc.rest;
    const seg = loc.path.replace(/\/+$/, '').split('/');
    if (f === 'models/model.html' && seg[0] === 'models' && seg[1]) rest = (rest.includes('?') ? rest.replace('?', '?id=' + encodeURIComponent(seg[1]) + '&') : '?id=' + encodeURIComponent(seg[1]) + rest);
    return ROOT + f + rest;
  }
  addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || e.defaultPrevented || a.target === '_blank' && !HOSTS.test(a.getAttribute('href'))) return;
    const raw = a.getAttribute('href');
    if (raw.startsWith('#')) return;
    const to = routeHref(raw);
    if (to) { e.preventDefault(); location.href = to; return; }
    const loc = locate(raw);
    if (loc) { e.preventDefault(); post({ type: 'missing', path: loc.path }); }
  }, true);

  // ---- capture for marks: keep WebGL frames readable, and stand in for the live site's view bridge ----
  const GC = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    if (/webgl/.test(type)) opts = { ...(opts || {}), preserveDrawingBuffer: true };
    return GC.call(this, type, opts);
  };
  const providers = new Map();
  window.RanchView = {
    register(name, read, prepareCapture) { providers.set(name, { read, prepareCapture }); },
    changed() {},
    actionTarget() { return { origin: ORIGIN, slug: location.pathname, enabled: false }; },
    snapshot: () => capture().then((c) => c.image),
  };
  function context() {
    const out = {};
    for (const [name, p] of providers) { try { out[name] = p.read?.(); } catch { out[name] = { error: 'unavailable' }; } }
    try { return JSON.parse(JSON.stringify(out, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v))); } catch { return {}; }
  }
  function cameraOf(ctx) {
    for (const v of Object.values(ctx)) if (v && Array.isArray(v.camera)) return v.camera;
    for (const v of Object.values(ctx)) if (v && v.camera) return v.camera;
    return null;
  }
  // What is under a point: the topmost element's own words, or what the 3D view has selected.
  function under(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (el.tagName === 'CANVAS' || el.closest('model-viewer')) {
      const sel = document.querySelector('#inspection:not([hidden]) #inspect-name')?.textContent?.trim();
      return { kind: '3d view', selected: sel || null, id: el.id || null };
    }
    const label = (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
    const path = [];
    for (let n = el; n && n !== document.body && path.length < 5; n = n.parentElement) path.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : n.classList[0] ? '.' + n.classList[0] : ''));
    return { kind: 'element', label, path: path.join(' > ') };
  }
  let h2c = null;
  const loadH2C = () => h2c || (h2c = new Promise((ok, bad) => {
    const s = document.createElement('script');
    s.src = ROOT + 'vendor/html2canvas-pro.min.js';
    s.onload = () => ok(window.html2canvas);
    s.onerror = bad;
    document.head.append(s);
  }));
  async function capture() {
    for (const p of providers.values()) { try { p.prepareCapture?.(); } catch {} }
    const w = innerWidth, h = innerHeight, scale = Math.min(devicePixelRatio || 1, 1600 / Math.max(w, h));
    const out = document.createElement('canvas');
    out.width = Math.round(w * scale); out.height = Math.round(h * scale);
    const g = out.getContext('2d');
    g.fillStyle = getComputedStyle(document.body).backgroundColor || '#000';
    g.fillRect(0, 0, out.width, out.height);
    const canvases = [...document.querySelectorAll('canvas')].filter((c) => c.width && c.offsetParent !== null);
    const big = canvases.some((c) => { const r = c.getBoundingClientRect(); return r.width * r.height > w * h * 0.4; });
    let used = false;
    if (!big) {
      try {
        const H = await Promise.race([loadH2C(), new Promise((_, b) => setTimeout(b, 4000))]);
        const shot = await Promise.race([H(document.body, { scale, x: scrollX, y: scrollY, width: w, height: h, useCORS: true, logging: false }), new Promise((_, b) => setTimeout(b, 12000))]);
        g.drawImage(shot, 0, 0, out.width, out.height);
        used = true;
      } catch {}
    }
    if (!used) for (const c of canvases) { const r = c.getBoundingClientRect(); try { g.drawImage(c, r.left * scale, r.top * scale, r.width * scale, r.height * scale); } catch {} }
    const ctx = context();
    return { image: out.toDataURL('image/jpeg', 0.82), width: out.width, height: out.height, context: ctx, camera: cameraOf(ctx), title: document.title, path: location.pathname.slice(ROOT.length - ORIGIN.length) || location.pathname, search: location.search };
  }

  window.__awMirror = { ROOT, fileFor, locate, capture, under, context, build: index.build || null };
  post({ type: 'page', file: (location.origin + location.pathname).startsWith(ROOT) ? (location.origin + location.pathname).slice(ROOT.length) : location.pathname, title: document.title });
  addEventListener('load', () => post({ type: 'page', file: (location.origin + location.pathname).startsWith(ROOT) ? (location.origin + location.pathname).slice(ROOT.length) : location.pathname, title: document.title }));
})();
