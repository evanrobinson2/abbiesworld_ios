// The climb verb (AW-STUDY-0032), shared by every memory game that climbs: tap the next hold and the hand that can
// reach it goes there. Pure rules, no rendering: a hold is {u, y, loose?, kind} on one wall (u along it, y up, metres);
// hands is [left, right], each a hold or null. The game draws the shine and moves the body.
//   planGrab({hands, holds, h, reach, standReach, down}) -> {hand} | {why: 'far' | 'cross' | 'hold' | 'held'}
//   holdNear(holds, project, x, y, size, ok)          -> the hold a thumb meant (prefers reachable ones)
//   bestNext({hands, holds, ...})                      -> the best hold upward (or downward), for a nudge or a key

// can hand i move to h with these hands? null if so, else why not
export function handCan(hands, h, i, {reach = 1.25, standReach = 1.9} = {}) {
 const other = hands[1 - i];
 if (!other) return hands[i] && hands[i].y > standReach ? 'hold' : h.y > standReach ? 'far' : null;
 if (Math.hypot(h.u - other.u, h.y - other.y) > reach) return 'far';
 if (i === 0 ? h.u > other.u + .02 : h.u < other.u - .02) return 'cross';
 return null;
}

export function planGrab({hands, holds, h, reach = 1.25, standReach = 1.9, down = false}) {
 if (hands.includes(h)) return {why: 'held'};
 const o = {reach, standReach}, whys = [0, 1].map(i => handCan(hands, h, i, o)), ok = [0, 1].filter(i => !whys[i]);
 if (!ok.length) return {why: whys.includes('cross') ? 'cross' : whys.includes('hold') ? 'hold' : 'far'};
 if (ok.length === 1) return {hand: ok[0]};
 const empty = ok.find(i => !hands[i]); if (empty !== undefined) return {hand: empty};
 // both hands could go: the one that leaves the most holds in reach further on (no dead ends), then the hand on the
 // hold's side, then the trailing hand, so it feels like climbing hand over hand
 const dir = down ? -1 : 1, ahead = i => { const next = hands.slice(); next[i] = h; const low = Math.min(...next.map(x => x.y));
  return holds.filter(x => !x.loose && !next.includes(x) && dir * (x.y - low) > 0 && [0, 1].some(j => !handCan(next, x, j, o))).length; };
 const mid = (hands[0].u + hands[1].u) / 2, side = h.u < mid - .15 ? 0 : h.u > mid + .15 ? 1 : -1;
 const score = i => ahead(i) * 10 + (i === side ? 2 : 0) + (dir * hands[i].y < dir * hands[1 - i].y ? 1 : 0);
 return {hand: score(0) >= score(1) ? 0 : 1};
}

// project(hold) -> {x, y} in pixels or null when behind the camera. size: the screen's short side in pixels.
// A child's thumb gets at least 54 px (about 8% of the screen); a shining hold wins over a dull one nearby.
export function holdNear(holds, project, x, y, size, ok = () => true) {
 const R = Math.max(54, size * .085); let best = null, bestD = R, bestOk = null, bestOkD = R * 1.35;
 for (const h of holds) {
  const p = project(h); if (!p) continue; const d = Math.hypot(p.x - x, p.y - y);
  if (d < bestD) { best = h; bestD = d; }
  if (ok(h) && d < bestOkD) { bestOk = h; bestOkD = d; }
 }
 return bestOk || best;
}

export function bestNext({hands, holds, reach, standReach, down = false, skip = () => false}) {
 const dir = down ? -1 : 1;
 return holds.filter(h => !h.loose && !skip(h) && planGrab({hands, holds, h, reach, standReach, down}).hand !== undefined).sort((a, b) => dir * (b.y - a.y))[0] || null;
}
