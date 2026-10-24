// Project chat (AW-STUDY-0061): Evan's chat in the game, passed through to this project as work.
//  GET  /api/project-chat                 {enabled, ready}
//  POST /api/project-chat {message, hex?}  {ok, issue} | {error}
//  GET  /api/project-chat?issue=N          {status: sent|received|working|result, comments:[{who,at,text}]}
// It rides the existing issue intake (docs/dispatch/ISSUE_INTAKE.md): the message becomes a GitHub issue labelled game-chat, the
// chatgpt-issue-intake Action acknowledges it and fires the routine, which builds, merges and comments the result on the issue.
// Guardrails: off unless PROJECT_CHAT_ENABLED=true; only the signed-in owner account; same-origin; a message that looks like a secret
// is refused, never forwarded; only issues labelled game-chat can be read back. The token (PROJECT_CHAT_GITHUB_TOKEN: a fine-grained
// token for this repo with Issues read and write and nothing else) lives only on the server.
const {account}=require('../lib/account.cjs');
const REPO='evanrobinson2/abbiesworld_ios',LABEL='game-chat',API='https://api.github.com';
const json=(res,code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
const SECRET=/(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{12,}|xox[abp]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.|(api[_-]?key|secret|password|token)\s*[:=]\s*\S{8,})/i;
const clean=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,'').replace(/\s+\n/g,'\n').trim().slice(0,1500);
function createHandler({fetcher=fetch,env=process.env,now=Date.now,who=account}={}){
 const hits=new Map();
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const enabled=env.PROJECT_CHAT_ENABLED==='true',token=env.PROJECT_CHAT_GITHUB_TOKEN;
  const me=who(req,env);
  const on=enabled&&!!me?.owner,asking=/[?&]issue=/.test(req.url||'');
  // Everyone else gets the same answer as "off", so players never learn it exists.
  if(req.method==='GET'&&!asking)return json(res,200,on?{enabled:true,ready:!!token}:{enabled:false});
  if(!on)return json(res,403,{error:'Not available.'});
  if(!token)return json(res,503,{error:'The project line is not connected yet.'});
  const gh=(path,init={})=>fetcher(API+path,{...init,signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'}});
  try{
   if(req.method==='GET'){
    const n=Number(new URL(req.url,'https://x.invalid').searchParams.get('issue'));if(!Number.isInteger(n)||n<1)return json(res,400,{error:'Bad issue.'});
    const r=await gh(`/repos/${REPO}/issues/${n}`);if(!r.ok)return json(res,404,{error:'Not found.'});const issue=await r.json();
    if(!(issue.labels||[]).some(l=>(l.name||l)===LABEL))return json(res,404,{error:'Not found.'});
    const c=await gh(`/repos/${REPO}/issues/${n}/comments?per_page=30`),comments=c.ok?await c.json():[];
    const shake=x=>/abbies-intake:v1/.test(x.body||''),work=comments.filter(x=>!shake(x));
    const status=issue.state==='closed'?'result':work.length?'working':comments.some(shake)||(issue.labels||[]).some(l=>(l.name||l)==='claude-intake')?'received':'sent';
    return json(res,200,{status,title:issue.title,comments:work.slice(-8).map(x=>({who:x.user?.login==='github-actions[bot]'?'intake':'project',at:x.created_at,text:clean(x.body)}))});
   }
   if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
   const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
   if(!origin||origin!==`https://${host}`&&!(env.LIVE_DEV_ORIGIN&&origin===env.LIVE_DEV_ORIGIN))return json(res,403,{error:'Chat from inside the game.'});
   let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return json(res,400,{error:'Invalid request.'});}
   const message=typeof body?.message==='string'?body.message.trim().slice(0,2000):'';
   if(!message)return json(res,400,{error:'Say what you want.'});
   if(SECRET.test(message))return json(res,422,{error:'That looks like a password or key, so I did not send it. Never paste secrets here.'});
   const at=now();for(const [k,v]of hits)if(at-v.at>3600000)hits.delete(k);const h=hits.get('o')||{at,n:0};if(h.n>=30)return json(res,429,{error:'That is a lot of messages. Try again in a bit.'});h.n++;hits.set('o',h);
   const hex=body.hex&&typeof body.hex==='object'?{id:String(body.hex.id||'').slice(0,40),label:String(body.hex.label||'').slice(0,60)}:null;
   const page=String(body.page||'').replace(/[^\w/.\-?=&]/g,'').slice(0,120);
   const first=message.replace(/\s+/g,' ').slice(0,60);
   const text=`<!-- abbies-game-chat:v1 ${JSON.stringify({hex,page})} -->\nFrom the in-game chat (Evan, signed in).${hex?`\nSelected hex: ${hex.label||hex.id} (${hex.id})`:''}${page?`\nPage: ${page}`:''}\n\n${message}\n\n(Build it on a branch, merge to main, comment the result here, and do not deploy.)`;
   const r=await gh(`/repos/${REPO}/issues`,{method:'POST',body:JSON.stringify({title:`[game-chat] ${first}`,body:text,labels:[LABEL]})});
   if(!r.ok)return json(res,502,{error:'Could not reach the project. Try again.'});
   return json(res,200,{ok:true,issue:(await r.json()).number});
  }catch{return json(res,502,{error:'Could not reach the project. Try again.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
