import * as T from 'three';

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
    stats = {instances: 0, batches: 0};
    try {
      for (const [key,b] of batches) {
        const count = b.sources.length;
        if (count < 2) { disposeBatch(b); batches.delete(key); continue; }
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
      scene.add(container);
      return render();
    } finally {
      container.removeFromParent();
      for (const o of hidden) o.visible=true;
      hidden.length=0;
    }
  }
  return {draw, get stats(){return stats;}, dispose(){for(const b of batches.values())disposeBatch(b);batches.clear();container.removeFromParent();}};
}
