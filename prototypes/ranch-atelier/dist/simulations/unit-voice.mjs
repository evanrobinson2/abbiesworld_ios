// Every unit's voice and sounds, changeable per unit (Evan 2026-10-23 13:20Z: "allow that to be something that we could
// potentially change in game on a per unit basis - like what sound pack drives it and if it talks what voice/model").
// A unit's profile = its kind's default <- its cast entry (tools/voice-cast/cast.json, served at
// /studies/family-cast/cast.json) <- the player's override for that one unit. Presentation-free: the game reads
// resolve(unitId) and plays it; any picker UI (developer mode, the workbench) writes with set(unitId, patch).
// Sounds are slots of the sound store (sounds/manifest.json); speech is a saved ElevenLabs voice spoken live
// (api/live-voice.js style, eleven_flash_v2_5) or pre-rendered by the voice-cast workflow.

export const VOICE_MODELS = [
 { id: 'eleven_flash_v2_5', name: 'Live (fastest)', live: true },
 { id: 'eleven_multilingual_v2', name: 'Storybook (richer)', live: false },
 { id: 'eleven_v3', name: 'Acting (most expressive)', live: false }
];

// A pack names the sound-store slots a unit uses for each moment. Unknown slots are simply silent.
export const SOUND_PACKS = {
 kid:        { name: 'Kid',          vocal: ['kids-laugh', 'gasp'], happy: ['kids-laugh'], step: 'step-grass', effort: ['gasp'] },
 grownup:    { name: 'Grown-up',     vocal: ['cough', 'hum-tune'], happy: ['clap'], step: 'step-concrete', effort: ['cough'] },
 'black-lab':{ name: 'Black lab',    vocal: ['dog-bark', 'dog-whine'], happy: ['dog-bark'], step: 'step-grass', effort: ['dog-whine'] },
 farm:       { name: 'Farm animal',  vocal: ['cow', 'goat', 'sheep'], happy: ['cow'], step: 'step-dirt', effort: [] },
 robot:      { name: 'Robot',        vocal: ['robot', 'beep'], happy: ['power-up'], step: 'step-metal', effort: ['power-down'] },
 cartoon:    { name: 'Cartoon',      vocal: ['boing', 'wobble'], happy: ['tada'], step: 'step-carpet', effort: ['bonk'] },
 magic:      { name: 'Magic',        vocal: ['fairy', 'magic-chime'], happy: ['sparkle'], step: 'step-grass', effort: ['magic-whoosh'] },
 silent:     { name: 'Silent',       vocal: [], happy: [], step: null, effort: [] }
};

const KIND_DEFAULTS = {
 kid:     { speaks: true,  soundPack: 'kid',       model: 'eleven_flash_v2_5' },
 grownup: { speaks: true,  soundPack: 'grownup',   model: 'eleven_flash_v2_5' },
 dog:     { speaks: false, soundPack: 'black-lab', model: null },
 animal:  { speaks: false, soundPack: 'farm',      model: null },
 thing:   { speaks: false, soundPack: 'silent',    model: null }
};

const STORE_KEY = 'aw-unit-voice-v1';
const ID = /^[A-Za-z0-9]{8,40}$/;

function kindOf(entry) {
 const L = entry?.looks || {};
 if (L.breed) return 'dog';
 const age = +L.age;
 return Number.isFinite(age) && age < 18 ? 'kid' : 'grownup';
}

function readOverrides(storage) {
 try { return JSON.parse(storage?.getItem(STORE_KEY) || '{}') || {}; } catch { return {}; }
}

export function createUnitVoices({ cast = null, storage = globalThis.localStorage, extraVoices = [] } = {}) {
 const byId = new Map((cast?.characters || []).map(c => [c.id, c]));
 let overrides = readOverrides(storage);

 // Voices a picker may offer: every saved cast voice, plus any stock voices the caller passes (e.g. ELEVEN_VOICES).
 function voices() {
  const out = Object.entries(cast?.voices || {}).map(([cid, id]) => ({ id, name: byId.get(cid)?.name || cid, from: 'cast' }));
  for (const v of extraVoices) if (!out.some(o => o.id === v.id)) out.push({ ...v, from: 'stock' });
  return out;
 }

 function resolve(unitId, kind) {
  const entry = byId.get(unitId);
  const k = kind || (entry ? kindOf(entry) : 'thing');
  const base = { ...(KIND_DEFAULTS[k] || KIND_DEFAULTS.thing) };
  if (entry) {
   const p = entry.profile || {};
   Object.assign(base, p);
   if (cast?.voices?.[unitId]) base.voiceId = cast.voices[unitId];
   if (!entry.descriptions?.length && !p.speaks) base.speaks = false;
  }
  const o = overrides[unitId] || {};
  const out = { unitId, kind: k, ...base, ...o };
  if (!SOUND_PACKS[out.soundPack]) out.soundPack = base.soundPack in SOUND_PACKS ? base.soundPack : 'silent';
  if (out.model && !VOICE_MODELS.some(m => m.id === out.model)) out.model = base.model;
  if (out.voiceId && !ID.test(out.voiceId)) out.voiceId = base.voiceId;
  out.sounds = SOUND_PACKS[out.soundPack];
  out.overridden = Object.keys(o);
  return out;
 }

 // patch: { speaks?, voiceId?, model?, soundPack? }; null clears that field back to the default.
 function set(unitId, patch) {
  const cur = { ...(overrides[unitId] || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
   if (!['speaks', 'voiceId', 'model', 'soundPack'].includes(k)) continue;
   if (v === null || v === undefined) delete cur[k]; else cur[k] = v;
  }
  overrides = { ...overrides, [unitId]: cur };
  if (!Object.keys(cur).length) delete overrides[unitId];
  try { storage?.setItem(STORE_KEY, JSON.stringify(overrides)); } catch {}
  return resolve(unitId);
 }

 function reset(unitId) { return set(unitId, { speaks: null, voiceId: null, model: null, soundPack: null }); }

 return { resolve, set, reset, voices, packs: SOUND_PACKS, models: VOICE_MODELS, overrides: () => ({ ...overrides }) };
}

export async function loadUnitVoices(opts = {}) {
 let cast = null;
 try { const r = await fetch(opts.url || '/studies/family-cast/cast.json'); if (r.ok) cast = await r.json(); } catch {}
 return createUnitVoices({ ...opts, cast });
}
