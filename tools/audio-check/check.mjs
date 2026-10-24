// Three invariants (Evan, 2026-10-24): no MIDI, no synthesized sound, and every voice from ElevenLabs (designed voices, never
// cloned; no browser speechSynthesis or other TTS).
// No MIDI, no synthesized sound: "only sounds from the glorious database we have".
// Every sound in the game comes from the sound catalogue (prototypes/ranch-atelier/dist/sounds/manifest.json: the Sonniss
// takes in R2 and the music catalogue). Nothing is built from oscillators, and no .mid file ships.
//   node tools/audio-check/check.mjs            fails on: a .mid/.midi file in the game; an oscillator in a file the baseline
//                                               doesn't list; more oscillators in a listed file than the baseline allows; a
//                                               SAMPLES/SOUNDS id list naming a sound that isn't in the catalogue.
//   node tools/audio-check/check.mjs --write    rewrite baseline.json from today's code (an audit, never to hide new debt)
// baseline.json is the audit of synthesized audio still in the game: each file needs replacing with catalogue sounds, and the
// numbers may only go down. Lower a file's count (or delete it) in the PR that replaces its sound.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'prototypes/ranch-atelier/dist';
const BASE = 'tools/audio-check/baseline.json';
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? (/node_modules|vendor|^\./.test(e.name) ? [] : walk(p)) : [p];
});
const files = walk(DIST);
const errors = [];

for (const f of files) if (/\.midi?$/i.test(f)) errors.push(`${f}: a MIDI file in the game. Use a recorded or produced track from the music catalogue.`);

const SYNTH = /createOscillator\s*\(|new\s+OscillatorNode\b|createPeriodicWave\s*\(|\.noteOn\s*\(/g;
const VOICE = /new\s+SpeechSynthesisUtterance\b|speechSynthesis\??\.speak\s*\(|\bResponsiveVoice\b|\.speak\(\s*new\s+SpeechSynthesisUtterance/g;
const counts = {}, voices = {};
for (const f of files.filter(f => /\.(m?js|html)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  const n = (src.match(SYNTH) || []).length, v = (src.match(VOICE) || []).length;
  if (n) counts[f] = n;
  if (v) voices[f] = v;
}
if (process.argv.includes('--write')) {
  const old = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : {};
  const out = {about: old.about || '', files: Object.fromEntries(Object.entries(counts).map(([f, n]) => [f, {oscillators: n, owner: old.files?.[f]?.owner || '', replaceWith: old.files?.[f]?.replaceWith || ''}])),
    browserVoice: Object.fromEntries(Object.entries(voices).map(([f, n]) => [f, {calls: n, owner: old.browserVoice?.[f]?.owner || '', replaceWith: old.browserVoice?.[f]?.replaceWith || ''}]))};
  fs.writeFileSync(BASE, JSON.stringify(out, null, 1) + '\n'); console.log(`wrote ${BASE}: ${Object.keys(counts).length} files`); process.exit(0);
}
const base = JSON.parse(fs.readFileSync(BASE, 'utf8')).files;
for (const [f, n] of Object.entries(counts)) {
  if (!base[f]) errors.push(`${f}: ${n} synthesized sound(s) (oscillators) in a file the audit doesn't list. Pick the sound from the catalogue (sounds/manifest.json).`);
  else if (n > base[f].oscillators) errors.push(`${f}: ${n} oscillators, the audit allows ${base[f].oscillators}. Synthesized audio may only go down.`);
}

const baseVoice = JSON.parse(fs.readFileSync(BASE, 'utf8')).browserVoice || {};
for (const [f, n] of Object.entries(voices)) {
  if (!baseVoice[f]) errors.push(`${f}: browser speech synthesis. Every voice comes from ElevenLabs: a designed voice, pre-rendered with the voice-cast workflow (tools/voice-cast/cast.json) or streamed through api/live-voice.js.`);
  else if (n > baseVoice[f].calls) errors.push(`${f}: ${n} speechSynthesis calls, the audit allows ${baseVoice[f].calls}. Browser TTS may only go down.`);
}

// sound ids named in SAMPLES / SOUNDS lists must resolve in the catalogue
const manifest = JSON.parse(fs.readFileSync(`${DIST}/sounds/manifest.json`, 'utf8'));
const known = new Set(manifest.sounds.map(s => s.id));
for (const f of files.filter(f => /\.(m?js|html)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\b(?:const|let)\s+(?:SAMPLES|SOUND_IDS|SFX)\s*=\s*\[([^\]]*)\]/g)) {
    for (const id of m[1].match(/['"][^'"]+['"]/g) || []) if (!known.has(id.slice(1, -1))) errors.push(`${f}: sound id ${id} is not in the sound catalogue.`);
  }
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`audio check: ${Object.keys(counts).length} files still synthesize sound (${total} oscillators), all in the audit`);
if (errors.length) { console.error('\nFAILED:\n' + errors.map(m => ' - ' + m).join('\n')); process.exit(1); }
console.log(`voice check: ${Object.keys(voices).length} files still use browser speech, all in the audit`);
console.log('ok');
