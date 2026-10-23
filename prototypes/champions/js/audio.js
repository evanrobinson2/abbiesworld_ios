// Every sound is synthesised here with WebAudio: no samples, nothing borrowed.
let ctx = null, master = null, last = new Map();
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}
export function setMuted(m) { if (master) master.gain.value = m ? 0 : 0.55; }

function tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.2, at = 0, freq = 1200, q = 1, type = 'bandpass' } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + at, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
function limited(key, ms) { const now = performance.now(); if (now - (last.get(key) || 0) < ms) return false; last.set(key, now); return true; }

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const note = (k, base = 392) => base * Math.pow(2, SCALE[Math.max(0, Math.min(SCALE.length - 1, k))] / 12);

export const sfx = {
  lift() { tone(660, 0.08, { type: 'triangle', vol: 0.12 }); noise(0.05, { vol: 0.05, freq: 3000 }); },
  hover() { if (limited('hover', 60)) tone(880, 0.05, { type: 'sine', vol: 0.05 }); },
  place(level = 1) { noise(0.12, { vol: 0.35, freq: 300, q: 0.7, type: 'lowpass' }); tone(110, 0.18, { type: 'sine', vol: 0.4, slide: 0.6 }); tone(note(level), 0.25, { type: 'triangle', vol: 0.18, at: 0.06 }); tone(note(level + 2), 0.3, { type: 'triangle', vol: 0.14, at: 0.12 }); },
  levelUp(level) { for (let k = 0; k < 3; k++) tone(note(level + k), 0.18, { type: 'triangle', vol: 0.16, at: k * 0.07 }); },
  charm() { tone(1320, 0.3, { type: 'sine', vol: 0.12 }); tone(1760, 0.35, { type: 'sine', vol: 0.1, at: 0.08 }); },
  well() { tone(500, 0.35, { type: 'sine', vol: 0.2, slide: 0.4 }); noise(0.3, { vol: 0.12, at: 0.25, freq: 800 }); },
  coin(k = 0) { if (!limited('coin', 45)) return; tone(1568 + k * 60, 0.09, { type: 'square', vol: 0.06 }); tone(2093 + k * 80, 0.14, { type: 'square', vol: 0.05, at: 0.05 }); },
  snap() { tone(240, 0.12, { type: 'triangle', vol: 0.12, slide: 0.7 }); },
  deny() { tone(200, 0.12, { type: 'square', vol: 0.06, slide: 0.8 }); },
  horn() { tone(196, 0.9, { type: 'sawtooth', vol: 0.12, attack: 0.08 }); tone(294, 0.9, { type: 'sawtooth', vol: 0.08, attack: 0.1, at: 0.05 }); tone(392, 0.6, { type: 'triangle', vol: 0.1, at: 0.35 }); },
  hit() { if (limited('hit', 35)) noise(0.06, { vol: 0.08, freq: 1500 + Math.random() * 1500, q: 2 }); },
  death() { if (limited('death', 40)) tone(500 + Math.random() * 300, 0.08, { type: 'triangle', vol: 0.06, slide: 0.5 }); },
  boom() { if (limited('boom', 90)) { noise(0.35, { vol: 0.25, freq: 180, type: 'lowpass' }); tone(70, 0.3, { vol: 0.25, slide: 0.5 }); } },
  zap(kind) { if (!limited('zap' + kind, 70)) return; if (kind === 'beam') tone(1200, 0.12, { type: 'sine', vol: 0.06, slide: 1.6 }); else if (kind === 'chain') noise(0.1, { vol: 0.08, freq: 4000, q: 4 }); else if (kind === 'flame') noise(0.15, { vol: 0.06, freq: 700 }); else tone(1800, 0.03, { type: 'square', vol: 0.02 }); },
  shoot() { if (limited('shoot', 60)) noise(0.05, { vol: 0.06, freq: 900, q: 3 }); },
  breach() { tone(98, 1.2, { type: 'sawtooth', vol: 0.2, slide: 0.5 }); noise(0.8, { vol: 0.3, freq: 120, type: 'lowpass' }); },
  win() { [0, 2, 4, 5].forEach((k, i) => tone(note(k + 1, 330), 0.4, { type: 'triangle', vol: 0.16, at: i * 0.11 })); },
  fanfare() { [0, 2, 4, 5, 7, 9].forEach((k, i) => { tone(note(k, 262), 0.5, { type: 'triangle', vol: 0.16, at: i * 0.13 }); tone(note(k, 131), 0.5, { type: 'sine', vol: 0.12, at: i * 0.13 }); }); },
  flip() { noise(0.08, { vol: 0.12, freq: 2500, q: 0.8 }); tone(740, 0.08, { type: 'triangle', vol: 0.08, at: 0.05 }); },
  reveal(r = 0) { [0, 2, 4].slice(0, r + 1).forEach((k, i) => tone(note(k + 3), 0.3, { type: 'sine', vol: 0.12, at: i * 0.09 })); },
  open() { tone(392, 0.2, { type: 'triangle', vol: 0.1 }); tone(523, 0.25, { type: 'triangle', vol: 0.1, at: 0.08 }); },
  rumble() { noise(0.9, { vol: 0.3, freq: 90, type: 'lowpass' }); tone(55, 0.8, { vol: 0.2 }); },
};
