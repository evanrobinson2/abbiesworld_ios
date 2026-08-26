import { readdirSync, readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const HIVE_ROOT = process.cwd();
export const STALE_MS = 15 * 60 * 1000;

export type HiveWorker = {
  id: string;
  body: string;
  owns: string;
};

export type HiveCheckin = {
  ts: string;
  worker: string;
  body: string;
  note?: string;
};

export type HiveStatus = {
  ok: true;
  unified: string;
  stateUpdated: string;
  deployedSha: string | null;
  workers: Array<
    HiveWorker & {
      lastSeen: string | null;
      freshness: "online" | "stale" | "silent";
      lastNote: string | null;
      avatarUrl: string | null;
      plateUrl: string | null;
    }
  >;
  open: string[];
  recentCheckins: HiveCheckin[];
};

function workerFileUrl(id: string, name: "avatar.png" | "asic.png"): string | null {
  const path = join(HIVE_ROOT, "mind/workers", id, name);
  return existsSync(path) ? `/api/hive/worker/${id}/file?name=${name}` : null;
}

function read(rel: string): string {
  const path = join(HIVE_ROOT, rel);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

export function parseWorkers(goalsMd: string): HiveWorker[] {
  const workers: HiveWorker[] = [];
  for (const line of goalsMd.split("\n")) {
    const m = line.match(
      /^\|\s+\*\*([^*]+)\*\*\s+\|\s+([^|]+)\|\s+([^|]+)\|/,
    );
    if (!m) continue;
    workers.push({
      id: m[1].trim(),
      body: m[2].trim(),
      owns: m[3].trim(),
    });
  }
  return workers;
}

export function parseOpen(goalsMd: string): string[] {
  const out: string[] = [];
  let inOpen = false;
  for (const line of goalsMd.split("\n")) {
    if (line.startsWith("## Open")) {
      inOpen = true;
      continue;
    }
    if (inOpen && line.startsWith("## ")) break;
    const item = line.match(/^-\s+(.+)/);
    if (inOpen && item) out.push(item[1].trim());
  }
  return out;
}

export function parseUnified(goalsMd: string): string {
  const lines = goalsMd.split("\n");
  const start = lines.findIndex((l) => l.startsWith("## Unified"));
  if (start < 0) return "";
  const chunk: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    if (line.trim()) chunk.push(line.trim());
  }
  return chunk[0] ?? "";
}

export function parseStateUpdated(stateMd: string): string {
  const m = stateMd.match(/Last updated:\s*(.+)/i);
  return m ? m[1].trim() : "unknown";
}

export function lastLogByBody(): Record<string, string> {
  const dir = join(HIVE_ROOT, "mind/log");
  const out: Record<string, string> = {};
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".ndjson")) continue;
    const body = name.replace(/\.ndjson$/, "");
    const lines = read(join("mind/log", name)).trim().split("\n").filter(Boolean);
    const last = lines.at(-1);
    if (!last) continue;
    try {
      const row = JSON.parse(last) as { ts?: string };
      if (row.ts) out[body] = row.ts;
    } catch {
      /* skip */
    }
  }
  return out;
}

export function readCheckinsFile(): HiveCheckin[] {
  const raw = read("mind/checkins.ndjson");
  const rows: HiveCheckin[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as HiveCheckin);
    } catch {
      /* skip */
    }
  }
  return rows;
}

export function appendCheckinFile(row: HiveCheckin): void {
  const dir = join(HIVE_ROOT, "mind");
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, "checkins.ndjson"), `${JSON.stringify(row)}\n`, "utf8");
}

function freshness(iso: string | null): "online" | "stale" | "silent" {
  if (!iso) return "silent";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "silent";
  return Date.now() - t < STALE_MS ? "online" : "stale";
}

function bodyKey(worker: HiveWorker): string {
  if (worker.id === "luna-local") return "localhost";
  if (worker.id === "cloud-production") return "cloud";
  return worker.body.toLowerCase();
}

export function buildStatus(extraCheckins: HiveCheckin[] = []): HiveStatus {
  const goals = read("mind/GOALS.md");
  const state = read("mind/STATE.md");
  const logs = lastLogByBody();
  const checkins = [...readCheckinsFile(), ...extraCheckins].sort((a, b) =>
    a.ts.localeCompare(b.ts),
  );
  const workers = parseWorkers(goals).map((w) => {
    const fromLog = logs[bodyKey(w)] ?? logs[w.id] ?? null;
    const mine = [...checkins].reverse().find((c) => c.worker === w.id);
    const lastSeen = [fromLog, mine?.ts].filter(Boolean).sort().at(-1) ?? null;
    return {
      ...w,
      lastSeen,
      freshness: freshness(lastSeen),
      lastNote: mine?.note ?? null,
      avatarUrl: workerFileUrl(w.id, "avatar.png"),
      plateUrl: workerFileUrl(w.id, "asic.png"),
    };
  });
  return {
    ok: true,
    unified: parseUnified(goals),
    stateUpdated: parseStateUpdated(state),
    deployedSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    workers,
    open: parseOpen(goals),
    recentCheckins: checkins.slice(-20).reverse(),
  };
}
