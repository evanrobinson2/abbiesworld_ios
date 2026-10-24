// The Moon Buggy as a toy you can trick out (AW-STUDY-0059, the carwash thread). Built from named parts with named materials
// (the game reads material names as shading roles), after the "Moon remaster" buggy: big lugged tyres, a split nose with two
// lamps, tall bars, a long tail deck. It really works as a vehicle: four wheels that spin, the front pair steer, each wheel
// rides on its own spring and shock that follow the ground, the body dives under braking, and the toy animals on it wobble.
//   buildMoonBuggy({theme, slots, dirt, wet}) -> {group, parts, seats, wheels, update(dt, s, world, VS), setTheme, setSlots, setDirt, setWet}
//   THEMES, ANIMALS, SLOTS                   the colour schemes, the toy animals and the five mounting points
//   look() / setLook(patch)                  what she picked, kept on this device ('aw-buggy'), event 'aw-buggy-change'
//   earned() / earn()                        whether the buggy is hers yet ('aw-buggy-earned'), event 'aw-buggy-earned'
//   registerBuggy()                          puts this buggy into the hunt as the 'buggy' vehicle (drive, kart mode, car mode)
// Faces +Z, origin on the ground, like every hunt vehicle. Presentation layer: nothing here is a label or a gizmo.
import * as T from 'three';
import {registerVehicle, rider} from '../effect-hunt/vehicles.mjs';

export const THEMES = [
 {id: 'moon-dust', name: 'Moon dust', body: '#3a4a5a', trim: '#4a5a6a', seat: '#1e2128', accent: '#9fb3c8', lamp: '#e8f6ff', glow: null, swatch: ['#4a5a6a', '#9fb3c8', '#e8f6ff']},
 {id: 'bubblegum', name: 'Bubblegum', body: '#ff7eb6', trim: '#fff1f6', seat: '#7a2a5a', accent: '#ffd34d', lamp: '#fffbe0', glow: '#ff7eb6', swatch: ['#ff7eb6', '#fff1f6', '#ffd34d']},
 {id: 'sunny', name: 'Sunny', body: '#ffcf3a', trim: '#1fb6c9', seat: '#2b3a55', accent: '#ffffff', lamp: '#fffbe0', glow: null, swatch: ['#ffcf3a', '#1fb6c9', '#ffffff']},
 {id: 'meadow', name: 'Meadow', body: '#58b868', trim: '#f4efe2', seat: '#6a4a2a', accent: '#ff8a5a', lamp: '#fffbe0', glow: null, swatch: ['#58b868', '#f4efe2', '#ff8a5a']},
 {id: 'galaxy', name: 'Galaxy', body: '#4b2e8f', trim: '#2a1a5a', seat: '#0f0b24', accent: '#59e0ff', lamp: '#aef3ff', glow: '#59e0ff', swatch: ['#4b2e8f', '#59e0ff', '#ff7eb6']},
 {id: 'rainbow', name: 'Rainbow', body: '#ffffff', trim: ['#ff6b6b', '#ffb347', '#7bd389', '#5fb7ff'], seat: '#3a2a4a', accent: '#ffe066', lamp: '#fffbe0', glow: '#ffe066', swatch: ['#ff6b6b', '#ffb347', '#5fb7ff']}
];
export const themeOf = id => THEMES.find(t => t.id === id) || THEMES[0];

// five mounting points on the buggy, in its own units (the Moon Buggy is about 2.4 long); the order is the order of the slot cards
export const SLOTS = [
 {id: 'hood', name: 'On the hood', at: [0, 1.04, 1.02]}, {id: 'front-left', name: 'Front left', at: [-.78, 1.06, .95]}, {id: 'front-right', name: 'Front right', at: [.78, 1.06, .95]},
 {id: 'rear-left', name: 'Rear left', at: [-.5, 1.0, -1.05]}, {id: 'rear-right', name: 'Rear right', at: [.5, 1.0, -1.05]}
];

