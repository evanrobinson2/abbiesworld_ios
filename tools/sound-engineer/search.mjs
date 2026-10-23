#!/usr/bin/env node
// Search the bundle index: node search.mjs rooster crow [--category Birds] [--limit 30]
import { readdirSync, readFileSync } from 'node:fs';
import { search } from './catalog.mjs';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const category = opt('--category'), limit = Number(opt('--limit') || 30);
const dir = new URL('./index/', import.meta.url);
for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
  for (const h of search(JSON.parse(readFileSync(new URL(f, dir), 'utf8')), args.join(' '), { limit, category })) {
    console.log(`${h.ref}\t${(h.bytes / 1e6).toFixed(1)} MB\t${h.category}\t${h.path}`);
  }
}
