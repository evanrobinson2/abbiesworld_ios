// Real-money spending caps for paid AI (realtime voice, the guard, ElevenLabs, tile planning).
// Evan's rule (2026-10-23): no person spends more than $1 of his money, all public players together
// no more than $100, and the owner's own account no more than $1000. Claude calls on his Max plan
// are not dollars and are not counted here.
// The ledger lives in the project's private Blob store. Every charge is a conditional write
// (ifMatch on the ETag), so two charges at once can never overwrite each other; a charge that
// would cross a cap is refused before the call is made.
// The person and public caps can be raised for a launch day in the Vercel env (AI_CAP_PERSON_USD, AI_CAP_PUBLIC_USD)
// without a code change; see docs/launch/SURGE.md.
const capFrom=(v,fallback)=>v!=null&&String(v).trim()!==''&&Number.isFinite(+v)&&+v>=0?+v:fallback;
const CAPS={person:capFrom(process.env.AI_CAP_PERSON_USD,1),public:capFrom(process.env.AI_CAP_PUBLIC_USD,100),owner:1000};
const ROOT='spend/v1/';
// Conservative estimates in US dollars, above list prices so the caps bite early rather than late.
const PRICES={
 realtimeInputMinute:0.10,   // gpt-realtime audio in (list about $0.06/min), counted for all mic audio sent
 realtimeOutputMinute:0.40,  // gpt-realtime audio out (list about $0.24/min), counted on every byte relayed back
 realtimeOpen:0.01,          // each session start
 guardCall:0.001,            // one short gpt-6-luna judgement
 composeCall:0.02,           // one tile plan
 inventCall:0.02,            // one Make design (api/invent.js); a wish already in the shared cache is free
 photoCheck:0.005,           // one PG look at a photo sent with a model order
 elevenChar:0.0001           // ElevenLabs flash, per character spoken
};

function blobStore(){
 const blob=require('@vercel/blob');
 return {
  async read(path){
   let meta;try{meta=await blob.head(path);}catch(e){if(e instanceof blob.BlobNotFoundError||/not.?found/i.test(e?.message||''))return {value:null,etag:null};throw e;}
   const got=await blob.get(path,{access:'private',useCache:false});
   if(!got||got.statusCode!==200)return {value:null,etag:null};
   return {value:JSON.parse(await new Response(got.stream).text()),etag:meta.etag};
  },
  async write(path,value,etag){
   try{await blob.put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,contentType:'application/json',...(etag?{allowOverwrite:true,ifMatch:etag}:{allowOverwrite:false})});return true;}
   catch(e){if(e instanceof blob.BlobPreconditionFailedError||/precondition|already exists|conflict|412|409/i.test(e?.message||''))return false;throw e;}
  }
 };
}

