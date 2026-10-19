(() => {
  'use strict';
  if (window.RanchView) return;
  const storageKey = 'ranch-view-pair-v1';
  let key, sessionId, paused = false;
  try {
    const fragment = new URLSearchParams(location.hash.slice(1));
    const pair = fragment.get('ranch-pair');
    if (pair && /^[a-f0-9]{64}$/.test(pair)) {
      localStorage.setItem(storageKey, pair);
      fragment.delete('ranch-pair');
      history.replaceState(null, '', location.pathname + location.search + (fragment.size ? '#' + fragment : ''));
      localStorage.removeItem('ranch-view-paused');
    }
    key = localStorage.getItem(storageKey);
    paused = localStorage.getItem('ranch-view-paused') === 'true';
    sessionId = sessionStorage.getItem('ranch-view-tab') || crypto.randomUUID();
    sessionStorage.setItem('ranch-view-tab', sessionId);
  } catch { return; }
  const providers = new Map();
  let dirty = true, busy = false, forcePending = false, lastSent = 0, lastActiveAt = Date.now(), lastAction = null, captureError = null;
  let lastImage = null, imageCapturedAt = null;
  const errors = [];
  window.RanchView = { register(name, read, prepareCapture) { providers.set(name, { read, prepareCapture }); dirty = true; }, changed() { dirty = true; } };
  if (!key) return;
  const badge = document.createElement('button');
  badge.id = 'ranch-view-sharing';
  badge.setAttribute('data-html2canvas-ignore', 'true');
  badge.style.cssText = 'position:fixed;right:12px;top:max(12px,env(safe-area-inset-top));z-index:10000;font:11px system-ui;padding:8px 10px;min-height:44px;border:1px solid #a7b59b;border-radius:22px;background:#fcf8ed;color:#354c3c;max-width:140px;cursor:pointer';
  function status(text) { badge.textContent = text; badge.setAttribute('aria-label', paused ? 'Resume sharing this app view with chat' : text + '. Pause sharing this app view with chat'); }
  status(paused ? 'View sharing paused' : 'Connecting to chat…');
  document.body.append(badge);
  const visible = el => {
    if (el.closest('[hidden],[inert],[data-context-private],#ranch-view-sharing') || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
    const closed = el.closest('details:not([open])');
    if (closed && !closed.querySelector(':scope > summary')?.contains(el)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  const label = el => (el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.innerText || el.id || el.name || el.tagName).trim().slice(0, 180);
  function snapshot() {
    if (paused) return { version: 1, sessionId, slug: '/', title: 'View sharing paused', viewport: {}, sharing: false, lastActiveAt, image: null, imageCapturedAt: null, capturedAt: new Date().toISOString() };
    const context = {};
    for (const [name, provider] of providers) { try { context[name] = provider.read(); } catch { context[name] = { error: 'Provider unavailable' }; } }
    const controls = [...document.querySelectorAll('input,select,textarea,button,[role="button"],[aria-selected],[aria-pressed]')].filter(visible).slice(0, 100).map(el => {
      const item = { id: el.id || null, label: label(el), type: el.type || el.getAttribute('role') || el.tagName.toLowerCase(), disabled: !!el.disabled };
      if (el.matches('select,input[type="range"],input[type="number"],input[type="checkbox"],input[type="radio"]')) item.value = /checkbox|radio/.test(el.type) ? el.checked : el.value;
      if (el.matches('select')) item.selectedLabel = el.selectedOptions[0]?.textContent;
      if (el.matches('#feedback,#review-note')) item.value = el.value.slice(0, 3000);
      if (el.hasAttribute('aria-pressed')) item.pressed = el.getAttribute('aria-pressed');
      if (el.hasAttribute('aria-selected')) item.selected = el.getAttribute('aria-selected');
      return item;
    });
    const params = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => ['study','seed','grown','subject','bays','pitch','wear'].includes(k)));
    return { version: 1, sessionId, slug: location.pathname, params, title: document.title, capturedAt: new Date().toISOString(), lastActiveAt,
      visibility: document.visibilityState, focused: document.hasFocus(), sharing: !paused,
      viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio, scrollX, scrollY },
      headings: [...document.querySelectorAll('h1,h2,[role="status"],#scene-status,#scene-title')].filter(visible).map(el => el.innerText.slice(0, 400)),
      panels: [...document.querySelectorAll('details[open],[role="dialog"]')].filter(visible).map(label),
      controls, context, lastAction, errors: errors.slice(-5), image: lastImage, imageCapturedAt, captureError };
  }
  let captureLibrary;
  async function capture() {
    captureLibrary ||= new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = '/vendor/html2canvas.min.js'; script.onload = resolve; script.onerror = reject; document.head.append(script);
    }).catch(error => { captureLibrary = null; throw error; });
    await captureLibrary;
    for (const p of providers.values()) p.prepareCapture?.();
    const canvas = await html2canvas(document.documentElement, { logging: false, useCORS: true, width: innerWidth, height: innerHeight, x: scrollX, y: scrollY, windowWidth: innerWidth, windowHeight: innerHeight, scale: Math.min(1, 1200 / innerWidth),
      onclone: doc => { for (const details of doc.querySelectorAll('details:not([open])')) for (const child of details.children) if (child.tagName !== 'SUMMARY') child.style.display = 'none'; },
      ignoreElements: el => el.matches?.('input[type="password"],input[type="email"],input[type="tel"],input[type="text"],textarea:not(#feedback):not(#review-note),[contenteditable="true"],[data-context-private],#ranch-view-sharing') });
    lastImage = canvas.toDataURL('image/jpeg', 0.75);
    if (lastImage.length > 1500000) lastImage = canvas.toDataURL('image/jpeg', 0.4);
    imageCapturedAt = new Date().toISOString(); captureError = null;
  }
  async function send(force = false) {
    if (busy) { forcePending ||= force; return; }
    if ((!force && (paused || document.hidden)) || (!force && Date.now() - lastSent < 5000)) return;
    if (!dirty && Date.now() - lastSent < 30000) return;
    busy = true;
    const changed = dirty; dirty = false;
    try {
      if (changed && !paused && !document.hidden) { try { await capture(); } catch { captureError = 'Image capture failed; structured context remains available'; lastImage = null; imageCapturedAt = null; } }
      const response = await fetch('/api/view-context', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(snapshot()), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Connection ' + response.status);
      lastSent = Date.now(); status(paused ? 'View sharing paused' : captureError ? 'Chat connected · text only' : 'View shared with chat');
    } catch { dirty = true; lastSent = Date.now(); status('Chat connection interrupted'); }
    finally { busy = false; if (forcePending) { forcePending = false; dirty = true; send(true); } }
  }
  badge.onclick = () => { paused = !paused; localStorage.setItem('ranch-view-paused', String(paused)); dirty = true; status(paused ? 'View sharing paused' : 'Connecting to chat…'); if (paused) { lastImage = null; imageCapturedAt = null; } send(true); };
  const activity = e => {
    if (e.target?.closest?.('#ranch-view-sharing')) return;
    if (e.isTrusted) lastActiveAt = Date.now();
    dirty = true;
    if (e.type === 'click') { const el = e.target.closest?.('button,a,[role="button"],canvas,svg'); if (el && visible(el)) lastAction = { label: label(el), at: new Date().toISOString() }; }
  };
  for (const event of ['click','input','change','pointerup','wheel','scroll','keydown']) document.addEventListener(event, activity, { capture: true, passive: true });
  window.addEventListener('focus', () => { lastActiveAt = Date.now(); dirty = true; send(); });
  window.addEventListener('resize', () => { dirty = true; });
  document.addEventListener('visibilitychange', () => { dirty = true; send(true); });
  window.addEventListener('storage', e => { if (e.key === 'ranch-view-paused') { paused = e.newValue === 'true'; dirty = true; if (paused) { lastImage = null; imageCapturedAt = null; } send(true); } });
  window.addEventListener('error', e => { errors.push({ message: String(e.message).slice(0, 300), at: new Date().toISOString() }); dirty = true; });
  window.addEventListener('unhandledrejection', () => { errors.push({ message: 'Unhandled application promise rejection', at: new Date().toISOString() }); dirty = true; });
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('left-navigation');
    if (nav) {
      badge.style.cssText = 'position:static;flex-shrink:0;font:12px system-ui;padding:8px 10px;min-height:44px;border:1px solid #a7b59b;border-radius:12px;background:#fcf8ed;color:#354c3c;width:100%;cursor:pointer';
      nav.insertBefore(badge, document.getElementById('nav-settings'));
    }
    const main = document.querySelector('main');
    if (main) new MutationObserver(() => { dirty = true; }).observe(main, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden','open','aria-pressed','aria-selected','viewBox','class'] });
  });
  setInterval(send, 2000);
  setTimeout(() => send(true), 1500);
})();
