// A headless test bench for Grace's computer (AW-STUDY-0024): boots the real FreeDOS in v86 inside Chromium, puts a
// floppy in drive A and lets a script type, hold keys, read the text screen and save pictures of the CRT.
//   const {bench} = require('./dosrun.cjs');
//   const b = await bench({files: {'GFX.COM': '/path/GFX.COM'}});   // or {disk: '/path/image.img.gz'}
//   await b.cmd('A:'); await b.cmd('GFX'); await b.hold('ArrowLeft', 800); await b.shot('/tmp/x.png'); await b.close();
// Needs the dist folder served on :8765 (python3 -m http.server 8765 from prototypes/ranch-atelier/dist).
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');
const {execFileSync} = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const HERE = __dirname, MKDISK = path.join(HERE, '..', 'mkdisk.py');
exports.bench = async function bench({files = {}, disk = null, port = 8765} = {}) {
 const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dosrun-'));
 if (!disk) {
  const img = path.join(tmp, 'test.img'), list = Object.entries(files).map(([n, f]) => f + (path.basename(f) === n ? '' : '=' + n));
  execFileSync('python3', [MKDISK, 'floppy', img, 'TEST', ...list]); execFileSync('gzip', ['-9nf', img]); disk = img + '.gz';
 }
 const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']});
 const p = await b.newPage({viewport: {width: 800, height: 500}});
 p.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('console', m.text()); }); p.on('pageerror', e => console.log('pageerror', e.message));
 await p.route('**/__bench.html', r => r.fulfill({contentType: 'text/html', body: `<body style="margin:0;background:#000"><script type="module">
  import {GracePC} from '/simulations/grace-pc.mjs'; const found = []; window.found = found;
  window.pc = new GracePC({found: id => found.push(id)}); window.GracePC = GracePC;</script>`}));
 await p.route('**/disks/testdisk.img.gz', r => r.fulfill({contentType: 'application/gzip', body: fs.readFileSync(disk)}));
 await p.goto(`http://localhost:${port}/__bench.html`); await p.waitForFunction(() => window.pc);
 const t = {
  page: p, tmp,
  text: () => p.evaluate(() => pc.text.map(r => r.join('').trimEnd()).join('\n').replace(/\n+$/, '')),
  async waitText(re, ms = 120000) { const t0 = Date.now(); for (;;) { const s = await t.text(); if (new RegExp(re).test(s)) return s; if (Date.now() - t0 > ms) throw Error('timeout waiting for ' + re + '\n' + s); await p.waitForTimeout(250); } },
  async tick() { await p.evaluate(() => pc.tick()); },
  async type(s, gap = 40) { for (const c of s) { await p.evaluate(c => pc.key(c), c); await p.waitForTimeout(gap); } },
  async press(k) { await p.evaluate(k => pc.key(k), k); },
  async cmd(s) { await t.type(s); await t.press('Enter'); await p.waitForTimeout(300); },
  async hold(k, ms) { await p.evaluate(k => pc.keyDown(k), k); await p.waitForTimeout(ms); await p.evaluate(k => pc.keyUp(k), k); },
  async shot(file) { await t.tick(); const d = await p.evaluate(() => pc.canvas.toDataURL('image/png')); fs.writeFileSync(file, Buffer.from(d.split(',')[1], 'base64')); },
  found: () => p.evaluate(() => window.found.slice()),
  close: () => b.close(),
 };
 await p.evaluate(() => pc.powerOn()); await t.waitText(/[A-Z]:\\.*>/);
 await p.evaluate(() => pc.insert({id: 'testdisk'})); await p.waitForTimeout(1500);
 return t;
};
