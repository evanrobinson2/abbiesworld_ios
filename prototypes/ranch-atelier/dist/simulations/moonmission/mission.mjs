// AW-STUDY-0036 Moon Mission, Part 1: the mission loop. A deterministic state machine for a family on one TV.
// It knows nothing about drawing, sound or the network: it takes events (press, choose, heard, skip, tick) and returns
// effects (card, speak, caption, fx, item, zone, mood...) for whatever scene is showing. Nothing in it can fail the
// family: a stalled job pulses, then the clock holds; a hard landing bounces; the count waits for everyone.
import {BEATS} from './script.mjs';
import {ZONES} from './zones.mjs';
import {newLander, stepLander} from './lander.mjs';
import {GAMES} from './games.mjs';

export const PLAYERS = [
 {id: 'daddy', name: 'Daddy', color: '#6f9bff'},
 {id: 'abbie', name: 'Abbie', color: '#ff7eb6'},
 {id: 'ani', name: 'Ani', color: '#b18cff'},
];
export const ENGINEER = {id: 'engineer', name: 'Engineer', color: '#6fe3a5'};
const YES = /\b(yes|yeah|yep|accept|we accept|okay|ok)\b/i, GO = /\bgo\b/i, LOUD = /(loud and clear|roger)/i;
const PULSE_S = 8, HOLD_S = 20, VOTE_S = 3, STAMP_S = 1;

