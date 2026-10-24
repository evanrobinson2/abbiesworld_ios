// Abbie's backpack: the player inventory (Evan, 2026-10-23: "you need to add player inventory ... I think inventory goes
// in the top bubble widget 1st class"; 15:53Z: "player inventories are backpacks, and they are opened fully 'half shell'
// style"). Design card in docs/design/briefs/inventory.md; the backpack itself (ten styles, five facets, quest charms,
// the 3D half-shell view) is /simulations/backpack.mjs, AW-STUDY-0046. One inventory: this file is still the only store.
//
//   import {inventory} from '/simulations/inventory.mjs';
//   inventory().add({id, name, icon, from, thought})  -> the item, or false if it is already in the backpack
//     icon     an image url or one emoji
//     thought  Abbie's inner voice on picking it up ("Interesting... this key will come in handy."): shown as a small
//              thought and spoken in the small-girl voice (unless sound is off), then the item drops into the backpack
//   inventory().has(id), .remove(id), .list(), .on(fn) -> unsubscribe
//
// Using things: tap something in the open backpack and window event 'aw-inventory-use' fires with detail {item}; a
// listener that takes it calls inventory().remove(item.id). The effect pickups (embers, droplets, pet treats, dye
// drops, counted by effect-charge.mjs, picked up while driving) show in the backpack too, and tapping one charges its
// world effect there and then (charge(id), Evan 00:16Z: "charge them up ... by consuming an item in your backpack").
//
// Kept on this device in localStorage 'aw-inventory'; every change fires window event 'aw-inventory-change'.
// Presentation layer: the backpack sits on the left bar (#aw-left-bar, the things she can touch), with her notebook under it.
// It shows only once Abbie carries something or has earned a charm (until then the world just behaves). Tapping it
// opens the backpack in 3D, cleaved into two half shells, with what she carries in both halves and her charms hanging
// from the side; the brush orb turns it to dress-up (styles and facets). The voice controller and directors
// read what she carries through the 'abbie' information manifest, never from the DOM.
import {glyph, look as bagLook, earnedCharms, keychain, newCharms, coinCount, CHARMS, setLook} from './backpack.mjs?v=11';
const KEY = 'aw-inventory', EVENT = 'aw-inventory-change';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const write = list => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} dispatchEvent(new CustomEvent(EVENT, {detail: list})); };
const isUrl = icon => /^(\/|https?:|data:|\.)/.test(String(icon || ''));
// The effect pickups, read from effect-charge.mjs (its store is the one count), shown in the backpack as items.
let EC = null;
const FUEL_ICON = {ember: '🔥', droplet: '💧', treat: '🦴', dye: '🎨'}, FUEL_PLURAL = {ember: 'embers', droplet: 'droplets', treat: 'pet treats', dye: 'dye drops'};
const EFFECT_NAME = {fireball: 'fireball', waterball: 'waterball', 'cats-dogs': 'cats and dogs', 'tie-dye': 'tie-dye'};
const fuelItems = () => !EC ? [] : Object.entries(EC.FUEL).flatMap(([effect, kind]) => { const n = EC.fuel(kind); return n > 0 ? [{id: 'fuel:' + kind, fuel: kind, effect, icon: FUEL_ICON[kind] || '✦',
  about: `Fuel for the ${EFFECT_NAME[effect] || effect} effect. Tap Charge to load it.`, name: (n === 1 ? EC.FUEL_NAME[kind].replace(/^an? /, '').replace(/^./, c => c.toUpperCase()) : `${n} ${FUEL_PLURAL[kind]}`) }] : []; });
const carried = () => [...read(), ...fuelItems()];
function useItem(item) {
  if (item.fuel && EC) {
    const ok = EC.isCharged(item.effect) ? null : EC.charge(item.effect);
    view?.say(ok ? `The ${EFFECT_NAME[item.effect]} is charged!` : ok === null ? `The ${EFFECT_NAME[item.effect]} is already charged.` : 'Nothing to charge.', 2000);
    if (ok) { jingle(); view?.bounce(); }
  }
  dispatchEvent(new CustomEvent('aw-inventory-use', {detail: {item}}));
}
const iconHtml = (icon, cls = '') => isUrl(icon) ? `<img class="${cls}" src="${esc(icon)}" alt="">` : `<span class="${cls}">${esc(icon || '✦')}</span>`;

