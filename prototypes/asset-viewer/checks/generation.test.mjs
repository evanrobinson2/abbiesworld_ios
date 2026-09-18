import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  defaultQuality,
  generationConfig,
  imageModel,
} from '../app/lib/imageConfig.js';
import {
  percentile,
  profilePath,
  recordGeneration,
  summarize,
} from '../app/lib/generationProfile.js';

test('generation defaults to the fastest 2.5 model at low quality', () => {
  delete process.env.IMAGE_MODEL;
  delete process.env.IMAGE_QUALITY;
  assert.equal(imageModel(), 'gpt-image-2.5-flare');
  assert.equal(defaultQuality(), 'low');
  assert.deepEqual(generationConfig().qualities, ['low', 'medium']);
});

test('IMAGE_MODEL and IMAGE_QUALITY override the defaults', () => {
  process.env.IMAGE_MODEL = 'gpt-image-2.5-sunburst';
  process.env.IMAGE_QUALITY = 'medium';
  assert.equal(imageModel(), 'gpt-image-2.5-sunburst');
  assert.equal(defaultQuality(), 'medium');
  delete process.env.IMAGE_MODEL;
  delete process.env.IMAGE_QUALITY;
});

test('an unknown IMAGE_QUALITY falls back to low rather than shipping slow', () => {
  process.env.IMAGE_QUALITY = 'max';
  assert.equal(defaultQuality(), 'low');
  delete process.env.IMAGE_QUALITY;
});

test('percentile is the expected order statistic', () => {
  assert.equal(percentile([], 50), null);
  assert.equal(percentile([10], 50), 10);
  assert.equal(percentile([10, 20, 30, 40, 50], 50), 30);
  assert.equal(percentile([10, 20, 30, 40, 50], 95), 50);
});

test('summarize reports p50/p95 and buckets by quality', () => {
  const summary = summarize([
    { ok: true, elapsedMs: 1000, quality: 'low', model: 'gpt-image-2.5-flare', route: 'direct' },
    { ok: true, elapsedMs: 2000, quality: 'low', model: 'gpt-image-2.5-flare', route: 'direct' },
    { ok: false, elapsedMs: 8000, quality: 'medium', model: 'gpt-image-2.5-flare', route: 'gateway' },
  ]);
  assert.equal(summary.count, 3);
  assert.equal(summary.ok, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.latencyMs.p50, 2000);
  assert.equal(summary.latencyMs.min, 1000);
  assert.equal(summary.latencyMs.max, 8000);
  assert.equal(summary.byQuality.low.count, 2);
  assert.equal(summary.byQuality.medium.ok, 0);
  assert.equal(summary.byQuality.medium.count, 1);
});

test('recordGeneration appends JSONL the server can read back', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'abbies-profile-'));
  process.env.GENERATION_PROFILE_PATH = join(dir, 'profile.jsonl');
  await recordGeneration({
    ok: true,
    model: 'gpt-image-2.5-flare',
    quality: 'low',
    size: '1024x1024',
    route: 'direct',
    elapsedMs: 1234,
    promptChars: 40,
  });
  assert.equal(profilePath(), process.env.GENERATION_PROFILE_PATH);
  const lines = (await readFile(process.env.GENERATION_PROFILE_PATH, 'utf8'))
    .trim()
    .split('\n');
  assert.equal(lines.length, 1);
  const row = JSON.parse(lines[0]);
  assert.equal(row.model, 'gpt-image-2.5-flare');
  assert.equal(row.quality, 'low');
  assert.equal(row.elapsedMs, 1234);
  assert.ok(row.ts);
  delete process.env.GENERATION_PROFILE_PATH;
});
