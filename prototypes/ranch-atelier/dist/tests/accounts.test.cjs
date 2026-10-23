const test=require('node:test');
const assert=require('node:assert/strict');
const {generateKeyPairSync,createSign}=require('node:crypto');
const acct=require('../lib/account.cjs');
const {createWallet,CAPS}=require('../lib/wallet.cjs');
const {issueTicket,checkTicket,ticketAccount}=require('../lib/live-ticket.cjs');

const ENV={AUTH0_WEB_CLIENT_ID:'web-client',AUTH_SESSION_SECRET:'session-secret',OWNER_EMAILS:'owner@example.com'};
const DOMAIN='dev-33h7qd4ytudlk0ls.us.auth0.com';
const req=(url,{host='ranch.abbies.world',cookie=''}={})=>({url,headers:{host,cookie}});
const cookieHeader=list=>list.map(c=>c.split(';')[0]).join('; ');

// A fake Auth0: one RSA key, a token endpoint that returns an ID token for whoever we say.
function fakeAuth0(claimsFor){
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwk={...publicKey.export({format:'jwk'}),kid:'k1',alg:'RS256',use:'sig'};
 const seen=[];
 const fetcher=async(url,init={})=>{
  seen.push({url,body:init.body&&JSON.parse(init.body)});
  if(url.endsWith('/.well-known/jwks.json'))return {ok:true,json:async()=>({keys:[jwk]})};
  if(url.endsWith('/oauth/token')){
   const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
   const body=`${enc({alg:'RS256',kid:'k1'})}.${enc({iss:`https://${DOMAIN}/`,aud:'web-client',exp:Math.floor(Date.now()/1000)+600,...claimsFor()})}`;
   const s=createSign('RSA-SHA256');s.update(body);
   return {ok:true,json:async()=>({id_token:`${body}.${s.sign(privateKey).toString('base64url')}`})};
  }
  return {ok:false,status:404};
 };
 fetcher.seen=seen;return fetcher;
}
async function signIn(claims,{tamperState=false,tamperNonce=false}={}){
 acct._reset();
 const start=acct.beginSignIn(req('/api/auth/login?return=/sandbox?family=ranch'),ENV);
 const url=new URL(start.location),pending=cookieHeader([start.cookie]);
 const state=tamperState?'nope':url.searchParams.get('state');
 const fetcher=fakeAuth0(()=>({nonce:tamperNonce?'other':url.searchParams.get('nonce'),...claims}));
 const out=await acct.finishSignIn(req(`/api/auth/callback?code=abc&state=${state}`,{cookie:pending}),ENV,{fetcher});
 return {start,url,out,fetcher};
}

test('sign-in goes to the existing Auth0 tenant with PKCE and only asks for the login',async()=>{
 const {url,start}=await signIn({sub:'google-oauth2|1'});
 assert.equal(url.host,DOMAIN);assert.equal(url.searchParams.get('client_id'),'web-client');
 assert.equal(url.searchParams.get('redirect_uri'),'https://ranch.abbies.world/api/auth/callback');
 assert.equal(url.searchParams.get('scope'),'openid email');assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.match(start.cookie,/HttpOnly; Secure; SameSite=Lax/);
 assert.equal(acct.beginSignIn(req('/api/auth/login',{host:'evil.example'}),ENV),null,'only our own addresses');
 assert.equal(acct.beginSignIn(req('/api/auth/login'),{}),null,'not set up yet');
});

test('the session keeps only a hashed account id and whether it is the owner',async()=>{
 const {out,fetcher}=await signIn({sub:'google-oauth2|42',email:'Kid.Parent@example.com',email_verified:true,name:'A Parent'});
 assert.equal(out.error,undefined);assert.equal(out.returnTo,'/sandbox?family=ranch');
 assert.equal(fetcher.seen.find(s=>s.url.endsWith('/oauth/token')).body.code_verifier.length>40,true);
 const me=acct.account(req('/',{cookie:cookieHeader(out.cookies)}),ENV);
 assert.deepEqual(me,{id:acct.accountId('google-oauth2|42'),owner:false});
 const session=out.cookies.find(c=>c.startsWith(acct.SESSION+'='));
 const payload=Buffer.from(decodeURIComponent(session.split('=')[1].split(';')[0]).split('.')[0],'base64url').toString();
 assert.ok(!/parent|example|google/i.test(payload),'no email, name or provider id is stored: '+payload);
 const owner=(await signIn({sub:'google-oauth2|7',email:'OWNER@example.com',email_verified:true})).out;
 assert.equal(acct.account(req('/',{cookie:cookieHeader(owner.cookies)}),ENV).owner,true);
 const unverified=(await signIn({sub:'auth0|9',email:'owner@example.com',email_verified:false})).out;
 assert.equal(acct.account(req('/',{cookie:cookieHeader(unverified.cookies)}),ENV).owner,false,'an unverified email is not the owner');
});

