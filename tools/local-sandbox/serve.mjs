// Local Abbie's World: serves prototypes/ranch-atelier/dist on http://localhost:5173 the way Vercel does.
// Honours vercel.json rewrites (exact, :param and :path*), proxies /r2/* to the public R2 bucket, never caches.
// /app-release.json is stamped from git: the main commit this copy contains. When live runs that same commit, the
// stamp is live's own, so the version label in the corner reads exactly as it does on abbies.world.
// Usage (from the repo root): node tools/local-sandbox/serve.mjs [port]   then open http://localhost:5173/sandbox
import http from 'node:http';import https from 'node:https';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../prototypes/ranch-atelier/dist');
const port=Number(process.argv[2]||process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.bin':'application/octet-stream','.wasm':'application/wasm','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.ktx2':'image/ktx2','.hdr':'application/octet-stream'};
const rules=(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites||[]).map(r=>{
  const keys=[];const re=new RegExp('^'+r.source.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/:(\w+)\*/g,(_,k)=>{keys.push(k);return '(.*)';}).replace(/:(\w+)/g,(_,k)=>{keys.push(k);return '([^/]+)';})+'$');
  return {re,keys,dest:r.destination};});
function rewrite(p){for(const r of rules){const m=r.re.exec(p);if(!m)continue;let d=r.dest;r.keys.forEach((k,i)=>{d=d.replace(new RegExp(':'+k+'\\*?','g'),m[i+1]);});return d;}return p;}
const git=(...a)=>{try{return execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();}catch{return '';}};
async function release(){
  git('fetch','-q','origin','main');
  const sha=git('merge-base','HEAD','origin/main')||git('rev-parse','HEAD'),head=git('rev-parse','HEAD');
  const live=await fetch('https://abbies.world/app-release.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(live?.sha===sha)return {...live,local:true,head};
  return {buildId:'local',sha:head,ref:git('rev-parse','--abbrev-ref','HEAD'),message:git('log','-1','--format=%B',sha).slice(0,600),builtAt:git('log','-1','--format=%cI',sha),main:sha,local:true,liveSha:live?.sha||''};
}
function proxy(url,res){https.get(url,up=>{res.writeHead(up.statusCode,{'content-type':up.headers['content-type']||'application/octet-stream','access-control-allow-origin':'*'});up.pipe(res);}).on('error',()=>{res.writeHead(502);res.end();});}
http.createServer((req,res)=>{
  const [p,q='']=req.url.split('?');
  if(p==='/app-release.json')return release().then(r=>{res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(r));});let dest=rewrite(decodeURIComponent(p));
  if(/^https?:/.test(dest))return proxy(dest+(q?'?'+q:''),res);
  let file=path.join(root,dest);
  if(!file.startsWith(root)){res.writeHead(403);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)&&fs.existsSync(file+'.html'))file+='.html';
  if(!fs.existsSync(file)){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'content-type':types[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(file).pipe(res);
}).listen(port,()=>console.log(`Abbie's World running locally: http://localhost:${port}/sandbox`));
