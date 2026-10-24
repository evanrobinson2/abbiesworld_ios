// Headless run of Halloween mode in the real Winchester page: node tests/halloween-mode.headless.cjs [screenshot-dir]
// Serves this folder, opens the town with the mode on, knocks five doors and checks the treats, the charm, the light and that nothing throws.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..'), shots = process.argv[2];
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml'};
const server = http.createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res); });
(async () => {
  await new Promise(r => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
  const errors = [];
  async function open(query) { const page = await browser.newPage({viewport: {width: 1100, height: 760}}); page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|fonts|favicon/i.test(m.text())) errors.push(m.text()); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); await page.goto(`${base}/studies/abbietown/index.html?play&${query}`); return page; }
  // 1. off by default: nothing is added to the town
  const off = await open('');
  await off.waitForFunction(() => window.AbbieHalloween, null, {timeout: 60000});
  assert.equal(await off.evaluate(() => window.AbbieHalloween.on), false, 'off until the experiment is switched on');
  assert.equal(await off.evaluate(() => typeof window.AbbieTown.lookFilter), 'undefined');
  await off.close();
  // 2. on: doors, lanterns, light, trick-or-treating, charm
  const page = await open('halloween=on');
  await page.waitForFunction(() => window.AbbieHalloween?.on && window.AbbieHalloween.doors.length > 0, null, {timeout: 60000});
  const doors = await page.evaluate(() => window.AbbieHalloween.doors.length); assert.ok(doors >= 7, 'doors on the board: ' + doors);
  assert.equal(await page.evaluate(() => typeof window.AbbieTown.lookFilter), 'function');
  const lit = await page.evaluate(() => { const l = window.AbbieTown.lookFilter({bg: '#cfe2ea', sky: '#e2f0ff', gnd: '#7a6a4a', sun: '#fff0d6', sunI: 2.4, hemiI: 1.15}); return l.bg !== '#cfe2ea' && l.sunI < 2.4; }); assert.ok(lit, 'the look is graded toward dusk');
  const names = await page.evaluate(() => { const n = new Set(); window.AbbieTown.scene.traverse(o => { if (o.name) n.add(o.name); }); return ['jack-o-lantern', 'bat', 'pumpkin rib'].filter(x => n.has(x)); }); assert.deepEqual(names, ['jack-o-lantern', 'bat', 'pumpkin rib']);
  await page.evaluate(() => { localStorage.removeItem('aw-halloween-night'); });
  await page.waitForFunction(() => window.AbbieInventory, null, {timeout: 30000});
  await page.waitForTimeout(1500);
  const ids = await page.evaluate(() => window.AbbieHalloween.doors.slice(0, 5).map(d => d.id));
  for (const id of ids) { await page.evaluate(i => window.AbbieHalloween.knockAt(i), id); await page.waitForTimeout(1100); }
  await page.waitForTimeout(3200);
  const got = await page.evaluate(() => window.AbbieInventory.list().filter(i => i.id.startsWith('hw-')).length); assert.equal(got, 5, 'five treats in the backpack: ' + got);
  const charm = await page.evaluate(() => JSON.parse(localStorage.getItem('aw-backpack') || localStorage.getItem('aw-backpack-v1') || '{}'));
  const earned = await page.evaluate(async () => (await import('/simulations/backpack.mjs?v=14')).earnedCharms().includes('pumpkin')); assert.ok(earned, 'the pumpkin charm hangs on the backpack');
  await page.evaluate(i => window.AbbieHalloween.knockAt(i), ids[0]); await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => window.AbbieInventory.list().filter(i => i.id.startsWith('hw-')).length), 5, 'a door gives one treat a night');
  const talking = await page.evaluate(() => { const b = document.querySelector('.hw-bubble'); return b && !b.hidden ? b.textContent : ''; });
  // a real tap on a lit porch, from the screen, not the test hook
  await page.evaluate(() => { localStorage.removeItem('aw-halloween-night'); });
  if (shots) { fs.mkdirSync(shots, {recursive: true}); await page.screenshot({path: path.join(shots, 'halloween-town.png')}); }
  assert.deepEqual(errors, [], 'no errors in the page: ' + errors.join(' | '));
  console.log('ok: doors', doors, 'treats', got, 'charm', earned, 'bubble', JSON.stringify(talking));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
