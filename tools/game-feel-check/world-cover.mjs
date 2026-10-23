// World-cover probe: how much of the screen hides the world?
// Serves a static site folder, opens a page in headless Chromium at phone and
// desktop sizes, and samples a grid of points. A point is "chrome" when the
// topmost element there is not the world canvas, or when a translucent layer
// (mask, vignette, frosted panel) sits over the canvas.
// Usage: node world-cover.mjs <site-dir> <path> [--json out.json]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const [rootArg, page = '/', ...rest] = process.argv.slice(2);
const root = path.resolve(rootArg); // absolute, so the path guard below compares like with like
const jsonOut = rest[rest.indexOf('--json') + 1];
const settle = Number(process.env.SETTLE_MS || 6000);
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm'};
const rewrites = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'))).rewrites || []; } catch { return []; } })();
const resolve = url => {
  const p = decodeURIComponent(url.split('?')[0]);
  const hit = rewrites.find(r => r.source === p && !r.destination.startsWith('http'));
  return hit ? hit.destination : p;
};
const server = http.createServer((req, res) => {
  let file = path.join(root, resolve(req.url));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
// Measure steady play: one-off cards (the "new version ready" card) count as seen, and the world must finish loading.
const seenIds = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'whats-new.json'))).entries.map(e => e.id); } catch { return []; } })();
const results = [];
for (const [name, viewport] of [['phone', {width: 390, height: 844}], ['desktop', {width: 1440, height: 900}]]) {
  const tab = await browser.newPage({viewport, deviceScaleFactor: 1});
  await tab.addInitScript(ids => { try { localStorage.setItem('afb-seen', JSON.stringify(ids)); } catch {} }, seenIds);
  await tab.goto(`http://127.0.0.1:${port}${page}`, {waitUntil: 'load', timeout: 60000}).catch(() => {});
  await tab.waitForTimeout(settle);
  await tab.waitForFunction(() => !/Preparing|Loading/i.test(document.body.innerText || ''), null, {timeout: 60000}).catch(() => {});
  // The HUD can still be arriving after loading ends, so measure until two readings agree (at most ~10s more).
  const measure = () => tab.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')].filter(c => { const b = c.getBoundingClientRect(); return b.width * b.height > innerWidth * innerHeight * 0.5; });
    const world = canvases[0];
    const step = 10; let total = 0, chrome = 0, veiled = 0;
    const blocking = el => { const s = getComputedStyle(el); return s.pointerEvents !== 'none' || parseFloat(s.opacity) > 0.05; };
    for (let y = step / 2; y < innerHeight; y += step) for (let x = step / 2; x < innerWidth; x += step) {
      total++;
      const stack = document.elementsFromPoint(x, y);
      const i = world ? stack.indexOf(world) : -1;
      if (i === -1) { chrome++; continue; }
      const above = stack.slice(0, i).filter(el => !world.contains(el) && !el.contains(world));
      const solid = above.find(el => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && parseFloat(s.opacity) > 0.05 && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none' || s.backdropFilter !== 'none' || (el.innerText || '').trim()); });
      if (solid) { (getComputedStyle(solid).pointerEvents === 'none' ? veiled++ : chrome++); }
    }
    const words = (document.body.innerText || '').split(/\s+/).filter(w => /[a-z]{2,}/i.test(w)).length;
    return {hasWorld: !!world, chromePct: +(100 * chrome / total).toFixed(1), maskPct: +(100 * veiled / total).toFixed(1), coveredPct: +(100 * (chrome + veiled) / total).toFixed(1), visibleWords: words};
  });
  let r = null;
  for (let k = 0; k < 7; k++) {
    await tab.waitForTimeout(1500);
    const next = await measure();
    const same = r && next.coveredPct === r.coveredPct && next.hasWorld === r.hasWorld;
    r = next;
    if (same) break;
  }
  await tab.screenshot({path: `${process.env.SHOT_PREFIX || 'world-cover'}-${name}.png`});
  results.push({viewport: name, ...r});
  await tab.close();
}
await browser.close(); server.close();
const out = {page, budgetPct: 8, results};
if (results.every(r => !r.hasWorld)) { console.error(`world-cover: no world canvas on ${page}; is the site path right?`); process.exitCode = 2; }
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
