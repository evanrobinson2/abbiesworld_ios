// A few tiny WebAudio blips so the hunt has a voice before the Ranch's own sound set is wired in. Diegetic where it can be
// (a chime when you find something, a boing from a mushroom, a pip-pip when the tow critter arrives). No files to load.
let ctx;
const ac = () => { try { ctx ??= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; } catch { return null; } };
function tone(freq, t0, dur, type = 'sine', vol = .15, slide = 0) {
 const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + t0); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, a.currentTime + t0 + dur);
 g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + dur); o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + .05);
}
export const chime = n => { const base = 523 * 2 ** ((n % 5) / 12 * 2); [0, 4, 7, 12].forEach((s, i) => tone(base * 2 ** (s / 12), i * .08, .5, 'triangle', .14)); };
export const boing = () => tone(180, 0, .35, 'sine', .2, 3.2);
export const pop = () => { tone(700, 0, .08, 'square', .06, .4); tone(1200, .05, .12, 'sine', .08, .6); };
export const pipPip = () => { tone(880, 0, .09, 'square', .07); tone(1175, .13, .12, 'square', .07); };
export const bonk = k => tone(140 + k * 60, 0, .18, 'square', .08 + k * .06, .5);
