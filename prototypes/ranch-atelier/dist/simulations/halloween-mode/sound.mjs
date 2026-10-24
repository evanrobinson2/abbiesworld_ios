// Halloween mode sound, in the spooky-cute family of docs/music/MUSIC_BIBLE.md: celesta, toy piano, woodblock, pizzicato,
// a little theremin wobble, never a horror stinger. Synthesised so it works with no download; the finished score
// ("Halloween After Dark", docs/oracle/score) replaces the loop when its file is on R2. On the grid: the knock and the
// creak are diegetic (the people at the door hear them too); the music is meta (the mood, felt by the player).
// Honors the same mute as the backpack jingle (window.AWLook.state.prefs.mute) and starts only after a tap.

let ac = null, master = null, loop = null;
const muted = () => !!window.AWLook?.state?.prefs?.mute;
function ctx() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination); } catch { return null; } }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
function tone(freq, at, len, {type = 'triangle', vol = .05, to = null, out = master} = {}) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(freq, at); if (to) o.frequency.exponentialRampToValueAtTime(to, at + len);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + len); o.connect(g).connect(out); o.start(at); o.stop(at + len + .05);
}
export const knock = () => { if (muted() || !ctx()) return; const t = ac.currentTime; [0, .17, .34].forEach((d, i) => tone(i === 2 ? 210 : 260, t + d, .09, {type: 'square', vol: .05})); }; // three woodblock knocks
export const creak = () => { if (muted() || !ctx()) return; const t = ac.currentTime; tone(180, t, .5, {type: 'sawtooth', vol: .02, to: 330}); tone(340, t + .1, .35, {type: 'triangle', vol: .015, to: 220}); }; // a friendly squeaky hinge
export const treat = () => { if (muted() || !ctx()) return; const t = ac.currentTime; [1319, 1568, 1976, 2349].forEach((f, i) => tone(f, t + i * .07, .4, {vol: .04})); }; // celesta
export const charm = () => { if (muted() || !ctx()) return; const t = ac.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * .09, .6, {vol: .05})); };

// A slow minor-key music-box loop under the town (84 BPM feel, pizzicato bass, one theremin sigh every few bars).
const A_MINOR = [220, 262, 330, 392, 440, 523, 659], BASS = [110, 110, 131, 98];
export function startMusic() {
  if (loop || muted() || !ctx()) return;
  const beat = 60 / 84; let bar = 0;
  const play = () => {
    if (muted()) return; const t = ac.currentTime + .05;
    BASS.forEach((f, i) => tone(f, t + i * beat * 2, .35, {type: 'sine', vol: .05}));
    for (let i = 0; i < 8; i++) if ((i + bar) % 3 !== 2) tone(A_MINOR[(i * 3 + bar * 2) % A_MINOR.length] * (i % 4 === 3 ? 2 : 1), t + i * beat, .7, {vol: .018});
    if (bar % 4 === 3) tone(440, t + beat * 2, 2.4, {type: 'sine', vol: .012, to: 466}); // the little sigh
    bar++;
  };
  play(); loop = setInterval(play, beat * 8 * 1000);
}
export const stopMusic = () => { clearInterval(loop); loop = null; };
