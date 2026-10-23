// AW-STUDY-0036 Moon Mission couch HUD: the mission card, the clock, the caption, the choices and the per-player key panels.
// One factory so the studies page and the Abbie's Town stage show the same thing. Words live only here and in captions.
const CSS = `
#mm-hud{--ink:#1b2238;--dim:#5b6785;--line:#cdd7ee;--key:#fff;--glow:#ff7eb6;--bar:rgba(255,255,255,.92);position:fixed;inset:0;pointer-events:none;color:var(--ink);font:clamp(16px,2vw,26px)/1.3 "Atkinson Hyperlegible",system-ui,sans-serif;z-index:30}
#mm-hud[data-mood=dark]{--ink:#eef1fb;--dim:#9aa6c8;--line:#26304f;--key:#121a33;--bar:rgba(5,7,15,.92)}
#mm-hud *{box-sizing:border-box}
#mm-hud .top{position:absolute;left:0;right:0;top:0;display:flex;justify-content:space-between;gap:16px;padding:12px 20px 0;align-items:flex-start}
#mm-hud .card{font:500 clamp(11px,1.6vw,20px)/1.2 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;min-height:1.4em;min-width:0}
#mm-hud .card i{display:block;height:1px;background:var(--ink);margin-top:6px;transform-origin:left}
#mm-hud .clock{font:600 clamp(18px,3vw,36px)/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;white-space:nowrap}
#mm-hud .clock.held{color:var(--glow)}
#mm-hud .zone{position:absolute;left:20px;top:64px;font:500 12px/1.3 "IBM Plex Mono",monospace;color:var(--dim)}
#mm-hud .count{position:absolute;right:24px;bottom:34vh;font:800 clamp(48px,12vw,140px)/1 "Big Shoulders Display","Arial Narrow",sans-serif;color:var(--glow)}
#mm-hud .bottom{position:absolute;left:0;right:0;bottom:0;pointer-events:auto}
#mm-hud .say{padding:6px 20px 4px;min-height:2.6em}
#mm-hud .say .who{display:inline-block;width:.6em;height:.6em;border-radius:50%;margin-right:.5em;background:var(--dim)}
#mm-hud .say.thought{font-style:italic;color:var(--dim)}
#mm-hud .opts{display:grid;gap:4px;padding:0 20px}
#mm-hud .opt{display:flex;gap:10px;align-items:center;padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bar);cursor:pointer;font:inherit;color:inherit;text-align:left}
#mm-hud .opt.sel{border-color:var(--glow)}
#mm-hud .chip{width:.9em;height:.9em;border-radius:50%;display:inline-block}
#mm-hud .panel{display:flex;flex-wrap:wrap;gap:10px;padding:12px 20px calc(14px + env(safe-area-inset-bottom,0px));align-items:stretch}
#mm-hud .pl{flex:1 1 220px;min-width:0;border:1px solid var(--line);border-radius:16px;padding:8px;background:var(--bar);display:grid;gap:6px}
#mm-hud .pl h2{margin:0;font:700 14px/1 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;gap:8px}
#mm-hud .keys{display:flex;flex-wrap:wrap;gap:6px}
#mm-hud button.key{min-width:4.5em;padding:8px;border-radius:12px;border:2px solid var(--c);background:var(--key);color:var(--ink);font:700 clamp(12px,1.7vw,18px)/1.1 system-ui;cursor:pointer}
#mm-hud button.key[disabled]{opacity:.3;cursor:default}
#mm-hud button.key.on{box-shadow:0 0 0 3px var(--c),0 0 22px var(--c)}
#mm-hud .pocket{display:flex;gap:6px;flex-wrap:wrap;font-size:22px}
#mm-hud .hint{color:var(--dim);font:500 12px/1.3 "IBM Plex Mono",monospace;padding:0 20px 8px}
@media (prefers-reduced-motion:reduce){#mm-hud *{animation:none!important;transition:none!important}}`;
import {PLAYERS} from './mission.mjs';
import {ZONES} from './zones.mjs';
import {botMoves} from './games.mjs';