let api = null;
export function inventory() {
  if (api) return api;
  // One backpack per page, whichever version of this file a page imported first.
  if (window.AbbieInventory) return api = window.AbbieInventory;
  api = {
    list: read,
    has: id => read().some(i => i.id === id),
    add({id, name = '', icon = '', from = '', thought = '', about = ''} = {}) {
      if (!id || api.has(id)) return false;
      const item = {id: String(id), name: String(name || id), icon: String(icon || ''), from: String(from || ''), at: Date.now()};
      if (about || thought) item.about = String(about || thought);
      write([...read(), item]);
      if (thought) pickUp(item, thought); else drawPocket(true);
      return item;
    },
    remove(id) { const list = read(), next = list.filter(i => i.id !== id); if (next.length !== list.length) write(next); return next.length !== list.length; },
    on(fn) { const h = () => fn(read()); addEventListener(EVENT, h); return () => removeEventListener(EVENT, h); }
  };
  window.AbbieInventory = api;
  addEventListener('storage', e => { if (e.key === KEY) dispatchEvent(new CustomEvent(EVENT, {detail: read()})); });
  addEventListener(EVENT, () => { drawPocket(); checkCharms(); });
  addEventListener('aw-backpack-change', () => { drawPocket(); drawNotebookMini(); checkCharms(); });
  addEventListener('aw-memory-coins-change', () => checkCharms());
  import('./effect-charge.mjs').then(m => { EC = m; drawPocket(); m.onCharge(() => drawPocket()); }).catch(() => {});
  addEventListener('storage', e => { if (/^aw-(memory-coins|basement-coins|backpack)$/.test(e.key || '')) { drawPocket(); checkCharms(); } });
  import('./presentation-layer.mjs').then(({volunteer}) => volunteer('abbie', {place: 'anywhere', dialect: 'her own backpack', items: [
    {id: 'pocket', says: 'what Abbie carries in her backpack', kind: 'list', who: 'player', for: ['player', 'director'], read: () => read().map(i => i.name), relevant: () => read().length > 0,
     prefer: ['meta', 'overlay'], ways: {meta: 'her inner voice when she picks something up', overlay: 'the little backpack on the left bar, brought out into main focus'}},
    {id: 'charms', says: 'the charms on her backpack, one for each quest she has finished', kind: 'list', who: 'player', for: ['player', 'director'], read: () => earnedCharms().map(id => CHARMS.find(c => c.id === id).name), relevant: () => earnedCharms().length > 0,
     prefer: ['spatial', 'meta'], ways: {spatial: 'charms hanging on her backpack', meta: 'a jingle and her inner voice when one is earned'}}]})).catch(() => {});
  const ready = () => { style(); drawPocket(); setTimeout(checkCharms, 1200); };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ready) : ready();
  return api;
}

