// World event cards for Abbie's World, Winchester (/town). The same god-view deck as the Sandbox (event-hand.mjs), with the effects
// that need no ranch simulation: fireball, waterball, cats and dogs and tie-dye. Weather and time-of-day cards stay dimmed until the town has a clock.
// One call from the town page, after the scene exists:
//   import('/simulations/town-events.mjs').then(m => m.mountTownEvents({THREE, scene, camera, controls, renderer, heightAt: land.heightAt}));
// (heightAt is optional; the town is in metres, y up.) Presentation layer only: the little glass button and the deck are not in the world.
import {mountEventHand} from './event-hand.mjs';
import {createWorldEffects} from './world-effects.mjs';

const PLAYABLE = new Set(['fireball', 'waterball', 'cats-dogs', 'tie-dye']);
const DAY_SECONDS = 360; // the town has no clock yet: an effect's "day" is six minutes

export function mountTownEvents({THREE, scene, camera, controls, renderer, heightAt}) {
  const fx = createWorldEffects({T: THREE, scene, orbit: controls, camera, canvas: renderer.domElement, heightAt, clock: () => ({day: 0, hour: performance.now() / 1000 / DAY_SECONDS * 24})});
  const deck = mountEventHand({playable: PLAYABLE, onPlay: id => fx.play(id)});
  const b = document.createElement('button');
  b.id = 'town-events-btn'; b.type = 'button'; b.dataset.layer = 'presentation'; b.setAttribute('aria-label', 'World events');
  b.style.cssText = 'position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 14px);z-index:18;width:48px;height:48px;border-radius:50%;border:1.5px solid rgba(255,255,255,.7);background:linear-gradient(160deg,rgba(60,76,150,.7),rgba(20,26,70,.75));box-shadow:0 6px 16px rgba(6,8,30,.45);cursor:pointer;display:grid;place-items:center;touch-action:manipulation';
  b.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="#ffd666" stroke="#2a1c12" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 5 13h6l-1 9 8-12h-6z"/></svg>';
  b.onclick = () => deck.toggle();
  document.body.append(b);
  return {fx, deck};
}
