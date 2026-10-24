// The paint control (AW-STUDY-0049, Evan 2026-10-23): the Paint card is no longer a card in the hand. It is a paint-splat take on
// the fireball icon on the top bar, a facet on it shows how many balls you hold, and the balls wait in a row beside it to be
// dragged down into the world. Press the icon for the slot machine: three reels spin game objects, three in a line wins a full
// handful of balls, anything else still pays one. One spin per real minute, with the countdown showing on the icon.
//   createPaintHud({onThrow, now?, rand?}) -> {el, tray, spin(), grant(g), ready(), setVisible(on), cooldownLeft()}
// With `host` (the town's AWHud.balloons slot) it sits inline at the end of the top row, beside the effect icons.
// The strip is the one overlay: it holds what you own, never world things. Only digits show, no words.
import {createBallTray, rollGrant} from './paint-balls.mjs';

export const SPIN_COOLDOWN_MS = 60000;
export const WIN_ODDS = 1 / 3;
// Eight things from the game, each drawn in the box below. The win is decided first (one in three) and the reels land on it,
// so the odds are exactly a third whatever the object set; the set is only for looks, and a miss never lands three alike.
export const OBJECTS = ['hex', 'bell', 'sheep', 'cheese', 'star', 'disk', 'mushroom', 'apple'];
const ICON = {
 hex: '<path d="M16 3l11 6.5v13L16 29 5 22.5v-13z" fill="#7bc96f" stroke="#2b2a26" stroke-width="2" stroke-linejoin="round"/><path d="M16 3l11 6.5L16 16 5 9.5z" fill="#b6e59a"/>',
 bell: '<path d="M16 5c-5 0-7 4-7 9 0 4-2 5-3 7h20c-1-2-3-3-3-7 0-5-2-9-7-9z" fill="#f2c14e" stroke="#2b2a26" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="25" r="2.6" fill="#b8801f" stroke="#2b2a26" stroke-width="1.6"/>',
 sheep: '<circle cx="12" cy="13" r="5" fill="#fff"/><circle cx="18" cy="11" r="5.5" fill="#fff"/><circle cx="22" cy="16" r="5" fill="#fff"/><circle cx="12" cy="19" r="5" fill="#fff"/><circle cx="18" cy="20" r="5" fill="#fff"/><ellipse cx="9" cy="17" rx="3.6" ry="4.2" fill="#3a3530"/>',
 cheese: '<path d="M4 22l22-12v12z" fill="#f6d65a" stroke="#2b2a26" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="19" r="1.8" fill="#d9a92a"/><circle cx="21" cy="17" r="1.4" fill="#d9a92a"/>',
 star: '<path d="M16 3l3.8 8 8.7 1.2-6.3 6.1 1.5 8.6L16 22.8 8.3 26.9l1.5-8.6-6.3-6.1 8.7-1.2z" fill="#ffd54a" stroke="#2b2a26" stroke-width="2" stroke-linejoin="round"/>',
 disk: '<rect x="5" y="5" width="22" height="22" rx="3" fill="#4a6fd1" stroke="#2b2a26" stroke-width="2"/><rect x="10" y="5" width="12" height="8" fill="#dfe6f7"/><rect x="9" y="18" width="14" height="9" fill="#f4f0e6"/>',
 mushroom: '<path d="M5 16c0-7 5-11 11-11s11 4 11 11z" fill="#e0524a" stroke="#2b2a26" stroke-width="2" stroke-linejoin="round"/><rect x="12" y="16" width="8" height="10" rx="3" fill="#f4f0e6" stroke="#2b2a26" stroke-width="2"/><circle cx="12" cy="11" r="1.8" fill="#fff"/><circle cx="19" cy="9.5" r="1.8" fill="#fff"/>',
 apple: '<path d="M16 9c-6-3-11 2-9 9 1 5 5 9 9 7 4 2 8-2 9-7 2-7-3-12-9-9z" fill="#e24a4a" stroke="#2b2a26" stroke-width="2" stroke-linejoin="round"/><path d="M16 9c0-3 2-5 4-5" stroke="#4d8a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
};
const sym = id => `<svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">${ICON[id]}</svg>`;

