// Overland hex board: odd-r offset coordinates (odd rows shifted right).
// Pure: geometry, neighbours, passability, specials, pathfinding.

import { evalCond } from './script.js';

// Pointy-top hex tiles, drawn HEX_W wide. The art is a hex top face with a
// few pixels of earth "thickness" below it, so rows overlap: each row is
// drawn ROW_STEP below the last, back to front.
export const HEX_W = 48;
export const HEX_H = 48;      // drawn height of a tile including its earth edge
export const ROW_STEP = 32;   // vertical distance between row centres
export const FACE_H = 42;     // height of the top face (click target)

// Neighbour order in both tables: E, W, NE, NW, SE, SW.
const ODD = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];
const EVEN = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
export const DIRS = ['E', 'W', 'NE', 'NW', 'SE', 'SW'];

export function parseWorld(world) {
  const grid = world.rows.map(r => r.trim().split(/\s+/));
  return { ...world, grid, rowsN: grid.length, colsN: world.cols };
}

export function inBounds(w, q, r) {
  return r >= 0 && r < w.rowsN && q >= 0 && q < w.colsN;
}

export function neighbors(q, r) {
  return (r & 1 ? ODD : EVEN).map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}

export function isNeighbor(a, b) {
  return neighbors(a.q, a.r).some(n => n.q === b.q && n.r === b.r);
}

export function terrainAt(w, q, r) {
  if (!inBounds(w, q, r)) return null;
  const code = w.grid[r][q];
  return { code, ...w.terrain[code] };
}

// The special on a hex that is active in this state, if any.
export function specialAt(w, q, r, state) {
  return w.specials.find(s => s.q === q && s.r === r && evalCond(s.if, state)) || null;
}

// Stable art variant per hex.
export function variantOf(q, r, n = 2) {
  return ((q * 7349 + r * 1931) >>> 0) % n;
}

// Cover a hex gives a mech standing in it (forest, ruins, town). Feeds the
// to-hit number of shots at that mech in a battle fought there.
export function coverAt(w, q, r) {
  return terrainAt(w, q, r)?.cover ?? 0;
}

// Directions in which a road hex meets another road, bridge or town.
export function roadLinks(w, q, r) {
  return neighbors(q, r).map((n, i) => ({ n, d: DIRS[i] }))
    .filter(({ n }) => terrainAt(w, n.q, n.r)?.link)
    .map(({ d }) => d);
}

// The straight axis a road hex should show: 'ew', 'swne' or 'nwse', whichever
// covers most of its links (ties go to east-west, the map's main road).
const AXES = { ew: ['E', 'W'], swne: ['SW', 'NE'], nwse: ['NW', 'SE'] };
export function roadAxis(w, q, r) {
  const links = roadLinks(w, q, r);
  let best = 'ew', score = -1;
  for (const [axis, ends] of Object.entries(AXES)) {
    const n = ends.filter(d => links.includes(d)).length;
    if (n > score) { best = axis; score = n; }
  }
  return best;
}

// The real road art runs south-west to north-east. Rotating the top face by
// a multiple of 60 degrees (in unsquashed hex space) turns it onto the other
// two axes; screen y points down, so a positive angle turns clockwise.
export const ROAD_ART_AXIS = 'swne';
export const AXIS_ROTATION = { swne: 0, ew: Math.PI / 3, nwse: -Math.PI / 3 };

// Art for a hex: `real` is the manifest key (one image per terrain), `fallback`
// the procedural variant. `burning` asks the renderer to add fire and smoke.
// Road hexes also carry `axis` (see roadAxis): the renderer uses a straight
// variant hex.road.<axis> when the manifest has one, otherwise it rotates the
// single diagonal road image by `rotate`.
export function hexArt(w, q, r, state) {
  const t = terrainAt(w, q, r);
  const ruined = state?.mapVariant === 'ruined' && !!t.ruinedArt;
  const art = { real: `hex.${t.art}`, fallback: `hex.${ruined ? t.ruinedArt : t.art}.${variantOf(q, r)}`, burning: ruined };
  if (t.axisArt) {
    art.axis = roadAxis(w, q, r);
    art.variant = `hex.${t.art}.${art.axis}`;
    art.rotate = AXIS_ROTATION[art.axis] - AXIS_ROTATION[ROAD_ART_AXIS];
    art.base = `hex.${t.axisArt}`;
  }
  return art;
}

// Pixel centre of a hex, given the board's top-left origin.
export function hexCenter(q, r, ox = 0, oy = 0) {
  return { x: ox + q * HEX_W + (r & 1 ? HEX_W / 2 : 0) + HEX_W / 2, y: oy + r * ROW_STEP + FACE_H / 2 };
}

// Which hex a pixel falls in (nearest centre within the hex's radius).
export function pixelToHex(w, x, y, ox = 0, oy = 0) {
  let best = null, bd = Infinity;
  for (let r = 0; r < w.rowsN; r++) for (let q = 0; q < w.colsN; q++) {
    const c = hexCenter(q, r, ox, oy);
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bd) { bd = d; best = { q, r }; }
  }
  return bd <= (FACE_H / 2) ** 2 ? best : null;
}

// Can the squad stand on this hex? Specials with a scene but impassable
// terrain (the port, the ridges) are "visited" from next door instead.
export function passable(w, q, r) {
  const t = terrainAt(w, q, r);
  return !!t && t.passable;
}

// Breadth-first path over passable hexes. The goal itself may be impassable
// (then the path stops next to it and reports it as `bump`).
export function findHexPath(w, from, goal) {
  if (!inBounds(w, goal.q, goal.r)) return null;
  const key = (q, r) => r * w.colsN + q;
  const goalOpen = passable(w, goal.q, goal.r);
  const prev = new Map([[key(from.q, from.r), null]]);
  const queue = [from];
  let end = null;
  while (queue.length) {
    const cur = queue.shift();
    if (goalOpen ? cur.q === goal.q && cur.r === goal.r : isNeighbor(cur, goal) || (cur.q === from.q && cur.r === from.r && isNeighbor(from, goal))) {
      end = cur;
      break;
    }
    for (const n of neighbors(cur.q, cur.r)) {
      const k = key(n.q, n.r);
      if (prev.has(k) || !passable(w, n.q, n.r)) continue;
      prev.set(k, key(cur.q, cur.r));
      queue.push(n);
    }
  }
  if (!end) return null;
  const steps = [];
  let k = key(end.q, end.r);
  while (k !== null && k !== key(from.q, from.r)) {
    steps.unshift({ q: k % w.colsN, r: Math.floor(k / w.colsN) });
    k = prev.get(k);
  }
  return { steps, bump: goalOpen ? null : { q: goal.q, r: goal.r } };
}
