// Pure catalogue logic for the model store: which files are models, what goes with each one,
// and the rows written to Postgres and to the published catalogue in R2. No network or disk here.
import path from 'node:path/posix';

export const SITE_ROOT = 'prototypes/ranch-atelier/dist';
export const MODEL_EXT = new Set(['.glb', '.gltf']);
export const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MIME = {
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json', '.ktx2': 'image/ktx2',
};

export const mimeType = file => MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';

// Content-addressed key, so the same bytes are stored once however many folders hold them,
// and a URL never changes meaning (safe to cache forever).
export const blobKey = (sha256, file) => `models/blobs/${sha256.slice(0, 2)}/${sha256}/${path.basename(file)}`;

// The path the live site serves a file at, or null for files outside the Ranch Atelier site.
export function sitePath(repoPath) {
  return repoPath.startsWith(SITE_ROOT + '/') ? repoPath.slice(SITE_ROOT.length) : null;
}

export function slug(repoPath) {
  const rel = sitePath(repoPath) ?? '/' + repoPath;
  return rel.replace(/^\/+/, '').replace(/\.(glb|gltf)$/i, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const KINDS = [
  [/(^|\/)(buildings?|castle|barn|coop|shelter|house|home)/, 'building'],
  [/(^|\/)(workers?|characters?|character-|survivor|zombie|foreman|chibi|lineup|warrior|soldier|greek-animation)/, 'character'],
  [/(helmet|cuirass|greave|pauldron|sandal|belt|armou?r|gear)/, 'gear'],
  [/(^|\/)(organics|woodland|garden|tree|bush|rock|plants?|crops?)/, 'nature'],
  [/(^|\/)(supplies|props?|studies)/, 'prop'],
  [/(moon|starship|mars|city|coastal|regional|domestic|tile-game|sets-media)/, 'scenery'],
];
export function kindOf(repoPath) {
  const p = repoPath.toLowerCase();
  for (const [re, kind] of KINDS) if (re.test(p)) return kind;
  return 'model';
}

export function groupOf(repoPath) {
  const rel = (sitePath(repoPath) ?? '/' + repoPath).split('/').filter(Boolean);
  if (rel[0] === 'tools' || rel[0] === 'models' || rel[0] === 'simulations' || rel[0] === 'simulation-assets') return rel.slice(0, 2).join('/');
  return rel[0];
}

const title = s => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

// Files that describe a model: its provenance record and the image it was made to match.
export function sidecarsFor(repoPath, files) {
  const dir = path.dirname(repoPath), base = path.basename(repoPath).replace(/\.(glb|gltf)$/i, '');
  const inDir = name => files.has(path.join(dir, name)) ? path.join(dir, name) : null;
  const provenance = inDir(base + '.json') || inDir(base + '.provenance.json') || inDir('provenance.json');
  let reference = null;
  for (const name of [base, base + '-target', base + '_target', base + '-ref', 'ref', 'reference', 'target', 'source']) {
    for (const ext of IMAGE_EXT) { reference ||= inDir(name + ext); }
  }
  let render = null;
  for (const name of [base + '-render', base + '_render', 'render']) for (const ext of IMAGE_EXT) render ||= inDir(name + ext);
  return { provenance, reference, render };
}

// Pull the few fields the catalogue cares about out of whatever shape a provenance file has.
export function provenanceFacts(doc) {
  if (!doc || typeof doc !== 'object') return {};
  const pick = (...keys) => { for (const k of keys) { const v = k.split('.').reduce((o, x) => o?.[x], doc); if (v !== undefined && v !== null && v !== '') return v; } };
  const score = pick('match_score', 'matchScore', 'outline', 'score', 'scores.outline', 'loss.outline', 'fit.outline', 'metrics.outline');
  return {
    name: pick('name', 'title', 'label'),
    subject: pick('subject', 'description', 'prompt'),
    sourceImage: pick('source_image', 'sourceImage', 'reference', 'reference_image', 'target', 'image', 'source.image', 'source.url'),
    matchScore: typeof score === 'number' && score >= 0 && score <= 1 ? score : undefined,
  };
}

// One row per model, in the shape the /models page reads, plus the storage facts.
export function modelRow({ repoPath, tree, sha256, bytes, urls, provenance, page }) {
  const facts = provenanceFacts(provenance);
  const base = path.basename(repoPath).replace(/\.(glb|gltf)$/i, '');
  const outline = page?.outline ?? facts.matchScore ?? null;
  const row = {
    id: page?.id || slug(repoPath),
    name: page?.name || facts.name || title(base),
    kind: kindOf(repoPath),
    group: page?.group || groupOf(repoPath),
    subject: page?.subject || (typeof facts.subject === 'string' ? facts.subject.slice(0, 240) : null),
    status: page?.status || (outline == null ? null : outline >= 0.85 ? 'good' : outline >= 0.7 ? 'partial' : 'weak'),
    outline,
    orbit: page?.orbit || null,
    source_path: repoPath,
    site_path: sitePath(repoPath),
    tree,
    sha256,
    bytes,
    urls,
    source_image: urls.ref || (typeof facts.sourceImage === 'string' && /^https:\/\//.test(facts.sourceImage) ? facts.sourceImage : null),
    provenance: provenance ?? null,
    showcase: Boolean(page),
  };
  if (page) for (const k of ['scores', 'loss', 'good', 'off', 'steps', 'details', 'date']) if (page[k] !== undefined) row[k] = page[k];
  return row;
}

// What /api/models serves: the curated models by default, everything with ?all=1.
export function publicCatalog(rows, { all = false } = {}) {
  const models = rows.filter(r => all || (r.showcase && r.urls.glb && r.urls.ref));
  models.sort((a, b) => (b.showcase - a.showcase) || String(a.group).localeCompare(String(b.group)) || a.name.localeCompare(b.name));
  return { version: 1, updated: new Date().toISOString(), count: models.length, models };
}

// Site path -> stored URL, for the game's loader (only files the live site serves).
export function pathMap(uploads) {
  const out = {};
  for (const u of uploads) { const p = sitePath(u.repoPath); if (p) out[p] = u.url; }
  return out;
}
