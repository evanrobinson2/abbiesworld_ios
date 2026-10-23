// Couch input: up to four players on one screen, each on their own device (AW-STUDY-0047, the cell brawl).
// Evan, 2026-10-23: "it should have a brawl-ha-ha feeling and multiple players at same time". Like Brawlhalla's
// local play, anyone joins by pressing a button on whatever they hold; nothing is set up in a menu.
//   touch   hold to move toward your finger, a quick tap to dash (cards are tapped in your corner of the screen)
//   kb1     W A S D to move, Space to dash, E plays a card, Q picks the next card
//   kb2     arrow keys, Enter to dash, / plays a card, . picks the next card
//   pad0-3  left stick, A dash, X plays a card, LB / RB pick a card (the standard mapping, as in gamepad.mjs)
//   const C = couchInput({max: 4, onJoin: (slot, device) => ...})
//   C.poll() -> [{slot, device, move: [x, y] | null, aim: [screenX, screenY] | null, dash, card, next, prev}]
//   (dash, card, next and prev are true for one poll on the press). C.join(device) adds one by hand. C.devices
const DEAD = .2;
const axis = v => Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD);
const KB = {
 kb1: {up: ['w'], down: ['s'], left: ['a'], right: ['d'], dash: [' '], card: ['e'], next: ['q']},
 kb2: {up: ['arrowup'], down: ['arrowdown'], left: ['arrowleft'], right: ['arrowright'], dash: ['enter'], card: ['/'], next: ['.']},
};

export function couchInput({max = 4, onJoin = () => {}, target = window, ignore = e => false} = {}) {
 const slots = [], keys = new Set(), edges = new Set(), pads = {};
 const touch = {down: false, x: 0, y: 0, sx: 0, sy: 0, t0: 0, tap: false};
 const slotOf = d => slots.indexOf(d);
 function join(device) {
  if (slotOf(device) >= 0 || slots.length >= max) return slotOf(device);
  slots.push(device); onJoin(slots.length - 1, device); return slots.length - 1;
 }
 const kbFor = k => Object.keys(KB).find(d => Object.values(KB[d]).some(list => list.includes(k)));
 target.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if (e.repeat) return;
  const d = kbFor(k); if (!d) return; e.preventDefault();
  keys.add(k); edges.add(k); if (slotOf(d) < 0) join(d);
 });
 target.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
 target.addEventListener('pointerdown', e => {
  if (ignore(e)) return;
  touch.down = true; touch.x = touch.sx = e.clientX; touch.y = touch.sy = e.clientY; touch.t0 = performance.now();
  if (slotOf('touch') < 0) join('touch');
 });
 target.addEventListener('pointermove', e => { touch.x = e.clientX; touch.y = e.clientY; });
 target.addEventListener('pointerup', e => {
  if (touch.down && performance.now() - touch.t0 < 220 && Math.hypot(e.clientX - touch.sx, e.clientY - touch.sy) < 14) touch.tap = true;
  touch.down = false;
 });
 target.addEventListener('pointercancel', () => { touch.down = false; });
 function poll() {
  for (const p of navigator.getGamepads?.() || []) {
   if (!p || !p.connected) continue; const d = 'pad' + p.index, prev = pads[d] || [];
   const now = p.buttons.map(b => !!b?.pressed); pads[d] = now;
   const press = i => now[i] && !prev[i];
   if (slotOf(d) < 0 && (press(0) || press(9))) join(d);
   pads[d].press = {dash: press(0), card: press(2), next: press(5), prev: press(4)};
   pads[d].move = [axis(p.axes[0] || 0), axis(p.axes[1] || 0)];
  }
  const out = slots.map((d, slot) => {
   const r = {slot, device: d, move: null, aim: null, dash: false, card: false, next: false, prev: false};
   if (d === 'touch') {
    if (touch.down) r.aim = [touch.x, touch.y];
    if (touch.tap) { r.dash = true; r.aim = [touch.sx, touch.sy]; r.tapAim = true; }
   } else if (KB[d]) {
    const m = KB[d], on = l => l.some(k => keys.has(k)), hit = l => l.some(k => edges.has(k));
    const x = on(m.right) - on(m.left), y = on(m.down) - on(m.up);
    if (x || y) r.move = [x, y];
    r.dash = hit(m.dash); r.card = hit(m.card); r.next = hit(m.next);
   } else if (pads[d]) {
    const P = pads[d]; if (P.move && (P.move[0] || P.move[1])) r.move = P.move;
    Object.assign(r, P.press || {}); P.press = null;
   }
   return r;
  });
  touch.tap = false; edges.clear();
  return out;
 }
 return {poll, join, get devices() { return [...slots]; }, keys, touch};
}

// a small glyph for each kind of device, drawn for the join bubbles (zero words)
export function deviceGlyph(d) {
 if (d === 'touch') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V5a1.5 1.5 0 0 1 3 0v5m0-1a1.5 1.5 0 0 1 3 0v2m0-1a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.6L9 15"/></svg>';
 if (d.startsWith('kb')) return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12a4 4 0 0 1 4 4l-1 4a2.5 2.5 0 0 1-4.5 1L15 15H9l-1.5 2A2.5 2.5 0 0 1 3 16l-1-4a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3M16 11.5h.01M18 13.5h.01"/></svg>';
}
