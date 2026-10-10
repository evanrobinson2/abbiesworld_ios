// Card battle state machine. Pure: no DOM, randomness injected.
//
// Round: the player draws to a hand of 5 and plays cards one at a time.
// Heat is the budget: each card adds its heat when played. Attack cards show
// their hit chance (the engine's 2d6 target number as a percentage) and
// resolve with a visible 2d6 roll. "End turn" discards the hand; the enemy
// plays from its own small deck; sinks cool both mechs; anyone left above
// the redline takes damage, anyone at shutdown loses a turn; then the
// referee looks for a result.

import * as R from './rules.js';
import { buildDeck, shuffle, draw } from './cards.js';

const MIN_RANGE = 1;
const MAX_RANGE = 60;
const ENEMY_HAND = 4;
const ENEMY_HEAT_CEILING = 14; // the enemy AI will not play past this

function makeSide(spec, data, skills, deckIds, rng, label, cover = 0) {
  const t = data.mechs[spec.mech];
  if (!t) throw new Error(`battle: unknown mech "${spec.mech}"`);
  return {
    id: spec.mech,
    template: t,
    label,
    mech: R.makeMechState({ id: spec.mech, armor: t.armor, structure: t.structure }),
    weapons: t.weapons.map((wi, i) => {
      const wd = data.weapons[wi.w];
      if (!wd) throw new Error(`battle: unknown weapon "${wi.w}"`);
      return { i, key: wi.w, loc: wi.loc, def: wd, ammo: wd.ammo ?? null };
    }),
    heat: 0,
    cover,                                  // terrain cover: shots at this side are harder
    sinks: spec.sinks ?? t.sinks,
    skills,
    pile: { deck: shuffle(deckIds, rng), hand: [], discard: [] },
    turnState: freshTurn(),
    shutdown: false,
  };
}

function freshTurn() {
  return { move: 'stand', squares: 0, moved: false, aim: 0, dmgBonus: 0, laserBonus: 0, laserMult: 1, evade: 0, brace: 0 };
}

// data: { mechs, weapons, cards }  (cards = the whole cards.json)
// cover: { player, enemy } terrain cover (from the hex map, or def.cover).
export function createBattle(def, data, hero, { extras = [], labels = {}, rng = Math.random, cover = null, playerMech = null } = {}) {
  const pMech = playerMech || def.player.mech;
  const cv = { player: cover?.player ?? def.cover?.player ?? 0, enemy: cover?.enemy ?? def.cover?.enemy ?? 0 };
  const pT = data.mechs[pMech];
  const eT = data.mechs[def.enemy.mech];
  const pSkills = { gunnery: hero.skills.gunnery ?? 0, piloting: hero.skills.piloting ?? 0 };
  const eSkills = { gunnery: def.enemy.gunnery ?? 2, piloting: def.enemy.piloting ?? 2 };
  const b = {
    def,
    cards: data.cards,
    round: 1,
    range: def.startRange ?? 30,
    over: false,
    result: null,
    log: [],
    lastRoll: null,
    player: makeSide({ ...def.player, mech: pMech }, data, pSkills, buildDeck(pT, pSkills, data.cards, { extras }), rng, labels.player || 'You', cv.player),
    enemy: makeSide(def.enemy, data, eSkills, buildDeck(eT, eSkills, data.cards, { basics: def.enemy.basics, extras: def.enemy.extras || [] }), rng, labels.enemy || 'Enemy', cv.enemy),
  };
  draw(b.player.pile, data.cards.hand, rng);
  return b;
}

function other(b, side) {
  return side === b.player ? b.enemy : b.player;
}

function card(b, id) {
  return b.cards.cards[id];
}

function weaponFor(side, key) {
  return side.weapons.find(w => w.key === key && (side.mech.structure[w.loc] ?? 0) > 0 && (w.ammo === null || w.ammo > 0));
}

function meleeDamage(spec, side) {
  const div = spec === 'tons/5' ? 5 : 10;
  return Math.max(1, Math.round(side.template.tons / div));
}