test('forged, stale or mixed-up sign-ins are refused',async()=>{
 assert.equal((await signIn({sub:'x'},{tamperState:true})).out.error,'expired');
 await assert.rejects(signIn({sub:'x'},{tamperNonce:true}),/bad claims/);
 const {out}=await signIn({sub:'google-oauth2|5'});
 const c=cookieHeader(out.cookies);
 assert.equal(acct.account(req('/',{cookie:c}),{...ENV,AUTH_SESSION_SECRET:'other'}),null);
 assert.equal(acct.account(req('/',{cookie:c.replace(/.\.(?=[^.]*$)/,m=>(m[0]==='A'?'B':'A')+'.')}),ENV),null);
 assert.equal(acct.account(req('/',{cookie:c}),ENV,Date.now()+61*86400000),null,'sessions expire');
 const seal=acct.seal({a:'b'.repeat(24),o:1,x:Date.now()+1000},'session-secret');
 assert.deepEqual(acct.account(req('/',{cookie:`${acct.SESSION}=${seal}`}),ENV),{id:'b'.repeat(24),owner:true});
});

function memoryStore(){
 const data=new Map();let n=0;const tick=()=>new Promise(r=>setImmediate(r));
 return {data,async read(p){await tick();const v=data.get(p);return v?{value:JSON.parse(v.body),etag:v.etag}:{value:null,etag:null};},
  async write(p,value,etag){await tick();const cur=data.get(p);if(etag?cur?.etag!==etag:cur)return false;data.set(p,{body:JSON.stringify(value),etag:'e'+(++n)});return true;}};
}
const person=i=>({id:String(i).padStart(24,'0'),owner:false});

test('caps: $1 per person, $100 for all public players, $1000 for the owner',async()=>{
 assert.deepEqual(CAPS,{person:1,public:100,owner:1000});
 const w=createWallet({store:memoryStore()});
 assert.equal(await w.charge(person(1),0.6),true);assert.equal(await w.charge(person(1),0.5),false,'would pass $1');
 assert.equal(await w.charge(person(1),0.4),true);assert.equal(await w.left(person(1)),0);
 assert.equal(await w.charge(null,0.01),false,'nobody signed in, nothing spent');
 const owner={id:'f'.repeat(24),owner:true};
 assert.equal(await w.charge(owner,999),true);assert.equal(await w.charge(owner,2),false);assert.equal(Math.round(await w.left(owner)),1);
 assert.equal(await w.left(person(2)),1,'the owner does not use up the public pool');
});

test('the public pool stops at $100 however many people sign up',async()=>{
 const store=memoryStore(),w=createWallet({store});
 let ok=0;for(let i=10;i<112;i++)if(await w.charge(person(i),1))ok++;
 assert.equal(ok,100);assert.equal(await w.left(person(500)),0);
 const pool=[...store.data].filter(([k])=>k.startsWith('spend/v1/public/')).reduce((n,[,v])=>n+JSON.parse(v.body).usd,0);
 assert.equal(Math.round(pool*1e6)/1e6,100,'the shards add up to exactly $100');
 assert.equal(store.data.has(`spend/v1/people/${person(111).id}.json`),false,'a refused charge leaves no trace');
});

test('charges at the same moment never overspend',async()=>{
 const store=memoryStore(),w=createWallet({store});
 const results=await Promise.all(Array.from({length:20},()=>w.charge(person(3),0.1).catch(()=>false)));
 const ok=results.filter(Boolean).length;
 const spent=JSON.parse(store.data.get(`spend/v1/people/${person(3).id}.json`).body).usd;
 assert.ok(ok<=10,`${ok} charges went through`);assert.ok(spent<=1+1e-9,`spent ${spent}`);
 assert.equal(Math.round(spent*10),ok);
});

test('relay tickets carry the player so the relay can charge them',()=>{
 const env={LIVE_TICKET_SECRET:'t'};
 const t=issueTicket(env,Date.now(),60000,'',{id:'c'.repeat(24),owner:true});
 assert.equal(checkTicket(t,env),true);assert.deepEqual(ticketAccount(t),{id:'c'.repeat(24),owner:true});
 assert.equal(ticketAccount(issueTicket(env)),null);
});

test('paid live mode needs a signed-in player with money left',async()=>{
 const {createHandler}=require('../api/live.js');
 const calls=[];const fetcher=async(...a)=>{calls.push(a);return {ok:true,json:async()=>({choices:[{message:{content:'{"verdict":"ok"}'}}]})};};
 const call=(h,body)=>new Promise(resolve=>h({method:'POST',body,headers:{origin:'https://ranch.test',host:'ranch.test','x-vercel-oidc-token':'t'}},{statusCode:200,setHeader(){},end(s){resolve({status:this.statusCode,body:JSON.parse(s)});}}));
 const env={LIVE_TICKET_SECRET:'x'};
 assert.equal((await call(createHandler({fetcher,env,who:()=>null}),{action:'session'})).status,401);
 const broke=createHandler({fetcher,env,who:()=>person(4),purse:()=>({left:async()=>0,charge:async()=>false})});
 const r=await call(broke,{action:'session'});assert.equal(r.status,402);assert.equal(r.body.budget,true);
 assert.equal((await call(broke,{action:'guard',who:'child',text:'make a barn'})).status,402);
 assert.equal(calls.length,0,'no paid call is made once the cap is reached');
 const paid=[];const rich=createHandler({fetcher,env,who:()=>person(5),purse:()=>({left:async()=>1,charge:async(a,usd)=>{paid.push(usd);return true;}})});
 const ok=await call(rich,{action:'session'});assert.equal(ok.status,200);
 assert.deepEqual(ticketAccount(new URL(ok.body.url).searchParams.get('ticket')),person(5));
 assert.equal((await call(rich,{action:'guard',who:'child',text:'make a barn'})).body.verdict,'ok');assert.equal(paid.length,2);
});
