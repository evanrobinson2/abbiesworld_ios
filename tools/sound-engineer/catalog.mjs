// Pure catalogue logic for the sound engineer: what a bundle file is (UCS category, publisher),
// and the rows written to Postgres and the published catalogue. No network or disk here.
// The record shape mirrors the model catalogue (id, name, kind, group, urls, provenance) plus
// media: 'sound', so models and sounds can later share one asset browser and table.
import path from 'node:path/posix';

// Universal Category System (https://universalcategorysystem.com) CatID prefixes -> category.
// Files in the 2020+ bundles are named CatID_FXName_Creator_Source.wav.
const UCS = {
  AERO: 'Aircraft', AIR: 'Air', ALRM: 'Alarms', AMB: 'Ambience', ANML: 'Animals', BEEP: 'Beeps', BELL: 'Bells', BIRD: 'Birds',
  BOAT: 'Boats', BULT: 'Bullets', CERM: 'Ceramics', CHAIN: 'Chains', CHEM: 'Chemicals', CLOCK: 'Clocks', CLOTH: 'Cloth',
  COMM: 'Communications', COMP: 'Computers', CREA: 'Creatures', CRWD: 'Crowds', DSGN: 'Designed', DEST: 'Destruction',
  DIRT: 'Dirt and sand', DOOR: 'Doors', DRWR: 'Drawers', ELEC: 'Electricity', EQUIP: 'Equipment', EXPL: 'Explosions',
  FGHT: 'Fight', FIRE: 'Fire', FIREWRK: 'Fireworks', FOLY: 'Foley', FOOD: 'Food and drink', FEET: 'Footsteps', GAME: 'Games',
  GEO: 'Geothermal', GLAS: 'Glass', GORE: 'Gore', GUN: 'Guns', HORN: 'Horns', HMN: 'Human', ICE: 'Ice', LASR: 'Lasers',
  LETH: 'Leather', LIQ: 'Liquid and mud', MACH: 'Machines', MAGIC: 'Magic', MECH: 'Mechanical', METL: 'Metal', MOTR: 'Motors',
  MOVE: 'Movement', MUSC: 'Musical', NDST: 'Natural disaster', OBJ: 'Objects', PAPR: 'Paper', PLAS: 'Plastic', RAIN: 'Rain',
  ROBO: 'Robots', ROCK: 'Rocks', ROPE: 'Rope', RUBR: 'Rubber', SCI: 'Sci-fi', SNOW: 'Snow', SPRT: 'Sports', TOON: 'Cartoon',
  TOOL: 'Tools', TOY: 'Toys', TRN: 'Trains', UI: 'User interface', VEG: 'Vegetation', VEH: 'Vehicles', VOX: 'Voices',
  WATR: 'Water', WEAP: 'Weapons', WTHR: 'Weather', WHSH: 'Whooshes', WIND: 'Wind', WNDW: 'Windows', WOOD: 'Wood',
};
const UCS_KEYS = Object.keys(UCS).sort((a, b) => b.length - a.length);

// Older bundles have free-form names; guess the category from words in the path.
const WORDS = [
  [/\b(ambien|ambience|atmos|roomtone|room tone|forest|meadow|countryside|farmyard)/i, 'Ambience'],
  [/\b(bird|rooster|chicken|hen|owl|crow|duck|goose|songbird)/i, 'Birds'],
  [/\b(sheep|cow|horse|goat|pig|dog|cat|lamb|donkey|animal|insect|cricket|frog|bee)/i, 'Animals'],
  [/\b(footstep|steps|walk|run)\b/i, 'Footsteps'], [/\b(door)/i, 'Doors'], [/\b(rain)/i, 'Rain'], [/\b(wind)/i, 'Wind'],
  [/\b(water|stream|river|creek|splash|drip)/i, 'Water'], [/\b(fire|campfire|crackl)/i, 'Fire'], [/\b(ui|button|click|menu|interface)\b/i, 'User interface'],
  [/\b(whoosh|swish|swoosh)/i, 'Whooshes'], [/\b(magic|spell|sparkle|shimmer)/i, 'Magic'], [/\b(wood|creak)/i, 'Wood'],
  [/\b(hammer|saw|drill|tool)/i, 'Tools'], [/\b(cartoon|toon|boing|comic)/i, 'Cartoon'], [/\b(bell|chime)/i, 'Bells'],
  [/\b(gun|shot|rifle|pistol|weapon|sword)/i, 'Weapons'], [/\b(explosion|explode|blast)/i, 'Explosions'], [/\b(vehicle|car|truck|engine)/i, 'Vehicles'],
  [/\b(voice|vox|scream|laugh|breath)/i, 'Voices'], [/\b(sci-?fi|laser|robot|spaceship)/i, 'Sci-fi'], [/\b(creature|monster|zombie)/i, 'Creatures'],
];

