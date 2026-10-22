import test from 'node:test';
import assert from 'node:assert/strict';
import { describe, scoreEntry, rank, takeId, blobKey, soundRow, publicCatalog } from './catalog.mjs';
import { LIBRARY, parseLibrary } from './library.mjs';
import { parseWav } from './wav.mjs';
import { partRef, allParts } from './bundles.mjs';
import { ranchSoundRules } from '../../prototypes/ranch-atelier/dist/simulations/ranch-sound.mjs';

test('UCS names give category and title; older names fall back to words', () => {
  assert.deepEqual(describe('Root/Pole Position - Farm/AMBFarm_Morning Roosters_PPP_F.wav'), { publisher: 'Pole Position', library: 'Pole Position - Farm', category: 'Ambience', ucs: 'AMBFarm', title: 'Morning Roosters' });
  assert.equal(describe('GDC 2016/Lib/Rooster crowing 01.wav').category, 'Birds');
});

test('library: every slot has terms, ids are unique, ambiences loop', () => {
  const ids = LIBRARY.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert(LIBRARY.length > 300);
  for (const s of LIBRARY) assert(s.terms.length && s.group && s.kind, s.id);
  assert(LIBRARY.filter(s => s.kind === 'ambience').every(s => s.loop));
  const [x] = parseLibrary('## Test | animal\nhen | Hen | hen cluck, hen | n=2 cat=Birds');
  assert.deepEqual([x.n, x.cats, x.terms], [2, ['Birds'], [['hen', 'cluck'], ['hen']]]);
});

test('scoring: whole words, file name beats folder, exclusions rule out', () => {
  const hen = LIBRARY.find(s => s.id === 'hen');
  assert.equal(scoreEntry(hen, 'X/Lib/Kitchen Ambience.wav'), null);
  assert(scoreEntry(hen, 'X/Farm/BIRDChkn_Hen Clucking_A_B.wav', { category: 'Birds' }).score > scoreEntry(hen, 'X/Hens/take 01.wav').score);
  assert.equal(scoreEntry(LIBRARY.find(s => s.id === 'step-grass'), 'X/FEETGras_Footsteps Grass Gunshot.wav'), null);
  const docs = [{ bundle: 'gdc2024', year: 2024, parts: { 1: { entries: [['A/Hen cluck.wav', 1, 0, 0, 1, 'A', 'Birds'], ['B/Kitchen.wav', 1, 0, 0, 1, 'B', 'Ambience']] } } }];
  assert.deepEqual(rank(docs, hen).map(h => h.path), ['A/Hen cluck.wav']);
});

test('bundle parts resolve to the Sonniss URLs and a mirror', () => {
  const p = partRef('gdc2020/3');
  assert.equal(p.urls[0], 'https://archive.org/download/sonniss.com-gdc-game-audio-bundles/Sonniss.com%20-%20GDC%202020%20-%20Game%20Audio%20Bundle%20Part3of14.zip');
  assert.equal(p.urls.at(-1), 'https://downloads.sonniss.com/Sonniss.com%20-%20GDC%202020%20-%20Game%20Audio%20Bundle%20Part3of14.zip');
  assert.equal(allParts().length, 78);
});

test('WAV header parsing finds the data chunk', () => {
  const fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(2, 2); fmt.writeUInt32LE(48000, 4); fmt.writeUInt32LE(288000, 8); fmt.writeUInt16LE(6, 12); fmt.writeUInt16LE(24, 14);
  const h = Buffer.concat([Buffer.from('RIFF\0\0\0\0WAVE'), Buffer.from('bext'), Buffer.from([4, 0, 0, 0]), Buffer.alloc(4), Buffer.from('fmt '), Buffer.from([16, 0, 0, 0]), fmt, Buffer.from('data'), Buffer.from([0, 0x10, 0, 0])]);
  const w = parseWav(h);
  assert.deepEqual([w.rate, w.channels, w.blockAlign, w.dataOffset, w.dataBytes], [48000, 2, 6, h.length, 4096]);
});

test('rows carry provenance and the catalogue envelope matches models', () => {
  const slot = LIBRARY.find(s => s.id === 'hen');
  const row = soundRow({ cue: { ...slot, id: takeId(slot, 1), name: 'Hen clucking 2' }, pick: { slot: 'hen', candidates: [], notes: [] }, take: { ref: 'gdc2024/3', path: 'R/Lib - X/BIRDChkn_Hen_A_B.wav', trim: [0, 1] },
    measured: { duration: 1, lufs: -18, peak: -3, channels: 1, peaks: [1], target: -18 }, urls: {}, sha256: 'a'.repeat(64), bytes: 10, sourceSha256: 'b'.repeat(64) });
  assert.equal(row.id, 'hen-2');
  assert.deepEqual(row.uses, ['Near the chickens']);
  assert.equal(row.source.part, 'gdc2024/3');
  assert.equal(blobKey('ab'.repeat(32), 'hen-2.mp3'), `sounds/blobs/ab/${'ab'.repeat(32)}/hen-2.mp3`);
  assert.equal(publicCatalog([row]).count, 1);
});

test('the ranch plays the right bed for the hour and weather', () => {
  const { bedFor, shotFor } = ranchSoundRules;
  assert.equal(bedFor(6, 'clear'), 'farm-morning');
  assert.equal(bedFor(12, 'cloudy'), 'farm-day');
  assert.equal(bedFor(23, 'clear'), 'night-insects');
  assert.equal(bedFor(12, 'rain'), 'rain-light');
  assert.equal(shotFor(6, { weather: 'clear', pens: [] }, () => 0), 'rooster');
  assert.equal(shotFor(12, { weather: 'rain', pens: [{ species: 'cow', animals: [1] }] }, () => 0), 'cow');
});
