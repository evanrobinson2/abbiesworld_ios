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

// One catalogue row per processed sound, in the shape /sounds reads.
export function soundRow({ cue, pick, measured, urls, sha256, bytes, sourceSha256 }) {
  return {
    id: cue.id,
    media: 'sound',
    name: cue.name,
    kind: cue.kind,                       // ambience | effect | ui | voice | music
    group: cue.group,
    subject: cue.brief,
    tags: cue.tags || [],
    uses: cue.uses || [],                 // where the game plays it
    loop: Boolean(cue.loop),
    status: cue.status || 'picked',
    urls,                                 // audio (mp3), plus any extra formats
    duration: measured.duration,
    loudness: measured.lufs,
    peak: measured.peak,
    channels: measured.channels,
    peaks: measured.peaks,                // waveform, 0..1, ~120 points
    sha256, bytes,
    source: {
      library: 'Sonniss GDC Game Audio Bundle', bundle: pick.ref.split('/')[0], part: pick.ref, path: pick.path,
      publisher: describe(pick.path).publisher, sha256: sourceSha256,
    },
    recipe: { trim: pick.trim || null, fade: pick.fade ?? null, gain: pick.gain ?? 0, target: measured.target, format: 'mp3' },
    license: 'sonniss-gdc',
    candidates: cue.candidates || [],
    notes: cue.notes || [],
    date: cue.date || null,
  };
}

// What /api/sounds serves.
export function publicCatalog(rows) {
  const sounds = [...rows].sort((a, b) => String(a.group).localeCompare(String(b.group)) || a.name.localeCompare(b.name));
  return { version: 1, updated: new Date().toISOString(), count: sounds.length, sounds };
}
