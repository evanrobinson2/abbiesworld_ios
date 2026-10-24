// Local test server for the farm preview: preview/wright-farm/ at /, everything else from the Ranch site's dist (models, vendor, simulations).
//   node tools/farm/serve.mjs [port]      then open http://localhost:8123/   (or /?shot=1 for a still)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), dist = path.join(root, 'prototypes/ranch-atelier/dist'), prev = path.join(root, 'preview/wright-farm');
const types = {'.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.css': 'text/css'};
http.createServer((req, res) => {
 const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); let f = path.join(prev, u === '/' ? 'index.html' : u);
 if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, u);
 if (!f.startsWith(prev) && !f.startsWith(dist)) { res.writeHead(403); return res.end(); }
 fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, {'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store'}); res.end(b); });
}).listen(+process.argv[2] || 8123, () => console.log('farm preview on http://localhost:' + (+process.argv[2] || 8123) + '/'));
