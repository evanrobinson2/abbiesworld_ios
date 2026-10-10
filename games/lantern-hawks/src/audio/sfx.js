// Sound effects, synthesized in code: square/saw/noise with envelopes, each under 1 s.

import { A, makeOsc, makeNoise, env } from './engine.js';

// One tone with a pitch sweep.
function tone(t, { type = 'square', f0, f1 = f0, dur, vol = 0.3, attack = 0.002, release = 0.04, lin = false, dest }) {
  const o = makeOsc(type, f0, t);
  if (f1 !== f0) {
    if (lin) o.frequency.linearRampToValueAtTime(f1, t + dur);
    else o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  }
  const g = env(t, dur, vol, attack, release);
  o.connect(g).connect(dest || A.sfx);
  o.start(t); o.stop(t + dur + 0.02);
  return o;
}

// Filtered noise with a cutoff sweep.
function hiss(t, { dur, vol = 0.3, filter = 'lowpass', f0 = 2000, f1 = f0, q = 1, crunch = false, attack = 0.002, release = 0.05 }) {
  const n = makeNoise(t, dur, crunch);
  const f = A.ctx.createBiquadFilter();
  f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = env(t, dur, vol, attack, release);
  n.connect(f).connect(g).connect(A.sfx);
}

const SFX = {
  laser(t) {
    tone(t, { type: 'pulse0.25', f0: 1900, f1: 160, dur: 0.42, vol: 0.22 });
    tone(t, { type: 'sawtooth', f0: 1960, f1: 150, dur: 0.38, vol: 0.10 });
    hiss(t, { dur: 0.12, vol: 0.12, filter: 'highpass', f0: 5000 });
  },
  missile(t) {
    tone(t + 0.02, { type: 'sine', f0: 2400, f1: 760, dur: 0.6, vol: 0.14, attack: 0.03 });
    hiss(t, { dur: 0.65, vol: 0.28, filter: 'bandpass', f0: 3200, f1: 500, q: 2.5, crunch: true, attack: 0.02, release: 0.25 });
    hiss(t, { dur: 0.08, vol: 0.3, filter: 'lowpass', f0: 900 });
  },
  autocannon(t) {
    for (let i = 0; i < 6; i++) {
      const s = t + i * 0.075;
      tone(s, { type: 'square', f0: 220 + i * 12, f1: 70, dur: 0.06, vol: 0.24 });
      hiss(s, { dur: 0.055, vol: 0.3, filter: 'lowpass', f0: 2600, f1: 600, crunch: true });
    }
  },
  hit(t) {
    hiss(t, { dur: 0.12, vol: 0.45, filter: 'lowpass', f0: 3000, f1: 300, crunch: true });
    tone(t, { type: 'square', f0: 180, f1: 50, dur: 0.12, vol: 0.28 });
  },
  explode(t) {
    hiss(t, { dur: 0.95, vol: 0.55, filter: 'lowpass', f0: 3500, f1: 90, crunch: true, release: 0.5 });
    hiss(t + 0.05, { dur: 0.7, vol: 0.3, filter: 'lowpass', f0: 1200, f1: 60, release: 0.4 });
    tone(t, { type: 'sine', f0: 110, f1: 28, dur: 0.8, vol: 0.5, release: 0.4 });
    tone(t + 0.12, { type: 'square', f0: 90, f1: 35, dur: 0.35, vol: 0.12 });
  },
  kick(t) {
    tone(t, { type: 'sine', f0: 140, f1: 38, dur: 0.24, vol: 0.6 });
    tone(t, { type: 'square', f0: 90, f1: 40, dur: 0.1, vol: 0.12 });
    hiss(t, { dur: 0.05, vol: 0.35, filter: 'bandpass', f0: 1800, q: 1.5 });
  },
  vent(t) {
    hiss(t, { dur: 0.7, vol: 0.32, filter: 'highpass', f0: 6000, f1: 1500, attack: 0.08, release: 0.35 });
    hiss(t, { dur: 0.5, vol: 0.12, filter: 'bandpass', f0: 900, f1: 400, q: 3, attack: 0.05, release: 0.3 });
  },
  card(t) {
    hiss(t, { dur: 0.07, vol: 0.18, filter: 'highpass', f0: 2500, f1: 7000 });
    tone(t + 0.02, { type: 'pulse0.25', f0: 880, f1: 1320, dur: 0.06, vol: 0.12 });
  },
  click(t) {
    tone(t, { type: 'pulse0.5', f0: 1250, dur: 0.03, vol: 0.12, release: 0.015 });
  },
  alarm(t) {
    for (let i = 0; i < 4; i++) tone(t + i * 0.16, { type: 'square', f0: i % 2 ? 660 : 880, f1: i % 2 ? 600 : 820, dur: 0.14, vol: 0.18, lin: true });
  },
  door(t) {
    tone(t, { type: 'sawtooth', f0: 85, f1: 150, dur: 0.42, vol: 0.18, attack: 0.04, lin: true });
    hiss(t, { dur: 0.42, vol: 0.12, filter: 'bandpass', f0: 600, f1: 1400, q: 4, attack: 0.04 });
    tone(t + 0.44, { type: 'square', f0: 120, f1: 50, dur: 0.08, vol: 0.25 });
    hiss(t + 0.44, { dur: 0.06, vol: 0.3, filter: 'lowpass', f0: 1500 });
  },
  powerup(t) {
    tone(t, { type: 'sawtooth', f0: 60, f1: 240, dur: 0.5, vol: 0.12, attack: 0.05 });
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(t + 0.1 + i * 0.07, { type: 'pulse0.25', f0: f, dur: 0.09, vol: 0.14 }));
  },
};

export const SFX_NAMES = Object.keys(SFX);

export function playSfx(name, delay = 0) {
  if (!A.ctx || A.ctx.state !== 'running') return false;
  const fn = SFX[name];
  if (!fn) { console.debug(`[audio] no sound "${name}"`); return false; }
  fn(A.ctx.currentTime + 0.005 + Math.max(0, delay));
  return true;
}
