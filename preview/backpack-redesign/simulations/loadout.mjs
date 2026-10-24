// The loadout: dressing a 3D thing by its own parts, the way an FPS gunsmith works (Evan, 2026-10-24 00:16Z: "the card
// dynamic is NOT working at all. instead leverage inspiration from FPS games and treat the facets like they are slots on
// the model -> then find very simple small interaction systems where you click the facet to enable selection then pick
// from a small and unobtrusive list of options"). Shared: the backpack uses it, and the buggy (or her clothes, or any
// floating mini) can too.
//
// A small glass bead sits on each slot of the model and rides with it as it floats and turns. Tap a bead, or the part
// itself, and that slot is selected: the bead grows, the part glows (the model's job), and a short strip of swatches or
// mini icons opens beside it. Tap one and it goes on at once. Tap the bead again, anywhere empty, or Escape, and the
// strip folds away. No cards, no walls of choices, nothing over the world but the beads and the one strip.
//
//   import {loadout} from '/simulations/loadout.mjs';
//   const lo = loadout(host, {
//     slots: [{id, name, options: [{id, name, swatch?: css background, icon?: image url | svg markup}]}] (or a function
//            returning them, read again on refresh, when the options' looks depend on the others),
//     value: slotId => current option id,
//     anchor: slotId => {x, y, back?} in client px, or null to hide that bead (call it every frame: it is cheap)
//     avoid: () => {left, top, right, bottom} of the model on screen, so the strip opens beside it, never over it,
//     onSelect: slotId | null => {},          // glow the part, stop the model turning, open it part way...
//     onPick: (slotId, optionId) => {},       // put it on; then lo.refresh()
//   });
//   lo.select(id | null); lo.selected; lo.refresh(); lo.show(bool); lo.dispose();
//
// host is a full-screen layer with pointer-events none (the beads and strip turn theirs on). Presentation layer: drawn
// for the player only, invisible to every perception.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('aw-reduce-motion');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const face = o => o.icon ? (/^\s*</.test(o.icon) ? o.icon : `<img src="${esc(o.icon)}" alt="" draggable="false">`) : '';
const bg = o => o.swatch ? ` style="background:${esc(o.swatch)}"` : '';

