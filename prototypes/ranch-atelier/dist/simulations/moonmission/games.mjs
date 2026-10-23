// AW-STUDY-0036 Moon Mission games 3 to 6, as pure deterministic models like lander.mjs. Nobody fails: a mistake costs a
// little time or a funny noise, never the game. Each game: create(ids, seed) -> {step(dt) -> calls, input(ev), view(), done}.
// calls are {who, text} lines for the speech layer. ev is {player, ...}.
const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const COLORS = ['red', 'yellow', 'blue', 'green', 'pink', 'purple'];

// 3. Wire puzzle at the airlock panel. Six wires, two colours per player. Press a colour, then the socket it goes to; the right
// socket latches, a wrong one sparks and lets go. After 20 s without progress the panel glows the next right socket.
export function wirePuzzle(ids, seed = 1) {
 const r = rng(seed), sock = COLORS.map((_, i) => i); for (let i = 5; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sock[i], sock[j]] = [sock[j], sock[i]]; }
 const G = {wires: COLORS.map((c, i) => ({color: c, owner: ids[i % ids.length], socket: sock[i], done: false})), held: {}, sparks: 0, idle: 0, hint: null, done: false, said: new Set()};
 return {G,
  step(dt) { const calls = []; if (G.done) return calls; G.idle += dt; if (G.idle > 20 && !G.hint) { const w = G.wires.find(x => !x.done); G.hint = w.color; calls.push({who: 'houston', text: `Try ${w.color} on socket ${w.socket + 1}.`}); }
   if (G.wires.every(w => w.done)) { G.done = true; calls.push({who: 'abbie', text: 'The door is blinking green!'}); } return calls; },
  input(ev) { if (G.done) return; const {player} = ev;
   if (ev.color) { const w = G.wires.find(x => x.color === ev.color && !x.done); if (w && w.owner === player) G.held[player] = w; return; }
   if (ev.socket != null && G.held[player]) { const w = G.held[player]; delete G.held[player]; if (w.socket === ev.socket) { w.done = true; G.idle = 0; G.hint = null; } else G.sparks++; } },
  view() { return {...G, said: undefined, held: Object.fromEntries(Object.entries(G.held).map(([k, w]) => [k, w.color]))}; },
  get done() { return G.done; }};
}

// 4. Bug zapper in the dome. Gem bugs walk a lane toward the habitat; each player zaps the lane their cursor is in. The dome
// lights dim while a bug is nibbling and come back when it is zapped, and the wave always ends.
export function bugZapper(ids, seed = 1, total = 14) {
 const r = rng(seed), G = {bugs: [], spawned: 0, total, zapped: 0, cursor: Object.fromEntries(ids.map((id, i) => [id, i % 5])), light: 1, t: 0, next: 1, done: false, cool: {}};
 return {G,
  step(dt) { const calls = []; if (G.done) return calls; G.t += dt; G.next -= dt;
   if (G.spawned < total && G.next <= 0) { G.bugs.push({lane: Math.floor(r() * 5), d: 1, id: G.spawned}); G.spawned++; G.next = 1.4 + r() * 1.1; if (G.spawned === 1) calls.push({who: 'ani', text: 'Bugs! They’re eating the lights!'}); }
   let nibble = 0; for (const b of G.bugs) { b.d = Math.max(0, b.d - dt * .12); if (b.d === 0) nibble++; } G.light = Math.max(.25, Math.min(1, G.light + (nibble ? -.08 : .15) * dt));
   for (const k of Object.keys(G.cool)) G.cool[k] = Math.max(0, G.cool[k] - dt);
   if (G.spawned >= total && !G.bugs.length) { G.done = true; calls.push({who: 'daddy', text: 'That’s the last one. Lights are back.'}); } return calls; },
  input(ev) { if (G.done) return; const p = ev.player; if (ev.move) G.cursor[p] = Math.max(0, Math.min(4, G.cursor[p] + ev.move)); if (ev.lane != null) G.cursor[p] = ev.lane;
   if (ev.zap && !(G.cool[p] > 0)) { G.cool[p] = .35; const hit = G.bugs.filter(b => b.lane === G.cursor[p]).sort((a, b) => a.d - b.d)[0]; if (hit) { G.bugs.splice(G.bugs.indexOf(hit), 1); G.zapped++; } } },
  view() { return {...G, cool: undefined}; }, get done() { return G.done; }};
}

