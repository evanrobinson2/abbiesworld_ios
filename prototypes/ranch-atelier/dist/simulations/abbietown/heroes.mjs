// The Meshy heroes living in Winchester (AW-STUDY-0043; Evan, 2026-10-24: "I still don't see the meshy heroes").
// Abbie, Ani and Daddy are on the green in front of the church, where the game opens, and the Moon Mission crew wait by
// the launch pad.
// Each idles on the shared animation set and now and then waves, looks about or has a drink, so the town feels lived in.
//   mountHeroes(window.AbbieTown, window.__town)   once the board is built (after the townsfolk)
// World layer: they are people in the town, standing on their hex, so they hide with the board like the townsfolk.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {heroClip} from '../hero-anims.mjs?v=1';

const H = '/studies/moon-mission/heroes/';
const PER_M = 4.2 / 1.8; // the town's grown-up townsfolk stand 4.2 units tall, so a metre is about 2.33 units
// at: the board's hero spot they stand by; turn: where round it, from the back (about 3.1 is the door side, where the
// townsfolk stand nearer in); out: how far from its edge; idle, and the odd gesture
export const HEROES = [
 {id: 'abbie', name: 'Abbie', glb: 'A1-clay-tee', at: 'common', turn: 3.5, out: 13, idle: 'idle', moves: ['big_wave_hello', 'funnydancing_01', 'look_around_dumbfounded']},
 {id: 'daddy', name: 'Daddy', glb: 'A3-clay-tee', at: 'common', turn: 3.25, out: 13, idle: 'idle_03', moves: ['stand_and_drink', 'big_wave_hello']},
 {id: 'ani', name: 'Ani', glb: 'A2-clay-tee', at: 'common', turn: 3.38, out: 13, idle: 'idle', moves: ['big_wave_hello', 'funnydancing_01', 'look_around_dumbfounded']},
 {id: 'commander', name: 'Commander', glb: 'A4-clay-suit', at: 'launch', turn: 2.3, idle: 'idle_03', moves: ['look_around_dumbfounded', 'big_wave_hello']},
 {id: 'engineer', name: 'Engineer', glb: 'A5-clay-suit', at: 'launch', turn: 2.55, idle: 'idle', moves: ['stand_and_drink', 'catching_breath']},
 {id: 'crewmate', name: 'Crewmate', glb: 'A6-clay-suit', at: 'launch', turn: 2.8, idle: 'idle_02', moves: ['funnydancing_01', 'big_wave_hello']},
];

export function mountHeroes(town, {THREE: T} = {}) {
 const tiles = town?.stage?.tiles; if (!T || !tiles) return null;
 const spotOf = at => { for (const id of Object.keys(tiles)) { const s = tiles[id].spots?.[at]; if (s?.g) return s; } return null; };
 const loader = new GLTFLoader(), people = [], mixers = [];
 for (const h of HEROES) {
  const s = spotOf(h.at); if (!s) continue;
  const box = new T.Box3().setFromObject(s.g), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
  const a = (s.facing || 0) - Math.PI / 2 + h.turn, r = Math.max(size.x, size.z) * .5 + (h.out || 4); // turn 0 is the back of the building
  const p = new T.Group(); p.name = 'hero-' + h.id; p.userData.hero = h.id;
  p.position.set(c.x + Math.sin(a) * r, box.min.y, c.z + Math.cos(a) * r); p.rotation.y = a; // the heroes face +Z: out, towards the street
  town.scene.add(p); s.g.parent.attach(p); people.push(p);
  loader.loadAsync(H + h.glb + '.glb').then(async gltf => {
   const m = gltf.scene; m.scale.setScalar(PER_M);
   m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } }); // skinned bounds lag the pose
   p.add(m);
   const mx = new T.AnimationMixer(m), idle = mx.clipAction(await heroClip(h.idle, m)); idle.play(); mixers.push(mx);
   const moves = await Promise.all(h.moves.map(n => heroClip(n, m).catch(() => null)));
   const once = moves.filter(Boolean).map(c => { const x = mx.clipAction(c); x.setLoop(T.LoopOnce, 1); x.clampWhenFinished = true; return x; });
   mx.addEventListener('finished', e => { if (e.action !== idle) { idle.reset().play(); e.action.crossFadeTo(idle, .5, false); } });
   const next = () => setTimeout(() => { const x = once[Math.floor(Math.random() * once.length)]; if (x && p.visible) { x.reset().play(); idle.crossFadeTo(x, .5, false); } next(); }, 9000 + Math.random() * 12000);
   if (once.length) next();
  }).catch(e => console.warn('hero', h.id, e));
 }
 if (!people.length) return null;
 let t0 = performance.now();
 (function frame(now) { requestAnimationFrame(frame); const dt = Math.min(.1, ((now || t0) - t0) / 1000); t0 = now || t0; mixers.forEach(mx => mx.update(dt)); })();
 town.heroes = people;
 return {people};
}
