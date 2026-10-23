// Player accounts for the Ranch Atelier: sign in with the Auth0 tenant the iOS app already uses.
// We keep nothing about a person except a one-way account id (a hash of their Auth0 user id) and
// whether they are the owner. No name, no email, no profile. See ACCOUNTS.md.
const {createHmac,createHash,timingSafeEqual,randomBytes,createPublicKey,createVerify}=require('node:crypto');

const AUTH0_DOMAIN='dev-33h7qd4ytudlk0ls.us.auth0.com';
const SESSION='aw_session',PENDING='aw_signin';
const SESSION_TTL=60*86400000,PENDING_TTL=10*60000;
// Hosts that may sign in; each one's /api/auth/callback is registered in Auth0.
const HOSTS=new Set(['ranch.abbies.world','www.abbies.world','abbies-ranch-atelier.vercel.app']);

const b64=s=>Buffer.from(s).toString('base64url');
const unb64=s=>Buffer.from(s,'base64url').toString();
const mac=(text,secret)=>createHmac('sha256',secret).update(text).digest('base64url');
function seal(value,secret){const body=b64(JSON.stringify(value));return `${body}.${mac(body,secret)}`;}
function unseal(token,secret,now=Date.now()){
 if(!secret||typeof token!=='string')return null;
 const at=token.lastIndexOf('.');if(at<1)return null;
 const body=token.slice(0,at),got=Buffer.from(token.slice(at+1)),want=Buffer.from(mac(body,secret));
 if(got.length!==want.length||!timingSafeEqual(got,want))return null;
 try{const value=JSON.parse(unb64(body));return value&&value.x>now?value:null;}catch{return null;}
}
function cookies(req){
 const out={};for(const part of String(req.headers?.cookie||'').split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());}
 return out;
}
const cookie=(name,value,maxAgeMs)=>`${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0,Math.floor(maxAgeMs/1000))}`;
const accountId=sub=>createHash('sha256').update('abbies-world-player:'+sub).digest('hex').slice(0,24);
const ownerEmails=env=>new Set(String(env.OWNER_EMAILS||'').toLowerCase().split(/[\s,]+/).filter(Boolean));
function config(env=process.env){return {domain:env.AUTH0_DOMAIN||AUTH0_DOMAIN,clientId:env.AUTH0_WEB_CLIENT_ID||'',secret:env.AUTH_SESSION_SECRET||''};}

// The signed-in player, or null. {id, owner}
function account(req,env=process.env,now=Date.now()){
 const s=unseal(cookies(req)[SESSION],config(env).secret,now);
 return s&&/^[a-f0-9]{24}$/.test(s.a)?{id:s.a,owner:s.o===1}:null;
}
function hostOf(req){const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').toLowerCase();return HOSTS.has(host)?host:null;}
const safeReturn=path=>typeof path==='string'&&/^\/(?!\/)[\w\-./?=&%#]*$/.test(path)&&path.length<300?path:'/sandbox';

// Step 1: send the browser to Auth0's sign-in page with PKCE; nothing is stored server-side.
function beginSignIn(req,env=process.env,now=Date.now()){
 const {domain,clientId,secret}=config(env),host=hostOf(req);
 if(!clientId||!secret||!host)return null;
 const verifier=randomBytes(32).toString('base64url'),state=randomBytes(16).toString('base64url'),nonce=randomBytes(16).toString('base64url');
 const url=new URL(`https://${domain}/authorize`);
 const returnTo=safeReturn(new URL(req.url||'/','https://x.invalid').searchParams.get('return'));
 for(const [k,v]of Object.entries({response_type:'code',client_id:clientId,redirect_uri:`https://${host}/api/auth/callback`,scope:'openid email',state,nonce,
  code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(k,v);
 return {location:url.toString(),cookie:cookie(PENDING,seal({v:verifier,s:state,n:nonce,r:returnTo,x:now+PENDING_TTL},secret),PENDING_TTL)};
}

let jwksCache=null;
async function signingKey(domain,kid,fetcher){
 if(!jwksCache||jwksCache.domain!==domain||Date.now()-jwksCache.at>3600000){
  const r=await fetcher(`https://${domain}/.well-known/jwks.json`,{signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error('jwks '+r.status);
  jwksCache={domain,at:Date.now(),keys:(await r.json()).keys||[]};
 }
 const jwk=jwksCache.keys.find(k=>k.kid===kid&&k.kty==='RSA');if(!jwk)throw Error('unknown signing key');
 return createPublicKey({key:jwk,format:'jwk'});
}
async function verifyIdToken(token,{domain,clientId,nonce},fetcher,now=Date.now()){
 const [h,p,s]=String(token||'').split('.');if(!s)throw Error('bad token');
 const header=JSON.parse(unb64(h)),claims=JSON.parse(unb64(p));
 if(header.alg!=='RS256')throw Error('bad alg');
 const v=createVerify('RSA-SHA256');v.update(`${h}.${p}`);
 if(!v.verify(await signingKey(domain,header.kid,fetcher),Buffer.from(s,'base64url')))throw Error('bad signature');
 const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
 if(claims.iss!==`https://${domain}/`||!aud.includes(clientId)||!(claims.exp*1000>now-60000)||claims.nonce!==nonce||!claims.sub)throw Error('bad claims');
 return claims;
}

// Step 2: Auth0 sends the browser back with a code; trade it for an ID token and keep only the hash.
async function finishSignIn(req,env=process.env,{fetcher=fetch,now=Date.now()}={}){
 const {domain,clientId,secret}=config(env),host=hostOf(req);
 const pending=unseal(cookies(req)[PENDING],secret,now),q=new URL(req.url||'/','https://x.invalid').searchParams;
 const clear=cookie(PENDING,'',0);
 if(!host||!pending||!q.get('code')||q.get('state')!==pending.s)return {error:'expired',cookies:[clear],returnTo:pending?.r||'/sandbox'};
 const r=await fetcher(`https://${domain}/oauth/token`,{method:'POST',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json'},
  body:JSON.stringify({grant_type:'authorization_code',client_id:clientId,code:q.get('code'),code_verifier:pending.v,redirect_uri:`https://${host}/api/auth/callback`})});
 if(!r.ok)return {error:'token',cookies:[clear],returnTo:pending.r};
 const claims=await verifyIdToken((await r.json()).id_token,{domain,clientId,nonce:pending.n},fetcher,now);
 // The email is read once, only to recognise the owner, and never stored.
 const owner=claims.email_verified===true&&ownerEmails(env).has(String(claims.email||'').toLowerCase());
 const session=seal({a:accountId(claims.sub),o:owner?1:0,x:now+SESSION_TTL},secret);
 return {cookies:[clear,cookie(SESSION,session,SESSION_TTL)],returnTo:pending.r,owner};
}

function signOut(req,env=process.env){
 const {domain,clientId}=config(env),host=hostOf(req)||'ranch.abbies.world';
 const url=new URL(`https://${domain}/v2/logout`);url.searchParams.set('client_id',clientId);url.searchParams.set('returnTo',`https://${host}/sandbox`);
 return {location:clientId?url.toString():'/sandbox',cookie:cookie(SESSION,'',0)};
}

module.exports={account,beginSignIn,finishSignIn,signOut,seal,unseal,accountId,verifyIdToken,cookies,HOSTS,SESSION,PENDING,_reset(){jwksCache=null;}};