export function createHud({mission: m, world, container = document.body, quiet = false}) {
 if (!document.getElementById('mm-hud-css')) { const st = document.createElement('style'); st.id = 'mm-hud-css'; st.textContent = CSS; document.head.append(st); }
 const rootEl = document.createElement('div'); rootEl.id = 'mm-hud'; rootEl.dataset.mood = 'light';
 rootEl.innerHTML = `<div class="top"><div class="card" id="card"></div><div class="clock" id="clock">T-24:00:00</div></div><div class="zone" id="zone"></div><div class="count" id="count" hidden></div>
  <div class="bottom"><div class="say" id="say"></div><div class="opts" id="opts"></div><div class="panel" id="panel"></div><div class="hint">Daddy A, Abbie G, Ani L. Arrows steer. Space is thrust. Hold R to talk to Houston.</div></div>`;
 container.append(rootEl);
 const $ = id => rootEl.querySelector('#' + id), q = new URLSearchParams(location.search), root = rootEl;
 const listeners = []; const on = (ev, fn) => { addEventListener(ev, fn); listeners.push([ev, fn]); };
 const color = id => (PLAYERS.find(p => p.id === id) || {}).color || '#9aa6c8';
 const VOICE = {houston: {pitch: .8, rate: .95}, officer: {pitch: .9, rate: 1}, daddy: {pitch: .7, rate: 1}, abbie: {pitch: 1.5, rate: 1.05}, ani: {pitch: 1.4, rate: 1.05}};
let cursor = {daddy: 0, abbie: 0, ani: 0}, sound = !quiet, thrust = 0, tilt = 0, typing = 0;

function speak(who, text) { const s = $('say'); s.className = 'say' + (arguments[2] ? ' thought' : ''); s.innerHTML = `<span class="who" style="background:${color(who)}"></span>`; s.append(text);
 if (sound && 'speechSynthesis' in window) { try { const u = new SpeechSynthesisUtterance(text), v = VOICE[who] || {}; u.pitch = v.pitch || 1; u.rate = v.rate || 1; speechSynthesis.speak(u); } catch {} } }
function card(e) { const el = $('card'), t = `${e.org} · ${e.clock} · ${e.place}`; el.innerHTML = '<span></span><i></i>'; const [sp, ln] = [el.firstChild, el.lastChild]; clearInterval(typing); let n = 0;
 typing = setInterval(() => { n++; sp.textContent = t.slice(0, n); ln.style.transform = `scaleX(${n / t.length})`; if (n >= t.length) clearInterval(typing); }, 30); }
function fx(e) {
 switch (e.fx) {
  case 'card': card(e); break;
  case 'zone': rootEl.dataset.mood = e.mood; $('zone').textContent = (ZONES[e.id].region ? ZONES[e.id].region.replace('abbie-daddy-side','Abbie and Daddy').replace('anis-side','Ani\'s side') + ' · ' : '') + ZONES[e.id].name; break;
  case 'speak': speak(e.who, e.text, e.thought); break;
  case 'kaboom': break;
  case 'liftoff': break;
  case 'count': { const c = $('count'); c.hidden = e.n < 0; c.textContent = e.n; if (e.n === 0) setTimeout(() => c.hidden = true, 900); break; }
  case 'item': { const el = document.createElement('span'); el.title = e.name; el.textContent = e.icon; $('pocket').append(el); break; }
  case 'hold': $('clock').classList.add('held'); break;
  case 'job-done': $('clock').classList.remove('held'); break;
  case 'chip': break;
  case 'end': speak('houston', 'Part 1 complete: welcome to the Moon base.'); break;
 }
}
function pump(es) { for (const e of es) { world.onFx(e); fx(e); } render(); }
function ownerJobs(p, v) { return v.step && v.step.jobs ? v.step.jobs.filter(j => j.owner === p || j.owner === 'any') : []; }
const send = e => pump(m.dispatch({type: 'game', ...e}));
function act(p) { // the one button: whatever this player's moment is
 const v = m.view(), st = v.step; if (!st) return;
 if (st.k === 'ask') pump(m.dispatch({type: 'choose', player: p, index: cursor[p] || 0}));
 else if (st.k === 'accept') pump(m.dispatch({type: 'press', player: p, key: 'yes'}));
 else if (st.k === 'poll') pump(m.dispatch({type: 'press', player: p, key: 'go'}));
 else if (st.k === 'jobs') { const j = ownerJobs(p, v)[0]; if (j) pump(m.dispatch({type: 'press', player: p, key: j.key})); }
 else if (st.k === 'say') pump(m.dispatch({type: 'press', player: p, key: 'next'}));
 else if (st.k === 'cutscene') pump(m.dispatch({type: 'skip', player: p}));
 else if (st.k === 'game') { const g = st.game; if (g.name === 'zapper') send({player: p, zap: true}); else if (g.name === 'harmonizer') send({player: p, note: true}); else if (g.name === 'buggy' && p === 'ani') send({lights: !g.lights}); }
 else if (st.k === 'lander') { if (p === 'abbie') pump(m.dispatch({type: 'lights', on: true})); if (p === 'ani') pump(m.dispatch({type: 'feet', on: true})); }
}
function render() {
 const v = m.view(), st = v.step; $('clock').textContent = v.clock;
 const opts = $('opts'); opts.innerHTML = '';
 if (st && st.k === 'ask') st.options.forEach((t, i) => { const b = document.createElement('button'); b.className = 'opt'; b.innerHTML = '<span>&gt;</span>'; b.append(' ' + t);
  for (const [pid, idx] of Object.entries(st.votes || {})) if (idx === i) { const c = document.createElement('span'); c.className = 'chip'; c.style.background = color(pid); b.append(c); }
  b.onclick = () => act(st.who || 'daddy'); opts.append(b); });
 if (st && st.k === 'accept') { const b = document.createElement('div'); b.className = 'opt sel'; b.innerHTML = '<span>&gt;</span> We accept'; for (const pid of st.yes) { const c = document.createElement('span'); c.className = 'chip'; c.style.background = color(pid); b.append(c); } opts.append(b); }
 const panel = $('panel'); panel.innerHTML = '';
 for (const p of PLAYERS) { const d = document.createElement('div'); d.className = 'pl'; d.style.borderColor = p.color;
  d.innerHTML = `<h2 style="color:${p.color}"><span>${p.name}</span><span>${v.hat === p.id ? 'HAT' : ''}</span></h2>`;
  const keys = document.createElement('div'); keys.className = 'keys'; const mine = ownerJobs(p.id, v);
  const add = (label, on, fn) => { const b = document.createElement('button'); b.className = 'key' + (on ? ' on' : ''); b.style.setProperty('--c', p.color); b.textContent = label; b.disabled = !on; b.onclick = fn; keys.append(b); };
  if (st && st.k === 'ask') { st.options.forEach((t, i) => add(i + 1, !st.who || st.who === p.id, () => { cursor[p.id] = i; act(p.id); })); }
  else if (st && st.k === 'accept') add('YES', !st.yes.includes(p.id), () => act(p.id));
  else if (st && st.k === 'poll') add('GO!', true, () => act(p.id));
  else if (st && st.k === 'jobs') { mine.forEach(j => add(j.key.replace(/-/g, ' ').toUpperCase(), true, () => pump(m.dispatch({type: 'press', player: p.id, key: j.key})))); if (!mine.length) add('…', false); }
  else if (st && st.k === 'game') { const g = st.game;
   if (g.name === 'wire') { g.wires.filter(w => w.owner === p.id).forEach(w => add(w.color.toUpperCase(), !w.done, () => send({player: p.id, color: w.color}))); for (let i = 0; i < 6; i++) add(String(i + 1), true, () => send({player: p.id, socket: i})); }
   else if (g.name === 'zapper') { add('\u25c0', true, () => send({player: p.id, move: -1})); add('ZAP', true, () => send({player: p.id, zap: true})); add('\u25b6', true, () => send({player: p.id, move: 1})); }
   else if (g.name === 'harmonizer') add(['LOW', 'MIDDLE', 'HIGH'][g.note[p.id]] + ' NOTE', true, () => send({player: p.id, note: true}));
   else if (g.name === 'buggy') { if (p.id === 'daddy') { add('\u25c0', true, () => send({move: -1})); add('\u25b6', true, () => send({move: 1})); } else if (p.id === 'ani') add(g.lights ? 'LIGHTS ON' : 'LIGHTS', true, () => send({lights: !g.lights})); else add('CALL ROCKS', false, () => {}); } }
  else if (st && st.k === 'lander') { if (p.id === 'abbie') add('LANDING LIGHTS', true, () => act('abbie')); else if (p.id === 'ani') add('FEET DOWN', true, () => act('ani')); else add('THRUST (space)', true, () => {}); }
  else add(st && st.k === 'say' ? 'NEXT' : st && st.k === 'cutscene' ? 'SKIP' : '…', st && ['say', 'cutscene'].includes(st.k), () => act(p.id));
  d.append(keys); panel.append(d); }
 const pk = document.createElement('div'); pk.className = 'pl'; pk.innerHTML = '<h2><span>Pocket</span></h2>'; const pc = document.createElement('div'); pc.className = 'pocket'; pc.id = 'pocket';
 for (const i of v.items) { const s = document.createElement('span'); s.title = i.name; s.textContent = i.icon; pc.append(s); } pk.append(pc); panel.append(pk);
}
const KEYS = {a: 'daddy', g: 'abbie', l: 'ani'};
on('keydown', e => { const st = m.view().step; if (st && st.k === 'game' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const d = e.key === 'ArrowLeft' ? -1 : 1; if (st.game.name === 'buggy') send({move: d}); else if (st.game.name === 'zapper') for (const p of PLAYERS) send({player: p.id, move: d}); } });
on('keydown', e => { if (e.repeat) return; const k = e.key.toLowerCase();
 if (KEYS[k]) act(KEYS[k]);
 else if (k === 'arrowdown' || k === 'arrowup') { const st = m.view().step; if (st && st.k === 'ask') { const p = st.who || 'daddy', n = st.options.length; cursor[p] = ((cursor[p] || 0) + (k === 'arrowdown' ? 1 : n - 1)) % n; } }
 else if (k === ' ') { thrust = 1; m.dispatch({type: 'fly', thrust, tilt}); e.preventDefault(); }
 else if (k === 'r') listen(); });
on('keyup', e => { if (e.key === ' ') { thrust = 0; m.dispatch({type: 'fly', thrust, tilt}); } });
let rec = null; function listen() { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR || rec) return; rec = new SR(); rec.lang = 'en-US'; rec.onresult = ev => { pump(m.dispatch({type: 'heard', text: ev.results[0][0].transcript})); }; rec.onend = () => { rec = null; }; try { rec.start(); } catch { rec = null; } }
// gamepads: pad i is player i; A acts, the stick or d-pad moves the choice, right trigger is thrust for Daddy
const was = [];
function pads() { const gp = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; gp.forEach((p, i) => { const id = PLAYERS[i] && PLAYERS[i].id; if (!id) return; const a = !!p.buttons[0]?.pressed; if (a && !was[i]) act(id); was[i] = a; if (id === 'daddy') { const t = p.buttons[7]?.value || 0; if (t !== thrust) { thrust = t; } tilt = p.axes[0] || 0; m.dispatch({type: 'fly', thrust, tilt}); } }); }

 function frame(dt) { pads(); pump(m.dispatch({type: 'tick', dt})); world.tick(dt, m.view(), thrust); }
// test by state: ?beat=launch plays a bot family up to that beat (no speech)
function bot(until) { sound = false; for (let s = 0; s < 400000 && m.view().beat !== until && !m.view().done; s++) { m.dispatch({type: 'tick', dt: .1}); const v = m.view(), st = v.step; if (!st) continue;
 if (st.k === 'ask') for (const p of PLAYERS) m.dispatch({type: 'choose', player: p.id, index: 0}); else if (st.k === 'accept') for (const p of PLAYERS) m.dispatch({type: 'press', player: p.id, key: 'yes'});
 else if (st.k === 'jobs') for (const j of st.jobs) m.dispatch({type: 'press', player: j.owner === 'any' ? 'daddy' : j.owner, key: j.key}); else if (st.k === 'poll') for (const p of PLAYERS) m.dispatch({type: 'press', player: p.id, key: 'go'}); else if (st.k === 'game') for (const e of botMoves(st.game)) m.dispatch({type: 'game', ...e}); } sound = !quiet; }

 pump(m.drain()); render();
 return {frame, pump, bot, act, root: rootEl, get thrust() { return thrust; }, destroy() { clearInterval(typing); for (const [ev, fn] of listeners) removeEventListener(ev, fn); rootEl.remove(); }};
}
