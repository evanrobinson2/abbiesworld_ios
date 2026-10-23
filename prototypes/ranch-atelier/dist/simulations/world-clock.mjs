// One world clock for places that have no ranch sandbox behind them (AbbieTown, the demo, minigames that show Abbie).
// The ranch chronograph (chrono.mjs) reads its time, weather, season, pause and speed from the sandbox's own controls.
// This module keeps that state itself and publishes it through the same controls, kept off screen, so the
// chronograph mounts unchanged (chrono-host.mjs). A scene listens for 'aw-world-clock' (detail: {hour, weather, season,
// paused, speed, daylight}) to light itself; daylight is 0 at midnight and 1 at midday. Drafted 2026-10-23.
const WEATHER = [['Clear', 'sun'], ['Cloudy', 'cloud'], ['Rain', 'rain']], SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'], SPEEDS = [1, 60, 240, 960]; // 1x is real time; the faster paces watch the day go by
const GLYPH = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.3 1.9A3 3 0 0 0 7 18z"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.3 1.9A3 3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>'};
const KEY = 'aw-world-clock', MIN_PER_SEC = 1 / 60; // at 1x one real second is one world second (Evan, 2026-10-23: it's always today and now)
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify({weather: s.weather})); } catch {} }; // only the weather is remembered: time, date and season always start from now
// Winchester, MA is in the northern hemisphere: the season is the real one for today's date
const seasonOf = d => [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3][d.getMonth()];
const nowMinutes = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

let state, readouts, timer = 0, last = 0;
export const worldClock = () => state;
export const daylight = h => Math.max(0, Math.sin(Math.PI * (h - 6) / 12)) ; // 0 from 18:00 to 06:00, 1 at noon
const fmt = m => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

function publish() {
  const hour = state.minutes / 60, d = {hour, weather: WEATHER[state.weather][0], season: SEASONS[state.season], paused: state.paused, speed: SPEEDS[state.speed], daylight: daylight(hour)};
  readouts.querySelector('.clock-time').textContent = fmt(state.minutes);
  readouts.querySelector('.clock-date').textContent = new Date().toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'});
  readouts.querySelector('.weather-symbol').innerHTML = GLYPH[WEATHER[state.weather][1]];
  readouts.querySelector('.weather-name').textContent = d.weather;
  readouts.querySelector('.weather-season').textContent = d.season;
  readouts.querySelector('#pause .play-icon').hidden = !state.paused;
  readouts.querySelector('#pause .pause-icon').hidden = state.paused;
  readouts.querySelector('.pace-badge').textContent = SPEEDS[state.speed] === 1 ? '›' : SPEEDS[state.speed] + '×';
  window.dispatchEvent(new CustomEvent('aw-world-clock', {detail: d}));
}
function tick(now) {
  const dt = Math.min(1, (now - last) / 1000); last = now;
  if (!state.paused) { state.minutes += dt * MIN_PER_SEC * SPEEDS[state.speed]; while (state.minutes >= 1440) { state.minutes -= 1440; state.day++; } if (!state.speed) state.minutes = nowMinutes(new Date()); } // at 1x the clock is the player's own, even after a sleeping tab
  publish();
}
// Starts the clock (once) and returns the off-screen controls the chronograph presses. Safe to call twice.
export function startWorldClock({hour = 14} = {}) {
  if (state) return state;
  const saved = load(), now = new Date();
  state = {minutes: nowMinutes(now), day: 1, weather: saved?.weather ?? 0, season: seasonOf(now), speed: 0, paused: false};
  readouts = document.createElement('div'); readouts.hidden = true; readouts.setAttribute('data-feedback-ui', '');
  readouts.innerHTML = `<div id="scene-readouts"><span class="clock-time"></span><span class="clock-date"></span><span class="weather-symbol"></span><span class="weather-name"></span><span class="weather-season"></span></div>
    <button id="pause"><span class="pause-icon"></span><span class="play-icon" hidden></span></button><button id="simulation-speed"><span class="pace-badge"></span></button>
    <button id="scene-clock-control"></button><button id="scene-weather-control"></button><button id="scene-season-control"></button>`;
  document.body.append(readouts);
  const on = (sel, fn) => readouts.querySelector(sel).addEventListener('click', () => { fn(); save(state); publish(); });
  on('#pause', () => { state.paused = !state.paused; });
  on('#simulation-speed', () => { state.speed = (state.speed + 1) % SPEEDS.length; });
  on('#scene-clock-control', () => { state.minutes = (Math.floor(state.minutes / 360) + 1) * 360 % 1440; if (state.minutes === 0) state.day++; }); // jumps to the next six o'clock mark
  on('#scene-weather-control', () => { state.weather = (state.weather + 1) % WEATHER.length; });
  on('#scene-season-control', () => { state.season = (state.season + 1) % SEASONS.length; });
  last = performance.now(); publish();
  timer = setInterval(() => tick(performance.now()), 250);
  addEventListener('pagehide', () => save(state));
  return state;
}
