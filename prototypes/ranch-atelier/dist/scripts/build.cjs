require('node:child_process').execFileSync(process.execPath,['--no-warnings','--experimental-loader','./scripts/character-motion-loader.mjs','./scripts/check-character-motion.mjs'],{stdio:'inherit'});
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./check-mcp.cjs');
const output = path.resolve(root, 'public-build');
if (path.dirname(output) !== root || path.basename(output) !== 'public-build') throw new Error('Invalid output directory');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
const excluded = new Set(['node_modules','api','scripts','mcp','tests','public-build','package.json','package-lock.json','vercel.json']);
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (entry.name.startsWith('.') || excluded.has(entry.name) || entry.name.endsWith('.md')) continue;
  fs.cpSync(path.join(root, entry.name), path.join(output, entry.name), { recursive: true });
}
console.log('Public assets prepared; MCP scripts, tests and server credentials are not published.');

require('./build-tools.cjs').generate(root, output).catch(error => { console.error(error); process.exitCode=1; });
