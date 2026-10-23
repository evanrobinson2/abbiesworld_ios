// Champions of the Drifting Isles: content.
// A tribute to the play pattern of 9 Kings (Sad Socket). Every name, line of text, model and sound here is our own;
// only the shape of the rules is borrowed (style yes, expression never).

export const RUN_YEARS = 33;
export const START_LIVES = 3;
export const GOLD_PER_YEAR = 9;
export const WELL_GOLD = 9;          // dropping a card down the well
export const REROLL_BASE = 10;       // first reroll, +10 each after
export const MERCHANT_BASE = 30;     // first purchase, +15 each after
export const MERCHANT_STEP = 15;
export const MAX_LEVEL = 9;
export const KEEP_IN_HAND = 2;       // play or drop cards until this many remain, then the year's battle starts

// The year's calendar. Faithful to the original rhythm: councils, a merchant, the spire (new plots),
// the envoy (war and peace) and the final battle in year 33.
export const CALENDAR = {
  4: 'council', 14: 'council', 21: 'council', 29: 'council',
  10: 'merchant', 25: 'merchant', 31: 'merchant',
  12: 'spire', 19: 'spire', 27: 'spire',
  8: 'war', 23: 'peace',
  33: 'final',
};

export const EVENT_INFO = {
  council: { name: 'Sky Council', icon: 'scroll', line: 'Choose one edict for the rest of the run.' },
  merchant: { name: 'Drifting Merchant', icon: 'coin', line: 'A trader moors at your isle. Buy cards with gold.' },
  spire: { name: 'The Spire', icon: 'spire', line: 'The isle grows. Claim a new plot.' },
  war: { name: 'Envoy of War', icon: 'sword', line: 'Another champion joins the fight against you.' },
  peace: { name: 'Envoy of Peace', icon: 'dove', line: 'Make peace with one rival. They stop attacking.' },
  final: { name: 'Final Siege', icon: 'skull', line: 'Play every card. The strongest rival comes in person.' },
};

// Card types. The art-window shape on each card tells the type at a glance.
export const TYPES = {
  seat: { label: 'Seat', window: 'banner' },
  troop: { label: 'Troop', window: 'shield' },
  tower: { label: 'Tower', window: 'battlement' },
  building: { label: 'Building', window: 'gable' },
  charm: { label: 'Charm', window: 'round' },
  spell: { label: 'Spell', window: 'scroll' },
};

// Unit archetypes: base stats at level 1. Levels multiply hp and damage by 1.25 per level and add `count` units.
// cd: seconds between attacks. range: world units (melee is about 0.9). speed: world units per second.
export const CHAMPIONS = [
  {
    id: 'wren', name: 'Wren the Lamplighter', realm: 'The Lantern Coast',
    color: '#3f7fd9', accent: '#f2c14e', motto: 'Steady light, steady hands.',
    look: { robe: '#3f7fd9', trim: '#f2c14e', hat: 'lantern' },
    seat: 'lighthouse',
    deck: ['pikefolk', 'slingers', 'watchtower', 'smithy', 'bakery', 'brass_banner'],
  },
  {
    id: 'bramble', name: 'Mother Bramble', realm: 'The Tangle',
    color: '#4f9a3a', accent: '#c7e07a', motto: 'Everything grows back.',
    look: { robe: '#4f9a3a', trim: '#8a5a2b', hat: 'leaf' },
    seat: 'elder_stump',
    deck: ['thornbacks', 'sproutlings', 'beehive', 'mushroom_ring', 'rain_pond', 'overgrowth'],
  },
  {
    id: 'copperpot', name: 'Captain Copperpot', realm: 'The Brass Harbour',
    color: '#c46a2f', accent: '#36b3a8', motto: 'Every coin is a soldier.',
    look: { robe: '#c46a2f', trim: '#36b3a8', hat: 'tricorn' },
    seat: 'mint',
    deck: ['tinmen', 'boltcasters', 'spring_cannon', 'vault', 'oilworks', 'lucky_penny'],
  },
  {
    id: 'ember', name: 'The Ember Sisters', realm: 'The Cinderfold',
    color: '#d6453a', accent: '#ffb347', motto: 'Small sparks, big fires.',
    look: { robe: '#d6453a', trim: '#ffb347', hat: 'flame' },
    seat: 'pyre',
    deck: ['cinderlings', 'ash_knights', 'flame_spout', 'kiln', 'ember_shrine', 'spark'],
  },
  {
    id: 'moss', name: 'Old Moss', realm: 'The Stoneholm',
    color: '#7d8a8f', accent: '#9bc46b', motto: 'Walls outlast weather.',
    look: { robe: '#7d8a8f', trim: '#9bc46b', hat: 'helm' },
    seat: 'stone_keep',
    deck: ['shieldbearers', 'crossbows', 'ballista', 'quarry', 'rampart', 'masonry'],
  },
];

