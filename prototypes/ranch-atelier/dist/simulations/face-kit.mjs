// Face kit (AW-STUDY-0039 - Facial Expressions): one expression set that drives every kind of face we draw.
// - EXPRESSIONS: 18 named feelings. Each sets face channels (brows, lids, gaze, mouth, decals), the body (chest,
//   shoulders, lean, arms) and what the voice and the far-away emote say. Same data for a 3D rig, a painted 2D face
//   and a faceless mannequin, so a character reads at any distance and in any art direction.
// - FaceDriver: mood (slow) + momentary expression (attack, hold, release) + life (blinks, saccades, breathing)
//   + speech (visemes from text, re-synced by word boundaries, or a live audio level).
// - parseLine / voiceText: one line of dialogue with [tags] drives both the voice and the face.
// - drawFace2D: the painted face, smooth (2D puppet) or snapped to a swap sheet (texture-swap, like cut-out games).
// Kids' faces are never redrawn: this kit animates the parts a character already has; it never paints a likeness.

// Every channel and its rest value. L/R pairs may be set separately (browUpL ...); otherwise both sides share one.
// browUp -1 low .. 1 high; browIn -1 inner down (cross) .. 1 inner up (worry); lid 0 shut .. 1 wide; squint 0..1
// (lower lid up); smile -1 frown .. 1 smile; jaw/wide/pucker 0..1; blush/tear/sweat/sparkle are decals 0..1.
// tilt/nod/turn move the head (-1..1, nod 1 = chin up); chest -1 slump .. 1 puffed; shoulders 0..1 up; lean -1 back
// .. 1 forward; bounce is idle energy.
export const REST = {browUp: 0, browIn: 0, lid: .78, squint: 0, pupil: 1, gazeX: 0, gazeY: 0, smile: 0, jaw: 0, wide: 0,
 pucker: 0, blush: 0, tear: 0, sweat: 0, sparkle: 0, tilt: 0, nod: 0, turn: 0, chest: 0, shoulders: 0, lean: 0, bounce: .3};
export const SIDED = ['browUp', 'browIn', 'lid', 'squint', 'smile'];
const BODY = new Set(['tilt', 'nod', 'turn', 'chest', 'shoulders', 'lean', 'bounce']);

