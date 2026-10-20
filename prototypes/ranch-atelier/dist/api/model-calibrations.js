const {timingSafeEqual,randomUUID}=require('node:crypto');
const ids=new Set(require('../simulation-assets/catalog.json').map(r=>r.id));
const PATH='ranch-models/v1/calibrations.json';
const reply=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
function createHandler(store=require('@vercel/blob')){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return reply(res,405,{error:'Method not allowed'});
 if(req.method==='POST'){
  const token=(req.headers.authorization||'').replace(/^Bearer /,''),key=process.env.RANCH_VIEW_WRITE_KEY;
  if(!key||Buffer.byteLength(token)!==Buffer.byteLength(key)||!timingSafeEqual(Buffer.from(token),Buffer.from(key)))return reply(res,401,{error:'Pair this browser before saving shared model sizes.'});
  if(req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`)return reply(res,403,{error:'Origin rejected'});
 }
 try{
  let body;if(req.method==='POST'){try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return reply(res,400,{error:'Invalid JSON'});}
   if(!body||JSON.stringify(body).length>4096||!ids.has(body.id)||!(body.metresPerUnit===null||(Number.isFinite(body.metresPerUnit)&&body.metresPerUnit>0))||!['string','undefined'].includes(typeof body.expectedRevision)||typeof body.approved!=='boolean')return reply(res,400,{error:'Invalid model calibration'});
  }
  for(let attempt=0;attempt<3;attempt++){
   const current=await store.get(PATH,{access:'private',useCache:false});
   if(current&&current.statusCode!==200)throw Error('Storage unavailable');
   const data=current?JSON.parse(await new Response(current.stream).text()):{version:1,units:'metres',models:{}};
   if(req.method==='GET')return reply(res,200,data);
   if((data.models[body.id]?.revision||'')!==(body.expectedRevision||''))return reply(res,409,{error:'This model changed elsewhere. Reload its shared size before saving.'});
   const now=new Date().toISOString(),record={metresPerUnit:body.metresPerUnit,updatedAt:now,revision:randomUUID(),...(body.approved&&body.metresPerUnit!==null?{approvedAt:now}:{})};
   data.models[body.id]=record;
   try{await store.put(PATH,JSON.stringify(data),{access:'private',addRandomSuffix:false,allowOverwrite:!!current,...(current?{ifMatch:current.blob.etag}:{}),contentType:'application/json',cacheControlMaxAge:60});return reply(res,200,{id:body.id,record});}
   catch(e){if(/Precondition|AlreadyExists|Conflict/i.test(e.name)&&attempt<2)continue;throw e;}
  }
 }catch(e){console.error('Calibration storage failed:',e.name);return reply(res,503,{error:'Shared model storage unavailable. Your adjustment has not been saved.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
