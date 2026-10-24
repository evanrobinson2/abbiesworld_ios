// Kart mode, effect fuel pickups (World effects hook): ember, droplet, treat and dye drop sit around the track and, on the shortcut,
// turn up in the town. Drive through one and it goes into the backpack (addFuel in effect-charge.mjs), which is what charges the
// greyed-out effect icons. In the world they are things, not markers: a glowing coal, a water drop, a bone biscuit, a blob of dye.
// They bob and spin, vanish when collected and grow back after a while so a lap can be re-run for more.
import * as T from 'three';

export const KINDS = ['ember', 'droplet', 'treat', 'dye'];
const std = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .55, flatShading: true, ...o});
export function makePickup(kind) {
  const g = new T.Group(); g.name = 'fuel ' + kind;
  const add = (geo, m, name, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, m); o.name = name; o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  if (kind === 'ember') { add(new T.IcosahedronGeometry(1.1, 0), std('#3a2a26', {emissive: '#ff5a1a', emissiveIntensity: 1.4}), 'ember coal'); add(new T.IcosahedronGeometry(.55, 0), std('#ffd34d', {emissive: '#ffb21a', emissiveIntensity: 2}), 'ember glow core'); }
  else if (kind === 'droplet') { add(new T.SphereGeometry(.95, 12, 8), std('#5fc8ff', {emissive: '#2a9bff', emissiveIntensity: .5, transparent: true, opacity: .92}), 'droplet water', 0, -.2, 0); add(new T.ConeGeometry(.95, 1.5, 12), std('#5fc8ff', {emissive: '#2a9bff', emissiveIntensity: .5, transparent: true, opacity: .92}), 'droplet tip', 0, 1, 0); }
  else if (kind === 'treat') { add(new T.CylinderGeometry(.35, .35, 2, 8), std('#e3b27a'), 'treat bone shaft').rotation.z = Math.PI / 2; for (const x of [-1, 1]) for (const z of [-.3, .3]) add(new T.SphereGeometry(.42, 8, 6), std('#f1c996'), 'treat bone knob', x, 0, z); }
  else { add(new T.IcosahedronGeometry(1, 1), std('#ff5fb0', {emissive: '#ff5fb0', emissiveIntensity: .35}), 'dye pink'); add(new T.IcosahedronGeometry(.6, 0), std('#3fe0c8', {emissive: '#3fe0c8', emissiveIntensity: .5}), 'dye teal', .6, .5, .3); }
  return g;
}
export function createPickups({scene, world, toScene, fromScene, collect = () => {}, respawn = 50, inCar = () => true}) {
  const root = new T.Group(); root.name = 'fuel pickups'; scene.add(root); let items = [], t = 0;
  function build(track) { // spread round the ring and shortcut, alternating kinds, a little off the middle of the road
    for (const it of items) it.obj.removeFromParent(); items = [];
    const put = (c, count, phase, offset) => { const n = c.samples.length; for (let k = 0; k < count; k++) {
      const p = c.samples[Math.floor(n * ((k + phase) / count)) % n], side = k % 2 ? 1 : -1, x = p.x - p.ty * side * offset, y = p.y + p.tx * side * offset, kind = KINDS[(k + (c === track.cut ? 2 : 0)) % 4], q = toScene(x, y);
      const obj = makePickup(kind); obj.scale.setScalar(1.35); obj.position.set(q.x, world.heightAt(q.x, q.z) + 2.6, q.z); root.add(obj); items.push({kind, obj, x, y, baseY: obj.position.y, t: 0, on: true, spin: Math.random() * 6}); } };
    put(track.main, 16, .03, track.width * .22); put(track.cut, 4, .1, 0);
  }
  function update(dt, bx, by) {
    t += dt; const near = inCar();
    for (const it of items) {
      if (!it.on) { it.t -= dt; if (it.t <= 0) { it.on = true; it.obj.visible = true; it.obj.scale.setScalar(.01); } else continue; }
      const grow = Math.min(1.35, it.obj.scale.x + dt * 2); it.obj.scale.setScalar(grow);
      it.obj.rotation.y = it.spin + t * 1.6; it.obj.position.y = it.baseY + Math.sin(t * 2.2 + it.spin) * .35;
      if (near && (bx - it.x) ** 2 + (by - it.y) ** 2 < 25) { it.on = false; it.obj.visible = false; it.t = respawn; collect(it.kind, it.obj.position); }
    }
  }
  return {root, build, update, items: () => items, dispose() { root.removeFromParent(); }};
}