// mood: [valence, arousal] on the circumplex, so one feeling can also steer music and light ("the whole game adapts").
// emote: the spatial bubble shown only when the face is too small to read. voice: the ElevenLabs v3 direction tag.
export const EXPRESSIONS = {
 neutral: {label: 'Calm', kid: 'just being me', face: {}, body: {}, arms: 'rest', emote: null, voice: null, mood: [0, 0]},
 happy: {label: 'Happy', kid: 'that was nice', face: {smile: .7, squint: .3, browUp: .15, blush: .15}, body: {bounce: .45, chest: .2}, arms: 'rest', emote: 'note', voice: 'happy', mood: [.6, .4]},
 joy: {label: 'Joy', kid: 'yes yes YES', face: {smile: 1, jaw: .55, wide: .3, squint: .45, browUp: .55, lid: .92, sparkle: 1, blush: .3}, body: {chest: .6, nod: .25, bounce: 1}, arms: 'up', emote: 'sparkle', voice: 'excited', mood: [.9, .9]},
 laugh: {label: 'Laugh', kid: 'that is so funny', face: {smile: 1, jaw: .7, squint: .95, lid: .3, browUp: .3, blush: .4}, body: {nod: .4, chest: .4, bounce: .9}, arms: 'belly', emote: 'note', voice: 'laughs', mood: [.85, .8]},
 sad: {label: 'Sad', kid: 'I miss it', face: {smile: -.7, browIn: .9, browUp: -.1, lid: .55, gazeY: -.5, tear: .7}, body: {nod: -.5, chest: -.8, shoulders: .2, lean: .1, bounce: .05}, arms: 'droop', emote: 'drop', voice: 'sad', mood: [-.7, -.4]},
 grumpy: {label: 'Grumpy', kid: 'hmph, not fair', face: {browUp: -.8, browIn: -.9, lid: .62, squint: .3, smile: -.5, pucker: .3}, body: {nod: -.2, chest: .5, shoulders: .3}, arms: 'cross', emote: 'cloud', voice: 'annoyed', mood: [-.5, .5]},
 surprised: {label: 'Surprised', kid: 'whoa!', face: {browUp: 1, browIn: .3, lid: 1, pupil: .7, jaw: .75, pucker: .4}, body: {nod: .2, chest: .5, lean: -.3, shoulders: .5}, arms: 'out', emote: 'bang', voice: 'surprised', mood: [.2, .9]},
 worried: {label: 'Worried', kid: 'uh oh', face: {browIn: 1, browUp: .2, lid: .88, smile: -.4, wide: .5, sweat: .7, gazeX: -.3}, body: {shoulders: .7, chest: -.2, lean: -.15}, arms: 'clutch', emote: 'drop', voice: 'nervous', mood: [-.4, .6]},
 yuck: {label: 'Yuck', kid: 'eww, broccoli', face: {browUp: -.5, browIn: -.3, squint: .8, lid: .5, smile: -.5, wide: .7, jaw: .2}, body: {turn: .4, tilt: -.2, lean: -.4}, arms: 'push', emote: 'squiggle', voice: 'disgusted', mood: [-.5, .4]},
 curious: {label: 'Curious', kid: 'what is that?', face: {browUpL: .85, browUpR: .1, lid: .92, pupil: 1.25, smile: .15, pucker: .2}, body: {tilt: .4, lean: .4}, arms: 'rest', emote: 'question', voice: 'curious', mood: [.3, .4]},
 thinking: {label: 'Thinking', kid: 'hmm, let me see', face: {browIn: -.2, browUpL: .5, browUpR: -.1, gazeX: .6, gazeY: .6, smile: -.1, pucker: .4}, body: {tilt: -.2}, arms: 'chin', emote: 'dots', voice: 'thoughtful', mood: [0, .1]},
 proud: {label: 'Proud', kid: 'I did it myself', face: {smile: .6, squint: .2, lid: .62, browUp: .2}, body: {nod: .35, chest: 1}, arms: 'hips', emote: 'sparkle', voice: 'confident', mood: [.7, .4]},
 shy: {label: 'Shy', kid: 'um, hi', face: {smile: .35, gazeY: -.6, gazeX: .5, lid: .6, blush: .9}, body: {tilt: .35, nod: -.3, shoulders: .7, chest: -.2}, arms: 'behind', emote: 'dots', voice: 'whispers', mood: [.3, -.2]},
 sleepy: {label: 'Sleepy', kid: 'so... tired', face: {lid: .22, browUp: -.1, jaw: .1}, body: {nod: -.4, tilt: .3, chest: -.5, bounce: 0}, arms: 'droop', emote: 'zzz', voice: 'sleepy', mood: [0, -.9]},
 determined: {label: 'Determined', kid: 'I can do this', face: {browUp: -.4, browIn: -.5, lid: .72, squint: .4, smile: .1, wide: .4}, body: {nod: -.15, chest: .7, lean: .4}, arms: 'fists', emote: 'bang', voice: 'determined', mood: [.4, .8]},
 mischief: {label: 'Mischief', kid: 'hee hee, watch this', face: {browUpL: .7, browUpR: -.4, squint: .5, smileL: .95, smileR: .35, gazeX: .4}, body: {tilt: -.3, lean: .2, shoulders: .4}, arms: 'rub', emote: 'sparkle', voice: 'mischievously', mood: [.5, .6]},
 love: {label: 'Love', kid: 'I love you, bub', face: {smile: .7, lid: .68, squint: .3, browIn: .4, browUp: .3, blush: .8, sparkle: .6}, body: {tilt: .35, chest: .3}, arms: 'hug', emote: 'heart', voice: 'warmly', mood: [.9, .2]},
 confused: {label: 'Confused', kid: 'wait, what?', face: {browUpL: .7, browUpR: -.4, browIn: .2, smileL: -.4, smileR: 0, pucker: .3, gazeY: .3}, body: {tilt: .5, shoulders: .6}, arms: 'shrug', emote: 'question', voice: 'confused', mood: [-.1, .3]},
};

