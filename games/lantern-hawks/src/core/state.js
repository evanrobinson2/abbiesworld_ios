// Game state: plain data only, so it serialises straight to localStorage.

export const SAVE_VERSION = 1;
export const SKILLS = ['blade', 'pistol', 'rifle', 'gunnery', 'piloting', 'tech', 'medical'];
export const SKILL_LABELS = {
  blade: 'Bow & Blade', pistol: 'Pistol', rifle: 'Rifle', gunnery: 'Gunnery',
  piloting: 'Piloting', tech: 'Tech', medical: 'Medical',
};
export const SKILL_WORDS = ['unskilled', 'amateur', 'competent', 'a whiz', 'grand master'];

export function newGame(names, world) {
  const skills = Object.fromEntries(SKILLS.map(s => [s, 0]));
  return {
    version: SAVE_VERSION,
    money: 20,
    day: 1,
    flags: {},
    items: [],
    mapVariant: 'intact',
    location: world.startLocation,          // 'map' or 'city:<id>'
    pos: { q: world.start.q, r: world.start.r }, // squad figurine on the hex board
    collection: [],                          // booster cards: [{ id, inDeck }]
    mech: 'trainer',
    mechs: ['trainer'],                      // every mech the unit owns; mech is the one you pilot
    party: [
      { id: 'hero', name: names.cast.hero, body: 8, health: 80, maxHealth: 80, skills, weapon: 'Cudgel', armor: null },
    ],
  };
}

// Fill fields added after a save was written, so old saves keep loading.
export function migrate(state) {
  state.mechs ??= state.mech ? [state.mech] : [];
  state.flags ??= {};
  state.items ??= [];
  state.collection ??= [];
  for (const p of state.party) { p.skills ??= {}; p.cards ??= []; }
  return state;
}

export function hero(state) {
  return state.party[0];
}

export function serialize(state) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), state });
}

export function deserialize(text) {
  const data = JSON.parse(text);
  if (!data || data.version !== SAVE_VERSION || !data.state) throw new Error('save from another version');
  const s = data.state;
  if (!s || typeof s.location !== 'string' || !Number.isFinite(s.money) ||
      !Number.isFinite(s.day) || !Number.isInteger(s.pos?.q) || !Number.isInteger(s.pos?.r) ||
      !Array.isArray(s.party) || !s.party.length ||
      s.party.some(p => !p || typeof p.id !== 'string' || !Number.isFinite(p.health) || !Number.isFinite(p.maxHealth)) ||
      (s.items != null && !Array.isArray(s.items)) ||
      (s.collection != null && (!Array.isArray(s.collection) || s.collection.some(c => !c || typeof c.id !== 'string'))) ||
      (s.pendingBoosters != null && (!Array.isArray(s.pendingBoosters) || s.pendingBoosters.some(pack => !Array.isArray(pack) || pack.length !== 3 || pack.some(id => typeof id !== 'string')))) ||
      (s.flags != null && (typeof s.flags !== 'object' || Array.isArray(s.flags)))) {
    throw new Error('Invalid save data');
  }
  return s;
}
