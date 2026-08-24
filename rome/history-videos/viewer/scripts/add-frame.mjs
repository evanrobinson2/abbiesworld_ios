#!/usr/bin/env node
/**
 * Add/update one versioned frame in Vercel Blob + catalog (no redeploy).
 *
 * npm run blob:add -- ./out.png \
 *   --id STZ01-05-RIDGELINE \
 *   --part "1. The North" \
 *   --beat "Horse-shadows on the ridge" \
 *   --mood "1 Dread" \
 *   --version v1 \
 *   --location "North of the Danube" \
 *   --characters "FRI-001" \
 *   --prompt "..."
 */
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function flags(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === name && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

const file = process.argv[2];
if (!file || file.startsWith("-")) {
  console.error(
    "Usage: npm run blob:add -- <image.png> --id ID --part PART --beat BEAT [options]"
  );
  process.exit(1);
}

const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(1);
}

const id = arg("--id") || path.basename(abs, path.extname(abs)).replace(/\s+/g, "-");
const storyPart = arg("--part", "Unsorted");
const storyBeat = arg("--beat", id);
const moodRaw = arg("--mood");
const prompt = arg("--prompt", "");
const stanza = arg("--stanza");
const category = arg("--category", "scene");
const register = arg("--register", "R1");
const version = arg("--version", "v1");
const location = arg("--location");
const setting = arg("--setting", storyBeat);
const yearApprox = arg("--year", "376 CE");
const scale = arg("--scale");
const light = arg("--light");
const tags = flags("--tag");
const characters = flags("--characters");
const factions = flags("--faction");
const catalogUrl =
  arg("--catalog-url") ||
  process.env.NEXT_PUBLIC_CATALOG_URL ||
  process.env.CATALOG_URL;

if (!catalogUrl) {
  console.error("Need NEXT_PUBLIC_CATALOG_URL or --catalog-url");
  process.exit(1);
}

function parseMood(raw) {
  if (!raw) return undefined;
  const m = raw.match(/^(\d+)\s+(.+)$/);
  if (m) return { number: Number(m[1]), name: m[2] };
  return { number: 0, name: raw };
}

function physical(absPath, reg) {
  const buf = fs.readFileSync(absPath);
  const stat = fs.statSync(absPath);
  let width;
  let height;
  if (buf.toString("ascii", 1, 4) === "PNG" && buf.length >= 24) {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  }
  return {
    format: "png",
    width,
    height,
    aspectRatio:
      width && height ? `${(width / height).toFixed(3)}:1` : undefined,
    fileSizeBytes: stat.size,
    contentHash: createHash("sha1").update(buf).digest("hex").slice(0, 12),
    mtime: stat.mtime.toISOString(),
    medium:
      reg === "R3"
        ? "charcoal / graphite on toned paper (R3)"
        : "layered cut-paper (R1)",
    palette:
      reg === "R3"
        ? "charcoal / graphite greys"
        : "deep indigo · bone · iron grey · tarnished gold (light/heat only)",
    orientation: "landscape",
  };
}

async function main() {
  const pathname = `frames/${id}/${version}.png`;
  console.log(`Uploading ${pathname}…`);
  const blob = await put(pathname, fs.readFileSync(abs), {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const res = await fetch(catalogUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const catalog = await res.json();

  const existing = catalog.items.find((x) => x.id === id);
  const versions = [...(existing?.versions || [])].filter(
    (v) => v.label !== version
  );
  versions.unshift({
    label: version,
    status: "current",
    url: blob.url,
    notes: `Uploaded ${new Date().toISOString()}`,
  });
  // Mark older as superseded
  for (let i = 1; i < versions.length; i++) {
    if (versions[i].status === "current") versions[i].status = "superseded";
  }

  const entry = {
    ...(existing || {}),
    id,
    url: blob.url,
    imagePath: blob.url,
    filename: path.basename(abs),
    shotNumber: existing?.shotNumber ?? catalog.items.length + 1,
    storyPart,
    storyBeat,
    mood: parseMood(moodRaw),
    register,
    category,
    description: storyBeat,
    prompt,
    stanza,
    tags: tags.length ? tags : existing?.tags,
    version,
    versions,
    physical: physical(abs, register),
    context: {
      ...(existing?.context || {}),
      era: "Late Antiquity",
      yearApprox,
      location: location || existing?.context?.location,
      setting,
      characters: characters.length
        ? characters
        : existing?.context?.characters,
      factions: factions.length ? factions : existing?.context?.factions,
      scale: scale || existing?.context?.scale,
      light: light || existing?.context?.light,
      materialCulture:
        existing?.context?.materialCulture ||
        "Late 4th century CE: scale/mail only; gold = light/heat only",
    },
    review: existing?.review || { status: "unreviewed" },
  };

  const idx = catalog.items.findIndex((x) => x.id === id);
  if (idx >= 0) catalog.items[idx] = entry;
  else catalog.items.push(entry);

  catalog.generatedAt = new Date().toISOString();
  catalog.totalShots = catalog.items.length;
  catalog.schemaVersion = "2.0.0";
  catalog.source = "vercel-blob";

  const catalogBlob = await put(
    "catalog/frames.json",
    JSON.stringify(catalog, null, 2),
    {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    }
  );

  console.log(`Done. ${idx >= 0 ? "Updated" : "Added"} ${id} @ ${version}`);
  console.log(`Image:   ${blob.url}`);
  console.log(`Catalog: ${catalogBlob.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
