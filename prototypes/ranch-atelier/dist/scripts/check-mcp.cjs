const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(n => n.endsWith('.html'));
const errors = [];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
  const bridge = scripts.filter(m => m[1].split('?')[0] === '/view-context.js' || m[1].split('?')[0] === 'view-context.js');
  if (bridge.length !== 1) errors.push(`${page}: expected exactly one view-context.js, found ${bridge.length}`);
  if (bridge[0] && scripts[0] !== bridge[0]) errors.push(`${page}: load the bridge before app scripts so providers can register`);
}
for (const page of pages) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(m=>m[1].split('?')[0]);
  const owners = scripts.filter(src => { const file=path.join(root,src.replace(/^\//,'')); return fs.existsSync(file) && /RanchActions\??\.register/.test(fs.readFileSync(file,'utf8')); });
  if(owners.length && (scripts.filter(src=>src==='/app-actions.js').length!==1 || owners.some(src=>scripts.indexOf(src)<scripts.indexOf('/app-actions.js')))) errors.push(`${page}: load app-actions.js exactly once before action providers`);
}
for (const rewrite of JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'))).rewrites || []) {
  if (rewrite.destination.endsWith('.html') && (!path.resolve(root, '.' + rewrite.destination).startsWith(root + path.sep) || !fs.existsSync(path.resolve(root, '.' + rewrite.destination)))) errors.push(`Missing route page: ${rewrite.destination}`);
}
for (const file of ['view-context.js', 'app-actions.js', 'storage-probe.js', 'storage-environment.js', 'neighborhood-mission.js', 'scene-generator.js', 'simulation-worker.js', 'mcp/ranch-view.mjs', ...fs.readdirSync(path.join(root,'api')).filter(n=>n.endsWith('.js')).map(n=>'api/'+n)]) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(result.stderr || `Syntax check failed: ${file}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const tests = fs.readdirSync(path.join(root, 'tests')).filter(n => n.endsWith('.test.cjs')).map(n => path.join(root, 'tests', n));
const tested = spawnSync(process.execPath, ['--test', '--test-concurrency=4', ...tests], { stdio: 'inherit' });
if (tested.status !== 0) process.exit(tested.status || 1);
const hash = createHash('sha256');
for (const file of [...pages, ...fs.readdirSync(root).filter(n => /\.(js|css)$/.test(n)), ...fs.readdirSync(path.join(root,'api')).filter(n=>n.endsWith('.js')).map(n=>'api/'+n)].sort()) hash.update(file).update(fs.readFileSync(path.join(root, file)));
const manifest = { buildId: hash.digest('hex').slice(0, 16), bridgeVersion: '2.0.0', pages: pages.length };
fs.writeFileSync(path.join(root, 'view-build.json'), JSON.stringify(manifest));
console.log(`MCP build gate passed: ${pages.length} pages, build ${manifest.buildId}`);
module.exports = { root, manifest };
