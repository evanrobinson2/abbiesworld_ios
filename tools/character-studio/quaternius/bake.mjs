// Bakes Quaternius's Universal Animation Library (CC0, prototypes/ranch-atelier/dist/animation-study-assets/) into the
// Character Studio's motion format, the same one retarget.py writes for CMU capture: per frame, each studio bone's turn
// in character space from our rest A-pose (pose.q), plus root [x, lift, z] in hip heights.
//   q = D * A2T    D = the bone's world turn at that frame against the rig's bind pose;
//                  A2T = our rest direction for that limb onto the rig's bind direction (limbs only)
// In-place loops (Walk_Loop, Jog_Fwd_Loop...) carry no travel, so their speed is measured from the planted foot: the
// stage then moves the body at exactly that speed and the feet stay put. Lift (root y) is only written for clips that
// really leave the ground ("air": true); otherwise the stage's own grounding rests the lowest limb on the floor, so a
// roll's raised feet don't hoist the body into the air.
//   node tools/character-studio/quaternius/bake.mjs     (serve prototypes/ranch-atelier/dist on :8765 first)
// Reads clips.json beside this file; writes studies/character-studio/mocap/q-<move>.json and adds them to index.json
// ("install": false marks a candidate, kept for side-by-side review against the CMU take but not played by a tile).
import {chromium} from 'playwright';
import {readFileSync, writeFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../../prototypes/ranch-atelier/dist/studies/character-studio/mocap');
const clips = JSON.parse(readFileSync(join(here, 'clips.json'), 'utf8'));
const base = process.argv[2] || 'http://localhost:8765/';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage();
page.on('console', m => console.log('page:', m.text()));
// a blank page with the site's import map, so GLTFLoader finds three
await page.route(base + '__bake.html', r => r.fulfill({contentType: 'text/html',
 body: `<!doctype html><script type="importmap">{"imports":{"three":"${base}vendor/three.module.js"}}</script>`}));
await page.goto(base + '__bake.html');
const baked = await page.evaluate(async ({clips, base}) => {
 const T = await import(base + 'vendor/three.module.js');
 const {GLTFLoader} = await import(base + 'vendor/loaders/GLTFLoader.js');
 const J = await fetch(base + 'studies/character-studio/models/rest-joints.json').then(r => r.json());
 const gltf = await new GLTFLoader().loadAsync(base + 'animation-study-assets/AnimationLibrary_Godot_Standard.gltf');
 const scene = gltf.scene; scene.updateMatrixWorld(true);
 const MAP = {hips: 'DEF-hips', spine: 'DEF-spine001', chest: 'DEF-spine003', neck: 'DEF-neck', head: 'DEF-head',
  clavicle_L: 'DEF-shoulderL', upperarm_L: 'DEF-upper_armL', forearm_L: 'DEF-forearmL', hand_L: 'DEF-handL',
  clavicle_R: 'DEF-shoulderR', upperarm_R: 'DEF-upper_armR', forearm_R: 'DEF-forearmR', hand_R: 'DEF-handR',
  thigh_L: 'DEF-thighL', shin_L: 'DEF-shinL', foot_L: 'DEF-footL', thigh_R: 'DEF-thighR', shin_R: 'DEF-shinR', foot_R: 'DEF-footR'};
 // limb -> the rig bone its direction is measured to, and our joints for the same limb
 const AIM = {upperarm: ['DEF-forearm', 's', 'e'], forearm: ['DEF-hand', 'e', 'w'], hand: ['DEF-f_middle01', 'w', 'f'],
  thigh: ['DEF-shin', 'h', 'k'], shin: ['DEF-foot', 'k', 'a'], foot: ['DEF-toe', 'a', 't']};
 const BONES = Object.keys(MAP);
 const byName = {}; scene.traverse(o => { byName[o.name] = o; });
 const get = n => byName[n] || byName[n.replace('.', '')] || (() => { throw new Error('no bone ' + n); })();
 const wq = o => o.getWorldQuaternion(new T.Quaternion()), wp = o => o.getWorldPosition(new T.Vector3());
 const v = k => new T.Vector3(...J[k]);
 // bind pose
 const G0 = {}, A2T = {};
 for (const b of BONES) G0[b] = wq(get(MAP[b]));
 for (const b of BONES) {
  const m = /^(upperarm|forearm|hand|thigh|shin|foot)_(L|R)$/.exec(b); if (!m) continue;
  const [child, ja, jb] = AIM[m[1]], s = m[2];
  const theirs = wp(get(child + s)).sub(wp(get(MAP[b]))).normalize(), ours = v(jb + s).sub(v(ja + s)).normalize();
  A2T[b] = new T.Quaternion().setFromUnitVectors(ours, theirs);
 }
 const toeY0 = Math.min(wp(get('DEF-toeL')).y, wp(get('DEF-toeR')).y), footY0 = Math.min(wp(get('DEF-footL')).y, wp(get('DEF-footR')).y);
 const hipH = wp(get('DEF-hips')).y - toeY0;
 const mixer = new T.AnimationMixer(scene), results = {};
 for (const [move, spec] of Object.entries(clips)) {
  const clip = gltf.animations.find(a => a.name === spec.clip);
  if (!clip) { console.log('missing clip ' + spec.clip); continue; }
  mixer.stopAllAction(); const act = mixer.clipAction(clip); act.reset().play();
  const from = spec.from || 0, to = Math.min(spec.to || clip.duration, clip.duration), n = Math.max(2, Math.round((to - from) * 30));
  const raw = [];
  for (let i = 0; i < n; i++) {
   mixer.setTime(from + i / 30); scene.updateMatrixWorld(true);
   const D = {}; for (const b of BONES) D[b] = wq(get(MAP[b])).multiply(G0[b].clone().invert());
   raw.push({D, hip: wp(get('DEF-hips')), feet: ['L', 'R'].map(s => ({ankle: wp(get('DEF-foot' + s)), toe: wp(get('DEF-toe' + s))}))});
  }
  // heading: the way the hips face on average (these clips are authored facing +Z)
  const fw = new T.Vector3(); for (const f of raw) fw.add(new T.Vector3(0, 0, 1).applyQuaternion(f.D.hips));
  const yaw = Math.atan2(fw.x, fw.z) + (spec.yaw || 0) * Math.PI / 180, Y = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), -yaw);
  const h0 = raw[0].hip.clone(), lin = spec.loop && raw.length > 1 ? raw[n - 1].hip.clone().sub(h0).setY(0).multiplyScalar(1 / (n - 1)) : new T.Vector3();
  const frames = raw.map((f, i) => {
   const q = BONES.map(b => { const m = Y.clone().multiply(f.D[b]).multiply(A2T[b] || new T.Quaternion()); return [m.x, m.y, m.z, m.w].map(x => +x.toFixed(4)); });
   const r = f.hip.clone().sub(h0).sub(lin.clone().multiplyScalar(i)).applyQuaternion(Y);
   const foot = Math.min(...f.feet.map(t => Math.min(t.ankle.y - footY0, t.toe.y - toeY0)));
   return [...q, [+(r.x / hipH).toFixed(3), spec.air ? +Math.max(0, foot / hipH - .03).toFixed(3) : 0, +(r.z / hipH).toFixed(3)]];
  });
  // travel speed for in-place cycles: how fast the planted foot slides back (hip heights a second)
  let speed = 0;
  if (spec.travel) {
   // the stance foot (the lower one) slides back as far as the body would travel: add up its backward steps
   let back = 0;
   for (let i = 1; i < n; i++) {
    const s = raw[i].feet[0].ankle.y <= raw[i].feet[1].ankle.y ? 0 : 1;
    const a = raw[i - 1].feet[s].ankle.clone().applyQuaternion(Y), c = raw[i].feet[s].ankle.clone().applyQuaternion(Y);
    back += -(c.z - a.z);
   }
   speed = Math.max(0, back / ((n - 1) / 30) / hipH) + lin.length() * 30 / hipH;
  }
  results[move] = {clip: spec.clip, loop: !!spec.loop, seconds: +(n / 30).toFixed(2), speed: +speed.toFixed(3), frames};
 }
 return {results, bones: BONES};
}, {clips, base});
const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'));
for (const [move, r] of Object.entries(baked.results)) {
 const file = `q-${move}.json`, spec = clips[move];
 writeFileSync(join(out, file), JSON.stringify({source: `Quaternius Universal Animation Library: ${r.clip}`, fps: 30, loop: r.loop, speed: r.speed, frames: r.frames}));
 // a CMU take this replaces stays as cmu_<move>, so the before-and-after page can still play it
 if (index.clips[move] && index.clips[move].by !== 'quaternius') index.clips['cmu_' + move] = {...index.clips[move], candidate: true};
 index.clips[move] = {file, source: r.clip, by: 'quaternius', what: spec.what, ...(spec.install === false ? {candidate: true} : {}), loop: r.loop, seconds: r.seconds, ...(spec.lift ? {lift: spec.lift} : {})};
 console.log(move.padEnd(12), r.clip.padEnd(22), r.seconds + 's', 'speed', r.speed);
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 1));
await browser.close();
