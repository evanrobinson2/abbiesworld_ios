// World effects for Abbie's World, Winchester (/town), as icons on the top row (Evan, 2026-10-23 23:39Z: "the effect cards
// didn't look good, so just keep the world effects as icons"). Tap one and it happens: fireball, waterball, cats and dogs,
// tie-dye, and the Fire Wheels toggle once the Hot Wheels charm is won. The icons sit in the HUD's effects pill (town-hud.mjs,
// window.AWHud.effects); the god-view card deck stays in the Sandbox (event-hand.mjs). Weather and time of day are the chronograph's.
// One call from the town page, after the scene exists:
//   import('/simulations/town-events.mjs').then(m => m.mountTownEvents({THREE, scene, camera, controls, renderer, heightAt: land.heightAt}));
// Each icon is a little greyed-out 3D model of the thing that drops (effect-icons.mjs). Effects are unlimited and always ready: tapping one
// drops it, as often as she likes. Fire wheels wakes with the Hot Wheels charm instead.
// (heightAt is optional; the town is in metres, y up.) Presentation layer only: the icons are not in the world; the effects they start are.
import {createWorldEffects} from './world-effects.mjs';
import {createEffectIcons} from './effect-icons.mjs';

// Evan, 2026-10-24 (#546): no cooldowns, nothing runs out, every element is there from the start. So by default every effect is
// always charged and tapping drops it, as often as you like. Charging from backpack items (effect-charge.mjs) is kept for a mode
// he may want back: ?charge=1, or localStorage aw-effect-charge-mode = 'on'.
const FREE = (() => { try { return !(/[?&]charge=1\b/.test(location.search) || localStorage.getItem('aw-effect-charge-mode') === 'on'); } catch { return true; } })();
const DAY_SECONDS = 360; // the town has no clock for effects yet: an effect's "day" is six minutes
const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const EFFECTS = [
  {id: 'fireball', name: 'Fireball', icon: svg('<path d="M12 21c-4 0-7-2.8-7-6.4 0-3.2 2.3-5 3.6-7.4.6 1.6 1.4 2.4 2.4 3 0-3.4 1.2-6.2 3.4-8.2.3 3 3.6 5.2 3.6 9.6 0 4.2-2.8 9.4-6 9.4z" fill="#ff9a3c" stroke="#7a2a0a"/><path d="M12 20c-1.9 0-3.2-1.3-3.2-3 0-1.6 1.4-2.4 2-3.8.9.8 1.4 1.6 1.4 2.6 1-.6 1.6-1.6 1.7-2.8 1 1.2 1.4 2.3 1.4 3.4 0 1.9-1.4 3.6-3.3 3.6z" fill="#ffe27a" stroke="none"/>')},
  {id: 'waterball', name: 'Waterball', icon: svg('<path d="M12 3c3.6 4.6 6.2 7.8 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 10.8 8.4 7.6 12 3z" fill="#6cc4ff" stroke="#16507a"/><path d="M9 14.6a3.2 3.2 0 0 0 2.4 3" stroke="#fff" stroke-width="1.6"/>')},
  {id: 'cats-dogs', name: 'Cats and dogs', icon: svg('<ellipse cx="12" cy="15.5" rx="4.6" ry="4" fill="#d9a066" stroke="#5a3514"/><ellipse cx="5.8" cy="11" rx="1.9" ry="2.4" fill="#d9a066" stroke="#5a3514"/><ellipse cx="9.6" cy="6.8" rx="1.9" ry="2.5" fill="#d9a066" stroke="#5a3514"/><ellipse cx="14.4" cy="6.8" rx="1.9" ry="2.5" fill="#d9a066" stroke="#5a3514"/><ellipse cx="18.2" cy="11" rx="1.9" ry="2.4" fill="#d9a066" stroke="#5a3514"/>')},
  {id: 'tie-dye', name: 'Tie-dye', icon: svg('<circle cx="12" cy="12" r="8.6" fill="#ff6fb1" stroke="#5a1a4a"/><path d="M12 12m0 0a1.4 1.4 0 0 1 2.6.6 3 3 0 0 1-4.2 2.4 4.6 4.6 0 0 1 1.2-7 6.4 6.4 0 0 1 8.2 6.4" stroke="#fff3a8" stroke-width="2.2" fill="none"/><path d="M5.4 9a7 7 0 0 1 4-4" stroke="#6cc4ff" stroke-width="2.2" fill="none"/>')},
  {id: 'fire-wheels', name: 'Fire wheels', locked: true, icon: svg('<circle cx="12" cy="13" r="6.4" fill="#444" stroke="#111"/><circle cx="12" cy="13" r="2.2" fill="#ddd" stroke="#111"/><path d="M4 11c-1.4 1-1.6 3.4-.4 5M6 6c-1.6.2-2.6 1.8-2.2 3.2" stroke="#ff7a14" stroke-width="2.2"/><path d="M19.4 5c1.6 1.2 1.6 3.4.4 4.4" stroke="#ff7a14" stroke-width="2.2"/>')}];

