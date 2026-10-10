// The scene script runner. Pure logic: it reads scene data, checks
// conditions against the game state, applies effects, and hands the UI a
// "view" to draw plus a queue of events (exit, battle, map variant, toast,
// save) to act on. Scene format is documented in README.md.

import { fill } from './names.js';

export const DAILY_FLAGS = ['trained_today', 'class_today', 'arena_today'];

// ---- Conditions -----------------------------------------------------------
function cmp(v, c) {
  if ('eq' in c) return v === c.eq;
  if ('ne' in c) return v !== c.ne;
  if ('gte' in c) return v >= c.gte;
  if ('gt' in c) return v > c.gt;
  if ('lte' in c) return v <= c.lte;
  if ('lt' in c) return v < c.lt;
  return !!v;
}

export function evalCond(c, state) {
  if (c === undefined || c === null) return true;
  if (Array.isArray(c)) return c.every(x => evalCond(x, state));
  if (c.all) return c.all.every(x => evalCond(x, state));
  if (c.any) return c.any.some(x => evalCond(x, state));
  if (c.not) return !evalCond(c.not, state);
  if ('flag' in c) return cmp(state.flags[c.flag] ?? 0, c);
  if ('money' in c) return cmp(state.money, c.money);
  if ('skill' in c) return cmp(state.party[0].skills[c.skill] ?? 0, c);
  if ('item' in c) return state.items.includes(c.item);
  if ('variant' in c) return state.mapVariant === c.variant;
  if ('day' in c) return cmp(state.day, c.day);
  // Party conditions: the best skill anyone in the party has, who is in it,
  // how many, and which mechs the unit owns.
  if ('partySkill' in c) return cmp(partySkill(state, c.partySkill), c);
  if ('member' in c) return state.party.some(p => p.id === c.member);
  if ('partySize' in c) return cmp(state.party.length, c.partySize);
  if ('traitor' in c) return state.party.some(p => p.traitor) === !!c.traitor;
  if ('mech' in c) return ownedMechs(state).includes(c.mech);
  if ('activeMech' in c) return state.mech === c.activeMech;
  throw new Error(`unknown condition ${JSON.stringify(c)}`);
}

export function partySkill(state, skill) {
  return Math.max(0, ...state.party.map(p => p.skills?.[skill] ?? 0));
}

export function ownedMechs(state) {
  return state.mechs ?? (state.mech ? [state.mech] : []);
}

// A party member from data/party.json, as plain save-able data.
export function makeMember(def, id, dict = {}) {
  return {
    id,
    name: fill(def.name, dict),
    body: def.body ?? 6,
    health: def.health ?? 60,
    maxHealth: def.health ?? 60,
    skills: { ...(def.skills || {}) },
    cards: [...(def.cards || [])],
    ...(def.traitor ? { traitor: true } : {}),
  };
}

// ---- Costs ------------------------------------------------------------------
export function costOf(cost, state) {
  if (cost === undefined || cost === null) return 0;
  if (typeof cost === 'number') return cost;
  if (cost.tuition) return 125 * (state.party[0].skills[cost.tuition] ?? 0) + 75;
  throw new Error(`unknown cost ${JSON.stringify(cost)}`);
}

