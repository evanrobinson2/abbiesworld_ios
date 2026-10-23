// Static server for dist honoring vercel.json rewrites (exact and :param), used by capture scripts.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
export function serve(rootArg){
const root=path.resolve(rootArg);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const rewrites=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites||[];
const resolve=url=>{const p=decodeURIComponent(url.split('?')[0]);const hit=rewrites.find(r=>r.source===p&&!r.destination.startsWith('http'));return hit?hit.destination:p;};
const server=http.createServer((req,res)=>{let file=path.join(root,resolve(req.url));if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}).listen(0);
return {server,port:server.address().port};}
