// Renders the Character Studio's picture blocks from the studio itself, so the tiles always match what plays.
//   node tools/character-studio/thumbs.mjs [http://localhost:8765/studies/character-studio/]
// Serve prototypes/ranch-atelier/dist first (python3 -m http.server 8765). Writes into studies/character-studio/img/:
//   moves.jpg       one 156 px tile per move, 10 a row, in MOVES order (the drawer's pose tiles and genre icons)
//   body-<id>.jpg   one per cast body that isn't hidden
//   dir-<id>.jpg    one per art direction, on the red Meshy brute
import {chromium} from 'playwright';
import {execFileSync} from 'child_process';
import {mkdirSync, mkdtempSync} from 'fs';
import {tmpdir} from 'os';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const base = process.argv[2] || 'http://localhost:8765/studies/character-studio/';
const out = join(dirname(fileURLToPath(import.meta.url)), '../../prototypes/ranch-atelier/dist/studies/character-studio/img');
const tmp = mkdtempSync(join(tmpdir(), 'cs-thumbs-'));
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport: {width: 312, height: 312}});
await page.goto(base + 'index.html#idle');
await page.waitForFunction(() => window.studio?.ready(), null, {timeout: 180000});
await page.evaluate(() => { document.querySelectorAll('body > *:not(canvas)').forEach(e => { e.style.visibility = 'hidden'; }); });

// a three-quarter view, figure filling the tile; plain render for flat, readable tiles
async function shot(file, {id, f = .4, body, dir, plain = true, dist = 4.2}) {
 await page.evaluate(async ([id, f, body, dir, plain]) => {
  const s = window.studio; s.plain(plain);
  if (body) await s.body(body);
  if (dir) s.dir(dir);
  s.real(true); s.pick(id); s.freeze(f * s.activeLen());
 }, [id, f, body, dir, plain]);
 await page.waitForTimeout(500);
 await page.evaluate(d => {
  // frame the body itself (one-shot captures step about), from a little above so the floor fills the tile
  const s = window.studio, box = new s.camera.position.constructor(), lo = box.clone().setScalar(1e9), hi = box.clone().setScalar(-1e9);
  s.scene.traverse(o => { if (o.isBone) { o.getWorldPosition(box); lo.min(box); hi.max(box); } });
  const c = lo.clone().add(hi).multiplyScalar(.5), h = Math.max(hi.y - lo.y, hi.x - lo.x, hi.z - lo.z, 1.2);
  s.controls.target.copy(c); s.camera.position.set(c.x + d * .42 * h / 1.8, c.y + .9 * h / 1.8, c.z + d * .9 * h / 1.8); s.camera.lookAt(c);
 }, dist);
 await page.waitForTimeout(350);
 await page.screenshot({path: file});
}

const moves = await page.evaluate(() => window.studio.moves.map(m => m.id));
const tiles = [];
for (const [i, id] of moves.entries()) { const f = join(tmp, `m${String(i).padStart(2, '0')}.png`); await shot(f, {id, body: i ? null : 'red', dir: i ? null : 'studio'}); tiles.push(f); }
execFileSync('montage', [...tiles, '-tile', '10x', '-geometry', '156x156+0+0', '-quality', '82', join(out, 'moves.jpg')]);

const {bodies, dirs} = await page.evaluate(async () => {
 const b = await import('./bodies.mjs'), d = await import('./directions.mjs');
 return {bodies: b.BODIES.filter(x => !x.hidden).map(x => x.id), dirs: d.DIRECTIONS.map(x => x.id)};
});
for (const id of bodies) { const f = join(tmp, `b-${id}.png`); await shot(f, {id: 'idle', f: .3, body: id, dir: 'studio', plain: false}); execFileSync('convert', [f, '-resize', '160x160', '-quality', '82', join(out, `body-${id}.jpg`)]); }
for (const id of dirs) { const f = join(tmp, `d-${id}.png`); await shot(f, {id: 'wave', f: .45, body: 'red', dir: id, plain: false}); execFileSync('convert', [f, '-resize', '160x160', '-quality', '82', join(out, `dir-${id}.jpg`)]); }
await page.evaluate(() => window.studio.dir('studio'));
await browser.close();
console.log('wrote', moves.length, 'move tiles,', bodies.length, 'bodies,', dirs.length, 'directions to', out);
