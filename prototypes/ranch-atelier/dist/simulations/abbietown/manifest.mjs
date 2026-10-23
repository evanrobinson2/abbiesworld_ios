// AW-STUDY-0042 asset manifest: everything a New England suburban town needs, down to the size of a soccer ball.
// Each row is counted by a rule from what the town has (houses, street length, junctions, shops, shoreline, trees),
// once for Abbie's town as grown (town.mjs) and once for a real town of Winchester's size (land.json stats), so the
// page shows both. Rates are estimates written down here, not measurements, unless the rule says "counted".
// kit = what we already have (models on /models or a shared kit in simulations/); new = to make.

// per: houses | km (street km) | junctions | shops | shoreKm | trees | woodsHa | each (a fixed number) | spot:<id>
export const ROWS = [
 // group, item, size (m, longest side), per, rate, kit, priority (1 the spots and the look, 2 the streets, 3 dressing), note
 ['Land and water', 'The land tile, real heights at true scale', 6800, 'each', 1, 'new', 1, 'counted: MassGIS 1:5,000 contours'],
 ['Land and water', 'Lake and pond surfaces', 1100, 'lakes', 1, 'new', 1, 'counted'],
 ['Land and water', 'Brook ribbons (Aberjona River, Horn Pond Brook...)', 400, 'brooks', 1, 'new', 2, 'counted'],
 ['Land and water', 'Mill pond spillway', 12, 'each', 1, 'new', 1, 'the little falls in the centre'],
 ['Land and water', 'Shore rocks', 1.2, 'shoreKm', 40, 'new', 3, ''],
 ['Land and water', 'Cattail clumps', 1.4, 'shoreKm', 60, 'new', 3, ''],
 ['Land and water', 'Lily pads', .4, 'shoreKm', 120, 'new', 3, ''],
 ['Land and water', 'Boulders (glacial erratics)', 2, 'woodsHa', .6, 'new', 3, 'New England woods are full of them'],
 ['Trees', 'Sugar maple (red and orange in October)', 14, 'trees', .38, 'kit: ranch-maple', 1, ''],
 ['Trees', 'Oak', 16, 'trees', .2, 'new', 2, ''],
 ['Trees', 'White pine', 18, 'trees', .27, 'kit: ranch-tree-standing', 2, ''],
 ['Trees', 'Birch', 10, 'trees', .15, 'kit: ranch-birch', 2, ''],
 ['Trees', 'Fallen-leaf scatter decal', 3, 'trees', .5, 'new', 3, 'October'],
 ['Streets', 'Main road ribbon (asphalt, painted lines)', 100, 'mainKm', 10, 'new', 1, 'per 100 m piece'],
 ['Streets', 'Lane ribbon and turning circle', 100, 'laneKm', 10, 'new', 1, 'per 100 m piece'],
 ['Streets', 'Granite curb', 2, 'km', 1000, 'new', 2, 'both sides; New England granite'],
 ['Streets', 'Sidewalk slab run', 10, 'km', 100, 'new', 2, 'one side'],
 ['Streets', 'Crosswalk stripes', 10, 'junctions', 1.2, 'new', 2, ''],
 ['Streets', 'Stop sign', .8, 'junctions', 1.4, 'new', 2, ''],
 ['Streets', 'Street name sign pair', .9, 'junctions', 1, 'new', 2, ''],
 ['Streets', 'Traffic light', 5, 'centreJunctions', 4, 'new', 2, ''],
 ['Streets', 'Fire hydrant', .9, 'km', 7, 'new', 2, 'one per 150 m'],
 ['Streets', 'Storm drain grate', .7, 'km', 16, 'new', 3, ''],
 ['Streets', 'Manhole cover', .7, 'km', 11, 'new', 3, ''],
 ['Streets', 'Wooden utility pole with crossarm', 12, 'km', 25, 'new', 2, 'every 40 m; wires overhead are the look of the town'],
 ['Streets', 'Overhead wire span', 40, 'km', 25, 'new', 2, ''],
 ['Streets', 'Streetlight head on pole', 1.2, 'km', 12, 'new', 2, ''],
 ['Streets', 'Bus stop sign and bench', 2, 'mainKm', .8, 'new', 3, ''],
 ['Streets', 'Blue mailbox (post office)', 1.2, 'shops', .08, 'new', 3, ''],
 ['Houses', 'Colonial (two storey, centre door, shutters)', 12, 'fam:colonial', 1, 'new', 1, 'counted; 51% of real Winchester'],
 ['Houses', 'Cape (one and a half storey, dormers)', 11, 'fam:cape', 1, 'new', 1, 'counted'],
 ['Houses', 'Victorian (tall, porch, rich paint)', 13, 'fam:victorian', 1, 'new', 1, 'counted'],
 ['Houses', 'Ranch and split level', 16, 'fam:ranch', 1, 'new', 1, 'counted'],
 ['Houses', 'Triple-decker and condo block', 16, 'fam:multi', 1, 'new', 1, 'counted'],
 ['Houses', 'Front door with storm door', 2.1, 'houses', 1, 'new', 2, ''],
 ['Houses', 'Window (double hung, with trim)', 1.6, 'houses', 12, 'new', 2, ''],
 ['Houses', 'Shutter pair', 1.6, 'houses', 7, 'new', 2, ''],
 ['Houses', 'Brick chimney', 2.5, 'houses', .7, 'new', 2, ''],
 ['Houses', 'Front porch with columns', 6, 'houses', .3, 'new', 2, ''],
 ['Houses', 'Gutter and drainpipe', 10, 'houses', 1, 'kit: climb-kit drainpipe', 2, 'the school jump climbs one'],
 ['Houses', 'Detached garage', 6, 'houses', .08, 'new', 2, 'counted: 599 small buildings in the real town'],
 ['Houses', 'Driveway', 12, 'houses', 1, 'new', 2, ''],
 ['Houses', 'Front walk', 7, 'houses', 1, 'new', 3, ''],
 ['Yards', 'Lawn patch', 20, 'houses', 1, 'new', 2, ''],
 ['Yards', 'Shrubs and hydrangeas', 1.3, 'houses', 4, 'new', 3, ''],
 ['Yards', 'White picket fence run', 3, 'houses', 2, 'new', 3, 'about a third of houses, six panels each'],
 ['Yards', 'Hedge run', 3, 'houses', 1.5, 'new', 3, ''],
 ['Yards', 'Mailbox on a post', 1.3, 'houses', 1, 'new', 2, ''],
 ['Yards', 'Trash bin', 1.1, 'houses', 1, 'new', 3, ''],
 ['Yards', 'Recycling bin', 1.1, 'houses', 1, 'new', 3, ''],
 ['Yards', 'Car in the driveway', 4.7, 'houses', 1.6, 'new', 2, ''],
 ['Yards', 'Swing set', 3, 'houses', .15, 'new', 3, ''],
 ['Yards', 'Trampoline', 4, 'houses', .1, 'new', 3, ''],
 ['Yards', 'Basketball hoop over the driveway', 3.5, 'houses', .2, 'new', 3, ''],
 ['Yards', 'Bicycle', 1.7, 'houses', .8, 'new', 3, ''],
 ['Yards', 'Scooter', .8, 'houses', .3, 'new', 3, ''],
 ['Yards', 'Lawn mower', 1.2, 'houses', .9, 'new', 3, ''],
 ['Yards', 'Grill', 1.1, 'houses', .6, 'new', 3, ''],
 ['Yards', 'Adirondack chair', 1, 'houses', .5, 'new', 3, ''],
 ['Yards', 'Flag on the porch', 1.5, 'houses', .25, 'new', 3, ''],
 ['Yards', 'Leaf pile and rake', 2, 'houses', .3, 'new', 3, 'October'],
 ['Yards', 'Pumpkin and jack-o-lantern', .4, 'houses', 1.5, 'new', 3, 'October'],
 ['Yards', 'Soccer ball', .22, 'houses', .4, 'new', 3, 'the smallest thing on the list'],
 ['Yards', 'Football and baseball glove', .3, 'houses', .3, 'new', 3, ''],
 ['Town centre', 'Brick shopfront (two storey, flat roof)', 14, 'shops', 1, 'new', 1, 'counted'],
 ['Town centre', 'Striped awning', 6, 'shops', 1, 'new', 2, ''],
 ['Town centre', 'Painted shop sign (blank, pictures only)', 3, 'shops', 1, 'new', 2, ''],
 ['Town centre', 'Bench', 1.8, 'shops', .5, 'kit: ranch-bench', 2, ''],
 ['Town centre', 'Planter with mums', 1, 'shops', 1, 'new', 3, ''],
 ['Town centre', 'Bike rack', 2, 'shops', .25, 'new', 3, ''],
 ['Town centre', 'Parking meter', 1.3, 'shops', 1.5, 'new', 3, ''],
 ['Town centre', 'Parked car', 4.7, 'shops', 3, 'new', 2, ''],
 ['Town centre', 'Public trash can', 1, 'shops', .5, 'new', 3, ''],
 ['Town centre', 'Sandwich board', 1, 'shops', .5, 'new', 3, ''],
 ['Civic and rail', 'White church with steeple', 35, 'each', 3, 'new', 1, 'the common has one'],
 ['Civic and rail', 'Town hall with clock tower', 30, 'each', 1, 'new', 2, ''],
 ['Civic and rail', 'Library', 25, 'each', 1, 'new', 2, ''],
 ['Civic and rail', 'Fire station', 20, 'each', 1, 'new', 2, ''],
 ['Civic and rail', 'Post office', 18, 'each', 1, 'new', 3, ''],
 ['Civic and rail', 'Flagpole', 15, 'each', 4, 'new', 2, ''],
 ['Civic and rail', 'War memorial', 3, 'each', 1, 'new', 3, ''],
 ['Civic and rail', 'Commuter rail track', 100, 'railKm', 10, 'new', 1, 'counted; per 100 m piece'],
 ['Civic and rail', 'Station platform and shelter', 60, 'each', 2, 'new', 1, 'the centre and by the lakes'],
 ['Civic and rail', 'Commuter train (engine and three coaches)', 85, 'each', 1, 'new', 1, ''],
 ['Civic and rail', 'Level crossing gates and bells', 6, 'each', 2, 'new', 2, 'a bell is diegetic'],
 ['Off the map', 'Launch: rocket on its pad, on the horizon', 120, 'each', 1, 'kit: moon-mission rocket', 1, 'the pink rocket'],
 ['Off the map', 'New Nova: the bright city on the horizon', 900, 'each', 1, 'new', 1, ''],
 ['Off the map', 'Road signs out of town', 2, 'each', 2, 'new', 2, 'pictures, not words'],
 ['People and animals', 'Grown-ups', 1.8, 'houses', 1.2, 'kit: figure-kit', 2, 'a few out walking at a time'],
 ['People and animals', 'Kids', 1.3, 'houses', .4, 'kit: figure-kit', 2, ''],
 ['People and animals', 'Dogs (bub is one)', .9, 'houses', .3, 'kit: black-lab', 2, ''],
 ['People and animals', 'Cats', .5, 'houses', .2, 'new', 3, ''],
 ['People and animals', 'Squirrels', .4, 'trees', .03, 'new', 3, ''],
 ['People and animals', 'Canada geese', .9, 'shoreKm', 6, 'new', 3, ''],
 ['People and animals', 'Ducks', .4, 'shoreKm', 6, 'new', 3, ''],
 ['People and animals', 'Crossing guard with stop paddle', 1.8, 'each', 1, 'kit: figure-kit', 2, 'outside Muraco'],
 ['People and animals', 'Mail carrier and truck', 3, 'each', 1, 'new', 3, ''],
 ['Memories', "Gold coins (Daddy's core memories)", .3, 'coins', 1, 'kit: coin-reward', 1, 'counted: one per place, ten in the basement'],
 ['Memories', 'Register key', .1, 'each', 1, 'kit: cafe-key', 1, 'opens the basement'],
 // the places
 ['The coffee shop', 'Shopfront that becomes Abbie’s (pink when she signs in)', 14, 'each', 1, 'new', 1, ''],
 ['The coffee shop', 'Inside: the room and its 58 models', 12, 'each', 1, 'kit: café study (/models, cafe-*)', 1, 'espresso machine, register, jukebox, booths...'],
 ['The coffee shop', 'Cellar bulkhead door to the basement', 2, 'each', 1, 'kit: cafe-basement-door', 1, ''],
 ['The coffee shop', 'Sidewalk table and two chairs', 1, 'each', 3, 'new', 2, ''],
 ["Comella's", 'Shopfront with red, white and green awning', 14, 'each', 1, 'new', 1, ''],
 ["Comella's", 'Pizza oven', 2.2, 'each', 1, 'new', 2, ''],
 ["Comella's", 'Counter and slice case', 4, 'each', 1, 'new', 2, ''],
 ["Comella's", 'Booth', 2, 'each', 6, 'new', 2, ''],
 ["Comella's", 'Pizza box stack', .5, 'each', 4, 'new', 3, ''],
 ["Comella's", 'Soda cooler', 2, 'each', 1, 'new', 3, ''],
 ['Frozen Hoagies', 'Shopfront with a giant sub on the roof', 14, 'each', 1, 'new', 1, ''],
 ['Frozen Hoagies', 'Deli counter and case', 4, 'each', 1, 'new', 2, ''],
 ['Frozen Hoagies', 'Bread rack', 2, 'each', 1, 'new', 3, ''],
 ['Frozen Hoagies', 'Wrapped hoagie', .3, 'each', 8, 'new', 3, ''],
 ['Frozen Hoagies', 'Stools at the window', .8, 'each', 5, 'new', 3, ''],
 ['Muraco', 'The school building (brick, long, flat roof)', 80, 'each', 1, 'kit: school study', 1, 'the school jump plays here'],
 ['Muraco', 'Playground structure with slide', 10, 'each', 1, 'new', 2, ''],
 ['Muraco', 'Swings', 6, 'each', 2, 'new', 2, ''],
 ['Muraco', 'Four-square and hopscotch paint', 6, 'each', 3, 'new', 3, ''],
 ['Muraco', 'Chalk targets on the wall', 1.5, 'each', 6, 'kit: school study', 2, ''],
 ['Muraco', 'School bus', 12, 'each', 4, 'new', 2, ''],
 ['Muraco', 'Kickball', .25, 'each', 4, 'new', 3, ''],
 ['Leonard Field', 'Soccer field with lines', 100, 'each', 1, 'new', 1, ''],
 ['Leonard Field', 'Soccer goal (full and small)', 7.3, 'each', 6, 'new', 2, ''],
 ['Leonard Field', 'Baseball backstop', 10, 'each', 1, 'new', 2, ''],
 ['Leonard Field', 'Bleachers', 6, 'each', 2, 'new', 2, ''],
 ['Leonard Field', 'Beach sand and swim float', 40, 'each', 1, 'new', 1, ''],
 ['Leonard Field', 'Lifeguard chair', 2.5, 'each', 1, 'new', 2, ''],
 ['Leonard Field', 'Buoy rope line', 25, 'each', 2, 'new', 3, ''],
 ['Leonard Field', 'Kayak', 3.5, 'each', 4, 'new', 3, ''],
 ['Leonard Field', 'Corner flag', 1.5, 'each', 4, 'new', 3, ''],
 ['Leonard Field', 'Soccer balls on the field', .22, 'each', 10, 'new', 3, ''],
 ['Ginn Field', 'Play train: little engine and coaches', 6, 'each', 3, 'new', 1, 'the train park'],
 ['Ginn Field', 'Play track and buffer', 4, 'each', 4, 'new', 2, ''],
 ['Ginn Field', 'Picnic table', 2, 'each', 4, 'new', 3, ''],
 ['Ginn Field', 'Drinking fountain', 1, 'each', 1, 'new', 3, ''],
 ['Horn Pond', 'Loop path around the pond', 3200, 'each', 1, 'new', 1, ''],
 ['Horn Pond', 'Wooden dock', 8, 'each', 1, 'new', 2, ''],
 ['Horn Pond', 'Rowboat', 3, 'each', 2, 'new', 3, ''],
 ['Horn Pond', 'Park bench', 1.8, 'each', 12, 'kit: ranch-bench', 3, ''],
 ['Horn Pond', 'Heron', 1, 'each', 1, 'new', 3, ''],
 ['The science lab', 'Lab building with a little observatory dome', 16, 'each', 1, 'new', 1, 'the way into the cell game (AW-STUDY-0047)'],
 ['The science lab', 'Beaker of strange green goo by the door', .4, 'each', 1, 'new', 1, 'tap it to play'],
 ['The town common', 'Bandstand', 8, 'each', 1, 'new', 2, ''],
 ['The town common', 'Lamp posts around the green', 4, 'each', 10, 'new', 3, ''],
];