// Splat fireball: a teardrop flame with its tail swept back, painted in two colours, with drips and a gloss.
const FIREBALL = `<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true"><defs><radialGradient id="pwf" cx=".38" cy=".4" r=".75"><stop offset="0" stop-color="#ffe58a"/><stop offset=".5" stop-color="#ff6fae"/><stop offset="1" stop-color="#7a3ad6"/></radialGradient></defs>
<path d="M40 5c-9 3-14 8-16 11-6-2-14 2-14 11 0 8 6 14 14 14s14-6 14-13c0-4-2-7-4-9 3-3 5-8 6-14z" fill="url(#pwf)" stroke="#2b2a26" stroke-width="2.4" stroke-linejoin="round"/>
<circle cx="8" cy="39" r="2.6" fill="#ff6fae" stroke="#2b2a26" stroke-width="1.6"/><circle cx="14" cy="45" r="1.8" fill="#7a3ad6" stroke="#2b2a26" stroke-width="1.4"/><circle cx="4" cy="30" r="1.8" fill="#ffd54a" stroke="#2b2a26" stroke-width="1.4"/>
<ellipse cx="19" cy="25" rx="4" ry="2.6" fill="#fff" opacity=".85" transform="rotate(-35 19 25)"/></svg>`;

const CSS = `#paint-hud{position:fixed;right:calc(14px + env(safe-area-inset-right,0px));top:calc(112px + env(safe-area-inset-top,0px));z-index:6;display:flex;flex-direction:row-reverse;align-items:center;gap:8px;pointer-events:none;max-width:94vw}
#paint-hud .ph-icon{position:relative;width:56px;height:56px;border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;flex:none;filter:drop-shadow(0 4px 7px rgba(0,0,0,.38));transition:transform .25s cubic-bezier(.2,1.4,.4,1)}
#paint-hud .ph-icon:hover,#paint-hud .ph-icon:focus-visible{transform:translateY(-3px) rotate(-5deg) scale(1.08);outline:none}
#paint-hud .ph-icon.wait{filter:saturate(.45) drop-shadow(0 4px 7px rgba(0,0,0,.3));cursor:default}
#paint-hud .ph-n{position:absolute;right:-7px;bottom:-5px;min-width:22px;height:24px;padding:0 4px;box-sizing:border-box;display:grid;place-items:center;font:800 13px/1 system-ui,sans-serif;color:#fff;background:#2b2a26;clip-path:polygon(25% 3%,75% 3%,100% 50%,75% 97%,25% 97%,0 50%);text-shadow:0 1px 0 rgba(0,0,0,.4)}
#paint-hud .ph-t{position:absolute;left:50%;bottom:-17px;transform:translateX(-50%);font:700 11px/1 system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7);white-space:nowrap;display:none}
#paint-hud .ph-icon.wait .ph-t{display:block}
.ph-slot{position:fixed;right:calc(10px + env(safe-area-inset-right,0px));top:calc(172px + env(safe-area-inset-top,0px));transform:scale(.9);transform-origin:top right;opacity:0;pointer-events:none;z-index:7;display:flex;gap:7px;padding:10px;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.55),rgba(255,255,255,.18));border:1.5px solid rgba(255,255,255,.85);box-shadow:0 14px 30px rgba(0,0,0,.35),inset 0 2px 6px rgba(255,255,255,.7),inset 0 -6px 12px rgba(0,0,0,.12);transition:opacity .25s,transform .35s cubic-bezier(.2,1.4,.4,1)}
.ph-slot.open{opacity:1;transform:scale(1)}
.ph-reel{width:54px;height:54px;border-radius:14px;background:#fffdf6;box-shadow:inset 0 3px 8px rgba(0,0,0,.28);padding:7px;box-sizing:border-box;overflow:hidden}
.ph-reel.spin svg{animation:ph-blur .09s linear infinite}.ph-reel.win{background:#fff3b0;animation:ph-win .5s ease-out 2}
@keyframes ph-blur{50%{transform:translateY(5px) scaleY(.88);opacity:.7}}@keyframes ph-win{50%{transform:scale(1.14)}}
#paint-hud.inline{position:static;flex-direction:row;gap:6px;max-width:none}#paint-hud.inline .ph-icon{width:44px;height:44px}
.ph-slot.inline{top:calc(84px + env(safe-area-inset-top,0px))}
@media (prefers-reduced-motion:reduce){.ph-reel.spin svg,.ph-reel.win{animation:none}.ph-slot{transition:none}}`;

