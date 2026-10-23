// The café's own sounds (AW-STUDY-0013), all made in the room: the jukebox's little synth-pop loop, footsteps on the
// planks, the espresso steam, the cash register, the old door. Diegetic: in the information grammar a jukebox tune and
// a door are things the characters hear too. Nothing here is a UI tick. Made with the Web Audio API, no files.
//
//   const snd = cafeSound();   snd.unlock() on the first tap;   snd.music(true|false);   snd.sfx.thunk() ...
//   snd.onBeat(step => ...) fires on every sixteenth while the music plays; snd.beatPhase() is 0..1 across a beat.
export function cafeSound() {
  let ac = null, master = null, mus = null, playing = false, step = 0, nextAt = 0, timer = 0, startAt = 0;
  const BPM = 118, S = 60 / BPM / 4, beatFns = new Set();
  const A = f => 55 * Math.pow(2, (f - 9) / 12);   // semitones above C: 9 is A1
  const unlock = () => {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination); mus = ac.createGain(); mus.gain.value = 0; mus.connect(master); } catch { ac = null; } }
    if (ac?.state === 'suspended') ac.resume(); return !!ac;
  };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
  function tone(f, t, d, peak = .08, type = 'sine', dest = master, f2 = 0) {
    if (!ac) return; const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    env(g, t, .005, peak, d); o.connect(g).connect(dest); o.start(t); o.stop(t + d + .06);
  }
  let nbuf = null;
  function noise(t, d, peak = .06, hp = 2000, lp = 9000, dest = master) {
    if (!ac) return; if (!nbuf) { nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const a = nbuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), g = ac.createGain(), h = ac.createBiquadFilter(), l = ac.createBiquadFilter();
    s.buffer = nbuf; s.loop = true; h.type = 'highpass'; h.frequency.value = hp; l.type = 'lowpass'; l.frequency.value = lp;
    env(g, t, .004, peak, d); s.connect(h).connect(l).connect(g).connect(dest); s.start(t, Math.random()); s.stop(t + d + .05);
  }
  // ---- the tune: Am - F - C - G, a kick, a clap, a bass, a bell-like arp ----
  const ROOTS = [0, -4, 3, -2], CH = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];   // semitones from A (the F, C and G chords are major; the first minor)
  function play(i, t) {
    const bar = Math.floor(i / 16) % 4, k = i % 16, root = ROOTS[bar];
    if (k % 4 === 0) { tone(150, t, .16, .22, 'sine', mus, 45); }
    if (k === 4 || k === 12) { noise(t, .12, .09, 1500, 7000, mus); tone(190, t, .07, .05, 'triangle', mus); }
    if (k % 2 === 1) noise(t, .04, .03, 7000, 12000, mus);
    if (k % 4 === 0 || k === 10 || k === 14) tone(A(9 + root) , t, S * 1.7, .12, 'square', mus);                 // bass
    const arp = [0, 1, 2, 1, 2, 1, 0, 2][k % 8], ch = CH[bar];
    tone(A(21 + root + ch[arp]) * 2, t, S * 1.4, .045, 'triangle', mus);                                     // bells
    if (k === 0 || k === 6 || k === 8) tone(A(21 + root + ch[2]) * 4, t, S * 3, .03, 'sine', mus);           // a high twinkle
    beatFns.forEach(f => { try { f(i, t); } catch {} });
  }
  function tick() { if (!playing || !ac) return; while (nextAt < ac.currentTime + .12) { play(step, nextAt); step++; nextAt += S; } }
  function music(on) {
    if (!unlock()) return false;
    if (on && !playing) { playing = true; step = 0; nextAt = ac.currentTime + .05; startAt = nextAt; mus.gain.cancelScheduledValues(ac.currentTime); mus.gain.setTargetAtTime(.9, ac.currentTime, .15); timer = setInterval(tick, 25); }
    else if (!on && playing) { playing = false; clearInterval(timer); mus.gain.setTargetAtTime(0, ac.currentTime, .12); }
    return playing;
  }
  const t0 = () => ac ? ac.currentTime : 0;
  const sfx = {
    step() { if (!ac) return; const t = t0(); noise(t, .05, .035, 300, 1800); tone(120 + Math.random() * 30, t, .05, .03, 'sine'); },
    thunk() { if (!ac) return; const t = t0(); tone(110, t, .22, .25, 'sine', master, 50); noise(t, .1, .06, 200, 1200); },
    rattle() { if (!ac) return; const t = t0(); for (let i = 0; i < 4; i++) { tone(180 + i * 15, t + i * .07, .05, .1, 'square'); noise(t + i * .07, .05, .05, 800, 3000); } tone(90, t, .2, .1, 'sine', master, 60); },
    unlock() { if (!ac) return; const t = t0(); tone(2400, t, .06, .08, 'triangle'); tone(1800, t + .09, .07, .08, 'triangle'); noise(t + .18, .06, .05, 1000, 4000); tone(100, t + .2, .18, .18, 'sine', master, 60); },
    creak() { if (!ac) return; const t = t0(); tone(160, t, .9, .045, 'sawtooth', master, 230); tone(240, t + .2, .7, .03, 'sawtooth', master, 175); },
    drawer() { if (!ac) return; const t = t0(); noise(t, .35, .05, 400, 2500); tone(90, t + .3, .12, .1, 'sine', master, 60); },
    cash() { if (!ac) return; const t = t0(); tone(1319, t, .5, .08, 'triangle'); tone(1760, t + .05, .6, .07, 'triangle'); tone(2637, t + .1, .8, .05, 'sine'); noise(t, .06, .06, 3000, 9000); },
    key() { if (!ac) return; const t = t0(); for (let i = 0; i < 3; i++) tone(3000 + i * 300, t + i * .06, .25, .035, 'sine'); },
    steam() { if (!ac) return; noise(t0(), 1.3, .07, 3500, 11000); },
    ding() { if (!ac) return; const t = t0(); tone(1568, t, .6, .08, 'sine'); tone(2093, t + .12, .7, .06, 'sine'); },
    bell() { if (!ac) return; const t = t0(); tone(2093, t, .9, .06, 'sine'); tone(3136, t, .6, .03, 'sine'); }   // the café's door bell
  };
  return {unlock, music, sfx, isOn: () => playing, onBeat: fn => (beatFns.add(fn), () => beatFns.delete(fn)),
    beatPhase: () => ac && playing ? (((ac.currentTime - startAt) / (S * 4)) % 1 + 1) % 1 : 0, ctx: () => ac};
}
