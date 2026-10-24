// Glowing gridlines on the hexes (Evan, 2026-10-23: "this third hex widget should draw gridlines that glow on the hex").
// Draws each hex's edge as a soft ribbon of light lying on the ground, following the land, pulsing slowly. Tiles create the
// world, so this is the tile grid made visible while you are placing or looking at them; it is a presentation aid, not
// scenery: the group is named and tagged 'presentation' and nothing in the simulation or the bots looks at it.
//   const glow = hexGlow(AbbieTown.stage, AbbieTown.board.hexSide);   glow.toggle(on?)  glow.on
// The stage gives THREE, scene, tiles ({id: {centre, hf(px,py)}}) and frame(fn); the same lattice paint-world uses.
const SAMPLE = 3.5, LIFT = .9, WIDTH = 7;

export function hexGlow(stage, R, {colour = 0xffe08a} = {}) {
  const {THREE: T, scene, tiles} = stage;
  const group = new T.Group(); group.name = 'presentation:hex-glow'; group.userData.layer = 'presentation'; group.visible = false;
  const pos = [], col = [], idx = [], seen = new Set();
  const heightAt = (wx, wz) => { for (const t of Object.values(tiles)) { const px = wx - t.centre.x, py = -(wz - t.centre.z); if (Math.abs(py) <= R * .866 && Math.abs(px) <= R - Math.abs(py) / 1.732) { const h = t.hf(px, py); if (Number.isFinite(h)) return h; } } return null; };
  for (const t of Object.values(tiles)) {
    const c = t.centre, V = Array.from({length: 6}, (_, i) => [c.x + Math.cos(i * Math.PI / 3) * R * .997, c.z - Math.sin(i * Math.PI / 3) * R * .997]);
    for (let i = 0; i < 6; i++) {
      const [ax, az] = V[i], [bx, bz] = V[(i + 1) % 6], key = [Math.round((ax + bx) / 2), Math.round((az + bz) / 2)].join(',');
      if (seen.has(key)) continue; seen.add(key); // two hexes share an edge: draw it once
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(len / SAMPLE)), dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz, nz = dx;
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n, h = heightAt(x, z);
        const y = h == null ? (prev?.y ?? 0) : h + LIFT, base = pos.length / 3;
        // three vertices across the ribbon: the middle bright, the edges black, so additive blending fades it to a glow
        for (const [s, v] of [[-WIDTH / 2, 0], [0, 1], [WIDTH / 2, 0]]) { pos.push(x + nx * s, y, z + nz * s); col.push(v, v, v); }
        if (prev) idx.push(prev.base, prev.base + 1, base, prev.base + 1, base + 1, base, prev.base + 1, prev.base + 2, base + 1, prev.base + 2, base + 2, base + 1);
        prev = {base, y};
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  const mat = new T.MeshBasicMaterial({color: colour, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide});
  const mesh = new T.Mesh(geo, mat); mesh.renderOrder = 9; mesh.frustumCulled = false; group.add(mesh); scene.add(group);
  const base = new T.Color(colour); let t0 = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.frame(dt => { if (!group.visible) return; t0 += dt; const k = reduce ? .8 : .72 + .28 * Math.sin(t0 * 2.1); mat.color.copy(base).multiplyScalar(k * 1.6); });
  const api = {group, get on() { return group.visible; }, toggle(on = !group.visible) { group.visible = !!on; dispatchEvent(new CustomEvent('aw-hex-glow', {detail: {on: group.visible}})); return group.visible; }};
  return api;
}
