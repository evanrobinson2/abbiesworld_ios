// Plays sounds from the sound catalogue (sounds/manifest.json: the Sonniss takes in R2). The one way a game makes a sound
// effect (INVARIANTS.md): no oscillators, no MIDI, no stand-ins. An id that isn't in the catalogue is logged and stays silent.
//   import {sfx, preload} from '/simulations/catalog-sfx.mjs';
//   sfx('coin-1'); sfx('whoosh-2', {gain: .6, rate: 1.2, delay: .1}); const stop = sfx('rain-light', {loop: true});
//   preload(['coin-1', 'pop-2']);       // optional: decode ahead so the first play isn't late
let ctx = null, manifest = null, byId = null;
const bufs = new Map();
const context = () => {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};
const load = async id => {
  if (bufs.has(id)) return bufs.get(id);
  const p = (async () => {
    try {
      manifest = manifest || await (await fetch('/sounds/manifest.json')).json();
      byId = byId || Object.fromEntries((manifest.sounds || []).map(s => [s.id, s]));
      const url = byId[id]?.urls?.audio;
      if (!url) { console.warn('sound not in the catalogue:', id); return null; }
      const r = await fetch(url); if (!r.ok) return null;
      return await context().decodeAudioData(await r.arrayBuffer());
    } catch { return null; }
  })();
  bufs.set(id, p); return p;
};
export const preload = ids => Promise.all(ids.map(load));
export const sfxContext = context;
export function sfx(id, {gain = 1, rate = 1, delay = 0, loop = false} = {}) {
  const c = context(); if (!c) return Object.assign(() => {}, {set() {}});
  let src = null, g = null, stopped = false, level = gain;
  load(id).then(b => {
    if (!b || stopped) return;
    src = c.createBufferSource(); src.buffer = b; src.playbackRate.value = rate; src.loop = loop;
    g = c.createGain(); g.gain.value = level; src.connect(g).connect(c.destination); src.start(c.currentTime + delay);
  });
  // the returned function stops the sound; .set(v) changes its volume (for beds that follow the player)
  return Object.assign(() => { stopped = true; try { src?.stop(); } catch {} }, {set(v) { level = v; if (g) g.gain.setTargetAtTime(v, c.currentTime, .12); }});
}