// toy animals: original little shapes, built from a body ball and a head ball plus a few extras; faceted, like the charms
const ball = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => ({k: 'ball', r, c, x, y, z, sx, sy, sz});
const cone = (r, h, c, x, y, z, rx = 0, ry = 0, rz = 0) => ({k: 'cone', r, h, c, x, y, z, rx, ry, rz});
const box = (w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) => ({k: 'box', w, h, d, c, x, y, z, rx, ry, rz});
const eyes = (y = .3, z = .15, c = '#1b1424') => [-1, 1].map(s => ball(.022, c, s * .05, y, z));
export const ANIMALS = [
 {id: 'bunny', name: 'Bunny', icon: '🐰', body: '#f7f2ee', parts: [ball(.1, '#f7f2ee', 0, .28, .06), box(.05, .2, .03, '#f7f2ee', -.045, .46, .05, 0, 0, .12), box(.05, .2, .03, '#f7f2ee', .045, .46, .05, 0, 0, -.12), box(.025, .14, .02, '#ffb3c8', -.045, .46, .07, 0, 0, .12), box(.025, .14, .02, '#ffb3c8', .045, .46, .07, 0, 0, -.12), ball(.05, '#fff', 0, .12, -.15), ball(.02, '#ff8fb0', 0, .27, .16), ...eyes(.3, .15)]},
 {id: 'duckling', name: 'Duckling', icon: '🐥', body: '#ffd84a', parts: [ball(.1, '#ffd84a', 0, .28, .06), box(.09, .03, .07, '#ff9a2e', 0, .26, .2), ball(.05, '#ffc520', -.12, .14, -.02, .5, 1, 1.4), ball(.05, '#ffc520', .12, .14, -.02, .5, 1, 1.4), cone(.04, .08, '#ffd84a', 0, .14, -.16, -1.2), ...eyes(.31, .14)]},
 {id: 'bear', name: 'Bear cub', icon: '🐻', body: '#9a6b45', parts: [ball(.1, '#9a6b45', 0, .28, .06), ball(.04, '#9a6b45', -.075, .37, .04), ball(.04, '#9a6b45', .075, .37, .04), ball(.05, '#e8c9a0', 0, .25, .15, 1, .8, .8), ball(.02, '#2a1c14', 0, .27, .2), ball(.05, '#9a6b45', 0, .12, -.14), ...eyes(.31, .15)]},
 {id: 'penguin', name: 'Penguin', icon: '🐧', body: '#2b3347', parts: [ball(.09, '#2b3347', 0, .27, .02), ball(.09, '#f4f4f6', 0, .12, .07, .85, .9, .5), ball(.07, '#f4f4f6', 0, .26, .07, .8, .8, .4), cone(.03, .07, '#ff9a2e', 0, .25, .14, Math.PI / 2), ball(.04, '#232a3a', -.14, .14, 0, .4, 1.3, 1), ball(.04, '#232a3a', .14, .14, 0, .4, 1.3, 1), ...eyes(.3, .1)]},
 {id: 'froggy', name: 'Froggy', icon: '🐸', body: '#58c26a', parts: [ball(.1, '#58c26a', 0, .24, .07, 1.1, .8, 1), ball(.045, '#58c26a', -.06, .35, .06), ball(.045, '#58c26a', .06, .35, .06), ball(.025, '#fff', -.06, .37, .1), ball(.025, '#fff', .06, .37, .1), ball(.014, '#1b1424', -.06, .375, .12), ball(.014, '#1b1424', .06, .375, .12), box(.12, .012, .02, '#2f7a3d', 0, .2, .16), ball(.05, '#4aa75b', -.1, .04, -.06, 1, .5, 1.3), ball(.05, '#4aa75b', .1, .04, -.06, 1, .5, 1.3)]},
 {id: 'piglet', name: 'Piglet', icon: '🐷', body: '#ff9fc1', parts: [ball(.1, '#ff9fc1', 0, .28, .06), cone(.04, .07, '#ff7fa8', -.07, .38, .04, 0, 0, .4), cone(.04, .07, '#ff7fa8', .07, .38, .04, 0, 0, -.4), box(.07, .05, .04, '#ff7fa8', 0, .25, .17), ball(.008, '#7a2a4a', -.015, .25, .195), ball(.008, '#7a2a4a', .015, .25, .195), ball(.018, '#ff7fa8', 0, .12, -.15), ...eyes(.31, .14)]},
 {id: 'kitty', name: 'Kitty', icon: '🐱', body: '#f2994a', parts: [ball(.1, '#f2994a', 0, .28, .06), cone(.04, .08, '#f2994a', -.065, .38, .05), cone(.04, .08, '#f2994a', .065, .38, .05), cone(.025, .12, '#f2994a', 0, .2, -.18, -1.0), box(.02, .02, .09, '#d77a2a', 0, .31, .0), box(.025, .02, .06, '#d77a2a', .09, .22, -.02), ball(.018, '#ff8fb0', 0, .26, .16), ...eyes(.3, .15, '#2a6a3a')]},
 {id: 'bub', name: 'Bub', icon: '🐕', body: '#26221f', parts: [ball(.1, '#26221f', 0, .28, .06), box(.04, .13, .06, '#1a1715', -.1, .26, .05, 0, 0, .15), box(.04, .13, .06, '#1a1715', .1, .26, .05, 0, 0, -.15), ball(.05, '#3d3632', 0, .25, .16, 1, .8, 1), ball(.018, '#111', 0, .27, .21), box(.03, .01, .05, '#ff7a8a', 0, .22, .2), cone(.02, .12, '#26221f', 0, .17, -.17, -.9), ball(.014, '#e8334f', 0, .18, .08, 5, .5, 5), ...eyes(.31, .15, '#6b3a1f')]}
];
export const animalOf = id => ANIMALS.find(a => a.id === id);

