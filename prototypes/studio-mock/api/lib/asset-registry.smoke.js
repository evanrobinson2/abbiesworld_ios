/**
 * Smoke: ingest a tiny PNG into the Game Asset registry (needs admin key + network).
 * Run: ASSET_REGISTRY_ADMIN_API_KEY=… node api/lib/asset-registry.smoke.js
 */
import { writeFileSync } from "node:fs";
import { ingestStagingUrl, registryConfigStatus } from "./asset-registry.js";

function tinyPng() {
  // 1x1 PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

const status = registryConfigStatus();
if (!status.configured) {
  console.error("skip: ASSET_REGISTRY_ADMIN_API_KEY missing");
  process.exit(0);
}

const path = `/tmp/mcp-registry-smoke-${Date.now()}.png`;
writeFileSync(path, tinyPng());

// Host a local file via data URL is not https — use abbies.world if we can
// Instead: upload via ingest after putting bytes on a temporary https is hard locally.
// Validate ensure path by registering from a public 1x1 png.
const result = await ingestStagingUrl({
  stagingUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Very_Black_screen.jpg/20px-Very_Black_screen.jpg",
  semanticId: "map.mcp.smokeTest",
  registryKey: "maps/mcp/smoke-test",
  kind: "map",
  brief: "smoke test",
});

if (!result.ok) {
  console.error(result);
  process.exit(1);
}
console.log("asset-registry.smoke.js OK", {
  revision: result.revision,
  registryKey: result.registryKey,
  bindWith: result.bindWith,
});
