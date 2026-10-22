import * as T from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';

// Rendering is a view of the authored hierarchy. Keep original objects for rigs,
// picking, physics, persistence and material updates; substitute only during draw.
export function createRenderPool() {
  const batches = new Map(), hidden = [], container = new T.Group();
  container.name = 'Shared asset draw pool';
  let stats = {instances: 0, batches: 0};
  function eligible(o) {
    return o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !o.children.length &&
      !o.morphTargetInfluences && !Array.isArray(o.material) &&
      !o.material.transparent && !o.material.isShaderMaterial &&
      o.matrixWorld.determinant() > 0 &&
      !o.customDepthMaterial && !o.customDistanceMaterial &&
      o.onBeforeRender === T.Object3D.prototype.onBeforeRender &&
      o.onAfterRender === T.Object3D.prototype.onAfterRender;
  }
  function disposeBatch(b) { b.mesh?.removeFromParent(); b.mesh?.dispose(); }
  // Most scenery pieces have a shape of their own, so instancing cannot share them.
  // Pieces that have stayed still for a while are merged per tile and material into
  // one cached mesh; anything that moves drops out and is drawn on its own again.
  const STILL_FRAMES = 30, still = new WeakMap(), merges = new Map();
  function pose(o) {
    const e = o.matrixWorld.elements;let h = 0;
    for (let i = 0; i < 16; i++) h = (h * 31 + e[i]) % 1e12;
    let s = still.get(o);
    if (!s || s.hash !== h) still.set(o, s = {hash: h, frames: 0}); else s.frames++;
    return s;
  }
  function shape(g) {
    let k = g.index ? 'i' : 'n';
    for (const name of Object.keys(g.attributes).sort()) {
      const a = g.attributes[name];
      if (a.isInterleavedBufferAttribute || a.isInstancedBufferAttribute) return null;
      k += '|' + name + a.itemSize + (a.normalized ? 'n' : '') + a.array.constructor.name;
    }
    return Object.keys(g.morphAttributes).length ? null : k;
  }
  function disposeMerge(m) { m.mesh?.removeFromParent(); m.mesh?.geometry.dispose(); }
  function merged(m, sources) {
    let signature = '';
    for (const o of sources) signature += o.id + ':' + still.get(o).hash + ',';
    if (m.signature === signature && m.mesh) return m.mesh;
    disposeMerge(m); m.signature = signature; m.mesh = null;
    const parts = sources.map(o => o.geometry.clone().applyMatrix4(o.matrixWorld));
    const geometry = mergeGeometries(parts, false);
    for (const p of parts) p.dispose();
    if (!geometry) return null;
    geometry.computeBoundingSphere();
    const source = sources[0], mesh = new T.Mesh(geometry, source.material);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = source.castShadow;
    mesh.receiveShadow = source.receiveShadow;
    mesh.layers.mask = source.layers.mask;
    mesh.renderOrder = source.renderOrder;
    return m.mesh = mesh;
  }
  function draw(root, scene, render) {
    for (const b of batches.values()) b.sources.length = 0;
    root.updateWorldMatrix(true, true);
    root.traverseVisible(o => {
      if (!eligible(o)) return;
      const key = [o.geometry.id,o.material.id,o.castShadow,o.receiveShadow,o.layers.mask,o.renderOrder].join(':');
      let b = batches.get(key);
      if (!b) { b = {sources: [], mesh: null, capacity: 0}; batches.set(key,b); }
      b.sources.push(o);
    });
    stats = {instances: 0, batches: 0, merged: 0, merges: 0};
    try {
      const singles = new Map();
      for (const [key,b] of batches) {
        const count = b.sources.length;
        if (count < 2) {
          disposeBatch(b); batches.delete(key);
          const o = b.sources[0], form = o && shape(o.geometry);
          if (!o || !form || pose(o).frames < STILL_FRAMES) continue;
          let tile = o; while (tile.parent && tile.parent !== root) tile = tile.parent;
          const group = [tile.id,o.material.id,o.castShadow,o.receiveShadow,o.layers.mask,o.renderOrder,form].join(':');
          if (!singles.has(group)) singles.set(group, []);
          singles.get(group).push(o);
          continue;
        }
        const source = b.sources[0];
        if (count > b.capacity) {
          disposeBatch(b);
          b.capacity = 2 ** Math.ceil(Math.log2(count));
          b.mesh = new T.InstancedMesh(source.geometry, source.material, b.capacity);
          b.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
          // All source transforms are world matrices; the temporary container is identity.
          b.mesh.matrixAutoUpdate = false;
          b.mesh.frustumCulled = false;
          b.mesh.castShadow = source.castShadow;
          b.mesh.receiveShadow = source.receiveShadow;
          b.mesh.layers.mask = source.layers.mask;
          b.mesh.renderOrder = source.renderOrder;
          container.add(b.mesh);
        }
        b.mesh.count = count;
        for (let i=0;i<count;i++) {
          const o=b.sources[i];
          b.mesh.setMatrixAt(i,o.matrixWorld);
          hidden.push(o); o.visible=false;
        }
        b.mesh.instanceMatrix.needsUpdate=true;
        stats.instances+=count; stats.batches++;
      }
      for (const [group, m] of merges) if (!singles.has(group) || singles.get(group).length < 2) { disposeMerge(m); merges.delete(group); }
      for (const [group, sources] of singles) {
        if (sources.length < 2) continue;
        let m = merges.get(group);
        if (!m) merges.set(group, m = {signature: null, mesh: null});
        let mesh = null;
        try { mesh = merged(m, sources); } catch { mesh = null; }
        if (!mesh) continue;
        if (mesh.parent !== container) container.add(mesh);
        for (const o of sources) { hidden.push(o); o.visible = false; }
        stats.merged += sources.length; stats.merges++;
      }
      scene.add(container);
      return render();
    } finally {
      container.removeFromParent();
      for (const o of hidden) o.visible=true;
      hidden.length=0;
    }
  }
  return {draw, get stats(){return stats;}, dispose(){for(const b of batches.values())disposeBatch(b);batches.clear();for(const m of merges.values())disposeMerge(m);merges.clear();container.removeFromParent();}};
}
