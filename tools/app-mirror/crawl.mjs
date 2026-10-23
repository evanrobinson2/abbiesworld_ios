// Opens each mirrored screen of the app in headless Chromium against serve.mjs and
// records every file it loads. Writes tools/app-mirror/out/crawl.json and a screenshot per screen.
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { start } from './serve.mjs';
import { SCREENS } from './screens.mjs';

const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const here = path.dirname(url.fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const only = process.argv.slice(2);
const { server, port, record } = await start(0);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const perScreen = {};
for (const screen of SCREENS) {
  if (only.length && !only.includes(screen.id)) continue;
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844, isMobile: true, hasTouch: true }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    const before = new Set(record.keys());
    await page.goto(`http://127.0.0.1:${port}${screen.route}`, { waitUntil: 'load', timeout: 60000 }).catch((e) => errors.push(String(e)));
    await page.waitForTimeout(screen.wait || 12000);
    for (const step of screen.poke || []) await step(page).catch(() => {});
    await page.waitForTimeout(2000);
    if (!vp.isMobile) await page.screenshot({ path: path.join(OUT, 'shots', screen.id + '.jpg'), quality: 70 });
    perScreen[screen.id] = perScreen[screen.id] || { files: new Set(), errors: [] };
    for (const k of record.keys()) if (!before.has(k) || true) perScreen[screen.id].files.add(k);
    perScreen[screen.id].errors.push(...errors);
    await page.close();
    record.clear();
  }
  console.log(screen.id, perScreen[screen.id].files.size, 'files', perScreen[screen.id].errors.slice(0, 3));
}
await browser.close();
server.close();
const json = Object.fromEntries(Object.entries(perScreen).map(([k, v]) => [k, { files: [...v.files].sort(), errors: v.errors }]));
const file = path.join(OUT, 'crawl.json');
const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
fs.writeFileSync(file, JSON.stringify({ ...prev, ...json }, null, 1));
