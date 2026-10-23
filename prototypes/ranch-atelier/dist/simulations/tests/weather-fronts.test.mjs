import assert from 'node:assert/strict';
import {WEATHER, weatherFor, weatherOutlook, frontApproach, stormNear} from '../simulation/weather-state.mjs';

// Deterministic: the same ranch, day and hour always has the same weather.
assert.equal(weatherFor(12, 1, 9.5, 214), weatherFor(12, 1, 9.5, 214));

// Fronts, not dice: weather holds for hours and changes a few times a day, and every kind stays known.
for (const season of [0, 1, 2, 3]) {
  let changes = 0, prev = null;
  const seen = new Set();
  for (let day = 1; day <= 120; day++) for (let h = 0; h < 24; h += .5) {
    const w = weatherFor(day, season, h, 7);
    assert.ok(WEATHER[w], w);
    seen.add(w);
    if (prev && w !== prev) changes++;
    prev = w;
  }
  const perDay = changes / 120;
  assert.ok(perDay > 1 && perDay < 4, `season ${season}: ${perDay} changes a day`);
  if (season === 3) assert.ok(seen.has('snow') && !seen.has('rain') && !seen.has('heat'));
  else assert.ok(seen.has('rain') && !seen.has('snow'));
}

// Rain never starts out of a clear sky: a wet spell arrives through cloud.
for (let day = 1; day <= 120; day++) for (let h = 0; h < 24; h += .25) {
  const before = weatherFor(day + Math.floor((h + 23.75) / 24) - 1, 1, (h + 23.75) % 24, 3), now = weatherFor(day, 1, h, 3);
  if (now === 'rain' || now === 'hail') assert.ok(!['clear', 'heat'].includes(before), `day ${day} ${h}: ${before} -> ${now}`);
}

// The outlook sees an arriving front before it lands, and the world settles inside 45 minutes.
let found = null;
for (let day = 1; day <= 60 && !found; day++) for (let h = 0; h < 24 && !found; h += .25) {
  const o = weatherOutlook(day, 1, h, 3);
  if (o.front === 'arriving' && o.next === 'rain' && o.inHours <= .5) found = o;
}
assert.ok(found, 'an arriving rain front');
assert.ok(frontApproach(found) > .7 && stormNear(found));
assert.equal(stormNear({front: 'arriving', next: 'rain', inHours: 3}), false);
console.log('weather fronts ok');

// One light signal: day paper, golden dusk, ink-blue night (remaster study R5).
const {ranchLight} = await import('../ranch-light.mjs');
const {solarCycle} = await import('../simulation/solar-cycle.mjs');
const lum = c => .2126 * c.r + .7152 * c.g + .0722 * c.b;
const noon = ranchLight(solarCycle(12, .25)), dusk = ranchLight(solarCycle(19.3, .25)), night = ranchLight(solarCycle(23, .25));
assert.ok(lum(night.glow) < lum(noon.glow) * .25, 'night is much darker than day');
assert.ok(night.glow.b > night.glow.g && night.glow.b > night.glow.r, 'night is blue');
assert.ok(dusk.sun.r - dusk.sun.b > noon.sun.r - noon.sun.b, 'the low sun is golden');
const storm = ranchLight(solarCycle(12, .25), {overcast: 1, storm: .8});
assert.ok(lum(storm.glow) < lum(noon.glow), 'storms darken the sky');
console.log('ranch light ok');