export function createPaintHud({onThrow, host = null, now = () => Date.now(), rand = Math.random} = {}) {
 if (!document.getElementById('ph-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'ph-css', textContent: CSS}));
 const el = document.createElement('div'); el.id = 'paint-hud'; el.dataset.layer = 'presentation'; if (host) el.classList.add('inline');
 const icon = document.createElement('button'); icon.type = 'button'; icon.className = 'ph-icon'; icon.setAttribute('aria-label', 'Paint balls. Press to spin for more.');
 icon.innerHTML = FIREBALL + '<span class="ph-n">0</span><span class="ph-t"></span>';
 el.append(icon);
 const tray = createBallTray({onThrow, parent: el});
 const slot = document.createElement('div'); slot.className = 'ph-slot' + (host ? ' inline' : ''); slot.dataset.layer = 'presentation';
 const reels = [0, 1, 2].map(() => { const r = document.createElement('div'); r.className = 'ph-reel'; r.innerHTML = sym(OBJECTS[Math.floor(rand() * OBJECTS.length)]); slot.append(r); return r; });
 (host || document.body).append(el); document.body.append(slot);
 const nEl = icon.querySelector('.ph-n'), tEl = icon.querySelector('.ph-t');
 let nextAt = 0; try { nextAt = +localStorage.getItem('pw-next-spin') || 0; } catch (e) {}
 const left = () => Math.max(0, nextAt - now());
 const refresh = () => {
  nEl.textContent = tray.count(); const l = left(), wait = l > 0 || spinning;
  icon.classList.toggle('wait', wait); tEl.textContent = l > 0 ? Math.floor(Math.ceil(l / 1000) / 60) + ':' + String(Math.ceil(l / 1000) % 60).padStart(2, '0') : '';
 };
 let spinning = false, closeT = 0;
 const place = () => { const r = icon.getBoundingClientRect(), w = 3 * 54 + 2 * 7 + 20; slot.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; slot.style.top = r.bottom + 12 + 'px'; slot.style.right = 'auto'; slot.style.transformOrigin = 'top center'; };
 function grant(g) { tray.grant(g); refresh(); }
 function outcome() { // win first, then the faces: one in three are three alike, the rest never are
  const win = rand() < WIN_ODDS, a = Math.floor(rand() * OBJECTS.length);
  if (win) return {win, faces: [a, a, a]};
  let b = Math.floor(rand() * OBJECTS.length), c = Math.floor(rand() * OBJECTS.length);
  while (a === b && b === c) c = Math.floor(rand() * OBJECTS.length);
  return {win, faces: [a, b, c]};
 }
 function spin() {
  if (spinning || left() > 0) return null;
  spinning = true; nextAt = now() + SPIN_COOLDOWN_MS; try { localStorage.setItem('pw-next-spin', String(nextAt)); } catch (e) {}
  const out = outcome(), quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
  clearTimeout(closeT); place(); slot.classList.add('open'); refresh();
  reels.forEach((r, i) => { r.classList.remove('win'); r.classList.add('spin'); });
  const cycle = setInterval(() => reels.forEach((r, i) => { if (r.classList.contains('spin')) r.innerHTML = sym(OBJECTS[Math.floor(rand() * OBJECTS.length)]); }), 80);
  reels.forEach((r, i) => setTimeout(() => { r.classList.remove('spin'); r.innerHTML = sym(OBJECTS[out.faces[i]]); }, (quick ? 150 : 800) + i * (quick ? 100 : 450)));
  const done = (quick ? 150 : 800) + 2 * (quick ? 100 : 450) + 200;
  setTimeout(() => {
   clearInterval(cycle); spinning = false;
   const g = out.win ? rollGrant(rand) : {count: 1, size: {id: 'regular', mult: 1}, colours: [['pink', 'teal', 'lime', 'violet', 'sun'][Math.floor(rand() * 5)]]};
   if (out.win) reels.forEach(r => r.classList.add('win'));
   grant(g); icon.dataset.lastSpin = JSON.stringify({win: out.win, count: g.count});
   closeT = setTimeout(() => slot.classList.remove('open'), out.win ? 1800 : 1100);
  }, done);
  return out;
 }
 icon.addEventListener('pointerdown', e => { e.stopPropagation(); });
 icon.addEventListener('click', () => { spin(); });
 const tick = setInterval(refresh, 500); // the countdown; stops with the page
 addEventListener('pagehide', () => clearInterval(tick));
 refresh();
 return {el, tray, spin, grant, ready: () => left() === 0 && !spinning, cooldownLeft: left,
  setVisible(on) { el.style.display = on ? '' : 'none'; if (!on) slot.classList.remove('open'); },
  refresh};
}