// ---- Effects ----------------------------------------------------------------
// ctx: { party: data/party.json, dict: name dictionary } for recruit effects.
export function applyEffects(effects, state, rng = Math.random, ctx = {}) {
  const events = [];
  for (const e of effects || []) {
    if ('set' in e) state.flags[e.set] = e.value ?? 1;
    else if ('add' in e && !('skill' in e)) state.flags[e.add] = (state.flags[e.add] ?? 0) + (e.n ?? 1);
    else if ('clear' in e) delete state.flags[e.clear];
    else if ('money' in e) {
      state.money = Math.max(0, state.money + e.money);
      events.push({ type: 'toast', text: `${e.money >= 0 ? '+' : ''}${e.money} C-bills` });
    } else if ('skill' in e) {
      const h = state.party[0];
      if (e.chance !== undefined && rng() >= e.chance) continue;
      const before = h.skills[e.skill] ?? 0;
      h.skills[e.skill] = Math.min(e.max ?? 4, before + (e.add ?? 1));
      if (h.skills[e.skill] > before) events.push({ type: 'toast', text: `${e.skill} up to ${h.skills[e.skill]}` });
    } else if ('item' in e) {
      if (!state.items.includes(e.item)) state.items.push(e.item);
    } else if ('removeItem' in e) {
      state.items = state.items.filter(i => i !== e.removeItem);
    } else if ('equip' in e) {
      state.party[0].weapon = e.equip;
    } else if ('wear' in e) {
      state.party[0].armor = e.wear;
    } else if ('heal' in e) {
      for (const p of state.party) p.health = e.heal === 'full' ? p.maxHealth : Math.min(p.maxHealth, p.health + e.heal);
    } else if ('day' in e) {
      state.day += e.day;
      for (const f of DAILY_FLAGS) delete state.flags[f];
    } else if ('variant' in e) {
      state.mapVariant = e.variant;
      events.push({ type: 'variant', value: e.variant });
    } else if ('place' in e) {
      // { place: { location: 'map' | 'city:<id>', q?, r? } }
      if (e.place.location) state.location = e.place.location;
      if (e.place.q !== undefined) state.pos = { q: e.place.q, r: e.place.r };
      events.push({ type: 'place' });
    } else if ('recruit' in e) {
      const def = ctx.party?.[e.recruit];
      if (!def) throw new Error(`recruit: no party member "${e.recruit}"`);
      if (!state.party.some(p => p.id === e.recruit)) {
        const m = makeMember(def, e.recruit, ctx.dict);
        state.party.push(m);
        events.push({ type: 'toast', text: `${m.name} joins the party` });
      }
    } else if ('dismiss' in e) {
      const m = state.party.find(p => p.id === e.dismiss);
      if (m && m.id !== 'hero') {
        state.party = state.party.filter(p => p !== m);
        events.push({ type: 'toast', text: `${m.name} leaves the party` });
      }
    } else if ('addMech' in e) {
      state.mechs = ownedMechs(state);
      if (!state.mechs.includes(e.addMech)) state.mechs.push(e.addMech);
      events.push({ type: 'mech', id: e.addMech });
    } else if ('useMech' in e) {
      state.mechs = ownedMechs(state);
      if (e.replace) state.mechs = state.mechs.filter(m => m !== e.replace);
      if (!state.mechs.includes(e.useMech)) state.mechs.push(e.useMech);
      state.mech = e.useMech;
    } else if ('hurt' in e) {
      const h = state.party[0];
      h.health = Math.max(1, h.health - e.hurt);
      events.push({ type: 'toast', text: `-${e.hurt} health` });
    } else if ('end' in e) {
      events.push({ type: 'end', kind: e.end, text: e.text || '' });
    } else if ('booster' in e) {
      events.push({ type: 'booster', n: e.booster });
    } else if ('battle' in e) events.push({ type: 'battle', id: e.battle, cover: e.cover ?? null });
    else if ('toast' in e) events.push({ type: 'toast', text: e.toast });
    else if ('save' in e) events.push({ type: 'save' });
    else if ('exit' in e) events.push({ type: 'exit' });
    else throw new Error(`unknown effect ${JSON.stringify(e)}`);
  }
  return events;
}

// ---- Runner -------------------------------------------------------------------
export class Story {
  constructor({ scenes, state, dict = {}, rng = Math.random, party = {} }) {
    this.scenes = scenes;
    this.party = party;
    this.state = state;
    this.dict = dict;
    this.rng = rng;
    this.events = [];
    this.sceneId = null;
    this.nodeId = null;
    this.page = 0;
    this.waiting = null; // 'battle' while a battle runs
  }

  snapshot() {
    if (!this.node() || this.waiting) return null;
    return { sceneId: this.sceneId, nodeId: this.nodeId, page: this.page };
  }

  restore(saved) {
    const node = this.scenes[saved?.sceneId]?.nodes[saved?.nodeId];
    const pages = Array.isArray(node?.text) ? node.text.length : 1;
    if (!node || !Number.isInteger(saved.page) || saved.page < 0 || saved.page >= pages) return false;
    // Entry effects already happened before saving. Never grant them twice.
    this.sceneId = saved.sceneId;
    this.nodeId = saved.nodeId;
    this.page = saved.page;
    this.waiting = null;
    this.events = [];
    return true;
  }

