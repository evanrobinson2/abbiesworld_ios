// Phone loop for Evan (see FEEDBACK.md):
// 1. Home-screen install: manifest and icon tags on every page.
// 2. "New version ready" card: watches /view-build.json and shows the newest whats-new.json entry, picture first.
// 3. Feedback button: a picture of the current view plus a note, posted to /api/feedback for the thread that made the change.
(() => {
  'use strict';
  if (window.AppFeedback || typeof document === 'undefined') return;
  if (!document.querySelector('script[src^="/version-chip.js"]')) document.head.append(Object.assign(document.createElement('script'), { src: '/version-chip.js?v=2', defer: true }));
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };
  const getJSON = url => fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  const el = (tag, attrs = {}, ...children) => { const node = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'text') node.textContent = v; else if (k.startsWith('on')) node.addEventListener(k.slice(2), v); else node.setAttribute(k, v); } node.append(...children); return node; };

  // 1. Install tags, added only where a page has none of its own.
  const head = document.head;
  const tag = (selector, make) => { if (!head.querySelector(selector)) head.append(make()); };
  tag('link[rel="manifest"]', () => el('link', { rel: 'manifest', href: '/manifest.webmanifest' }));
  tag('link[rel="apple-touch-icon"]', () => el('link', { rel: 'apple-touch-icon', href: '/icons/app-180.png' }));
  tag('meta[name="apple-mobile-web-app-capable"]', () => el('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }));
  tag('meta[name="mobile-web-app-capable"]', () => el('meta', { name: 'mobile-web-app-capable', content: 'yes' }));
  tag('meta[name="apple-mobile-web-app-title"]', () => el('meta', { name: 'apple-mobile-web-app-title', content: "Abbie's Ranch" }));

  const css = `
  .afb-card,.afb-sheet{position:fixed;z-index:10020;left:50%;transform:translateX(-50%);width:min(92vw,420px);background:var(--app-paper,#fffcf0);color:var(--app-ink,#4c4330);border:1px solid var(--app-border,#ded5b2);border-radius:22px;box-shadow:0 18px 48px #2b281f40;font-family:var(--app-font,system-ui,sans-serif);overflow:hidden}
  .afb-card{top:max(14px,env(safe-area-inset-top));animation:afb-in .35s cubic-bezier(.2,.9,.3,1.2)}
  .afb-sheet{bottom:max(14px,env(safe-area-inset-bottom));animation:afb-up .3s cubic-bezier(.2,.9,.3,1.1)}
  @keyframes afb-in{from{opacity:0;transform:translate(-50%,-24px)}}
  @keyframes afb-up{from{opacity:0;transform:translate(-50%,24px)}}
  .afb-pic{display:block;width:100%;max-height:34vh;object-fit:cover;background:#e9e3cf}
  .afb-body{padding:14px 16px 16px}
  .afb-kicker{font-size:11px;font-weight:800;letter-spacing:.12em;color:var(--app-accent,#b64932);text-transform:uppercase}
  .afb-title{font-family:var(--app-heading,Georgia,serif);font-size:19px;font-weight:700;margin:3px 0 4px;line-height:1.2}
  .afb-line{font-size:14px;line-height:1.4;color:var(--app-muted,#797058);margin:0}
  .afb-row{display:flex;gap:10px;margin-top:14px;align-items:center}
  .afb-row .afb-more{flex:1;font-size:12px;color:var(--app-muted,#797058)}
  .afb-btn{min-height:44px;padding:0 18px;border-radius:14px;border:1px solid var(--app-border,#ded5b2);background:transparent;color:inherit;font:700 15px var(--app-font,system-ui,sans-serif);cursor:pointer}
  .afb-btn.primary{background:var(--app-accent,#b64932);border-color:transparent;color:#fff}
  .afb-btn[disabled]{opacity:.55}
  .afb-fab{position:fixed;z-index:10010;left:12px;bottom:calc(env(safe-area-inset-bottom) + 124px);width:44px;height:44px;border-radius:50%;border:1px solid var(--app-border,#ded5b2);background:color-mix(in srgb,var(--app-paper,#fffcf0) 88%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 18px #2b281f2e;display:grid;place-items:center;color:var(--app-ink,#4c4330);cursor:pointer;padding:0}
  .afb-fab svg{width:24px;height:24px}
  .afb-shot-wait{padding:22px 16px;text-align:center;font-size:13px;color:#e9e3cf;background:#2b281f}
  .afb-shot{display:block;width:100%;max-height:30vh;object-fit:contain;background:#2b281f}
  .afb-note{width:100%;box-sizing:border-box;min-height:84px;margin-top:8px;padding:10px 12px;border-radius:14px;border:1px solid var(--app-border,#ded5b2);background:#fff;color:inherit;font:16px/1.4 var(--app-font,system-ui,sans-serif);resize:vertical}
  .afb-to{font-size:12px;color:var(--app-muted,#797058);margin-top:6px}
  .afb-toast{position:fixed;z-index:10030;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 24px);background:var(--app-ink,#4c4330);color:#fff;padding:12px 18px;border-radius:16px;font:700 14px var(--app-font,system-ui,sans-serif);box-shadow:0 10px 30px #0004}
  .afb-new{position:absolute;z-index:2;top:22px;left:-42px;width:170px;transform:rotate(-45deg);background:var(--app-accent,#b64932);color:#fff;text-align:center;font:900 17px/1 var(--app-font,system-ui,sans-serif);letter-spacing:.18em;padding:8px 0;box-shadow:0 4px 12px #2b281f55;pointer-events:none;animation:afb-pop .5s .25s cubic-bezier(.2,.9,.3,1.4) both}
  @keyframes afb-pop{from{opacity:0;transform:rotate(-45deg) scale(.4)}}
  @media (prefers-reduced-motion:reduce){.afb-card,.afb-sheet,.afb-new{animation:none}}`;
  head.append(el('style', { 'data-feedback-ui': '' }, css));

  // 2. New version watcher.
  let loadedBuild = null, release = null, notes = [], card = null, dismissedBuild = null, lastCheck = 0;
  const seen = new Set(JSON.parse(store.get('afb-seen') || '[]'));
  const markSeen = ids => { ids.forEach(id => seen.add(id)); store.set('afb-seen', JSON.stringify([...seen].slice(-200))); };
  const loadNotes = async () => { const data = await getJSON('/whats-new.json'); notes = Array.isArray(data?.entries) ? data.entries : []; return notes; };
  const unseen = () => notes.filter(n => n && n.id && !seen.has(n.id));
  const releaseLine = r => {
    const msg = String(r?.message || '');
    const lines = msg.split('\n').map(s => s.trim()).filter(Boolean);
    return (/^Merge pull request/.test(lines[0] || '') ? lines[1] : lines[0]) || '';
  };

  function showCard({ kicker, entry, extra, fallback, primary, onPrimary, onClose }) {
    card?.remove();
    const body = el('div', { class: 'afb-body' },
      el('div', { class: 'afb-kicker', text: kicker }),
      el('div', { class: 'afb-title', text: entry?.title || fallback || 'A new version is ready' }),
      el('p', { class: 'afb-line', text: entry?.line || (entry ? '' : 'Tap Reload to get it.') }),
      el('div', { class: 'afb-row' },
        el('span', { class: 'afb-more', text: extra > 0 ? `+${extra} more change${extra > 1 ? 's' : ''}` : '' }),
        el('button', { class: 'afb-btn', type: 'button', text: primary ? 'Later' : 'Close', onclick: () => { card?.remove(); card = null; onClose?.(); } }),
        ...(primary ? [el('button', { class: 'afb-btn primary', type: 'button', text: primary, onclick: onPrimary })] : [])));
    card = el('section', { class: 'afb-card', role: 'status', 'aria-live': 'polite', 'data-feedback-ui': '' });
    // A NEW sash across the corner (Evan, 2026-10-23 04:47Z: "put a NEW banner!!").
    card.append(el('div', { class: 'afb-new', 'aria-hidden': 'true', text: 'NEW' }));
    if (entry?.image) card.append(el('img', { class: 'afb-pic', src: entry.image, alt: entry.title || 'What changed' }));
    card.append(body);
    document.body.append(card);
  }

  async function check(force = false) {
    if (document.hidden || !loadedBuild || (!force && Date.now() - lastCheck < 20000)) return;
    lastCheck = Date.now();
    const remote = (await getJSON('/view-build.json'))?.buildId;
    if (!remote || remote === loadedBuild || remote === dismissedBuild) return;
    const [fresh, rel] = await Promise.all([loadNotes(), getJSON('/app-release.json')]);
    const list = fresh.filter(n => n && n.id && !seen.has(n.id));
    showCard({
      kicker: 'New version ready', entry: list[0], extra: list.length - 1, fallback: releaseLine(rel) || 'A new version is ready',
      primary: 'Reload',
      onPrimary: () => { markSeen(list.map(n => n.id)); store.set('afb-build', remote); location.reload(); },
      onClose: () => { dismissedBuild = remote; }
    });
  }

  async function start() {
    const [build, rel] = await Promise.all([getJSON('/view-build.json'), getJSON('/app-release.json'), loadNotes()]);
    loadedBuild = build?.buildId || null; release = rel;
    const previous = store.get('afb-build');
    store.set('afb-build', loadedBuild || '');
    // Arrived on a new version without tapping Reload (a fresh launch): show what changed once.
    const fresh = unseen().filter(n => Date.now() - Date.parse(n.date || 0) < 7 * 86400000);
    if (loadedBuild && previous !== loadedBuild && fresh.length) {
      showCard({ kicker: "What's new", entry: fresh[0], extra: fresh.length - 1, onClose: () => markSeen(unseen().map(n => n.id)) });
    } else markSeen(unseen().map(n => n.id));
    setInterval(check, 60000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(true); });
  window.addEventListener('pageshow', e => { if (e.persisted) check(true); });
  window.addEventListener('focus', () => check());

  // 3. Feedback button.
  const bubble = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.6L4 20l1.3-3.6C4.5 15.3 4 14 4 12.5c0-4 3.6-7 8-7s8 3 8 7Z"/><path d="M9 12.5h.01M12 12.5h.01M15 12.5h.01"/></svg>';
  const fab = el('button', { class: 'afb-fab', type: 'button', 'aria-label': 'Send feedback with a picture of this screen', 'data-feedback-ui': '' });
  fab.innerHTML = bubble;
  let sheet = null;
  const toast = message => { const t = el('div', { class: 'afb-toast', role: 'status', 'data-feedback-ui': '', text: message }); document.body.append(t); setTimeout(() => t.remove(), 2600); };
  const withTimeout = (promise, ms) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(null), ms))]);

  fab.addEventListener('click', () => {
    if (sheet) return;
    card?.remove(); card = null;
    // The sheet opens at once; the picture of the view underneath (sheet and button excluded) fills in when ready.
    let image = null;
    const picture = withTimeout(window.RanchView?.snapshot?.().catch(() => null) || Promise.resolve(null), 30000).then(result => { image = result; return result; });
    const about = notes[0] || null;
    const shot = el('div', { class: 'afb-shot-wait', text: 'Taking a picture of this screen…' });
    const note = el('textarea', { class: 'afb-note', placeholder: 'What should change?', 'aria-label': 'Your note', maxlength: '4000' });
    const send = el('button', { class: 'afb-btn primary', type: 'button', text: 'Send' });
    const close = () => { sheet?.remove(); sheet = null; };
    picture.then(result => {
      if (!sheet) return;
      if (result) shot.replaceWith(el('img', { class: 'afb-shot', src: result, alt: 'Picture of this screen' }));
      else shot.textContent = 'No picture this time; your note still goes.';
    });
    send.addEventListener('click', async () => {
      send.disabled = true; send.textContent = 'Sending…';
      await picture;
      if (!note.value.trim() && !image) { send.disabled = false; send.textContent = 'Send'; note.focus(); return; }
      const payload = {
        note: note.value, image, page: location.pathname + location.search, title: document.title,
        buildId: loadedBuild, sha: release?.sha || '', thread: about?.thread || null, threadTitle: about?.threadTitle || '', entryId: about?.id || '',
        viewport: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, standalone: standalone()
      };
      const ok = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.ok).catch(() => false);
      if (ok) { close(); toast('Sent to Claude'); }
      else { send.disabled = false; send.textContent = 'Try again'; }
    });
    sheet = el('section', { class: 'afb-sheet', role: 'dialog', 'aria-label': 'Send feedback', 'data-feedback-ui': '' });
    sheet.append(shot, el('div', { class: 'afb-body' },
      el('div', { class: 'afb-kicker', text: 'Feedback' }),
      note,
      el('div', { class: 'afb-to', text: about?.threadTitle ? `Goes to Claude, about “${about.threadTitle}”` : 'Goes to Claude' }),
      el('div', { class: 'afb-row' }, el('span', { class: 'afb-more' }), el('button', { class: 'afb-btn', type: 'button', text: 'Cancel', onclick: close }), send)));
    document.body.append(sheet);
    note.focus();
  });

  const mount = () => { document.body.append(fab); start(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
  window.AppFeedback = { check: () => check(true), notes: () => notes, build: () => loadedBuild };
})();
