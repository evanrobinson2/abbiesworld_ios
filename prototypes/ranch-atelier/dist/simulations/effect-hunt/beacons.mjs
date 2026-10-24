// Laser beacons: one tall pulsing beam over every hidden effect, only while the hunt is the selected mission. A beam is
// world-layer light (the town's own glow), so it is drawn additively and never masks the ground; the ring on the ground
// is what you drive into. Collected effects pop with a ring burst and the beam fades out.
import * as T from 'three';

const beamMat = colour => new T.ShaderMaterial({
 transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
 uniforms: {uC: {value: new T.Color(colour)}, uT: {value: 0}, uA: {value: 1}},
 vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
 fragmentShader: 'uniform vec3 uC; uniform float uT,uA; varying vec2 v; void main(){ float core=pow(1.-abs(v.x-.5)*2.,2.2); float pulse=.65+.35*sin(v.y*40.-uT*6.); float fade=pow(1.-v.y,.7); gl_FragColor=vec4(uC*(.35+core),(core*.85+.1)*pulse*fade*uA); }'
});

// `camera` makes them big enough to see: each beacon's footprint grows with the camera's distance (never under 6% of the view
// height) and its ground glow pulses, so a place to drive to reads from the whole board, not only up close (Issue #531).
export function createBeacons({scene, effects, place, camera = null, height = 420, radius = 2.4}) {
 const root = new T.Group(); root.name = 'effect-beacons'; scene.add(root);
 const items = new Map();
 for (const e of effects) {
  const p = place(e), g = new T.Group(); g.position.set(p.x, p.y, p.z);
  const m = beamMat(e.colour);
  const beam = new T.Mesh(new T.CylinderGeometry(radius * .35, radius, height, 12, 1, true), m); beam.position.y = height / 2;
  const ring = new T.Mesh(new T.RingGeometry(radius * 3.2, radius * 4, 40), new T.MeshBasicMaterial({color: e.colour, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending}));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .25;
  const gem = new T.Mesh(new T.OctahedronGeometry(radius * 1.1, 0), new T.MeshStandardMaterial({color: e.colour, emissive: e.colour, emissiveIntensity: 1.2, flatShading: true})); gem.position.y = radius * 3;
  for (const o of [beam, ring, gem]) o.raycast = () => {};
  const glow = new T.Mesh(new T.CircleGeometry(radius * 4.4, 40), new T.MeshBasicMaterial({color: e.colour, transparent: true, opacity: .3, side: T.DoubleSide, depthWrite: false, depthTest: false, blending: T.AdditiveBlending}));
  glow.rotation.x = -Math.PI / 2; glow.position.y = .2; glow.renderOrder = 9; glow.raycast = () => {}; ring.material.depthTest = false; ring.renderOrder = 10;
  g.add(beam, ring, gem, glow); root.add(g);
  items.set(e.id, {e, g, m, ring, gem, glow, p, dead: 0});
 }
 let t = 0, on = true; const P = new T.Vector3(), S = new T.Vector3();
 return {
  root, items,
  set(v) { on = !!v; root.visible = on; },
  remove(id) { const b = items.get(id); if (b && !b.dead) b.dead = .0001; },
  restore(foundSet) { for (const [id, b] of items) if (foundSet.has(id)) { b.dead = 1; b.g.visible = false; } },
  update(dt) {
   t += dt;
   for (const b of items.values()) {
    if (camera && b.g.visible) { // grow with distance, measured in the world (the board may be scaled)
     const wp = b.g.getWorldPosition(P), ws = b.g.parent.getWorldScale(S).x || 1, view = 2 * camera.position.distanceTo(wp) * Math.tan((camera.fov || 45) * Math.PI / 360);
     b.g.scale.setScalar(Math.max(1, .06 * view / ws / (radius * 3.2)));
    }
    b.glow.material.opacity = (.2 + .2 * Math.sin(t * 2.4 + b.p.x)) * (b.dead ? 1 - b.dead : 1);
    b.m.uniforms.uT.value = t; b.gem.rotation.y = t * 1.6; b.gem.position.y = 3.3 + Math.sin(t * 2 + b.p.x) * .35;
    b.ring.scale.setScalar(1 + .06 * Math.sin(t * 3 + b.p.z));
    if (b.dead > 0 && b.dead < 1) { b.dead = Math.min(1, b.dead + dt * 1.6); const k = 1 - b.dead; b.m.uniforms.uA.value = k; b.ring.scale.setScalar(1 + b.dead * 5); b.ring.material.opacity = .8 * k; b.gem.scale.setScalar(k + .001); if (b.dead >= 1) b.g.visible = false; }
   }
  },
  nearest(x, z, r) { let best = null, bd = r * r; for (const b of items.values()) { if (b.dead) continue; const d = (b.p.x - x) ** 2 + (b.p.z - z) ** 2; if (d < bd) { bd = d; best = b.e; } } return best; }
 };
}
