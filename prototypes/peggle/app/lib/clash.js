import { clonePegs } from './physics.js';

const LOADOUT_SLOTS = {
  tilt: { x: 0.12, y: 0.18, kind: 'tilt' },
  bomb: { x: 0.88, y: 0.18, kind: 'bomb' },
  redBomb: { x: 0.88, y: 0.32, kind: 'redBomb' },
};

export function livingCritters(critters = []) {
  return critters.filter((critter) => critter.hearts > 0);
}

export function frontmostLiving(critters = []) {
  return critters.find((critter) => critter.hearts > 0) ?? null;
}

export function injectLoadoutPegs(pegs, loadout = []) {
  const packed = new Set(loadout);
  const extra = [];
  if (packed.has('tilt')) extra.push({ ...LOADOUT_SLOTS.tilt });
  if (packed.has('bomb')) extra.push({ ...LOADOUT_SLOTS.bomb });
  if (packed.has('redBomb')) {
    extra.push(
      packed.has('bomb')
        ? { ...LOADOUT_SLOTS.redBomb }
        : { ...LOADOUT_SLOTS.redBomb, y: LOADOUT_SLOTS.bomb.y }
    );
  }
  return [...pegs, ...extra];
}

export function createClashState(campaign, bed, loadout = []) {
  const defs = new Map((campaign.critters ?? []).map((critter) => [critter.id, critter]));
  const critters = (bed.encounter ?? []).map((id) => {
    const def = defs.get(id) ?? { id, name: id, hearts: 3, attack: 1, cadence: 1, armor: 'none' };
    return {
      id: def.id,
      name: def.name,
      hearts: def.hearts,
      maxHearts: def.hearts,
      attack: def.attack,
      cadence: def.cadence,
      armor: def.armor ?? 'none',
      cooldown: 0,
    };
  });
  const hearts = campaign.clash?.playerHearts ?? 12;
  return {
    playerHearts: hearts,
    maxPlayerHearts: hearts,
    critters,
    lastReport: 'Each dewdrop is one turn.',
    tiltCharges: 0,
    tiltPrompt: false,
    tiltArmed: false,
    loadout: [...new Set(loadout)].slice(0, campaign.clash?.maxLoadout ?? 2),
  };
}

export function applyArmor(amount, armor, isBomb) {
  if (amount <= 0) return 0;
  if (armor === 'halfUnlessBomb' && !isBomb) {
    return Math.max(1, Math.floor(amount / 2));
  }
  return amount;
}

export function damageCritter(critter, amount, isBomb) {
  const dealt = applyArmor(amount, critter.armor, isBomb);
  critter.hearts = Math.max(0, critter.hearts - dealt);
  return dealt;
}

function applyFrontDamage(critters, amount, isBomb) {
  const target = frontmostLiving(critters);
  if (!target || amount <= 0) return null;
  return { id: target.id, name: target.name, amount: damageCritter(target, amount, isBomb) };
}

function applyUniversal(critters, amount, isBomb) {
  const dealt = [];
  for (const critter of critters) {
    if (critter.hearts <= 0) continue;
    dealt.push({
      id: critter.id,
      name: critter.name,
      amount: damageCritter(critter, amount, isBomb),
    });
  }
  return dealt;
}

function joinNames(items) {
  const names = items.map((item) => item.name);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`;
}

export function applyShotDamage(campaign, critters, hits = [], { glowCleared = false } = {}) {
  const clash = campaign.clash ?? {};
  const bits = [];

  for (const hit of hits) {
    if (hit.kind === 'tilt') {
      bits.push('The compass peg gifted a Tilt Ball.');
      continue;
    }
    if (hit.kind === 'glow') {
      const dealt = applyFrontDamage(critters, clash.glowDamage ?? 2, false);
      if (dealt) bits.push(`A glow seed tapped ${dealt.name} (${dealt.amount} hearts).`);
      continue;
    }
    if (hit.kind === 'seed') {
      const dealt = applyFrontDamage(critters, clash.seedDamage ?? 1, false);
      if (dealt) bits.push(`A gem seed tapped ${dealt.name} (${dealt.amount} hearts).`);
      continue;
    }
    if (hit.kind === 'bomb') {
      applyUniversal(critters, clash.bombDamage ?? 3, true);
      bits.push('Bomb seeds splashed every critter.');
      continue;
    }
    if (hit.kind === 'redBomb') {
      applyUniversal(critters, (clash.bombDamage ?? 3) * (clash.redBombMultiplier ?? 4), true);
      bits.push('Red bomb seeds made a big splash on every critter.');
    }
  }

  if (glowCleared) {
    applyUniversal(critters, clash.boardClearBurst ?? 8, false);
    bits.push('The glow seeds all woke, and every critter felt a garden burst.');
  }

  return {
    critters,
    report: bits.join(' ') || 'The dewdrop rolled through.',
  };
}

export function tickCritterCadence(critters, playerHearts) {
  let incoming = 0;
  const attackers = [];
  for (const critter of critters) {
    if (critter.hearts <= 0) continue;
    if ((critter.cooldown ?? 0) <= 0) {
      incoming += critter.attack;
      attackers.push(critter);
      critter.cooldown = Math.max(0, (critter.cadence ?? 1) - 1);
    } else {
      critter.cooldown -= 1;
    }
  }
  const nextHearts = Math.max(0, playerHearts - incoming);
  const report =
    attackers.length > 0
      ? `${joinNames(attackers)} took a garden turn. Your hearts: ${nextHearts}.`
      : '';
  return { playerHearts: nextHearts, incoming, attackers, report };
}

export function maybeSpawnTiltPrompt(clash, chance, rng = Math.random) {
  if ((clash.tiltCharges ?? 0) > 0 && !clash.tiltArmed && rng() < chance) {
    clash.tiltPrompt = true;
  }
  return clash.tiltPrompt === true;
}

export function activateTiltPrompt(clash) {
  if (!clash?.tiltPrompt || (clash.tiltCharges ?? 0) <= 0) return false;
  clash.tiltCharges -= 1;
  clash.tiltPrompt = false;
  clash.tiltArmed = true;
  return true;
}

export function resolveClashTurn(round, { hits = [], glowCleared = false } = {}) {
  const clash = round.clash;
  if (!clash || !round.campaign.clash) {
    return { won: false, rest: false, report: '', reset: false };
  }

  const damage = applyShotDamage(round.campaign, clash.critters, hits, { glowCleared });
  clash.lastReport = damage.report;

  if (glowCleared) {
    round.pegs = clonePegs(round.templatePegs ?? round.bed.pegs);
  }

  if (livingCritters(clash.critters).length === 0) {
    return { won: true, rest: false, report: damage.report, reset: glowCleared };
  }

  const attack = tickCritterCadence(clash.critters, clash.playerHearts);
  clash.playerHearts = attack.playerHearts;
  if (attack.report) {
    clash.lastReport = [damage.report, attack.report].filter(Boolean).join(' ');
  }

  if (clash.playerHearts <= 0) {
    return { won: false, rest: true, report: clash.lastReport, reset: glowCleared };
  }

  return { won: false, rest: false, report: clash.lastReport, reset: glowCleared };
}
