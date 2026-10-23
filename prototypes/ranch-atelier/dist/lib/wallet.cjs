// Real-money spending caps for paid AI (realtime voice, the guard, ElevenLabs, tile planning).
// Evan's rule (2026-10-23): no person spends more than $1 of his money, all public players together
// no more than $100, and the owner's own account no more than $1000. Claude calls on his Max plan
// are not dollars and are not counted here.
// The ledger lives in the project's private Blob store. Every charge is a conditional write
// (ifMatch on the ETag), so two charges at once can never overwrite each other; a charge that
// would cross a cap is refused before the call is made.
const CAPS={person:1,public:100,owner:1000};
const ROOT='spend/v1/';
// Conservative estimates in US dollars, above list prices so the caps bite early rather than late.
const PRICES={
 realtimeInputMinute:0.10,   // gpt-realtime audio in (list about $0.06/min), counted for all mic audio sent
 realtimeOutputMinute:0.40,  // gpt-realtime audio out (list about $0.24/min), counted on every byte relayed back
 realtimeOpen:0.01,          // each session start
 guardCall:0.001,            // one short gpt-6-luna judgement
 composeCall:0.02,           // one tile plan
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
function createWallet({store=blobStore(),caps=CAPS,plan=null}={}){
 const personPath=a=>`${ROOT}people/${a.id}.json`,poolPath=a=>`${ROOT}${a.owner?'owner':'public'}.json`;
 const poolCap=a=>a.owner?caps.owner:caps.public;
 const spent=async a=>spentOf((await store.read(personPath(a))).value);
 // The account's own cap, and whether it draws on a pool: the owner and paid-up supporters don't.
 async function terms(a){
  if(a.owner)return {cap:caps.owner,pool:false};
  const p=plan&&await plan(a,()=>spent(a)).catch(e=>{console.error('[wallet] plan',e.message);return null;});
  return p?{cap:Math.max(caps.person,p.cap),pool:false}:{cap:caps.person,pool:true};
 }
 const spentOf=v=>Number(v?.usd)||0;
 // Adds usd to one ledger unless that would pass cap. Retries on a concurrent write.
 async function add(path,usd,cap){
  for(let i=0;i<12;i++){
   // Back off a little after a lost race so a crowd of charges spreads out.
   if(i)await new Promise(r=>setTimeout(r,Math.random()*40*i));
   const {value,etag}=await store.read(path),spent=spentOf(value);
   if(usd>0&&spent+usd>cap+1e-9)return {ok:false,spent};
   const next={usd:Math.max(0,Math.round((spent+usd)*1e6)/1e6),updated:new Date().toISOString(),calls:(value?.calls||0)+(usd>0?1:0)};
   if(await store.write(path,next,etag))return {ok:true,spent:next.usd};
  }
  throw Error('ledger busy');
 }
 return {
  caps,
  spent,
  // Dollars this account may still spend: the smaller of its own room and its pool's room.
  async left(a){
   if(!a)return 0;
   const t=await terms(a);
   const [p,q]=await Promise.all([store.read(personPath(a)),t.pool?store.read(poolPath(a)):null]);
   const mine=t.cap-spentOf(p.value);
   return Math.max(0,Math.min(mine,t.pool?poolCap(a)-spentOf(q.value):mine));
  },
  // Records a charge before (or while) money is spent. false means stop: a cap would be crossed.
  async charge(a,usd){
   if(!a||!(usd>0))return !!a;
   const t=await terms(a);
   if(!t.pool)return (await add(personPath(a),usd,t.cap)).ok;
   const pool=await add(poolPath(a),usd,poolCap(a));if(!pool.ok)return false;
   const mine=await add(personPath(a),usd,t.cap);
   if(!mine.ok){await add(poolPath(a),-usd,Infinity).catch(()=>{});return false;}
   return true;
  }
 };
}
let shared;
const wallet=()=>shared??=createWallet({plan:(a,spentNow)=>{const s=require('./support.cjs').support();return s.ready?s.plan(a,spentNow):null;}});
module.exports={createWallet,wallet,blobStore,CAPS,PRICES};