export const CARDS = {
  // ---- Wren -------------------------------------------------------------------------------------------------
  lighthouse: { champ: 'wren', type: 'seat', name: 'Lighthouse', rarity: 2, text: 'Your seat. Fires a beam of light at the nearest foe.',
    shooter: { dmg: 10, cd: 1.2, range: 10, kind: 'beam' } },
  pikefolk: { champ: 'wren', type: 'troop', name: 'Pikefolk', rarity: 0, text: 'Sturdy spear fighters.',
    unit: { shape: 'pawn', hp: 14, dmg: 2.6, cd: 0.9, range: 0.9, speed: 2.4, count: 6 } },
  slingers: { champ: 'wren', type: 'troop', name: 'Slingers', rarity: 0, text: 'Throw stones from behind the line.',
    unit: { shape: 'ranged', hp: 9, dmg: 2.4, cd: 1.2, range: 6, speed: 2.3, count: 6, missile: 'stone' } },
  watchtower: { champ: 'wren', type: 'tower', name: 'Watchtower', rarity: 1, text: 'Shoots heavy bolts at the strongest foe.',
    shooter: { dmg: 24, cd: 1.6, range: 11, kind: 'bolt', pick: 'strongest' } },
  smithy: { champ: 'wren', type: 'building', name: 'Smithy', rarity: 1, text: 'Neighbouring troops hit 25% harder per level.',
    aura: { dmg: 0.25 } },
  bakery: { champ: 'wren', type: 'building', name: 'Bakery', rarity: 1, text: 'Each year, neighbouring troops gain 1 unit per level.',
    growth: { units: 1 } },
  brass_banner: { champ: 'wren', type: 'charm', name: 'Brass Banner', rarity: 1, text: 'Charm a troop: +25% health. Stacks.',
    charm: { hp: 0.25 }, target: 'troop' },

  // ---- Bramble ----------------------------------------------------------------------------------------------
  elder_stump: { champ: 'bramble', type: 'seat', name: 'Elder Stump', rarity: 2, text: 'Your seat. Wakes a sproutling every few seconds.',
    summon: { card: 'sproutlings', every: 3.0 } },
  thornbacks: { champ: 'bramble', type: 'troop', name: 'Thornbacks', rarity: 1, text: 'Bristly beasts that charge in fast.',
    unit: { shape: 'brute', hp: 30, dmg: 4, cd: 1.1, range: 1.0, speed: 3.4, count: 3 } },
  sproutlings: { champ: 'bramble', type: 'troop', name: 'Sproutlings', rarity: 0, text: 'A swarm of tiny root-folk.',
    unit: { shape: 'tiny', hp: 6, dmg: 1.2, cd: 0.8, range: 0.8, speed: 2.8, count: 12 } },
  beehive: { champ: 'bramble', type: 'tower', name: 'Beehive', rarity: 1, text: 'Stings anything close, very fast.',
    shooter: { dmg: 4, cd: 0.4, range: 7, kind: 'bee' } },
  mushroom_ring: { champ: 'bramble', type: 'building', name: 'Mushroom Ring', rarity: 1, text: 'Each year, neighbouring troops gain 2 units per level.',
    growth: { units: 2 } },
  rain_pond: { champ: 'bramble', type: 'building', name: 'Rain Pond', rarity: 1, text: 'Neighbouring troops heal 2% a second per level.',
    aura: { regen: 0.02 } },
  overgrowth: { champ: 'bramble', type: 'spell', name: 'Overgrowth', rarity: 2, text: 'Raise any plot by one level.',
    spell: 'levelup', target: 'any' },

  // ---- Copperpot --------------------------------------------------------------------------------------------
  mint: { champ: 'copperpot', type: 'seat', name: 'Copper Mint', rarity: 2, text: 'Your seat. +4 gold per level each year. Flings coins.',
    shooter: { dmg: 7, cd: 1.0, range: 8, kind: 'coin' }, income: 4 },
  tinmen: { champ: 'copperpot', type: 'troop', name: 'Tinmen', rarity: 1, text: 'Wind-up soldiers. Take 30% less damage.',
    unit: { shape: 'brute', hp: 24, dmg: 3, cd: 1.2, range: 0.9, speed: 2.0, count: 4, armor: 0.3 } },
  boltcasters: { champ: 'copperpot', type: 'troop', name: 'Boltcasters', rarity: 0, text: 'Long-range crank crossbows.',
    unit: { shape: 'ranged', hp: 9, dmg: 4, cd: 1.6, range: 8, speed: 2.1, count: 4, missile: 'bolt' } },
  spring_cannon: { champ: 'copperpot', type: 'tower', name: 'Spring Cannon', rarity: 1, text: 'Lobs a bursting ball into crowds.',
    shooter: { dmg: 14, cd: 2.4, range: 12, kind: 'shell', aoe: 1.7 } },
  vault: { champ: 'copperpot', type: 'building', name: 'Vault', rarity: 1, text: '+3 gold per level before every battle.',
    income: 3 },
  oilworks: { champ: 'copperpot', type: 'building', name: 'Oilworks', rarity: 1, text: 'Neighbouring troops and towers attack 20% faster per level.',
    aura: { haste: 0.2 } },
  lucky_penny: { champ: 'copperpot', type: 'charm', name: 'Lucky Penny', rarity: 2, text: 'Charm a plot: each foe it defeats has a 10% chance to drop a coin. Stacks.',
    charm: { loot: 0.1 }, target: 'occupied' },

  // ---- Ember ------------------------------------------------------------------------------------------------
  pyre: { champ: 'ember', type: 'seat', name: 'Lantern Pyre', rarity: 2, text: 'Your seat. Hurls bursting fireballs.',
    shooter: { dmg: 9, cd: 2.0, range: 9, kind: 'fireball', aoe: 1.5 } },
  cinderlings: { champ: 'ember', type: 'troop', name: 'Cinderlings', rarity: 0, text: 'Quick little flames, lots of them.',
    unit: { shape: 'tiny', hp: 5, dmg: 1.6, cd: 0.6, range: 0.8, speed: 3.6, count: 13 } },
  ash_knights: { champ: 'ember', type: 'troop', name: 'Ash Knights', rarity: 1, text: 'Heavy blades wreathed in smoke.',
    unit: { shape: 'brute', hp: 22, dmg: 5.5, cd: 1.3, range: 1.0, speed: 2.3, count: 3 } },
  flame_spout: { champ: 'ember', type: 'tower', name: 'Flame Spout', rarity: 1, text: 'Short range, burns a whole cluster.',
    shooter: { dmg: 6, cd: 0.8, range: 5.5, kind: 'flame', aoe: 1.3 } },
  kiln: { champ: 'ember', type: 'building', name: 'Kiln', rarity: 1, text: 'During battle, fires out a cinderling every 4 s (faster per level).',
    summon: { card: 'cinderlings', every: 4.0 } },
  ember_shrine: { champ: 'ember', type: 'building', name: 'Ember Shrine', rarity: 2, text: 'When a neighbouring unit falls, it bursts for 5 damage per level.',
    aura: { burst: 5 } },
  spark: { champ: 'ember', type: 'charm', name: 'Spark', rarity: 1, text: 'Charm a troop or tower: +25% damage. Stacks.',
    charm: { dmg: 0.25 }, target: 'fighter' },

  // ---- Moss -------------------------------------------------------------------------------------------------
  stone_keep: { champ: 'moss', type: 'seat', name: 'Stone Keep', rarity: 2, text: 'Your seat. Throws boulders into the crowd.',
    shooter: { dmg: 15, cd: 2.2, range: 10, kind: 'boulder', aoe: 1.2 } },
  shieldbearers: { champ: 'moss', type: 'troop', name: 'Shieldbearers', rarity: 1, text: 'Huge shields. Foes go for them first.',
    unit: { shape: 'brute', hp: 40, dmg: 2, cd: 1.2, range: 0.9, speed: 1.9, count: 3, taunt: true } },
  crossbows: { champ: 'moss', type: 'troop', name: 'Crossbows', rarity: 0, text: 'Slow, hard-hitting shots.',
    unit: { shape: 'ranged', hp: 10, dmg: 5, cd: 2.0, range: 9, speed: 2.0, count: 4, missile: 'bolt' } },
  ballista: { champ: 'moss', type: 'tower', name: 'Ballista', rarity: 2, text: 'A giant bolt that pierces a whole line.',
    shooter: { dmg: 40, cd: 3.0, range: 13, kind: 'spear', pierce: true, pick: 'strongest' } },
  quarry: { champ: 'moss', type: 'building', name: 'Quarry', rarity: 1, text: 'Neighbouring towers deal 30% more damage per level.',
    aura: { towerDmg: 0.3 } },
  rampart: { champ: 'moss', type: 'building', name: 'Rampart', rarity: 1, text: 'Neighbouring troops take 10% less damage per level.',
    aura: { guard: 0.1 } },
  masonry: { champ: 'moss', type: 'spell', name: 'Masonry', rarity: 1, text: 'Raise a building or tower by two levels.',
    spell: 'levelup2', target: 'structure' },

  // ---- Merchant specials (any champion) --------------------------------------------------------------------
  wayshrine: { champ: null, type: 'building', name: 'Wayshrine', rarity: 3, text: 'Each year, raises a random plot by one level.',
    yearly: 'levelRandom' },
  mercenaries: { champ: null, type: 'troop', name: 'Sellswords', rarity: 3, text: 'One extra sellsword for every 15 gold you hold.',
    unit: { shape: 'pawn', hp: 16, dmg: 3.2, cd: 1.0, range: 0.9, speed: 2.4, count: 0, perGold: 15 } },
  storm_bell: { champ: null, type: 'tower', name: 'Storm Bell', rarity: 3, text: 'Rings lightning that jumps between four foes.',
    shooter: { dmg: 12, cd: 1.8, range: 11, kind: 'chain', chain: 4 } },
};

