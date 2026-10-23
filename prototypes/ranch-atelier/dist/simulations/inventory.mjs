// Abbie's pocket: the player inventory (Evan, 2026-10-23: "you need to add player inventory ... I think inventory goes
// in the top bubble widget 1st class"). Design card in docs/design/briefs/inventory.md.
//
//   import {inventory} from '/simulations/inventory.mjs';
//   inventory().add({id, name, icon, from, thought})  -> the item, or false if it is already in the pocket
//     icon     an image url or one emoji
//     thought  Abbie's inner voice on picking it up ("Interesting... this key will come in handy."): shown as a small
//              thought and spoken in the small-girl voice (unless sound is off), then the item drops into the pocket
//   inventory().has(id), .remove(id), .list(), .on(fn) -> unsubscribe
//
// Kept on this device in localStorage 'aw-inventory'; every change fires window event 'aw-inventory-change'.
// Presentation layer: the pocket hangs on the chronograph (#v2-chrono) when the page has one, else it floats top left.
// It shows only once Abbie carries something (until then the world just behaves). The voice controller and directors
// read what she carries through the 'abbie' information manifest, never from the DOM.
const KEY = 'aw-inventory', EVENT = 'aw-inventory-change';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} dispatchEvent(new CustomEvent(EVENT, {detail: list})); };
const isUrl = icon => /^(\/|https?:|data:|\.)/.test(String(icon || ''));
const iconHtml = (icon, cls = '') => isUrl(icon) ? `<img class="${cls}" src="${esc(icon)}" alt="">` : `<span class="${cls}">${esc(icon || '✦')}</span>`;

let api = null;
export function inventory() {
  if (api) return api;
  api = {
    list: read,
    has: id => read().some(i => i.id === id),
    add({id, name = '', icon = '', from = '', thought = ''} = {}) {
      if (!id || api.has(id)) return false;
      const item = {id: String(id), name: String(name || id), icon: String(icon || ''), from: String(from || ''), at: Date.now()};
      write([...read(), item]);
      if (thought) pickUp(item, thought); else drawPocket(true);
      return item;
    },
    remove(id) { const list = read(), next = list.filter(i => i.id !== id); if (next.length !== list.length) write(next); return next.length !== list.length; },
    on(fn) { const h = () => fn(read()); addEventListener(EVENT, h); return () => removeEventListener(EVENT, h); }
  };
  window.AbbieInventory = api;
  addEventListener('storage', e => { if (e.key === KEY) dispatchEvent(new CustomEvent(EVENT, {detail: read()})); });
  addEventListener(EVENT, () => drawPocket());
  import('./presentation-layer.mjs').then(({volunteer}) => volunteer('abbie', {place: 'anywhere', dialect: 'her own pocket', items: [
    {id: 'pocket', says: 'what Abbie carries', kind: 'list', who: 'player', for: ['player', 'director'], read: () => read().map(i => i.name), relevant: () => read().length > 0,
     prefer: ['meta', 'overlay'], ways: {meta: 'her inner voice when she picks something up', overlay: 'the pocket on the chronograph'}}]})).catch(() => {});
  const ready = () => { style(); drawPocket(); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ready) : ready();
  return api;
}