// ---------- the pocket ----------
let pocket = null, pop = null;
// The left bar (Evan, 23:39Z): "the left side is stuff the PLAYER in the game can touch". A liquid-glass bar on the left
// edge holds her backpack, as a real little 3D backpack in her look, and under it her notebook. Tap the backpack and it
// comes out into main focus; tap the notebook and it opens on her quests. The top is the simulation and HUD.
function leftBar() {
  let bar = document.getElementById('aw-left-bar');
  if (!bar) { bar = Object.assign(document.createElement('nav'), {id: 'aw-left-bar', className: 'aw-left-bar'}); bar.setAttribute('aria-label', 'What Abbie can touch'); document.body.append(bar); }
  return bar;
}
function mountPocket() {
  if (pocket?.isConnected) return pocket;
  pocket = document.createElement('button');
  pocket.type = 'button'; pocket.className = 'aw-pocket aw-left-pack';
  pocket.setAttribute('aria-label', "Abbie's backpack");
  pocket.innerHTML = '<canvas width="128" height="148"></canvas><span class="aw-pocket-g"></span>';
  pocket.onclick = e => { e.stopPropagation(); pop && !pop.hidden ? closePop() : openPop(); };
  const nbb = document.createElement('button'); nbb.type = 'button'; nbb.className = 'aw-left-nb'; nbb.setAttribute('aria-label', 'My notebook');
  nbb.onclick = e => { e.stopPropagation(); closePop(); import('./notebook.mjs?v=1').then(n => n.isNotebookOpen() ? n.closeNotebook() : n.openNotebook()); };
  leftBar().append(pocket, nbb);
  drawNotebookMini(); miniPack(pocket.querySelector('canvas'));
  return pocket;
}
function drawNotebookMini() {
  const b = document.querySelector('.aw-left-nb'); if (!b) return;
  import('./notebook.mjs?v=1').then(({coverCanvas}) => { const c = coverCanvas(bagLook().notebook, 120, 152); b.replaceChildren(c); }).catch(() => {});
}
// The little backpack on the bar is the real model, drawn small and idling (a slow turn and a breath), in her look and
// with her charms. It sleeps while the big one is out, or the page is hidden. Without WebGL it is her glyph.
let mini = null;
async function miniPack(canvas) {
  try {
    const B = await import('./backpack.mjs?v=11'), T = await B.three();
    const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true}); renderer.setPixelRatio(1); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(26, canvas.width / canvas.height, .05, 20);
    scene.add(new T.HemisphereLight('#fff6e6', '#6f5a7a', 1.3)); const key = new T.DirectionalLight('#fff1d6', 2.6); key.position.set(1.4, 2.4, 2.6); scene.add(key);
    const rim = new T.DirectionalLight('#bfe3ff', 1.2); rim.position.set(-2, 1, -2); scene.add(rim);
    let bp = null;
    const build = () => { if (bp) { scene.remove(bp.group); bp.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
      bp = B.buildBackpack(bagLook(), {charms: keychain()}); scene.add(bp.group);
      const d = Math.max(bp.H * 1.25, bp.W * 1.5) / 2 / Math.tan(13 * Math.PI / 180); cam.position.set(0, bp.H * .55, d); cam.lookAt(0, bp.H * .47, 0); };
    build(); B.loadCharmModels(keychain()).then(got => got && build());
    addEventListener('aw-backpack-change', build);
    let prev = performance.now();
    const frame = now => { requestAnimationFrame(frame); if (document.hidden || (pop && !pop.hidden) || !canvas.isConnected) { prev = now; return; }
      const dt = Math.min(.05, (now - prev) / 1000); if (dt < 1 / 32) return; prev = now;
      bp.group.rotation.y = -.5 + Math.sin(now / 2600) * .45; bp.group.position.y = Math.sin(now / 900) * bp.H * .025; bp.update(dt); renderer.render(scene, cam); };
    requestAnimationFrame(frame); mini = {build};
    canvas.parentElement?.classList.add('live');
  } catch { canvas.parentElement?.classList.remove('live'); }
}
function drawPocket(bump = false) {
  if (!document.body) return;
  const list = carried(), p = mountPocket();
  p.querySelector('.aw-pocket-g').innerHTML = glyph(bagLook());
  p.querySelector('.aw-pocket-n')?.remove();
  if (list.length > 1) p.insertAdjacentHTML('beforeend', `<span class="aw-pocket-n">${list.length}</span>`);
  p.title = (list.length ? "Abbie's backpack: " + list.map(i => i.name).join(', ') : "Abbie's backpack") + ' (B)';
  if (bump) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  if (pop && !pop.hidden && view) view.setContents({items: list, coins: coinCount(), charms: keychain()});
}
// Tapping the backpack brings it out as a floating mini (Evan, 22:55Z: "I like back pack as a stand alone ... floating
// mini's just idly floating around waiting to be interacted with ... bring back pack to center"). It flies from the left
// bar to the middle of the screen and idles there in the air. It is dressed by its own parts, FPS-loadout style (Evan,
// 2026-10-24 00:16Z, after the card slots: "treat the facets like they are slots on the model ... click the facet to
// enable selection then pick from a small and unobtrusive list of options"): a small bead sits on each slot of the
// model (the style above it, colour and pattern on the shell, the pocket, the straps, the lining at the opening, the
// notebook peeking out), tap a bead or the part and a short strip of swatches opens beside it. loadout.mjs, shared.
// The open orb opens it half shell on what she carries. Nothing behind it is dimmed, blurred or masked.
let view = null, lo = null;
const styleArt = id => new URL(`./assets/backpack/style-${id}.png`, import.meta.url).href;
const covers = new Map();
function slotDefs(B, cover) {
  const l = bagLook(), opt = (f, map) => B.FACETS.find(x => x.id === f).options.map(o => ({id: o.id, name: o.name, ...map(o)}));
  return [
    {id: 'style', name: 'Style', options: B.STYLES.map(s => ({id: s.id, name: s.name, icon: styleArt(s.id)}))},
    {id: 'colour', name: 'Colour', options: opt('colour', o => ({swatch: o.c}))},
    {id: 'pattern', name: 'Pattern', options: opt('pattern', o => ({swatch: B.swatch('pattern', {...l, pattern: o.id})}))},
    {id: 'pocket', name: 'Pocket', options: opt('pocket', o => ({swatch: B.option('colour', l.colour).c, icon: B.pocketSvg(o.id)}))},
    {id: 'trim', name: 'Straps', options: opt('trim', o => ({swatch: B.swatch('trim', {...l, trim: o.id})}))},
    {id: 'lining', name: 'Lining', options: opt('lining', o => ({swatch: B.swatch('lining', {...l, lining: o.id})}))},
    {id: 'notebook', name: 'Notebook', options: opt('notebook', o => ({icon: covers.get(o.id) || covers.set(o.id, cover(o.id, 64, 80).toDataURL()).get(o.id)}))}
  ];
}
function drawPeek() {
  const l = bagLook(), peek = pop?.querySelector('.aw-bp-peek');
  if (peek && peek.dataset.nb !== l.notebook) { peek.dataset.nb = l.notebook; import('./notebook.mjs?v=1').then(({coverCanvas}) => peek.replaceChildren(coverCanvas(l.notebook, 120, 152))).catch(() => {}); }
}
function layout() {
  if (!pop) return;
  const W = innerWidth, H = innerHeight, S = Math.max(220, Math.min(W - 24, 460, H * .56)), cx = W / 2, cy = Math.max(S / 2 + 20, Math.min(H * .47, H - 110 - S / 2));
  Object.assign(pop.querySelector('.aw-bp-stage').style, {left: cx - S / 2 + 'px', top: cy - S / 2 + 'px', width: S + 'px', height: S + 'px'});
}
async function openPop() {
  const list = carried(), from = pocket?.isConnected ? pocket.getBoundingClientRect() : {left: 12, top: 12, width: 44, height: 44, bottom: 56};
  if (!pop) {
    pop = Object.assign(document.createElement('div'), {className: 'aw-pocket-pop aw-bp-pop aw-bp-float'});
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', "Abbie's backpack");
    pop.innerHTML = '<div class="aw-bp-stage"></div>';
    pop.querySelector('.aw-bp-stage').insertAdjacentHTML('beforeend', '<button type="button" class="aw-bp-brush aw-bp-openbtn" aria-label="Look inside"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h14l-1.2 8.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="#ffd23f55"/><path d="M4 11l3-5.5M20 11l-3-5.5"/><path d="M9.5 15h5"/></svg></button>' + '<button type="button" class="aw-bp-brush aw-bp-done" aria-label="Close the backpack"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' + '<button type="button" class="aw-bp-brush aw-bp-charmcam" aria-label="Look at my charms"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4"/><circle cx="12" cy="8.5" r="1.6"/><path d="M12 10.5l2.2 4.4 4.8.7-3.5 3.3.9 4.6L12 21.3l-4.4 2.2.9-4.6L5 15.6l4.8-.7z" fill="#ffd23f88"/></svg></button>');
    // Her notebook is in the backpack: it peeks out beside it, and opens on her quests.
    const peek = Object.assign(document.createElement('button'), {type: 'button', className: 'aw-bp-peek'}); peek.setAttribute('aria-label', 'My notebook');
    peek.onclick = e => { e.stopPropagation(); closePop(); import('./notebook.mjs?v=1').then(n => n.openNotebook()); };
    pop.querySelector('.aw-bp-stage').append(peek);
    pop.querySelector('.aw-bp-done').onclick = e => { e.stopPropagation(); closePop(); };
    pop.querySelector('.aw-bp-charmcam').onclick = e => { e.stopPropagation(); if (!view) return; if (view.focused != null) view.unfocus(); else { lo?.select(null); view.open(); view.focusCharm(0); } };
    pop.querySelector('.aw-bp-openbtn').onclick = e => { e.stopPropagation(); if (!view) return; view.unfocus(); if (view.isOpen && !lo?.selected) view.close(); else { lo?.select(null); view.open(); } };
    addEventListener('resize', layout);
  }
  document.body.append(pop); pop.hidden = false; layout(); drawPeek(); document.documentElement.classList.add('aw-bp-out');
  // Out of the register and into the middle of the screen.
  const st = pop.querySelector('.aw-bp-stage'), sr = st.getBoundingClientRect();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    st.animate([{transform: `translate(${from.left + from.width / 2 - sr.left - sr.width / 2}px,${from.top + from.height / 2 - sr.top - sr.height / 2}px) scale(${from.width / sr.width})`, opacity: .6}, {transform: 'none', opacity: 1}], {duration: 460, easing: 'cubic-bezier(.2,1.25,.4,1)'});
  }
  const contents = {items: list, coins: coinCount(), charms: keychain()};
  pop.querySelector('.aw-bp-charmcam').hidden = !contents.charms.length;
  try {
    if (!view) {
      const [B, {loadout}, {coverCanvas}] = await Promise.all([import('./backpack.mjs?v=11'), import('./loadout.mjs?v=1'), import('./notebook.mjs?v=1')]);
      view = await B.backpackView(st, {...contents, look: bagLook(), spin: false, float: true, onPart: f => lo?.select(f || null), onUse: useItem,
        onChange: l => { setLook(l); drawPeek(); lo?.refresh(); }});
      const peek = pop.querySelector('.aw-bp-peek');
      lo = loadout(pop, {slots: () => slotDefs(B, coverCanvas), value: f => bagLook()[f],
        anchor: f => {
          if (pop.hidden || !view || view.focused != null || (view.isOpen && lo?.selected !== 'lining')) return null;
          if (f === 'notebook') { const r = peek.getBoundingClientRect(); return r.width ? {x: r.left + r.width * .72, y: r.top + r.height * .2} : null; }
          return view.anchors()[f] || null;
        },
        avoid: () => view.bounds, onSelect: f => view.select(f), onPick: (f, v) => view.pick(f, v)});
    } else { view.setLook(bagLook()); view.setContents(contents); lo?.refresh(); }
  } catch {
    // No WebGL: the list still says what she carries.
    pop.classList.add('flat');
    st.innerHTML = `<strong>In my backpack</strong>${list.length ? `<ul>${list.map(i => `<li>${iconHtml(i.icon, 'ic')}<b>${esc(i.name)}</b></li>`).join('')}</ul>` : '<p>Nothing yet.</p>'}`;
  }
}
function closePop() {
  document.querySelectorAll('.aw-bp-ghost').forEach(g => g.remove()); if (!pop || pop.hidden) return;
  lo?.select(null); view?.close();
  const st = pop.querySelector('.aw-bp-stage'), to = pocket?.isConnected ? pocket.getBoundingClientRect() : null, sr = st.getBoundingClientRect();
  const done = () => { if (pop) pop.hidden = true; document.documentElement.classList.remove('aw-bp-out'); };
  if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) return void setTimeout(done, 120);
  // Back into its register on the weather instrument.
  st.animate([{transform: 'none', opacity: 1}, {transform: `translate(${to.left + to.width / 2 - sr.left - sr.width / 2}px,${to.top + to.height / 2 - sr.top - sr.height / 2}px) scale(${to.width / sr.width})`, opacity: .4}], {duration: 380, easing: 'cubic-bezier(.5,0,.7,.4)'}).onfinish = done;
}

