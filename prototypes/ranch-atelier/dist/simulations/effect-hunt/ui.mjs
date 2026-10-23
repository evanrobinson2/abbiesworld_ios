// The hunt's presentation layer: a tray of ten round effect buttons along the bottom edge, and two thumb buttons (jet,
// boost) on the right. No words on screen. Each tray button is a silhouette until found, then a bright icon with a ring
// that fills over the 15 second cooldown. All of it carries data-ui, so it is never picked by a ground tap, and none of it
// exists in the world (characters and the simulation cannot see it).
import {EFFECTS, cooldownLeft, isFound, COOLDOWN_MS} from './effects.mjs';

const CSS = `
.hunt-ui{position:fixed;inset:auto 0 0 0;display:flex;justify-content:center;gap:clamp(4px,1.2vw,10px);padding:0 10px max(10px,env(safe-area-inset-bottom));pointer-events:none;z-index:20}
.hunt-ui .eff{--c:#fff;--p:0;pointer-events:auto;position:relative;width:clamp(34px,8.2vw,52px);aspect-ratio:1;border-radius:50%;border:0;padding:0;cursor:pointer;color:#fff;font-size:clamp(16px,4.2vw,26px);display:grid;place-items:center;
 background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.55),rgba(255,255,255,.12) 55%,rgba(20,10,40,.35));box-shadow:0 6px 14px rgba(20,10,40,.35),inset 0 1px 2px rgba(255,255,255,.7),inset 0 -6px 10px color-mix(in srgb,var(--c) 45%,transparent);backdrop-filter:blur(8px) saturate(1.5);transition:transform .15s}
.hunt-ui .eff:active{transform:scale(.9)}
.hunt-ui .eff.locked{filter:grayscale(1) brightness(.5);opacity:.55}
.hunt-ui .eff.locked span{filter:brightness(0)}
.hunt-ui .eff::after{content:"";position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1turn),transparent 0);-webkit-mask:radial-gradient(circle,transparent 62%,#000 64%);mask:radial-gradient(circle,transparent 62%,#000 64%);opacity:.95}
.hunt-ui .eff.ready{box-shadow:0 0 18px var(--c),0 6px 14px rgba(20,10,40,.35),inset 0 1px 2px rgba(255,255,255,.7)}
.hunt-ui .eff.pulse{animation:huntpulse .8s ease-out}
@keyframes huntpulse{0%{transform:scale(.6)}50%{transform:scale(1.35)}100%{transform:scale(1)}}
.hunt-pads{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:calc(max(10px,env(safe-area-inset-bottom)) + clamp(48px,11vw,66px));display:flex;flex-direction:column;gap:12px;z-index:20}
.hunt-pads button,.hunt-top button{pointer-events:auto;width:clamp(52px,14vw,72px);aspect-ratio:1;border-radius:50%;border:0;font-size:clamp(22px,6vw,32px);color:#fff;cursor:pointer;touch-action:none;
 background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.6),rgba(255,255,255,.1) 55%,rgba(20,10,40,.4));box-shadow:0 8px 18px rgba(20,10,40,.4),inset 0 1px 3px rgba(255,255,255,.75);backdrop-filter:blur(8px) saturate(1.5)}
.hunt-pads button:active,.hunt-pads button.on{transform:scale(.92);box-shadow:0 0 22px #ffd95a,inset 0 1px 3px rgba(255,255,255,.75)}
.hunt-top{position:fixed;top:max(10px,env(safe-area-inset-top));left:0;right:0;display:flex;justify-content:space-between;padding:0 12px 0 var(--hunt-left,12px);z-index:20;pointer-events:none}
.hunt-top .group{display:flex;gap:8px}
.hunt-top button{width:clamp(38px,9vw,46px);font-size:clamp(18px,4.5vw,22px)}
.hunt-top button.on{box-shadow:0 0 16px #ff7eb6,inset 0 1px 3px rgba(255,255,255,.75)}
.hunt-fuel{position:fixed;left:50%;bottom:calc(max(10px,env(safe-area-inset-bottom)) + clamp(48px,11vw,66px));transform:translateX(-50%);width:min(34vw,160px);height:6px;border-radius:3px;background:rgba(255,255,255,.25);overflow:hidden;z-index:20;pointer-events:none}
.hunt-fuel i{display:block;height:100%;background:linear-gradient(90deg,#ffb02e,#ff5a3c);width:100%}
@media(prefers-reduced-motion:reduce){.hunt-ui .eff.pulse{animation:none}}
`;

export function mountUi({root = document.body, onExit, onCast, onMode, onJet, onBoost, modes = []}) {
 const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
 const tray = document.createElement('div'); tray.className = 'hunt-ui'; tray.dataset.ui = '';
 const btn = EFFECTS.map((e, i) => { const b = document.createElement('button'); b.className = 'eff locked'; b.style.setProperty('--c', e.colour); b.setAttribute('aria-label', e.name); b.dataset.ui = ''; b.innerHTML = `<span>${e.icon}</span>`; b.addEventListener('click', () => onCast(i)); tray.append(b); return b; });
 const pads = document.createElement('div'); pads.className = 'hunt-pads'; pads.dataset.ui = '';
 const mk = (txt, label, on, off) => { const b = document.createElement('button'); b.textContent = txt; b.setAttribute('aria-label', label); b.dataset.ui = ''; b.style.touchAction = 'none'; b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('on'); on(); }); const up = () => { b.classList.remove('on'); off?.(); }; b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); pads.append(b); return b; };
 mk('🚀', 'Jet', () => onJet(true), () => onJet(false)); mk('⚡', 'Boost', () => onBoost(true), () => onBoost(false));
 const top = document.createElement('div'); top.className = 'hunt-top'; top.dataset.ui = '';
 const grp = document.createElement('div'); grp.className = 'group'; top.append(grp);
 const modeBtn = modes.map(m => { const b = document.createElement('button'); b.textContent = m.icon; b.setAttribute('aria-label', m.name); b.dataset.ui = ''; b.addEventListener('click', () => onMode(m.id)); grp.append(b); return [m.id, b]; });
 const fuel = document.createElement('div'); fuel.className = 'hunt-fuel'; fuel.dataset.ui = ''; fuel.innerHTML = '<i></i>';
 if (onExit) { const x = document.createElement('div'); x.className = 'group'; const b = document.createElement('button'); b.textContent = '📓'; b.setAttribute('aria-label', 'Back to the notebook'); b.dataset.ui = ''; b.addEventListener('click', onExit); x.append(b); top.append(x); }
 root.append(tray, pads, top, fuel);
 return {
  setMode(id) { modeBtn.forEach(([k, b]) => b.classList.toggle('on', k === id)); pads.style.display = id === 'god' ? 'none' : ''; fuel.style.display = id === 'god' ? 'none' : ''; },
  frame(now, fuelFrac, jetOn) {
   EFFECTS.forEach((e, i) => { const f = isFound(e.id), left = cooldownLeft(e.id, now), b = btn[i]; b.classList.toggle('locked', !f); b.classList.toggle('ready', f && !left); b.style.setProperty('--p', f ? (left ? 1 - left / COOLDOWN_MS : 1) : 0); });
   fuel.firstChild.style.width = Math.round(fuelFrac * 100) + '%'; fuel.style.opacity = jetOn || fuelFrac < .98 ? 1 : 0;
  },
  pulse(i) { const b = btn[i]; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); },
  armed(i) { btn.forEach((b, k) => b.style.outline = k === i ? '3px solid #fff' : 'none'); },
  dispose() { st.remove(); tray.remove(); pads.remove(); top.remove(); fuel.remove(); }
 };
}
