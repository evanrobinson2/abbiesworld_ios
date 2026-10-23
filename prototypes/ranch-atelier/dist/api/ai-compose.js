const {account,HOSTS,onSite}=require('../lib/account.cjs');
const {wallet,PRICES}=require('../lib/wallet.cjs');
const buckets=new Map();
const MODEL='openai/gpt-6-luna'; // Verified against the live Gateway catalog, 2026-10-21.
function createHandler({fetcher=fetch,env=process.env,now=Date.now,who=account,purse=wallet}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const fail=(code,message)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:message}));};
 if(req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({enabled:env.AI_COMPOSITION_ENABLED==='true',model:MODEL,version:1}));}
 if(req.method!=='POST')return fail(405,'Use POST.');
 if(!/^https:\/\//.test(req.headers.origin||'')||!(h=>HOSTS.has(h)||onSite(h))(String(req.headers.origin).slice(8)))return fail(403,'Open composition from the game.');
 if(env.AI_COMPOSITION_ENABLED!=='true')return fail(503,'AI composition is not enabled yet. Your blank tile is saved.');
 const token=env.VERCEL_OIDC_TOKEN||env.AI_GATEWAY_API_KEY;
 if(!token)return fail(503,'AI Gateway is not connected. Your tile is saved; try again later.');
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return fail(400,'Invalid request.');}
 if(!body||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>1200||typeof body.requestId!=='string'||!/^[\w-]{8,80}$/.test(body.requestId))return fail(400,'Describe your tile in 1–1200 characters.');
 // A project-level Gateway budget is the durable spend limit. This is only burst control.
 const at=now(),ip=req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown';
 for(const [key,value]of buckets)if(at-value.at>60000)buckets.delete(key);
 const rate=buckets.get(ip)||{at,n:0};if(rate.n>=6)return fail(429,'Please wait a minute before another composition.');rate.n++;buckets.set(ip,rate);
 // Each plan is charged to the signed-in player's spending cap (lib/wallet.cjs) before it is asked for.
 const me=who(req,env);if(!me)return fail(401,'Sign in to plan tiles with AI. Your tile is saved.');
 if(!await purse().charge(me,PRICES.composeCall))return fail(402,'AI planning has used up its magic for now. Your tile is saved.');
 const {PLANNER_PROMPT,validateComposition,describeComposition}=await import('../simulations/ai-composition-contract.mjs');
 res.statusCode=200;res.setHeader('Content-Type','text/event-stream; charset=utf-8');res.setHeader('X-Accel-Buffering','no');res.flushHeaders?.();
 let seq=0,closed=false;const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
 const emit=(event,data)=>{if(!closed)res.write(`id: ${body.requestId}:${++seq}\nevent: ${event}\ndata: ${JSON.stringify({requestId:body.requestId,...data})}\n\n`);};
 const onClose=()=>{closed=true;controller.abort();};res.on?.('close',onClose);
 const heartbeat=setInterval(()=>{if(!closed)res.write(': waiting for planner\n\n');},10000);
 try{
  emit('status',{stage:'planning',message:'Checking the supported assets and scene generators…'});
  const response=await fetcher('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,messages:[{role:'system',content:PLANNER_PROMPT},{role:'user',content:body.prompt.trim()}],response_format:{type:'json_object'},max_tokens:1800,reasoning:{effort:'none'},stream:false})});
  if(!response.ok)throw Error(response.status===429?'AI Gateway is busy or its budget is exhausted. Try later.':response.status===402?'The AI Gateway spending limit or credit balance has been reached.':'AI Gateway could not plan this tile. Try again later.');
  const result=await response.json(),content=result.choices?.[0]?.message?.content;
  if(result.choices?.[0]?.finish_reason==='length')throw Error('The plan was incomplete. Try a shorter description.');
  let plan;try{plan=validateComposition(JSON.parse(content));}catch{throw Error('The planner returned an invalid build plan. Nothing was placed; please try again.');}
  emit('plan',{plan,dialog:describeComposition(plan)});
  emit('complete',{model:result.model||MODEL,usage:result.usage||null});
 }catch(error){if(!closed)emit('error',{message:controller.signal.aborted?'Planning timed out. Your tile is saved; try again.':error.message});}
 finally{clearInterval(heartbeat);clearTimeout(timeout);res.off?.('close',onClose);res.end();}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
