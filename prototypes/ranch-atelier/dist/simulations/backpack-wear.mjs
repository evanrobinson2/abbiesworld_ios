// AW-STUDY-0046: Abbie wears her backpack. Every game that shows her (the FPS levels, the Moon Mission, Grace's
// basement, the science adventure, the Meshy hero rigs) mounts the same backpack, in her saved look, with the charms
// she chose to keep on it (Evan, 20:51Z: a charm lives in her jewellery box or on her backpack). The charms swing as
// she moves and jingle when they knock together. The overland map can wait.
//
// const pack = await wearBackpack(chestBone, {height: .42});   // a bone, or the figure's group (+z is her front)
// pack.update(dt);                                              // each frame, after the figure has moved
// pack.dispose();
//
// The backpack and its charms are in the world: other characters can see them ("Ooh, a tardigrade!"). The jingle is
// diegetic sound, a little bell in the world, not a UI tick. It follows aw-backpack-change, so a charm she earns or
// moves to the jewellery box shows up (or comes off) without the game doing anything.
import {three, buildBackpack, loadCharmModels, look as savedLook, keychain} from './backpack.mjs?v=13';
import {sfx} from './catalog-sfx.mjs';

let shared = null;
function audio() {
 if (shared) return shared;
 try {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const out = context.createGain(); out.gain.value = 1; out.connect(context.destination);
  const wake = () => context.state === 'suspended' && context.resume().catch(() => {});
  addEventListener('pointerdown', wake, {passive: true}); addEventListener('keydown', wake);
  shared = {context, destination: out};
 } catch { shared = {context: null}; }
 return shared;
}

// One tiny brass-and-enamel tink: the catalogue's glass clink, pitched per charm.
function tink(ac, dest, pitch, level) { sfx('glass-clink', {gain: Math.min(1, level * 3), rate: pitch / 2400}); }

const pitchOf = (id, i) => 2100 + ([...id].reduce((h, c) => h * 31 + c.charCodeAt(0) >>> 0, 7) % 9) * 150 + i * 37;

export async function wearBackpack(parent, {
 look = null, charms = null, height = .42, offset = [0, 0, -.16], turn = Math.PI,
 gain = 1, jingle = true, volume = .18, audio: route = null, follow = true
} = {}) {
 const T = await three();
 const holder = new T.Group(); holder.name = 'worn backpack'; parent.add(holder);
 let bp = null, cool = [], last = 0, on = jingle;
 const v = new T.Vector3();
 function build() {
  if (bp) { holder.remove(bp.group); bp.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
  bp = buildBackpack(look || savedLook(), {charms: charms || keychain()});
  // The straps face her back (+z of the backpack's back half points at her), centred on the mount, sized in metres.
  parent.updateWorldMatrix(true, false); parent.getWorldScale(v);
  const s = height / bp.H / (v.y || 1);
  bp.group.scale.setScalar(s); bp.group.rotation.y = turn; bp.group.position.set(offset[0] / (v.x || 1), offset[1] / (v.y || 1) - bp.H * s / 2, offset[2] / (v.z || 1));
  holder.add(bp.group); cool = bp.charms.map(() => 0);
 }
 build();
 loadCharmModels(charms || keychain()).then(got => { if (got && bp) build(); });
 const onChange = () => { if (follow) build(); };
 addEventListener('aw-backpack-change', onChange);

 return {
  get object() { return holder; },
  get backpack() { return bp; },
  set jingle(x) { on = !!x; }, get jingle() { return on; },
  refresh: build,
  setCharms(ids) { charms = ids; build(); },
  update(dt) {
   if (!bp) return;
   bp.group.getWorldScale(v);
   // The pendulums run in the backpack's own units, so world acceleration is scaled into them.
   bp.update(dt, {world: true, gain: gain / Math.max(v.y, 1e-6) * .05});
   if (!on) return;
   const t = performance.now() / 1000, A = route || audio(), ac = route?.context || A.context; if (!ac || ac.state !== 'running') return;
   bp.charms.forEach((p, i) => {
    // A charm rings when its swing turns round hard, which is when it knocks the backpack or its neighbour.
    const speed = Math.hypot(p.vx, p.vz), prev = p._s || 0; p._s = speed;
    if (prev > 2.2 && speed < prev * .6 && t > cool[i] && t - last > .05) {
     cool[i] = t + .18; last = t;
     tink(ac, route?.destination || A.destination, pitchOf(p.id, i), Math.min(1, prev / 8) * volume);
    }
   });
  },
  dispose() { removeEventListener('aw-backpack-change', onChange); parent.remove(holder); bp?.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); bp = null; }
 };
}
