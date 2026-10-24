// World effects for Abbie's World, Winchester (/town), as icons on the top row (Evan, 2026-10-23 23:39Z: "the effect cards
// didn't look good, so just keep the world effects as icons"). Tap one and it happens: fireball, waterball, cats and dogs,
// tie-dye, and the Fire Wheels toggle once the Hot Wheels charm is won. The icons sit in the HUD's effects pill (town-hud.mjs,
// window.AWHud.effects); the god-view card deck stays in the Sandbox (event-hand.mjs). Weather and time of day are the chronograph's.
// One call from the town page, after the scene exists:
//   import('/simulations/town-events.mjs').then(m => m.mountTownEvents({THREE, scene, camera, controls, renderer, heightAt: land.heightAt}));
// Each icon is a little greyed-out 3D model of the thing that drops (effect-icons.mjs). Spending a backpack item on it charges it
// up (effect-charge.mjs): it goes full colour, and tapping it again drops it. Fire wheels wakes with the Hot Wheels charm instead.
// (heightAt is optional; the town is in metres, y up.) Presentation layer only: the icons are not in the world; the effects they start are.
import {createWorldEffects} from './world-effects.mjs';
import {FUEL, FUEL_NAME, fuel, isCharged, charge, spend, onCharge} from './effect-charge.mjs';
import {createEffectIcons} from './effect-icons.mjs';

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
  if (!document.getElementById('aw-effect-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'aw-effect-css', textContent: '.aw-ico[data-state=ready]{background:linear-gradient(160deg,#fff6c8,#ffe27a);box-shadow:inset 0 1px 0 #fff,0 0 0 2px #ffd23f80,0 0 12px #ffd23f99}.aw-ico[data-fuel]::after{content:attr(data-fuel);position:absolute;right:-2px;top:-2px;min-width:16px;height:16px;border-radius:8px;background:#b64932;color:#fff;font:700 11px/16px system-ui;text-align:center}.aw-ico.nudge{animation:aw-nudge .4s}@keyframes aw-nudge{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}@media(prefers-reduced-motion:reduce){.aw-ico.nudge{animation:none}}'}));
  hud.then(() => {
  const host = window.AWHud?.effects || document.body, balloons = window.AWHud?.balloons;
  for (const e of EFFECTS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'aw-ico'; b.dataset.layer = 'presentation'; b.dataset.effect = e.id; b.title = e.name; b.setAttribute('aria-label', e.name);
    if (!icons?.mount(b, e.id)) b.innerHTML = e.icon;
    if (e.locked) b.dataset.locked = '1';
    const pulse = () => { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); };
    const sync = () => {
      if (e.locked) return;
      const on = isCharged(e.id), n = fuel(FUEL[e.id]); icons?.setCharged(e.id, on); b.dataset.state = on ? 'ready' : 'grey';
      if (n && !on) b.dataset.fuel = n; else delete b.dataset.fuel;
      b.title = on ? `${e.name}: charged, tap to drop it` : n ? `${e.name}: tap to charge it with ${FUEL_NAME[FUEL[e.id]]}` : `${e.name}: needs ${FUEL_NAME[FUEL[e.id]]}, found while driving the buggy`;
    };
    if (!e.locked) { sync(); onCharge(sync); }
    b.onclick = async () => {
      if (e.id === 'fire-wheels') { const m = await import('./fire-wheels.mjs').catch(() => null); if (m?.fireWheelsUnlocked()) m.setFireWheels(!m.fireWheelsOn()); else b.title = 'Fire wheels: win the toy car charm first'; return; }
      if (isCharged(e.id)) { spend(e.id); fx.play(e.id); pulse(); }
      else if (charge(e.id)) pulse();
      else { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); }
    };
    host.insertBefore(b, balloons?.parentElement === host ? balloons : null); buttons[e.id] = b;
  }
  });
  // Fire wheels wakes up when the charm is won, and shows whether the trail is on.
  import('./fire-wheels.mjs').then(m => { const sync = () => { const b = buttons['fire-wheels']; if (!b) return; if (m.fireWheelsUnlocked()) delete b.dataset.locked; else b.dataset.locked = '1'; icons?.setCharged('fire-wheels', m.fireWheelsUnlocked()); b.setAttribute('aria-pressed', String(m.fireWheelsOn())); }; sync(); m.onFireWheels(sync); addEventListener('focus', sync); setInterval(sync, 4000); }).catch(() => {});
  return {fx, buttons};
}