// plan(a, spentNow) gives a supporter's cap for this month ({cap}) or null (lib/support.cjs). Supporters pay for their
// own AI, so while paid up they are charged only on their own ledger, never against the public pool.
// The public pool is split into SHARDS ledgers, each holding an equal share of the cap, so a launch-day crowd charging at
// once spreads its conditional writes over many files instead of fighting over one (docs/launch/SURGE.md). A charge
// that doesn't fit in one shard takes what it can from several; if the pool as a whole can't cover it, every part is
// given back. spend/v1/public.json, the single pool from before sharding, still counts: its total comes off the cap.
const SHARDS=16;
function createWallet({store=blobStore(),caps=CAPS,shards=SHARDS,plan=null}={}){
 const personPath=a=>`${ROOT}people/${a.id}.json`,legacyPath=`${ROOT}public.json`;
 const shardPath=k=>`${ROOT}public/${k}.json`;
 const spent=async a=>spentOf((await store.read(personPath(a))).value);
 // The account's own cap, and whether it draws on the public pool: the owner and paid-up supporters don't.
 async function terms(a){
  if(a.owner)return {cap:caps.owner,pool:false};
  const p=plan&&await plan(a,()=>spent(a)).catch(e=>{console.error('[wallet] plan',e.message);return null;});
  return p?{cap:Math.max(caps.person,p.cap),pool:false}:{cap:caps.person,pool:true};
 }
 const spentOf=v=>Number(v?.usd)||0;
 // The billing log rides in the same write as the charge (no extra ledger traffic): totals by month and kind for the last
 // 13 months, and the latest 60 items, with repeats of one kind within 10 minutes folded into one line.
 const r6=n=>Math.round(n*1e6)/1e6;
 function itemise(value,what,usd,at){
  const month=at.slice(0,7),by={...(value?.by||{})},m={...(by[month]||{})},k=m[what]||{usd:0,n:0};
  m[what]={usd:r6(k.usd+usd),n:k.n+1};by[month]=m;
  for(const old of Object.keys(by).sort().slice(0,-13))delete by[old];
  const items=[...(value?.items||[])],last=items[items.length-1];
  if(last&&last.what===what&&Date.parse(at)-Date.parse(last.at)<600000&&Math.sign(last.usd)===Math.sign(usd))items[items.length-1]={...last,at,usd:r6(last.usd+usd),n:(last.n||1)+1};
  else items.push({at,what,usd:r6(usd)});
  return {by,items:items.slice(-60)};
 }
 // Adds usd to one ledger unless that would pass cap. Retries on a concurrent write. what names the charge on a
 // person's own ledger, for their billing page.
 async function add(path,usd,cap,what){
  const r=await upTo(path,usd,cap,usd,what);
  return {ok:r.took>=usd-1e-9,spent:r.spent};
 }
 // Adds as much of usd as fits under cap, but nothing if less than least would fit. Returns what it took.
 async function upTo(path,usd,cap,least,what){
  for(let i=0;i<12;i++){
   // Back off a little after a lost race so a crowd of charges spreads out.
   if(i)await new Promise(r=>setTimeout(r,Math.random()*40*i));
   const {value,etag}=await store.read(path),spent=spentOf(value);
   const took=usd>0?Math.min(usd,Math.max(0,cap-spent)):usd;
   if(usd>0&&(took<least-1e-9||took<=1e-9))return {took:0,spent};
   const next={usd:Math.max(0,Math.round((spent+took)*1e6)/1e6),updated:new Date().toISOString(),calls:(value?.calls||0)+(took>0?1:0)};
   if(what)Object.assign(next,itemise(value,what,took,next.updated));
   if(await store.write(path,next,etag))return {took,spent:next.usd};
  }
  throw Error('ledger busy');
 }
 // The pre-shard pool is frozen, so one read per instance is enough.
 let legacy;
 const shardCap=async()=>{legacy??=spentOf((await store.read(legacyPath)).value);return Math.max(0,caps.public-legacy)/shards;};
 const order=()=>{const ks=[...Array(shards).keys()];for(let i=ks.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ks[i],ks[j]]=[ks[j],ks[i]];}return ks;};
 const pool={
  async room(){const cap=await shardCap(),all=await Promise.all(order().map(k=>store.read(shardPath(k))));return all.reduce((n,r)=>n+Math.max(0,cap-spentOf(r.value)),0);},
  // A charge that comes up short gives its parts back, but a rival may have been refused by those parts meanwhile.
  // So a short charge tries again while the pool, re-read, still has room for it: the pool fills to the cent.
  async take(usd){
   const cap=await shardCap();
   for(let i=0;i<6;i++){
    if(i)await new Promise(r=>setTimeout(r,Math.random()*30*i));
    const parts=[];let rest=usd;
    for(const k of order()){
     const {took}=await upTo(shardPath(k),rest,cap,0);
     if(took>0){parts.push([k,took]);rest-=took;}
     if(rest<=1e-9)return parts;
    }
    await pool.give(parts);
    if(await pool.room()<usd-1e-9)return null;
   }
   return null;
  },
  async give(parts){await Promise.all(parts.map(([k,usd])=>add(shardPath(k),-usd,Infinity).catch(()=>{})));}
 };
 return {
  caps,
  spent,
  // The player's own billing log: {spent, by:{'YYYY-MM':{kind:{usd,n}}}, items:[{at,what,usd,n?}]}. Only their account.
  async billing(a){const v=(await store.read(personPath(a))).value;return {spent:spentOf(v),by:v?.by||{},items:v?.items||[]};},
  // Dollars this account may still spend: the smaller of its own room and its pool's room.
  async left(a){
   if(!a)return 0;
   const t=await terms(a);
   const [p,room]=await Promise.all([store.read(personPath(a)),t.pool?pool.room():Infinity]);
   return Math.max(0,Math.min(t.cap-spentOf(p.value),room));
  },
  // Records a charge before (or while) money is spent. false means stop: a cap would be crossed.
  async charge(a,usd,what='AI magic'){
   if(!a||!(usd>0))return !!a;
   const t=await terms(a);
   if(!t.pool)return (await add(personPath(a),usd,t.cap,what)).ok;
   const parts=await pool.take(usd);if(!parts)return false;
   const mine=await add(personPath(a),usd,t.cap,what);
   if(!mine.ok){await pool.give(parts);return false;}
   return true;
  },
  // Gives a player back credit they spent (a Make rebate, api/invent.js). Only their own ledger: the money really
  // was spent, so the public pool, which caps Evan's real bill, keeps counting it.
  async refund(a,usd,what='Money back'){
   if(!a||!(usd>0))return false;
   await add(personPath(a),-usd,Infinity,what);return true;
  }
 };
}
let shared;
const wallet=()=>shared??=createWallet({plan:(a,spentNow)=>{const s=require('./support.cjs').support();return s.ready?s.plan(a,spentNow):null;}});
module.exports={createWallet,wallet,blobStore,capFrom,CAPS,PRICES,SHARDS};
