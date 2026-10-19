// Pure presentation adapter for simulation-worker.js frames. No simulation mutation,
// inferred resource capacities, or placeholder assets for unsupported subjects.
const stages = new Set(['planned', 'foundation', 'frame', 'roof', 'complete']);
const baseBuildings = { shelter: 'shelter', 'abbie-home': 'family-home', 'ani-home': 'family-home', feed: 'feed-store', water: 'water-point', garden: 'kitchen-garden' };
const shelters = { horse: 'shelter', cow: 'cattle-shelter', goat: 'goat-shelter', chicken: 'chicken-coop' };
const buildingNames = { 'equine-shelter': 'shelter', 'cattle-shelter': 'cattle-shelter', 'goat-shelter': 'goat-shelter', 'secure-coop': 'chicken-coop' };
const workers = new Set(['abbie', 'ani', 'mommy', 'daddy', 'jeff', 'alexis', 'pearl']);
const animalSubjects = new Set(['horse', 'cow', 'goat', 'chicken']);
const feeding = new Set(['forage', 'graze', 'browse', 'scratch', 'supplemental-feeding', 'hay', 'drink']);
const idleAnimals = new Set(['explore', 'settling-in']);
const workerIdle = new Set(['resting', 'waiting-for-work-or-materials', 'walking-home', 'walking-to-care-supplies', 'walking-to-clean', 'walking-to-materials', 'walking-to-build', 'walking-to-horse']);
const workerWork = new Set(['building', 'cleaning', 'composting', 'collecting', 'unloading', 'collecting-food', 'collecting-water', 'replenishing-food', 'replenishing-water']);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key) ? object[key] : undefined;

/** Dynamic frame buildings lack species before arrival. Pass the project's known
 * speciesByHabitat map; never infer species from habitat numbering. Garden's roof
 * stage maps to trellis finishing, not a literal roof or invented crop growth. */
export function resolveBuildingAsset(building, { speciesByHabitat = {} } = {}) {
  if (!building || !stages.has(building.stage)) return null;
  let subject = own(baseBuildings, building.id) || own(buildingNames, building.name);
  if (!subject && /^build-habitat-\d+$/.test(building.id || '')) {
    subject = own(shelters, own(speciesByHabitat, building.id.slice(6)));
  }
  return subject ? `${subject}-${building.stage}` : null;
}

/** Feeding includes drinking because the available model is a head-down pose.
 * These static review assets are not locomotion or consumption animations. */
export function resolveAnimalAsset(animal) {
  if (animal?.species === 'dog' && String(animal.name || '').toLowerCase() === 'marley') {
    return animal.activity === 'rest' ? 'marley-rest' : idleAnimals.has(animal.activity) ? 'marley-idle' : null;
  }
  if (!animal || !animalSubjects.has(animal.species)) return null;
  const state = animal.activity === 'rest' ? 'rest' : feeding.has(animal.activity) ? 'feeding' : idleAnimals.has(animal.activity) ? 'idle' : null;
  return state ? `${animal.species}-${state}` : null;
}

/** fullAt is an explicit presentation threshold in the SAME units as amount.
 * Positive amounts require it; zero is empty independently. Never assume tank or
 * depot capacity. Water container is explicit (trough default, bucket optional). */
export function resolveSupplyAsset(resource, amount, { fullAt, carried = false, container = 'trough' } = {}) {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (resource === 'water' && !['trough', 'bucket'].includes(container)) return null;
  const subject = own({ wood: 'wood', hay: 'hay', food: 'ration', ration: 'ration', manure: 'compost', compost: 'compost', water: carried || container === 'bucket' ? 'water-bucket' : 'water-trough' }, resource);
  if (!subject) return null;
  if (carried && amount > 0) return `${subject}-carried`;
  if (amount === 0) return `${subject}-empty`;
  if (!Number.isFinite(fullAt) || fullAt <= 0) return null;
  return `${subject}-${amount >= fullAt ? 'full' : 'partial'}`;
}

/** The frame's carrying.material is currently always wood even for care jobs.
 * Pose uses amount only. Read replay material/task resource separately for props. */
export function resolveWorkerAsset(worker) {
  if (!worker) return null;
  const name = String(worker.name || worker.id || '').toLowerCase();
  if (!workers.has(name) && name !== 'marley') return null;
  const amount = worker.carrying?.amount ?? worker.cargo ?? 0;
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (name === 'marley') {
    // This authored carry pose includes a stick, so never show it for water/feed.
    if (amount > 0) return ['carrying-materials', 'unloading'].includes(worker.activity) && (!worker.material || worker.material === 'wood') ? 'marley-carried' : null;
    if (worker.activity === 'resting') return 'marley-rest';
    return workerIdle.has(worker.activity) || worker.activity === 'collecting' ? 'marley-idle' : null;
  }
  if (amount > 0) return `${name}-carry`;
  if (workerWork.has(worker.activity)) return `${name}-work`;
  if (workerIdle.has(worker.activity)) return `${name}-idle`;
  return null;
}

/** Convenience context derived only from known residents. Conflicting species in
 * a habitat are deliberately unresolved. Pre-arrival projects need external map. */
export function speciesByHabitatFromFrame(frame) {
  const result = Object.create(null), conflicts = new Set();
  for (const animal of frame?.animals || []) {
    if (!animal.habitat || !animal.species) continue;
    if (result[animal.habitat] && result[animal.habitat] !== animal.species) conflicts.add(animal.habitat);
    result[animal.habitat] = animal.species;
  }
  for (const habitat of conflicts) delete result[habitat];
  return result;
}
