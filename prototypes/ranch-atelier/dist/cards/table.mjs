// Card Forge table: open a pack, inspect a card, browse the binder, print the set.
// All cards come from forge.mjs; this file is presentation and juice (GAME_FEEL.md, CARD_STUDY.md "Juice").
import { loadSet, renderCard, renderBack, renderMask, RARITIES, rarityOf, oklchToHex, toBlob, cardPixels } from './forge.mjs';

const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TIER_HOLD = { seed: 0, sprout: 200, bloom: 450, harvest: 800, sun: 1200 };
const S = { set: null, cards: [], byId: new Map(), inspect: new Map(), hand: new Map(), masks: new Map(), back: null, handCards: [], hero: null, deals: 0 };

// ---------------------------------------------------------------- sound (from the sound catalogue)
import { sfx as catalogSfx } from '/simulations/catalog-sfx.mjs';
function blip(freq) { catalogSfx('tick', { gain: 0.5, rate: Math.max(0.5, Math.min(2.2, freq / 700)) }); }
function flick(pitch = 1) { catalogSfx('swipe', { gain: 0.4, rate: pitch }); }
function sting() { catalogSfx('tada', { gain: 0.6 }); }

// ---------------------------------------------------------------- springs (one rAF loop for everything that moves)
const springs = new Set();
function spring(apply, init = {}, k = 300, d = 25) {
  const s = { x: { ...init }, v: {}, t: { ...init }, k, d, apply, alive: true };
  for (const key in init) s.v[key] = 0;
  springs.add(s); return s;
}
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  for (const s of springs) {
    if (!s.alive) { springs.delete(s); continue; }
    for (const key in s.t) {
      if (reduced) { s.x[key] = s.t[key]; continue; }
      const a = s.k * (s.t[key] - s.x[key]) - s.d * s.v[key];
      s.v[key] += a * dt; s.x[key] += s.v[key] * dt;
    }
    s.apply(s.x, now);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
const wait = ms => new Promise(r => setTimeout(r, reduced ? Math.min(ms, 150) : ms));

// ---------------------------------------------------------------- rendering helpers

async function urlOf(canvas) { return URL.createObjectURL(await toBlob(canvas, 'image/png')); }
// Alpha mask for CSS (white in the forge mask = finish applied)
async function maskUrl(spec, mask) {
  const c = renderMask(spec, mask, { dpi: 60 }), ctx = c.getContext('2d'), img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i + 3] = img.data[i]; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; }
  ctx.putImageData(img, 0, 0);
  return urlOf(c);
}
async function ensureInspect(spec) {
  if (S.inspect.has(spec.id)) return S.inspect.get(spec.id);
  const job = (async () => {
    const { canvas, qc, manifest, masks } = await renderCard(spec, { dpi: 380 });
    const m = {};
    for (const mk of masks) m[mk.layer] = await maskUrl(spec, mk);
    return { url: await urlOf(canvas), qc, manifest, masks: m };
  })();
  S.inspect.set(spec.id, job);
  return job;
}
async function ensureHand(spec) {
  if (S.hand.has(spec.id)) return S.hand.get(spec.id);
  const job = renderCard(spec, { dpi: 200, lod: 'hand' }).then(r => urlOf(r.canvas));
  S.hand.set(spec.id, job);
  return job;
}

// ---------------------------------------------------------------- the inspected card

function buildC3d(el, data, spec) {
  const tier = rarityOf(spec.rarity), finish = spec.finish || RARITIES[tier].finish;
  el.innerHTML = '';
  const tilt = document.createElement('div'); tilt.className = 'tilt';
  const edge = document.createElement('div'); edge.className = 'edge';
  const img = new Image(); img.src = data.url; img.alt = `${spec.name}: ${spec.rules.replace(/\{([a-z]+)\}/g, '$1 ').replace(/\n/g, ' ')}`;
  tilt.append(edge, img);
  const foilLayer = { shimmer: 'holofoil', golden_hour: 'cold_foil', frost: 'etched_foil' }[finish];
  const foilMask = data.masks[foilLayer] || (tier === 'sun' ? data.masks.holofoil : null) || (tier === 'harvest' ? data.masks.cold_foil : null);
  if (foilMask) {
    const f = document.createElement('div'); f.className = 'foil ' + (tier === 'harvest' && finish === 'standard' ? 'golden_hour' : finish);
    f.style.webkitMaskImage = f.style.maskImage = `url(${foilMask})`; tilt.append(f);
  }
  if (data.masks.spot_uv) {
    const g = document.createElement('div'); g.className = 'gloss';
    g.style.webkitMaskImage = g.style.maskImage = `url(${data.masks.spot_uv})`; tilt.append(g);
  }
  const shine = document.createElement('div'); shine.className = 'shine'; tilt.append(shine);
  el.append(tilt);
  return tilt;
}

