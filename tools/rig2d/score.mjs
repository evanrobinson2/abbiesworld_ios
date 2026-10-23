// AW-STUDY-0041 scorer: renders each rep in headless Chromium with the shared kit and measures the joints.
// Needs a static server on the dist folder: npx http-server prototypes/ranch-atelier/dist -p 8099
// node tools/rig2d/score.mjs  -> docs/oracle/rigging/scores.json and studies/rigging/img/*.png
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const IMG = join(ROOT, 'prototypes/ranch-atelier/dist/studies/rigging/img');
mkdirSync(IMG, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8099';

// Stress poses: the joints bent near their range of motion (anatomy.json joints), plus a crouch for the side view.
const STRESS = {
  front: {
    bones: { uarmR: { rotate: 70 }, farmR: { rotate: 125 }, uarmL: { rotate: -150 }, farmL: { rotate: -60 }, handL: { rotate: -40 },
      thighR: { rotate: 50 }, shinR: { rotate: -95 }, thighL: { rotate: -12 }, head: { rotate: 22 }, chest: { rotate: 10 }, footR: { rotate: -30 } },
  },
  side: {
    bones: { hips: { y: 40 }, chest: { rotate: 25 }, head: { rotate: -20 }, uarmL: { rotate: -100 }, farmL: { rotate: -110 }, uarmR: { rotate: 60 }, farmR: { rotate: -90 } },
    ik: { footL: { x: 30, y: -12.3, angle: 12 }, footR: { x: -20, y: -12.3, angle: 12 } },
  },
};
const JOINTS = ['uarmR:farmR', 'uarmL:farmL', 'farmL:handL', 'farmR:handR', 'thighR:shinR', 'thighL:shinL', 'shinR:footR', 'shinL:footL', 'chest:head', 'abdomen:chest'];

const page = await (await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })).newPage({ viewport: { width: 1000, height: 1000 } });
await page.goto(BASE + '/studies/rigging/rigs/mannequin-front.json');
const reps = ['rep1-rect', 'rep2-capsule', 'rep3-forms', 'rep4-patch', 'rep5-side', 'rep6-motion'];
const out = {};
for (const id of reps) {
  const r = await page.evaluate(async ({ BASE, id, STRESS, JOINTS }) => {
    const m = await import(BASE + '/simulations/rig2d.mjs');
    const rig = m.loadRig(await (await fetch(BASE + `/studies/rigging/rigs/${id}.json`)).json());
    const pose = STRESS[rig.view];
    const W = m.solve(rig, JSON.parse(JSON.stringify(pose)));
    const draw = (p, bg) => {
      document.body.innerHTML = `<style>${m.RIG_CSS} body{margin:0;background:${bg}}</style>` +
        `<svg class="rig2d" xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="-280 -530 560 560">${m.renderSVG(rig, p)}</svg>`;
    };
    // Rasterise the SVG to read pixels.
    const raster = async () => {
      const svg = document.querySelector('svg');
      const css = document.querySelector('style').textContent;
      const s = new XMLSerializer().serializeToString(svg).replace('>', `><style>${css}</style>`);
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
      await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = 1000;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 1000); g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, 1000, 1000).data;
    };
    draw(JSON.parse(JSON.stringify(pose)), '#fff');
    const px = await raster();
    document.querySelector('style').textContent += '.rig2d path,.rig2d ellipse{fill:#000!important;stroke:none!important}';
    const mk = await raster();
    const inMask = (x, y) => { const X = Math.round((x + 280) * 1000 / 560), Y = Math.round((y + 530) * 1000 / 560); return mk[(Y * 1000 + X) * 4] < 128; };
    const interior = (x, y) => [0, 45, 90, 135, 180, 225, 270, 315].every(t => inMask(x + 2.6 * Math.cos(t * Math.PI / 180), y + 2.6 * Math.sin(t * Math.PI / 180)));
    const at = (x, y) => { const X = Math.round((x + 280) * 1000 / 560), Y = Math.round((y + 530) * 1000 / 560); const i = (Y * 1000 + X) * 4; return [px[i], px[i + 1], px[i + 2]]; };
    const isBg = c => c[0] > 245 && c[1] > 245 && c[2] > 245;
    const isInk = c => c[0] < 70 && c[1] < 80 && c[2] < 90;
    const res = [];
    for (const pair of JOINTS) {
      const [a, b] = pair.split(':');
      if (!W[b]) continue;
      const [x, y] = [W[b].x, W[b].y];
      // radius: the joint disc's size, read off the child's rest piece width (the smaller of the two)
      const rr = { farm: 9, hand: 6.5, shin: 12, foot: 7, uarm: 13, head: 11, chest: 16 }[b.replace(/[RL]$/, '')] || 8;
      let n = 0, gap = 0, ink = 0, m = 0;
      for (let rad = .5; rad <= rr * 1.6; rad += .5) for (let t = 0; t < 360; t += 4) {
        const X = x + rad * Math.cos(t * Math.PI / 180), Y = y + rad * Math.sin(t * Math.PI / 180), c = at(X, Y);
        if (rad <= rr * .8) { n++; if (isBg(c)) gap++; }
        if (interior(X, Y)) { m++; if (isInk(c)) ink++; }
      }
      // gap: background showing inside the joint disc; seam: ink lines inside the body's silhouette near the joint
      res.push({ joint: pair, gap: gap / n, seam: m ? ink / m : 0 });
    }
    // proportion check against the canon: segment lengths in heads (56 px per head)
    const L = n => rig.by[n].length / 56;
    const prop = { upper_arm: L('uarmL'), forearm: L('farmL'), thigh: L('thighL'), shin: L('shinL') };
    return { view: rig.view, joints: res, prop };
  }, { BASE, id, STRESS, JOINTS });
  const gap = r.joints.reduce((s, j) => s + j.gap, 0) / r.joints.length;
  const seam = r.joints.reduce((s, j) => s + j.seam, 0) / r.joints.length;
  out[id] = { ...r, joint_cover: +(1 - gap).toFixed(3), seam_ink: +seam.toFixed(3) };
  // pictures: rest and stress, for the page
  for (const [tag, pose] of [['rest', {}], ['stress', STRESS[r.view]]]) {
    await page.evaluate(async ({ BASE, id, pose }) => {
      const m = await import(BASE + '/simulations/rig2d.mjs');
      const rig = m.loadRig(await (await fetch(BASE + `/studies/rigging/rigs/${id}.json`)).json());
      document.body.innerHTML = `<style>${m.RIG_CSS} body{margin:0;background:#eef1ea}</style>` +
        `<svg class="rig2d" width="600" height="600" viewBox="-280 -530 560 560">${m.renderSVG(rig, JSON.parse(JSON.stringify(pose)))}</svg>`;
    }, { BASE, id, pose });
    await page.locator('svg').screenshot({ path: join(IMG, `${id}-${tag}.png`) });
  }
  console.log(id, out[id].joint_cover, out[id].seam_ink);
}
writeFileSync(join(ROOT, 'docs/oracle/rigging/scores.auto.json'), JSON.stringify(out, null, 1));
process.exit(0);