// ---------- the pocket ----------
let pocket = null, pop = null;
const BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9h14l-1.2 10.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="color-mix(in srgb,var(--v2-accent,#b64932) 28%,transparent)"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/><path d="M9.5 13.5h5"/></svg>';
function mountPocket() {
  if (pocket?.isConnected) return pocket;
  pocket = document.createElement('button');
  pocket.type = 'button'; pocket.className = 'aw-pocket v2-glass ch-reg'; pocket.hidden = true;
  pocket.setAttribute('aria-label', "Abbie's pocket");
  pocket.onclick = e => { e.stopPropagation(); pop && !pop.hidden ? closePop() : openPop(); };
  const chrono = document.getElementById('v2-chrono');
  const pushers = chrono?.querySelector('.ch-pushers');
  if (pushers) pushers.before(pocket);
  else if (chrono) chrono.append(pocket);
  else { pocket.classList.add('aw-pocket-float'); document.body.append(pocket); }
  return pocket;
}
function drawPocket(bump = false) {
  if (!document.body) return;
  if (!document.getElementById('v2-chrono') && document.documentElement.classList.contains('ui-v2') && !pocket) { setTimeout(() => drawPocket(bump), 300); return; }
  const list = read(), p = mountPocket();
  p.hidden = !list.length;
  p.innerHTML = `<span class="ch-g">${BAG}</span>${list.length > 1 ? `<span class="aw-pocket-n">${list.length}</span>` : ''}`;
  p.title = list.length ? "Abbie's pocket: " + list.map(i => i.name).join(', ') : "Abbie's pocket";
  if (bump) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  if (pop && !pop.hidden) openPop();
}
function openPop() {
  const list = read(), r = pocket.getBoundingClientRect();
  pop ??= Object.assign(document.createElement('div'), {className: 'aw-pocket-pop v2-glass'});
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', "Abbie's pocket");
  pop.innerHTML = `<strong>In my pocket</strong>${list.length ? `<ul>${list.map(i => `<li>${iconHtml(i.icon, 'ic')}<b>${esc(i.name)}</b></li>`).join('')}</ul>` : '<p>Nothing yet.</p>'}`;
  document.body.append(pop); pop.hidden = false;
  pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left + r.width / 2 - pop.offsetWidth / 2)) + 'px';
  pop.style.top = (r.bottom + 10) + 'px';
}
function closePop() { if (pop) pop.hidden = true; }
addEventListener('pointerdown', e => { if (pop && !pop.hidden && !e.target.closest?.('.aw-pocket,.aw-pocket-pop')) closePop(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

// ---------- picking something up: her inner voice, then into the pocket ----------
function pickUp(item, thought) {
  const p = mountPocket(), chrono = document.getElementById('v2-chrono');
  p.hidden = false; chrono?.classList.add('open');
  const r = p.getBoundingClientRect();
  const bubble = Object.assign(document.createElement('div'), {className: 'aw-thought'});
  bubble.setAttribute('role', 'status');
  bubble.innerHTML = `${iconHtml(item.icon, 'ic')}<span>${esc(thought)}</span><i></i><i></i>`;
  document.body.append(bubble);
  bubble.style.left = Math.max(10, Math.min(innerWidth - bubble.offsetWidth - 10, r.left - 12)) + 'px';
  bubble.style.top = (r.bottom + 18) + 'px';
  void bubble.offsetWidth; bubble.classList.add('in');
  const ms = speak(thought) ? Math.max(2600, thought.length * 70) : Math.max(2400, thought.length * 55);
  setTimeout(() => {
    // The item drops from the thought into the pocket.
    const ic = bubble.querySelector('.ic'), a = ic.getBoundingClientRect(), b = p.getBoundingClientRect();
    const fly = ic.cloneNode(true); fly.className = 'aw-fly';
    Object.assign(fly.style, {left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px'});
    document.body.append(fly);
    fly.animate([{transform: 'none', opacity: 1}, {transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.4)`, opacity: .9}],
      {duration: 520, easing: 'cubic-bezier(.5,-0.3,.7,1)'}).onfinish = () => { fly.remove(); drawPocket(true); };
    bubble.classList.add('out'); setTimeout(() => bubble.remove(), 300);
  }, ms);
}
// The small girl's voice in her head: a light, higher voice; quiet when sound is off.
function speak(text) {
  const prefs = window.AWLook?.state?.prefs || {};
  if (prefs.mute || !('speechSynthesis' in window)) return false;
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/\.\.\./g, '…'));
    const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    u.voice = voices.find(v => /child|girl|kid/i.test(v.name)) || voices.find(v => /samantha|karen|moira|tessa|fiona|victoria|female|zira|aria|jenny/i.test(v.name)) || voices[0] || null;
    u.pitch = 1.7; u.rate = 1.02; u.volume = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

function style() {
  if (document.getElementById('aw-pocket-css')) return;
  const s = document.createElement('style'); s.id = 'aw-pocket-css';
  s.textContent = `
  .aw-pocket{position:relative;border:0;padding:0;cursor:pointer;color:var(--v2-ink,#2b1d0e)}
  .aw-pocket[hidden]{display:none!important}
  .aw-pocket .ch-g svg{width:20px;height:20px}
  .aw-pocket-float{position:fixed;z-index:40;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 12px);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
    background:linear-gradient(160deg,#ffffff70,transparent 46%),color-mix(in srgb,var(--app-paper,#fffcf0) 34%,transparent);-webkit-backdrop-filter:blur(7px) saturate(1.9);backdrop-filter:blur(7px) saturate(1.9);border:1px solid #ffffffd0;box-shadow:inset 0 1px 0 #fffffff2,0 12px 26px -6px #0c203047}
  .aw-pocket-n{position:absolute;right:-4px;bottom:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--v2-accent,#b64932);color:#fff;font:800 10px/16px var(--app-font,system-ui);text-align:center;box-shadow:0 0 0 1.5px #fff}
  .aw-pocket.bump{animation:aw-bump .5s cubic-bezier(.3,1.6,.5,1)}
  @keyframes aw-bump{40%{transform:scale(1.25)}}
  .aw-pocket-pop{position:fixed;z-index:70;min-width:180px;max-width:min(300px,calc(100vw - 16px));padding:10px 12px;border-radius:20px;font:13px/1.3 var(--app-font,system-ui);color:var(--v2-ink,#2b1d0e);
    background:linear-gradient(160deg,#ffffffa0,transparent 46%),color-mix(in srgb,var(--app-paper,#fffcf0) 80%,transparent);-webkit-backdrop-filter:blur(7px) saturate(1.9);backdrop-filter:blur(7px) saturate(1.9);border:1px solid #ffffffd0;box-shadow:inset 0 1px 0 #fff,0 14px 30px -8px #0c203055}
  .aw-pocket-pop[hidden]{display:none}
  .aw-pocket-pop strong{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:6px}
  .aw-pocket-pop ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(68px,1fr));gap:8px}
  .aw-pocket-pop li{display:grid;justify-items:center;gap:4px;text-align:center}
  .aw-pocket-pop .ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:26px;object-fit:contain;background:#ffffff80;box-shadow:inset 0 1px 0 #fff,0 1px 3px #0002}
  .aw-pocket-pop b{font-weight:600;font-size:12px}
  .aw-pocket-pop p{margin:0;opacity:.7}
  .aw-thought{position:fixed;z-index:70;display:flex;align-items:center;gap:10px;max-width:min(320px,calc(100vw - 20px));padding:10px 14px 10px 10px;border-radius:22px;
    background:linear-gradient(160deg,#ffffffd0,#ffffff90);color:#3a2a4a;font:italic 600 14px/1.3 var(--app-font,system-ui);box-shadow:0 10px 26px -8px #2a103055,inset 0 1px 0 #fff;
    pointer-events:none;transition:opacity .25s}
  .aw-thought.in{animation:aw-think .3s cubic-bezier(.3,1.4,.5,1)}
  .aw-thought.out{opacity:0}
  @keyframes aw-think{from{transform:translateY(-8px) scale(.94)}}
  .aw-thought .ic{flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:22px;font-style:normal;object-fit:contain}
  .aw-thought i{position:absolute;border-radius:50%;background:#ffffffc8;box-shadow:0 2px 6px #2a103030}
  .aw-thought i:nth-of-type(1){width:12px;height:12px;left:22px;top:-12px}
  .aw-thought i:nth-of-type(2){width:7px;height:7px;left:16px;top:-21px}
  .aw-fly{position:fixed;z-index:71;display:grid;place-items:center;font-size:22px;pointer-events:none;object-fit:contain}
  html.aw-reduce-motion .aw-pocket.bump{animation:none}
  @media(max-width:520px){#v2-chrono:not(.open) .aw-pocket:not([hidden]){display:grid!important}}`;
  document.head.append(s);
}
