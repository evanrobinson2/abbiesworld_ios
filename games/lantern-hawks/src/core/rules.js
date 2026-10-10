// Combat rules: pure functions, no DOM, no randomness of their own.
// Used by the card battle in battle.js.
// Numbers follow the engine notes (to-hit target number, heat, hit tables).
// Anything that needs dice takes an `rng` that returns a float in [0, 1).

export const MOVE_MOD = { stand: 0, walk: 1, run: 2, jump: 3 };

// Squares the target moved -> to-hit modifier (0-2 +0, 3-4 +1, 5-6 +2, 7-9 +3, 10-12 +4).
const TARGET_MOVE_TABLE = [0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4];
export function targetMoveMod(squares) {
  const s = Math.max(0, Math.floor(squares));
  return s >= TARGET_MOVE_TABLE.length ? 4 : TARGET_MOVE_TABLE[s];
}

// Heat 8+ +1, 13+ +2, 17+ +3, 24+ +4.
export function heatMod(heat) {
  if (heat >= 24) return 4;
  if (heat >= 17) return 3;
  if (heat >= 13) return 2;
  if (heat >= 8) return 1;
  return 0;
}

// 0 short, 1 medium, 2 long, null out of range. Limits are "below" values.
export function rangeBracket(weapon, distance) {
  if (distance < weapon.short) return 0;
  if (distance < weapon.medium) return 1;
  if (distance < weapon.long) return 2;
  return null;
}

// Ranged to-hit target number: hit if 2d6 >= TN.
export function toHitTN({ bracket, attackerMove = 'stand', targetSquares = 0, heat = 0, skill = 0, sensorHits = 0, cover = 0 }) {
  return 4 + 2 * bracket + (MOVE_MOD[attackerMove] ?? 0) + targetMoveMod(targetSquares)
    + (sensorHits > 0 ? 2 : 0) + heatMod(heat) - skill + cover;
}

// Melee (the engine's kick formula, used here for the fist): base 3, Piloting.
export function meleeTN({ attackerMove = 'stand', targetSquares = 0, heat = 0, piloting = 0, actuatorPenalty = 0 }) {
  return 3 + actuatorPenalty + (MOVE_MOD[attackerMove] ?? 0) + targetMoveMod(targetSquares) + heatMod(heat) - piloting;
}

// Probability that 2d6 >= tn.
export function prob2d6AtLeast(tn) {
  if (tn <= 2) return 1;
  if (tn > 12) return 0;
  let n = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= tn) n++;
  return n / 36;
}

export function roll2d6(rng) {
  return d6(rng) + d6(rng);
}
export function d6(rng) {
  return 1 + Math.floor(rng() * 6);
}

// ---- Heat -----------------------------------------------------------------
export const MOVE_HEAT = { stand: 0, walk: 1, run: 2, jump: 3 };

// Heat limits for the card battles. Cards add heat as they are played;
// sinks remove it at the end of the round. Ending a round above REDLINE
// damages the centre torso; at SHUTDOWN the mech loses its next turn.
export const REDLINE = 20;
export const SHUTDOWN = 30;
export const HEAT_CAP = 40;

export function addHeat(heat, n) {
  return Math.max(0, Math.min(HEAT_CAP, heat + n));
}

// End of round: sinks cool, then penalties are read off what is left.
export function endRoundHeat(heat, sinks) {
  const after = Math.max(0, heat - sinks);
  return {
    heat: after,
    overheatDamage: after > REDLINE ? after - REDLINE : 0,
    shutdown: after >= SHUTDOWN,
  };
}

// Movement points after heat: MP - heat/5 (floor), 0 at shutdown.
export function effectiveMP(walkMP, heat) {
  if (heat >= 30) return 0;
  return Math.max(0, walkMP - Math.floor(heat / 5));
}
export function runMP(walkMP) {
  return Math.ceil(walkMP * 1.5);
}

// ---- Hit location and damage ----------------------------------------------
// Front table (the engine's table 1).
export const FRONT_TABLE = { 2: 'CT', 3: 'RA', 4: 'RA', 5: 'RL', 6: 'RT', 7: 'CT', 8: 'LT', 9: 'LL', 10: 'LA', 11: 'LA', 12: 'H' };
export const LOCATIONS = ['LA', 'LT', 'LL', 'H', 'CT', 'RA', 'RT', 'RL'];
export const LOCATION_NAMES = { LA: 'left arm', LT: 'left torso', LL: 'left leg', H: 'head', CT: 'centre torso', RA: 'right arm', RT: 'right torso', RL: 'right leg' };
const TRANSFER = { LA: 'LT', LL: 'LT', RA: 'RT', RL: 'RT', LT: 'CT', RT: 'CT', CT: null, H: null };

export function rollLocation(rng, table = FRONT_TABLE) {
  return table[roll2d6(rng)];
}

// Fresh live copy of a mech template's armour and structure.
export function makeMechState(template) {
  return {
    id: template.id,
    armor: { ...template.armor },
    structure: { ...template.structure },
    maxArmor: { ...template.armor },
    maxStructure: { ...template.structure },
    destroyed: false,
  };
}

// Apply damage to one location; overflow moves inward once structure is gone.
// Criticals are not modelled yet (declared gap, see README).
export function applyDamage(mech, loc, dmg) {
  const events = [];
  let where = loc;
  let left = dmg;
  while (left > 0 && where) {
    const a = mech.armor[where] ?? 0;
    const takeA = Math.min(a, left);
    mech.armor[where] = a - takeA;
    left -= takeA;
    let takeS = 0;
    if (left > 0) {
      const s = mech.structure[where] ?? 0;
      takeS = Math.min(s, left);
      mech.structure[where] = s - takeS;
      left -= takeS;
    }
    events.push({ loc: where, armor: takeA, structure: takeS });
    if ((where === 'CT' || where === 'H') && mech.structure[where] <= 0) {
      mech.destroyed = true;
      break;
    }
    where = left > 0 ? TRANSFER[where] : null;
  }
  return events;
}

export function totalArmor(mech) {
  return LOCATIONS.reduce((n, l) => n + (mech.armor[l] ?? 0), 0);
}
export function maxTotalArmor(mech) {
  return LOCATIONS.reduce((n, l) => n + (mech.maxArmor[l] ?? 0), 0);
}

// Practice-duel referee: the school's sensors call the bout when a mech's
// armour falls to half, its centre torso or head armour is gone, or it is
// destroyed outright. Our rule, not the engine's.
export function practiceOut(mech) {
  if (mech.destroyed) return true;
  if ((mech.armor.CT ?? 0) <= 0 || (mech.armor.H ?? 0) <= 0) return true;
  return totalArmor(mech) <= maxTotalArmor(mech) / 2;
}
