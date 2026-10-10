// Audio engine: one AudioContext, created on the first user gesture (browser
// autoplay rules), a master chain, saved mute/volume, and shared wave helpers.

const KEY = 'lanternHawks.audio';

export const settings = (() => {
  const d = { muted: false, volume: 0.6 };
  try {
    const s = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') {
      if (typeof s.muted === 'boolean') d.muted = s.muted;
      if (typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1) d.volume = s.volume;
    }
  } catch { /* storage blocked: defaults */ }
  return d;
})();

function persist() {
  try { window.localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

export const A = { ctx: null, master: null, music: null, sfx: null, noise: null, crunch: null, waves: new Map() };
const unlockHooks = [];

export function onUnlock(fn) {
  if (A.ctx) fn(); else unlockHooks.push(fn);
}

function masterLevel() {
  return settings.muted ? 0 : settings.volume * settings.volume;
}

function build() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  const ctx = new Ctx();
  A.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4;
  comp.attack.value = 0.004; comp.release.value = 0.2;
  comp.connect(ctx.destination);
  A.master = ctx.createGain();
  A.master.gain.value = masterLevel();
  A.master.connect(comp);
  A.music = ctx.createGain();
  A.music.gain.value = 0.55;
  A.music.connect(A.master);
  // SFX go through a gentle bit-crusher curve for a crunchy 16-bit edge.
  const crush = ctx.createWaveShaper();
  const n = 2048, steps = 48, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; curve[i] = Math.round(x * steps) / steps; }
  crush.curve = curve;
  A.sfx = ctx.createGain();
  A.sfx.gain.value = 0.8;
  A.sfx.connect(crush);
  crush.connect(A.master);
  // Noise: white, and a sample-and-hold "crunch" noise like an 8/16-bit chip.
  const len = ctx.sampleRate;
  A.noise = ctx.createBuffer(1, len, ctx.sampleRate);
  A.crunch = ctx.createBuffer(1, len, ctx.sampleRate);
  const w = A.noise.getChannelData(0), c = A.crunch.getChannelData(0);
  let held = 0;
  for (let i = 0; i < len; i++) {
    w[i] = Math.random() * 2 - 1;
    if (i % 12 === 0) held = Math.random() < 0.5 ? -1 : 1;
    c[i] = held * 0.8;
  }
  return true;
}

export function unlock() {
  if (!A.ctx) {
    if (!build()) return;
    while (unlockHooks.length) { try { unlockHooks.shift()(); } catch (e) { console.warn('[audio]', e); } }
  }
  if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
}

export function setMuted(m) {
  settings.muted = !!m;
  persist();
  applyLevel();
}

export function setVolume(v) {
  settings.volume = Math.max(0, Math.min(1, v));
  if (settings.volume > 0) settings.muted = false;
  persist();
  applyLevel();
}

function applyLevel() {
  if (A.master) A.master.gain.setTargetAtTime(masterLevel(), A.ctx.currentTime, 0.03);
  for (const fn of levelListeners) fn();
}
const levelListeners = [];
export function onLevel(fn) { levelListeners.push(fn); }

// Pulse wave with a given duty cycle (0.125, 0.25, 0.5), cached per duty.
export function pulseWave(duty) {
  const k = `p${duty}`;
  if (!A.waves.has(k)) {
    const N = 48, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    A.waves.set(k, A.ctx.createPeriodicWave(re, im));
  }
  return A.waves.get(k);
}

export function makeOsc(type, freq, t) {
  const o = A.ctx.createOscillator();
  if (type.startsWith('pulse')) o.setPeriodicWave(pulseWave(parseFloat(type.slice(5)) || 0.5));
  else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

export function makeNoise(t, dur, crunch = false) {
  const s = A.ctx.createBufferSource();
  s.buffer = crunch ? A.crunch : A.noise;
  s.loop = true;
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
  return s;
}

// Attack / hold / release envelope on a new gain node.
export function env(t, dur, vol, attack = 0.003, release = 0.05) {
  const g = A.ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  return g;
}

export const NOTE = (() => {
  const idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  return (name) => {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) return null;
    const semi = idx[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 12 * (Number(m[3]) + 1) + semi; // MIDI number
  };
})();

export const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
