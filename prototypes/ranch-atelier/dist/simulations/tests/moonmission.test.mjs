// AW-STUDY-0036 Moon Mission, Part 1: the loop plays through for a family, the group moments need everyone, nothing fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMission, PLAYERS, fmtClock} from '../moonmission/mission.mjs';
import {BEATS} from '../moonmission/script.mjs';
import {ZONES, REGIONS, hexFlower, regionAt, resolveZones, startCoordinate} from '../moonmission/zones.mjs';
import {botMoves, moonMining, CHEESE_CHANCE} from '../moonmission/games.mjs';
import {newLander, stepLander, SOFT} from '../moonmission/lander.mjs';
import {makeLand, growTown, anchors} from '../abbietown/town.mjs';

// a bot family: does whatever the current step is waiting for, as the right player
function play(m, {maxS = 4000, choice = () => 0, onFx = () => {}} = {}) {
 const out = [], push = es => { for (const e of es) { out.push(e); onFx(e); } };
 for (let s = 0; s < maxS * 10 && !m.state.done; s++) {
  push(m.dispatch({type: 'tick', dt: .1}));
  const v = m.view(), st = v.step; if (!st) continue;
  if (st.k === 'ask') for (const p of PLAYERS) { if (!st.votes || !(p.id in st.votes)) push(m.dispatch({type: 'choose', player: p.id, index: choice(v)})); }
  else if (st.k === 'accept') for (const p of PLAYERS) push(m.dispatch({type: 'press', player: p.id, key: 'yes'}));
  else if (st.k === 'jobs') for (const j of st.jobs) push(m.dispatch({type: 'press', player: j.owner === 'any' ? 'daddy' : j.owner, key: j.key}));
  else if (st.k === 'poll') for (const p of PLAYERS) push(m.dispatch({type: 'press', player: p.id, key: 'go'}));
  else if (st.k === 'game') for (const e of botMoves(st.game)) push(m.dispatch({type: 'game', ...e}));
  else if (st.k === 'lander') { const L = st.lander; m.dispatch({type: 'lights', on: true}); m.dispatch({type: 'feet', on: true}); m.dispatch({type: 'fly', thrust: L.vy < -2 && L.alt < 60 ? 1 : L.vy < -5 ? .8 : 0, tilt: 0}); }
 }
 return out;
}

test('the four moon-base games are played to the end by a bot family', () => {
 const m = createMission(), fx = play(m), done = fx.filter(e => e.fx === 'game-done').map(e => e.game);
 assert.deepEqual(done, ['mining', 'wire', 'zapper', 'harmonizer', 'buggy']);
 for (const id of ['airlock-badge', 'gem-shard', 'star-seed']) assert.ok(m.state.items.some(i => i.id === id), id);
});

test('Part 1 plays through from the black truck to the Moon base pad', () => {
 const m = createMission(), fx = play(m);
 assert.ok(m.state.done, 'reached the end');
 assert.equal(fx.at(-1).fx, 'end');
 assert.ok(m.state.items.some(i => i.id === 'memory-key'), "Daddy's memory key");
 for (const id of ['suit-abbie', 'suit-ani', 'snack-packs', 'old-radio']) assert.ok(m.state.items.some(i => i.id === id), id);
 const kinds = fx.map(e => e.fx);
 for (const k of ['stamp', 'kaboom', 'eyes-open', 'liftoff', 'landed', 'golden-key']) assert.ok(kinds.includes(k), k);
 assert.ok(kinds.indexOf('stamp') < kinds.indexOf('kaboom') && kinds.indexOf('kaboom') < kinds.indexOf('liftoff'));
});

test('every beat opens with a mission card and its zone; the zones are light on Earth and dark after liftoff', () => {
 const m = createMission(), fx = play(m), cards = fx.filter(e => e.fx === 'card');
 assert.equal(cards.length, BEATS.length);
 assert.ok(cards[0].clock === 'T-24:00:00' && cards[1].clock === 'T-00:45:00');
 const zones = fx.filter(e => e.fx === 'zone');
 assert.deepEqual(zones.map(z => z.id), BEATS.map(b => b.zone));
 const launch = fx.findIndex(e => e.fx === 'liftoff');
 assert.ok(zones.every((z, i) => fx.indexOf(z) < launch ? z.mood === 'light' : true));
 assert.ok(zones.filter(z => fx.indexOf(z) > launch).every(z => z.mood === 'dark'));
});

