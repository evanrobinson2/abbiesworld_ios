// Supporters: $5 a month through Stripe buys $4 of real-money AI that month (Evan, 2026-10-23: "they can spend up to $4
// in game credits, we pocket a dollar"). Credit does not roll over: each paid month resets it to $4 on top of what the
// player had already spent. See SUPPORT.md.
// Stripe is called with plain fetch (no SDK). Nothing is stored about the player beyond the account id we already use,
// the Stripe customer and subscription ids, and the paid-up date.
const ROOT='support/v1/';
const MONTHLY_CENTS=500,CREDIT=4;

function stripeClient(env,fetcher=fetch){
 const key=env.STRIPE_SECRET_KEY;
 const form=(o,pre='')=>Object.entries(o).flatMap(([k,v])=>{const n=pre?`${pre}[${k}]`:k;
  return v&&typeof v==='object'?form(v,n):v===undefined?[]:[`${encodeURIComponent(n)}=${encodeURIComponent(v)}`];});
 return async(method,path,params)=>{
  if(!key)throw Error('Stripe is not set up');
  const url=`https://api.stripe.com/v1/${path}`+(method==='GET'&&params?'?'+form(params).join('&'):'');
  const r=await fetcher(url,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded'},body:method==='GET'?undefined:form(params||{}).join('&')});
  const body=await r.json();if(!r.ok)throw Object.assign(Error(body?.error?.message||`Stripe ${r.status}`),{stripe:body?.error});
  return body;
 };
}

function createSupport({env=process.env,store,fetcher,now=()=>Date.now()}={}){
 const stripe=stripeClient(env,fetcher);
 const path=a=>`${ROOT}${a.id}.json`;
 const read=async a=>(await store.read(path(a))).value;
 const write=async(a,value)=>{for(let i=0;i<6;i++){const cur=await store.read(path(a));if(await store.write(path(a),value,cur.etag))return;}throw Error('support record busy');};
 const seconds=t=>Math.floor(t/1000);
 // Starts a period: credit is $4 above what this account had spent when the month was paid (and above the free $1).
 const period=(spent,end)=>({base:Math.max(1,spent),until:end*1000});

 return {
  ready:!!env.STRIPE_SECRET_KEY,
  // A Stripe Checkout page for $5 a month, tied to this account.
  async checkout(a,origin){
   const s=await stripe('POST','checkout/sessions',{mode:'subscription',client_reference_id:a.id,
    line_items:{0:{quantity:1,price_data:{currency:'usd',unit_amount:MONTHLY_CENTS,recurring:{interval:'month'},product_data:{name:"Support Abbie's World",description:'$4 of AI magic in the game each month'}}}},
    allow_promotion_codes:'false',billing_address_collection:'auto',
    metadata:{account:a.id},subscription_data:{metadata:{account:a.id}},
    success_url:`${origin}/support/thanks?session={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/welcome#support`});
   return s.url;
  },
  // Back from Checkout: check the session belongs to this account and is paid, then open the first month.
  async confirm(a,sessionId,spent){
   const s=await stripe('GET',`checkout/sessions/${encodeURIComponent(sessionId)}`,{'expand[0]':'subscription'});
   if(s.client_reference_id!==a.id||s.status!=='complete'||!s.subscription)return false;
   const sub=s.subscription;if(!['active','trialing'].includes(sub.status))return false;
   const had=await read(a);
   const keep=had?.subscription===sub.id&&had.until>=sub.current_period_end*1000;
   await write(a,{customer:s.customer,subscription:sub.id,...(keep?{base:had.base,until:had.until}:period(spent,sub.current_period_end))});
   return true;
  },
  // This month's plan: {cap} while paid up, null otherwise. Past the paid-up date it asks Stripe once whether the
  // next month was paid; if so the credit resets to $4 for the new month.
  async plan(a,spentNow){
   const rec=a&&await read(a);if(!rec?.subscription)return null;
   if(now()<rec.until)return {cap:rec.base+CREDIT,until:rec.until};
   if(rec.ended)return null;
   const sub=await stripe('GET',`subscriptions/${rec.subscription}`).catch(()=>null);
   if(sub&&['active','trialing'].includes(sub.status)&&sub.current_period_end*1000>rec.until){
    const next={...rec,...period(await spentNow(),sub.current_period_end)};await write(a,next);return {cap:next.base+CREDIT,until:next.until};
   }
   if(sub&&['canceled','incomplete_expired','unpaid'].includes(sub.status))await write(a,{...rec,ended:true});
   return null;
  },
  // Stripe's own page to change the card or cancel (cancel must be as easy as joining).
  async manage(a,origin){
   const rec=await read(a);if(!rec?.customer)return null;
   const open=()=>stripe('POST','billing_portal/sessions',{customer:rec.customer,return_url:`${origin}/welcome#support`});
   try{return (await open()).url;}
   catch(e){if(!/configuration/i.test(e.message))throw e;
    await stripe('POST','billing_portal/configurations',{business_profile:{headline:"Abbie's World"},features:{subscription_cancel:{enabled:'true',mode:'immediately'},payment_method_update:{enabled:'true'},invoice_history:{enabled:'true'}}});
    return (await open()).url;}
  }
 };
}
let shared;
const support=()=>shared??=createSupport({store:require('./wallet.cjs').blobStore()});
module.exports={createSupport,support,MONTHLY_CENTS,CREDIT};
