#!/usr/bin/env node
// The sound engineer's ear: fill every library slot (library.mjs) with the best takes in the Sonniss index.
//   node pick.mjs [--only id,id] [--keep]     writes picks.json (--keep leaves slots already picked alone)
// For each slot: rank files by how well their names match the slot, read the WAV headers of the best few
// (one small range request each) for length and quality, then download the start of the winner and find
// where the sound actually is (silence detection), so a one-shot is one clean take and a multi-take file
// gives several variants. Every decision, with the runners-up and why, goes into picks.json.
// Needs ffmpeg and network access to downloads.sonniss.com (a GitHub runner).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LIBRARY } from './library.mjs';
import { partRef } from './bundles.mjs';
import { wavInfo, sliceWav } from './wav.mjs';
import { rank } from './catalog.mjs';

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = opt('--only')?.split(',');
const here = new URL('./', import.meta.url);
const OUT = opt('--picks') ? path.resolve(opt('--picks')) : new URL('picks.json', here);
const INDEX = opt('--index') ? path.resolve(opt('--index')) + '/' : new URL('index/', here).pathname;
const tmp = mkdtempSync(path.join(tmpdir(), 'pick-'));

const docs = readdirSync(INDEX).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(INDEX + f, 'utf8')));
if (!docs.length) { console.error('No index: run index.mjs first'); process.exit(1); }
console.log(`${docs.reduce((n, d) => n + d.count, 0)} sounds indexed in ${docs.length} bundles`);
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { picks: {} };
const used = new Set(Object.values(old.picks).flatMap(p => p.takes.map(t => t.path)));

const entryOf = c => ({ name: c.path, size: c.bytes, method: c.method, offset: c.offset, csize: c.csize });
const urlOf = c => docs.find(d => d.bundle === c.bundle).parts[c.part].url;

// Non-silent stretches of a file: [[start, end], ...] in seconds, relative to the loudest moment.
function events(file) {
  const vol = execFileSync('sh', ['-c', 'ffmpeg -hide_banner -nostdin -i "$1" -af volumedetect -f null - 2>&1', 'sh', file], { encoding: 'utf8' });
  const max = Number(vol.match(/max_volume:\s*(-?[\d.]+)/)?.[1] ?? -20);
  const floor = Math.max(-70, max - 32);
  const sd = execFileSync('sh', ['-c', 'ffmpeg -hide_banner -nostdin -i "$1" -af "silencedetect=noise=$2dB:d=0.15" -f null - 2>&1', 'sh', file, String(floor)], { encoding: 'utf8' });
  const dur = Number(JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', file]).toString()).format.duration);
  const out = []; let start = 0;
  for (const m of sd.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const t = Math.max(0, Number(m[2]));
    if (m[1] === 'start') { if (t - start > 0.04) out.push([start, t]); start = null; } else start = t;
  }
  if (start != null && dur - start > 0.04) out.push([start, dur]);
  return out;
}

async function pickSlot(slot) {
  const ranked = rank(docs, slot, { used, limit: 8 });
  const probed = [];
  for (const c of ranked.slice(0, 6)) {
    try { c.info = await wavInfo(urlOf(c), entryOf(c)); } catch (e) { c.info = null; c.err = e.message; }
    if (c.info) probed.push(c);
  }
  // Prefer files long enough for the job and at least CD quality; ambiences need a long stretch to loop.
  const fit = c => {
    const d = c.info.duration;
    let s = c.score;
    if (slot.loop) s += d >= slot.len + 12 ? 4 : d >= 20 ? 1 : -8;
    else s += d < 0.08 ? -20 : d <= 60 ? 1 : -2;
    if (c.info.rate < 44100) s -= 3;
    return s;
  };
  probed.sort((a, b) => fit(b) - fit(a));
  const candidates = ranked.map(c => ({ ref: `${c.bundle}/${c.part}`, path: c.path, title: c.title, publisher: c.publisher, category: c.category,
    score: +c.score.toFixed(1), duration: c.info ? +c.info.duration.toFixed(2) : null, why: c.why }));
  const takes = [];
  for (const c of probed) {
    if (takes.length >= slot.n) break;
    const d = c.info.duration, ref = `${c.bundle}/${c.part}`;
    if (slot.loop) {
      const fade = 2, start = Math.min(15, d * 0.1), len = Math.min(slot.len, d - start - fade);
      if (len < 8) continue;
      takes.push({ ref, path: c.path, trim: [+start.toFixed(2), +(start + len).toFixed(2)], fade, duration: +d.toFixed(2) });
      continue;
    }
    // One-shots: look at the first 20 s and keep up to n clean takes from it.
    const head = Math.min(d, 20);
    const file = path.join(tmp, 'head.wav');
    writeFileSync(file, (await sliceWav(urlOf(c), entryOf(c), 0, head, c.info)).body);
    for (const [a, b] of events(file)) {
      if (takes.length >= slot.n) break;
      if (b - a < 0.05) continue;
      const s = Math.max(0, a - 0.02), e = Math.min(head, Math.min(b + 0.08, s + slot.len));
      takes.push({ ref, path: c.path, trim: [+s.toFixed(3), +e.toFixed(3)], fade: e < b ? 0.12 : 0.01, duration: +d.toFixed(2), cutShort: e < b || undefined });
    }
  }
  for (const t of takes) used.add(t.path);
  const notes = takes.length ? [
    `Picked from ${candidates.length} matching files; best name match with ${slot.loop ? 'a long enough stretch to loop' : 'a clean take'}.`,
    ...(new Set(takes.map(t => t.path)).size < takes.length ? ['The variants are separate takes from one recording, so they sound like a set.'] : []),
  ] : ['Nothing suitable in the index yet.'];
  return { slot: slot.id, takes, candidates, notes, date: new Date().toISOString().slice(0, 10) };
}

const slots = LIBRARY.filter(s => (!only || only.includes(s.id)) && !(args.includes('--keep') && old.picks[s.id]?.takes.length));
const picks = { ...old.picks };
let i = 0, done = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < slots.length) {
    const slot = slots[i++];
    try { picks[slot.id] = await pickSlot(slot); }
    catch (e) { console.log(`::warning::${slot.id}: ${e.message}`); }
    const p = picks[slot.id];
    console.log(`[${++done}/${slots.length}] ${slot.id}: ${p?.takes.length || 0}/${slot.n} take(s)${p?.takes[0] ? ' from ' + p.takes[0].path.split('/').pop() : ''}`);
  }
}));
rmSync(tmp, { recursive: true, force: true });
const filled = Object.values(picks).filter(p => p.takes.length).length;
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), slots: LIBRARY.length, filled, picks }, null, 1));
console.log(`picks.json: ${filled} of ${LIBRARY.length} slots filled, ${Object.values(picks).reduce((n, p) => n + p.takes.length, 0)} takes`);
