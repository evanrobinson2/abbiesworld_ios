"use client";

import { useCallback, useEffect, useState } from "react";
import type { HiveStatus } from "@/lib/hive";

const WORKERS = ["luna-local", "experience-observer", "cloud-production"] as const;
const BODIES = ["localhost", "cloud", "phone"] as const;

export default function HivePage() {
  const [status, setStatus] = useState<HiveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [worker, setWorker] = useState<(typeof WORKERS)[number]>("luna-local");
  const [body, setBody] = useState<(typeof BODIES)[number]>("localhost");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/hive/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      setStatus((await res.json()) as HiveStatus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "status failed");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 15000);
    return () => clearInterval(id);
  }, [refresh]);

  async function checkin() {
    setSending(true);
    try {
      const res = await fetch("/api/hive/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker, body, note }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; status?: HiveStatus };
      if (!res.ok || !json.ok) throw new Error(json.error ?? res.statusText);
      if (json.status) setStatus(json.status);
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "checkin failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8">
      <p className="text-xs tracking-[0.2em] text-gold-warm uppercase">Evan’s board</p>
      <h1 className="mt-1 font-serif text-3xl text-bone">Check-in &amp; status</h1>
      <p className="mt-2 text-sm text-bone-muted">
        For you — who’s on, who owns what. Nodes keep their own avatars and
        chats in <code className="text-gold-warm">mind/workers/</code>.
      </p>
      <p className="mt-2 text-sm text-bone-muted">
        {status?.unified ?? "Loading unified goal…"}
      </p>
      <p className="mt-1 font-mono text-xs text-iron">
        STATE {status?.stateUpdated ?? "—"}
        {status?.deployedSha ? ` · sha ${status.deployedSha.slice(0, 7)}` : ""}
        {error ? ` · err ${error}` : ""}
      </p>

      <section className="mt-8">
        <h2 className="text-sm tracking-wide text-bone-muted uppercase">Workers</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-indigo-mid">
          <table className="w-full text-left text-sm">
            <thead className="bg-indigo-mid/40 text-xs uppercase text-bone-muted">
              <tr>
                <th className="px-3 py-2">Worker</th>
                <th className="px-3 py-2">Seen</th>
                <th className="px-3 py-2">Owns</th>
              </tr>
            </thead>
            <tbody>
              {status?.workers.map((w) => (
                <tr key={w.id} className="border-t border-indigo-mid/60">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {w.plateUrl || w.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={w.plateUrl ?? w.avatarUrl ?? ""}
                          alt={w.id}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full border border-indigo-mid object-cover"
                        />
                      ) : null}
                      <div>
                        <span
                          className={
                            w.freshness === "online"
                              ? "text-keep"
                              : w.freshness === "stale"
                                ? "text-gold-warm"
                                : "text-iron"
                          }
                        >
                          {w.freshness}
                        </span>{" "}
                        <span className="font-medium">{w.id}</span>
                        <div className="text-xs text-iron">{w.body}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {w.lastSeen ?? "—"}
                    {w.lastNote ? (
                      <div className="mt-1 text-bone-muted">{w.lastNote}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-bone-muted">{w.owns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-indigo-mid p-4">
        <h2 className="text-sm tracking-wide text-bone-muted uppercase">Check in</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-bone-muted">
            Worker
            <select
              className="mt-1 w-full rounded-lg border border-indigo-mid bg-indigo-deep px-2 py-2 text-sm text-bone"
              value={worker}
              onChange={(e) => setWorker(e.target.value as (typeof WORKERS)[number])}
            >
              {WORKERS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-bone-muted">
            Body
            <select
              className="mt-1 w-full rounded-lg border border-indigo-mid bg-indigo-deep px-2 py-2 text-sm text-bone"
              value={body}
              onChange={(e) => setBody(e.target.value as (typeof BODIES)[number])}
            >
              {BODIES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-bone-muted">
          Note (optional)
          <input
            className="mt-1 w-full rounded-lg border border-indigo-mid bg-indigo-deep px-2 py-2 text-sm text-bone"
            value={note}
            maxLength={240}
            onChange={(e) => setNote(e.target.value)}
            placeholder="pulled main, on plumbing"
          />
        </label>
        <button
          type="button"
          disabled={sending}
          onClick={() => void checkin()}
          className="mt-3 rounded-lg bg-gold-warm px-3 py-2 text-sm font-medium text-indigo-deep disabled:opacity-50"
        >
          {sending ? "Checking in…" : "Check in"}
        </button>
      </section>

      {status?.workers.some((w) => w.plateUrl) ? (
        <section className="mt-8">
          <h2 className="text-sm tracking-wide text-bone-muted uppercase">
            Wrench badge
          </h2>
          <p className="mt-2 text-sm text-bone-muted">
            A pin you wear. ASIC in the bezel — open LLM + this harness +
            Bluetooth + Wi‑Fi. Bound to Evan. iPod slots empty until he
            presents a player.
          </p>
          <div className="mt-3 flex justify-center rounded-xl border border-indigo-mid bg-indigo-deep/40 p-6">
            {status.workers
              .filter((w) => w.plateUrl)
              .map((w) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={w.id}
                  src={w.plateUrl ?? ""}
                  alt={`${w.id} badge`}
                  className="w-full max-w-xs rounded-full"
                />
              ))}
          </div>
        </section>
      ) : null}

      {status && status.open.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm tracking-wide text-bone-muted uppercase">Open</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-bone-muted">
            {status.open.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-xs text-iron">
        JSON: <code>/api/hive/status</code> · POST <code>/api/hive/checkin</code>{" "}
        · <a className="text-gold-warm" href="/">Frame review</a>
      </p>
    </main>
  );
}