export const MERCHANT_POOL = ['wayshrine', 'mercenaries', 'storm_bell'];

// Raiders fill every enemy warband so early years are never empty, and so a rival with an all-building board
// still sends someone. They scale with the year.
export const RAIDER = { shape: 'pawn', hp: 8, dmg: 1.6, cd: 1.0, range: 0.9, speed: 2.2 };

// Edicts from the Sky Council. Three are offered; you keep one for the rest of the run.
export const EDICTS = [
  { id: 'loan', name: 'Royal Loan', icon: 'coin', text: 'Take 99 gold now.' },
  { id: 'drill', name: 'Drill Yard', icon: 'pawn', text: 'Every troop plot fields 2 more units.' },
  { id: 'whetstone', name: 'Whetstones', icon: 'sword', text: 'All your units deal 15% more damage.' },
  { id: 'cloaks', name: 'Thick Cloaks', icon: 'shield', text: 'All your units have 20% more health.' },
  { id: 'lenses', name: 'Spyglass Lenses', icon: 'eye', text: 'Towers and your seat reach 25% farther and hit 15% harder.' },
  { id: 'second_wind', name: 'Second Wind', icon: 'heart', text: 'Regain one life (up to 3).' },
  { id: 'rich_soil', name: 'Rich Soil', icon: 'leaf', text: 'Building effects are 50% stronger.' },
  { id: 'patrons', name: 'Patrons', icon: 'dice', text: 'Your next 3 rerolls are free.' },
  { id: 'boots', name: 'Swift Boots', icon: 'boot', text: 'Your units move and strike 15% faster.' },
  { id: 'tithe', name: 'Tithe', icon: 'coin', text: '+4 gold every year.' },
  { id: 'apprentice', name: 'Apprentices', icon: 'hammer', text: 'Right now, raise your two lowest plots by one level.' },
];

export function cardChamp(id) { return CHAMPIONS.find((c) => c.id === CARDS[id].champ) || null; }
export function champById(id) { return CHAMPIONS.find((c) => c.id === id); }
