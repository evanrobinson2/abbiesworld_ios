// Music director: plays the Composer's beds as layered stems, opens layers as the game gets busier, drops stings on
// the beat in the bed's key, and bridges beds with interludes. One AudioContext, created on the first user gesture.
//
//   import {music} from '/music/director.mjs';
//   await music.unlock();                 // from a click/tap handler
//   music.play('ranch-morning');          // starts, or crossfades on the next bar
//   music.intensity(0.6);                 // 0 calm .. 1 big moment
//   music.sting('arrival');               // on the next beat, in the bed's key, bed ducks underneath
//   music.interlude('night-falls', {then: 'ranch-night'});
//   music.stop();
//
// Catalogue: /music/catalog.json (written by tools/composer/render_all.py, same records as /sounds).
const CATALOG = '/music/catalog.json';
const PREF = 'abbies-music-v1';
const KEY_OF = {D: 'D', G: 'G', Bb: 'Bb', E: 'E'};

function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

export function createDirector({catalogUrl = CATALOG} = {}) {
  let ctx = null, master = null, bedBus = null, stingBus = null, catalog = null, catalogPromise = null;
  const buffers = new Map();
  let bed = null;           // {rec, start, beat, bar, loopLen, voices:[{source, gain, stem}], gain}
  let level = 0.35, prefs = {volume: 0.7, muted: false};
  const listeners = new Set();
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF) || '{}')); } catch {}

  const emit = () => { const s = state(); for (const f of listeners) try { f(s); } catch {} };
  const save = () => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch {} };

  async function loadCatalog() {
    catalogPromise ??= fetch(catalogUrl).then(r => { if (!r.ok) throw Error(`catalog ${r.status}`); return r.json(); })
      .then(d => { catalog = new Map(d.sounds.map(s => [s.id.replace(/^music\./, ''), s])); return catalog; });
    return catalogPromise;
  }

  async function unlock() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)({latencyHint: 'interactive'});
      const safety = ctx.createDynamicsCompressor();
      safety.threshold.value = -6; safety.ratio.value = 4; safety.attack.value = 0.003; safety.release.value = 0.25;
      master = ctx.createGain(); master.gain.value = prefs.muted ? 0 : prefs.volume;
      bedBus = ctx.createGain(); stingBus = ctx.createGain();
      bedBus.connect(safety); stingBus.connect(safety); safety.connect(master); master.connect(ctx.destination);
    }
    if (ctx.state !== 'running') await ctx.resume();
    await loadCatalog();
    return ctx;
  }

  async function buffer(url) {
    if (!buffers.has(url)) {
      buffers.set(url, fetch(url).then(r => { if (!r.ok) throw Error(`${url} ${r.status}`); return r.arrayBuffer(); })
        .then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))));
    }
    return buffers.get(url);
  }

  function rec(id) {
    const r = catalog?.get(id) || catalog?.get(`sting-${id}`);
    if (!r) throw Error(`No music cue "${id}". Known: ${[...(catalog?.keys() || [])].join(', ')}`);
    return r;
  }

  // Next beat (or bar) boundary of the playing bed, at least `ahead` seconds from now.
  function nextGrid(unit = 'beat', ahead = 0.06) {
    const now = ctx.currentTime + ahead;
    if (!bed) return now;
    const step = unit === 'bar' ? bed.bar : bed.beat;
    const n = Math.ceil((now - bed.start) / step);
    return bed.start + Math.max(0, n) * step;
  }

  function stemGain(stem, v) {
    if (!stem || stem.min == null || stem.min <= 0) return 1;
    return smooth((v - stem.min) / 0.18 + 0.5);
  }

  async function play(id, {fade = 2.5, at = 'bar', intensity} = {}) {
    await unlock();
    const r = rec(id);
    if (!r.loop) throw Error(`${id} is not a bed; use sting() or interlude()`);
    if (bed?.rec.id === r.id) { if (intensity != null) setIntensity(intensity); return; }
    if (intensity != null) level = intensity;
    const stems = r.urls.stems?.length ? r.urls.stems : [{name: 'mix', url: r.urls.audio, min: 0}];
    const bufs = await Promise.all(stems.map(s => buffer(s.url)));
    const when = bed ? nextGrid(at) : ctx.currentTime + 0.08;
    const old = bed;
    const gain = ctx.createGain(); gain.connect(bedBus);
    gain.gain.setValueAtTime(old ? 0.0001 : 0.0001, when);
    gain.gain.exponentialRampToValueAtTime(1, when + (old ? fade : 0.6));
    const beat = 60 / r.bpm, loopLen = r.loopPoints.end - r.loopPoints.start;
    const voices = stems.map((s, i) => {
      const src = ctx.createBufferSource(); src.buffer = bufs[i];
      src.loop = true; src.loopStart = r.loopPoints.start; src.loopEnd = r.loopPoints.end;
      const g = ctx.createGain(); g.gain.value = stemGain(s, level);
      src.connect(g).connect(gain); src.start(when, r.loopPoints.start);
      return {source: src, gain: g, stem: s};
    });
    bed = {rec: r, start: when, beat, bar: beat * (r.beatsPerBar || 4), loopLen, voices, gain};
    if (old) release(old, when, fade);
    emit();
  }

  function release(b, when, fade) {
    b.gain.gain.cancelScheduledValues(when);
    b.gain.gain.setValueAtTime(b.gain.gain.value || 1, when);
    b.gain.gain.exponentialRampToValueAtTime(0.0001, when + fade);
    for (const v of b.voices) v.source.stop(when + fade + 0.05);
  }

  function setIntensity(v, {ramp = 1.5} = {}) {
    level = Math.max(0, Math.min(1, v));
    if (bed && ctx) for (const voice of bed.voices) {
      voice.gain.gain.cancelScheduledValues(ctx.currentTime);
      voice.gain.gain.setTargetAtTime(stemGain(voice.stem, level), ctx.currentTime, ramp / 3);
    }
    emit();
  }

  function keyedUrl(r) {
    const keys = r.urls.keys;
    if (!keys) return r.urls.audio;
    const bedKey = bed?.rec.key?.split(' ')[0];
    return (keys[KEY_OF[bedKey]] || Object.values(keys)[0]).url;
  }

  async function sting(id, {quantize = 'beat', duck = 0.45, gain = 1} = {}) {
    await unlock();
    const r = rec(id);
    const buf = await buffer(keyedUrl(r));
    const when = quantize === 'none' ? ctx.currentTime + 0.02 : nextGrid(quantize);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(g).connect(stingBus); src.start(when);
    if (bed && duck > 0) {
      const p = bed.gain.gain, hold = Math.min(buf.duration * 0.55, 3.5);
      p.cancelScheduledValues(when - 0.05);
      p.setValueAtTime(1, when - 0.05);
      p.linearRampToValueAtTime(1 - duck, when + 0.08);
      p.setValueAtTime(1 - duck, when + hold);
      p.linearRampToValueAtTime(1, when + hold + 1.6);
    }
    return {when, duration: buf.duration};
  }

  async function interlude(id, {then = null, fade = 1.2} = {}) {
    await unlock();
    const r = rec(id);
    const buf = await buffer(r.urls.audio);
    const when = bed ? nextGrid('bar') : ctx.currentTime + 0.05;
    if (bed) { release(bed, when, fade); bed = null; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(stingBus); src.start(when);
    emit();
    if (then) {
      // The next bed comes in under the interlude's tail.
      const lead = Math.max(0.5, buf.duration - 3.0);
      setTimeout(() => play(then, {fade: 3}), Math.max(0, (when - ctx.currentTime + lead) * 1000));
    }
    return {when, duration: buf.duration};
  }

  function stop({fade = 2} = {}) {
    if (bed && ctx) { release(bed, ctx.currentTime, fade); bed = null; emit(); }
  }

  function volume(v) {
    prefs.volume = Math.max(0, Math.min(1, v)); save();
    if (master && !prefs.muted) master.gain.setTargetAtTime(prefs.volume, ctx.currentTime, 0.05);
    emit();
  }

  function mute(on = !prefs.muted) {
    prefs.muted = on; save();
    if (master) master.gain.setTargetAtTime(on ? 0 : prefs.volume, ctx.currentTime, 0.05);
    emit();
  }

  function state() {
    let beat = null;
    if (bed && ctx) {
      const t = (ctx.currentTime - bed.start) % bed.loopLen;
      beat = t >= 0 ? t / bed.beat : null;
    }
    return {bed: bed?.rec.id.replace(/^music\./, '') || null, key: bed?.rec.key || null, bpm: bed?.rec.bpm || null,
      intensity: level, volume: prefs.volume, muted: prefs.muted, beat, running: ctx?.state === 'running',
      stems: bed ? bed.voices.map(v => ({name: v.stem.name, gain: stemGain(v.stem, level)})) : []};
  }

  return {
    unlock, play, stop, sting, interlude, intensity: setIntensity, volume, mute, state,
    catalog: async () => [...(await loadCatalog()).values()],
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    get context() { return ctx; },
  };
}

export const music = globalThis.abbiesMusic ??= createDirector();
