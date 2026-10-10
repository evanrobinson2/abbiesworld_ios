// A headless player for end-to-end checks. It drives the real scene runner
// the way the screens do: walking the hex map (paths must exist and the hex
// special must be live), clicking city hotspots (arrival scenes first),
// picking choices by their visible text, and fighting every battle with the
// "sensible" bot on real battle rules.
import { Story } from '../src/core/script.js';
import { nameDict } from '../src/core/names.js';
import { newGame, migrate } from '../src/core/state.js';
import { parseWorld, findHexPath, specialAt, passable, isNeighbor, coverAt } from '../src/core/hex.js';
import { deckExtras, openBooster, addToCollection } from '../src/core/cards.js';
import { vaultRoute } from '../src/core/vault.js';
import { fight } from './bot.mjs';
import { load, seeded, battleData } from './helpers.mjs';

const strip = (o) => { const c = { ...o }; delete c._note; return c; };

export class Player {
  constructor(seed = 1) {
    this.names = load('names.json');
    this.scenes = strip(load('data/scenes.json'));
    this.battles = strip(load('data/battles.json'));
    this.cities = strip(load('data/cities.json'));
    this.party = strip(load('data/party.json'));
    this.vault = load('data/vault.json');
    this.worldRaw = load('data/world.json');
    this.world = parseWorld(this.worldRaw);
    this.data = battleData();
    this.dict = nameDict(this.names);
    this.rng = seeded(seed);
    this.state = migrate(newGame(this.names, this.worldRaw));
    this.story = new Story({ scenes: this.scenes, state: this.state, dict: this.dict, party: this.party, rng: this.rng });
    this.open = false;     // a scene is on screen
    this.ended = null;     // { kind, text } once the story ends
    this.log = [];         // battles fought: { id, result }
    this.forceResult = null; // set to 'win' / 'lose' to skip the bot
  }

  // ---- moving around ----
  walkTo(q, r) {
    const st = this.state;
    const path = findHexPath(this.world, st.pos, { q, r });
    if (!path) throw new Error(`no route to ${q},${r}`);
    for (const s of path.steps) { st.prevPos = st.pos; st.pos = s; }
    return path;
  }

  // Walk onto (or next to, if impassable) a hex with a scene special and open it.
  hex(q, r) {
    this.walkTo(q, r);
    const sp = specialAt(this.world, q, r, this.state);
    if (!sp?.scene) throw new Error(`no scene special live at ${q},${r}`);
    if (!passable(this.world, q, r) && !isNeighbor(this.state.pos, { q, r })) throw new Error('not next to it');
    this.state.location = 'map';
    this.openScene(sp.scene, { kind: 'map' });
  }

  city(id) {
    const sp = this.world.specials.find(s => s.city === id && specialAt(this.world, s.q, s.r, this.state) === s);
    if (!sp) throw new Error(`city ${id} is not open on the map`);
    this.walkTo(sp.q, sp.r);
    this.state.location = `city:${id}`;
    const arrival = (this.cities[id].arrive || []).find(a => this.story.constructor && this.cond(a.if));
    if (arrival) { this.openScene(arrival.scene, { kind: 'city', city: id }); this.finish(); }
  }

  cond(c) { return import.meta && c ? evalCondCompat(c, this.state) : true; }

  spot(hotspotId) {
    const id = this.state.location.slice(5);
    const hs = this.cities[id].hotspots.find(h => h.id === hotspotId);
    if (!hs) throw new Error(`no hotspot ${hotspotId} in ${id}`);
    const scene = this.state.mapVariant === 'ruined' && hs.sceneAfterRaid ? hs.sceneAfterRaid : hs.scene;
    this.openScene(scene, { kind: 'city', city: id });
  }