// ---------- charms: a new one jingles onto the backpack ----------
let charmQueue = [], charmBusy = false;
function checkCharms() {
  let fresh = []; try { fresh = newCharms(); } catch {}
  if (!fresh.length) return;
  drawPocket();
  charmQueue.push(...fresh); if (!charmBusy) nextCharm();
}
function nextCharm() {
  const c = charmQueue.shift(); if (!c) { charmBusy = false; return; }
  charmBusy = true; jingle();
  pickUp({id: 'charm-' + c.id, name: c.name, icon: c.icon}, `A ${c.name.toLowerCase()} charm for my backpack!`, () => setTimeout(nextCharm, 400));
}
function jingle() {
  if (window.AWLook?.state?.prefs?.mute) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)(), now = ac.currentTime;
    [1568, 2093, 2637, 2093, 3136].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, now + i * .06); g.gain.linearRampToValueAtTime(.05, now + i * .06 + .01); g.gain.exponentialRampToValueAtTime(.0001, now + i * .06 + .35); o.connect(g).connect(ac.destination); o.start(now + i * .06); o.stop(now + i * .06 + .4); });
    setTimeout(() => ac.close(), 1200);
  } catch {}
}
addEventListener('pointerdown', e => { if (pop && !pop.hidden && !e.target.closest?.('.aw-pocket,.aw-pocket-pop,.aw-bp-tag')) closePop(); }, true);
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (view?.inspecting) view.release(); else closePop(); }
  // B opens and closes the backpack, unless she is typing or a game has taken the keyboard.
  else if ((e.code === 'KeyB') && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') && !e.target?.isContentEditable && !window.AWKeysTaken) { pop && !pop.hidden ? closePop() : (drawPocket(), openPop()); }
});

