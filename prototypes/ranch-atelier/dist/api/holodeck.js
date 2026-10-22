// WebSocket relay for the Holodeck Creator (Vercel Functions WebSocket support).
// GET /api/holodeck?room=<key>&role=stage|creator upgrades to a WebSocket; see lib/holodeck-relay.cjs.
const http=require('node:http');
const {attach}=require('../lib/holodeck-relay.cjs');
const server=http.createServer((req,res)=>{res.writeHead(426,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Upgrade to WebSocket: /api/holodeck?room=<key>&role=stage|creator'}));});
attach(server);
module.exports=server;
