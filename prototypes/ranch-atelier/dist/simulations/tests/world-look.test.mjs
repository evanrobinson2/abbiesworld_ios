import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {worldLook, WORLD_LOOKS, mountWorldLookPanel} from '../world-look.mjs';

const scene = new T.Scene();
const box = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial());
const inst = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial(), 4);
const glass = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({transparent: true}));
scene.add(box, inst, glass);
const wash = {enabled: true};
const WL = worldLook(T, {scene, wash});
assert.equal(WL.id, 'storybook'); assert.equal(wash.enabled, true); assert.equal(WL.hulls.length, 0);
assert.ok(!box.material.userData.toon);

WL.set('sunday'); assert.ok(box.material.userData.toon && inst.material.userData.toon); assert.equal(wash.enabled, false); assert.equal(WL.hulls.length, 0);
WL.set('comic-ink'); assert.equal(WL.hulls.length, 2, 'box and instanced box get a shell, glass does not');
assert.ok(WL.hulls.find(h => h.isInstancedMesh).instanceMatrix === inst.instanceMatrix, 'the shell follows the instances');
assert.ok(box.children.some(c => c.userData.ink));
WL.set('storybook'); assert.equal(WL.hulls.length, 0); assert.ok(!box.material.userData.toon && !box.material.userData.toonPrev); assert.equal(wash.enabled, true);
assert.equal(box.children.length, 0);
assert.throws(() => WL.set('nope'));
assert.deepEqual(WL.list.map(l => l.name), Object.values(WORLD_LOOKS).map(l => l.name));
assert.equal(mountWorldLookPanel(WL, {isDev: () => false}), null, 'no panel for players');
WL.dispose();
console.log('world-look ok');
