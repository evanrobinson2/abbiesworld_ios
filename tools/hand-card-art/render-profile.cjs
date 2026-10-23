// Side profiles for the Cards v3 profile mark (Evan, 2026-10-23: "one more little logo in the tile that shows it's shape?
// just profile outline?"): each tile's cartoon seen level from the side, nearly orthographic, traced to a closed outline
// in 0..1 units and written to cards/v3/profiles.json. node render-profile.cjs (needs the dist server on :8787).
const {chromium} = require('/opt/node-tools/node_modules/playwright'), fs = require('fs'), path = require('path');
const TYPE = {ranch: 'ranch', garden: 'crop', meadow: 'meadow', moon: 'moon'};
(async () => {
 const b = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
 const p = await b.newPage({viewport: {width: 1100, height: 1100}}); p.on('pageerror', e => console.log('page error', e.message));
 await p.route('http://localhost:8787/__cartoon.html', r => r.fulfill({body: fs.readFileSync(path.join(__dirname, 'cartoon.html')), contentType: 'text/html'}));
 await p.goto('http://localhost:8787/__cartoon.html'); await p.waitForFunction(() => window.ready);
 const out = {};
 for (const [id, type] of Object.entries(TYPE)) {
  const url = await p.evaluate(t => window.renderCartoon(t, {yaw: .45, pitch: .015, dist: 140, fov: 4.6, target: [0, 1.2, 0]}), type);
  out[id] = await p.evaluate(async src => {
   const img = new Image(); img.src = src; await img.decode();
   const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, img.width, img.height).data, W = img.width, H = img.height;
   const solid = (i, y) => d[(y * W + i) * 4 + 3] > 40;
   let x0 = W, x1 = 0, y0 = H, y1 = 0;
   for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (solid(i, y)) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
   // Walk up each column from the slab and stop at the first gap, so things in the air (butterflies) stay out.
   const n = 120, w = x1 - x0 + 1, raw = [];
   for (let k = 0; k <= n; k++) { const i = x0 + Math.round(k / n * (w - 1)); let y = y1; while (y >= y0 && !solid(i, y)) y--; if (y < y0) continue; while (y > y0 && solid(i, y - 1)) y--; raw.push([k / n, y]); }
   const ty = Math.min(...raw.map(r => r[1])), h = y1 - ty + 1;
   const top = raw.map(([u, y]) => [+u.toFixed(3), +((y - ty) / h).toFixed(3)]);
   return {aspect: +(w / h).toFixed(3), top};
  }, url);
  console.log(id, out[id].aspect, out[id].top.length);
 }
 fs.writeFileSync(path.join(__dirname, '../../prototypes/ranch-atelier/dist/cards/v3/profiles.json'), JSON.stringify(out));
 await b.close();
})();
