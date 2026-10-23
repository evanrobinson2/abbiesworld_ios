// AW-STUDY-0042 + AW-STUDY-0048 Abbie's Town: the final Winchester region is a mega-structure of seven hexes (a centre
// and its six neighbours) inside one greater hex. Three regions are carved at 120 degrees each. The centre hex is cut
// into three wedges and each region takes two outer hexes plus one wedge, so each region is exactly 7/3 hexes: one third.
// Local metres as in town.mjs (x east, y north). Bearings run clockwise from north. First version, Evan 2026-10-23 1:30 PM.
export const HEX = {side: 760, centre: [4376, 2020], downtownRadius: 260}; // flat-top hexes centred on the common and its church park; seven of them cover about 10.5 km2 of the real town's 16.5
// Evan 1:34 PM: "ani has her side, abbie and I have ours ... then there's a downtown area", the church park at the centre.
// The old working names (School Hill, Pond Side, Lake Country) stay as sub-areas.
export const REGIONS = [
 {id: 'abbie-daddy-side', name: "Abbie and Daddy's side", sub: 'School Hill', from: 330, to: 90, outer: [0, 60], line: "Abbie's house and treehouse, Daddy's hideaway, Muraco, Leonard Field, and the road north to Launch."},
 {id: 'anis-side', name: "Ani's side", sub: 'Pond Side', from: 210, to: 330, outer: [240, 300], line: "Ani's house and treehouse, Horn Pond with its splash pad."},
 {id: 'downtown', name: 'Downtown', sub: 'Lake Country', from: 90, to: 210, outer: [120, 180], line: 'The church park and common, Main Street and the coffee shop, Ginn Field and the train park, the lakes.'},
];
const deg = (x, y) => (Math.atan2(x - HEX.centre[0], y - HEX.centre[1]) * 180 / Math.PI + 360) % 360;
const within = (b, from, to) => from <= to ? b >= from && b < to : b >= from || b < to;
export const hexCentres = () => [{id: 'centre', x: HEX.centre[0], y: HEX.centre[1], bearing: null}, ...[0, 60, 120, 180, 240, 300].map(b => ({id: 'outer-' + b, bearing: b,
 x: HEX.centre[0] + Math.sin(b * Math.PI / 180) * HEX.side * Math.sqrt(3), y: HEX.centre[1] + Math.cos(b * Math.PI / 180) * HEX.side * Math.sqrt(3)}))];
// which hex a point is in (the nearest centre, which is exact for a hex grid), or null outside the greater hex
export function hexOf(x, y) {
 let best = null; for (const h of hexCentres()) { const d = Math.hypot(x - h.x, y - h.y); if (!best || d < best.d) best = {...h, d}; }
 const dx = Math.abs(x - best.x), dy = Math.abs(y - best.y), s = HEX.side; // inside a flat-top hex of side s
 return dy <= s * Math.sqrt(3) / 2 && dx <= s - dy / Math.sqrt(3) ? best : null;
}
export function regionOf(x, y) {
 const h = hexOf(x, y); if (!h) return null;
 // the church park at the middle of the structure, and the streets round it, are Downtown whichever way the wedge points
 const r = Math.hypot(x - HEX.centre[0], y - HEX.centre[1]) < HEX.downtownRadius ? REGIONS[2] : REGIONS.find(r => within(deg(x, y), r.from, r.to)); return {hex: h.id, region: r.id, seam: h.id === 'centre'};
}
// where each place falls (computed from the town, so it stays true when places move)
export function placeRegions(town) { return Object.fromEntries(town.spots.map(s => [s.id, regionOf(s.x, s.y)])); }