// The target number this card would need right now, or null if it can't hit.
export function cardTN(b, side, id) {
  const c = card(b, id);
  const e = c.effect;
  const opp = other(b, side);
  const ts = side.turnState;
  if (e.kind === 'attack') {
    const w = weaponFor(side, e.weapon);
    if (!w) return null;
    const bracket = R.rangeBracket(w.def, b.range);
    if (bracket === null) return null;
    return R.toHitTN({ bracket, attackerMove: ts.move, targetSquares: opp.turnState.squares, heat: side.heat, skill: side.skills[w.def.skill] ?? 0, cover: opp.cover ?? 0 })
      - ts.aim + opp.turnState.evade;
  }
  if (e.kind === 'melee') {
    if (b.range >= 2) return null;
    return e.tnBase + (R.MOVE_MOD[ts.move] ?? 0) + R.targetMoveMod(opp.turnState.squares) + R.heatMod(side.heat)
      - (side.skills.piloting ?? 0) - ts.aim + opp.turnState.evade;
  }
  return null;
}

// The same target number, itemised for the on-screen explanation.
export function tnBreakdown(b, side, id) {
  const e = card(b, id).effect;
  const opp = other(b, side);
  const ts = side.turnState;
  const parts = [];
  const add = (label, value) => { if (value) parts.push({ label, value }); };
  if (e.kind === 'attack') {
    const w = weaponFor(side, e.weapon);
    if (!w) return parts;
    const bracket = R.rangeBracket(w.def, b.range);
    if (bracket === null) return parts;
    parts.push({ label: 'base', value: 4 });
    add(['short range', 'medium range', 'long range'][bracket], 2 * bracket);
    add(`gunnery ${side.skills.gunnery ?? 0}`, -(side.skills[w.def.skill] ?? 0));
    add('target in cover', opp.cover ?? 0);
  } else if (e.kind === 'melee') {
    parts.push({ label: 'base', value: e.tnBase });
    add(`piloting ${side.skills.piloting ?? 0}`, -(side.skills.piloting ?? 0));
  } else return parts;
  add(ts.move === 'run' ? 'you ran' : 'you moved', R.MOVE_MOD[ts.move] ?? 0);
  add('target moved', R.targetMoveMod(opp.turnState.squares));
  add(`heat ${side.heat}`, R.heatMod(side.heat));
  add('aim', -ts.aim);
  add('target evading', opp.turnState.evade);
  return parts;
}

// Everything the UI needs to draw a card in the hand.
export function describeCard(b, side, id) {
  const c = card(b, id);
  const e = c.effect;
  const view = { id, name: c.name, text: c.text, heat: c.heat, art: c.art, rarity: c.rarity, kind: e.kind, playable: true, reason: null, hit: null };
  if (b.over) return { ...view, playable: false, reason: 'Bout over' };
  if (e.kind === 'attack' || e.kind === 'melee') {
    if (e.kind === 'attack' && !weaponFor(side, e.weapon)) return { ...view, playable: false, reason: 'Weapon down' };
    const tn = cardTN(b, side, id);
    if (tn === null) return { ...view, playable: false, reason: e.kind === 'melee' ? 'Get to range 1' : 'Out of range' };
    view.tn = tn;
    view.hit = R.prob2d6AtLeast(tn);
  }
  if ((e.kind === 'move' || e.kind === 'evade') && side.turnState.moved) return { ...view, playable: false, reason: 'Already moved' };
  if (R.addHeat(side.heat, c.heat) >= R.SHUTDOWN) view.warning = 'Will shut you down';
  else if (R.addHeat(side.heat, c.heat) - side.sinks > R.REDLINE) view.warning = 'Past the redline';
  return view;
}

export function handView(b) {
  return b.player.pile.hand.map((id, i) => ({ index: i, ...describeCard(b, b.player, id) }));
}

function hitLocationDamage(b, side, opp, dmg, label, rng) {
  const loc = R.rollLocation(rng);
  const reduced = Math.max(0, dmg - opp.turnState.brace);
  const ev = R.applyDamage(opp.mech, loc, reduced);
  const struct = ev.some(x => x.structure > 0);
  b.log.push({ who: side === b.player ? 'player' : 'enemy', text: `${label} hits the ${R.LOCATION_NAMES[loc]} for ${reduced}${opp.turnState.brace && reduced < dmg ? ' (braced)' : ''}${struct ? ', into the frame' : ''}.` });
}

