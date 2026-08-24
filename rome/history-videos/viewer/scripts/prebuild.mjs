#!/usr/bin/env node
/**
 * Build prep: always rebuild local manifest.
 * Only link/copy heavy assets when NOT using remote Blob catalog.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    stdio: "inherit",
  });
  if (r.status) process.exit(r.status ?? 1);
}

run("build-manifest.mjs");

if (process.env.NEXT_PUBLIC_CATALOG_URL) {
  console.log("NEXT_PUBLIC_CATALOG_URL set — skipping local asset copy (using Blob).");
} else {
  run("link-assets.mjs");
}
