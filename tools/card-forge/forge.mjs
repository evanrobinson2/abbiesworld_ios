#!/usr/bin/env node
// Card Forge batch: render a card set to print files in headless Chromium, using the same renderer as the live page
// (prototypes/ranch-atelier/dist/cards/forge.mjs), then check each card against the Oracle card rubric.
//
//   node tools/card-forge/forge.mjs [--set /cards/cards.json] [--ids a,b] [--dpi 600] [--out out/cards] [--no-check]
//
// Writes per card: NNN-id.png (63x88 mm + 3 mm bleed), NNN-id.json (rubric manifest), id.<finish>.png masks,
// plus back.png and quality-report.json. Needs Playwright (npm i -g playwright; Chromium preinstalled in cloud sessions).
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(REPO, 'prototypes/ranch-atelier/dist');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const dpi = +arg('dpi', 600), out = resolve(arg('out', 'out/cards')), set = arg('set', '/cards/cards.json'), ids = arg('ids', '');

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const path = join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.startsWith(DIST)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(path); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('page:', e.message));
await page.goto(`${base}/cards/render.html?ids=__none__`);
await page.waitForFunction('window.done === true');
await mkdir(out, { recursive: true });

const list = await page.evaluate(async ({ set, ids }) => {
  const { loadSet } = await import('/cards/forge.mjs');
  const { cards } = await loadSet(set);
  return cards.filter(c => !ids || ids.split(',').includes(c.id)).map(c => ({ id: c.id, number: c.number }));
}, { set, ids });

const dataUrl = async (fn, args) => Buffer.from((await page.evaluate(fn, args)).split(',')[1], 'base64');
await writeFile(join(out, 'back.png'), await dataUrl(async dpi => {
  const { renderBack } = await import('/cards/forge.mjs');
  return (await renderBack({ dpi, bleed: true })).toDataURL('image/png');
}, dpi));

const report = [];
for (const { id, number } of list) {
  const r = await page.evaluate(async ({ set, id, dpi }) => {
    const { loadSet, renderCard, renderMask } = await import('/cards/forge.mjs');
    const spec = (await loadSet(set)).cards.find(c => c.id === id);
    const { canvas, qc, manifest, masks } = await renderCard(spec, { dpi, bleed: true, preview: false });
    return { png: canvas.toDataURL('image/png'), qc, manifest,
      masks: masks.map(m => ({ layer: m.layer, png: renderMask(spec, m, { dpi, bleed: true }).toDataURL('image/png') })) };
  }, { set, id, dpi });
  const stem = `${String(number).padStart(3, '0')}-${id}`;
  await writeFile(join(out, stem + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
  await writeFile(join(out, stem + '.json'), JSON.stringify(r.manifest, null, 2));
  for (const m of r.masks) await writeFile(join(out, `${id}.${m.layer}.png`), Buffer.from(m.png.split(',')[1], 'base64'));
  report.push(r.qc);
  console.log(`${stem}  ${r.qc.grade}${r.qc.items.filter(i => i.level !== 'pass').map(i => '\n    ' + i.level + ': ' + i.msg).join('')}`);
}
await browser.close(); server.close();

// The Oracle rubric checker (tools/card-rubric/check_card.py on main) reads the PNG + manifest independently.
const checker = join(REPO, 'tools/card-rubric/check_card.py');
const rubric = {};
if (!flag('no-check') && existsSync(checker)) {
  for (const { id, number } of list) {
    const stem = `${String(number).padStart(3, '0')}-${id}`;
    const p = spawnSync('python3', [checker, join(out, stem + '.png'), join(out, stem + '.json')], { encoding: 'utf8' });
    const last = p.stdout.trim().split('\n').pop();
    try { rubric[id] = JSON.parse(last); } catch { rubric[id] = { error: (p.stderr || last).slice(0, 400) }; }
    const fails = Object.entries(rubric[id].auto_checks || {}).filter(([, v]) => !v).map(([k]) => k);
    console.log(`rubric ${stem}: gates ${rubric[id].gates_passed ? 'pass' : 'FAIL'}${fails.length ? ' · soft misses: ' + fails.join(', ') : ''}`);
  }
} else if (!flag('no-check')) console.log('rubric checker not found at tools/card-rubric/check_card.py; skipped');

await writeFile(join(out, 'quality-report.json'), JSON.stringify({ generated: new Date().toISOString(), dpi, set, cards: report, rubric }, null, 2));
const grades = report.reduce((a, q) => ((a[q.grade] = (a[q.grade] || 0) + 1), a), {});
console.log(`\n${report.length} cards → ${out}  ${JSON.stringify(grades)}`);
process.exit(report.some(q => q.grade === 'blocked') ? 1 : 0);
