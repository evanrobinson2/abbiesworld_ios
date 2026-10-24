// AW-STUDY-0054: the coaster's sound, all from the catalogue (INVARIANTS.md: no synthesis, no MIDI).
// 1. Effects from our own sound store (sounds/manifest.json): whooshes, crowd, fairground, chain, landing, fireworks, ta-da,
//    wind and wheel beds that follow the car. An effect the store can't supply (offline, previews) is silent.
// 2. The score is the produced Abbie's World track (music/abbies-world-reimagined.mp3, the same one the jukebox plays),
//    streamed under the ride; one signal drives it: state(). There is no synthesized band.
//   const A = coasterAudio({muted}); A.wake(); A.play('whoosh-1', {rate, gain}); A.state('ride'); A.speed(v, air); A.slow(k)

const SAMPLES = ['whoosh-1', 'whoosh-2', 'whoosh-3', 'magic-whoosh', 'carnival', 'stadium', 'chain', 'ratchet', 'countdown', 'jump-land-2', 'firework-launch', 'firework-burst-1',
  'firework-burst-2', 'tada', 'win-sting', 'pop-2', 'keys', 'balloon', 'slide-up', 'slide-down', 'click-2', 'cymbal', 'fairy', 'wind-strong', 'cart', 'heartbeat'];
export function coasterAudio({muted = false} = {}) {
  let ac = null, master = null, musicBus = null, sfxBus = null, lp = null, wind = null, rumble = null, beds = {}, buf = {}, manifest = null;
  let track = null, trackOn = false, st = 'off', step = 0, nextT = 0, timer = null, slowK = 1, bpm = 138;
  const A = {
    get ctx() { return ac; },
    wake() {
      if (muted) return null;
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
        master = ac.createGain(); master.gain.value = .9; const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp).connect(ac.destination);
        lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 18000; lp.connect(master);
        musicBus = ac.createGain(); musicBus.gain.value = .5; musicBus.connect(lp); sfxBus = ac.createGain(); sfxBus.gain.value = .9; sfxBus.connect(lp);
        load(); loadTrack(); }
      if (ac.state === 'suspended') ac.resume(); return ac;
    },
    // ---- effects ----
    play(id, {rate = 1, gain = 1, when = 0, pan = 0} = {}) {
      if (!A.wake()) return; const t = ac.currentTime + when, b = buf[id];
      const g = ac.createGain(); g.gain.value = gain; let out = g;
      if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
      out.connect(sfxBus);
      if (b) { const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * slowK; s.connect(g); s.start(t); return; }
    },
    bed(id, gain) { // a looping ambience bed (fairground, crowd), faded to `gain`
      if (!A.wake()) return; let b = beds[id];
      if (!b && buf[id]) { const s = ac.createBufferSource(); s.buffer = buf[id]; s.loop = true; const g = ac.createGain(); g.gain.value = 0; s.connect(g).connect(sfxBus); s.start(); b = beds[id] = {s, g}; }
      if (b) b.g.gain.setTargetAtTime(gain, ac.currentTime, .6);
    },
    speed(v, air) { // wind and wheels follow the car
      if (!ac) return; if (!wind || !rumble) startWind(); const t = ac.currentTime;
      wind.g.gain.setTargetAtTime(Math.min(.32, v / 70), t, .1); wind.bp.frequency.setTargetAtTime(380 + v * 42, t, .1);
      rumble.g.gain.setTargetAtTime(air ? 0 : Math.min(.13, v / 150), t, .06); rumble.o.frequency.setTargetAtTime(38 + v * 3.6, t, .1); rumble.c.gain.setTargetAtTime(air ? 0 : Math.min(.05, v / 400), t, .06);
    },
    quietRide() { const t = ac?.currentTime; for (const b of [wind, rumble]) b?.g.gain.setTargetAtTime(0, t, .3); },
    // slow motion: k = 1 normal, .2 very slow. The band and the world slide under a low-pass and down in pitch.
    slow(k) { slowK = k; if (track) track.playbackRate = Math.max(.5, k); if (!ac) return; const t = ac.currentTime; lp.frequency.setTargetAtTime(k < .99 ? 500 + 5000 * k : 18000, t, .08); musicBus.gain.setTargetAtTime(k < .99 ? .28 : .5, t, .1);
      if (k < .99) heartbeat(); },
    // ---- the score ----
    state(s) { if (!A.wake()) return; if (s === st) return; const was = st; st = s; musicTrack(s); return was; },
  };
  // The produced track: streamed, looped, into the music bus (so slow motion's low-pass and ducking still apply).
  function loadTrack() {
    try { track = new Audio('/music/abbies-world-reimagined.mp3'); track.loop = true; track.preload = 'auto'; track.crossOrigin = 'anonymous';
      const g = ac.createGain(); g.gain.value = 1; ac.createMediaElementSource(track).connect(g).connect(musicBus); track.addEventListener('error', () => { trackOn = false; });
      if (st !== 'off') musicTrack(st); } catch { track = null; }
  }
  function musicTrack(s) {
    if (!track) return; if (s === 'off') { track.pause(); trackOn = false; return; }
    if (trackOn) return; track.play().then(() => { trackOn = true; }, () => {});
  }
  async function load() {
    try { manifest = manifest || await (await fetch('/sounds/manifest.json')).json(); } catch { return; }
    const byId = Object.fromEntries((manifest.sounds || []).map(s => [s.id, s]));
    await Promise.all(SAMPLES.map(async id => { const u = byId[id]?.urls?.audio; if (!u) return; try { const r = await fetch(u); if (!r.ok) return; buf[id] = await ac.decodeAudioData(await r.arrayBuffer()); } catch {} }));
  }
  // wind and wheels: looping catalogue beds (wind-strong, cart) whose gain follows the car
  function startWind() {
    const mk = id => { if (!buf[id]) return null; const src = ac.createBufferSource(); src.buffer = buf[id]; src.loop = true; const g = ac.createGain(); g.gain.value = 0; src.connect(g).connect(sfxBus); src.start(); return {g}; };
    wind = wind || mk('wind-strong'); rumble = rumble || mk('cart');
  }
  function heartbeat() { A.play('heartbeat', {gain: .8}); setTimeout(() => A.play('heartbeat', {gain: .6}), 280); }
  return A;
}