export function fmtClock(t) {
 const s = Math.abs(Math.round(t)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, p = n => String(n).padStart(2, '0');
 return (t < 0 ? 'T-' : 'T+') + p(h) + ':' + p(m) + ':' + p(x);
}
export const readTime = text => Math.max(1.6, text.length * .045);

export function createMission({players = PLAYERS, start = null} = {}) {
 const ids = players.map(p => p.id), has = id => ids.includes(id);
 const S = {beat: 0, stack: [], clock: BEATS[0].clock, running: false, held: false, flags: {}, items: [], hat: ids[0], effects: [], done: false, log: [], t: 0, cur: null, start};
 const emit = e => { S.effects.push(e); S.log.push(e); };
 const owner = o => { if (o === 'any') return 'any'; if (o.includes('?')) { const [a, b] = o.split('?'); return has(a) ? a : b; } return has(o) ? o : ids[0]; };

 function beginBeat() {
  const b = BEATS[S.beat]; if (!b) { S.done = true; return; }
  const z = ZONES[b.zone];
  S.clock = b.clock; S.stack = [{steps: b.steps, i: 0}]; S.cur = null;
  emit({fx: 'zone', id: b.zone, mood: z.mood, region: z.region || null});
  emit({fx: 'card', org: 'HOUSTON BASECAMP', clock: fmtClock(b.clock), place: z.name.toUpperCase(), mood: z.mood});
  next();
 }
 function next() {
  while (S.stack.length) {
   const f = S.stack[S.stack.length - 1];
   if (f.i >= f.steps.length) { S.stack.pop(); continue; }
   const st = f.steps[f.i++]; if (begin(st)) return; // begin() returns true when the step waits for the family
  }
  S.beat++; beginBeat();
 }
 const unlock = () => { S.cur = null; next(); };

 function begin(st) {
  S.cur = {...st, age: 0};
  switch (st.k) {
   case 'cutscene': S.cur.skips = new Set(); for (const f of st.fx) emit(f.name ? {fx: f.name, ...f} : f); emit({fx: 'cutscene', secs: st.secs}); return true;
   case 'say': emit({fx: 'speak', who: st.who, text: st.text, thought: !!st.thought}); S.cur.wait = readTime(st.text); return true;
   case 'ask': { // by one player, or a vote
    const who = st.by === 'any' || st.by === 'vote' ? null : st.by;
    if (who && !has(who)) { applyPick(st, 0, who); return false; } // that player isn't in this family: the first option stands
    S.cur.votes = {}; S.cur.who = who; emit({fx: 'ask', by: who, hat: S.hat, options: st.options.map(o => o.text)}); return true; }
   case 'accept': S.cur.yes = new Set(); S.cur.label = st.yes; S.cur.stamped = null; emit({fx: 'speak', who: 'officer', text: st.line}); emit({fx: 'accept', line: st.yes}); return true;
   case 'jobs': S.cur.n = 0; S.cur.pulsed = false; S.cur.jobsDone = new Set(); emitJobs(); return true;
   case 'poll': S.cur.ci = 0; S.cur.said = new Set(); callPoll(); return true;
   case 'count': S.cur.n = st.from; S.cur.tick = 0; emit({fx: 'count', n: st.from}); S.clock = -st.from; return true;
   case 'lander': S.cur.L = newLander(S.beat + 1); S.cur.input = {thrust: 0, tilt: 0}; S.lander = S.cur.L; emit({fx: 'lander-start'}); return true;
   case 'game': S.cur.G = GAMES[st.game](ids, S.beat + 7); S.cur.age = 0; emit({fx: 'game-start', game: st.game}); return true;
   case 'fx': emit(st.name ? {fx: st.name, ...st} : st); return false;
   case 'set': Object.assign(S.flags, st.flags); return false;
   case 'startClock': S.running = true; emit({fx: 'clock-start'}); return false;
   case 'item': addItem(st); return false;
   case 'end': S.done = true; emit({fx: 'end', id: st.id}); S.cur = null; return true;
  }
  return false;
 }
 function addItem(it) { if (S.items.some(i => i.id === it.id)) return; const item = {id: it.id, name: it.name, icon: it.icon, from: it.from}; S.items.push(item); emit({fx: 'item', ...item}); }
 // a choice lands: flags, items, then the branch's own steps
 function applyPick(st, idx, by) {
  const o = st.options[idx]; Object.assign(S.flags, o.set || {}); if (o.item) addItem(o.item);
  S.flags[st.id || ('ask' + S.beat)] = idx; S.hat = ids[(ids.indexOf(S.hat) + 1) % ids.length];
  emit({fx: 'chose', by, text: o.text, hat: S.hat});
  if (o.then) S.stack.push({steps: o.then, i: 0});
 }
 function pick(st, idx, by) { applyPick(st, idx, by); unlock(); }
 const jobsLeft = () => S.cur.list.filter(j => !S.cur.jobsDone.has(j.key));
 function activeJobs() { // the jobs the family can do right now
  const left = jobsLeft(); return S.cur.order === 'sequence' ? left.slice(0, 1) : left;
 }
 function emitJobs() { S.cur.list = S.cur.list.map(j => ({...j, owner: owner(j.owner)})); for (const j of activeJobs()) { if (j.line) emit({fx: 'speak', who: 'houston', text: j.line, job: j.key}); emit({fx: 'job', key: j.key, owner: j.owner}); } }
 function callPoll() { const c = S.cur.calls[S.cur.ci]; emit({fx: 'speak', who: 'houston', text: c}); S.cur.said = new Set(); }
 // a press or something heard completes whatever the current step is waiting for
 function press(pl, key) {
  const c = S.cur; if (!c) return;
  if (c.k === 'say' && key === 'next') return unlock();
  if (c.k === 'accept' && key === 'yes') return yes(pl);
  if (c.k === 'jobs') {
   const j = activeJobs().find(j => j.key === key && (j.owner === 'any' || j.owner === pl));
   if (!j) return; c.jobsDone.add(j.key); c.age = 0; c.pulsed = false; emit({fx: 'job-done', key: j.key, by: pl});
   if (S.held) { S.held = false; emit({fx: 'speak', who: 'houston', text: 'And we’re counting again.'}); }
   if (!jobsLeft().length) { emit({fx: 'jobs-done', id: c.id}); return unlock(); }
   if (c.order === 'sequence') for (const n of activeJobs()) { if (n.line) emit({fx: 'speak', who: 'houston', text: n.line, job: n.key}); emit({fx: 'job', key: n.key, owner: n.owner}); }
   return;
  }
  if (c.k === 'poll' && key === 'go') { c.said.add(pl); emit({fx: 'chip', by: pl, text: 'GO'}); if (c.said.size >= ids.length) { c.ci++; if (c.ci >= c.calls.length) return unlock(); callPoll(); } return; }
  if (c.k === 'ask' && key === 'next') return;
 }
 function yes(pl) {
  const c = S.cur; if (c.k !== 'accept' || c.stamped != null) return;
  c.yes.add(pl); emit({fx: 'chip', by: pl, text: c.label || 'yes'});
  if (c.yes.size >= ids.length) { c.stamped = 0; emit({fx: 'speak', who: 'officer', text: 'Thank you, crew.'}); }
  else if (c.yes.size === ids.length - 1) { /* waits kindly */ }
 }
 function heard(pl, text) {
  const c = S.cur; if (!c) return;
  const who = pl && has(pl) ? pl : null;
  if (c.k === 'accept' && YES.test(text)) { if (who) yes(who); else for (const id of ids) yes(id); } // a group shout counts for everyone
  else if (c.k === 'poll' && GO.test(text)) { if (who) press(who, 'go'); else for (const id of ids) press(id, 'go'); }
  else if (c.k === 'jobs' && LOUD.test(text)) { const j = activeJobs().find(j => /^radio-/.test(j.key) && (!who || j.owner === who)); if (j) press(j.owner, j.key); }
 }
 function choose(pl, idx) {
  const c = S.cur; if (!c || c.k !== 'ask' || !has(pl) || (c.who && c.who !== pl) || idx < 0 || idx >= c.options.length) return;
  c.votes[pl] = idx; emit({fx: 'vote', by: pl, index: idx}); if (c.firstVote == null) c.firstVote = 0;
  const voters = c.who ? [c.who] : ids;
  if (voters.every(v => v in c.votes)) resolveAsk();
 }
 function resolveAsk() {
  const c = S.cur, tally = c.options.map(() => 0); for (const v of Object.values(c.votes)) tally[v]++;
  const top = Math.max(...tally); let winners = tally.map((n, i) => n === top ? i : -1).filter(i => i >= 0), idx = winners[0];
  if (winners.length > 1) idx = c.votes[S.hat] != null && winners.includes(c.votes[S.hat]) ? c.votes[S.hat] : winners[0]; // a tie goes to the Captain's Hat
  pick(c, idx, c.who || 'all');
 }

 function tick(dt) {
  S.t += dt; const c = S.cur;
  if (S.running && !S.held && !(c && c.k === 'count')) S.clock += dt; // the launch clock is always ticking (each beat's card re-reads it); a hold stops it
  if (!c) return;
  c.age += dt;
  if (c.k === 'cutscene' && c.age >= c.secs) return unlock();
  if (c.k === 'say' && c.age >= c.wait) return unlock();
  if (c.k === 'ask' && c.firstVote != null) { c.firstVote += dt; if (c.firstVote >= VOTE_S && Object.keys(c.votes).length) resolveAsk(); }
  if (c.k === 'accept' && c.stamped != null) { c.stamped += dt; if (c.stamped >= STAMP_S) return unlock(); }
  if (c.k === 'jobs') {
   if (!c.pulsed && c.age >= PULSE_S) { c.pulsed = true; for (const j of activeJobs()) emit({fx: 'pulse', key: j.key, owner: j.owner}); }
   if (BEATS[S.beat].critical && !S.held && c.age >= HOLD_S) { S.held = true; emit({fx: 'hold', clock: fmtClock(S.clock)}); emit({fx: 'speak', who: 'houston', text: 'We’re holding at ' + fmtClock(S.clock).replace('T-00:00:', 'T minus ') + '. Take your time, crew.'}); }
  }
  if (c.k === 'count') {
   c.tick += dt; while (c.tick >= 1 && c.n > 0) { c.tick -= 1; c.n--; S.clock = -c.n; emit({fx: 'count', n: c.n}); }
   if (c.n === 0) { S.clock = 0; return unlock(); }
  }
  if (c.k === 'game') {
   for (const k of c.G.step(dt)) emit({fx: 'speak', who: k.who, text: k.text});
   if (c.G.done) { emit({fx: 'game-done', game: c.game}); return unlock(); }
  }
  if (c.k === 'lander') {
   const L = c.L, calls = stepLander(L, c.input, dt); for (const k of calls) emit({fx: 'speak', who: k.who, text: k.text});
   if (L.landed) { emit({fx: 'landed', soft: L.soft, bounces: L.bounces}); return unlock(); }
  }
 }
 function game(ev) { const c = S.cur; if (!c || c.k !== 'game') return; for (const k of c.G.input(ev) || []) emit({fx: 'speak', who: k.who, text: k.text}); }
 function skip(pl) { const c = S.cur; if (!c || c.k !== 'cutscene') return; c.skips.add(pl); if (c.skips.size >= ids.length) unlock(); }
 function fly(input) { if (S.cur && S.cur.k === 'lander') Object.assign(S.cur.input, input); }
 function lights(on) { if (S.cur && S.cur.k === 'lander') S.cur.L.lights = on; }
 function feet(on) { if (S.cur && S.cur.k === 'lander') S.cur.L.feet = on; }

 beginBeat();
 return {
  state: S, players,
  dispatch(ev) {
   switch (ev.type) {
    case 'tick': tick(ev.dt); break;
    case 'press': press(ev.player, ev.key); break;
    case 'choose': choose(ev.player, ev.index); break;
    case 'heard': heard(ev.player, ev.text); break;
    case 'skip': skip(ev.player); break;
    case 'fly': fly(ev); break;
    case 'lights': lights(ev.on); break;
    case 'feet': feet(ev.on); break;
    case 'game': game(ev); break;
   }
   return this.drain();
  },
  drain() { const e = S.effects; S.effects = []; return e; },
  view() {
   const c = S.cur, b = BEATS[S.beat];
   return {beat: b && b.id, zone: b && b.zone, clock: fmtClock(S.clock), held: S.held, hat: S.hat, items: S.items, flags: S.flags, done: S.done,
    step: c && {k: c.k, text: c.text, who: c.who, options: c.options && c.options.map(o => o.text), votes: c.votes, yes: c.yes && [...c.yes], jobs: c.k === 'jobs' ? activeJobs().map(j => ({key: j.key, owner: j.owner})) : null, n: c.n, lander: c.L, game: c.k === 'game' ? {name: c.game, ...c.G.view()} : null}};
  },
 };
}
