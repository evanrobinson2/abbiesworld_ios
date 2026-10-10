// Contract tests over the data files: every reference resolves, every art
// key is one the painter covers, and only names from names.json appear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { load, ROOT } from './helpers.mjs';
import { POI_SCENES, STORY_SCENES, PORTRAITS, CARD_ARTS, HEX_ARTS, FIGURES, MECHS } from '../src/gfx/keys.js';
import { nameDict } from '../src/core/names.js';

const scenes = load('data/scenes.json');
const battles = load('data/battles.json');
const cities = load('data/cities.json');
const world = load('data/world.json');
const cards = load('data/cards.json');
const names = load('names.json');
const art = load('data/art.json');
const party = load('data/party.json');
const vault = load('data/vault.json');
delete scenes._note; delete battles._note; delete cities._note; delete party._note;

// Scenes that start each battle (a battle resuming at "@here" needs its won/lost
// nodes in every scene that starts it).
const starters = {};
for (const [sid, sc] of Object.entries(scenes)) for (const n of Object.values(sc.nodes)) {
  for (const c of [...(n.choices || []), n]) for (const e of c.effects || []) if (e.battle) (starters[e.battle] ??= new Set()).add(sid);
}

test('every scene link resolves', () => {
  for (const [sid, sc] of Object.entries(scenes)) {
    const nodes = sc.nodes;
    assert.ok(nodes[sc.start || 'start'], `${sid} start`);
    for (const [nid, n] of Object.entries(nodes)) {
      const where = `${sid}/${nid}`;
      if (n.next) assert.ok(nodes[n.next], `${where} next ${n.next}`);
      for (const r of n.redirect || []) {
        if (r.scene) assert.ok(scenes[r.scene], `${where} redirect scene`);
        else assert.ok(nodes[r.goto], `${where} redirect ${r.goto}`);
      }
      for (const c of n.choices || []) {
        if (c.scene) {
          assert.ok(scenes[c.scene], `${where} -> scene ${c.scene}`);
          if (c.goto) assert.ok(scenes[c.scene].nodes[c.goto], `${where} -> ${c.scene}/${c.goto}`);
        } else if (c.goto) assert.ok(nodes[c.goto], `${where} -> ${c.goto}`);
        for (const e of c.effects || []) if (e.battle) assert.ok(battles[e.battle], `${where} battle ${e.battle}`);
      }
    }
  }
});

test('battles resume at real scene nodes and use real mechs', () => {
  const mechs = load('data/mechs.json').mechs;
  for (const [id, b] of Object.entries(battles)) {
    assert.ok((b.player.mech === 'active' || mechs[b.player.mech]) && mechs[b.enemy.mech], id);
    for (const k of ['win', 'lose']) {
      if (b.sample) continue;
      if (b[k].scene === '@here') {
        assert.ok(starters[id]?.size, `${id} is started somewhere`);
        for (const sid of starters[id]) assert.ok(scenes[sid].nodes[b[k].node], `${sid} needs node ${b[k].node} for ${id}.${k}`);
      } else assert.ok(scenes[b[k].scene]?.nodes[b[k].node], `${id}.${k}`);
    }
    for (const id2 of [...(b.enemy.basics || []), ...(b.enemy.extras || [])]) assert.ok(cards.cards[id2], `${id} cards ${id2}`);
  }
  for (const id of Object.keys(starters)) assert.ok(battles[id], `scene starts unknown battle ${id}`);
});

test('every mech has cards for its weapons and a name slot', () => {
  const m = load('data/mechs.json');
  const slots = new Set(names.mechs.map(x => x.replaces_slot));
  for (const [id, mech] of Object.entries(m.mechs)) {
    assert.ok(slots.has(mech.nameSlot), `${id} name slot`);
    for (const w of mech.weapons) {
      assert.ok(m.weapons[w.w], `${id} weapon ${w.w}`);
      assert.ok(cards.loadout[w.w], `${id}: no card for ${w.w}`);
      assert.ok(mech.structure[w.loc] > 0, `${id}: ${w.w} mounted on a missing ${w.loc}`);
    }
  }
});

test('party members, mech effects and recruits point at real data', () => {
  const mechs = load('data/mechs.json').mechs;
  const txt = JSON.stringify(scenes);
  for (const m of txt.matchAll(/"recruit":"([a-z_]+)"/g)) assert.ok(party[m[1]], `recruit ${m[1]}`);
  for (const m of txt.matchAll(/"(?:addMech|useMech|activeMech|mech)":"([a-z_]+)"/g)) assert.ok(mechs[m[1]], `mech ${m[1]}`);
  for (const [id, p] of Object.entries(party)) for (const c of p.cards) assert.equal(cards.cards[c]?.rarity === undefined, false, `${id} card ${c}`);
  for (const id of ['doctor', 'tech', 'prisoner']) assert.ok(party[id].cards.length, `${id} brings a card`);
  assert.ok(party.doctor.skills.medical >= 4 && party.tech.skills.tech >= 4, 'the tinker quiz is passable with the doctor and the tech');
});

