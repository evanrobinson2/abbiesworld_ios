// Synthesised stings for world events (no samples, no voices: nothing here is a recording of a person).
// sitarStrum: a drone and a rolled raga chord of plucked strings (Karplus-Strong), played over Abbie's World music.
// cartoonScream: a silly falling "waaah" and a low spooky swell, a short burst for the big sky events; nobody is hurt.
let ctx = null;
const audio = () => { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch { ctx = null; } return ctx; };

function pluck(c, out, freq, at, len = 2.4, gain = 0.22) {
  const n = Math.round(c.sampleRate / freq), buf = c.createBuffer(1, Math.round(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  for (let i = n; i < d.length; i++) d[i] = (d[i - n] + d[i - n + 1]) * 0.4985; // slow decay: a ringing string
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain(); g.gain.setValueAtTime(gain, at); g.gain.exponentialRampToValueAtTime(0.0008, at + len);
  const buzz = c.createBiquadFilter(); buzz.type = 'peaking'; buzz.frequency.value = freq * 4; buzz.gain.value = 9; buzz.Q.value = 2; // the sitar's buzzing bridge
  src.connect(buzz).connect(g).connect(out); src.start(at);
}

export function sitarStrum(volume = 0.7) {
  const c = audio(); if (!c) return;
  const out = c.createGain(); out.gain.value = volume; out.connect(c.destination);
  const t = c.currentTime + 0.05, root = 146.83; // D3, drone plus a Bhairav-style rolled chord (D, Eb, F#, A)
  pluck(c, out, root / 2, t, 4, 0.2);
  [1, 1.0595, 1.26, 1.498, 2, 2.52].forEach((r, i) => pluck(c, out, root * r, t + 0.05 + i * 0.07, 2.8, 0.2));
  setTimeout(() => out.disconnect(), 7000);
}

export function cartoonScream(volume = 0.5) {
  const c = audio(); if (!c) return;
  const out = c.createGain(); out.gain.value = volume; out.connect(c.destination);
  const t = c.currentTime + 0.02;
  const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(260, t + 1.3);
  const vib = c.createOscillator(); vib.frequency.value = 9; const vg = c.createGain(); vg.gain.value = 40; vib.connect(vg).connect(o.frequency);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  o.connect(g).connect(out); o.start(t); vib.start(t); o.stop(t + 1.6); vib.stop(t + 1.6);
  const low = c.createOscillator(); low.type = 'sawtooth'; low.frequency.setValueAtTime(55, t + 0.2); low.frequency.linearRampToValueAtTime(46, t + 2.2);
  const lf = c.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 220;
  const lg = c.createGain(); lg.gain.setValueAtTime(0, t + 0.2); lg.gain.linearRampToValueAtTime(0.3, t + 0.9); lg.gain.linearRampToValueAtTime(0, t + 2.4);
  low.connect(lf).connect(lg).connect(out); low.start(t + 0.2); low.stop(t + 2.5);
  setTimeout(() => out.disconnect(), 4000);
}
