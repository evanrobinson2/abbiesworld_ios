#!/usr/bin/env node
// Build every picked take (picks.json, from pick.mjs) into a game-ready sound.
//   node build.mjs [--only slot,slot] [--out out] [--picks picks.json] [--index index/]
// For each take it pulls just those seconds out of the Sonniss bundle (offsets from index/, HTTP ranges),
// then ffmpeg cuts, fades (or crossfades a loop seam), levels to the slot's loudness target (EBU R128,
// true peak -1 dB) and encodes MP3. Writes out/<id>.mp3 and out/rows.json with the measurements
// (length, LUFS, peak, waveform). store.mjs puts them in R2 and the database.
// Needs ffmpeg and network access to downloads.sonniss.com (a GitHub runner; not the cloud box).
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { partRef } from './bundles.mjs';
import { listZip } from './remote-zip.mjs';
import { sliceWav } from './wav.mjs';
import { soundRow, takeId } from './catalog.mjs';
import { LIBRARY } from './library.mjs';

const run = promisify(execFile);
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = opt('--only')?.split(',');
const here = new URL('./', import.meta.url);
const OUT = pathToFileURL(path.resolve(opt('--out') || new URL('out', here).pathname) + '/');
const INDEX = opt('--index') ? pathToFileURL(path.resolve(opt('--index')) + '/') : new URL('index/', here);
mkdirSync(new URL('src/', OUT), { recursive: true });

const { picks } = JSON.parse(readFileSync(opt('--picks') || new URL('picks.json', here), 'utf8'));
const indexes = {}, listings = {};
const indexOf = id => indexes[id] ??= existsSync(new URL(`${id}.json`, INDEX)) ? JSON.parse(readFileSync(new URL(`${id}.json`, INDEX), 'utf8')) : null;

async function locate(take) {
  const { bundle, part, urls } = partRef(take.ref);
  const p = indexOf(bundle.id)?.parts?.[part];
  const hit = p?.entries.find(e => e[0] === take.path);
  if (hit) return { urls: [p.url, ...urls.filter(u => u !== p.url)], entry: { name: hit[0], size: hit[1], method: hit[2], offset: hit[3], csize: hit[4] } };
  for (const url of urls) {
    try { listings[url] ??= await listZip(url); const e = listings[url].entries.find(x => x.name === take.path); if (e) return { urls: [url], entry: e }; } catch {}
  }
  throw new Error(`${take.ref}: ${take.path} not found`);
}

const ff = a => run('ffmpeg', ['-hide_banner', '-nostdin', '-y', '-loglevel', 'error', ...a], { maxBuffer: 1 << 28 });
const probe = async file => JSON.parse((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=channels,sample_rate', '-of', 'json', file])).stdout);
// loudnorm prints its measurement as JSON on stderr.
async function loudness(file) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-af', 'loudnorm=I=-16:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const m = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/s);
  if (!m) throw new Error(`no loudness reading for ${file}`);
  return JSON.parse(m[0]);
}
async function peaks(file, n = 240) {
  const { stdout: raw } = await run('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28, encoding: 'buffer' });
  const d = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4)), step = Math.max(1, Math.floor(d.length / n)), out = [];
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step, e = Math.min(d.length, j + step); j < e; j++) m = Math.max(m, Math.abs(d[j])); out.push(m); }
  const top = Math.max(...out, 1e-6);
  return out.map(v => +(v / top).toFixed(3));
}

const TARGET = { ambience: -23, ui: -20, music: -18, animal: -18, effect: -18 };

