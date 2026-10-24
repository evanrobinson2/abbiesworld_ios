// Renders a small picture of every GLB for the model library (/models). Usage:
//   node render.mjs <repo-root> <out-dir> <list.json>   list.json: [{key, path}] (path relative to repo root)
// Skips keys already rendered, so re-runs only do new models. Needs playwright and dist/vendor/model-viewer.min.js.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const [root, out, listFile] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(listFile, 'utf8'));
fs.mkdirSync(out, { recursive: true });
const todo = list.filter(m => !fs.existsSync(path.join(out, m.key + '.png')));
console.log(todo.length, 'to render of', list.length);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { res.setHeader('content-type', 'text/html'); return res.end(`<!doctype html><body style="margin:0;background:#f6f1e8"><script type="module" src="/mv.js"></script><model-viewer id="m" style="width:256px;height:256px" camera-orbit="-35deg 68deg auto" environment-image="neutral" shadow-intensity="0.6" exposure="0.9" interaction-prompt="none"></model-viewer>`); }
  if (u === '/mv.js') { res.setHeader('content-type', 'text/javascript'); return res.end(fs.readFileSync(new URL('../../prototypes/ranch-atelier/dist/vendor/model-viewer.min.js', import.meta.url))); }
  const f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', f.endsWith('.gltf') ? 'model/gltf+json' : 'model/gltf-binary');
  fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => server.on('listening', r));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let n = 0, bad = [];
async function worker() {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  await page.goto(base + '/');
  await page.waitForFunction(() => customElements.get('model-viewer'), null, { timeout: 30000 });
  while (todo.length) {
    const m = todo.shift();
    try {
      await page.evaluate(src => new Promise((ok, no) => {
        const mv = document.getElementById('m');
        const t = setTimeout(() => no(new Error('timeout')), 60000);
        mv.addEventListener('load', () => { clearTimeout(t); ok(); }, { once: true });
        mv.addEventListener('error', e => { clearTimeout(t); no(new Error('load error')); }, { once: true });
        mv.setAttribute('camera-orbit', '-35deg 68deg auto'); mv.src = src;
      }), '/' + m.path);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.waitForTimeout(150);
      await page.locator('#m').screenshot({ path: path.join(out, m.key + '.png') });
    } catch (e) { bad.push([m.path, String(e.message || e)]); }
    if (++n % 25 === 0) console.log(n, 'done', bad.length, 'failed');
  }
}
await Promise.all([worker(), worker(), worker()]);
fs.writeFileSync(path.join(out, '_failed.json'), JSON.stringify(bad, null, 1));
console.log('finished', n, 'failed', bad.length);
await browser.close(); server.close();
