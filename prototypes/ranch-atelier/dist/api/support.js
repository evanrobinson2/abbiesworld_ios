// Support Abbie's World: $5 a month through Stripe, which gives the player $4 of AI magic that month. See SUPPORT.md.
//  GET /api/support               {ready, signedIn, supporter:{until}|null, left}
//  GET /api/support?start=1       signed in: off to Stripe Checkout; signed out: sign in first, then back here
//  GET /api/support?confirm=<id>  back from Checkout: opens the month, {ok}
//  GET /api/support?manage=1      Stripe's page to change the card or cancel
const {account,HOSTS}=require('../lib/account.cjs');
const {wallet}=require('../lib/wallet.cjs');
const {support}=require('../lib/support.cjs');
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
const go=(res,url)=>{res.statusCode=303;res.setHeader('Location',url);res.end();};

function createHandler({env=process.env,who=account,purse=wallet,club=support}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return json(res,405,{error:'Use GET.'});
 const host=String(req.headers['x-forwarded-host']||req.headers.host||'').toLowerCase();
 // Stripe self-test for a deployment (same key as /api/me's ledger self-test): makes a real Checkout page for a throwaway account.
 const test=new URL(req.url||'/','https://x.invalid').searchParams.get('selftest');
 if(test){
  const {createHmac,randomBytes}=require('node:crypto');
  if(!env.AUTH_SESSION_SECRET||test!==createHmac('sha256',env.AUTH_SESSION_SECRET).update('ledger-selftest').digest('hex').slice(0,32))return json(res,404,{error:'Not here.'});
  const s=club();if(!s.ready)return json(res,200,{ready:false});
  try{const url=await s.checkout({id:randomBytes(12).toString('hex'),owner:false},`https://${host}`);return json(res,200,{ready:true,checkout:/^https:\/\/checkout\.stripe\.com\//.test(url),live:/^sk_live_/.test(env.STRIPE_SECRET_KEY||'')});}
  catch(e){return json(res,200,{ready:true,checkout:false,error:e.message});}
 }
 if(!HOSTS.has(host))return json(res,404,{error:'Not here.'});
 const origin=`https://${host}`,q=new URL(req.url||'/','https://x.invalid').searchParams,me=who(req,env),s=club();
 try{
  if(q.get('start')){
   if(!s.ready)return go(res,'/#support');
   if(!me)return go(res,'/api/auth/login?return='+encodeURIComponent('/api/support?start=1'));
   return go(res,await s.checkout(me,origin));
  }
  if(q.get('manage')){
   if(!me)return go(res,'/api/auth/login?return='+encodeURIComponent('/api/support?manage=1'));
   return go(res,(s.ready&&await s.manage(me,origin))||'/#support');
  }
  if(q.get('confirm')){
   if(!me)return json(res,401,{error:'Sign in again to finish.'});
   const ok=await s.confirm(me,q.get('confirm'),await purse().spent(me)).catch(()=>false);
   return json(res,ok?200:402,{ok});
  }
  const plan=me&&s.ready?await s.plan(me,()=>purse().spent(me)).catch(()=>null):null;
  return json(res,200,{ready:s.ready,signedIn:!!me,supporter:plan?{until:plan.until}:null,left:me?Math.floor(await purse().left(me)*100)/100:0});
 }catch(e){console.error('[support]',e.message);return json(res,502,{error:'Stripe is resting. Try again in a minute.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