// Words a script may use for the same feeling (also the common ElevenLabs tags), so lines read naturally.
export const SYNONYMS = {excited: 'joy', laughs: 'laugh', giggles: 'laugh', cheerful: 'happy', smiles: 'happy', angry: 'grumpy',
 annoyed: 'grumpy', scared: 'worried', nervous: 'worried', gasps: 'surprised', whoa: 'surprised', curiously: 'curious',
 wonder: 'curious', hmm: 'thinking', thoughtful: 'thinking', whispers: 'shy', sighs: 'sad', crying: 'sad', yawns: 'sleepy',
 tired: 'sleepy', warmly: 'love', proudly: 'proud', mischievously: 'mischief', disgusted: 'yuck', calm: 'neutral'};
export const resolve = name => EXPRESSIONS[name] ? name : SYNONYMS[name] || null;

// Mouth shapes for speech (the classic nine of hand-drawn lip sync, Preston Blair style, plus rest).
export const VISEMES = {
 rest: {jaw: 0, wide: 0, pucker: 0}, MBP: {jaw: 0, wide: 0, pucker: .1, press: 1}, AI: {jaw: .72, wide: .35},
 E: {jaw: .32, wide: .8}, O: {jaw: .55, pucker: .65}, U: {jaw: .18, pucker: 1}, FV: {jaw: .12, wide: .3, teeth: 1},
 L: {jaw: .42, wide: .2, tongue: 1}, etc: {jaw: .26, wide: .42, teeth: .6}, CH: {jaw: .2, wide: .1, pucker: .5, teeth: .8},
};
const DIGRAPH = {th: 'L', sh: 'CH', ch: 'CH', oo: 'U', ee: 'E', ea: 'E', ou: 'O', ow: 'O', ph: 'FV', qu: 'U', wh: 'U'};
const LETTER = {a: 'AI', i: 'AI', e: 'E', y: 'E', o: 'O', u: 'U', w: 'U', q: 'U', r: 'U', m: 'MBP', b: 'MBP', p: 'MBP',
 f: 'FV', v: 'FV', l: 'L', j: 'CH'};

// Text to timed mouth shapes. Times are seconds from the start of the text at `rate` 1 (about 14 letters a second).
// Each entry keeps its character index, so word-boundary events from a voice can pull the clock back into sync.
export function textToVisemes(text, rate = 1) {
 const out = []; let t = 0; const s = text.toLowerCase();
 for (let i = 0; i < s.length;) {
  const two = s.slice(i, i + 2), c = s[i];
  if (DIGRAPH[two]) { out.push({v: DIGRAPH[two], t, i}); t += .1 / rate; i += 2; continue; }
  if (/[a-z]/.test(c)) {
   const v = LETTER[c] || 'etc'; const prev = out[out.length - 1];
   if (prev && prev.v === v && v !== 'MBP') t += .04 / rate; else { out.push({v, t, i}); t += (/[aeiou]/.test(c) ? .09 : .062) / rate; }
  } else if (/[,;:]/.test(c)) { out.push({v: 'rest', t, i}); t += .2 / rate; }
  else if (/[.!?]/.test(c)) { out.push({v: 'rest', t, i}); t += .32 / rate; }
  else if (/\s/.test(c)) { t += .03 / rate; }
  i++;
 }
 out.push({v: 'rest', t, i: s.length});
 return {visemes: out, duration: t + .1};
}

