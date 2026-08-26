import { NextResponse } from "next/server";
import { appendCheckinFile, buildStatus, type HiveCheckin } from "@/lib/hive";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const key = process.env.HIVE_CHECKIN_KEY;
  if (key) {
    const got = req.headers.get("x-hive-key") ?? "";
    if (got !== key) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "json required" }, { status: 400 });
  }

  const worker = typeof body.worker === "string" ? body.worker.trim() : "";
  const node = typeof body.body === "string" ? body.body.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 240) : "";
  if (!worker || !node) {
    return NextResponse.json(
      { ok: false, error: "worker and body required" },
      { status: 400 },
    );
  }

  const row: HiveCheckin = {
    ts: new Date().toISOString(),
    worker,
    body: node,
    ...(note ? { note } : {}),
  };

  try {
    appendCheckinFile(row);
  } catch {
    return NextResponse.json(
      { ok: false, error: "could not persist checkin", row },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, row, status: buildStatus() });
}
