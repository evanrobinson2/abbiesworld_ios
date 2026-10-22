// Local-only integration harness: real handlers, ephemeral in-memory private storage.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),port=4319,records=new Map();
process.env.RANCH_VIEW_WRITE_KEY='a'.repeat(64);process.env.RANCH_VIEW_READ_KEY='local-action-read-test';
const store={put:async(p,s,o)=>{if(records.has(p)&&o.allowOverwrite===false)throw Error('exists');records.set(p,{text:s,uploadedAt:new Date().toISOString()});},get:async p=>records.has(p)?{statusCode:200,stream:new Response(records.get(p).text).body}:null,list:async({prefix})=>({blobs:[...records].filter(([p])=>p.startsWith(prefix)).map(([pathname,r])=>({pathname,uploadedAt:r.uploadedAt}))})};
const actions=require('../api/app-actions.js').createHandler(store),views=require('../api/view-context.js').createHandler(store);
const credentials=path.join(os.homedir(),'.codex','ranch-view','action-dev-credentials.json');fs.writeFileSync(credentials,JSON.stringify({url:'http://127.0.0.1:'+port,writeKey:process.env.RANCH_VIEW_WRITE_KEY,readKey:process.env.RANCH_VIEW_READ_KEY}));
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/')){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2000000){res.writeHead(413);return res.end();}}req.body=body?JSON.parse(body):undefined;
  // Emulate the production TLS origin at this loopback-only test server.
  if(req.headers.origin==='http://127.0.0.1:'+port)req.headers.origin='https://'+req.headers.host;
  if(url.pathname==='/api/view-context')return views(req,res);
  if(url.pathname==='/api/app-actions')return actions(req,res);
  if(url.pathname==='/api/model-calibrations'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({models:{}}));}
  res.writeHead(404);return res.end();
 }
 let pathname=decodeURIComponent(url.pathname);const routes=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites;
 const route=routes.find(r=>r.source===pathname&&(!r.has||r.has.every(h=>url.searchParams.get(h.key)===h.value)));if(route)pathname=route.destination;if(pathname==='/')pathname='/index.html';
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.obj':'text/plain'};
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(500);res.end('Local integration fixture error');}
}).listen(port,'127.0.0.1',()=>console.log('Action integration fixture listening on loopback port '+port));