const MAT = (name, color, o = {}) => Object.assign(new T.MeshStandardMaterial({color, flatShading: true, roughness: .62, metalness: 0, ...o}), {name});
export function buildAnimal(id) {
 const a = animalOf(id), g = new T.Group(); g.name = 'toy-' + id; if (!a) return g;
 const body = new T.Mesh(new T.IcosahedronGeometry(.12, 1), MAT(id + '-fur', a.body)); body.name = 'toy body'; body.position.y = .13; body.scale.set(1, 1.05, 1.15); g.add(body);
 const matCache = {}, m = c => matCache[c] ||= MAT(id + '-' + c.slice(1), c, {roughness: .55});
 for (const p of a.parts) {
  let o;
  if (p.k === 'ball') { o = new T.Mesh(new T.IcosahedronGeometry(p.r, 1), m(p.c)); o.scale.set(p.sx, p.sy, p.sz); }
  else if (p.k === 'cone') { o = new T.Mesh(new T.ConeGeometry(p.r, p.h, 5), m(p.c)); o.rotation.set(p.rx, p.ry, p.rz); }
  else { o = new T.Mesh(new T.BoxGeometry(p.w, p.h, p.d), m(p.c)); o.rotation.set(p.rx, p.ry, p.rz); }
  o.position.set(p.x, p.y, p.z); o.name = 'toy part'; g.add(o);
 }
 g.traverse(o => { if (o.isMesh) o.castShadow = true; });
 return g;
}

// ---- what she picked, and whether it is hers yet
const KEY = 'aw-buggy', EARNED = 'aw-buggy-earned';
const rd = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? f; } catch { return f; } };
export function look() { const v = rd(KEY, {}); return {theme: themeOf(v.theme).id, slots: Array.from({length: SLOTS.length}, (_, i) => animalOf(v.slots?.[i]) ? v.slots[i] : null)}; }
export function setLook(patch) { const l = {...look(), ...patch}; try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} dispatchEvent(new CustomEvent('aw-buggy-change', {detail: l})); return l; }
export const setSlot = (i, id) => { const l = look(), slots = [...l.slots]; slots[i] = id; return setLook({slots}); };
export const earned = () => !!rd(EARNED, false);
export function earn() { if (earned()) return false; try { localStorage.setItem(EARNED, JSON.stringify(Date.now())); } catch {} dispatchEvent(new CustomEvent('aw-buggy-earned')); return true; }

