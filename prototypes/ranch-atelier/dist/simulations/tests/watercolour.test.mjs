import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {WASH_ZONES, WASH_CONTROLS, washAt, zoneParams, mixZones, watercolourDistance} from '../watercolour-distance.mjs';

// the five zones: the three regions of Winchester, the pulled-back trio and the real town
for (const id of ['downtown', 'anis-side', 'abbie-daddy-side', 'trio', 'real']) assert.ok(WASH_ZONES[id], id);
for (const [id, z] of Object.entries(WASH_ZONES)) {
 assert.ok(z.end > z.start && z.max > 0 && z.max <= .85, id + ': wash never covers the world');
 for (const k of Object.keys(WASH_CONTROLS)) assert.ok(z[k] >= WASH_CONTROLS[k].min && z[k] <= WASH_CONTROLS[k].max, id + '.' + k + ' is inside its control range');
 assert.equal(washAt(z.start - 1, z), 0, id + ': clear before start');
 let prev = -1; for (let d = 0; d <= z.end * 2; d += z.end / 50) { const w = washAt(d, z); assert.ok(w >= prev - 1e-9, id + ': falloff only grows'); prev = w; }
 assert.ok(Math.abs(washAt(z.end * 3, z) - z.max) < 1e-9, id + ': tops out at max');
}
assert.notEqual(WASH_ZONES.downtown.wash, WASH_ZONES['anis-side'].wash, 'each zone has its own wash colour');

// mixing: numbers lerp, colours stay hex and never pass through grey for warm to cool
const a = zoneParams('downtown'), b = zoneParams('anis-side'), m = mixZones(a, b, .5);
assert.ok(Math.abs(m.blur - (a.blur + b.blur) / 2) < 1e-9); assert.match(m.wash, /^#[0-9a-f]{6}$/);
assert.equal(mixZones(a, b, 0).wash, a.wash); assert.equal(mixZones(a, b, 1).wash, b.wash);
assert.equal(zoneParams('nope').max, 0, 'unknown zones are off');

// the pass: tune clamps, off costs nothing, every uniform the code sets is declared by the shader
const fake = {capabilities: {logarithmicDepthBuffer: true}, getPixelRatio: () => 1, getDrawingBufferSize: v => v.set(8, 8)};
const W = watercolourDistance(T, fake, {zone: 'downtown'});
assert.equal(W.zone, 'downtown'); assert.ok(W.active());
W.tune({bleed: 99, blur: -4, wash: '#112233'}); assert.equal(W.target.bleed, WASH_CONTROLS.bleed.max); assert.equal(W.target.blur, 0); assert.equal(W.target.wash, '#112233');
W.setZone('off'); for (let i = 0; i < 400; i++) W.update(.05); assert.ok(!W.active(), 'off settles to no wash, and then render() draws directly');
W.setZone('anis-side'); for (let i = 0; i < 400; i++) W.update(.05); assert.ok(Math.abs(W.live.max - WASH_ZONES['anis-side'].max) < 1e-3 && W.active());
let drawn = 0; const spy = {...fake, render: () => drawn++}; const W2 = watercolourDistance(T, spy, {zone: 'downtown'});
W2.render({}, {}); assert.equal(drawn, 1, 'until compiled, the scene draws directly'); assert.equal(W2.compiled, false);
console.log('watercolour: ok');