// 5. Star Child harmonizer. The Star Child hums a phrase; each player owns one note (low, middle, high). Four phrases of
// growing length; the right note in order moves on, a wrong note is a soft sour hum and the phrase repeats from its start.
export function harmonizer(ids, seed = 1) {
 const r = rng(seed), note = Object.fromEntries(ids.map((id, i) => [id, i % 3])), phrases = [3, 4, 5, 6].map(n => Array.from({length: n}, () => Math.floor(r() * 3)));
 const G = {note, phrases, p: 0, i: 0, listening: true, hum: 0, sour: 0, done: false, mood: 0};
 return {G,
  step(dt) { const calls = []; if (G.done) return calls; if (G.listening) { G.hum += dt; if (G.hum > .6 * phrases[G.p].length + 1) { G.listening = false; G.i = 0; calls.push({who: 'abbie', text: 'Now we sing it back.'}); } } return calls; },
  input(ev) { if (G.done || G.listening) return []; const n = G.note[ev.player]; if (phrases[G.p][G.i] === n) { G.i++; G.mood = Math.min(1, G.mood + .05); if (G.i >= phrases[G.p].length) { G.p++; G.mood = (G.p) / 4; if (G.p >= phrases.length) { G.done = true; return [{who: 'ani', text: 'The Star Child is glowing!'}]; } G.listening = true; G.hum = 0; } } else { G.sour++; G.i = 0; G.listening = true; G.hum = 0; } return []; },
  view() { return {...G, phrases: undefined, phrase: phrases[G.p], length: phrases[G.p] && phrases[G.p].length}; }, get done() { return G.done; }};
}

// 6. The buggy ride home. Three lanes, 600 m of crater road. Daddy drives (lane), Abbie calls rocks, Ani works the headlights
// through the shadows. A bump slows the buggy a moment; it always gets home.
export function buggyRide(ids, seed = 1, length = 600) {
 const r = rng(seed), rocks = []; for (let d = 40; d < length - 30; d += 22 + r() * 24) rocks.push({d: Math.round(d), lane: Math.floor(r() * 3), hit: false, called: false});
 const G = {d: 0, lane: 1, speed: 0, slow: 0, bumps: 0, lights: false, rocks, length, dark: [[180, 260], [420, 500]], done: false};
 return {G,
  step(dt) { const calls = []; if (G.done) return calls; const inDark = G.dark.some(([a, b]) => G.d >= a && G.d < b); G.slow = Math.max(0, G.slow - dt); const top = G.slow > 0 ? 6 : (inDark && !G.lights ? 9 : 16); G.speed += (top - G.speed) * Math.min(1, dt * 1.5); G.d = Math.min(length, G.d + G.speed * dt);
   for (const k of rocks) { if (!k.called && k.d - G.d < 40 && k.d > G.d) { k.called = true; calls.push({who: 'abbie', text: ['Rock on the left!', 'Rock in the middle!', 'Rock on the right!'][k.lane]}); }
    if (!k.hit && Math.abs(k.d - G.d) < 1.5 && k.lane === G.lane) { k.hit = true; G.bumps++; G.slow = 1.2; calls.push({who: 'daddy', text: 'Whoa! Hang on!'}); } }
   if (G.d >= length) { G.done = true; calls.push({who: 'houston', text: 'Buggy is home. Great driving, crew.'}); } return calls; },
  input(ev) { if (ev.lane != null) G.lane = Math.max(0, Math.min(2, ev.lane)); if (ev.move) G.lane = Math.max(0, Math.min(2, G.lane + ev.move)); if (ev.lights != null) G.lights = !!ev.lights; },
  view() { return {...G}; }, get done() { return G.done; }};
}

export const GAMES = {wire: wirePuzzle, zapper: bugZapper, harmonizer, buggy: buggyRide};

// a bot family's moves for the current game view (tests and the ?beat= fast-forward use this)
export function botMoves(g) {
 const ev = [];
 if (g.name === 'wire') for (const w of g.wires) { if (!w.done) { ev.push({player: w.owner, color: w.color}, {player: w.owner, socket: w.socket}); } }
 else if (g.name === 'zapper') for (const [p, lane] of Object.entries(g.cursor)) { const b = g.bugs.slice().sort((a, c) => a.d - c.d)[0]; if (b) ev.push({player: p, lane: b.lane}, {player: p, zap: true}); }
 else if (g.name === 'harmonizer') { if (!g.listening) { const want = g.phrase[g.i]; const p = Object.keys(g.note).find(k => g.note[k] === want); if (p) ev.push({player: p, note: true}); } }
 else if (g.name === 'buggy') { const next = g.rocks.find(r => !r.hit && r.d > g.d - 2); ev.push({lights: true}, {lane: next && next.lane === 1 ? 0 : 1}); }
 return ev;
}