// ---------- picking something up: her inner voice, then into the backpack ----------
function pickUp(item, thought, done = null) {
  const p = mountPocket();
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
      {duration: 520, easing: 'cubic-bezier(.5,-0.3,.7,1)'}).onfinish = () => { fly.remove(); drawPocket(true); done?.(); };
    bubble.classList.add('out'); setTimeout(() => bubble.remove(), 300);
  }, ms);
}
// Her inner voice is text only: the browser's built-in speech sounded harsh and synthetic, so nothing is spoken.
function speak() { return false; }

function style() {
  if (document.getElementById('aw-pocket-css')) return;
  const s = document.createElement('style'); s.id = 'aw-pocket-css';
  s.textContent = `
  .aw-pocket{position:relative;border:0;padding:0;cursor:pointer;color:var(--v2-ink,#2b1d0e)}
  .aw-pocket[hidden]{display:none!important}
  .aw-pocket .ch-g svg{width:22px;height:22px}
  .aw-pocket-float{position:fixed;z-index:40;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 12px);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
    background:linear-gradient(160deg,#ffffff70,transparent 46%),color-mix(in srgb,var(--app-paper,#fffcf0) 34%,transparent);-webkit-backdrop-filter:blur(7px) saturate(1.9);backdrop-filter:blur(7px) saturate(1.9);border:1px solid #ffffffd0;box-shadow:inset 0 1px 0 #fffffff2,0 12px 26px -6px #0c203047}
  .aw-pocket-n{position:absolute;right:-4px;bottom:-4px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--v2-accent,#b64932);color:#fff;font:800 10px/16px var(--app-font,system-ui);text-align:center;box-shadow:0 0 0 1.5px #fff}
  .aw-pocket.bump{animation:aw-bump .5s cubic-bezier(.3,1.6,.5,1)}
  @keyframes aw-bump{40%{transform:scale(1.25)}}
  .aw-pocket-pop{position:fixed;z-index:70;min-width:180px;max-width:min(300px,calc(100vw - 16px));padding:10px 12px;border-radius:20px;font:13px/1.3 var(--app-font,system-ui);color:var(--v2-ink,#2b1d0e);
    background:linear-gradient(160deg,#ffffffa0,transparent 46%),color-mix(in srgb,var(--app-paper,#fffcf0) 80%,transparent);-webkit-backdrop-filter:blur(7px) saturate(1.9);backdrop-filter:blur(7px) saturate(1.9);border:1px solid #ffffffd0;box-shadow:inset 0 1px 0 #fff,0 14px 30px -8px #0c203055}
  .aw-pocket-pop[hidden]{display:none}
  .aw-bp-pop{padding:0;border-radius:0;background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;max-width:none;animation:aw-think .3s cubic-bezier(.3,1.4,.5,1)}
  .aw-bp-pop.flat{padding:10px 12px;border-radius:20px;background:linear-gradient(160deg,#ffffffa0,transparent 46%),color-mix(in srgb,var(--app-paper,#fffcf0) 80%,transparent);height:auto!important}
  .aw-bp-float{left:0;top:0;width:100vw;height:100vh;height:100dvh;pointer-events:none;animation:none}
  .aw-bp-stage{position:absolute;inset:0;pointer-events:auto}.aw-bp-pop.flat .aw-bp-stage{position:static}
  .aw-bp-float .aw-bp-stage{inset:auto}
  .aw-bp-float.flat{left:50%;top:20%;width:min(300px,90vw);height:auto;transform:translateX(-50%);pointer-events:auto}
  .aw-bp-brush{position:absolute;right:6px;top:6px;z-index:4;width:40px;height:40px;border-radius:50%;border:1.5px solid #ffffffe0;display:grid;place-items:center;cursor:pointer;color:#3a2a4a;
    background:linear-gradient(160deg,#ffffffe8,#ffffff90);box-shadow:inset 0 2px 0 #fff,inset 0 -6px 10px #0000001f,0 8px 18px -6px #2a103066}
  .aw-bp-brush svg{width:22px;height:22px}.aw-bp-charmcam{top:52px}.aw-bp-done{right:auto;left:6px}.aw-bp-pop.flat .aw-bp-openbtn{display:none}.aw-bp-brush[hidden]{display:none}.aw-bp-pop.dressing .aw-bp-brush:not(.aw-bp-charmcam){background:linear-gradient(160deg,#fff6c8,#ffd23f)}.aw-bp-pop.flat .aw-bp-brush{display:none}
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
  .aw-left-bar{position:fixed;z-index:38;left:calc(env(safe-area-inset-left,0px) + 10px);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 8px;border-radius:30px;
    background:linear-gradient(165deg,#ffffffb8 0%,#ffffff3a 38%,#ffffff1c 62%,#ffffff66 100%);border:1px solid #ffffffd8;
    box-shadow:inset 0 1.5px 0 #fff,inset 0 -10px 18px -10px #ffffffa0,inset 6px 0 14px -10px #ffffff,0 18px 34px -14px #0c203060,0 2px 6px #0c20301f}
  .aw-left-bar::before{content:"";position:absolute;left:10%;right:10%;top:3px;height:38%;border-radius:26px 26px 50% 50%;background:linear-gradient(#ffffffa8,#ffffff00);pointer-events:none}
  html.aw-bp-out .aw-left-bar,html.aw-nb-out .aw-left-bar{opacity:0;pointer-events:none;transform:translate(-30px,-50%)}
  .aw-left-bar{transition:opacity .25s,transform .25s}
  .aw-left-pack{position:relative;width:64px;height:74px;padding:0;border:0;background:none;cursor:pointer;display:grid;place-items:center;transition:transform .18s}
  .aw-left-pack canvas{width:64px;height:74px;display:none}.aw-left-pack.live canvas{display:block}.aw-left-pack.live .aw-pocket-g{display:none}
  .aw-left-pack .aw-pocket-g svg{width:40px;height:40px}
  .aw-left-pack:hover,.aw-left-nb:hover{transform:translateY(-2px) scale(1.05)}.aw-left-pack:active,.aw-left-nb:active{transform:scale(.94)}
  .aw-left-nb{width:46px;height:58px;padding:0;border:0;background:none;cursor:pointer;transform:rotate(-5deg);transition:transform .18s;filter:drop-shadow(0 5px 6px #2a103040)}
  .aw-left-nb canvas{width:100%;height:100%;display:block}
  .aw-bp-peek{position:absolute;left:-4%;bottom:2%;width:22%;max-width:84px;aspect-ratio:120/152;padding:0;border:0;background:none;cursor:pointer;transform:rotate(-9deg);filter:drop-shadow(0 8px 10px #2a103050);pointer-events:auto;z-index:3;transition:transform .18s}
  .aw-bp-peek:hover{transform:rotate(-4deg) translateY(-4px)}.aw-bp-peek canvas{width:100%;height:100%;display:block}
  @media(max-width:520px){.aw-left-bar{gap:6px;padding:8px 6px}.aw-left-pack,.aw-left-pack canvas{width:52px;height:60px}.aw-left-nb{width:38px;height:48px}}`;
  document.head.append(s);
}