// Resolve one card for a side. Returns { ok, roll?, tn?, hit? }.
function resolve(b, side, id, rng) {
  const c = card(b, id);
  const e = c.effect;
  const opp = other(b, side);
  const ts = side.turnState;
  const who = side === b.player ? 'player' : 'enemy';
  const name = side === b.player ? c.name : `${side.label}: ${c.name}`;
  let out = { ok: true };

  if (e.kind === 'attack' || e.kind === 'melee') {
    const tn = cardTN(b, side, id);
    if (tn === null) return { ok: false };
    side.heat = R.addHeat(side.heat, c.heat);
    const dice = [R.d6(rng), R.d6(rng)];
    const total = dice[0] + dice[1];
    const hit = total >= tn;
    out = { ok: true, dice, total, tn, hit };
    b.lastRoll = { who, name: c.name, ...out };
    const need = tn <= 2 ? 'auto' : tn > 12 ? 'impossible' : `${tn}+`;
    b.log.push({ who, text: `${name}: rolled ${dice[0]}+${dice[1]}=${total} vs ${need}, ${hit ? 'hit' : 'miss'}.` });
    let dmg;
    if (e.kind === 'attack') {
      const w = weaponFor(side, e.weapon);
      if (w.ammo !== null) w.ammo -= 1;
      dmg = w.def.damage;
      if (w.def.missiles) dmg *= R.roll2d6(rng) >= 8 ? w.def.missiles : 1;
      if (hit && w.def.kind === 'laser') {
        dmg = (dmg + ts.laserBonus) * ts.laserMult;
        ts.laserBonus = 0;
        ts.laserMult = 1;
      }
    } else dmg = meleeDamage(e.damage, side);
    if (hit) dmg += ts.dmgBonus;
    ts.aim = 0;
    ts.dmgBonus = 0;
    if (hit) hitLocationDamage(b, side, opp, dmg, c.name, rng);
    return out;
  }

  side.heat = R.addHeat(side.heat, c.heat);
  if (e.kind === 'move') {
    const walk = R.effectiveMP(side.template.walk, side.heat);
    const mp = e.move === 'run' ? R.runMP(walk) : walk;
    const target = Math.max(MIN_RANGE, Math.min(MAX_RANGE, b.range + e.dir * mp));
    ts.squares = Math.abs(target - b.range);
    ts.move = e.move;
    ts.moved = true;
    b.range = target;
    b.log.push({ who, text: `${name}: range now ${b.range}.` });
  } else if (e.kind === 'evade') {
    ts.move = 'walk';
    ts.squares = Math.max(ts.squares, e.squares);
    ts.moved = true;
    ts.evade += e.tn;
    b.log.push({ who, text: `${name}: shots at ${side === b.player ? 'you' : side.label} are ${e.tn} harder.` });
  } else if (e.kind === 'aim') {
    ts.aim += e.tn;
    ts.dmgBonus += e.damage ?? 0;
    b.log.push({ who, text: `${name}: next shot ${e.tn} easier${e.damage ? `, +${e.damage} damage` : ''}.` });
  } else if (e.kind === 'brace') {
    ts.brace += e.reduce;
    b.log.push({ who, text: `${name}: hits do ${e.reduce} less this round.` });
  } else if (e.kind === 'vent') {
    side.heat = R.addHeat(side.heat, -e.cool);
    if (e.sinks) side.sinks += e.sinks;
    b.log.push({ who, text: `${name}: heat down to ${side.heat}${e.sinks ? `, sinks now ${side.sinks}` : ''}.` });
  } else if (e.kind === 'laserBonus') {
    ts.laserBonus += e.damage;
    b.log.push({ who, text: `${name}: next laser hit +${e.damage}.` });
  } else if (e.kind === 'laserMult') {
    ts.laserMult *= e.mult;
    b.log.push({ who, text: `${name}: next laser hit x${e.mult}.` });
  } else if (e.kind === 'repair') {
    let worst = null, gap = 0;
    for (const l of R.LOCATIONS) {
      const g = side.mech.maxArmor[l] - side.mech.armor[l];
      if (g > gap) { gap = g; worst = l; }
    }
    if (worst) {
      const n = Math.min(gap, e.armor);
      side.mech.armor[worst] += n;
      b.log.push({ who, text: `${name}: +${n} armour on the ${R.LOCATION_NAMES[worst]}.` });
    } else b.log.push({ who, text: `${name}: nothing to patch.` });
  } else throw new Error(`card effect "${e.kind}" not handled`);
  return out;
}

// Player plays the card at hand index i.
export function playCard(b, i, rng) {
  if (b.over) return { ok: false };
  const id = b.player.pile.hand[i];
  if (!id) return { ok: false };
  const v = describeCard(b, b.player, id);
  if (!v.playable) return { ok: false, reason: v.reason };
  const out = resolve(b, b.player, id, rng);
  if (!out.ok) return out;
  b.player.pile.hand.splice(i, 1);
  b.player.pile.discard.push(id);
  decide(b, false);
  return out;
}

