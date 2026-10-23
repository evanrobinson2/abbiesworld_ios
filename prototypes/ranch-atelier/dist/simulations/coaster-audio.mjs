// AW-STUDY-0054 round 2: the coaster's sound. Two parts.
// 1. Effects from our own sound store (sounds/manifest.json: whooshes, crowd, fairground, chain, landing, fireworks, ta-da),
//    each with a synthesized stand-in so the ride still sounds right where the store can't be reached (previews, tests).
// 2. The score: Abbie's World's own theme (Music Bible: D major, the 3+3+2 rhythm, the hook D-E-F#-A | B-A-F#-E,
//    D6/9 -> G6 -> A(add9) -> D6/9), played live by a small synth band so it can follow the ride: 'garage' (pads and an
//    arpeggio), 'ride' (drums, bass, the hook), 'slow' (the band slides into a low-pass and drops away), 'finish'
//    (a cadence and a ta-da). One signal drives it: setState().
//   const A = coasterAudio({muted}); A.wake(); A.play('whoosh-1', {rate, gain}); A.state('ride'); A.speed(v, air); A.slow(k)

const SAMPLES = ['whoosh-1', 'whoosh-2', 'whoosh-3', 'magic-whoosh', 'carnival', 'stadium', 'chain', 'ratchet', 'countdown', 'jump-land-2', 'firework-launch', 'firework-burst-1',
  'firework-burst-2', 'tada', 'win-sting', 'pop-2', 'keys', 'balloon', 'slide-up', 'slide-down', 'click-2', 'cymbal', 'fairy'];
