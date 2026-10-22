const {createStore,same,TYPES,URL}=require('../lib/claude-board.cjs');
const schema={type:'object',properties:{slug:{type:'string',enum:['Claude']}},additionalProperties:false};
const tools=[
 {name:'sandbox_get',description:'Read Claude Sandbox cloud placements. Persisted commands are not proof of browser rendering. Simulation state and manual edits are device-local.',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'sandbox_catalog',description:'List existing Sandbox generators and placement settings. No new assets are created.',inputSchema:schema,annotations:{readOnlyHint:true}},
 {name:'sandbox_place_tile',description:'Add one real generated tile to Sandbox Claude. Reuse tileId for retries. position selects a zero-based open edge slot modulo available slots in the current browser board. Default 0. Placement is durable; opening /sandbox/Claude renders queued tiles using the existing generators and simulations. Maximum 32 remote tiles. Does not report rendering success.',inputSchema:{type:'object',required:['tileId','type'],properties:{slug:{type:'string',enum:['Claude']},tileId:{type:'string',pattern:'^[a-zA-Z0-9-]{1,64}$'},type:{type:'string',enum:TYPES},position:{type:'integer',minimum:0,maximum:255},seed:{type:'integer',minimum:0,maximum:2147483647},settings:{type:'object',properties:{complexity:{type:'integer',minimum:1,maximum:4},vegetation:{type:'integer',minimum:0,maximum:4},variety:{type:'integer',minimum:0,maximum:5},variant:{type:'integer',minimum:1,maximum:5},density:{type:'integer',minimum:1,maximum:5},planet:{type:'string',enum:['moon','mars','alien']}},additionalProperties:false}},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:false}}
];
function createHandler(blob){const store=createStore(blob);return async(req,res)=>{
 const reply=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(data===undefined?'':JSON.stringify(data));};
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.origin&&!['https://abbies-ranch-atelier.vercel.app','https://claude.ai'].includes(req.headers.origin))return reply(403,{error:'Origin rejected'});
 if(!same((req.headers.authorization||'').replace(/^Bearer /,''),process.env.CLAUDE_SANDBOX_TOKEN))return reply(401,{error:'Claude Sandbox bearer token required'});
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(405,{error:'Use MCP Streamable HTTP POST'});}
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return reply(400,{error:'Invalid JSON'});}
 if(!body||Array.isArray(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string'||JSON.stringify(body).length>10000)return reply(400,{error:'Invalid JSON-RPC request'});
 if(body.id===undefined)return reply(202);
 const ok=result=>reply(200,{jsonrpc:'2.0',id:body.id,result});
 if(body.method==='initialize')return ok({protocolVersion:['2025-03-26','2025-06-18','2025-11-25'].includes(body.params?.protocolVersion)?body.params.protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'abbies-claude-sandbox',version:'1.0.0'},instructions:'This connection can place existing generated tiles only in Sandbox Claude. Use sandbox_catalog, sandbox_get, then sandbox_place_tile. Persisted means cloud-saved, not rendered.'});
 if(body.method==='ping')return ok({});
 if(body.method==='tools/list')return ok({tools});
 if(body.method!=='tools/call')return reply(200,{jsonrpc:'2.0',id:body.id,error:{code:-32601,message:'Method not found'}});
 try{const a=body.params?.arguments||{};if(a.slug!==undefined&&a.slug!=='Claude')throw Error('This connection is restricted to Sandbox Claude');let data;
 if(body.params.name==='sandbox_get')data=await store.board();
 else if(body.params.name==='sandbox_catalog')data={slug:'Claude',url:URL,types:TYPES,settings:{complexity:'1–4; moon/city 1–3',vegetation:'0–4',variety:'0–5',variant:'1–5',density:'1–5 (crop)',planet:'moon | mars | alien (moon tiles)'},limits:'32 remote tiles; single-hex city districts. Existing approved generators/assets. No arbitrary geometry, code or asset import.'};
 else if(body.params.name==='sandbox_place_tile')data=await store.place(a);
 else throw Error('Unknown tool');
 return ok({content:[{type:'text',text:JSON.stringify(data)}]});
 }catch(e){return ok({isError:true,content:[{type:'text',text:e.message}]});}
};}
module.exports=(req,res)=>createHandler(require('@vercel/blob'))(req,res);module.exports.createHandler=createHandler;
