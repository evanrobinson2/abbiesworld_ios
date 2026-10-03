import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ORIGIN = "http://abbies.world:8000";
const GAME = "abbies-world-2";

/** Local overrides when registry still has opaque JPEG cutouts. */
const LOCAL_OVERRIDES = {
  "poi.spookyPortal.exterior": "api/overrides/world2_world_portal.png",
  "poi.portal.exterior": "api/overrides/world2_world_portal.png",
  "poi.homePortal.exterior": "api/overrides/world2_world_portal.png",
  "poi.worldSeed.portal": "api/overrides/world2_world_portal.png",
  "poi.sceneCreator.exterior": "api/overrides/world2_world_portal.png",
};

function kebab(token) {
  return String(token).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function registryKey(semantic) {
  const value = String(semantic || "").trim();
  if (!value || value.includes("..") || value.includes("\\")) return "";
  if (value.includes("/")) return value;
  const parts = value.split(".").filter(Boolean);
  if (parts.length < 2) return "";
  const [head, ...rest] = parts;
  const tail = rest.map(kebab).join("/");
  if (head === "map") return `maps/${tail}`;
  if (head === "poi" && parts.length >= 3) return `pois/${tail}`;
  if (head === "song") return `songs/${tail}`;
  return "";
}

function localOverride(semantic) {
  const rel = LOCAL_OVERRIDES[String(semantic || "").trim()];
  if (!rel) return null;
  const absolute = join(process.cwd(), rel);
  if (!existsSync(absolute)) return null;
  const bytes = readFileSync(absolute);
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=60",
      "X-Abbie-Plate-Source": "local-override",
    },
  });
}

export async function GET(request) {
  const semantic = new URL(request.url).searchParams.get("semantic");
  const override = localOverride(semantic);
  if (override) return override;

  const key = registryKey(semantic);
  if (!/^[a-z0-9][a-z0-9/_-]{0,180}$/i.test(key)) {
    return new Response("Unknown background", { status: 400 });
  }
  const apiKey = process.env.ABBIES_WORLD_API_KEY || "";
  if (!apiKey) return new Response("Background proxy is not configured", { status: 503 });
  const headers = { Authorization: `Bearer ${apiKey}` };
  const recordResponse = await fetch(`${ORIGIN}/api/v1/games/${GAME}/assets/${key}`, { headers });
  if (!recordResponse.ok) return new Response("Background not found", { status: recordResponse.status });
  const record = await recordResponse.json();
  let delivery = record.deliveryURL || "";
  if (delivery.startsWith("/")) delivery = ORIGIN + delivery;
  if (!delivery.startsWith(ORIGIN + "/api/v1/asset-content/")) {
    return new Response("Background is not hosted", { status: 502 });
  }
  const bytes = await fetch(delivery, { headers });
  if (!bytes.ok) return new Response("Plate bytes missing", { status: bytes.status });
  return new Response(bytes.body, {
    status: 200,
    headers: {
      "Content-Type": record.mimeType || bytes.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "public, max-age=300",
    },
  });
}
