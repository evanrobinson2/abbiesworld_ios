// Cross-platform launcher for the Holodeck MCP server (used by the repo's .mcp.json).
// Installs dist/ dependencies on first use, then starts the stdio server.
const {execSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const dist=path.resolve(__dirname,'..');
if(!fs.existsSync(path.join(dist,'node_modules','ws'))||!fs.existsSync(path.join(dist,'node_modules','@modelcontextprotocol')))
 execSync('npm ci --no-audit --no-fund',{cwd:dist,stdio:['ignore',process.stderr,process.stderr],shell:true});
import(require('node:url').pathToFileURL(path.join(__dirname,'holodeck.mjs')).href);