const N = n => 440 * Math.pow(2, (n - 69) / 12); // midi to Hz
// D major. Midi: D4 = 62
const HOOK = [[62, 64, 66, 69], [71, 69, 66, 64], [62, 66, 69, 71], [69, 64, 66, 62]];
const CHORDS = [[50, 57, 62, 64, 66], [43, 55, 59, 62, 64], [45, 57, 61, 64, 71], [50, 57, 62, 64, 66]]; // D6/9, G6, A(add9), D6/9 (root first)
const RHYTHM = [1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2 in eighths

export function coasterAudio({muted = false} = {}) {
  let ac = null, master = null, musicBus = null, sfxBus = null, lp = null, wind = null, rumble = null, beds = {}, buf = {}, manifest = null;
  let st = 'off', step = 0, nextT = 0, timer = null, slowK = 1, bpm = 138;
  const A = {
    get ctx() { return ac; },
    wake() {
      if (muted) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
        master = ac.createGain(); master.gain.value = .9; const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp).connect(ac.destination);
        lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.connect(master);
        musicBus = ac.createGain(); musicBus.gain.value = .5; musicBus.connect(lp); sfxBus = ac.createGain(); sfxBus.gain.value = .9; sfxBus.connect(lp);
        load(); }
      if (ac.state === 'suspended') ac.resume(); return ac;
    },
    // ---- effects ----
    play(id, {rate = 1, gain = 1, when = 0, pan = 0} = {}) {
      if (!A.wake()) return; const t = ac.currentTime + when, b = buf[id];
      const g = ac.createGain(); g.gain.value = gain; let out = g;
      if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
      out.connect(sfxBus);
      if (b) { const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * slowK; s.connect(g); s.start(t); return; }
      synthFx(id, g, t, rate);
    },
    bed(id, gain) { // a looping ambience bed (fairground, crowd), faded to `gain`
      if (!A.wake()) return; let b = beds[id];
      if (!b && buf[id]) { const s = ac.createBufferSource(); s.buffer = buf[id]; s.loop = true; const g = ac.createGain(); g.gain.value = 0; s.connect(g).connect(sfxBus); s.start(); b = beds[id] = {s, g}; }
      if (b) b.g.gain.setTargetAtTime(gain, ac.currentTime, .6);
    },
    speed(v, air) { // wind and wheels follow the car
      if (!ac) return; if (!wind) startWind(); const t = ac.currentTime;
      wind.g.gain.setTargetAtTime(Math.min(.32, v / 70), t, .1); wind.bp.frequency.setTargetAtTime(380 + v * 42, t, .1);
      rumble.g.gain.setTargetAtTime(air ? 0 : Math.min(.13, v / 150), t, .06); rumble.o.frequency.setTargetAtTime(38 + v * 3.6, t, .1); rumble.c.gain.setTargetAtTime(air ? 0 : Math.min(.05, v / 400), t, .06);
    },
    quietRide() { if (wind) { const t = ac.currentTime; wind.g.gain.setTargetAtTime(0, t, .3); rumble.g.gain.setTargetAtTime(0, t, .3); rumble.c.gain.setTargetAtTime(0, t, .3); } },
    // slow motion: k = 1 normal, .2 very slow. The band and the world slide under a low-pass and down in pitch.
    slow(k) { slowK = k; if (!ac) return; const t = ac.currentTime; lp.frequency.setTargetAtTime(k < .99 ? 500 + 5000 * k : 18000, t, .08); musicBus.gain.setTargetAtTime(k < .99 ? .28 : .5, t, .1);
      if (k < .99) heartbeat(); },
    // ---- the score ----
    state(s) { if (!A.wake()) return; if (s === st) return; const was = st; st = s; if (s === 'finish') cadence(); if (!timer) { nextT = ac.currentTime + .08; step = 0; timer = setInterval(tick, 25); } if (s === 'off') { clearInterval(timer); timer = null; } return was; },
  };
  async function load() {
    try { manifest = manifest || await (await fetch('/sounds/manifest.json')).json(); } catch { return; }
    const byId = Object.fromEntries((manifest.sounds || []).map(s => [s.id, s]));
    await Promise.all(SAMPLES.map(async id => { const u = byId[id]?.urls?.audio; if (!u) return; try { const r = await fetch(u); if (!r.ok) return; buf[id] = await ac.decodeAudioData(await r.arrayBuffer()); } catch {} }));
  }
  function noise(sec = 1) { const b = ac.createBuffer(1, Math.max(1, ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function startWind() {
    const src = ac.createBufferSource(); src.buffer = noise(2); src.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = .6;
    const g = ac.createGain(); g.gain.value = 0; src.connect(bp).connect(g).connect(sfxBus); src.start(); wind = {g, bp};
    const o = ac.createOscillator(), og = ac.createGain(), lpf = ac.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 50; og.gain.value = 0; lpf.type = 'lowpass'; lpf.frequency.value = 200; o.connect(lpf).connect(og).connect(sfxBus); o.start();
    // the click-clack of track joints: a pulse train
    const c = ac.createOscillator(), cg = ac.createGain(), hp = ac.createBiquadFilter(); c.type = 'square'; c.frequency.value = 14; hp.type = 'highpass'; hp.frequency.value = 1800; cg.gain.value = 0; c.connect(hp).connect(cg).connect(sfxBus); c.start();
    rumble = {o, g: og, c: cg};
  }
  function env(g, t, a, d, peak) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + d); }
  function osc(type, f, t, a, d, peak, bus = musicBus, f2 = 0, detune = 0) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d); o.detune.value = detune; env(g, t, a, d, peak); o.connect(g).connect(bus); o.start(t); o.stop(t + a + d + .05); }
  function nz(t, d, peak, type, f, bus = musicBus) { const s = ac.createBufferSource(); s.buffer = noise(d + .05); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ac.createGain(); env(g, t, .002, d, peak); s.connect(fl).connect(g).connect(bus); s.start(t); }
  function heartbeat() { const t = ac.currentTime; for (const k of [0, .28]) osc('sine', 62, t + k, .01, .22, .5, sfxBus, 38); }
  // stand-ins for the store's effects
  function synthFx(id, g, t, rate) {
    if (/whoosh/.test(id)) { const s = ac.createBufferSource(); s.buffer = noise(1.4); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300 * rate, t); f.frequency.exponentialRampToValueAtTime(2400 * rate, t + .5); f.frequency.exponentialRampToValueAtTime(400, t + 1.2); const e = ac.createGain(); env(e, t, .35, .9, .5); s.connect(f).connect(e).connect(g); s.start(t); return; }
    if (id === 'countdown') return osc('square', 660 * rate, t, .005, .14, .12, g);
    if (id === 'pop-2' || id === 'balloon') { osc('sine', 1046 * rate, t, .004, .16, .3, g, 1568 * rate); return osc('triangle', 2093, t + .05, .004, .2, .12, g); }
    if (id === 'keys' || id === 'fairy') { for (let i = 0; i < 5; i++) osc('triangle', 2600 + Math.random() * 1800, t + i * .03, .002, .12, .05, g); return; }
    if (id === 'jump-land-2') { osc('sine', 120, t, .005, .25, .7, g, 50); return nz(t, .18, .3, 'lowpass', 900, g); }
    if (id === 'chain' || id === 'ratchet' || id === 'click-2') { for (let i = 0; i < (id === 'chain' ? 8 : 4); i++) nz(t + i * .045, .03, .25, 'highpass', 2500, g); return; }
    if (/firework-burst/.test(id)) { nz(t, .6, .5, 'lowpass', 2500, g); for (let i = 0; i < 12; i++) nz(t + .1 + Math.random() * .5, .04, .15, 'highpass', 4000, g); return; }
    if (id === 'firework-launch' || id === 'slide-up') return osc('sine', 400, t, .02, .9, .2, g, 1600);
    if (id === 'slide-down') return osc('sine', 1400, t, .02, .9, .2, g, 300);
    if (id === 'tada' || id === 'win-sting') { [62, 66, 69, 74].forEach((n, i) => osc('triangle', N(n + 12), t + i * .09, .01, .5, .16, g)); return; }
    if (id === 'cymbal') return nz(t, 1.6, .25, 'highpass', 5000, g);
    if (id === 'magic-whoosh') { osc('sawtooth', 220, t, .05, .5, .1, g, 1760); return; }
  }
  // the band: one step = an eighth note
  function tick() {
    const spb = 60 / bpm / 2 / Math.max(.35, slowK);
    while (nextT < ac.currentTime + .12) { play(step, nextT, spb); nextT += spb; step++; }
  }
  function play(i, t, spb) {
    const bar = Math.floor(i / 8) % 4, e = i % 8, ch = CHORDS[bar], ride = st === 'ride' || st === 'slow';
    if (st === 'off') return;
    // drums (ride only): kick on the 3+3+2, snare on 2 and 4, hats on every eighth
    if (ride && st !== 'slow') { if (RHYTHM[e]) osc('sine', 150, t, .002, .18, .9, musicBus, 45); if (e === 2 || e === 6) { nz(t, .12, .35, 'bandpass', 1800); osc('triangle', 190, t, .002, .08, .2); } nz(t, .03, e % 2 ? .08 : .14, 'highpass', 7000); }
    // bass on the 3+3+2
    if (RHYTHM[e] && st !== 'finish') osc('sawtooth', N(ch[0] - 12 + 12), t, .005, spb * 2.4, ride ? .22 : .12, musicBus, 0, 0);
    // arpeggio over the chord
    const arp = ch.slice(1); osc(st === 'garage' ? 'triangle' : 'square', N(arp[e % arp.length] + 12), t, .004, spb * .9, st === 'garage' ? .07 : .04);
    // pad at the bar line
    if (e === 0) for (const n of ch.slice(1)) osc('triangle', N(n), t, spb * 2, spb * 6, .035, musicBus, 0, (Math.random() - .5) * 12);
    // the hook: one note per quarter, in the ride
    if (ride && e % 2 === 0) { const n = HOOK[bar][e / 2]; osc('square', N(n + 12), t, .01, spb * 1.6, .07); osc('triangle', N(n + 24), t, .01, spb * 1.2, .04); }
  }
  function cadence() { const t = ac.currentTime + .05; [[57, 61, 64, 69], [50, 57, 62, 66, 69, 74]].forEach((c, k) => c.forEach(n => osc('triangle', N(n + 12), t + k * .45, .02, 1.6, .06))); setTimeout(() => { if (st === 'finish') { st = 'garage'; } }, 3200); }
  return A;
}