let heroSpring = null, pointer = null;
async function inspect(spec, from) {
  const data = await ensureInspect(spec);
  const hero = $('#hero');
  hero.hidden = false;
  const tilt = buildC3d(hero, data, spec);
  S.hero = spec;
  $('#flavour').textContent = spec.flavour || '';
  const chip = $('#qc-chip');
  chip.textContent = `${data.qc.label} · ${data.qc.items.length} checks`;
  chip.className = data.qc.grade;
  $('#caption').hidden = false;
  if (heroSpring) heroSpring.alive = false;
  const start = from ? { rx: 0, ry: -25, s: 0.7, y: 120 } : { rx: 0, ry: 0, s: 0.92, y: 20 };
  heroSpring = spring((x, now) => {
    let rx = x.rx, ry = x.ry;
    if (!pointer && !reduced) { rx += Math.sin(now / 1900) * 2.2; ry += Math.sin(now / 2600) * 3.5; } // idle sway, never still
    tilt.style.transform = `translateY(${x.y}px) scale(${x.s}) rotateX(${rx}deg) rotateY(${ry}deg)`;
    const px = ry / 12, py = -rx / 12;
    tilt.style.setProperty('--px', px.toFixed(3)); tilt.style.setProperty('--py', py.toFixed(3));
    tilt.style.setProperty('--rx', (ry * 2).toFixed(1));
    tilt.style.setProperty('--sx', (50 + px * 45).toFixed(1) + '%'); tilt.style.setProperty('--sy', (40 + py * 45).toFixed(1) + '%');
  }, start, 260, 22);
  heroSpring.t = { rx: 0, ry: 0, s: 1, y: 0 };
  blip(660, 0.08);
  RanchViewChanged();
}
function onTilt(e) {
  if (!heroSpring) return;
  const r = $('#hero').getBoundingClientRect();
  const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
  const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
  pointer = { nx, ny };
  heroSpring.t = { ...heroSpring.t, rx: -ny * 12, ry: nx * 12, s: 1.04 };
}
function endTilt() { pointer = null; if (heroSpring) heroSpring.t = { ...heroSpring.t, rx: 0, ry: 0, s: 1 }; }
$('#stage').addEventListener('pointermove', onTilt);
$('#stage').addEventListener('pointerdown', onTilt);
$('#stage').addEventListener('pointerleave', endTilt);
$('#stage').addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') endTilt(); });

// ---------------------------------------------------------------- the hand

function fanSlot(i, n) {
  const w = $('#hand').clientWidth, cw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hand-w')) || 100;
  const cardW = Math.min(cw, $('#hand').querySelector('.hcard')?.offsetWidth || cw);
  const spread = Math.min(cardW * 0.86, (w - cardW - 24) / Math.max(1, n - 1));
  const c = i - (n - 1) / 2;
  return { x: c * spread, y: Math.abs(c) ** 1.6 * 5 - 26, r: c * 5.5 };
}
function makeHandCard(spec) {
  const el = document.createElement('div'); el.className = 'hcard';
  el.innerHTML = '<div class="glow"></div><div class="flip"><img class="face" alt=""><img class="back" alt=""></div>';
  el.querySelector('.back').src = S.back;
  el.style.setProperty('--glow', oklchToHex(RARITIES[rarityOf(spec.rarity)].oklch));
  $('#hand').append(el);
  const flip = el.querySelector('.flip'), glow = el.querySelector('.glow');
  const deck = $('#deck').getBoundingClientRect(), hand = $('#hand').getBoundingClientRect();
  const sx = deck.left + deck.width / 2 - (hand.left + hand.width / 2), sy = deck.top - hand.bottom + el.offsetHeight;
  const card = { spec, el, revealed: false };
  card.sp = spring((x, now) => {
    const sway = reduced || !card.revealed ? 0 : Math.sin(now / 1000 * (2 * Math.PI / 4) + card.phase) * 1.5;
    el.style.transform = `translate(calc(-50% + ${x.x}px), ${x.y}px) rotate(${x.r + sway}deg) scale(${x.s})`;
    flip.style.transform = `rotateY(${x.f}deg)`;
    glow.style.opacity = x.g.toFixed(3);
  }, { x: sx, y: sy, r: 40, s: 0.9, f: 180, g: 0 }, 220, 20);
  card.phase = Math.random() * 6;
  el.addEventListener('click', () => { if (card.revealed) pick(card); else revealOne(card); });
  el.addEventListener('pointerenter', () => { if (card.revealed && !reduced) { card.sp.t = { ...card.sp.t, y: card.home.y - 14, s: 1.06 }; blip(880, 0.03, 'sine', 0.02); } });
  el.addEventListener('pointerleave', () => { if (card.revealed) card.sp.t = { ...card.sp.t, y: card.home.y, s: 1 }; });
  ensureHand(spec).then(u => { el.querySelector('.face').src = u; });
  return card;
}
function layoutHand() {
  const n = S.handCards.length;
  S.handCards.forEach((c, i) => { c.home = fanSlot(i, n); c.sp.t = { ...c.sp.t, x: c.home.x, y: c.home.y, r: c.home.r, s: 1 }; });
}
addEventListener('resize', layoutHand);