// ---- the buggy
const R = .46, HUB = R, CORNERS = [{x: -.8, z: .98, front: 1}, {x: .8, z: .98, front: 1}, {x: -.8, z: -.88, front: 0}, {x: .8, z: -.88, front: 0}];
const col = c => new T.Color(c), mix = (a, b, t) => col(a).lerp(col(b), t);
export function buildMoonBuggy({theme = 'moon-dust', slots = [], dirt = 0, wet = 0, withRider = true} = {}) {
 const group = new T.Group(); group.name = 'moon-buggy';
 const mats = {body: MAT('buggy-body', '#3a4a5a'), trim: MAT('buggy-trim', '#4a5a6a'), seat: MAT('buggy-seat', '#1e2128', {roughness: .9}), accent: MAT('buggy-accent', '#9fb3c8', {metalness: .3, roughness: .4}),
  dark: MAT('buggy-frame-dark', '#23272e', {roughness: .7}), tyre: MAT('tyre-rubber', '#1b1b20', {roughness: .95}), hub: MAT('wheel-hub', '#c9d2dc', {metalness: .5, roughness: .35}),
  lamp: MAT('headlight-ice', '#e8f6ff', {emissive: '#bfeaff', emissiveIntensity: 1.4}), glow: MAT('buggy-underglow', '#59e0ff', {emissive: '#59e0ff', emissiveIntensity: 1.6, transparent: true, opacity: .0}),
  mud: MAT('buggy-mud', '#6a4a2a', {roughness: 1, transparent: true}), spring: MAT('suspension-spring', '#ffd34d', {metalness: .4, roughness: .35}), shock: MAT('suspension-shock', '#c9d2dc', {metalness: .6, roughness: .3})};
 mats.trim.side = mats.body.side = T.DoubleSide; // the fenders are open half-pipes
 const add = (parent, geo, m, name, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, m); o.name = name; o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
 // chassis: everything that rides on the springs
 const chassis = new T.Group(); chassis.name = 'chassis'; group.add(chassis);
 add(chassis, new T.BoxGeometry(1.1, .3, 2.0), mats.dark, 'frame', 0, .62, 0);
 add(chassis, new T.BoxGeometry(.8, .22, 1.2), mats.body, 'belly-cowl', 0, .86, .5);
 const nose = add(chassis, new T.BoxGeometry(.95, .3, .75), mats.body, 'nose-cowl', 0, .98, .98); nose.rotation.x = -.18;
 add(chassis, new T.BoxGeometry(.5, .2, .5), mats.trim, 'hood-plate', 0, 1.14, 1.0);
 for (const s of [-1, 1]) { add(chassis, new T.BoxGeometry(.2, .12, .12), mats.lamp, 'headlight', s * .3, 1.0, 1.38); add(chassis, new T.BoxGeometry(.3, .08, .06), mats.trim, 'lamp-brow', s * .3, 1.1, 1.38); }
 add(chassis, new T.BoxGeometry(.9, .16, 1.0), mats.body, 'tail-deck', 0, .95, -.7); const tail = add(chassis, new T.BoxGeometry(1.0, .08, .5), mats.trim, 'tail-fin', 0, 1.06, -1.18); tail.rotation.x = .12;
 add(chassis, new T.BoxGeometry(.5, .14, .95), mats.seat, 'seat', 0, 1.1, -.42);
 add(chassis, new T.BoxGeometry(.16, .16, .1), new T.MeshStandardMaterial({color: '#e8334f', emissive: '#e8334f', emissiveIntensity: .8, name: 'tail-light-red'}), 'tail-light', 0, .98, -1.22);
 const glow = add(chassis, new T.BoxGeometry(1.5, .04, 2.3), mats.glow, 'underglow', 0, .3, 0);
 // handlebars: the steering column turns with the front wheels
 const bars = new T.Group(); bars.name = 'handlebars'; bars.position.set(0, 1.2, .5); chassis.add(bars);
 const post = add(bars, new T.CylinderGeometry(.04, .05, .5, 6), mats.dark, 'steering-post', 0, .2, 0); post.rotation.x = -.35;
 const bar = add(bars, new T.CylinderGeometry(.035, .035, 1.1, 6), mats.accent, 'handlebar', 0, .45, -.08); bar.rotation.z = Math.PI / 2;
 for (const s of [-1, 1]) add(bars, new T.CylinderGeometry(.055, .055, .2, 6), mats.dark, 'grip', s * .55, .45, -.08).rotation.z = Math.PI / 2;
 // wheels, each on its own corner with a spring and a shock between it and the chassis
 const wheels = [], corners = [], steers = [];
 for (const c of CORNERS) {
  const corner = new T.Group(); corner.name = 'wheel-corner'; corner.position.set(c.x, HUB, c.z); group.add(corner);
  const steer = new T.Group(); steer.name = 'wheel-steer'; corner.add(steer); if (c.front) steers.push(steer);
  const spin = new T.Group(); spin.name = 'wheel'; spin.userData.spin = true; steer.add(spin);
  const tyre = add(spin, new T.CylinderGeometry(R, R, .42, 14), mats.tyre, 'tyre', 0, 0, 0); tyre.rotation.z = Math.PI / 2;
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, lug = add(spin, new T.BoxGeometry(.44, .09, .16), mats.tyre, 'tyre-lug', 0, Math.cos(a) * (R + .03), Math.sin(a) * (R + .03)); lug.rotation.x = -a; }
  const hub = add(spin, new T.CylinderGeometry(.2, .2, .46, 8), mats.hub, 'hub', 0, 0, 0); hub.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(spin, new T.BoxGeometry(.5, .05, .05), mats.accent, 'hub-bolt', 0, Math.cos(a) * .13, Math.sin(a) * .13); }
  // the damper above the wheel: a yellow spring that squashes, a silver rod; its top is bolted to the chassis
  const sx = c.x * .9, top = 1.0;
  const spring = add(group, new T.CylinderGeometry(.07, .07, 1, 8), mats.spring, 'suspension-spring', sx, .7, c.z), rod = add(group, new T.CylinderGeometry(.03, .03, 1, 6), mats.shock, 'suspension-shock', sx, .7, c.z);
  const arm = add(group, new T.BoxGeometry(Math.abs(c.x - sx) + .12, .07, .12), mats.dark, 'swing-arm', (c.x + sx) / 2, HUB, c.z);
  const mud = add(group, new T.IcosahedronGeometry(.1, 0), mats.mud, 'mud-splat', c.x * .98, .75, c.z); mud.scale.set(1.6, .4, 1.2);
  const fen = add(group, new T.CylinderGeometry(R + .12, R + .12, .5, 12, 1, true, 0, Math.PI), mats[CORNERS.indexOf(c) < 2 ? 'trim' : 'body'], 'fender', c.x, HUB + .02, c.z); fen.rotation.z = Math.PI / 2; fen.material.side = T.DoubleSide;
  fen.userData.rainbow = CORNERS.indexOf(c);
  wheels.push(spin); corners.push({c, corner, spring, rod, arm, y: 0, v: 0, sx, top, fender: fen, mud});
 }
 // mud on the body and tyres of a buggy that has not been washed yet
 const muds = [];
 for (const [x, y, z, r] of [[.3, .95, -.4, .13], [-.35, .9, -.9, .15], [.2, 1.0, 1.3, .09], [-.2, .85, .2, .12], [.4, .82, -1.1, .1]]) { const m = add(chassis, new T.IcosahedronGeometry(r, 0), mats.mud, 'mud-splat', x, y, z); m.scale.set(1.5, .35, 1.2); muds.push(m); }
 // her toy animals, one per slot
 const toys = SLOTS.map(() => null), mount = new T.Group(); mount.name = 'toy-animal-slots'; chassis.add(mount);
 function setSlots(ids) { SLOTS.forEach((s, i) => { toys[i]?.removeFromParent(); toys[i] = null; const id = ids?.[i]; if (!id || !animalOf(id)) return; const a = buildAnimal(id); a.position.set(...s.at); a.scale.setScalar(1.15); a.userData.phase = i * 1.7; if (s.at[0] !== 0) a.rotation.y = Math.sign(s.at[0]) * .35; mount.add(a); toys[i] = a; }); }
 // her: Abbie, in a pink jacket with the little backpack, on the seat
 let abbie = null; const seats = [new T.Vector3(0, 1.17, -.42)];
 if (withRider) { abbie = rider('abbie'); abbie.position.copy(seats[0]); abbie.rotation.y = 0; abbie.scale.setScalar(1.0); chassis.add(abbie); }
 // look: theme, dirt and wet
 const st = {theme, dirt, wet}, baseBody = col('#000'), baseTrim = col('#000');
 function paint() {
  const th = themeOf(st.theme), d = Math.min(1, st.dirt), wetK = Math.min(1, st.wet);
  baseBody.set(th.body); mats.body.color.copy(baseBody).lerp(col('#7a6648'), d * .55); mats.trim.color.set(Array.isArray(th.trim) ? '#ffffff' : th.trim).lerp(col('#7a6648'), d * .55);
  mats.seat.color.set(th.seat); mats.accent.color.set(th.accent).lerp(col('#7a6648'), d * .4); mats.lamp.color.set(th.lamp); mats.lamp.emissive.set(th.lamp);
  mats.glow.color.set(th.glow || '#ffffff'); mats.glow.emissive.set(th.glow || '#ffffff'); mats.glow.opacity = th.glow ? .55 * (1 - d) : 0; glow.visible = !!th.glow;
  mats.mud.opacity = d; muds.forEach(m => m.visible = d > .02); corners.forEach(k => { k.mud.visible = d > .02; });
  mats.body.roughness = .62 - .3 * (1 - d); mats.body.metalness = .15 * (1 - d) + wetK * .0; mats.body.roughness -= wetK * .15;
  corners.forEach((k, i) => { if (Array.isArray(th.trim)) k.fender.material = k.fender.userData.mat ||= MAT('buggy-fender-' + i, th.trim[i % th.trim.length]); else if (k.fender.userData.mat) { k.fender.material = i < 2 ? mats.trim : mats.body; k.fender.userData.mat = null; } if (k.fender.userData.mat) { k.fender.userData.mat.color.set(Array.isArray(th.trim) ? th.trim[i % th.trim.length] : th.trim).lerp(col('#7a6648'), d * .55); k.fender.material.side = T.DoubleSide; } });
  if (abbie) abbie.traverse(o => { if (!o.isMesh) return; o.userData.dry ??= o.material.color.clone(); o.material.color.copy(o.userData.dry).lerp(col('#2a3350'), wetK * .45); });
 }
 setSlots(slots); paint();
 // ---- alive: springs follow the ground, the nose dives under braking, the toys wobble, the bars turn with the wheels
 let prevSpeed = 0, dive = 0, t = 0;
 const e = 1.6, k = new T.Vector3();
 function update(dt, s, world, VS = 1) {
  t += dt; const sh = Math.sin(s.heading), ch = Math.cos(s.heading);
  const acc = dt > 0 ? (s.speed - prevSpeed) / dt : 0; prevSpeed = s.speed; dive += (Math.max(-.06, Math.min(.06, -acc * .0035)) - dive) * Math.min(1, dt * 6); chassis.rotation.x = dive;
  // the ground plane under the middle, as the driver tilts the body to it, so what is left over at each wheel is the bump
  const at = (lx, lz) => world.heightAt(s.x + (lx * ch + lz * sh) * VS, s.z + (-lx * sh + lz * ch) * VS);
  const g0 = at(0, 0), sf = (at(0, e) - at(0, -e)) / (2 * e * VS), sr = (at(e, 0) - at(-e, 0)) / (2 * e * VS);
  for (const w of corners) {
   const tgt = s.air ? -.17 : Math.max(-.14, Math.min(.2, (at(w.c.x, w.c.z) - (g0 + sf * w.c.z * VS + sr * w.c.x * VS)) / VS)) - s.squash * .25 + (w.c.front ? -dive * 2.2 : dive * 2.2);
   w.v += ((tgt - w.y) * 320 - w.v * 20) * dt; w.y += w.v * dt; w.y = Math.max(-.2, Math.min(.26, w.y));
   w.corner.position.y = HUB + w.y;
   const topY = w.top, hubY = HUB + w.y, len = Math.max(.12, topY - hubY - .12);
   w.spring.scale.set(1, len, 1); w.spring.position.y = hubY + .12 + len / 2; w.rod.scale.set(1, len + .1, 1); w.rod.position.y = hubY + .12 + len / 2 + .02; w.arm.position.y = hubY;
   w.mud.position.y = .75 + w.y * .3;
  }
  const steer = s.steer * .5; for (const st of steers) st.rotation.y = steer; bars.rotation.y = steer * .8;
  for (const a of toys) if (a) { const p = a.userData.phase; a.rotation.z = Math.sin(t * 6 + p) * (.04 + Math.min(.16, Math.abs(s.speed) * .006)) - s.roll * .6; a.position.y = SLOTS[toys.indexOf(a)].at[1] + Math.abs(Math.sin(t * 9 + p)) * (s.air ? .08 : .02 * Math.min(1, Math.abs(s.speed) / 10)); }
  if (abbie) { abbie.rotation.z = -s.steer * .15; abbie.position.y = seats[0].y + Math.sin(t * 9) * .02 * Math.min(1, Math.abs(s.speed) / 12) + (s.air ? .08 : 0); }
 }
 const api = {group, parts: {riders: [], wheels, chassis, bars, corners, toys, abbie}, seats, wheels, name: 'Moon buggy', size: 1.4, update, setTheme(id) { st.theme = id; paint(); }, setSlots, setDirt(v) { st.dirt = v; paint(); }, setWet(v) { st.wet = v; paint(); }, get state() { return st; }};
 group.userData.buggy = api; // so the garage can recolour the one that is driving
 return api;
}

// ---- register: the hunt's 'buggy' vehicle becomes this one, with her look and, until she has washed it, a dirty coat
export function registerBuggy() {
 registerVehicle('buggy', {name: 'Moon buggy', icon: '🚙', jetpack: false, build() { const l = look(); return buildMoonBuggy({theme: l.theme, slots: l.slots, dirt: earned() ? 0 : 1}); }});
}
