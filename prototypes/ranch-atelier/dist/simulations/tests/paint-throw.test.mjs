// #548: a thrown paint ball must start where the finger meets the ground it sees, not on a flat plane at the camera target's height.
import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
// paint-balls.mjs imports the bare 'three'; the game maps it through an import map, so map it here to the vendored copy.
const three = new URL('../vendor/three.module.js', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? {url: ${JSON.stringify(three)}, shortCircuit: true} : n(s, c); }`));
const T = await import(three);
const {groundThrow} = await import('../paint-world/paint-balls.mjs');

const canvas = {getBoundingClientRect: () => ({left: 0, top: 0, width: 800, height: 600})};
const hill = (x, z) => 30 + 0.12 * x + 0.05 * z; // a sloping ground, tens of units above the camera target's plane
function view() {
  const camera = new T.PerspectiveCamera(40, 800 / 600, 1, 5000); camera.position.set(400, 500, 500); const target = new T.Vector3(0, 0, 0); camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  return {camera, target};
}
test('release lands on the ground under the finger on a tilted camera', () => {
  const {camera, target} = view();
  for (const [px, py] of [[400, 300], [200, 400], [620, 250]]) {
    const g = groundThrow(T, camera, canvas, target, px, py, 0, 0, hill);
    const ndc = new T.Vector3((px / 800) * 2 - 1, -((py / 600) * 2 - 1), 0.5).unproject(camera);
    const dir = ndc.sub(camera.position).normalize(), u = (hill(g.x, g.z) - camera.position.y) / dir.y, P = camera.position.clone().addScaledVector(dir, u);
    assert.ok(Math.hypot(P.x - g.x, P.z - g.z) < 0.05, `the ray meets the ground at ${P.x.toFixed(2)}, ${P.z.toFixed(2)} but the ball starts at ${g.x.toFixed(2)}, ${g.z.toFixed(2)}`);
  }
});
test('without heightAt the old plane is off by a lot, which is the bug', () => {
  const {camera, target} = view(), old = groundThrow(T, camera, canvas, target, 400, 300, 0, 0), fixed = groundThrow(T, camera, canvas, target, 400, 300, 0, 0, hill);
  assert.ok(Math.hypot(old.x - fixed.x, old.z - fixed.z) > 20);
});
test('off the board (NaN ground) it keeps the flat-plane point', () => {
  const {camera, target} = view(), a = groundThrow(T, camera, canvas, target, 400, 300, 0, 0), b = groundThrow(T, camera, canvas, target, 400, 300, 0, 0, () => NaN);
  assert.deepEqual([a.x, a.z], [b.x, b.z]);
});