function pick(card) {
  S.handCards.forEach(c => c.el.classList.toggle('selected', c === card));
  flick(1.4);
  inspect(card.spec, true);
}
async function revealOne(card) {
  if (card.revealed || card.revealing) return;
  card.revealing = true;
  const tier = rarityOf(card.spec.rarity), hold = TIER_HOLD[tier];
  // Rarity is told before it is shown: the back glows in the tier colour, longer for rarer cards.
  card.sp.t = { ...card.sp.t, g: 0.25 + RARITIES[tier].order * 0.18, y: card.home.y - 10, s: 1.05 };
  if (tier === 'sun') { document.body.style.transition = 'filter .4s'; $('#table').style.filter = 'brightness(.7)'; }
  await wait(hold + 120);
  await ensureHand(card.spec);
  card.sp.t = { ...card.sp.t, f: 0, s: 1.08 };
  blip(500 + RARITIES[tier].order * 120, 0.12);
  if (tier === 'sun') { sting(); burst(card.el); }
  await wait(420);
  $('#table').style.filter = '';
  card.sp.t = { ...card.sp.t, s: 1, g: tier === 'seed' ? 0 : 0.18 + RARITIES[tier].order * 0.06, y: card.home.y };
  card.revealed = true;
}
function burst(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120, size = 4 + Math.random() * 7;
    Object.assign(p.style, { position: 'fixed', left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', width: size + 'px', height: size * 0.6 + 'px', borderRadius: '50%', background: ['#ffd66b', '#fff3c4', '#f2c14e', '#9fd18a'][i % 4], zIndex: 20, pointerEvents: 'none', transition: 'transform .9s cubic-bezier(.2,.8,.3,1), opacity .9s ease', transform: 'translate(-50%,-50%)' });
    document.body.append(p);
    requestAnimationFrame(() => { p.style.transform = `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) rotate(${a * 90}deg)`; p.style.opacity = '0'; });
    setTimeout(() => p.remove(), 1000);
  }
}

// A pack: mostly Seed and Sprout, one Bloom or better, a small chance of Sun. The first pack shows every tier.
function packOf() {
  const by = t => S.cards.filter(c => rarityOf(c.rarity) === t);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  if (S.deals === 0) {
    const firsts = ['seed', 'sprout', 'bloom', 'harvest', 'sun'].map(t => by(t)[0]).filter(Boolean);
    if (firsts.length === 5) return firsts;
  }
  const out = new Set();
  const want = ['seed', 'seed', 'sprout', 'sprout', Math.random() < 0.18 ? 'sun' : Math.random() < 0.45 ? 'harvest' : 'bloom'];
  for (const t of want) { const pool = by(t).filter(c => !out.has(c)); out.add(pool.length ? rnd(pool) : rnd(S.cards.filter(c => !out.has(c)))); }
  return [...out].sort((a, b) => RARITIES[rarityOf(a.rarity)].order - RARITIES[rarityOf(b.rarity)].order);
}
let dealing = false;
async function deal() {
  if (dealing) return; dealing = true;
  showBinder(false);
  for (const c of S.handCards) { c.sp.t = { ...c.sp.t, y: 400, r: c.sp.t.r * 2 }; setTimeout(() => { c.sp.alive = false; c.el.remove(); }, 450); }
  S.handCards = [];
  await wait(S.deals ? 300 : 0);
  const pack = packOf();
  S.deals++;
  pack.forEach(spec => ensureHand(spec));
  S.handCards = pack.map(makeHandCard);
  S.handCards.forEach((c, i) => { c.home = fanSlot(i, pack.length); });
  for (let i = 0; i < S.handCards.length; i++) {
    const c = S.handCards[i];
    c.sp.t = { ...c.sp.t, x: c.home.x, y: c.home.y, r: c.home.r, s: 1 };
    flick(1 + i * 0.12);
    await wait(90);
  }
  await wait(500);
  for (const c of S.handCards) await revealOne(c);
  const best = S.handCards.reduce((a, b) => RARITIES[rarityOf(b.spec.rarity)].order > RARITIES[rarityOf(a.spec.rarity)].order ? b : a);
  pick(best);
  dealing = false;
}

// ---------------------------------------------------------------- binder

function showBinder(on) {
  $('#binder').hidden = !on;
  $('#btn-binder').setAttribute('aria-pressed', String(on));
  RanchViewChanged();
}
async function fillBinder() {
  const grid = $('#binder-grid');
  grid.innerHTML = '';
  let collection = 0;
  for (const spec of S.cards) {
    const slot = document.createElement('button'); slot.className = 'slot'; slot.type = 'button';
    slot.innerHTML = `<div class="pocket"></div><div class="tag"><i></i><span>${String(spec.number).padStart(3, '0')} · ${spec.name}</span></div>`;
    grid.append(slot);
    slot.addEventListener('click', () => { showBinder(false); inspect(spec, true); });
    ensureInspect(spec).then(d => {
      const img = new Image(); img.src = d.url; img.alt = spec.name; slot.querySelector('.pocket').append(img);
      slot.querySelector('i').className = d.qc.grade;
      if (d.qc.grade === 'collection') collection++;
      $('#binder-sum').textContent = `${S.cards.length} cards · ${collection} collection grade · tap a card to inspect it`;
    });
  }
}

// ---------------------------------------------------------------- quality sheet

$('#qc-chip').addEventListener('click', async () => {
  if (!S.hero) return;
  const d = await ensureInspect(S.hero);
  $('#qc-title').textContent = `${S.hero.name}: ${d.qc.label}`;
  $('#qc-list').innerHTML = '';
  for (const it of d.qc.items) { const li = document.createElement('li'); li.className = it.level; li.textContent = it.msg; $('#qc-list').append(li); }
  $('#qc-sheet').hidden = false;
});
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { b.closest('section').hidden = true; }));
document.querySelectorAll('#qc-sheet, #print-sheet').forEach(s => s.addEventListener('click', e => { if (e.target === s) s.hidden = true; }));

