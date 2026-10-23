#!/usr/bin/env node
/**
 * Build prep for local dev and Vercel production.
 * - On Vercel: use committed manifest (CDN URLs already set)
 * - Locally: rebuild manifest and link assets
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === "1";

function run(script) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    stdio: "inherit",
  });
  if (r.status) process.exit(r.status ?? 1);
}

if (isVercel) {
  console.log("Vercel build — using committed manifest with CDN URLs.");
} else {
  run("build-manifest.mjs");
  run("link-assets.mjs");
}
