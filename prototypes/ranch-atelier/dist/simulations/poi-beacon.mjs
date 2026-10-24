// Big pulsing spotlights for places that matter (Issue #531): a tall column of light, rings that swell out of the ground and a
// glow on the floor, sized by how far the camera is, so a place you are meant to go to can be seen from anywhere on the board.
//   const beacons = createPoiBeacons({THREE, scene, camera});
//   beacons.set('cafe', {x, y, z}, {colour: '#ffd23f', radius: 6});   // light it (call again to move or recolour it)
//   beacons.remove('cafe'); beacons.clear();
//   beacons.update(dt)                                                  // every frame
// Presentation layer: a beacon is a cue drawn for the player (presentation-layer.mjs), so characters, the simulation and the voice
// controller's `look` never see it. It is additive light and cannot be tapped, so it never masks the ground or blocks a tap.
import {presentation, playerCamera} from './presentation-layer.mjs';

export const MIN_SCREEN = 0.06; // a beacon's footprint radius is never smaller than this share of the view height, at any zoom

const columnMat = colour => ({
 uniforms: {uC: {value: null}, uT: {value: 0}, uA: {value: 1}},
 vertexShader: 'varying vec2 v; void main(){ v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
 fragmentShader: 'uniform vec3 uC; uniform float uT,uA; varying vec2 v; void main(){ float core=pow(1.-abs(v.x-.5)*2.,1.6); float rise=.7+.3*sin(v.y*18.-uT*5.); float fade=pow(1.-v.y,.55); gl_FragColor=vec4(uC*(.5+core),(core*.8+.18)*rise*fade*uA); }'
});

export function createPoiBeacons({THREE: T, scene, camera}) {
 if (camera) playerCamera(camera);
 const root = new T.Group(); root.name = 'poi-beacons'; presentation(root, {purpose: 'cue'}); scene.add(root);
 const items = new Map();
 const noRay = o => { o.raycast = () => {}; return o; };
 const additive = (colour, opacity, depthTest = true) => new T.MeshBasicMaterial({color: colour, transparent: true, opacity, side: T.DoubleSide, depthWrite: false, depthTest, blending: T.AdditiveBlending});

 function build(id, colour) {
  const g = new T.Group(); g.name = 'poi-beacon-' + id;
  const spec = columnMat(colour), mat = new T.ShaderMaterial({...spec, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide});
  mat.uniforms.uC.value = new T.Color(colour);
  const column = noRay(new T.Mesh(new T.CylinderGeometry(.55, 1, 1, 24, 1, true), mat)); column.position.y = .5; column.renderOrder = 8;
  const floor = noRay(new T.Mesh(new T.CircleGeometry(1, 40), additive(colour, .4, false))); floor.rotation.x = -Math.PI / 2; floor.position.y = .15; floor.renderOrder = 9;
  const rings = [0, 1, 2].map(() => { const r = noRay(new T.Mesh(new T.RingGeometry(.88, 1, 48), additive(colour, .9, false))); r.rotation.x = -Math.PI / 2; r.position.y = .2; r.renderOrder = 10; return r; });
  g.add(column, floor, ...rings); presentation(g, {purpose: 'cue'}); root.add(g);
  return {g, mat, column, floor, rings, colour, radius: 6, p: new T.Vector3(), phase: Math.random() * 6};
 }

 let t = 0;
 return {
  root, items,
  set(id, p, {colour = '#ffd23f', radius = 6} = {}) {
   let b = items.get(id);
   if (b && b.colour !== colour) { root.remove(b.g); b.g.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); items.delete(id); b = null; }
   if (!b) items.set(id, b = build(id, colour));
   b.radius = radius; b.p.set(p.x, p.y, p.z); b.g.position.copy(b.p); b.g.visible = true; return b;
  },
  remove(id) { const b = items.get(id); if (!b) return; root.remove(b.g); b.g.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); items.delete(id); },
  clear() { for (const id of [...items.keys()]) this.remove(id); },
  // lit from far or near: the footprint grows with the camera's distance so it never shrinks below MIN_SCREEN of the view
  scaleFor(b) { const d = camera ? camera.position.distanceTo(b.g.position) : 60, fov = (camera?.fov || 45) * Math.PI / 180; return Math.max(b.radius, MIN_SCREEN * 2 * d * Math.tan(fov / 2)); },
  update(dt = .016) {
   t += dt;
   for (const b of items.values()) {
    if (!b.g.visible) continue;
    const r = this.scaleFor(b), pulse = .5 + .5 * Math.sin(t * 2.4 + b.phase);
    b.column.scale.set(r * .9, r * 14, r * .9); b.column.position.y = r * 7; b.mat.uniforms.uT.value = t; b.mat.uniforms.uA.value = .65 + .35 * pulse;
    b.floor.scale.setScalar(r * (1.5 + .12 * pulse)); b.floor.material.opacity = .22 + .28 * pulse;
    b.rings.forEach((ring, i) => { const k = (t * .55 + i / 3 + b.phase) % 1; ring.scale.setScalar(r * (.6 + 2.6 * k)); ring.material.opacity = .9 * (1 - k) * (1 - k); });
   }
  },
  dispose() { this.clear(); root.removeFromParent(); }
 };
}
