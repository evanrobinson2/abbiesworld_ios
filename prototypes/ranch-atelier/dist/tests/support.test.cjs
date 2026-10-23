const test=require('node:test');
const assert=require('node:assert/strict');
const {createSupport,TIERS}=require('../lib/support.cjs');
const {createWallet}=require('../lib/wallet.cjs');

function memoryStore(){
 const data=new Map();let n=0;
 return {data,async read(p){const v=data.get(p);return v?{value:JSON.parse(v.body),etag:v.etag}:{value:null,etag:null};},
  async write(p,value,etag){const cur=data.get(p);if(etag?cur?.etag!==etag:cur)return false;data.set(p,{body:JSON.stringify(value),etag:'e'+(++n)});return true;}};
}
// A fake Stripe: one customer, one subscription whose period we move by hand.
function fakeStripe(){
 const day=86400;let clock=1_800_000_000;
 const sub={id:'sub_1',status:'active',current_period_end:clock+30*day};
 const calls=[];
 // The session remembers the amount of the last checkout, as Stripe keeps its metadata.
 const tier=()=>calls.filter(c=>c.path==='/v1/checkout/sessions').pop()?.body['metadata[tier]'];
 const fetcher=async(url,init)=>{
  const u=new URL(url),body=init.body?Object.fromEntries(new URLSearchParams(init.body)):{};calls.push({path:u.pathname,body,auth:init.headers.Authorization});
  const ok=v=>({ok:true,json:async()=>v});
  if(u.pathname==='/v1/checkout/sessions')return ok({id:'cs_1',url:'https://checkout.stripe.com/c/cs_1'});
  if(u.pathname==='/v1/checkout/sessions/cs_1')return ok({id:'cs_1',status:'complete',client_reference_id:'a'.repeat(24),customer:'cus_1',metadata:{tier:tier()},subscription:{...sub}});
  if(u.pathname==='/v1/subscriptions/sub_1')return ok({...sub});
  return {ok:false,status:404,json:async()=>({error:{message:'nope'}})};
 };
 return {fetcher,sub,calls,day,get now(){return clock*1000;},advance(d){clock+=d*day;}};
}
const player={id:'a'.repeat(24),owner:false};

test('$5 a month gives $4 of magic this month, on top of the free dollar, outside the public pool',async()=>{
 const store=memoryStore(),s=fakeStripe();
 const club=createSupport({env:{STRIPE_SECRET_KEY:'sk_test'},store,fetcher:s.fetcher,now:()=>s.now});
 const w=createWallet({store,plan:(a,spentNow)=>club.plan(a,spentNow)});
 assert.equal(await club.checkout(player,'https://www.abbies.world'),'https://checkout.stripe.com/c/cs_1');
 const start=s.calls[0].body;
 assert.equal(start.mode,'subscription');assert.equal(start.client_reference_id,player.id);
 assert.equal(start['line_items[0][price_data][unit_amount]'],'500');assert.equal(start['line_items[0][price_data][recurring][interval]'],'month');
 assert.equal(start.success_url,'https://www.abbies.world/support/thanks?session={CHECKOUT_SESSION_ID}');
 assert.equal(await w.charge(player,0.5),true);
 assert.equal(await club.confirm(player,'cs_1',await w.spent(player)),true);
 assert.equal(Math.round(await w.left(player)*100)/100,4.5,'$4 plus the unused half of the free dollar');
 assert.equal(await w.charge(player,4.4),true);assert.equal(await w.charge(player,0.2),false,'no more than that this month');
 const pool=[...store.data].filter(([k])=>k.startsWith('spend/v1/public/')).reduce((n,[,v])=>n+JSON.parse(v.body).usd,0);
 assert.equal(Math.round(pool*100)/100,0.5,'supporter spending stays off the public pool');
});

test('next paid month resets to $4; a cancelled one stops it; unused magic does not carry over',async()=>{
 const store=memoryStore(),s=fakeStripe();
 const club=createSupport({env:{STRIPE_SECRET_KEY:'sk_test'},store,fetcher:s.fetcher,now:()=>s.now});
 const w=createWallet({store,plan:(a,spentNow)=>club.plan(a,spentNow)});
 await club.confirm(player,'cs_1',0);
 await w.charge(player,1);
 s.advance(31);s.sub.current_period_end+=30*s.day;
 assert.equal(Math.round(await w.left(player)*100)/100,4,'a fresh $4, the unused $4 from last month is gone');
 s.advance(31);s.sub.status='canceled';
 assert.equal(await w.left(player),0,'back to the free dollar, already spent');
 assert.equal(JSON.parse(store.data.get(`support/v1/${player.id}.json`).body).ended,true);
});

test("someone else's checkout can't be claimed, and nothing works without Stripe set up",async()=>{
 const store=memoryStore(),s=fakeStripe();
 const club=createSupport({env:{STRIPE_SECRET_KEY:'sk_test'},store,fetcher:s.fetcher,now:()=>s.now});
 assert.equal(await club.confirm({id:'b'.repeat(24),owner:false},'cs_1',0),false);
 assert.equal(await club.plan({id:'b'.repeat(24),owner:false},async()=>0),null);
 const off=createSupport({env:{},store,fetcher:s.fetcher});
 assert.equal(off.ready,false);await assert.rejects(off.checkout(player,'https://x'),/not set up/);
});

test('$45 and $80 a month buy $39 and $69 of magic, and the billing page lists every charge',async()=>{
 assert.deepEqual(TIERS,{5:4,45:39,80:69});
 for(const [amount,credit] of [[45,39],[80,69]]){
  const store=memoryStore(),s=fakeStripe();
  const club=createSupport({env:{STRIPE_SECRET_KEY:'sk_test'},store,fetcher:s.fetcher,now:()=>s.now});
  const w=createWallet({store,plan:(a,spentNow)=>club.plan(a,spentNow)});
  await club.checkout(player,'https://www.abbies.world',amount);
  assert.equal(s.calls[0].body['line_items[0][price_data][unit_amount]'],String(amount*100));
  assert.equal(await club.confirm(player,'cs_1',0),true);
  assert.equal(Math.round(await w.left(player)*100)/100,1+credit,'the free dollar plus the credit');
  assert.equal((await club.plan(player,async()=>0)).tier,amount);
 }
 const store=memoryStore(),w=createWallet({store});
 await w.charge(player,0.01,'Safety check');await w.charge(player,0.01,'Safety check');await w.charge(player,0.02,'Planning a tile');
 await w.refund(player,0.02,'Money back');
 const b=await w.billing(player),m=Object.values(b.by)[0];
 assert.deepEqual(m['Safety check'],{usd:0.02,n:2});assert.deepEqual(m['Money back'],{usd:-0.02,n:1});
 assert.deepEqual(b.items.map(i=>[i.what,i.usd,i.n||1]),[['Safety check',0.02,2],['Planning a tile',0.02,1],['Money back',-0.02,1]]);
 assert.equal(Math.round(b.spent*100)/100,0.02);
});
