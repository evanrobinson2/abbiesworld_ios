// Make: the player build harness. A signed-in player says or types a few words and one new thing appears in their
// world, built from toy parts. See INVENT.md.
//  GET  /api/invent                  {enabled, version, signedIn, left?, ideas}
//  POST /api/invent {wish}           {ok:true, recipe, cached} | {ok:false, verdict} | {error, budget?, signIn?, ideas?}
// Order of work, cheapest first: burst limits, sign-in, the local PG screen, the shared cache (free, no AI), the
// guard (fails closed), then the designer. Each paid call is charged to the player's cap first (lib/wallet.cjs).
// Same wishes made at the same moment share one design, and every approved design lands in the shared cache, so a
// surge of children asking for "a dragon" costs one design. When a player's magic runs out, cached wishes still work.
// Stored: the shared cache (words, recipe and the inventor's hashed account id, for rebates) and each player's makes under their hashed account id,
// so a make can be rebuilt or upgraded later. Nothing else a child types is kept.
const {createHash,randomBytes}=require('node:crypto');
const {account}=require('../lib/account.cjs');
const {wallet,PRICES}=require('../lib/wallet.cjs');
const {judge}=require('./live.js');
const GATEWAY='https://ai-gateway.vercel.sh';
const DESIGNER_MODEL='openai/gpt-6-luna'; // the model ai-compose and the live guard already use
const ROOT='invent/v1/';
const MAX_INFLIGHT=24;          // designer calls at once on one instance; past this, players are asked to wait a moment
const MEMORY=400;               // cached designs kept in memory per instance
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};

function blobCache(){
 const blob=()=>require('@vercel/blob');
 return {
  async read(path){try{const r=await blob().get(path,{access:'private',useCache:false});return r&&r.statusCode===200?JSON.parse(await new Response(r.stream).text()):null;}catch{return null;}},
  async write(path,value){try{await blob().put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});}catch(e){console.error('[invent] store',e.message);}},
  // Writes only if nothing is there yet: true for the first caller, false for everyone after (exactly-once rebates).
  async claim(path,value){try{await blob().put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});return true;}catch(e){if(/already exists|precondition|conflict|409|412/i.test(e?.message||''))return false;throw e;}}
 };
}