const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
export function measures(land, town, S) {
 const polyLen = p => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };
 const shoreKm = land.raw.water.reduce((s, w) => s + polyLen(w.ring), 0) / 1000, railKm = land.raw.rail.reduce((s, r) => s + polyLen(r), 0) / 1000;
 const wild = town.trees.filter(t => t.wild).length;
 const real = land.raw.stats, rb = {...real.buildings}; delete rb.garage;
 const realHouses = sum(rb) - (rb.shop || 0) - (rb.civic || 0), realFam = {...rb, shop: rb.shop};
 const base = {lakes: land.raw.water.filter(w => w.a > 20000).length, brooks: land.raw.streams.length, shoreKm, railKm, coins: town.coins.length, each: 1, woodsHa: wild / 8};
 const townM = {...base, houses: S.houses - (S.fam.shop || 0), shops: S.fam.shop || 0, km: S.roadKm + S.laneKm, mainKm: S.roadKm, laneKm: S.laneKm, junctions: S.junctions, centreJunctions: 1, trees: town.trees.length, fam: S.fam};
 const ratio = realHouses / Math.max(1, townM.houses);
 const realM = {...base, houses: realHouses, shops: rb.shop || 0, km: S.realStreetKm, mainKm: S.roadKm, laneKm: S.realStreetKm - S.roadKm, junctions: real.intersections, centreJunctions: 3,
  trees: Math.round(town.trees.length - wild + (town.trees.length - wild) * (ratio - 1) + wild), fam: realFam};
 return {town: townM, real: realM};
}
function count(m, per, rate) {
 if (per.startsWith('fam:')) return m.fam[per.slice(4)] || 0;
 return Math.round((m[per] ?? 0) * rate);
}
export function manifest(land, town, S) {
 const M = measures(land, town, S);
 return ROWS.map(([group, item, size, per, rate, kit, priority, note]) => ({group, item, size, per, rate, kit, priority, note, town: count(M.town, per, rate), real: count(M.real, per, rate)}));
}
export function manifestCSV(rows) {
 const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v;
 return ['group,item,size_m,abbies_town,real_town,per,rate,kit,priority,note', ...rows.map(r => [r.group, r.item, r.size, r.town, r.real, r.per, r.rate, r.kit, r.priority, r.note].map(q).join(','))].join('\n');
}
