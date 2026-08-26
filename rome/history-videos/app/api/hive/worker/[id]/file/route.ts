import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["avatar.png", "asic.png"]);

const TYPES: Record<string, string> = {
  "avatar.png": "image/png",
  "asic.png": "image/png",
};

export async function GET(
  req: Request,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await Promise.resolve(ctx.params);
  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "avatar.png";
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ ok: false, error: "bad file" }, { status: 400 });
  }

  const path = join(process.cwd(), "mind/workers", id, name);
  if (!existsSync(path)) {
    return NextResponse.json({ ok: false, error: "missing" }, { status: 404 });
  }

  return new NextResponse(readFileSync(path), {
    headers: {
      "Content-Type": TYPES[name] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
