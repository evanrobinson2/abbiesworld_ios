import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {handDrawn, handDrawnClock, stepMixer, HAND_DRAWN} from '../hand-drawn.mjs';

// the clock holds each drawing for a twelfth of a second
const c = handDrawnClock({fps: 12});
const a = c.tick(10), b = c.tick(10 + 1 / 30), d = c.tick(10 + 1 / 12 + .001);
assert.equal(a.t, b.t, 'two film frames are one drawing');
assert.ok(a.changed && !b.changed && d.changed, 'changed is true on a new drawing only');
assert.ok(Math.abs(d.t - 1 / 12) < 1e-9, 'time moves in steps of a twelfth');

// hit-stop: the picture freezes, then plays on from where it stopped (the held time is not played back)
const h = handDrawnClock({fps: 12});
h.tick(0); const before = h.tick(.5); h.hold(.3, .5);
const during = h.tick(.7), after = h.tick(.9);
assert.equal(during.t, before.t, 'frozen while held');
assert.ok(after.t - before.t < .15, 'the held time is not played back');
c.fps = 24; assert.equal(c.fps, 24);

// the look swaps onto a figure, with the pen redrawn per drawing
const root = new T.Group(); root.add(new T.Mesh(new T.BoxGeometry(.4, 1.8, .3), new T.MeshStandardMaterial({name: 'suit'})));
const H = handDrawn(T, root);
const m = root.children[0].material;
assert.ok(m.isShaderMaterial && m.userData.paintedBrush);
assert.equal(m.uniforms.uBands.value, HAND_DRAWN.bands, 'two hard bands');
assert.equal(H.hulls.length, 1, 'one pen line');
const u0 = H.U.uFrame.value; H.tick(0); H.tick(1); assert.notEqual(H.U.uFrame.value, u0, 'the drawing counter reaches the shader');
assert.equal(H.brush.ink.uBoil.value, HAND_DRAWN.boil);
H.set({boil: 0, grain: 0}); assert.equal(H.brush.ink.uBoil.value, 0); assert.equal(H.U.uGrain.value, 0);

// stepped camera: holds the view between drawings, gives the live camera back
const cam = new T.PerspectiveCamera(); cam.position.set(0, 0, 5);
const seen = []; const R = {render: (s, c) => seen.push(c.position.x), compile() {}};
H.set({camera: 'stepped'});
H.render(R, root, cam, {changed: true}); cam.position.x = 3; H.render(R, root, cam, {changed: false});
assert.deepEqual(seen, [0, 0], 'the camera is held between drawings'); assert.equal(cam.position.x, 3, 'and returned afterwards');
H.render(R, root, cam, {changed: true}); assert.equal(seen[2], 3, 'a new drawing takes the new view');
H.restore(); assert.ok(root.children[0].material.isMeshStandardMaterial);
// stepMixer: a 60 fps game moves the pose only on each twelfth of a second
const calls = []; const mx = {update(dt) { calls.push(dt); return this; }};
const undo = stepMixer(mx, 12); for (let i = 0; i < 12; i++) mx.update(1 / 60);
assert.equal(calls.length, 2, 'six game frames per drawing'); assert.ok(Math.abs(calls[0] - 1 / 10) < .001 || Math.abs(calls[0] - 1 / 12) < .02);
mx.update(0); assert.equal(calls.length, 2, 'a hit-stop (dt 0) holds the pose');
undo(); mx.update(.01); assert.equal(calls.length, 3, 'undo gives the mixer back');
console.log('hand-drawn ok');