// ---------------------------------------------------------------- print

const status = t => { $('#print-status').textContent = t; };
async function studioZip() {
  const btn = $('#btn-zip'); btn.disabled = true;
  try {
    const zip = new window.JSZip(), set = S.set.id || 'ranch';
    const report = [];
    const back = await renderBack({ dpi: 600, bleed: true });
    zip.file(`${set}-back.png`, await toBlob(back));
    for (const [i, spec] of S.cards.entries()) {
      status(`Rendering ${spec.name} at 600 ppi (${i + 1} of ${S.cards.length})…`);
      const { canvas, qc, manifest, masks } = await renderCard(spec, { dpi: 600, bleed: true, preview: false });
      const base = `${String(spec.number).padStart(3, '0')}-${spec.id}`;
      zip.file(`${base}.png`, await toBlob(canvas));
      for (const m of masks) zip.file(`${spec.id}.${m.layer}.png`, await toBlob(renderMask(spec, m, { dpi: 600, bleed: true })));
      zip.file(`${base}.json`, JSON.stringify(manifest, null, 2));
      report.push(qc);
    }
    zip.file('quality-report.json', JSON.stringify({ set: S.set, generated: new Date().toISOString(), cards: report }, null, 2));
    zip.file('README.txt', [
      `${S.set.name || set}: print files from Card Forge (Abbie's World).`,
      '', 'Each card: NNN-id.png is 63 x 88 mm plus 3 mm bleed at 600 ppi (1630 x 2221 px), sRGB.',
      'Finish masks (white = apply): id.spot_uv.png, id.cold_foil.png, id.holofoil.png, id.etched_foil.png.',
      'NNN-id.json is the card rubric manifest (docs/oracle/cards/card-rubric.json); check with tools/card-rubric/check_card.py.',
      `${set}-back.png is the shared card back. quality-report.json lists every check per card.`,
      'Cut at the trim; corners 3 mm radius. Stock 300-330 gsm black-core. Convert to CMYK (FOGRA39 or GRACoL) at the printer.',
    ].join('\n'));
    status('Packing the zip…');
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${set}-cards-600ppi.zip`; document.body.append(a); a.click(); a.remove();
    status(`Done: ${S.cards.length} cards, back, masks, manifests and quality report.`);
  } catch (e) { status('Could not build the zip: ' + e.message); }
  btn.disabled = false;
}
async function homeSheet() {
  const btn = $('#btn-sheet'); btn.disabled = true;
  const pages = $('#print-pages'); pages.innerHTML = '';
  const MM = v => v + 'mm', perPage = 9, gap = 3, cw = 63, ch = 88;
  const left = (215.9 - (3 * cw + 2 * gap)) / 2, top = (279.4 - (3 * ch + 2 * gap)) / 2;
  let page = null;
  for (const [i, spec] of S.cards.entries()) {
    status(`Laying out ${spec.name} (${i + 1} of ${S.cards.length})…`);
    if (i % perPage === 0) { page = document.createElement('div'); page.className = 'ppage'; pages.append(page); }
    const k = i % perPage, col = k % 3, row = Math.floor(k / 3);
    const x = left + col * (cw + gap), y = top + row * (ch + gap);
    const { canvas } = await renderCard(spec, { dpi: 300, bleed: true });
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { position: 'absolute', left: MM(x), top: MM(y), width: MM(cw), height: MM(ch), overflow: 'hidden' });
    const img = new Image(); img.src = await urlOf(canvas);
    Object.assign(img.style, { position: 'absolute', left: MM(-3), top: MM(-3), width: MM(cw + 6), height: MM(ch + 6) });
    wrap.append(img); page.append(wrap);
    for (const [cx, cy] of [[x, y], [x + cw, y], [x, y + ch], [x + cw, y + ch]]) { // crop marks in the gutters
      for (const [w, h, dx, dy] of [[0.15, 2.4, -0.075, cy === y ? -2.6 : 0.2], [2.4, 0.15, cx === x ? -2.6 : 0.2, -0.075]]) {
        const m = document.createElement('div'); m.className = 'crop';
        Object.assign(m.style, { left: MM(cx + dx), top: MM(cy + dy), width: MM(w), height: MM(h) });
        page.append(m);
      }
    }
  }
  status('Opening the print dialog…');
  await Promise.all([...pages.querySelectorAll('img')].map(im => im.decode().catch(() => {})));
  btn.disabled = false;
  print();
  status('');
}
$('#btn-zip').addEventListener('click', studioZip);
$('#btn-sheet').addEventListener('click', homeSheet);

// ---------------------------------------------------------------- dock + boot

$('#btn-deal').addEventListener('click', deal);
$('#btn-binder').addEventListener('click', () => showBinder($('#binder').hidden));
$('#btn-print').addEventListener('click', () => { $('#print-sheet').hidden = false; });

function RanchViewChanged() { window.RanchView?.changed?.(); }
window.RanchView?.register?.('cards', () => ({ page: 'Card Forge', set: S.set?.name, inspecting: S.hero?.id || null, hand: S.handCards.map(c => c.spec.id), binderOpen: !$('#binder').hidden }));

async function boot() {
  const q = new URLSearchParams(location.search);
  const { set, cards } = await loadSet(q.get('set') || undefined);
  S.set = set; S.cards = cards; cards.forEach(c => S.byId.set(c.id, c));
  $('#set-name').textContent = set.name || set.id;
  document.querySelector('.binder-head h2').textContent = set.name || 'Binder';
  const loading = $('#loading-text');
  S.back = await urlOf(await renderBack({ dpi: 160 }));
  const first = packOf();
  for (const [i, spec] of first.entries()) { loading.textContent = `Forging ${spec.name} · ${i + 1} of ${first.length}`; await ensureHand(spec); }
  $('#loading').classList.add('done');
  const only = q.get('card') && S.byId.get(q.get('card'));
  if (only) await inspect(only, true);
  else if (q.get('view') === 'binder') { showBinder(true); }
  else await deal();
  fillBinder();
  window.forgeReady = true;
}
boot().catch(e => { $('#loading-text').textContent = 'The forge stalled: ' + e.message; console.error(e); });
export { S as state, cardPixels };
