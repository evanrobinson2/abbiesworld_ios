import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { WrenchBadge } from "@/components/WrenchBadge";
import { buildStatus, HIVE_ROOT } from "@/lib/hive";

export const dynamic = "force-dynamic";

const KNOWN = new Set([
  "luna-local",
  "luna-ux",
  "experience-observer",
  "cloud-production",
]);

function readAvatar(id: string): string {
  const path = join(HIVE_ROOT, "mind/workers", id, "AVATAR.md");
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function lookLine(md: string): string {
  const m = md.match(/^-\s+\*\*Look:\*\*\s+(.+)/m);
  return m ? m[1].trim() : "";
}

function nameLine(md: string): string {
  const m = md.match(/^-\s+\*\*Name:\*\*\s+(.+)/m);
  return m ? m[1].trim() : "";
}

export default async function WorkerRoom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!KNOWN.has(id)) notFound();

  const status = buildStatus();
  const worker = status.workers.find((w) => w.id === id);
  const avatarMd = readAvatar(id);
  const name = nameLine(avatarMd);
  const look = lookLine(avatarMd);
  const badgeSrc =
    id === "luna-ux"
      ? (worker?.plateUrl ?? null)
      : null;

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8">
      <p className="text-xs tracking-[0.2em] text-gold-warm uppercase">
        Worker room
      </p>
      <h1 className="mt-1 font-serif text-3xl text-bone">{id}</h1>
      <p className="mt-2 text-sm text-bone-muted">
        {name ? `${name}. ` : ""}
        {worker?.owns ?? "—"}
      </p>
      <p className="mt-1 font-mono text-xs text-iron">
        {worker?.freshness ?? "silent"}
        {worker?.body ? ` · ${worker.body}` : ""}
        {worker?.lastNote ? ` · ${worker.lastNote}` : ""}
      </p>

      {badgeSrc ? (
        <section className="mt-8 rounded-xl border border-indigo-mid p-4 sm:p-5">
          <WrenchBadge src={badgeSrc} size="room" />
        </section>
      ) : worker?.avatarUrl ? (
        <section className="mt-8 flex justify-center rounded-xl border border-indigo-mid bg-indigo-deep/40 p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={worker.avatarUrl}
            alt={`${id} stamp`}
            width={160}
            height={160}
            className="h-40 w-40 rounded-full border border-indigo-mid object-cover"
          />
        </section>
      ) : (
        <p className="mt-8 text-sm text-iron">No face in this room yet.</p>
      )}

      {look ? (
        <p className="mt-6 text-sm text-bone-muted">{look}</p>
      ) : null}

      <p className="mt-10 text-xs text-iron">
        <a className="text-gold-warm" href="/hive">
          Back to Evan’s board
        </a>
        {" · "}
        Chat stays in{" "}
        <code className="text-gold-warm">mind/workers/{id}/chat.ndjson</code>
      </p>
    </main>
  );
}
