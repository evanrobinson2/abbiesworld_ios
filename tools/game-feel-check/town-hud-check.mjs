// Town HUD regression check (GitHub issue #544; Evan, 2026-10-24: "I cannot stress that enough"). Opens /town in headless
// Chromium at desktop, iPad and phone sizes and fails if
//   - the old bottom bar (.hud: home, back, forward, map, clock, slider, heart) is visible again,
//   - the town's HUD did not mount (#aw-top missing: the startup tag in studies/abbietown/index.html was dropped),
//   - any simulation control in the top glass bar sits on a second row, or the bar is taller than one row,
//   - something else glass-like is fixed in the top strip beside the bar.
// Usage: node town-hud-check.mjs <site-dir> [screenshot-prefix]      (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs to override)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(process.argv[2] || 'prototypes/ranch-atelier/dist'), prefix = process.argv[3] || 'town-hud';
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary'};
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const failures = [];
const seenIds = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'whats-new.json'))).entries.map(e => e.id); } catch { return []; } })();
for (const [name, viewport] of [['desktop', {width: 1440, height: 900}], ['ipad-landscape', {width: 1180, height: 820}], ['ipad-portrait', {width: 820, height: 1180}], ['phone', {width: 390, height: 844}]]) {
  const tab = await browser.newPage({viewport, deviceScaleFactor: 1});
  await tab.addInitScript(ids => { try { localStorage.setItem('afb-seen', JSON.stringify(ids)); localStorage.setItem('aw-welcome', JSON.stringify({mode: 'none', hints: []})); } catch {} }, seenIds);
  await tab.goto(`http://127.0.0.1:${port}/studies/abbietown/index.html?play`, {waitUntil: 'load', timeout: 90000}).catch(() => {});
  await tab.waitForSelector('#aw-top', {timeout: 60000}).catch(() => {});
  await tab.waitForTimeout(Number(process.env.SETTLE_MS || 8000));
  const r = await tab.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
    const bar = document.getElementById('aw-top');
    if (!bar) return {mounted: false, oldBar: [...document.querySelectorAll('.hud')].some(vis)};
    const bb = bar.getBoundingClientRect(), kids = [...bar.querySelectorAll('button, .ch-dial, .ch-read, .ch-reg, .ch-push, .aw-ico')].filter(vis);
    const mid = k => { const b = k.getBoundingClientRect(); return b.top + b.height / 2; };
    const off = kids.filter(k => Math.abs(mid(k) - (bb.top + bb.height / 2)) > bb.height / 2 + 2 || mid(k) > bb.bottom || mid(k) < bb.top).map(k => k.className || k.tagName);
    const rows = new Set(kids.filter(k => !k.closest('#aw-effects')).map(k => Math.round(mid(k) / 12)));
    const others = [...document.querySelectorAll('body *')].filter(e => !bar.contains(e) && !e.closest('.pl-door') && vis(e) && getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().bottom < 90 && e.getBoundingClientRect().height < 90 && e.getBoundingClientRect().width > 30 && !e.matches('#stage,#stage *,canvas,#v2-chrono-pop')).map(e => e.id || e.className);
    return {mounted: true, oldBar: [...document.querySelectorAll('.hud')].some(vis), barHeight: Math.round(bb.height), barRight: Math.round(bb.right), vw: innerWidth, kids: kids.length, offRow: off, rows: rows.size, others};
  });
  await tab.screenshot({path: `${prefix}-${name}.png`});
  console.log(name, JSON.stringify(r));
  if (!r.mounted) failures.push(`${name}: the town HUD did not mount (is town-hud-boot.mjs still loaded by studies/abbietown/index.html?)`);
  if (r.oldBar) failures.push(`${name}: the old bottom bar (.hud) is visible`);
  if (r.mounted) {
    if (r.barHeight > 100) failures.push(`${name}: the top bar is ${r.barHeight}px tall, so it wrapped to a second row`);
    if (r.offRow.length) failures.push(`${name}: controls off the bar's row: ${r.offRow.join(', ')}`);
    if (r.rows > 1) failures.push(`${name}: the chronograph controls sit on ${r.rows} rows`);
    if (r.barRight > r.vw) failures.push(`${name}: the top bar runs off the screen (${r.barRight} > ${r.vw})`);
    if (r.others.length) failures.push(`${name}: other fixed controls in the top strip: ${r.others.join(', ')}`);
  }
  await tab.close();
}
await browser.close(); server.close();
if (failures.length) { console.error('\nTown HUD check FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('Town HUD check passed.');