  ctx() {
    return { party: this.party, dict: this.dict };
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  scene() {
    return this.scenes[this.sceneId];
  }

  node() {
    return this.scene()?.nodes[this.nodeId];
  }

  enter(sceneId, nodeId) {
    const sc = this.scenes[sceneId];
    if (!sc) throw new Error(`no scene "${sceneId}"`);
    this.sceneId = sceneId;
    this.goto(nodeId || sc.start || 'start');
    return this.view();
  }

  goto(nodeId) {
    let id = nodeId;
    for (let guard = 0; guard < 25; guard++) {
      const n = this.scene().nodes[id];
      if (!n) throw new Error(`scene "${this.sceneId}" has no node "${id}"`);
      this.nodeId = id;
      this.page = 0;
      const hit = (n.redirect || []).find(r => evalCond(r.if, this.state));
      if (!hit) {
        this.push(applyEffects(n.effects, this.state, this.rng, this.ctx()));
        return;
      }
      if (hit.scene) {
        this.sceneId = hit.scene;
        id = hit.goto || this.scenes[hit.scene].start || 'start';
      } else id = hit.goto;
    }
    throw new Error(`redirect loop in scene "${this.sceneId}"`);
  }

  push(events) {
    for (const ev of events) {
      if (ev.type === 'battle') this.waiting = 'battle';
      this.events.push(ev);
    }
  }

  pages() {
    const t = this.node().text;
    if (t === undefined) return [''];
    return Array.isArray(t) ? t : [t];
  }

  choices() {
    const n = this.node();
    const list = [];
    const src = n.choices || (n.next ? [{ text: n.continueText || 'Continue', goto: n.next }] : [{ text: n.leaveText || 'Leave', exit: true }]);
    src.forEach((c, index) => {
      if (!evalCond(c.if, this.state)) return;
      const cost = costOf(c.cost, this.state);
      const meets = evalCond(c.requires, this.state);
      const afford = this.state.money >= cost;
      let text = fill(c.text, this.dict);
      if (cost) text += ` (${cost} C-bills)`;
      list.push({
        index, text, cost,
        enabled: meets && afford,
        reason: !meets ? fill(c.lockedText || 'Not yet', this.dict) : !afford ? `Need ${cost} C-bills` : null,
      });
    });
    return list;
  }

  view() {
    const sc = this.scene();
    const n = this.node();
    const pages = this.pages();
    const last = this.page >= pages.length - 1;
    const pick = (k) => (n[k] !== undefined ? n[k] : sc[k]);
    return {
      sceneId: this.sceneId,
      nodeId: this.nodeId,
      title: fill(sc.title || '', this.dict),
      bg: pick('bg'),
      portrait: pick('portrait'),
      speaker: fill(pick('speaker') || '', this.dict),
      text: fill(pages[this.page], this.dict),
      page: this.page,
      pageCount: pages.length,
      more: !last,
      choices: last ? this.choices() : [],
    };
  }

  next() {
    if (this.page < this.pages().length - 1) this.page += 1;
    return this.view();
  }

  // Returns false if the choice was not allowed.
  choose(index) {
    if (this.waiting) return false;
    const n = this.node();
    const src = n.choices || (n.next ? [{ goto: n.next }] : [{ exit: true }]);
    const c = src[index];
    if (!c) return false;
    const shown = this.choices().find(x => x.index === index);
    if (!shown || !shown.enabled) return false;
    if (shown.cost) this.state.money -= shown.cost;
    this.push(applyEffects(c.effects, this.state, this.rng, this.ctx()));
    if (this.waiting) return true;
    if (c.exit) {
      this.events.push({ type: 'exit' });
      return true;
    }
    if (c.scene) {
      this.enter(c.scene, c.goto);
      return true;
    }
    if (c.goto) this.goto(c.goto);
    return true;
  }

  // Called by the UI when a battle finishes. A battle shared by several
  // scenes (road patrols) names its scene "@here": the story resumes in the
  // scene that started it, at the named node.
  resolveBattle(battleDef, result) {
    const out = battleDef[result];
    this.waiting = null;
    const tally = result === 'win' ? 'battles_won' : 'battles_lost';
    this.state.flags[tally] = (this.state.flags[tally] ?? 0) + 1;
    this.push(applyEffects(out.effects, this.state, this.rng, this.ctx()));
    const scene = !out.scene || out.scene === '@here' ? this.sceneId : out.scene;
    return this.enter(scene, out.node);
  }
}