test('the vault map is connected and every room has a scene', () => {
  const ids = Object.keys(vault.nodes);
  assert.ok(vault.nodes[vault.start] && vault.nodes[vault.exit.node]);
  for (const [id, n] of Object.entries(vault.nodes)) {
    assert.ok(scenes[n.scene], `${id} scene`);
    if (n.lock?.lockScene) assert.ok(scenes[n.lock.lockScene], `${id} lock scene`);
    for (const l of n.links) assert.ok(vault.nodes[l]?.links.includes(id), `${id} <-> ${l}`);
    for (const k of ['x', 'y']) assert.ok(n[k] >= 0 && n[k] <= 1);
  }
  const seen = new Set([vault.start]);
  const q = [vault.start];
  while (q.length) for (const l of vault.nodes[q.shift()].links) if (!seen.has(l)) { seen.add(l); q.push(l); }
  assert.equal(seen.size, ids.length);
});

test('cities and the hex map point at real scenes', () => {
  for (const c of Object.values(cities)) for (const a of c.arrive || []) assert.ok(scenes[a.scene], `arrival ${a.scene}`);
  for (const c of Object.values(cities)) for (const h of c.hotspots) {
    assert.ok(scenes[h.scene], `${h.id} scene`);
    if (h.sceneAfterRaid) assert.ok(scenes[h.sceneAfterRaid], `${h.id} after raid`);
    for (const k of ['x', 'y', 'w', 'h']) assert.ok(h[k] >= 0 && h[k] <= 1, `${h.id}.${k}`);
  }
  for (const s of world.specials) {
    if (s.scene) assert.ok(scenes[s.scene], `hex ${s.q},${s.r}`);
    if (s.city) assert.ok(cities[s.city], `hex city ${s.city}`);
    if (s.figure) assert.ok(FIGURES.includes(s.figure));
  }
  for (const t of Object.values(world.terrain)) {
    assert.ok(HEX_ARTS.includes(t.art), t.art);
    if (t.ruinedArt) assert.ok(HEX_ARTS.includes(t.ruinedArt), t.ruinedArt);
  }
});

test('art keys named in data are ones the painter draws (or have a declared stand-in)', () => {
  const painted = new Set([...POI_SCENES, ...STORY_SCENES, ...PORTRAITS]);
  for (const [k, v] of Object.entries(art.fallbacks)) assert.ok(painted.has(v) || MECHS.includes(v), `fallback for ${k} -> ${v} is not painted`);
  const ok = new Set([...painted, ...Object.keys(art.fallbacks)]);
  const mechs = load('data/mechs.json').mechs;
  for (const id of Object.keys(mechs)) assert.ok(MECHS.includes(`mech.${id}`) || art.fallbacks[`mech.${id}`], `mech.${id} art`);
  assert.ok(ok.has(vault.bg), 'vault bg');
  for (const [sid, sc] of Object.entries(scenes)) {
    for (const n of [sc, ...Object.values(sc.nodes)]) {
      if (n.bg) assert.ok(ok.has(n.bg), `${sid} bg ${n.bg}`);
      if (n.portrait) assert.ok(ok.has(n.portrait), `${sid} portrait ${n.portrait}`);
    }
  }
  for (const b of Object.values(battles)) if (b.bg) assert.ok(ok.has(b.bg));
  for (const c of Object.values(cards.cards)) assert.ok(CARD_ARTS.includes(c.art), c.art);
});

test('every {placeholder} in scene text is a known name', () => {
  const dict = nameDict(names);
  const txt = JSON.stringify(scenes);
  for (const m of txt.matchAll(/\{([a-z0-9_]+)\}/gi)) assert.ok(dict[m[1]] !== undefined, `{${m[1]}}`);
});

test('no names from the original or its franchise anywhere in the game', () => {
  const banned = ['battletech', 'kurita', 'steiner', 'pacifica', 'youngblood', 'crescent hawk', 'jenner', 'locust', 'chameleon', 'urbanmech', 'stinger', 'commando', 'wasp', 'katrina', 'rex pearce', 'tellhim', 'rick atlas', 'comstar', 'kell hound', 'marik', 'draconis', 'lyran', 'mechwarrior', 'citadel of'];
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = `${d}/${f}`;
      if (statSync(p).isDirectory()) { if (!['node_modules', 'assets', '.git'].includes(f)) walk(p); }
      else if (/\.(js|mjs|json|html|css|md)$/.test(f)) files.push(p);
    }
  };
  walk(ROOT.replace(/\/$/, ''));
  for (const f of files) {
    if (f.endsWith('tests/data.test.mjs')) continue;
    const t = readFileSync(f, 'utf8').toLowerCase();
    for (const w of banned) assert.ok(!t.includes(w), `"${w}" in ${f}`);
  }
});
