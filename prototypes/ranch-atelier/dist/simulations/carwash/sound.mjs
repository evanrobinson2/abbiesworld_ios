// The carwash's voice, all WebAudio, no files: water spray and the dryers as filtered noise, the brushes as a soft whirr, soap
// bubbles popping, a big bucket splash, and a little tune when the buggy becomes hers. Diegetic: the building makes these
// sounds and the characters hear them. The ambient bed is quiet and follows how close the player is.
let ctx, bed = null;
const ac = () => { try { ctx ??= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; } catch { return null; } };
function noiseBuffer(a, secs = 2) { const b = a.createBuffer(1, a.sampleRate * secs, a.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = last * .6 + (Math.random() * 2 - 1) * .4; d[i] = last; } return b; }
function tone(freq, t0, dur, type = 'sine', vol = .12, slide = 0) {
 const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), a.currentTime + t0 + dur);
 g.gain.setValueAtTime(0, a.currentTime + t0); g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t0 + dur); o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + .05);
}
// ambient bed: spray (high noise), dryers (low noise), brushes (a slow saw). setLevels({spray, dryer, brush}) each 0..1
export function startBed() {
 const a = ac(); if (!a || bed) return bed; const master = a.createGain(); master.gain.value = 0; master.connect(a.destination);
 const mk = (type, freq, q) => { const src = a.createBufferSource(); src.buffer = noiseBuffer(a); src.loop = true; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = a.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(master); src.start(); return {g, f}; };
 const spray = mk('highpass', 2600, .4), dryer = mk('lowpass', 520, .8);
 const osc = a.createOscillator(), og = a.createGain(), lf = a.createOscillator(), lg = a.createGain(); osc.type = 'sawtooth'; osc.frequency.value = 62; og.gain.value = 0; lf.frequency.value = 5.5; lg.gain.value = 9; lf.connect(lg).connect(osc.frequency); osc.connect(og).connect(master); osc.start(); lf.start();
 bed = {master, spray, dryer, brush: og, ctx: a}; return bed;
}
export function setLevels({spray = 0, dryer = 0, brush = 0, master = 1} = {}) {
 if (!bed) return; const t = bed.ctx.currentTime; bed.master.gain.setTargetAtTime(.5 * master, t, .15); bed.spray.g.gain.setTargetAtTime(.22 * spray, t, .12); bed.dryer.g.gain.setTargetAtTime(.3 * dryer, t, .12); bed.brush.gain.setTargetAtTime(.035 * brush, t, .12);
}
export function stopBed() { if (!bed) return; setLevels({master: 0}); const b = bed; bed = null; setTimeout(() => b.ctx.suspend?.().catch?.(() => {}), 600); }
export const pop = () => { tone(520 + Math.random() * 500, 0, .07, 'sine', .06, 1.8); };
export function splash(big = 1) { // a bucket of water landing: a burst of noise falling away
 const a = ac(); if (!a) return; const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = noiseBuffer(a, 1); f.type = 'bandpass'; f.frequency.setValueAtTime(3200, a.currentTime); f.frequency.exponentialRampToValueAtTime(500, a.currentTime + .9); f.Q.value = .7;
 g.gain.setValueAtTime(.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(.45 * big, a.currentTime + .03); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + 1); src.connect(f).connect(g).connect(a.destination); src.start(); src.stop(a.currentTime + 1.05);
 tone(180, 0, .25, 'sine', .12 * big, .4);
}
export function jingle() { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * 2 ** (s / 12), i * .09, .55, 'triangle', .13)); tone(1568, .5, .7, 'sine', .08); }
export const brr = () => { tone(300, 0, .4, 'sawtooth', .04, .9); tone(330, .03, .4, 'sawtooth', .03, .9); };
