// Ask the Oracle: POST {idea, audience?, style?} → a game design plan (lib/director.js).
// The model is used for trusted callers only: server callers with the x-oracle-key header (the live voice
// relay, the dispatch MCP) and this site's own page, rate-limited. Everyone else gets the free studies-only plan.
import {consult,gatewayToken,STYLE_IDS,AUDIENCES,PLAN_SCHEMA,DEFAULT_MODEL} from '../lib/director.js';
import {timingSafeEqual} from 'node:crypto';
const buckets=new Map();
const sameKey=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createHandler({fetcher=fetch,env=process.env,now=Date.now}={}){return async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','content-type, x-oracle-key');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();
 const model=env.ORACLE_MODEL||DEFAULT_MODEL,enabled=env.ORACLE_MODEL_ENABLED!=='false';
 if(req.method==='GET')return res.json({schema:PLAN_SCHEMA,styles:STYLE_IDS,audiences:AUDIENCES,model:enabled?model:null,usage:'POST {"idea": "...", "audience": "kid|family|maker", "style": "optional style id"}'});
 if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
 let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return res.status(400).json({error:'Invalid JSON.'});}
 if(!body||typeof body!=='object')return res.status(400).json({error:'Send {"idea": "..."}.'});
 const host=req.headers['x-forwarded-host']||req.headers.host,origin=req.headers.origin;
 const keyed=!!env.ORACLE_KEY&&sameKey(req.headers['x-oracle-key'],env.ORACLE_KEY),ownPage=!!origin&&origin===`https://${host}`;
 let credential=null;
 if(enabled&&(keyed||ownPage)&&body.studiesOnly!==true){
  if(!keyed){
   const at=now(),ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0],b=buckets.get(ip)||{at,n:0};
   if(at-b.at>3600000){b.at=at;b.n=0;}
   if(b.n>=Number(env.ORACLE_PAGE_LIMIT||8))return res.status(429).json({error:'The Oracle needs a rest. Try again in an hour.'});
   b.n++;buckets.set(ip,b);
  }
  credential=gatewayToken(req,env);
 }
 try{return res.json(await consult({idea:body.idea,audience:body.audience||'family',style:body.style||undefined},{fetcher,credential,model}));}
 catch(e){console.error('[consult]',e.message,e.detail||'');return res.status(e.status||502).json({error:e.status===400?e.message:'The Oracle could not finish that plan. Try again.'});}
};}
export default createHandler();
