#!/usr/bin/env node
/**
 * Update manifest.json to use Cloudflare R2 CDN URLs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = path.resolve(__dirname, "../public/data/manifest.json");
const CDN_BASE = "https://pub-64dda63c980745779da5e16c2ec14f70.r2.dev";

// Map local asset paths to CDN URLs
function localPathToCdnUrl(localPath) {
  if (!localPath) return localPath;
  // Handle paths like /assets/scenes/SCENE-01.png or assets/scenes/SCENE-01.png
  const normalized = localPath.replace(/^\/?(assets\/)?/, "");
  return `${CDN_BASE}/${normalized}`;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  
  console.log(`Updating ${manifest.items.length} items to use CDN URLs...`);
  
  for (const item of manifest.items) {
    // Update main URL
    if (item.url && (item.url.startsWith("/assets") || item.url.startsWith("assets"))) {
      item.url = localPathToCdnUrl(item.url);
    }
    if (item.imagePath && (item.imagePath.startsWith("/assets") || item.imagePath.startsWith("assets"))) {
      item.imagePath = localPathToCdnUrl(item.imagePath);
    }
    
    // Update version URLs
    if (item.versions) {
      for (const v of item.versions) {
        if (v.path && (v.path.startsWith("/assets") || v.path.startsWith("assets"))) {
          v.url = localPathToCdnUrl(v.path);
        }
      }
    }
    
    // Update archived URL
    if (item.archivedUrl && (item.archivedUrl.startsWith("/assets") || item.archivedUrl.startsWith("assets"))) {
      item.archivedUrl = localPathToCdnUrl(item.archivedUrl);
    }
    if (item.archivedPath && (item.archivedPath.startsWith("/assets") || item.archivedPath.startsWith("assets"))) {
      item.archivedUrl = localPathToCdnUrl(item.archivedPath);
    }
  }
  
  // Update source
  manifest.source = "cloudflare-r2";
  manifest.cdnBase = CDN_BASE;
  manifest.generatedAt = new Date().toISOString();
  
  // Write updated manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  
  console.log("✓ Manifest updated with CDN URLs");
  console.log(`  CDN base: ${CDN_BASE}`);
  console.log(`  Items updated: ${manifest.items.length}`);
}

main().catch(console.error);