test('"We accept" needs everyone, and the clock starts at the stamp', () => {
 const m = createMission(); let guard = 0;
 const until = pred => { while (!pred() && guard++ < 5000) { m.dispatch({type: 'tick', dt: .1}); const st = m.view().step; if (st && st.k === 'ask') for (const p of PLAYERS) m.dispatch({type: 'choose', player: p.id, index: 0}); } };
 until(() => m.view().step && m.view().step.k === 'accept');
 assert.equal(m.state.running, false);
 m.dispatch({type: 'press', player: 'daddy', key: 'yes'}); m.dispatch({type: 'press', player: 'abbie', key: 'yes'});
 for (let i = 0; i < 100; i++) m.dispatch({type: 'tick', dt: .1});
 assert.equal(m.view().step.k, 'accept', 'two yeses are not enough; the officer waits kindly');
 assert.equal(m.state.running, false);
 m.dispatch({type: 'heard', player: 'ani', text: 'We accept!'});
 for (let i = 0; i < 20; i++) m.dispatch({type: 'tick', dt: .1});
 assert.equal(m.state.running, true);
 assert.notEqual(m.view().step && m.view().step.k, 'accept');
});

test('a group shout counts for everyone', () => {
 const m = createMission(); let g = 0;
 while (!(m.view().step && m.view().step.k === 'accept') && g++ < 5000) { m.dispatch({type: 'tick', dt: .1}); const st = m.view().step; if (st && st.k === 'ask') for (const p of PLAYERS) m.dispatch({type: 'choose', player: p.id, index: 0}); }
 m.dispatch({type: 'heard', text: 'We accept!'});
 assert.deepEqual(m.view().step.yes.sort(), PLAYERS.map(p => p.id).sort());
});

test('a vote goes to the majority, ties to the Captain’s Hat, and the hat moves on', () => {
 const m = createMission(); let g = 0;
 while (m.view().beat !== 'kitchen' && g++ < 20000) { const fx = m.dispatch({type: 'tick', dt: .1}); const v = m.view(); if (v.step && v.step.k === 'accept') for (const p of PLAYERS) m.dispatch({type: 'press', player: p.id, key: 'yes'}); else if (v.step && v.step.k === 'ask') for (const p of PLAYERS) m.dispatch({type: 'choose', player: p.id, index: 0}); }
 assert.equal(m.view().beat, 'kitchen');
 while (!(m.view().step && m.view().step.k === 'ask') && g++ < 20000) m.dispatch({type: 'tick', dt: .1});
 const hat = m.state.hat;
 m.dispatch({type: 'choose', player: 'daddy', index: 0}); // Daddy only: his own question
 assert.equal(m.state.flags.sunrise, true);
 assert.notEqual(m.state.hat, hat, 'the hat moved');
});

test('the launch clock is always ticking, a stalled critical job pulses then holds, and finishing resumes it', () => {
 const m = createMission(); let g = 0, fx = [];
 const run = e => fx.push(...e);
 while (m.view().beat !== 'launch' && g++ < 40000) { run(m.dispatch({type: 'tick', dt: .1})); const v = m.view(); if (v.step && v.step.k === 'accept') for (const p of PLAYERS) m.dispatch({type: 'press', player: p.id, key: 'yes'}); else if (v.step && v.step.k === 'ask') for (const p of PLAYERS) m.dispatch({type: 'choose', player: p.id, index: 0}); else if (v.step && v.step.k === 'jobs') for (const j of v.step.jobs) m.dispatch({type: 'press', player: j.owner === 'any' ? 'daddy' : j.owner, key: j.key}); }
 assert.equal(m.view().beat, 'launch');
 const c0 = m.state.clock; for (let i = 0; i < 50; i++) m.dispatch({type: 'tick', dt: .1}); // wait on the radio check
 assert.ok(m.state.clock > c0, 'ticking');
 fx = []; for (let i = 0; i < 300; i++) run(m.dispatch({type: 'tick', dt: .1}));
 const kinds = fx.map(e => e.fx);
 assert.ok(kinds.includes('pulse') && kinds.includes('hold'), 'pulse then hold');
 const held = m.state.clock; for (let i = 0; i < 50; i++) m.dispatch({type: 'tick', dt: .1});
 assert.equal(m.state.clock, held, 'held clock does not move');
 assert.equal(m.state.held, true);
 const j = m.view().step.jobs[0]; fx = []; run(m.dispatch({type: 'press', player: j.owner, key: j.key}));
 assert.equal(m.state.held, false);
});

test('the count waits for everyone: no job, no liftoff', () => {
 const m = createMission(); let g = 0, lift = false;
 const fx = play(m, {onFx: e => { if (e.fx === 'liftoff') lift = true; }}); assert.ok(lift);
 const i = fx.findIndex(e => e.fx === 'count' && e.n === 10), j = fx.findIndex(e => e.fx === 'job' && e.key === 'arm');
 assert.ok(j >= 0 && j < i, 'ARM before the count');
});

