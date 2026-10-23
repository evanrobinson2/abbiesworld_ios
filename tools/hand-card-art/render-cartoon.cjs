// Renders the hand-card cartoons: node render-cartoon.cjs <out-dir> [size] (needs the dist server on :8787, see README).
// size is the render size before the 2x downsample (default 2048, so 1024 px out; Cards v3 uses 4096 for 2048 px art).
const {chromium} = require(fs_exists('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : 'playwright'), fs = require('fs'), path = require('path');
const VIEWS = {ranch: {}, garden: {}, meadow: {dist: 21, target: [0, 0, 0]}, moon: {}};
const TYPE = {ranch: 'ranch', garden: 'crop', meadow: 'meadow', moon: 'moon'};
(async () => {
 const out = process.argv[2] || '.', b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
 const p = await b.newPage({viewport: {width: 1100, height: 1100}}); p.on('pageerror', e => console.log('page error', e.message));
await p.addInitScript(size => { window.CARTOON_SIZE = size; }, +(process.argv[3] || 2048));
 await p.route('http://localhost:8787/__cartoon.html', r => r.fulfill({body: fs.readFileSync(path.join(__dirname, 'cartoon.html')), contentType: 'text/html'}));
 await p.goto('http://localhost:8787/__cartoon.html'); await p.waitForFunction(() => window.ready);
 for (const [id, view] of Object.entries(VIEWS)) {
  const url = await p.evaluate(([t, v]) => window.renderCartoon(t, v), [TYPE[id], view]);
  fs.writeFileSync(path.join(out, 'cartoon-' + id + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('rendered', id);
 }
 await b.close();
})();
function fs_exists(p) { try { require('fs').accessSync(p); return true; } catch { return false; } }
