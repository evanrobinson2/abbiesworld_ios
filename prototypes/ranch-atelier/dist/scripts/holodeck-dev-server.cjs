// Local-only harness: serves dist/ with the production rewrites and the real Holodeck relay.
// Open http://127.0.0.1:4320/sandbox?creator=<room> and point the Creator at ws://127.0.0.1:4320/api/holodeck.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {attach}=require('../lib/holodeck-relay.cjs');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT)||4320;
const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.mp3':'audio/mpeg'};
const routes=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');let pathname=decodeURIComponent(url.pathname);
 const route=routes.find(r=>r.source===pathname&&(!r.has||r.has.every(h=>url.searchParams.get(h.key)===h.value)));if(route)pathname=route.destination;if(pathname==='/')pathname='/index.html';
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||/[\\/](api|mcp|node_modules|scripts|tests)[\\/]/.test(file.slice(root.length))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
attach(server);
server.listen(port,'127.0.0.1',()=>console.log('Holodeck dev server on http://127.0.0.1:'+port));