function createHandler({fetcher=fetch,env=process.env,now=Date.now,who=account,purse=wallet,store=blobCache(),guard=judge}={}){
 const buckets=new Map(),memory=new Map(),inflight=new Map();let busy=0;
 const contract=()=>import('../simulations/invent/contract.mjs'),policy=()=>import('../simulations/live/policy.mjs');
 const remember=(key,entry)=>{memory.delete(key);memory.set(key,entry);if(memory.size>MEMORY)memory.delete(memory.keys().next().value);};
 // Toys other players already made, newest first, by the toy's own (screened) name, never the words a child typed.
 const ideas=()=>[...new Set([...memory.values()].reverse().map(e=>e.recipe?.name).filter(n=>n&&n!=='My invention'))].slice(0,6);
 function limited(key,max,window,at){
  for(const [k,v]of buckets)if(at-v.at>v.window)buckets.delete(k);
  const b=buckets.get(key)||{at,n:0,window};if(b.n>=max)return true;b.n++;buckets.set(key,b);return false;
 }
 async function cached(key){
  if(memory.has(key)){const e=memory.get(key);remember(key,e);return e;}
  const e=await store.read(`${ROOT}cache/${hash(key)}.json`);
  if(e?.recipe){remember(key,e);return e;}
  return null;
 }
 async function design(wish,headers,constrain,prompt){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{
   const r=await fetcher(`${GATEWAY}/v1/chat/completions`,{method:'POST',signal:controller.signal,headers,body:JSON.stringify({model:env.INVENT_MODEL||DESIGNER_MODEL,
    messages:[{role:'system',content:prompt},{role:'user',content:`The child asked for: ${JSON.stringify(wish)}`}],response_format:{type:'json_object'},max_tokens:2600,stream:false})});
   if(!r.ok)throw Error('designer '+r.status);
   const out=await r.json();
   if(out.choices?.[0]?.finish_reason==='length')throw Error('designer ran long');
   return constrain(JSON.parse(out.choices?.[0]?.message?.content||''));
  }finally{clearTimeout(timer);}
 }
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const enabled=env.INVENT_ENABLED!=='false';
  const {INVENT_VERSION,LIMITS,DESIGNER_PROMPT,constrain,wishKey}=await contract();
  // Acceptance test, previews only (they sit behind Vercel's own login): GET ?try=<wish> runs the whole path as a
  // test account on the owner-style ledger, so the real guard and designer can be checked before a release.
  const trial=env.VERCEL_ENV==='preview'&&req.method==='GET'&&new URL(req.url||'/','https://invent.invalid').searchParams.get('try');
  const me=trial?{id:'e'.repeat(24),owner:true}:who(req,env);
  if(req.method==='GET'&&!trial){
   let left=null;if(me)try{left=Math.round(await purse().left(me)*100)/100;}catch{}
   return json(res,200,{enabled,version:INVENT_VERSION,signedIn:!!me,...(left!==null?{left}:{}),ideas:ideas()});
  }
  if(req.method!=='POST'&&!trial)return json(res,405,{error:'Use POST.'});
  const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
  if(!trial&&(!origin||origin!==`https://${host}`&&!(env.LIVE_DEV_ORIGIN&&origin===env.LIVE_DEV_ORIGIN)))return json(res,403,{error:'Make things from inside the game.'});
  if(!enabled)return json(res,503,{error:'Making is resting right now. Keep playing!'});
  let body;try{body=trial?{wish:trial}:typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return json(res,400,{error:'Invalid request.'});}
  const wish=typeof body?.wish==='string'?body.wish.replace(/\s+/g,' ').trim().slice(0,LIMITS.words):'';
  if(wish.length<2)return json(res,400,{error:'Say what you want to make.'});

  const at=now(),ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
  if(limited('ip:'+ip,30,60000,at))return json(res,429,{error:'So many ideas! Wait a moment and try again.'});
  if(!me)return json(res,401,{error:'Sign in to make your own things.',signIn:true});
  if(limited('me:'+me.id,8,60000,at)||limited('hour:'+me.id,80,3600000,at))return json(res,429,{error:'So many ideas! Wait a moment and try again.'});

  const {screen}=await policy();
  if(!screen(wish).ok)return json(res,200,{ok:false,verdict:'unsafe'});
  const key=wishKey(wish);
  // Evan's rule (2026-10-23): when another player uses a toy someone invented, the inventor gets back what it cost.
  // Once per toy, on its first use by anyone else; the rebate record is written only if it isn't there yet.
  const rebate=async entry=>{
   const by=entry?.by;if(!by?.id||by.id===me.id||!(entry.cost>0))return;
   try{if(await store.claim(`${ROOT}rebates/${hash(entry.by.id+':'+(wishKey(entry.recipe?.name)||entry.wish))}.json`,{to:by.id,usd:entry.cost,at:new Date(at).toISOString()}))await purse().refund(by,entry.cost,'Money back: someone else made your idea too');}
   catch(e){console.error('[invent] rebate',e.message);}
  };
  const keep=async(recipe,cachedHit,entry)=>{
   if(cachedHit)await rebate(entry);
   const id=`${at.toString(36)}-${randomBytes(3).toString('hex')}`;
   await store.write(`${ROOT}made/${me.id}/${id}.json`,{id,wish,recipe,madeAt:new Date(at).toISOString(),cached:cachedHit,version:INVENT_VERSION});
   return json(res,200,{ok:true,id,recipe,cached:cachedHit});
  };
  try{
   const hit=await cached(key);
   if(hit)return keep(hit.recipe,true,hit);

   const token=req.headers['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN||env.AI_GATEWAY_API_KEY;
   if(!token)return json(res,503,{error:'Making is resting right now. Keep playing!'});
   const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
   const tired=()=>json(res,402,{error:'Your making magic is used up for now. These ones are still free:',budget:true,ideas:ideas()});

   // Someone is already designing these exact words: wait for theirs instead of paying twice. The job is shared from
   // before the guard, so a crowd sending the same wish at once makes one guard call and one design.
   let job=inflight.get(key),mine=false;
   if(!job){
    if(busy>=MAX_INFLIGHT)return json(res,503,{error:'Lots of builders right now! Try again in a moment.',busy:true});
    mine=true;busy++;
    job=(async()=>{
     if(!await purse().charge(me,PRICES.guardCall,'Safety check'))return {tired:true};
     const verdict=await guard(fetcher,headers,'CHILD',`Please make this toy in the game: ${wish}`);
     if(verdict.verdict!=='ok')return {verdict:verdict.verdict};
     if(!await purse().charge(me,PRICES.inventCall,'Making a new thing'))return {tired:true};
     const recipe=await design(wish,headers,constrain,DESIGNER_PROMPT);
     // by: the inventor (hashed account id and owner flag only), so a later use by someone else can rebate them.
     const entry={wish,recipe,madeAt:new Date(at).toISOString(),version:INVENT_VERSION,by:{id:me.id,owner:!!me.owner},cost:PRICES.guardCall+PRICES.inventCall};
     // Filed under the child's words and under the toy's own name, which is what other players are offered.
     const named=wishKey(recipe.name);remember(key,entry);if(named&&named!==key)remember(named,entry);
     await Promise.all([...new Set([key,named].filter(Boolean))].map(k=>store.write(`${ROOT}cache/${hash(k)}.json`,entry)));
     return {recipe,entry};
    })().finally(()=>{busy--;inflight.delete(key);});
    inflight.set(key,job);
   }
   let out;try{out=await job;}catch(e){console.error('[invent] design',e.message);return json(res,502,{error:'That one didn’t come out right. Try saying it another way.'});}
   // A player who joined someone else's design wasn't charged, so a purse that ran dry was the other player's.
   if(out.tired)return mine?tired():json(res,503,{error:'Lots of builders right now! Try again in a moment.',busy:true});
   if(out.verdict==='unknown')return json(res,503,{error:'Making is resting right now. Try again soon.'});
   if(out.verdict)return json(res,200,{ok:false,verdict:out.verdict});
   return keep(out.recipe,!mine,out.entry);
  }catch(e){console.error('[invent]',e.message);return json(res,502,{error:'Making hit a problem. Try again.'});}
 };
}
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,32);

module.exports=createHandler();module.exports.createHandler=createHandler;
