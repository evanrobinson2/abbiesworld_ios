// Filmstrips of each rep's animations (onion-skin frames in one row), for the study page and for judging by eye.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IMG = join(ROOT, 'prototypes/ranch-atelier/dist/studies/rigging/img');
const BASE = process.env.BASE || 'http://localhost:8099';
const JOBS = [['rep5-side', 'jump', 9], ['rep6-motion', 'jump', 9], ['rep6-motion', 'walk', 8], ['mannequin-front', 'wave', 6], ['mannequin-front', 'cheer', 8]];
const page = await (await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })).newPage({ viewport: { width: 1800, height: 420 } });
await page.goto(BASE + '/studies/rigging/rigs/rep1-rect.json');
for (const [id, anim, n] of JOBS) {
  const area = await page.evaluate(async ({ BASE, id, anim, n }) => {
    const m = await import(BASE + '/simulations/rig2d.mjs');
    const rig = m.loadRig(await (await fetch(BASE + `/studies/rigging/rigs/${id}.json`)).json());
    const a = rig.animations[anim];
    let s = '', areas = [];
    for (let i = 0; i < n; i++) {
      const t = a.duration * i / n, p = m.sample(a, t);
      areas.push((p.root.sx ?? 1) * (p.root.sy ?? 1));
      s += `<g transform="translate(${i * 200 + 100} 400)">${m.renderSVG(rig, p)}<text y="24" x="-90" font: font-family="monospace" font-size="16" fill="#555">${t.toFixed(2)} s</text></g>`;
    }
    document.body.innerHTML = `<style>${m.RIG_CSS} body{margin:0;background:#eef1ea}</style><svg class="rig2d" width="${n * 200}" height="420" viewBox="0 -170 ${n * 200}" style="display:block">${s}</svg>`;
    document.querySelector('svg').setAttribute('viewBox', `0 -200 ${n * 200} 630`);
    document.querySelector('svg').setAttribute("height", 630);
    return areas;
  }, { BASE, id, anim, n });
  await page.setViewportSize({ width: n * 200, height: 630 });
  await page.locator('svg').screenshot({ path: join(IMG, `${id}-${anim}-strip.png`) });
  console.log(id, anim, 'area per frame', area.map(x => x.toFixed(2)).join(' '));
}
process.exit(0);
