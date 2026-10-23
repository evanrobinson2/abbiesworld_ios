#!/usr/bin/env node
/**
 * Links or copies repo assets into viewer/public/assets for local + Vercel builds.
 * On Vercel, always copy (symlinks are unreliable across the build sandbox).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_ASSETS = path.join(ROOT, "public/assets");
const REPO_ASSETS = path.join(ROOT, "assets");
const forceCopy = process.env.VERCEL === "1" || process.argv.includes("--copy");

function rm(dest) {
  if (!fs.existsSync(dest)) return;
  fs.rmSync(dest, { recursive: true, force: true });
}

function linkOrCopy(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Missing assets at ${src}`);
    process.exit(1);
  }
  rm(dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (!forceCopy) {
    try {
      fs.symlinkSync(src, dest, "dir");
      console.log(`Linked ${dest} → ${src}`);
      return;
    } catch (err) {
      console.warn(`Symlink failed (${err.message}); copying instead`);
    }
  }

  fs.cpSync(src, dest, { recursive: true });
  console.log(`Copied ${src} → ${dest}`);
}

linkOrCopy(REPO_ASSETS, PUBLIC_ASSETS);
