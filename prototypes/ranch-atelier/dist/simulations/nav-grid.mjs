// A small walking grid for a room seen from above (AW-STUDY-0013). Rectangles block it, a character of some radius
// walks round them: A* over the cells, then the path is pulled straight wherever the way is clear.
//
//   const nav = navGrid({minX: -5.7, maxX: 5.7, minZ: -4.7, maxZ: 4.7, cell: .15});
//   nav.block(x0, z0, x1, z1, radius)      // a solid rectangle, grown by the walker's radius
//   nav.path({x, z}, {x, z})               // [{x, z}, ...] (start excluded), or null; the goal is moved to the nearest free cell
//   nav.free(x, z), nav.nearest(x, z), nav.clear(x, z, x2, z2)   // is this free, nearest free spot, is the straight line clear
//   nav.ascii()                            // a picture of the grid for tests
export function navGrid({minX, maxX, minZ, maxZ, cell = .15}) {
  const W = Math.ceil((maxX - minX) / cell), H = Math.ceil((maxZ - minZ) / cell), blocked = new Uint8Array(W * H);
  const ix = x => Math.min(W - 1, Math.max(0, Math.floor((x - minX) / cell))), iz = z => Math.min(H - 1, Math.max(0, Math.floor((z - minZ) / cell)));
  const cx = i => minX + (i + .5) * cell, cz = j => minZ + (j + .5) * cell;
  const inside = (x, z) => x >= minX && x <= maxX && z >= minZ && z <= maxZ;
  const free = (x, z) => inside(x, z) && !blocked[iz(z) * W + ix(x)];
  function block(x0, z0, x1, z1, r = 0) {
    for (let j = iz(Math.min(z0, z1) - r); j <= iz(Math.max(z0, z1) + r); j++) for (let i = ix(Math.min(x0, x1) - r); i <= ix(Math.max(x0, x1) + r); i++) {
      const x = cx(i), z = cz(j);
      if (x >= Math.min(x0, x1) - r - cell * .5 && x <= Math.max(x0, x1) + r + cell * .5 && z >= Math.min(z0, z1) - r - cell * .5 && z <= Math.max(z0, z1) + r + cell * .5) blocked[j * W + i] = 1;
    }
  }
  function unblock(x0, z0, x1, z1) { for (let j = iz(Math.min(z0, z1)); j <= iz(Math.max(z0, z1)); j++) for (let i = ix(Math.min(x0, x1)); i <= ix(Math.max(x0, x1)); i++) blocked[j * W + i] = 0; }
  function nearest(x, z) {
    if (free(x, z)) return {x, z};
    let best = null, bd = 1e9;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!blocked[j * W + i]) { const d = (cx(i) - x) ** 2 + (cz(j) - z) ** 2; if (d < bd) { bd = d; best = {x: cx(i), z: cz(j)}; } }
    return best;
  }
  function clear(x0, z0, x1, z1) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (cell * .5));
    for (let k = 0; k <= n; k++) { const t = n ? k / n : 0; if (!free(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
    return true;
  }
  function path(a, b) {
    const s = nearest(a.x, a.z), g = nearest(b.x, b.z); if (!s || !g) return null;
    const si = iz(s.z) * W + ix(s.x), gi = iz(g.z) * W + ix(g.x);
    if (si === gi) return [{x: g.x, z: g.z}];
    const gs = new Float32Array(W * H).fill(1e9), from = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H), open = [[0, si]];
    gs[si] = 0;
    const hx = i => Math.hypot(i % W - ix(g.x), Math.floor(i / W) - iz(g.z));
    while (open.length) {
      open.sort((p, q) => q[0] - p[0]); const [, cur] = open.pop(); if (closed[cur]) continue; closed[cur] = 1;
      if (cur === gi) break;
      const ci = cur % W, cj = Math.floor(cur / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni; if (blocked[n] || closed[n]) continue;
        if (di && dj && (blocked[cj * W + ni] || blocked[nj * W + ci])) continue;   // no cutting a corner
        const t = gs[cur] + (di && dj ? 1.4142 : 1); if (t < gs[n]) { gs[n] = t; from[n] = cur; open.push([t + hx(n), n]); }
      }
    }
    if (from[gi] < 0) return null;
    const cells = []; for (let c = gi; c >= 0; c = from[c]) { cells.push({x: cx(c % W), z: cz(Math.floor(c / W))}); if (c === si) break; }
    cells.reverse(); cells[0] = {x: s.x, z: s.z}; cells[cells.length - 1] = {x: g.x, z: g.z};
    const out = [], pts = cells; let at = 0;
    while (at < pts.length - 1) { let far = pts.length - 1; while (far > at + 1 && !clear(pts[at].x, pts[at].z, pts[far].x, pts[far].z)) far--; out.push(pts[far]); at = far; }
    return out;
  }
  function ascii(marks = {}) { let s = ''; for (let j = 0; j < H; j++) { for (let i = 0; i < W; i++) { const k = Object.keys(marks).find(m => ix(marks[m].x) === i && iz(marks[m].z) === j); s += k ? k : blocked[j * W + i] ? '#' : '.'; } s += '\n'; } return s; }
  return {block, unblock, free, nearest, clear, path, ascii, cell, bounds: {minX, maxX, minZ, maxZ}};
}
