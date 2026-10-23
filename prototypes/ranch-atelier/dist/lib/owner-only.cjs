// Evan's tools (feedback inbox, workshop activity, model reviews and orders) are his, not players'.
// With OWNER_TOOLS_LOCKED=true they need the owner's sign-in. The feedback-inbox GitHub Action has no
// cookie, so it proves itself with a GitHub Actions OIDC token instead (no stored secret on either side).
// Off by default so nothing breaks before Evan has signed in; turning it on is a launch-gate step (docs/launch/SECURITY_AUDIT.md).
const {createPublicKey,createVerify}=require('node:crypto');
const {account}=require('./account.cjs');

const ISSUER='https://token.actions.githubusercontent.com';
const AUDIENCE='abbies-ranch-atelier';
const REPO='evanrobinson2/abbiesworld_ios';
const WORKFLOWS=[`${REPO}/.github/workflows/feedback-inbox.yml@refs/heads/main`];
const unb64=s=>Buffer.from(s,'base64url').toString();

let jwks=null;
async function githubKey(kid,fetcher){
 if(!jwks||Date.now()-jwks.at>3600000||!jwks.keys.some(k=>k.kid===kid)){
  const r=await fetcher(`${ISSUER}/.well-known/jwks`,{signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error('jwks '+r.status);
  jwks={at:Date.now(),keys:(await r.json()).keys||[]};
 }
 const jwk=jwks.keys.find(k=>k.kid===kid&&k.kty==='RSA');if(!jwk)throw Error('unknown signing key');
 return createPublicKey({key:jwk,format:'jwk'});
}

// A GitHub Actions OIDC token from one of WORKFLOWS on main in this repo, or throws.
async function verifyGithubRun(token,fetcher=fetch,now=Date.now()){
 const [h,p,s]=String(token||'').split('.');if(!s)throw Error('bad token');
 const header=JSON.parse(unb64(h)),claims=JSON.parse(unb64(p));
 if(header.alg!=='RS256')throw Error('bad alg');
 const v=createVerify('RSA-SHA256');v.update(`${h}.${p}`);
 if(!v.verify(await githubKey(header.kid,fetcher),Buffer.from(s,'base64url')))throw Error('bad signature');
 const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
 if(claims.iss!==ISSUER||!aud.includes(AUDIENCE)||!(claims.exp*1000>now)||claims.repository!==REPO||!WORKFLOWS.includes(claims.job_workflow_ref||claims.workflow_ref))throw Error('bad claims');
 return claims;
}

// true when the request may use an owner tool. robot: also accept the feedback-inbox Action.
async function ownerOnly(req,{env=process.env,who=account,fetcher=fetch,robot=false}={}){
 if(env.OWNER_TOOLS_LOCKED!=='true')return true;
 if(who(req,env)?.owner)return true;
 const auth=String(req.headers?.authorization||'');
 if(robot&&auth.startsWith('Bearer '))try{await verifyGithubRun(auth.slice(7),fetcher);return true;}catch{}
 return false;
}
const OWNER_ONLY={error:'Only Evan can use this. Sign in on ranch.abbies.world.',signIn:true};

module.exports={ownerOnly,verifyGithubRun,OWNER_ONLY,AUDIENCE,_reset(){jwks=null;}};