async function buildTake(slot, pick, take, k) {
  const id = takeId(slot, k), cue = { ...slot, id, name: slot.n > 1 ? `${slot.name} ${k + 1}` : slot.name };
  const { urls, entry } = await locate(take);
  const fade = take.fade ?? (slot.loop ? 2 : 0.01);
  const [a, b] = take.trim;
  // Pull only the seconds we use (plus the loop crossfade tail); compressed or non-WAV entries come whole.
  let got = null;
  for (const url of urls) { try { got = await sliceWav(url, entry, a, b + (slot.loop ? fade : 0)); break; } catch (e) { console.log(`  ${id} via ${new URL(url).host}: ${e.message}`); } }
  if (!got) throw new Error('could not download');
  const ext = got.cut ? '.wav' : (take.path.match(/\.[a-z0-9]+$/i)?.[0] || '.wav').toLowerCase();
  const src = new URL(`src/${id}${ext}`, OUT).pathname, mid = new URL(`src/${id}.cut.wav`, OUT).pathname, mp3 = new URL(`${id}.mp3`, OUT).pathname;
  writeFileSync(src, got.body);
  const sourceSha256 = createHash('sha256').update(got.body).digest('hex');
  const s0 = got.cut ? 0 : a, len = Math.max(0.05, b - a), target = TARGET[slot.kind] ?? -18;
  const chain = ['aresample=44100', ...(slot.loop ? [] : ['aformat=channel_layouts=mono'])].join(',');
  // Loop: the fade seconds after the cut, fading out, are laid over the head, fading in, so the end runs into the start.
  if (slot.loop) await ff(['-ss', `${s0}`, '-t', `${len}`, '-i', src, '-ss', `${s0 + len}`, '-t', `${fade}`, '-i', src, '-filter_complex',
    `[0:a]${chain},afade=t=in:d=${fade}[b];[1:a]${chain},afade=t=out:d=${fade}[t];[b][t]amix=inputs=2:duration=first:normalize=0[c]`, '-map', '[c]', '-c:a', 'pcm_f32le', mid]);
  else { const f = Math.min(fade, len / 4); await ff(['-ss', `${s0}`, '-t', `${len}`, '-i', src, '-af', `${chain},afade=t=in:d=${Math.min(0.005, f)},afade=t=out:st=${Math.max(0, len - f)}:d=${f}`, '-c:a', 'pcm_f32le', mid]); }
  const m = await loudness(mid);
  const silent = !Number.isFinite(+m.input_i) || +m.input_i < -70;
  const norm = silent ? 'anull' : `loudnorm=I=${target}:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=44100`;
  await ff(['-i', mid, '-af', norm, '-c:a', 'libmp3lame', '-q:a', slot.loop ? '5' : '3', '-id3v2_version', '0', '-write_xing', '1', mp3]);
  const [after, out] = await Promise.all([loudness(mp3), probe(mp3)]), bytes = readFileSync(mp3);
  const measured = { duration: +(+out.format.duration).toFixed(2), lufs: +(+after.input_i).toFixed(1), peak: +(+after.input_tp).toFixed(1), channels: out.streams[0].channels, peaks: await peaks(mp3), target };
  rmSync(src, { force: true }); rmSync(mid, { force: true });
  const row = soundRow({ cue, pick, take, measured, urls: {}, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, sourceSha256 });
  console.log(`${id}: ${measured.duration}s ${measured.lufs} LUFS (target ${target}), ${(bytes.length / 1024).toFixed(0)} KB, ${(got.body.length / 1e6).toFixed(1)} MB fetched of ${(entry.size / 1e6).toFixed(1)} MB ${take.path.split('/').pop()}`);
  return { file: `${id}.mp3`, row };
}

const jobs = LIBRARY.filter(s => (!only || only.includes(s.id)) && picks[s.id]?.takes?.length).flatMap(s => picks[s.id].takes.map((t, k) => [s, picks[s.id], t, k]));
const rows = [], failures = [];
let i = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (i < jobs.length) {
    const job = jobs[i++];
    try { rows.push(await buildTake(...job)); }
    catch (e) { failures.push(takeId(job[0], job[3])); console.log(`::warning::${takeId(job[0], job[3])}: ${e.message}`); }
  }
}));
writeFileSync(new URL('rows.json', OUT), JSON.stringify(rows));
console.log(`${rows.length} sounds built from ${new Set(jobs.map(j => j[0].id)).size} slots${failures.length ? `, ${failures.length} failed: ${failures.join(', ')}` : ''}`);
if (!rows.length) process.exit(1);