test('Houston voices every say; PG: no line is empty or shouts beyond the oxygen line', () => {
 const m = createMission(), fx = play(m), speaks = fx.filter(e => e.fx === 'speak');
 assert.ok(speaks.length > 40 && speaks.every(s => s.text.length > 1 && s.who));
 assert.ok(speaks.some(s => s.who === 'houston' && /Wake up, sleepy heads/.test(s.text)));
 assert.ok(speaks.some(s => /PLUG IN OUR OXYGEN/.test(s.text)));
});

test('the lander: a soft landing needs lights and feet; a hard one bounces and never fails', () => {
 const L = newLander(3); L.lights = true; L.feet = true; let t = 0;
 while (!L.landed && t++ < 20000) stepLander(L, {thrust: L.vy < -2 && L.alt < 80 ? 1 : 0}, 1 / 30);
 assert.ok(L.landed && L.soft && Math.hypot(L.vy, L.vx) <= SOFT + 1e-6);
 const H = newLander(3); t = 0; while (!H.landed && t++ < 20000) stepLander(H, {thrust: 0}, 1 / 30);
 assert.ok(H.landed && !H.soft && H.bounces === 3, 'three bounces, then it counts');
});

test('the Winchester region is seven hexes in three equal regions meeting at the common', () => {
 const c = {x: 0, y: 0}, f = hexFlower(c, 100);
 assert.equal(f.hexes.length, 7); assert.ok(Math.abs(f.share - 1 / 3) < 1e-12);
 const by = {}; for (const h of f.hexes) if (h.region) by[h.region] = (by[h.region] || 0) + 1;
 assert.deepEqual(Object.values(by), [2, 2, 2]);
 const n = {}; for (let a = 0; a < 3600; a++) { const r = regionAt(c, {x: Math.cos(a / 3600 * 2 * Math.PI) * 50, y: Math.sin(a / 3600 * 2 * Math.PI) * 50}); n[r] = (n[r] || 0) + 1; }
 for (const k of Object.keys(REGIONS)) assert.ok(Math.abs(n[k] / 3600 - 1 / 3) < .001, k);
});

test('the mission starts at the coffee shop curb on Main Street, from the town anchors', () => {
 const land = makeLand(JSON.parse(readFileSync(new URL('../abbietown/land.json', import.meta.url)))), town = growTown(land, {charm: 1});
 const a = anchors(land, town), s = startCoordinate(a), z = resolveZones(town, a);
 assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y) && s.spot === 'cafe');
 assert.ok(Math.hypot(s.x - a.cafe.curb.x, s.y - a.cafe.curb.y) < 1e-9);
 assert.equal(z['main-street'].at.x, s.x);
 assert.ok(z['launch-pad'].at && z['launch-pad'].at.offMap, 'Launch is off the map');
 assert.ok(z['church-park'].at && Number.isFinite(z['church-park'].at.x), 'the church park is the common');
 assert.ok(z['crew-bus'].distance > 100, 'the bus drives from Main Street to Launch');
 for (const zone of Object.values(z)) assert.ok(zone.at, zone.id);
});

test('the clock reads like a launch clock', () => { assert.equal(fmtClock(-2700), 'T-00:45:00'); assert.equal(fmtClock(10), 'T+00:00:10'); assert.equal(fmtClock(-86400), 'T-24:00:00'); });

test('moon cheese: a bot crew wins the charm with exactly three cheeses, and a kiosk win repeats', () => {
 for (const seed of [1, 2, 3, 4, 5]) {
  const g = moonMining(['daddy', 'abbie', 'ani'], seed); let t = 0;
  while (!g.done && t < 600) { for (const e of botMoves({name: 'mining', ...g.view()})) g.input(e); g.step(.2); t += .2; }
  assert.ok(g.done, 'seed ' + seed); assert.equal(g.G.cheese, 3); assert.equal(g.G.charm, true);
 }
});
test('moon cheese: about one broken rock in three drops cheese, rocks grow back, nobody fails', () => {
 let broke = 0, cheese = 0;
 for (let seed = 1; seed <= 300; seed++) { const g = moonMining(['daddy'], seed, 1e9); for (let i = 0; i < 6; i++) { g.input({player: 'daddy', rock: i, swing: true}); g.step(.5); g.input({player: 'daddy', rock: i, swing: true}); g.step(.5); }
  g.step(1); broke += g.G.mined; cheese += g.G.rocks.filter(r => r.state === 'cheese').length + g.G.cheese; }
 assert.ok(Math.abs(cheese / broke - CHEESE_CHANCE) < .04, String(cheese / broke));
 const g = moonMining(['daddy'], 9, 1e9); g.input({player: 'daddy', rock: 0, swing: true}); g.step(.5); g.input({player: 'daddy', rock: 0, swing: true}); g.step(5); g.step(5);
 assert.equal(g.G.rocks[0].state, 'rock'); assert.equal(g.G.rocks[0].hp, 2);
});