export function loadout(host, {slots: given, value, anchor, avoid = null, onSelect = null, onPick = null}) {
  style();
  const all = () => typeof given === 'function' ? given() : given, slots = all();
  const root = Object.assign(document.createElement('div'), {className: 'aw-lo'});
  root.innerHTML = slots.map(s => `<button type="button" class="aw-lo-pip" data-slot="${esc(s.id)}" aria-label="${esc(s.name)}"><i></i></button>`).join('') +
    '<div class="aw-lo-tray" role="listbox" hidden><b></b><div class="aw-lo-opts"></div></div>';
  host.append(root);
  const pips = new Map([...root.querySelectorAll('.aw-lo-pip')].map(el => [el.dataset.slot, {el, x: null, y: null}]));
  const tray = root.querySelector('.aw-lo-tray'), opts = tray.querySelector('.aw-lo-opts');
  let sel = null, shown = true, alive = true, raf = 0;

  function paintPips() {
    for (const s of all()) {
      const o = s.options.find(x => x.id === value(s.id)) || s.options[0], i = pips.get(s.id).el.querySelector('i');
      i.innerHTML = face(o); i.style.background = o.swatch || '';
    }
  }
  function fillTray() {
    const s = all().find(x => x.id === sel); if (!s) return;
    tray.querySelector('b').textContent = s.name;
    const cur = value(s.id);
    opts.innerHTML = s.options.map(o => `<button type="button" role="option" class="aw-lo-opt${o.id === cur ? ' on' : ''}" data-opt="${esc(o.id)}" aria-selected="${o.id === cur}" title="${esc(o.name)}" aria-label="${esc(o.name)}"${bg(o)}>${face(o)}</button>`).join('');
    opts.style.setProperty('--cols', Math.min(s.options.length, innerWidth < 560 ? 5 : 6));
  }
  function select(id) {
    if (id === sel) id = null;
    if (id != null && !pips.has(id)) id = null;
    pips.get(sel)?.el.classList.remove('on'); sel = id; pips.get(sel)?.el.classList.add('on');
    if (sel) { fillTray(); tray.hidden = false; place(true); if (!reduced()) tray.animate([{opacity: 0, transform: 'scale(.85)'}, {opacity: 1, transform: 'none'}], {duration: 200, easing: 'cubic-bezier(.2,1.3,.4,1)'}); }
    else tray.hidden = true;
    onSelect?.(sel);
  }
  root.addEventListener('click', e => {
    const opt = e.target.closest('.aw-lo-opt'), pip = e.target.closest('.aw-lo-pip');
    if (opt) { e.stopPropagation(); const s = sel; onPick?.(s, opt.dataset.opt); refresh(); const n = pips.get(s)?.el; if (n && !reduced()) n.animate([{transform: 'translate(-50%,-50%) scale(1.5)'}, {transform: 'translate(-50%,-50%) scale(1.25)'}], {duration: 260}); return; }
    if (pip) { e.stopPropagation(); select(pip.dataset.slot); }
  });
  const key = e => { if (e.key === 'Escape' && sel) { e.stopImmediatePropagation(); e.preventDefault(); select(null); } };
  addEventListener('keydown', key, true);

  // The beads follow the model every frame; the strip opens on whichever side of its bead has room.
  function place(snap = false) {
    const k = snap || reduced() ? 1 : .35;
    for (const [id, p] of pips) {
      const a = shown ? anchor(id) : null;
      if (!a) { p.el.hidden = true; p.x = null; if (id === sel) tray.hidden = true; continue; }
      p.el.hidden = false; if (id === sel) tray.hidden = false;
      if (p.x == null) { p.x = a.x; p.y = a.y; } else { p.x += (a.x - p.x) * k; p.y += (a.y - p.y) * k; }
      p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px'; p.el.classList.toggle('back', !!a.back);
    }
    const p = pips.get(sel);
    if (sel && p?.x != null && !tray.hidden) {
      const w = tray.offsetWidth, h = tray.offsetHeight, W = innerWidth, H = innerHeight, m = 10, gap = 18;
      const box = avoid?.() || {left: p.x, right: p.x, top: p.y, bottom: p.y};
      let x, y = p.y - h / 2, o = '0 50%';
      if (box.right + gap + w < W - m && (p.x >= (box.left + box.right) / 2 || box.left - gap - w < m)) { x = box.right + gap; }
      else if (box.left - gap - w > m) { x = box.left - gap - w; o = '100% 50%'; }
      else { x = p.x - w / 2; y = box.bottom + gap; o = '50% 0'; if (y + h > H - m) { y = box.top - gap - h; o = '50% 100%'; } }
      tray.style.left = Math.max(m, Math.min(W - m - w, x)) + 'px'; tray.style.top = Math.max(m, Math.min(H - m - h, y)) + 'px'; tray.style.transformOrigin = o;
    }
  }
  function frame() { if (!alive) return; raf = requestAnimationFrame(frame); if (root.isConnected && !host.hidden) place(); }
  function refresh() { paintPips(); if (sel) fillTray(); }

  paintPips(); frame();
  if (!reduced()) [...pips.values()].forEach(({el}, i) => el.animate([{opacity: 0, scale: .3}, {opacity: 1, scale: 1}], {duration: 300, delay: 220 + i * 50, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards'}));
  return {
    select, refresh, get selected() { return sel; },
    show(on = true) { shown = on; if (!on && sel) select(null); place(true); },
    dispose() { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', key, true); root.remove(); }
  };
}

function style() {
  if (document.getElementById('aw-lo-css')) return;
  const s = document.createElement('style'); s.id = 'aw-lo-css';
  s.textContent = `
  .aw-lo{position:absolute;inset:0;pointer-events:none;z-index:5}
  .aw-lo-pip{position:fixed;width:26px;height:26px;margin:0;padding:3px;border-radius:50%;border:1.5px solid #ffffffe8;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;
    background:radial-gradient(circle at 35% 28%,#ffffffd8,#ffffff50 55%,#ffffff20);box-shadow:inset 0 1.5px 0 #fff,inset 0 -4px 7px #0000001c,0 6px 14px -4px #2a103077;
    transition:transform .18s cubic-bezier(.2,1.4,.4,1),opacity .2s;touch-action:manipulation}
  .aw-lo-pip::after{content:"";position:absolute;inset:-9px;border-radius:50%}
  .aw-lo-pip[hidden]{display:none}
  .aw-lo-pip i{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;overflow:hidden;background:#fff6;box-shadow:inset 0 0 0 1px #0000001a}
  .aw-lo-pip i img,.aw-lo-pip i svg,.aw-lo-pip i canvas{width:100%;height:100%;object-fit:cover;display:block}
  .aw-lo-pip:hover{transform:translate(-50%,-50%) scale(1.15)}
  .aw-lo-pip.on{transform:translate(-50%,-50%) scale(1.25);border-color:#ffd23f;box-shadow:0 0 0 2px #ffd23f88,inset 0 1.5px 0 #fff,0 8px 18px -4px #2a103088}
  .aw-lo-pip.back{opacity:.45}
  .aw-lo-pip:not(.on){animation:aw-lo-breathe 3.2s ease-in-out infinite}
  @keyframes aw-lo-breathe{50%{box-shadow:0 0 0 4px #ffffff40,inset 0 1.5px 0 #fff,0 6px 14px -4px #2a103077}}
  .aw-lo-tray{position:fixed;pointer-events:auto;padding:7px 8px 8px;border-radius:18px;
    background:linear-gradient(165deg,#ffffffc8 0%,#ffffff5c 40%,#ffffff38 65%,#ffffff80 100%);border:1px solid #ffffffd8;
    box-shadow:inset 0 1.5px 0 #fff,inset 0 -8px 14px -10px #ffffffa0,0 16px 30px -12px #0c203070,0 2px 6px #0c20301f}
  .aw-lo-tray[hidden]{display:none}
  .aw-lo-tray b{display:block;margin:0 2px 6px;font:700 10px/1 var(--app-font,system-ui);letter-spacing:.09em;text-transform:uppercase;color:#3a2a4acc}
  .aw-lo-opts{display:grid;grid-template-columns:repeat(var(--cols,6),32px);gap:6px}
  .aw-lo-opt{width:32px;height:32px;padding:0;border-radius:50%;border:2px solid #ffffffe0;cursor:pointer;overflow:hidden;display:grid;place-items:center;background:#fff8;
    box-shadow:0 3px 8px -3px #2a103066,inset 0 1px 0 #fff8;transition:transform .14s;touch-action:manipulation}
  .aw-lo-opt img,.aw-lo-opt svg,.aw-lo-opt canvas{width:100%;height:100%;object-fit:cover;display:block}
  .aw-lo-opt:hover{transform:scale(1.12)}.aw-lo-opt:active{transform:scale(.92)}
  .aw-lo-opt.on{border-color:#ffd23f;box-shadow:0 0 0 2px #ffd23f99,0 3px 8px -3px #2a103066}
  @media (prefers-reduced-motion: reduce){.aw-lo-pip{animation:none!important;transition:none}}
  html.aw-reduce-motion .aw-lo-pip{animation:none!important}
  @media (max-width:560px){.aw-lo-opts{grid-template-columns:repeat(var(--cols,5),30px)}.aw-lo-opt{width:30px;height:30px}}
  /* Fingers (AW-STUDY-0059): every target at least 44 px. The bead's hit ring already is; the swatches grow on touch. */
  @media (pointer: coarse){.aw-lo-opts{grid-template-columns:repeat(var(--cols,5),42px);gap:8px}.aw-lo-opt{width:42px;height:42px}}`;
  document.head.append(s);
}
