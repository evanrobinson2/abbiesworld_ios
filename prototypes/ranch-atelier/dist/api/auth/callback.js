// GET /api/auth/callback  Auth0 returns here; we keep only a hashed account id in a signed cookie.
const {finishSignIn}=require('../../lib/account.cjs');
function createHandler(deps={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 let out;
 try{out=await finishSignIn(req,deps.env||process.env,deps);}catch(e){console.error('[auth] callback',e.message);out={error:'verify',cookies:[],returnTo:'/sandbox'};}
 res.statusCode=302;if(out.cookies.length)res.setHeader('Set-Cookie',out.cookies);
 // returnTo is a path here, or a full abbies.world address when the sign-in started on another one (lib/account.cjs).
 const to=out.returnTo||'/sandbox',back=new URL(to,'https://x.invalid');if(out.error)back.searchParams.set('signin','failed');
 res.setHeader('Location',to.startsWith('/')?back.pathname+back.search+back.hash:back.href);res.end();
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
