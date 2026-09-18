// Latency benchmarks for image generation. Kids wait on these requests, so
// every attempt is recorded: structured log (survives on Vercel), JSONL on
// disk when the filesystem is writable (local / long-lived hosts), and an
// in-memory ring so GET /api/generate/metrics has something even if disk
// fails.

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const RING_LIMIT = 500;
const ring = [];

export function profilePath() {
  return (
    process.env.GENERATION_PROFILE_PATH ||
    join(tmpdir(), 'abbies-world-generation-profile.jsonl')
  );
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function summarize(records) {
  const latencies = records
    .map((record) => record.elapsedMs)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const ok = records.filter((record) => record.ok);
  const mean =
    latencies.length === 0
      ? null
      : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);

  function bucket(key) {
    const groups = {};
    for (const record of records) {
      const id = record[key] || 'unknown';
      (groups[id] ??= []).push(record);
    }
    return Object.fromEntries(
      Object.entries(groups).map(([id, group]) => [
        id,
        {
          count: group.length,
          ok: group.filter((entry) => entry.ok).length,
          latencyMs: latencySummary(
            group.map((entry) => entry.elapsedMs).filter((value) => Number.isFinite(value))
          ),
        },
      ])
    );
  }

  return {
    count: records.length,
    ok: ok.length,
    failed: records.length - ok.length,
    latencyMs: latencySummary(latencies, mean),
    byQuality: bucket('quality'),
    byModel: bucket('model'),
    byRoute: bucket('route'),
  };
}

function latencySummary(latencies, mean = null) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const computedMean =
    mean ??
    (sorted.length === 0
      ? null
      : Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length));
  return {
    n: sorted.length,
    min: sorted[0] ?? null,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted.at(-1) ?? null,
    mean: computedMean,
  };
}

export async function recordGeneration(record) {
  const entry = {
    ts: new Date().toISOString(),
    ...record,
  };
  ring.push(entry);
  if (ring.length > RING_LIMIT) ring.splice(0, ring.length - RING_LIMIT);

  console.info(
    JSON.stringify({
      event: 'image.generate.profile',
      ...entry,
    })
  );

  const path = profilePath();
  try {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.warn('[generation-profile] could not persist JSONL', error.message);
  }

  return entry;
}

export async function loadProfileRecords() {
  const fromDisk = [];
  try {
    const text = await readFile(profilePath(), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        fromDisk.push(JSON.parse(line));
      } catch {
        /* skip a corrupt line rather than lose the rest of the file */
      }
    }
  } catch {
    /* no file yet, or unreadable — the ring still has this instance */
  }

  const byKey = new Map();
  for (const record of [...fromDisk, ...ring]) {
    const key = `${record.ts}|${record.elapsedMs}|${record.route}|${record.ok}`;
    byKey.set(key, record);
  }
  return [...byKey.values()].sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
}

export async function profileSnapshot() {
  const records = await loadProfileRecords();
  return {
    ...summarize(records),
    path: profilePath(),
    recent: records.slice(-20),
  };
}