export function mountTownEvents({THREE, scene, camera, controls, renderer, heightAt}) {
  const fx = createWorldEffects({T: THREE, scene, orbit: controls, camera, canvas: renderer.domElement, heightAt, clock: () => ({day: 0, hour: performance.now() / 1000 / DAY_SECONDS * 24})});
  const buttons = {};
  // The icons go in the HUD's effects pill; wait for the HUD if it is not up yet (a few seconds at most, then the page body).
  const hud = window.AWHud ? Promise.resolve() : new Promise(r => { addEventListener('aw-hud-ready', r, {once: true}); setTimeout(r, 4000); });
  const icons = createEffectIcons(THREE);
  if (!document.getElementById('aw-effect-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'aw-effect-css', textContent: '.aw-ico[data-effect]{width:46px;height:56px;border-radius:13px;border:2px solid #2a2018;background:var(--fx-bg);box-shadow:inset 0 2px 0 #ffffffb0,inset 0 -10px 14px #0000001f,0 3px 7px #2a201440;overflow:hidden;transition:transform .15s}.aw-ico[data-effect]::before{content:"";position:absolute;inset:0;background:conic-gradient(from 0deg at 50% 62%,#ffffff40 0 8%,#0000 8% 17%,#ffffff40 17% 25%,#0000 25% 34%,#ffffff40 34% 42%,#0000 42% 51%,#ffffff40 51% 59%,#0000 59% 68%,#ffffff40 68% 76%,#0000 76% 85%,#ffffff40 85% 93%,#0000 93%);pointer-events:none}.aw-ico[data-effect]::after{content:"";position:absolute;left:5px;right:5px;bottom:4px;height:6px;border-radius:50%;background:#2a20182e;pointer-events:none}.aw-ico[data-effect]:active{transform:scale(.94)}.aw-ico[data-effect] canvas{position:relative;z-index:1;margin-top:2px}.aw-ico[data-effect=fireball]{--fx-bg:linear-gradient(170deg,#ffd9a0,#ff9a4a 70%,#e8642a)}.aw-ico[data-effect=waterball]{--fx-bg:linear-gradient(170deg,#d6f1ff,#7cc8f2 70%,#4a9fd8)}.aw-ico[data-effect=cats-dogs]{--fx-bg:linear-gradient(170deg,#c8d2e0,#8d9fb0 70%,#5f7389)}.aw-ico[data-effect=tie-dye]{--fx-bg:linear-gradient(170deg,#ffe0f0,#c9a0ff 70%,#16d6c0)}.aw-ico[data-effect=fire-wheels]{--fx-bg:linear-gradient(170deg,#ffe9b0,#ff8a3a 60%,#7a3a1a)}.aw-ico[data-effect].pulse{animation:aw-ico-pulse .6s cubic-bezier(.3,1.6,.5,1)}'}));
  hud.then(() => {
  const host = window.AWHud?.effects || document.body, balloons = window.AWHud?.balloons;
  for (const e of EFFECTS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'aw-ico'; b.dataset.layer = 'presentation'; b.dataset.effect = e.id; b.title = e.name; b.setAttribute('aria-label', e.name);
    if (!icons?.mount(b, e.id)) b.innerHTML = e.icon;
    if (e.locked) b.dataset.locked = '1';
    const pulse = () => { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); };
    // The world effects are unlimited and always ready (Evan, 2026-10-24, issue #529/#531): tap one and it happens, as often as she likes.
    icons?.setCharged(e.id, !e.locked);
    b.dataset.state = e.locked ? 'locked' : 'ready';
    b.onclick = async () => {
      if (e.id === 'fire-wheels') { const m = await import('./fire-wheels.mjs').catch(() => null); if (m?.fireWheelsUnlocked()) m.setFireWheels(!m.fireWheelsOn()); else b.title = 'Fire wheels: win the toy car charm first'; return; }
      fx.play(e.id); pulse();
    };
    host.insertBefore(b, balloons?.parentElement === host ? balloons : null); buttons[e.id] = b;
  }
  });
  // Fire wheels wakes up when the charm is won, and shows whether the trail is on.
  import('./fire-wheels.mjs').then(m => { const sync = () => { const b = buttons['fire-wheels']; if (!b) return; if (m.fireWheelsUnlocked()) delete b.dataset.locked; else b.dataset.locked = '1'; icons?.setCharged('fire-wheels', m.fireWheelsUnlocked()); b.setAttribute('aria-pressed', String(m.fireWheelsOn())); }; sync(); m.onFireWheels(sync); addEventListener('focus', sync); setInterval(sync, 4000); }).catch(() => {});
  // A balloon thrown by hand (paint-world/paint-hud.mjs) names its effect and where it lands.
  addEventListener('ranch:play-event', e => { const d = e.detail; if (d?.at && fx.has(d.id)) fx.play(d.id, d.at); });
  return {fx, buttons};
}
