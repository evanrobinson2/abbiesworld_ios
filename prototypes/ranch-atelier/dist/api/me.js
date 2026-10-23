// The signed-in player and their saved worlds. See ACCOUNTS.md.
//  GET /api/me              {signedIn, owner, tag, left, signInReady}
//  GET /api/me?save=1       {updated, saves:{<localStorage key>: <string>}} or {saves:null}
//  PUT /api/me {updated, saves}   stores this player's worlds (only the game's own save keys)
const {account}=require('../lib/account.cjs');
const {wallet}=require('../lib/wallet.cjs');
const KEYS=new Set(['abbies-simulations-v1','abbies-suburban-v1']);
const MAX=4000000;
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};

function createHandler({env=process.env,who=account,purse=wallet,blob=()=>require('@vercel/blob')}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const me=who(req,env),path=me&&`saves/v1/${me.id}.json`;
 try{
  if(req.method==='GET'){
   const q=new URL(req.url||'/','https://x.invalid').searchParams;
   if(!q.get('save'))return json(res,200,{signedIn:!!me,owner:!!me?.owner,tag:me?me.id.slice(0,8):null,left:me?Math.floor(await purse().left(me)*100)/100:0,signInReady:!!(env.AUTH0_WEB_CLIENT_ID&&env.AUTH_SESSION_SECRET)});
   if(!me)return json(res,401,{error:'Sign in to load your worlds.'});
   const got=await blob().get(path,{access:'private',useCache:false}).catch(()=>null);
   if(!got||got.statusCode!==200)return json(res,200,{saves:null});
   res.statusCode=200;res.setHeader('Content-Type','application/json');return res.end(Buffer.from(await new Response(got.stream).arrayBuffer()));
  }
  if(req.method==='PUT'){
   if(!me)return json(res,401,{error:'Sign in to keep your worlds.'});
   const host=req.headers['x-forwarded-host']||req.headers.host;if(req.headers.origin!==`https://${host}`)return json(res,403,{error:'Save from the game.'});
   const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
   const saves={};for(const [k,v]of Object.entries(body?.saves||{}))if(KEYS.has(k)&&typeof v==='string')saves[k]=v;
   const doc=JSON.stringify({updated:Number(body?.updated)||Date.now(),saves});
   if(doc.length>MAX)return json(res,413,{error:'These worlds are too big to keep online; they stay saved on this device.'});
   await blob().put(path,doc,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
   return json(res,200,{ok:true});
  }
  return json(res,405,{error:'Use GET or PUT.'});
 }catch(e){console.error('[me]',e.message);return json(res,500,{error:'Your account is resting. Your worlds stay saved on this device.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
