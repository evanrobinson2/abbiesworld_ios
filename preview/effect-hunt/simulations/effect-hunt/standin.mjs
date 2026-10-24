// A stand-in for the Winchester board so the hunt can be built and tried anywhere, before it is mounted in the town.
// It answers the same questions as window.AbbieTown.board (hexes, heightAt, tileAt, centreOf) and draws a low poly
// version of the seven hexes: hills, a pond, a river, a scatter of houses and trees. The real town replaces all of it.
import * as T from 'three';
import {hexCentre} from './effects.mjs';

const R = 105, R3 = Math.sqrt(3);
const IDS = ['downtown', 'depot-river', 'reservoir-hills', 'neighbourhood', 'anis-side', 'abbie-daddy-side', 'gingerbread-hill'];
const inHex = (px, py, r = R) => { const ax = Math.abs(px), ay = Math.abs(py); return ay <= r * R3 / 2 && R3 * ax + ay <= r * R3; };
const hash = (x, y) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v; };
const fbm = (x, y) => vnoise(x * .012, y * .012) * .6 + vnoise(x * .03, y * .03) * .3 + vnoise(x * .08, y * .08) * .1;

export function makeStandin() {
 const centres = IDS.map(id => ({id, ...hexCentre(id)}));
 const tileAt = (px, py) => { for (const c of centres) if (inHex(px - c.x, py - c.y)) return c.id; return null; };
 // ground height in metres: rolling hills, with the hex nearest the reservoir lifted and the pond/river dips carved
 const rawH = (px, py) => {
  let h = 5 + fbm(px, py) * 20;
  const lift = centres[2], dl = Math.hypot(px - lift.x, py - lift.y); h += Math.max(0, 1 - dl / 150) * 22;
  const river = Math.abs(py + 104 + Math.sin(px * .03) * 16) ; h -= Math.max(0, 1 - river / 14) * 9;
  const pond = centres[4], dp = Math.hypot(px - pond.x + 30, py - pond.y - 26); h -= Math.max(0, 1 - dp / 38) * 11;
  return h;
 };
 const WATER = 3.2, heightAt = (px, py) => Math.max(rawH(px, py), WATER - .6);
 const board = {name: 'Winchester, MA (stand-in)', hexSide: R, hexes: IDS.map(id => ({id})), heightAt, tileAt, centreOf: id => hexCentre(id)};

 const group = new T.Group(); group.name = 'standin-board';
 // ground: a 6 m grid across the board's bounds, vertex coloured by height and by hex; cells outside every hex are skipped
 const step = 6, ext = 330, n = Math.round(ext * 2 / step) + 1, pos = [], col = [], idx = [], map = new Int32Array(n * n).fill(-1);
 const cG = [new T.Color('#7fb35a'), new T.Color('#9cc46a'), new T.Color('#cdbf7a'), new T.Color('#9a8a6a'), new T.Color('#f2f0e8')], cow = new T.Color('#4a8d3f');
 const tint = {downtown: '#b9c27a', 'depot-river': '#c7b27a', 'reservoir-hills': '#86b46a', neighbourhood: '#8dc274', 'anis-side': '#7fbf8a', 'abbie-daddy-side': '#a3cf70', 'gingerbread-hill': '#d9b3a0'};
 for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
  const px = -ext + i * step, py = -ext + j * step, id = tileAt(px, py); if (!id) continue;
  const h = heightAt(px, py); map[j * n + i] = pos.length / 3; pos.push(px, h, -py);
  const c = new T.Color(tint[id]).lerp(h < WATER ? new T.Color('#c9bd8e') : new T.Color('#fff'), h < WATER ? .7 : Math.max(0, (h - 26) / 60)); col.push(c.r, c.g, c.b);
 }
 for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = map[j * n + i], b = map[j * n + i + 1], c = map[(j + 1) * n + i], d = map[(j + 1) * n + i + 1]; if (a >= 0 && b >= 0 && c >= 0) idx.push(a, b, c); if (b >= 0 && c >= 0 && d >= 0) idx.push(b, d, c); }
 const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
 const ground = new T.Mesh(geo, Object.assign(new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: .95}), {name: 'ground-grass'})); ground.receiveShadow = true; group.add(ground);
 // a thick base so the board reads as a tile edge, and water in the dips
 const water = new T.Mesh(new T.PlaneGeometry(ext * 2, ext * 2), Object.assign(new T.MeshStandardMaterial({color: '#4fb3e8', transparent: true, opacity: .82, roughness: .2, metalness: .1, flatShading: true}), {name: 'water'})); water.rotation.x = -Math.PI / 2; water.position.y = WATER; group.add(water);
 // beyond the tiles: a pale empty plain, lower than the board, so it is clear when you have left it
 const out = new T.Mesh(new T.PlaneGeometry(4000, 4000), Object.assign(new T.MeshStandardMaterial({color: '#cfc4e8', roughness: 1}), {name: 'ground-beyond'})); out.rotation.x = -Math.PI / 2; out.position.y = -2; out.receiveShadow = true; group.add(out);
 // hex outlines so the player can feel the tile edges (a painted kerb, in the world)
 const kerb = new T.Group(); const km = Object.assign(new T.MeshBasicMaterial({color: '#fff3c8'}), {name: 'kerb-paint'});
 for (const c of centres) for (let k = 0; k < 6; k++) { const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3, x0 = c.x + Math.cos(a0) * R, y0 = c.y + Math.sin(a0) * R, x1 = c.x + Math.cos(a1) * R, y1 = c.y + Math.sin(a1) * R; const L = Math.hypot(x1 - x0, y1 - y0); const nb = tileAt((x0 + x1) / 2 + (x0 + x1 - 2 * c.x) * .01, (y0 + y1) / 2 + (y0 + y1 - 2 * c.y) * .01); if (nb) continue; const seg = new T.Mesh(new T.BoxGeometry(L, .5, 2.2), km); seg.position.set((x0 + x1) / 2, heightAt((x0 + x1) / 2, (y0 + y1) / 2) + .3, -(y0 + y1) / 2); seg.rotation.y = Math.atan2(y1 - y0, x1 - x0); kerb.add(seg); }
 group.add(kerb);
 // houses and trees: instanced, no collision (the cart drives through, as a toy would)
 const hM = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), Object.assign(new T.MeshStandardMaterial({flatShading: true, roughness: .8}), {name: 'house-wall'}), 110), rM = new T.InstancedMesh(new T.ConeGeometry(.78, .7, 4), Object.assign(new T.MeshStandardMaterial({color: '#c4574a', flatShading: true}), {name: 'house-roof'}), 110), tM = new T.InstancedMesh(new T.ConeGeometry(1, 1, 6), Object.assign(new T.MeshStandardMaterial({color: '#3f8f4d', flatShading: true}), {name: 'tree-leaves'}), 420);
 const obst = new Map(), addO = (x, z, r) => { const k = Math.floor(x / 24) + ',' + Math.floor(z / 24); (obst.get(k) || obst.set(k, []).get(k)).push({x, z, r}); };
 const d = new T.Object3D(), wallCols = ['#f3e2c0', '#e8c9c0', '#cfe0ea', '#f0e69a', '#d8ead2'].map(c => new T.Color(c)); let hi = 0, ti = 0;
 for (let k = 0; k < 2600 && (hi < 110 || ti < 420); k++) {
  const px = (hash(k, 7) * 2 - 1) * ext, py = (hash(k, 9) * 2 - 1) * ext; if (!tileAt(px, py) || Math.hypot(px, py) < 12) continue; const h = heightAt(px, py); if (h < WATER + .8) continue;
  if (k % 3 === 0 && hi < 110) { const w = 7 + hash(k, 3) * 4, hh = 5 + hash(k, 4) * 3, rot = hash(k, 5) * 3; d.position.set(px, h + hh / 2 - .3, -py); d.rotation.set(0, rot, 0); d.scale.set(w, hh, w * 1.2); d.updateMatrix(); hM.setMatrixAt(hi, d.matrix); hM.setColorAt(hi, wallCols[hi % 5]); addO(px, -py, w * .75); d.position.y = h + hh + .1; d.rotation.set(0, rot + Math.PI / 4, 0); d.scale.set(w * 1.05, 5, w * 1.2 * 1.05); d.updateMatrix(); rM.setMatrixAt(hi, d.matrix); hi++; }
  else if (ti < 420) { const s = 1.6 + hash(k, 6) * 2.2; d.position.set(px, h + s * .9, -py); d.rotation.set(0, hash(k, 8) * 3, 0); d.scale.set(s, s * 2, s); d.updateMatrix(); tM.setMatrixAt(ti++, d.matrix); addO(px, -py, s * .45); }
 }
 hM.count = rM.count = hi; tM.count = ti; for (const o of [hM, rM, tM]) { o.castShadow = true; o.raycast = () => {}; group.add(o); }
 const near = (x, z) => { const cx = Math.floor(x / 24), cz = Math.floor(z / 24), o = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = obst.get((cx + i) + ',' + (cz + j)); if (l) o.push(...l); } return o; };
 return {board, group, tileAt, heightAt, centres, near};
}