// "[joy] Look, Daddy! [surprised:0.8] It's warm..." -> segments. A tag holds until the next one. With no tag, the
// punctuation suggests a feeling: "?" curious, "..." thinking, "!" lifts the current feeling.
export function parseLine(line, {auto = true} = {}) {
 const segs = []; let cur = null, intensity = 1;
 for (const part of line.split(/(\[[a-z]+(?::[0-9.]+)?\])/i)) {
  const m = part.match(/^\[([a-z]+)(?::([0-9.]+))?\]$/i);
  if (m) { cur = resolve(m[1].toLowerCase()) || cur; intensity = m[2] ? +m[2] : 1; continue; }
  if (!part.trim()) continue;
  let expr = cur, k = intensity;
  if (auto && !expr) expr = /\?\s*$/.test(part) ? 'curious' : /\.\.\.|…/.test(part) ? 'thinking' : null;
  if (auto && /!\s*$/.test(part)) k = Math.min(1.3, k + .2);
  segs.push({expr, intensity: k, text: part.trim()});
 }
 return segs;
}

// The same line written for the voice: each segment carries its expression's ElevenLabs v3 direction tag.
export function voiceText(line) {
 return parseLine(line).map(s => (s.expr && EXPRESSIONS[s.expr].voice ? `[${EXPRESSIONS[s.expr].voice}] ` : '') + s.text).join(' ');
}

// Expression name and intensity -> full channel map (sides expanded), with the arm pose and emote.
export function pose(name = 'neutral', intensity = 1) {
 const e = EXPRESSIONS[resolve(name) || 'neutral'], src = {...e.face, ...e.body}, out = {};
 for (const [k, rest] of Object.entries(REST)) {
  if (SIDED.includes(k)) {
   for (const s of ['L', 'R']) { const v = src[k + s] ?? src[k] ?? rest; out[k + s] = rest + (v - rest) * intensity; }
  } else { const v = src[k] ?? rest; out[k] = rest + (v - rest) * intensity; }
 }
 out.arms = e.arms; out.emote = e.emote; out.mood = e.mood; out.name = resolve(name) || 'neutral';
 return out;
}

// Push every channel away from rest by k: the far-camera trick (and the cartoon one). k 1 = as authored.
export function exaggerate(state, k) {
 if (k === 1) return state; const o = {...state};
 for (const [key, v] of Object.entries(state)) {
  if (typeof v !== 'number') continue; const base = key.replace(/[LR]$/, ''); const rest = REST[base] ?? REST[key];
  if (rest !== undefined && !BODY.has(base)) o[key] = rest + (v - rest) * k;
 }
 return o;
}

const ease = (cur, tgt, dt, rate) => cur + (tgt - cur) * (1 - Math.exp(-dt * rate));

