// A "sensible play" bot for the card battles, used by the balance check and
// the end-to-end playthrough. Not clever: it closes to the range its guns
// like, aims before its best shot, spends heat up to a budget that keeps it
// under the heat-penalty line after its sinks, vents when hot, patches
// armour when hurt and braces with what is left.
import { createBattle, handView, playCard, endTurn } from '../src/core/battle.js';

const expDamage = (b, c) => {
  const e = b.cards.cards[c.id].effect;
  if (e.kind === 'melee') return c.hit * 5;
  const w = b.player.weapons.find(x => x.key === e.weapon);
  const d = w ? w.def.damage * (w.def.missiles ? 1.4 : 1) : 0;
  return c.hit * d;
};

function preferredRange(b) {
  const shorts = b.player.weapons.filter(w => w.def.kind !== 'melee').map(w => w.def.short);
  // Close enough that most guns are at short range, but not into the enemy's fists.
  shorts.sort((x, y) => x - y);
  return Math.max(2, (shorts[Math.floor(shorts.length / 2)] ?? 6) - 1);
}

export function botTurn(b, rng) {
  const P = b.player;
  const budget = () => P.sinks + 7 - P.heat; // heat we can still add this round
  for (let guard = 0; guard < 20 && !b.over; guard++) {
    const hand = handView(b).filter(c => c.playable);
    if (!hand.length) break;
    const by = (k) => hand.filter(c => c.kind === k);
    const play = (c) => playCard(b, c.index, rng).ok;
    // Hot: vent first.
    const vent = by('vent')[0];
    if (vent && P.heat >= 10) { if (play(vent)) continue; }
    // Move toward the range the guns like; evade if already there.
    if (!P.turnState.moved) {
      const want = preferredRange(b);
      const mv = hand.filter(c => c.kind === 'move' && c.heat <= budget())
        .find(c => (b.cards.cards[c.id].effect.dir < 0) === (b.range > want));
      if (mv && Math.abs(b.range - want) > 2) { if (play(mv)) continue; }
      const ev = by('evade').find(c => c.heat <= budget());
      if (ev && Math.abs(b.range - want) <= 2) { if (play(ev)) continue; }
    }
    // Patch armour once it is worth it.
    const fix = by('repair')[0];
    if (fix) {
      const gap = Object.keys(P.mech.armor).reduce((n, l) => Math.max(n, P.mech.maxArmor[l] - P.mech.armor[l]), 0);
      if (gap >= 4) { if (play(fix)) continue; }
    }
    // Attacks, best expected damage first, within the heat budget.
    const shots = hand.filter(c => c.hit !== null && c.hit > 0.08 && c.heat <= budget())
      .sort((x, y) => expDamage(b, y) - expDamage(b, x));
    if (shots.length) {
      const aim = hand.find(c => (c.kind === 'aim') && c.heat + shots[0].heat <= budget());
      if (aim && shots[0].hit < 0.9 && P.turnState.aim === 0) { if (play(aim)) continue; }
      const boost = hand.find(c => (c.kind === 'laserBonus' || c.kind === 'laserMult') && c.heat + shots[0].heat <= budget());
      if (boost && b.cards.cards[shots[0].id].effect.kind === 'attack') { if (play(boost)) continue; }
      if (play(shots[0])) continue;
    }
    if (vent && P.heat > P.sinks) { if (play(vent)) continue; }
    const brace = by('brace')[0];
    if (brace) { if (play(brace)) continue; }
    break;
  }
  if (!b.over) endTurn(b, rng);
}

export function fight(def, data, hero, opts = {}, rng = Math.random) {
  const b = createBattle(def, data, hero, { ...opts, rng });
  for (let i = 0; i < 60 && !b.over; i++) botTurn(b, rng);
  return b;
}

export function winRate(def, data, hero, opts, n, seedFn) {
  let wins = 0;
  for (let i = 0; i < n; i++) if (fight(def, data, hero, opts, seedFn(i)).result === 'win') wins++;
  return wins / n;
}
