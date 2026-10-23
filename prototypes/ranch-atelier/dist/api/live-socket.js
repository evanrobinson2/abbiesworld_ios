// Live mode relay (Vercel Functions WebSocket). Used when the project has no AI Gateway API key:
// AI Gateway mints browser client secrets only for API keys, so the page connects here instead
// and this function opens the realtime session with the project's own OIDC token.
// It also enforces the rules server-side: the session's instructions and tools are always the
// server's copy, and the page may only send the events live mode needs.
//   wss://<app>/api/live-socket?ticket=<from POST /api/live {action:'session'}>
const http=require('node:http');
const WebSocket=require('ws');
const {checkTicket}=require('../lib/live-ticket.cjs');
const GATEWAY_WS='wss://ai-gateway.vercel.sh/v4/ai/realtime-model';
const ALLOWED=new Set(['session-update','input-audio-append','input-audio-clear','input-audio-commit','conversation-item-create','response-create','response-cancel','session-close']);
const MAX_FRAME=256*1024;
let policy;

const server=http.createServer((req,res)=>{res.writeHead(426,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"Upgrade to WebSocket"}');});
const wss=new WebSocket.Server({noServer:true,maxPayload:MAX_FRAME,handleProtocols:p=>p.has('ai-gateway-realtime.v1')?'ai-gateway-realtime.v1':false});
server.on('upgrade',(req,sock,head)=>{
 const url=new URL(req.url,'http://relay.invalid'),host=req.headers['x-forwarded-host']||req.headers.host;
 if(url.pathname!=='/api/live-socket'){sock.destroy();return;}
 const origin=req.headers.origin;
 const ok=origin===`https://${host}`&&checkTicket(url.searchParams.get('ticket'),process.env);
 const token=req.headers['x-vercel-oidc-token']||process.env.VERCEL_OIDC_TOKEN;
 wss.handleUpgrade(req,sock,head,client=>{if(!ok)return client.close(1008,'Not allowed');if(!token)return client.close(1011,'AI Gateway is not connected');relay(client,token).catch(e=>{console.error('[live-socket]',e.message);client.close(1011,'Relay failed');});});
});

async function relay(client,token){
 policy??=await import('../simulations/live/policy.mjs');
 // LIVE_GATEWAY_WS points tests at a local fake; only loopback addresses are honoured.
 const local=process.env.LIVE_GATEWAY_WS&&/^ws:\/\/127\.0\.0\.1:\d+\//.test(process.env.LIVE_GATEWAY_WS)?process.env.LIVE_GATEWAY_WS:null;
 const url=new URL(local||GATEWAY_WS);url.searchParams.set('ai-model-id',policy.REALTIME_MODEL);
 const upstream=new WebSocket(url.toString(),['ai-gateway-realtime.v1',`ai-gateway-auth.${token}`]);
 const queue=[];let open=false;
 const toUpstream=text=>{if(open&&upstream.readyState===1)upstream.send(text);else if(queue.length<64)queue.push(text);};
 upstream.on('open',()=>{open=true;for(const t of queue.splice(0))upstream.send(t);});
 upstream.on('message',(data,isBinary)=>{if(client.readyState===1)client.send(data,{binary:isBinary});});
 upstream.on('close',(code,reason)=>{if(client.readyState<2)client.close(code===1005||code===1006?1011:code,String(reason||'').slice(0,120));});
 upstream.on('error',e=>{console.error('[live-socket] upstream',e.message);if(client.readyState<2)client.close(1011,'AI Gateway connection failed');});
 client.on('message',(data,isBinary)=>{
  if(isBinary)return;let e;try{e=JSON.parse(data);}catch{return;}
  if(!e||!ALLOWED.has(e.type))return;
  if(e.type==='session-update'){
   // The whole session config is rebuilt on the server: rules, tools, and only the safe choices from the
   // family's voice settings. The page may add the scene brief it appends.
   e={type:'session-update',config:policy.serverSession(e.config)};
  }
  if(e.type==='conversation-item-create'){
   const item=e.item||{};
   // Only tool results and the game's own rule-check notes; the page cannot type to the model as the child.
   if(item.type==='text-message'&&!(typeof item.text==='string'&&item.text.startsWith('[GAME RULE CHECK')))return;
   if(!['text-message','function-call-output'].includes(item.type))return;
  }
  if(e.type==='response-create'&&e.options?.instructions&&!/^Greet the family/.test(e.options.instructions))delete e.options.instructions;
  toUpstream(JSON.stringify(e));
 });
 client.on('close',()=>{if(upstream.readyState<2)upstream.close(1000);});
 client.on('error',()=>{});
}
module.exports=server;
