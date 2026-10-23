import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {applyLook, LOOKS} from '../look-set.mjs';
import {createOrb} from '../orb-kit.mjs';

const bone = new T.Bone(), skel = new T.Skeleton([bone]);
const g = new T.BoxGeometry(.4, 1.8, .3), n = g.attributes.position.count;
g.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Array(n * 4).fill(0), 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, i) => i % 4 ? 0 : 1), 4));
const map = new T.Texture();
const body = new T.SkinnedMesh(g, new T.MeshStandardMaterial({name: 'suit', map})); body.add(bone); body.bind(skel);
const props = new T.Mesh(new T.BoxGeometry(1, 1, 1), [new T.MeshStandardMaterial({name: 'a'}), new T.MeshStandardMaterial({name: 'b'})]);
const root = new T.Group(); root.add(body, props);
const scene = new T.Scene(); scene.background = new T.Color('#112233');
const before = [body.material, props.material];

for (const name of Object.keys(LOOKS)) {
 const L = applyLook(T, root, name, {scene, lantern: new T.Vector3(0, 2, 0)});
 assert.ok(body.material.isShaderMaterial && body.material.uniforms.uMap.value === map, `${name}: keeps the part's map`);
 assert.ok(Array.isArray(props.material) && props.material.every(m => m.userData.look), `${name}: material arrays`);
 if (LOOKS[name].ink > 0) assert.ok(L.hulls.some(h => h.isSkinnedMesh && h.skeleton === skel), `${name}: ink shell on the same skeleton`);
 L.restore();
 assert.deepEqual([body.material, props.material], before, `${name}: restore`);
}

// inkpaper: the `telling` signal fades the page in, and 0 gives the world back
const L = applyLook(T, root, 'inkpaper', {scene, signal: 0});
assert.equal(body.material, before[0], 'signal 0 leaves the world as it was');
assert.equal(scene.background.getHexString(), '112233');
L.set(.5); assert.ok(body.material.isShaderMaterial); assert.equal(body.material.uniforms.uWash.value, .5);
L.set(1); assert.equal(scene.background.getHexString(), new T.Color(LOOKS.inkpaper.bg).getHexString());
L.set(0); assert.equal(body.material, before[0]); L.restore();

// dusk: the lantern flickers in 12 fps steps
const D = applyLook(T, root, 'dusk', {lantern: new T.Vector3(1, 2, 3)});
const a = D.update(1.0), b = D.update(1.0 + 1 / 30), c = D.update(1.0 + 2 / 12);
assert.equal(a, b); assert.notEqual(a, c); assert.deepEqual(D.U.uPointPos.value.toArray(), [1, 2, 3]); D.restore();

// onebit snaps on past half
const O = applyLook(T, root, 'onebit', {signal: .3}); assert.equal(O.U.uOneBit.value, 0); O.set(.8); assert.equal(O.U.uOneBit.value, 1); O.restore();
assert.throws(() => applyLook(T, root, 'nope'));

// orb: a tiny world inside the glass, grown to full size on enter and shrunk back on leave
const world = new T.Group(); world.add(new T.Mesh(new T.BoxGeometry(12, 4, 12), new T.MeshBasicMaterial()));
let inside = 0, outside = 0;
const orb = createOrb(T, {world, radius: .6, onInside: () => inside++, onOutside: () => outside++});
orb.update(0, 0);
assert.ok(orb.holder.scale.x < .1 && orb.glass.visible, 'the world starts tiny inside the glass');
orb.enter(); for (let i = 0; i < 100; i++) orb.update(.05, i * .05);
assert.equal(orb.state, 'inside'); assert.equal(inside, 1); assert.equal(orb.holder.scale.x, 1); assert.ok(!orb.glass.visible);
orb.leave(); for (let i = 0; i < 100; i++) orb.update(.05, 5 + i * .05);
assert.equal(orb.state, 'idle'); assert.equal(outside, 1); assert.ok(orb.holder.scale.x < .1 && orb.glass.visible);
orb.enter(); orb.update(.7); orb.leave(); assert.equal(orb.state, 'leaving', 'can change your mind mid-step');
orb.dispose();
console.log('look-set ok');
