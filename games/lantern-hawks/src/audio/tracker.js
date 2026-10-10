// A tiny tracker. A song is { bpm, voices, patterns, order, loopTo, loop, echo }.
// Each pattern holds one token list per voice, one token per 16th-note step:
//   note "E4" / "F#3"   start a note       "."  hold the previous token
//   "-"                 silence
//   chord "Em", "D", "B7", "Fmaj7", "Epow" (root+fifth) (arp and pad voices)
//   drums: k kick, s snare, h hat, o open hat, c crash, t tom, p drip; combine as "kh"
// Notes are scheduled a little ahead on the audio clock, so loops are seamless.

import { A, makeOsc, makeNoise, env, NOTE, hz } from './engine.js';

const CHORDS = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7], pow: [0, 7, 12], dim: [0, 3, 6] };
const ROOT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function chord(tok, octave) {
  const m = /^([A-G])([#b]?)(maj7|m7|sus4|sus2|dim|pow|m|7)?$/.exec(tok);
  if (!m) return null;
  const root = 12 * (octave + 1) + ROOT[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return CHORDS[m[3] || ''].map(i => root + i);
}

// tokens -> [{ step, len, tok }]
function events(tokens) {
  const out = [];
  let cur = null;
  tokens.forEach((tok, i) => {
    if (tok === '.') { if (cur) cur.len++; return; }
    cur = null;
    if (tok === '-') return;
    cur = { step: i, len: 1, tok };
    out.push(cur);
  });
  return out;
}

// ---- instruments: (inst, tok, t, dur, out) ----
const INST = {
  lead(v, tok, t, dur, out) {
    const n = NOTE(tok); if (n == null) return;
    const f = hz(n + (v.transpose || 0));
    const o = makeOsc(v.wave || 'pulse0.25', f, t);
    if (v.vibrato !== 0 && dur > 0.2) {
      const lfo = A.ctx.createOscillator(), lg = A.ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(f * (v.vibrato ?? 0.007), t + Math.min(0.35, dur));
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const g = env(t, Math.max(0.04, dur * (v.gate ?? 0.92)), v.gain ?? 0.16, v.attack ?? 0.004, v.release ?? 0.05);
    let node = o.connect(g);
    if (v.cutoff) { const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = v.cutoff; node = node.connect(lp); }
    node.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  bass(v, tok, t, dur, out) {
    const n = NOTE(tok); if (n == null) return;
    const f = hz(n);
    const lp = A.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = v.q ?? 6;
    lp.frequency.setValueAtTime(v.cutHi ?? 1600, t);
    lp.frequency.exponentialRampToValueAtTime(v.cutLo ?? 280, t + Math.min(0.25, dur));
    const g = env(t, Math.max(0.05, dur * (v.gate ?? 0.85)), v.gain ?? 0.22, 0.004, 0.04);
    lp.connect(g).connect(out);
    for (const [type, mul, lv] of [[v.wave || 'sawtooth', 1, 1], ['pulse0.5', 0.5, 0.6]]) {
      const o = makeOsc(type, f * mul, t), og = A.ctx.createGain();
      og.gain.value = lv;
      o.connect(og).connect(lp);
      o.start(t); o.stop(t + dur + 0.05);
    }
  },
  arp(v, tok, t, dur, out) {
    const notes = chord(tok, v.octave ?? 4); if (!notes) return;
    const seq = v.up === false ? notes.slice().reverse() : notes.concat(notes.slice(1, -1).reverse());
    const rate = v.rate ?? 0.045;
    const o = makeOsc(v.wave || 'pulse0.125', hz(seq[0]), t);
    for (let k = 0, s = t; s < t + dur; k++, s += rate) o.frequency.setValueAtTime(hz(seq[k % seq.length]), s);
    const g = env(t, dur, v.gain ?? 0.07, 0.004, 0.03);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  pad(v, tok, t, dur, out) {
    const notes = NOTE(tok) != null ? [NOTE(tok)] : chord(tok, v.octave ?? 3);
    if (!notes) return;
    const lp = A.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = v.cutoff ?? 1100;
    const g = env(t, dur + (v.tail ?? 0.3), v.gain ?? 0.05, v.attack ?? 0.25, v.tail ?? 0.3);
    lp.connect(g).connect(out);
    for (const n of notes) for (const d of [-7, 7]) {
      const o = makeOsc(v.wave || 'sawtooth', hz(n), t);
      o.detune.value = d;
      o.connect(lp);
      o.start(t); o.stop(t + dur + (v.tail ?? 0.3) + 0.05);
    }
  },
  drums(v, tok, t, dur, out) {
    const lv = v.gain ?? 1;
    for (const ch of tok) {
      if (ch === 'k') {
        const o = makeOsc('sine', 150, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        const g = env(t, 0.16, 0.55 * lv, 0.002, 0.08);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
      } else if (ch === 's' || ch === 'h' || ch === 'o' || ch === 'c' || ch === 'r') {
        const spec = { s: ['bandpass', 1900, 0.14, 0.32, true], h: ['highpass', 7500, 0.035, 0.12, false], o: ['highpass', 6500, 0.2, 0.1, false], c: ['highpass', 4200, 0.9, 0.16, false], r: ['bandpass', 3200, 0.03, 0.2, true] }[ch];
        const n = makeNoise(t, spec[2], spec[4]);
        const f = A.ctx.createBiquadFilter(); f.type = spec[0]; f.frequency.value = spec[1];
        const g = env(t, spec[2], spec[3] * lv, 0.001, spec[2] * 0.7);
        n.connect(f).connect(g).connect(out);
        if (ch === 's') {
          const o = makeOsc('triangle', 190, t);
          o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
          const og = env(t, 0.09, 0.2 * lv, 0.001, 0.06);
          o.connect(og).connect(out); o.start(t); o.stop(t + 0.12);
        }
      } else if (ch === 't') {
        const o = makeOsc('sine', 210, t);
        o.frequency.exponentialRampToValueAtTime(85, t + 0.2);
        const g = env(t, 0.22, 0.4 * lv, 0.002, 0.12);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.25);
      } else if (ch === 'p') {
        const o = makeOsc('sine', 1100, t);
        o.frequency.exponentialRampToValueAtTime(2300, t + 0.07);
        const g = env(t, 0.09, 0.12 * lv, 0.002, 0.06);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.12);
      }
    }
  },
};

// Compile a song once: per pattern, per voice, its event list and step count.
const compiled = new WeakMap();
function compile(song) {
  if (compiled.has(song)) return compiled.get(song);
  const pats = {};
  for (const [name, p] of Object.entries(song.patterns)) {
    const len = Math.max(...Object.values(p).map(a => a.length));
    pats[name] = { len, voices: Object.fromEntries(Object.entries(p).map(([v, toks]) => [v, events(toks)])) };
  }
  const c = { pats };
  compiled.set(song, c);
  return c;
}

// A playing song. Call tick() often; stop() fades it out.
export class Player {
  constructor(song, name) {
    this.song = song;
    this.name = name;
    this.c = compile(song);
    this.stepDur = 60 / song.bpm / 4;
    this.order = 0;
    this.step = 0;
    this.done = false;
    const ctx = A.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = song.gain ?? 1;
    this.out.connect(A.music);
    this.bus = ctx.createGain();
    this.bus.connect(this.out);
    if (song.echo) {
      const d = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
      d.delayTime.value = song.echo.time; fb.gain.value = song.echo.feedback; wet.gain.value = song.echo.mix;
      lp.type = 'lowpass'; lp.frequency.value = 2200;
      this.bus.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(wet).connect(this.out);
    }
    this.next = ctx.currentTime + 0.08;
  }

  tick(ahead = 0.15) {
    const ctx = A.ctx;
    if (this.done) return;
    if (this.next < ctx.currentTime - 0.05) this.next = ctx.currentTime + 0.03; // tab was asleep: skip, don't burst
    while (this.next < ctx.currentTime + ahead) {
      const pat = this.c.pats[this.song.order[this.order]];
      for (const [vname, evs] of Object.entries(pat.voices)) {
        const v = this.song.voices[vname];
        if (!v) continue;
        for (const e of evs) if (e.step === this.step) INST[v.type || vname](v, e.tok, this.next, e.len * this.stepDur, this.bus);
      }
      this.next += this.stepDur;
      if (++this.step >= pat.len) {
        this.step = 0;
        if (++this.order >= this.song.order.length) {
          if (this.song.loop === false) { this.done = true; this.endAt = this.next; return; }
          this.order = this.song.loopTo ?? 0;
        }
      }
    }
  }

  stop(fade = 0.5) {
    this.done = true;
    const t = A.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { try { this.out.disconnect(); } catch { /* gone */ } }, (fade + 3) * 1000);
  }
}

// Length of one pass of a song in seconds (for tests and stings).
export function songSeconds(song) {
  const c = compile(song);
  return song.order.reduce((s, name) => s + c.pats[name].len, 0) * (60 / song.bpm / 4);
}