// Simple enemy AI: close to its best range, then shoot what it can afford,
// vent when hot, spend leftovers on defence.
export function enemyTurn(b, rng) {
  const E = b.enemy;
  E.turnState = freshTurn();
  if (E.shutdown) {
    E.shutdown = false;
    b.log.push({ who: 'enemy', text: `${E.label} is shut down and sits this round out.` });
    return;
  }
  draw(E.pile, b.def.enemy.hand ?? ENEMY_HAND, rng);
  const hand = E.pile.hand;
  const play = (id) => {
    const out = resolve(b, E, id, rng);
    if (out.ok) { hand.splice(hand.indexOf(id), 1); E.pile.discard.push(id); }
    return out.ok;
  };
  const shorts = E.weapons.filter(w => weaponFor(E, w.key)).map(w => w.def.short);
  const pref = shorts.length ? Math.max(MIN_RANGE, Math.min(...shorts) - 1) : 1;
  if (b.range > pref) {
    const mv = hand.find(id => card(b, id).effect.kind === 'move' && card(b, id).effect.dir < 0);
    if (mv) play(mv);
  }
  if (E.heat > ENEMY_HEAT_CEILING - 4) {
    const v = hand.find(id => card(b, id).effect.kind === 'vent');
    if (v) play(v);
  }
  const attacks = hand.filter(id => ['attack', 'melee'].includes(card(b, id).effect.kind))
    .sort((a, c) => (cardTN(b, E, a) ?? 99) - (cardTN(b, E, c) ?? 99));
  for (const id of attacks) {
    if (b.over) break;
    if (cardTN(b, E, id) === null || cardTN(b, E, id) > 12) continue;
    if (E.heat + card(b, id).heat > ENEMY_HEAT_CEILING) continue;
    play(id);
    decide(b, false);
  }
  for (const id of hand.slice()) {
    const k = card(b, id).effect.kind;
    if ((k === 'brace' || (k === 'evade' && !E.turnState.moved)) && E.heat + card(b, id).heat <= ENEMY_HEAT_CEILING) play(id);
  }
  E.pile.discard.push(...hand.splice(0));
}

function settleHeat(b, side) {
  const r = R.endRoundHeat(side.heat, side.sinks);
  side.heat = r.heat;
  const who = side === b.player ? 'player' : 'enemy';
  if (r.overheatDamage) {
    R.applyDamage(side.mech, 'CT', r.overheatDamage);
    b.log.push({ who, text: `${side === b.player ? 'Your' : side.label + "'s"} reactor runs past the redline: ${r.overheatDamage} damage to the centre torso.` });
  }
  if (r.shutdown) {
    side.shutdown = true;
    b.log.push({ who, text: `${side === b.player ? 'You' : side.label} shut down from heat and will lose a turn.` });
  }
}

// Player ends the turn: enemy acts, heat settles, next round begins.
export function endTurn(b, rng) {
  if (b.over) return b;
  for (let guard = 0; guard < 4; guard++) {
    b.player.pile.discard.push(...b.player.pile.hand.splice(0));
    enemyTurn(b, rng);
    settleHeat(b, b.player);
    settleHeat(b, b.enemy);
    decide(b, true);
    b.round += 1;
    if (b.over) return b;
    b.player.turnState = freshTurn();
    if (!b.player.shutdown) break;
    b.player.shutdown = false;
    b.log.push({ who: 'player', text: 'Your cockpit is dark. You sit out this round while the reactor cools.' });
  }
  draw(b.player.pile, b.cards.hand, rng);
  return b;
}

function armorFraction(side) {
  return R.totalArmor(side.mech) / R.maxTotalArmor(side.mech);
}

// endOfRound: also apply the turn limit.
export function decide(b, endOfRound) {
  if (b.over) return;
  const pOut = R.practiceOut(b.player.mech);
  const eOut = R.practiceOut(b.enemy.mech);
  const timeUp = endOfRound && b.round >= (b.def.maxTurns ?? 99);
  if (!pOut && !eOut && !timeUp) return;
  b.over = true;
  if (pOut && !eOut) b.result = 'lose';
  else if (eOut && !pOut) b.result = 'win';
  else b.result = armorFraction(b.player) > armorFraction(b.enemy) ? 'win' : 'lose';
  b.log.push({ who: 'ref', text: b.result === 'win' ? 'Referee: bout to you.' : `Referee: bout to the ${b.enemy.label}.` });
}