export function describe(zipPath) {
  const parts = zipPath.split('/').filter(Boolean);
  const file = parts.at(-1) || '';
  // "<bundle root>/<Publisher - Library>/.../file.wav": the library folder is the first one below the root.
  const library = (parts.length > 2 ? parts[1] : parts[0] || '').trim();
  const publisher = library.split(/\s+-\s+/)[0].trim();
  const stem = file.replace(/\.[a-z0-9]+$/i, '');
  const catId = stem.split('_')[0];
  const key = /^[A-Z]{2,}[A-Za-z]*$/.test(catId) ? UCS_KEYS.find(k => catId.toUpperCase().startsWith(k)) : null;
  let category = key ? UCS[key] : null;
  if (!category) for (const [re, c] of WORDS) if (re.test(zipPath)) { category = c; break; }
  const name = (key ? stem.split('_')[1] : stem) || stem;
  return { publisher, library, category: category || 'Other', ucs: key ? catId : null, title: name.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() };
}

export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Content-addressed like models/blobs, so a sound's URL never changes meaning.
export const blobKey = (sha256, file) => `sounds/blobs/${sha256.slice(0, 2)}/${sha256}/${path.basename(file)}`;

// Search an index doc (index/<bundle>.json) for entries whose path matches every word.
export function search(doc, query, { limit = 50, category } = {}) {
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const [part, p] of Object.entries(doc.parts || {})) {
    for (const [name, bytes, , , , publisher, cat] of p.entries) {
      const hay = name.toLowerCase();
      if (category && cat !== category) continue;
      if (words.every(w => hay.includes(w))) hits.push({ ref: `${doc.bundle}/${part}`, path: name, bytes, publisher, category: cat });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

// Slot "hen" with two takes gives sounds "hen-1" and "hen-2"; a one-take slot keeps its own id.
export const takeId = (slot, k) => slot.n > 1 ? `${slot.id}-${k + 1}` : slot.id;

// Where the game plays a slot today (simulations/ranch-sound.mjs reads the same ids).
export const GAME_USES = {
  'farm-morning': ['Ranch at dawn'], 'farm-day': ['Ranch by day'], 'countryside-evening': ['Ranch at dusk'], 'night-insects': ['Ranch at night'],
  'rain-light': ['Ranch in rain'], 'rain-heavy': ['Ranch in a storm'], 'wind-gentle': ['Ranch on windy days'], 'wind-strong': ['Ranch in hail and storms'], 'snowy': ['Ranch in snow'],
  rooster: ['Ranch at dawn'], hen: ['Near the chickens'], cow: ['Near the cows'], goat: ['Near the goats'], 'horse-whinny': ['Near the horses'], 'horse-snort': ['Near the horses'],
  songbird: ['Ranch by day'], owl: ['Ranch at night'], thunder: ['Ranch in a storm'], cricket: ['Ranch at dusk'],
};

// One catalogue row per processed sound, in the shape /sounds reads.
export function soundRow({ cue, pick, take, measured, urls, sha256, bytes, sourceSha256 }) {
  const d = describe(take.path);
  return {
    id: cue.id,
    media: 'sound',
    slot: pick?.slot || cue.id,
    name: cue.name,
    kind: cue.kind,                       // ambience | animal | effect | ui | music
    group: cue.group,
    subject: `${d.title}${d.publisher ? ' · ' + d.publisher : ''}`,
    tags: [...new Set([d.category, cue.group].filter(Boolean))],
    uses: GAME_USES[pick?.slot ?? cue.id] || [],
    loop: Boolean(cue.loop),
    status: 'stored',
    urls,                                 // { audio } once stored
    duration: measured.duration,
    loudness: measured.lufs,
    peak: measured.peak,
    channels: measured.channels,
    peaks: measured.peaks,                // waveform, 0..1
    sha256, bytes,
    source: { library: 'Sonniss GDC Game Audio Bundle', bundle: take.ref.split('/')[0], part: take.ref, path: take.path, publisher: d.publisher, sha256: sourceSha256 },
    recipe: { trim: take.trim, fade: take.fade ?? null, target: measured.target, mono: !cue.loop, format: 'mp3' },
    license: 'sonniss-gdc',
    candidates: (pick?.candidates || []).slice(0, 6),
    notes: pick?.notes || [],
    date: pick?.date || null,
  };
}

// What /api/sounds serves.
export function publicCatalog(rows) {
  const sounds = [...rows].sort((a, b) => String(a.group).localeCompare(String(b.group)) || a.name.localeCompare(b.name));
  return { version: 1, updated: new Date().toISOString(), count: sounds.length, sounds };
}

// ---- picking: how well an index entry fits a library slot (library.mjs)
const norm = s => ' ' + String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[_\-.,()[\]]+/g, ' ').replace(/([a-z])([0-9])/g, '$1 $2').replace(/\s+/g, ' ') + ' ';
const wordRe = new Map();
const has = (hay, w) => {
  let re = wordRe.get(w);
  if (!re) wordRe.set(w, re = new RegExp(`[^a-z]${w.replace(/[^a-z0-9 ]/g, '')}(s|es|ing|ed|er|y)?[^a-z]`));
  return re.test(hay);
};

// Score one file for a slot, or null if it doesn't fit. why says what matched.
export function scoreEntry(slot, entryPath, { bytes = 0, method = 0, category } = {}) {
  const file = norm(entryPath.split('/').pop()), all = norm(entryPath);
  if (slot.not.some(w => has(all, w))) return null;
  let best = null;
  slot.terms.forEach((words, i) => {
    const inFile = words.filter(w => has(file, w)).length, inPath = words.filter(w => has(all, w)).length;
    let s = null, why;
    if (inFile === words.length) { s = 10 + 2 * (words.length - 1); why = `name has "${words.join(' ')}"`; }
    else if (inPath === words.length && inFile > 0) { s = 6 + (words.length - 1); why = `name and folder have "${words.join(' ')}"`; }
    else if (inPath === words.length) { s = 3; why = `folder has "${words.join(' ')}"`; }
    if (s != null) { s -= i * 0.4; if (!best || s > best.s) best = { s, why }; }
  });
  if (!best) return null;
  let s = best.s;
  if (category && slot.cats.includes(category)) { s += 4; best.why += `, ${category}`; }
  if (category === 'Designed' && !slot.cats.includes('Designed')) s -= 1;
  if (!/\.wav$/i.test(entryPath) || method !== 0) s -= 6;
  if (slot.loop && bytes < 3e6) s -= 4;
  if (!slot.loop && bytes > 80e6) s -= 3;
  return { score: s, why: best.why };
}

// The best files for a slot across every indexed bundle, highest score first.
export function rank(docs, slot, { used = new Set(), limit = 8 } = {}) {
  const hits = [];
  for (const doc of docs) for (const [part, p] of Object.entries(doc.parts || {})) for (const [entryPath, bytes, method, offset, csize, publisher, category] of p.entries) {
    const r = scoreEntry(slot, entryPath, { bytes, method, category });
    if (!r) continue;
    if (used.has(entryPath)) r.score -= 5;
    r.score += (doc.year || 2015) / 10000; // newer bundles name files better (UCS); only breaks ties
    hits.push({ ...r, bundle: doc.bundle, part, path: entryPath, bytes, method, offset, csize, publisher, category, title: describe(entryPath).title });
  }
  hits.sort((a, b) => b.score - a.score);
  // Keep variety: at most three files from one folder in the shortlist.
  const perDir = new Map(), out = [];
  for (const h of hits) {
    const dir = h.path.split('/').slice(0, -1).join('/'), k = perDir.get(dir) || 0;
    if (k >= 3) continue;
    perDir.set(dir, k + 1); out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}
