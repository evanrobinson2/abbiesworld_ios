// The run half of the gate: plays every `live` registry entry end to end in headless Chromium and fails if any run does not
// reach its pass marker, exits non-zero, or throws a page error ("err " lines). Serves prototypes/ranch-atelier/dist on :8765.
//   node tools/game-registry/run-tests.mjs [--only <id>] [--shots <dir>]
// Run from the repo root with playwright resolvable (CI installs it in tools/game-feel-check; set PLAYWRIGHT to its path).
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const DIST = path.resolve('prototypes/ranch-atelier/dist');
const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
const only = opt('--only'), shots = path.resolve(opt('--shots') || 'game-test-shots');
fs.mkdirSync(shots, {recursive: true});
const TYPES = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.wasm': 'application/wasm'};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(res);
}).listen(8765);

const reg = JSON.parse(fs.readFileSync(path.join(DIST, 'simulations/game-registry.json'), 'utf8'));
const live = reg.entries.filter(e => e.status === 'live' && (!only || e.id === only));
// one run per distinct script+args (the café and the basement share a route)
const runs = new Map();
for (const e of live) { const k = e.test.script + ' ' + (e.test.args || []).join(' '); (runs.get(k) || runs.set(k, {test: e.test, ids: []}).get(k)).ids.push(e.id); }

const results = [];
for (const [key, {test, ids}] of runs) {
  const prefix = path.join(shots, ids[0] + '-');
  const argv = [test.script, ...(test.args || [])]; if (/-flow\.cjs$/.test(test.script)) argv.push(prefix); else if (/route-/.test(test.script)) argv.push(prefix);
  const t0 = Date.now();
  const out = await new Promise(resolve => {
    const c = spawn('node', argv, {env: process.env}); let buf = '';
    const kill = setTimeout(() => { buf += '\nTIMEOUT'; c.kill('SIGKILL'); }, 25 * 60 * 1000);
    c.stdout.on('data', d => { buf += d; process.stdout.write(d); }); c.stderr.on('data', d => { buf += d; process.stderr.write(d); });
    c.on('close', code => { clearTimeout(kill); resolve({code, buf}); });
  });
  const pageErrors = out.buf.split('\n').filter(l => /^err /.test(l));
  const ok = out.code === 0 && out.buf.includes(test.marker) && !pageErrors.length && !/^FAIL /m.test(out.buf);
  results.push({ids, key, ok, seconds: Math.round((Date.now() - t0) / 1000), why: ok ? '' : out.code !== 0 ? `exit ${out.code}` : pageErrors.length ? pageErrors[0] : `no "${test.marker}"`});
}
server.close();
console.log('\n== game test runs ==');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.ids.join(', ')}  (${r.seconds}s)${r.ok ? '' : '  ' + r.why}`);
fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify(results, null, 1));
process.exit(results.every(r => r.ok) ? 0 : 1);
