// One-command advance artifact (speedup from the Grace's basement review): copy study pages and everything they load
// from the site into one folder that the claude.ai Artifact tool can publish as a multi-file artifact.
//   node tools/advance-artifact/bundle.mjs <out-dir> <page.html> [more pages...]   (pages relative to the site root)
// - follows every quoted absolute path ('/simulations/x.mjs', "/studies/a/b.jpg", ...) and relative import that
//   names a real file under prototypes/ranch-atelier/dist, in HTML, JS and JSON
// - rewrites those paths to relative ones, so the bundle works from any URL
// - points the importmap's "three" at jsdelivr (the artifact can't reach /vendor/three.module.js)
// - the first page becomes index.html; prints the files map to pass to the Artifact tool
import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../prototypes/ranch-atelier/dist');
const [out, ...pages] = process.argv.slice(2);
if (!out || !pages.length) { console.error('usage: bundle.mjs <out-dir> <page.html>...'); process.exit(1); }
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const TEXT = /\.(html|m?js|json|css)$/;
const seen = new Map(); // site path -> bundle path
const first = '/' + pages[0].replace(/^\//, ''), bundlePath = p => (p === first ? 'index.html' : p.replace(/^\//, ''));
function visit(site) {
 if (seen.has(site)) return; const file = path.join(root, site); if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return;
 seen.set(site, bundlePath(site));
 if (!TEXT.test(site)) return;
 let src = fs.readFileSync(file, 'utf8');
 const refs = new Set();
 for (const m of src.matchAll(/(['"`])(\/[A-Za-z0-9_\-./]+\.[a-z0-9]{2,5})\1/g)) refs.add(m[2]);
 for (const m of src.matchAll(/(?:from|import\()\s*(['"])(\.{1,2}\/[^'"]+)\1/g)) refs.add(path.posix.join(path.posix.dirname(site), m[2]));
 for (const m of src.matchAll(/(?:src|href)=(['"])(?!https?:|\/|#|data:)([^'"?#]+\.[a-z0-9]{2,5})(?:[?#][^'"]*)?\1/g)) refs.add(path.posix.join(path.posix.dirname(site), m[2]));
 for (const m of src.matchAll(/three\/addons\/([A-Za-z0-9_\-./]+\.js)/g)) refs.add('/vendor/' + m[1]);
 refs.delete('/vendor/three.module.js'); // three comes from jsdelivr
 for (const r of refs) if (fs.existsSync(path.join(root, r)) && !fs.statSync(path.join(root, r)).isDirectory()) visit(r);
}
for (const p of pages) visit('/' + p.replace(/^\//, ''));
fs.rmSync(out, {recursive: true, force: true});
const files = {};
for (const [site, rel] of seen) {
 const dest = path.join(out, rel); fs.mkdirSync(path.dirname(dest), {recursive: true});
 if (!TEXT.test(site)) { fs.copyFileSync(path.join(root, site), dest); files[rel] = rel; continue; }
 let src = fs.readFileSync(path.join(root, site), 'utf8');
 const here = path.posix.dirname('/' + rel);
 src = src.replace(/(['"`])(\/[A-Za-z0-9_\-./]+\.[a-z0-9]{2,5})\1/g, (all, q, p) => {
  if (!seen.has(p)) return all; let r = path.posix.relative(here, '/' + seen.get(p)); if (!r.startsWith('.')) r = './' + r; return q + r + q;
 });
 // links between bundled pages that were relative on the site stay correct only if the folder layout is kept; the
 // first page moved to index.html, so point sibling-relative links from it back at their bundled paths
 if (rel === 'index.html' && path.posix.dirname(site) !== '/') {
  const dir = path.posix.dirname(site);
  src = src.replace(/((?:src|href)=)(['"])(?!https?:|\/|#|data:)([^'"]+)\2/g, (all, a, q, p) => { const abs = path.posix.join(dir, p.split(/[?#]/)[0]); return seen.has(abs) ? a + q + seen.get(abs) + p.slice(p.split(/[?#]/)[0].length) + q : all; });
 }
 src = src.replace(/"three":\s*"[^"]+"/, `"three":"${THREE}"`).replace(/"three\/addons\/":\s*"[^"]+"/, `"three/addons/":"${path.posix.relative(here, '/vendor') || '.'}/"`);
 fs.writeFileSync(dest, src); if (rel !== 'index.html') files[rel] = rel;
}
// .mjs has no media type the Artifact tool infers, so name it
const entry = k => k.endsWith('.mjs') ? {from: path.join(out, k), contentType: 'text/javascript'} : path.join(out, k);
console.log(JSON.stringify({page: path.join(out, 'index.html'), files: Object.fromEntries(Object.keys(files).map(k => [k, entry(k)]))}, null, 1));