// The live face. Layers, bottom to top: mood (what they feel), expression (what just happened, then back to mood),
// life (blinks, eye darts, breathing), speech (mouth shapes and the line's own tags). Call update(dt) every frame.
export class FaceDriver {
 constructor({mood = 'neutral', seed = 1} = {}) {
  this.mood = mood; this.moodK = 1; this.expr = null; this.exprK = 1; this.exprUntil = 0; this.t = 0;
  this.state = pose(mood); this.state.blink = 0; this.state.viseme = 'rest'; this.state.press = 0; this.state.teeth = 0; this.state.tongue = 0;
  this.nextBlink = 1.5; this.blinkT = -1; this.dart = {x: 0, y: 0}; this.nextDart = 1; this.look = null;
  this.speech = null; this.level = null; this.rnd = mulberry(seed);
 }
 setMood(name, k = 1) { this.mood = resolve(name) || 'neutral'; this.moodK = k; }
 // A momentary feeling. hold: seconds before it eases back to the mood (Infinity keeps it).
 set(name, {intensity = 1, hold = 2.5} = {}) {
  const n = resolve(name) || 'neutral'; if (n !== this.expr) this.blinkT = 0; // a blink sells the change of thought
  this.expr = n; this.exprK = intensity; this.exprUntil = this.t + hold;
 }
 lookAt(x, y) { this.look = x == null ? null : {x, y}; }
 setAudioLevel(v) { this.level = v; } // 0..1 from a live voice when there are no timestamps
 // Speak a tagged line. Returns the plan; `sync(charIndex)` lines the mouth up with a voice's word-boundary events.
 say(line, {rate = 1} = {}) {
  const segs = parseLine(line); let text = '', marks = [];
  for (const s of segs) { marks.push({i: text.length, expr: s.expr, k: s.intensity}); text += s.text + ' '; }
  const {visemes, duration} = textToVisemes(text, rate);
  for (const m of marks) { const v = visemes.find(v => v.i >= m.i) || visemes[visemes.length - 1]; m.t = Math.max(0, v.t - .15); }
  this.speech = {text, visemes, marks, duration, start: this.t, clock: 0, mark: -1, rate};
  return {text, duration, segments: segs};
 }
 sync(charIndex) {
  const sp = this.speech; if (!sp) return; const v = sp.visemes.find(v => v.i >= charIndex); if (v) sp.clock = v.t;
 }
 stop() { this.speech = null; }
 get speaking() { return !!this.speech; }

