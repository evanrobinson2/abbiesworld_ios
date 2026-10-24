// The town's play HUD, laid out by who it is for (Evan, 2026-10-23 23:39Z, "you've wrecked the UI"):
//   LEFT   a liquid-glass bar for what the player character touches (backpack, notebook under it). The Backpack thread owns
//          it: inventory.mjs builds #aw-left-bar. This file leaves the left edge alone.
//   TOP    one row for the simulation and the grown-up powers: the chronograph (dial, time, weather, season, pause and speed
//          in a line), the glowing hex gridlines, and the world-effect icons you drop on the world. Paint balloons stack
//          along the end of this row (#aw-balloons).
//   BOTTOM the hand of cards (the Paint the World card now; tile cards deal here too).
// The backpack and the notebook take the main focus when opened (inventory.mjs, notebook.mjs). Everything here is presentation layer: drawn for the
// player, invisible to characters and to the simulation. Other threads mount into the slots through window.AWHud.
//   AWHud = {top, effects, balloons, hand, hexGlow()}   the slots other threads mount into
import {hexGlow} from './hex-glow.mjs?v=1';

const CSS = `
html.aw-town-hud .pl-door{justify-content:flex-end}html.aw-town-hud .pl-door a{display:none}
html.aw-town-hud .hud,html.aw-town-hud #town-events-btn,html.aw-town-hud #v2-events{display:none!important}
#aw-top{position:fixed;z-index:38;left:calc(env(safe-area-inset-left) + 12px);top:calc(env(safe-area-inset-top) + 10px);display:flex;align-items:center;flex-wrap:nowrap;gap:10px;padding:6px 10px 6px 6px;border-radius:44px;box-sizing:border-box;width:fit-content;max-width:calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right));overflow:hidden}
#aw-top>*{flex:none}
#aw-top .aw-sep{width:1px;align-self:stretch;margin:6px 0;background:#2a201426}
html.aw-town-hud #aw-top #v2-chrono{position:static;margin:0;padding:0;background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
html.aw-town-hud #v2-chrono .ch-pushers{flex-direction:row;margin-left:2px}
html.aw-town-hud #v2-chrono .ch-tiles{display:none}
.aw-ico{all:unset;box-sizing:border-box;cursor:pointer;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;color:var(--v2-ink,#2b1d0e);flex:none;position:relative;
 background:linear-gradient(160deg,#ffffffb8,#ffffff48);box-shadow:inset 0 1px 0 #fff,0 1px 3px #2a201430;-webkit-tap-highlight-color:transparent}
.aw-ico svg{width:24px;height:24px}
.aw-ico:focus-visible{outline:2px solid var(--v2-accent,#b64932);outline-offset:2px}
.aw-ico[aria-pressed=true]{background:linear-gradient(160deg,#fff6c8,#ffd23f);color:#6a4a00;box-shadow:inset 0 1px 0 #fff,0 0 0 2px #ffd23f80,0 0 14px #ffd23f99}
.aw-ico[data-locked]{opacity:.5}
.aw-ico.pulse{animation:aw-ico-pulse .6s cubic-bezier(.3,1.6,.5,1)}
@keyframes aw-ico-pulse{40%{transform:scale(1.28)}}
#aw-grid{width:46px;height:46px;display:grid;place-items:center}
#aw-grid .aw-ico{width:100%;height:100%}
#aw-effects{display:flex;align-items:center;gap:6px;flex:0 1 auto!important;min-width:0;overflow-x:auto;overscroll-behavior:contain;scrollbar-width:none;padding:2px}
#aw-effects::-webkit-scrollbar{display:none}
#aw-balloons{display:flex;align-items:center;gap:6px}
#aw-balloons:empty{display:none}
#aw-balloons:not(:empty){margin-left:4px;padding-left:8px;border-left:1px solid #2a201422}
#aw-hand{position:fixed;z-index:30;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 10px);display:flex;align-items:flex-end;justify-content:center;gap:10px;pointer-events:none;max-width:calc(100vw - 96px)}
#aw-hand>*{pointer-events:auto}
html.aw-town-hud #aw-hand .pw-hand{position:static;--pw-w:92px}
@media(max-width:520px){#aw-hand{max-width:calc(100vw - 80px);left:calc(50% + 28px)}}
@media(prefers-reduced-motion:reduce){.aw-ico.pulse{animation:none}}`;

const HEX = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M8 3l3.2 1.8v3.6L8 10.2 4.8 8.4V4.8z"/><path d="M16 3l3.2 1.8v3.6L16 10.2l-3.2-1.8V4.8z"/><path d="M12 11l3.2 1.8v3.6L12 18.2l-3.2-1.8v-3.6z"/></svg>`;

const el = (tag, props = {}, html = '') => { const e = Object.assign(document.createElement(tag), props); if (html) e.innerHTML = html; return e; };

export function mountTownHud({stage, board} = {}) {
  if (window.AWHud) return window.AWHud;
  document.documentElement.classList.add('aw-town-hud');
  document.head.append(el('style', {id: 'aw-town-hud-css', textContent: CSS}));

  // TOP: one row. The chronograph moves in; its to-do band goes (the notebook holds the quests now).
  const top = el('div', {id: 'aw-top', className: 'v2-glass'}), effects = el('div', {id: 'aw-effects'}), balloons = el('div', {id: 'aw-balloons'});
  effects.setAttribute('role', 'toolbar'); effects.setAttribute('aria-label', 'World effects'); effects.append(balloons);
  const chrono = document.getElementById('v2-chrono'); if (chrono) { chrono.classList.remove('v2-glass'); top.append(chrono); } // one glass bar holds everything: the chronograph's own glass goes
  const sep = () => el('i', {className: 'aw-sep'});
  const gridWrap = el('div', {id: 'aw-grid'}), grid = el('button', {type: 'button', className: 'aw-ico', title: 'Light up the hex grid'}, HEX);
  grid.setAttribute('aria-label', 'Hex gridlines'); grid.setAttribute('aria-pressed', 'false'); gridWrap.append(grid);
  top.append(sep(), gridWrap, sep(), effects); document.body.append(top);
  let glow = null;
  grid.onclick = () => { if (!glow && stage && board) glow = hexGlow(stage, board.hexSide); if (!glow) return; grid.setAttribute('aria-pressed', String(glow.toggle())); };

  // BOTTOM: the hand of cards, always dealt: the real 3D hex tile cards (and the Paint the World card) with no toggle button in front of them.
  const hand = el('div', {id: 'aw-hand'}); hand.setAttribute('aria-label', 'Cards'); document.body.append(hand);
  const adopt = () => { const p = document.getElementById('paint-hand'); if (p && p.parentElement !== hand) hand.append(p); };
  adopt(); new MutationObserver(adopt).observe(document.body, {childList: true});

  window.AWHud = {top, effects, balloons, hand, hexGlow: () => glow};
  dispatchEvent(new CustomEvent('aw-hud-ready'));
  return window.AWHud;
}