  room(id) {
    if (this.state.location !== 'vault') throw new Error('not in the vault');
    this.state.vaultNode ??= this.vault.start;
    const r = vaultRoute(this.vault, this.state, this.state.vaultNode, id);
    if (r.ok) { this.state.vaultNode = id; this.openScene(this.vault.nodes[id].scene, { kind: 'vault' }); return; }
    if (r.locked?.lockScene) { this.state.vaultNode = r.at; this.openScene(r.locked.lockScene, { kind: 'vault' }); return; }
    throw new Error(`cannot reach ${id}: ${r.reason || 'locked'}`);
  }

  // ---- scenes ----
  openScene(id, from) {
    this.from = from;
    this.story.enter(id);
    this.open = true;
    this.drain();
  }

  view() {
    let v = this.story.view();
    while (v.more) v = this.story.next();
    return v;
  }

  // Pick the choice whose text contains `match` (string or RegExp).
  pick(match) {
    if (!this.open) throw new Error(`no scene open (wanted "${match}")`);
    const v = this.view();
    const c = v.choices.find(x => (match instanceof RegExp ? match.test(x.text) : x.text.includes(match)));
    if (!c) throw new Error(`no choice "${match}" in ${v.sceneId}/${v.nodeId}: ${v.choices.map(x => x.text).join(' | ')}`);
    if (!c.enabled) throw new Error(`choice "${c.text}" is disabled: ${c.reason}`);
    this.story.choose(c.index);
    this.drain();
    return this;
  }

  has(match) {
    const v = this.view();
    return v.choices.some(x => x.enabled && x.text.includes(match));
  }

  // Click through Continue / Leave until the scene closes.
  finish() {
    for (let i = 0; i < 40 && this.open; i++) {
      const v = this.view();
      const c = v.choices.find(x => x.enabled);
      if (!c) throw new Error(`stuck in ${v.sceneId}/${v.nodeId}`);
      this.story.choose(c.index);
      this.drain();
    }
    return this;
  }

  drain() {
    for (const ev of this.story.takeEvents()) {
      if (ev.type === 'booster') addToCollection(this.state, openBooster(this.data.cards, this.rng), this.data.cards.maxExtras);
      else if (ev.type === 'end') { this.ended = ev; this.open = false; }
      else if (ev.type === 'exit') {
        this.open = false;
        if (this.state.location !== 'vault' || this.from?.kind === 'vault') {
          if (!this.placed) {
            if (this.from?.kind === 'city') this.state.location = `city:${this.from.city}`;
            else if (this.from?.kind === 'map') this.state.location = 'map';
          }
        }
        this.placed = false;
      } else if (ev.type === 'place') this.placed = true;
      else if (ev.type === 'battle') this.battle(ev);
    }
  }

  battle(ev) {
    const def = this.battles[ev.id];
    const st = this.state;
    let cover = null;
    if (ev.cover === 'map') {
      const from = st.prevPos || st.pos;
      cover = { player: coverAt(this.world, from.q, from.r), enemy: coverAt(this.world, st.pos.q, st.pos.r) };
    }
    const playerMech = def.player.mech === 'active' ? st.mech : def.player.mech;
    let result = this.forceResult;
    if (!result) {
      const b = fight(def, this.data, st.party[0], { extras: deckExtras(st), cover, playerMech }, this.rng);
      result = b.result;
    }
    this.log.push({ id: ev.id, result });
    this.story.resolveBattle(def, result);
    this.drain();
  }

  // Keep fighting a battle choice until it is won (a story fight can be retried).
  winBattle(open, choiceText, retryText = choiceText, tries = 12) {
    open();
    this.pick(choiceText);
    for (let i = 0; i < tries; i++) {
      if (this.log.at(-1).result === 'win') return this;
      if (this.open && this.has(retryText)) this.pick(retryText);
      else { this.finish(); open(); this.pick(choiceText); }
    }
    throw new Error(`could not win ${this.log.at(-1).id} in ${tries} tries`);
  }
}

// Lazy import of evalCond without a cycle at module load.
import { evalCond } from '../src/core/script.js';
function evalCondCompat(c, s) { return evalCond(c, s); }