 update(dt) {
  this.t += dt; const S = this.state;
  // what they feel now
  if (this.expr && this.t > this.exprUntil) this.expr = null;
  const tgt = this.expr ? pose(this.expr, this.exprK) : pose(this.mood, this.moodK);
  // speech: advance the clock, apply the line's tags and pick the mouth shape
  let vis = null;
  if (this.speech) {
   const sp = this.speech; sp.clock += dt;
   while (sp.mark + 1 < sp.marks.length && sp.marks[sp.mark + 1].t <= sp.clock) {
    const m = sp.marks[++sp.mark]; if (m.expr) this.set(m.expr, {intensity: m.k, hold: Math.max(2, sp.duration - sp.clock + 1.2)});
   }
   let cur = sp.visemes[0]; for (const v of sp.visemes) { if (v.t <= sp.clock) cur = v; else break; }
   vis = VISEMES[cur.v]; S.viseme = cur.v;
   if (sp.clock > sp.duration) { this.speech = null; S.viseme = 'rest'; }
  } else if (this.level != null) {
   vis = {jaw: Math.min(1, this.level * 1.6), wide: .2, pucker: 0}; S.viseme = this.level > .05 ? 'etc' : 'rest';
  }
  // ease the face (fast) and body (slow) toward the target
  for (const k of Object.keys(tgt)) {
   if (typeof tgt[k] !== 'number') continue; const base = k.replace(/[LR]$/, '');
   S[k] = ease(S[k] ?? tgt[k], tgt[k], dt, BODY.has(base) ? 4 : 11);
  }
  S.arms = tgt.arms; S.emote = tgt.emote; S.mood = tgt.mood; S.name = tgt.name;
  // the mouth while talking: the feeling stays at the corners, the shapes do the rest
  const want = vis ? {jaw: tgt.jaw * .35 + vis.jaw, wide: tgt.wide * .5 + (vis.wide || 0), pucker: Math.max(vis.pucker || 0, tgt.pucker * .4)} : null;
  S.mouthJaw = ease(S.mouthJaw ?? S.jaw, want ? want.jaw : S.jaw, dt, 28);
  S.mouthWide = ease(S.mouthWide ?? S.wide, want ? want.wide : S.wide, dt, 28);
  S.mouthPucker = ease(S.mouthPucker ?? S.pucker, want ? want.pucker : S.pucker, dt, 28);
  S.press = ease(S.press, vis?.press || 0, dt, 30); S.teeth = ease(S.teeth, vis?.teeth || 0, dt, 25); S.tongue = ease(S.tongue, vis?.tongue || 0, dt, 25);
  // blinks: every 2-5 s, faster when worried, slow and heavy when sleepy
  this.nextBlink -= dt; if (this.nextBlink <= 0 && this.blinkT < 0) this.blinkT = 0;
  if (this.blinkT >= 0) {
   const len = S.name === 'sleepy' ? .5 : .16; this.blinkT += dt; const p = this.blinkT / len;
   S.blink = p < .4 ? p / .4 : Math.max(0, 1 - (p - .4) / .6);
   if (p >= 1) { this.blinkT = -1; S.blink = 0; this.nextBlink = (S.name === 'worried' ? 1 : 2) + this.rnd() * 3; }
  }
  // eye darts (saccades): tiny jumps that make eyes look alive, on top of where the feeling or a target looks
  this.nextDart -= dt; if (this.nextDart <= 0) { this.dart = {x: (this.rnd() - .5) * .25, y: (this.rnd() - .5) * .15}; this.nextDart = .6 + this.rnd() * 1.8; }
  const lx = this.look ? this.look.x : tgt.gazeX, ly = this.look ? this.look.y : tgt.gazeY;
  S.eyeX = ease(S.eyeX ?? 0, lx + this.dart.x, dt, 30); S.eyeY = ease(S.eyeY ?? 0, ly + this.dart.y, dt, 30);
  S.breath = Math.sin(this.t * 2 * Math.PI * .25); S.time = this.t;
  return S;
 }
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Texture swap: snap the smooth state onto a small sheet of drawn frames (eyes, brows, mouths), like the mouth
// charts of cut-out animation. Pops between frames instead of sliding; reads at a glance, cheap to paint.
const SNAP = {lid: [0, .45, .78, 1], squint: [0, .5, .9], browUp: [-.6, 0, .8], browIn: [-.8, 0, .9], smile: [-.6, 0, .7],
 mouthJaw: [0, .3, .65], mouthWide: [0, .5], mouthPucker: [0, .7], eyeX: [-.5, 0, .5], eyeY: [-.4, 0, .4]};
export function swapSheet(S) {
 const o = {...S}, near = (v, set) => set.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
 for (const [k, set] of Object.entries(SNAP)) {
  if (SIDED.includes(k)) { o[k + 'L'] = near(S[k + 'L'], set); o[k + 'R'] = near(S[k + 'R'], set); } else if (k in S) o[k] = near(S[k], set);
 }
 o.blink = S.blink > .5 ? 1 : 0; return o;
}

// The painted face. Coordinates: face centre (0,0), 1 unit = half the drawing width, y down. With head:false it draws
// only the features on a clear canvas (a texture laid on a 3D head); with head:true it draws a whole 2D toy head.
export function drawFace2D(ctx, S, {w = ctx.canvas.width, h = ctx.canvas.height, head = true, swap = false,
 skin = '#f2c6a0', ink = '#3b2a22', hair = '#6b4630', cheek = '#ff7f8f', iris = '#5a3b26', scale = 1} = {}) {
 const s = swap ? swapSheet(S) : S;
 ctx.save(); ctx.clearRect(0, 0, w, h); ctx.translate(w / 2, h / 2); const u = Math.min(w, h) / 2 * scale; ctx.scale(u, u);
 const lw = 1 / u;
 if (head) {
  ctx.save(); ctx.rotate((s.tilt || 0) * .25); ctx.translate((s.turn || 0) * .08, -(s.nod || 0) * .05);
  ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(0, -.12, .86, .84, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, .05, .8, .82, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-.8, .1, .12, .17, 0, 0, Math.PI * 2); ctx.ellipse(.8, .1, .12, .17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.moveTo(-.82, -.1); ctx.quadraticCurveTo(-.5, -.55, .1, -.5);
  ctx.quadraticCurveTo(.5, -.62, .82, -.1); ctx.quadraticCurveTo(.7, -.85, 0, -.86); ctx.quadraticCurveTo(-.7, -.85, -.82, -.1); ctx.fill();
 }
 // cheeks
 if (s.blush > .02) {
  ctx.fillStyle = cheek; ctx.globalAlpha = Math.min(1, s.blush) * .55;
  for (const x of [-.48, .48]) { ctx.beginPath(); ctx.ellipse(x, .26, .15, .09, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
 }
 // eyes: white, iris that follows the gaze, upper lid down by lid and blink, lower lid up by squint
 for (const side of [-1, 1]) {
  const L = side < 0 ? 'R' : 'L'; // the character's right eye is on the viewer's left
  const cx = side * .34, cy = -.06, r = .15;
  const open = (s['lid' + L] ?? s.lid) * (1 - (s.blink || 0)), sq = s['squint' + L] ?? s.squint ?? 0, brIn = s['browIn' + L] ?? 0;
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, r * .86, r, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#fbf8f2'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  const ex = cx + (s.eyeX ?? s.gazeX ?? 0) * .07, ey = cy - (s.eyeY ?? s.gazeY ?? 0) * .07, pr = .085 * (s.pupil ?? 1) ** .5;
  ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(ex, ey, .095, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#16100c'; ctx.beginPath(); ctx.arc(ex, ey, pr * .62, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + .03, ey - .035, .022 + (s.sparkle || 0) * .02, 0, Math.PI * 2); ctx.fill();
  if (s.sparkle > .1) { ctx.globalAlpha = s.sparkle; ctx.beginPath(); ctx.arc(ex - .035, ey + .03, .014, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  // lids are skin, slanted by the inner brow (worry slopes them down outward, cross slopes them in)
  const top = cy - r + (1 - Math.min(1, open)) * r * 2.05, slant = brIn * .06 * side;
  ctx.fillStyle = head ? skin : skin;
  ctx.beginPath(); ctx.moveTo(cx - r, cy - r - .1); ctx.lineTo(cx + r, cy - r - .1); ctx.lineTo(cx + r, top - slant); ctx.lineTo(cx - r, top + slant); ctx.fill();
  const bot = cy + r - sq * r * 1.25;
  ctx.beginPath(); ctx.moveTo(cx - r, cy + r + .1); ctx.lineTo(cx + r, cy + r + .1); ctx.lineTo(cx + r, bot); ctx.quadraticCurveTo(cx, bot - sq * .08, cx - r, bot); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = ink; ctx.lineWidth = .028; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - r * .95, top + slant * .9); ctx.quadraticCurveTo(cx, top - .02, cx + r * .95, top - slant * .9); ctx.stroke();
  // brows: bone-like bars that rise, fall and tilt
  const bu = s['browUp' + L] ?? 0, inner = cx - side * .13, outer = cx + side * .17, by = -.33;
  const yIn = by - bu * .09 - brIn * .08, yOut = by - bu * .1 + brIn * .035;
  ctx.strokeStyle = hair; ctx.lineWidth = .07; ctx.beginPath(); ctx.moveTo(inner, yIn); ctx.quadraticCurveTo(cx, Math.min(yIn, yOut) - .04, outer, yOut); ctx.stroke();
 }
 // tear and sweat (decals)
 if (s.tear > .05) {
  const y = .1 + ((s.time || 0) * .35 % .45); ctx.fillStyle = '#7cc4f2'; ctx.globalAlpha = Math.min(1, s.tear);
  drop(ctx, -.4, y, .05); drop(ctx, .42, .1 + (((s.time || 0) * .35 + .2) % .45), .045); ctx.globalAlpha = 1;
 }
 if (s.sweat > .05) { ctx.fillStyle = '#9fd6f7'; ctx.globalAlpha = Math.min(1, s.sweat); drop(ctx, .62, -.42 + Math.sin((s.time || 0) * 3) * .015, .06); ctx.globalAlpha = 1; }
 // nose
 ctx.strokeStyle = ink; ctx.globalAlpha = .45; ctx.lineWidth = .03; ctx.beginPath(); ctx.moveTo(-.04, .16); ctx.quadraticCurveTo(0, .2, .04, .16); ctx.stroke(); ctx.globalAlpha = 1;
 // mouth: corners from the smile, opening from jaw, width from wide, rounding from pucker
 const jaw = s.mouthJaw ?? s.jaw ?? 0, wide = s.mouthWide ?? s.wide ?? 0, puck = s.mouthPucker ?? s.pucker ?? 0;
 const press = s.press || 0, my = .42, hw = .2 * (1 + .45 * wide - .55 * puck);
 const cL = -(s.smileR ?? 0) * .085, cR = -(s.smileL ?? 0) * .085; // viewer's left corner is the character's right
 const open = Math.max(0, jaw * (1 - press)) * .3, upY = my - .01 - puck * .02 + ((s.smileL ?? 0) + (s.smileR ?? 0)) * .012;
 const loY = my + .02 + open + puck * .03 + Math.max(0, ((s.smileL ?? 0) + (s.smileR ?? 0)) / 2) * open * .4;
 ctx.beginPath(); ctx.moveTo(-hw, my + cL);
 ctx.bezierCurveTo(-hw * .5, upY - puck * .03, hw * .5, upY - puck * .03, hw, my + cR);
 ctx.bezierCurveTo(hw * .6, loY + puck * .02, -hw * .6, loY + puck * .02, -hw, my + cL); ctx.closePath();
 if (open > .02 || puck > .3) {
  ctx.fillStyle = '#5a1f22'; ctx.fill();
  ctx.save(); ctx.clip();
  if (s.teeth > .1 || open > .08) { ctx.fillStyle = '#fbf6ee'; ctx.fillRect(-hw, upY - .05, hw * 2, .035 + (s.teeth || 0) * .015); }
  ctx.fillStyle = '#e46c7a'; ctx.beginPath(); ctx.ellipse(0, loY + .01 - (s.tongue || 0) * .05, hw * .55, .06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
 }
 ctx.strokeStyle = ink; ctx.lineWidth = .032; ctx.lineJoin = 'round'; ctx.stroke();
 if (head) ctx.restore();
 ctx.restore();
}
function drop(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.quadraticCurveTo(x + r, y - r * .2, x + r, y + r * .2); ctx.arc(x, y + r * .2, r, 0, Math.PI); ctx.quadraticCurveTo(x - r, y - r * .2, x, y - r * 1.6); ctx.fill(); }

// The spatial bubble for faces too small to read (draw into a canvas; the page puts it on the presentation layer).
export const EMOTE_GLYPHS = {note: '♪', sparkle: '✦', drop: '💧', cloud: '☁', bang: '!', squiggle: '〰', question: '?', dots: '…', zzz: 'z z', heart: '♥'};
export function drawEmote(ctx, emote, {w = ctx.canvas.width, h = ctx.canvas.height, tint = '#fff'} = {}) {
 ctx.clearRect(0, 0, w, h); if (!emote) return;
 ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = 'rgba(40,30,25,.25)'; ctx.lineWidth = w * .02;
 ctx.beginPath(); ctx.ellipse(w / 2, h * .44, w * .4, h * .34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
 ctx.beginPath(); ctx.moveTo(w * .44, h * .74); ctx.lineTo(w * .5, h * .92); ctx.lineTo(w * .58, h * .72); ctx.fill();
 const col = {heart: '#e8466a', drop: '#3f9fe0', bang: '#e2702b', question: '#6a55d8', sparkle: '#e0a521', note: '#2f9e6a', cloud: '#7a7a8a', zzz: '#5a72c8', dots: '#6b6862', squiggle: '#7ba23a'}[emote] || '#333';
 ctx.fillStyle = col; ctx.font = `800 ${h * .42}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
 ctx.fillText(EMOTE_GLYPHS[emote] || '', w / 2, h * .46); ctx.restore(); void tint;
}
