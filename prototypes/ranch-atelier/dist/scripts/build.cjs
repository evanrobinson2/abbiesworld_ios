require('node:child_process').execFileSync(process.execPath,['./scripts/check-navigation-build.mjs'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,['--no-warnings','--experimental-loader','./scripts/character-motion-loader.mjs','./scripts/check-character-motion.mjs'],{stdio:'inherit'});
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./check-mcp.cjs');
const output = path.resolve(root, 'public-build');
if (path.dirname(output) !== root || path.basename(output) !== 'public-build') throw new Error('Invalid output directory');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
const excluded = new Set(['node_modules','api','scripts','mcp','tests','public-build','package.json','package-lock.json','vercel.json']);
// Blender working files (about 150 MB) stay in the repo as each asset's source, but no page loads them; only the one
// offered as a download on /asset-studies is published.
const published = src => !/\.blend1$/.test(src) && (!/\.blend$/.test(src) || path.relative(root, src).startsWith('asset-studies' + path.sep));
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.name.startsWith('.') || excluded.has(entry.name) || entry.name.endsWith('.md')) continue;
  fs.cpSync(path.join(root, entry.name), path.join(output, entry.name), { recursive: true, filter: published });
}
console.log('Public assets prepared; MCP scripts, tests and server credentials are not published.');
// Release stamp for the app's "new version ready" card (app-feedback.js); Vercel fills these for Git deployments.
const env = process.env;
fs.writeFileSync(path.join(output, 'app-release.json'), JSON.stringify({ buildId: require('./check-mcp.cjs').manifest.buildId, sha: env.VERCEL_GIT_COMMIT_SHA || '', ref: env.VERCEL_GIT_COMMIT_REF || '', message: (env.VERCEL_GIT_COMMIT_MESSAGE || '').slice(0, 600), builtAt: new Date().toISOString() }));

require('./build-tools.cjs').generate(root, output).catch(error => { console.error(error); process.exitCode=1; });
