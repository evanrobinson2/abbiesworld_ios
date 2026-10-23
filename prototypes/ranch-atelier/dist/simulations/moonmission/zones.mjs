// AW-STUDY-0036 Moon Mission: the mission's micro-zones and where each hangs on the Winchester map (AW-STUDY-0042).
// Evan (2026-10-23 17:28Z): the Winchester map is being compressed into small zones to explore, so nothing here is a
// scale space. A zone is a small area with its own metres, and an anchor saying where it sits in the town (or off it).
//   resolveZones(town, anchors) -> every zone with its map coordinate, from growTown() output (town.spots, town.beyond) and anchors()
//   startCoordinate(anchors)    -> where the mission starts: the coffee shop's curb on Main Street
//
// The final Winchester region is a flower of 7 hexes (a centre hex and six around it) inside a greater hex (Evan, 17:30Z).
// Three regions of a third each: split the centre hex into three equal wedges and give each region two neighbouring outer
// hexes plus one wedge: (2 + 1/3) / 7 = 33.3% exactly. The three meet at the centre, the common, the heart of Downtown.
// "ani has her side, abbie and I have ours" and then a downtown area (Evan, 17:31Z).
export const REGIONS = {
 'downtown': {name: 'Downtown', ring: [0, 1], wedge: 0, note: 'Main Street, the coffee shop, the common'},
 'abbie-daddy-side': {name: "Abbie and Daddy's side", ring: [2, 3], wedge: 1, note: 'the family home, the tree house'},
 'anis-side': {name: "Ani's side", ring: [4, 5], wedge: 2, note: "Ani's home"},
};
// the hex flower in the town's metres: centre c, hex radius r (corner to centre); ring hex i sits at angle 60 i degrees
export function hexFlower(c, r) {
 const hexes = [{id: 'centre', x: c.x, y: c.y, region: null}];
 for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, d = r * Math.sqrt(3); hexes.push({id: 'ring' + i, x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, region: Object.keys(REGIONS).find(k => REGIONS[k].ring.includes(i))}); }
 return {r, hexes, share: (2 + 1 / 3) / 7};
}
// which region a point is in: the three wedges of 120 degrees around the centre, edges along the ring hexes' shared sides
export function regionAt(c, p) {
 const a = (Math.atan2(p.y - c.y, p.x - c.x) * 180 / Math.PI + 360 + 30) % 360; // ring hex i covers [60 i - 30, 60 i + 30)
 const ring = Math.floor(a / 60) % 6;
 return Object.keys(REGIONS).find(k => REGIONS[k].ring.includes(ring));
}
// Nothing here draws anything; the scenes read these.
export const ZONES = {
 'main-street': {name: 'Main Street', scene: 'town', mood: 'light', size: [70, 50], region: 'downtown', anchor: {spot: 'cafe'}, at: 'curb'},
 'church-park': {name: 'The church park', scene: 'town', mood: 'light', size: [90, 90], region: 'downtown', hub: true, anchor: {spot: 'common'}}, // the common: white church, bandstand; where the three regions meet
 'kitchen': {name: 'The kitchen', scene: 'interior', mood: 'light', size: [8, 6], region: 'abbie-daddy-side', anchor: {spot: 'family-home', fallback: 'common'}},
 'tree-house': {name: "Abbie's tree house", scene: 'interior', mood: 'light', size: [5, 5], region: 'abbie-daddy-side', anchor: {spot: 'family-home', fallback: 'common'}, at: 'treehouse'},
 'galley': {name: "Ani's kitchen", scene: 'interior', mood: 'light', size: [7, 4], region: 'anis-side', anchor: {spot: 'ani-home', fallback: 'common'}},
 'launch-pad': {name: 'The launch pad', scene: 'town', mood: 'light', size: [160, 120], anchor: {beyond: 'launch'}},
 'crew-bus': {name: 'The crew bus', scene: 'vehicle', mood: 'light', size: [9, 3], route: ['main-street', 'launch-pad']},
 'briefing-room': {name: 'Crew briefing room', scene: 'interior', mood: 'light', size: [14, 10], anchor: {beyond: 'launch'}},
 'capsule': {name: 'The capsule', scene: 'interior', mood: 'light', size: [4, 3], anchor: {zone: 'launch-pad'}},
 'orbit': {name: 'Earth orbit', scene: 'space', mood: 'dark', size: [40, 40], anchor: {off: 'orbit'}},
 'lunar-descent': {name: 'Lunar descent', scene: 'space', mood: 'dark', size: [2000, 2000], anchor: {off: 'moon'}},
 'moon-base-pad': {name: 'Moon base pad', scene: 'moon', mood: 'dark', size: [300, 300], anchor: {off: 'moon'}},
};

// where the mission starts: the coffee shop's curb on Main Street, from the Abbie's Town thread's anchors()
// (cafe.curb, cafe.door, cafe.street, cafe.rocketPort; local metres, x east, y north, z up). They follow the shop if it moves.
export function startCoordinate(anchors) {
 const c = anchors && anchors.cafe; if (!c) return null;
 return {x: c.curb.x, y: c.curb.y, z: c.curb.z, facing: c.door.facing + Math.PI, spot: 'cafe', door: c.door, street: c.street, rocketPort: c.rocketPort, event: anchors.event};
}

export function resolveZones(town, anchors) {
 const out = {};
 const spot = id => town.spots.find(s => s.id === id), beyond = id => town.beyond.find(b => b.id === id);
 for (const [id, z] of Object.entries(ZONES)) {
  const a = z.anchor || {}; let at = null, pending = false;
  if (id === 'main-street') at = startCoordinate(anchors);
  else if (a.spot) { const s = spot(a.spot); if (s) at = {x: s.x, y: s.y, z: s.z, face: s.face}; else { const f = spot(a.fallback); if (f) at = {x: f.x, y: f.y, z: f.z, face: f.face}; pending = true; } } // the family homes aren't in the town yet
  else if (a.beyond) { const b = beyond(a.beyond); if (b) at = {x: b.x, y: b.y, z: b.z, face: 0, offMap: true}; }
  else if (a.zone) at = out[a.zone] ? out[a.zone].at : null;
  else if (a.off) at = {off: a.off};
  out[id] = {id, ...z, at, pending};
 }
 for (const z of Object.values(out)) if (z.route) { const [p, q] = z.route.map(i => out[i].at); z.at = p; /* a vehicle starts where its route does */ z.distance = p && q && p.x != null && q.x != null ? Math.round(Math.hypot(q.x - p.x, q.y - p.y)) : null; }
 return out;
}
