import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {paintBrush, paintedBrushUniforms, updatePaintedBrush, ROLES} from '../painted-brush.mjs';

// A figure of named parts: a skinned suit, a visor that is see-through, and boots with one draw group per part.
const bone = new T.Bone(), skel = new T.Skeleton([bone]);
const geo = () => { const g = new T.BoxGeometry(.4, 1.8, .3); const n = g.attributes.position.count;
 g.setAttribute('skinIndex', new T.Uint16BufferAttribute(new Array(n * 4).fill(0), 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, i) => i % 4 ? 0 : 1), 4)); return g; };
const map = new T.Texture();
const suit = new T.SkinnedMesh(geo(), new T.MeshStandardMaterial({name: 'suit', map, color: '#ffffff'}));
suit.add(bone); suit.bind(skel);
const visor = new T.Mesh(new T.SphereGeometry(.2), new T.MeshStandardMaterial({name: 'visor', transparent: true, opacity: .6}));
const boots = new T.Mesh(new T.BoxGeometry(.3, .2, .3), [new T.MeshStandardMaterial({name: 'boots'}), new T.MeshStandardMaterial({name: 'hair'})]);
const root = new T.Group(); root.add(suit, visor, boots);
const before = [suit.material, visor.material, boots.material];

const B = paintBrush(T, root, {accent: '#ff0000'});
assert.ok(suit.material.isShaderMaterial && suit.material.userData.paintedBrush);
assert.equal(suit.material.uniforms.uMap.value, map, 'each part keeps its own base-colour map');
assert.equal(suit.material.uniforms.uUseMap.value, 1);
assert.equal(suit.material.uniforms.uAccent.value.getHexString(), 'ff0000', 'the accent is the rim colour');
assert.ok(visor.material.transparent && Math.abs(visor.material.uniforms.uOpacity.value - .6) < 1e-6, 'see-through parts stay see-through');
assert.equal(visor.material.uniforms.uPaintK.value, ROLES.visor.paint, 'roles come from material names');
assert.ok(Array.isArray(boots.material) && boots.material.length === 2 && boots.material.every(m => m.userData.paintedBrush), 'material arrays');
assert.equal(boots.material[1].uniforms.uBrushK.value, ROLES.hair.brush);
assert.equal(suit.material.uniforms.uSun, visor.material.uniforms.uSun, 'one light for the whole figure');

// ink: on the skinned suit it is a SkinnedMesh on the same skeleton; none on the see-through visor
const sh = B.hulls.find(h => h.parent === suit);
assert.ok(sh?.isSkinnedMesh && sh.skeleton === skel);
assert.ok(!B.hulls.some(h => h.parent === visor));
assert.ok(B.hulls.some(h => h.parent === boots));

// swapping again does not double up
const again = paintBrush(T, root);
assert.equal(again.hulls.length, 0, 'painting twice adds no second ink line');
again.restore();

// the flicker holds each value for a twelfth of a second
const a = B.update(1.0), b = B.update(1.0 + 1 / 30), c = B.update(1.0 + 2 / 12);
assert.equal(a, b); assert.ok(a >= .82 && a <= 1.18); assert.notEqual(a, c);
const U = paintedBrushUniforms(T, {flicker: 0}); assert.equal(updatePaintedBrush(U, 3.3), 1);

B.restore();
assert.deepEqual([suit.material, visor.material, boots.material], before, 'restore puts the originals back');
assert.equal(suit.children.filter(c => c.userData.ink).length, 0);
console.log('painted-brush ok');
