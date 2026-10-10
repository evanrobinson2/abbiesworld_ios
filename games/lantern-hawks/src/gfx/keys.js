// The art roles the game asks for. The procedural painter draws every key
// listed here; assets/manifest.json can replace any of them with a file.
// tests/assets.test.mjs fails if data names a key the painter doesn't cover.

export const POI_SCENES = [
  'scene.poi.training', 'scene.poi.hall', 'scene.poi.barracks', 'scene.poi.citadel', 'scene.poi.comms',
  'scene.poi.hospital', 'scene.poi.arms', 'scene.poi.outfitter', 'scene.poi.lounge', 'scene.poi.garage',
  'scene.poi.field', 'scene.poi.street',
];
export const STORY_SCENES = ['scene.story.dream', 'scene.story.raid', 'scene.story.ruins', 'scene.story.road', 'scene.title'];

export const PORTRAITS = [
  'portrait.hero', 'portrait.drillmaster', 'portrait.regent', 'portrait.rival', 'portrait.father',
  'portrait.barkeep', 'portrait.medic', 'portrait.mechanic', 'portrait.shopkeep', 'portrait.crewchief',
  'portrait.soldier', 'portrait.sentry', 'portrait.cadet', 'portrait.drunk', 'portrait.clerk',
];

// Hex tiles: hex.<art>.<variant>, two variants each.
export const HEX_ARTS = ['plains', 'forest', 'dense_forest', 'hills', 'mountains', 'river', 'lake', 'bridge', 'road', 'ruins', 'cave', 'city', 'city_burning', 'port'];
export const HEX_VARIANTS = 2;
export function hexKey(art, v) { return `hex.${art}.${v}`; }

export const FIGURES = ['fig.squad', 'fig.mech.harrier'];

// Characters drawn as small sprites (used in city scenes and as references).
export const CHARACTERS = ['hero', 'npc.cadet', 'npc.vendor', 'npc.mechanic'];
export function spriteKey(who, dir = 'down', frame = 0) {
  return who === 'hero' ? `sprite.hero.walk.${dir}.${frame}` : `sprite.${who}.${dir}.${frame}`;
}

export const MECHS = ['mech.trainer', 'mech.scout', 'mech.hunter'];

export const CARD_ARTS = ['card.laser', 'card.gun', 'card.missile', 'card.fist', 'card.boot', 'card.move', 'card.shield', 'card.vent', 'card.aim', 'card.bolt', 'card.wrench'];

// City art keys come from cities.json (art.intact / art.ruined).
