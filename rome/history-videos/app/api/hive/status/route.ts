import { NextResponse } from "next/server";
import { buildStatus } from "@/lib/hive";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildStatus());
}
