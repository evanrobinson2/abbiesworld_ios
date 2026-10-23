#!/usr/bin/env node
/**
 * Seed Vercel Blob with versioned frames + rich catalog.
 * Requires: BLOB_READ_WRITE_TOKEN
 */
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.resolve(__dirname, "../public/data/manifest.json");
const CATALOG_PATHNAME = "catalog/frames.json";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

// Refresh enriched local catalog first
spawnSync(process.execPath, [path.join(__dirname, "build-manifest.mjs")], {
  stdio: "inherit",
});

async function uploadFile(pathname, filePath, contentType) {
  const buf = fs.readFileSync(filePath);
  const blob = await put(pathname, buf, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const items = [];

  console.log(`Seeding ${manifest.items.length} catalog entries…`);

  for (const item of manifest.items) {
    const localPath = (item.imagePath || item.url || "").replace(/^\//, "");
    const abs = path.join(ROOT, localPath);
    if (!fs.existsSync(abs)) {
      console.warn(`skip missing ${localPath}`);
      continue;
    }

    const ver = item.version || "v1";
    const pathname = `frames/${item.id}/${ver}.png`;
    process.stdout.write(`  ${pathname}… `);
    const url = await uploadFile(pathname, abs, "image/png");
    console.log("ok");

    const versions = [];
    for (const v of item.versions || []) {
      if (v.label === ver) {
        versions.push({ ...v, url, status: v.status || "current" });
        continue;
      }
      if (v.path) {
        const vAbs = path.join(ROOT, v.path.replace(/^\//, ""));
        if (fs.existsSync(vAbs)) {
          const vUrl = await uploadFile(
            `frames/${item.id}/${v.label}.png`,
            vAbs,
            "image/png"
          );
          versions.push({ ...v, url: vUrl });
        } else {
          versions.push(v);
        }
      } else {
        versions.push(v);
      }
    }

    items.push({
      ...item,
      url,
      imagePath: url,
      versions: versions.length ? versions : [{ label: ver, status: "current", url }],
      archivedUrl: versions.find((v) => v.label === "v1" && v.status === "rejected")
        ?.url,
    });
  }

  const catalog = {
    schemaVersion: manifest.schemaVersion || "2.0.0",
    generatedAt: new Date().toISOString(),
    title: manifest.title,
    styleSuffix: manifest.styleSuffix,
    totalShots: items.length,
    items,
    source: "vercel-blob",
  };

  const catalogBlob = await put(CATALOG_PATHNAME, JSON.stringify(catalog, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("\nSeed complete.");
  console.log(`Entries: ${items.length}`);
  console.log(`\nSet Vercel env:`);
  console.log(`  NEXT_PUBLIC_CATALOG_URL=${catalogBlob.url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
