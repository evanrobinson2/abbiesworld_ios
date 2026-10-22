#!/usr/bin/env node
// Index every Sonniss GDC bundle part: the zip directory (path, size) of each one, read remotely.
//   node index.mjs                 all parts, writes index/<bundle>.json
//   node index.mjs gdc2024/1 ...   just these parts (merged into their bundle's index)
// Run on a GitHub runner (the cloud box can't reach downloads.sonniss.com). Takes a few MB of range reads.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { BUNDLES, partRef, allParts } from './bundles.mjs';
import { listZip } from './remote-zip.mjs';
import { describe } from './catalog.mjs';

const want = process.argv.slice(2).length ? process.argv.slice(2) : allParts();
const dir = new URL('./index/', import.meta.url);
mkdirSync(dir, { recursive: true });
const docs = {};
const load = id => docs[id] ??= existsSync(new URL(`${id}.json`, dir)) ? JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8')) : { bundle: id, parts: {} };

let failed = 0;
for (const ref of want) {
  const { bundle, part, file, urls } = partRef(ref);
  let listing = null, error = null;
  for (const url of urls) {
    try { listing = await listZip(url); break; } catch (e) { error = e; console.log(`  ${ref} via ${new URL(url).host}: ${e.message}`); }
  }
  if (!listing) { failed++; continue; }
  const sounds = listing.entries.filter(e => /\.(wav|flac|aiff?|mp3|ogg)$/i.test(e.name));
  load(bundle.id).parts[part] = {
    file, url: listing.url, bytes: listing.bytes, count: sounds.length, methods: [...new Set(listing.entries.map(e => e.method))],
    // [path, bytes, method, offset, csize, publisher, category] - compact, so the whole bundle stays small
    entries: sounds.map(e => { const d = describe(e.name); return [e.name, e.size, e.method, e.offset, e.csize, d.publisher, d.category]; }),
  };
  console.log(`${ref}: ${sounds.length} sounds of ${listing.entries.length} files, ${(listing.bytes / 1e9).toFixed(2)} GB`);
}
for (const [id, doc] of Object.entries(docs)) {
  const b = BUNDLES.find(x => x.id === id);
  doc.label = b.label || `GDC ${b.year}`; doc.year = b.year; doc.indexed = new Date().toISOString();
  doc.count = Object.values(doc.parts).reduce((a, p) => a + p.count, 0);
  writeFileSync(new URL(`${id}.json`, dir), JSON.stringify(doc));
  console.log(`index/${id}.json: ${doc.count} sounds in ${Object.keys(doc.parts).length} parts`);
}
if (failed) { console.error(`${failed} part(s) could not be read`); process.exit(1); }
