// On-demand overseer context. Reuses the private feedback service; no new store or model call.
const {ownerOnly, OWNER_ONLY} = require('../lib/owner-only.cjs');
const data = require('../studies/context.json');
async function readFeedback(req) {
  return new Promise((resolve,reject) => {
    const response={statusCode:200,setHeader(){},end(body){
      try {if(this.statusCode!==200) reject(new Error('Feedback unavailable')); else resolve(JSON.parse(body).items || []);}
      catch(e){reject(e);}
    }};
    Promise.resolve(require('./feedback.js')({...req,method:'GET',url:'/api/feedback'},response)).catch(reject);
  });
}
function createHandler({gate=ownerOnly, feedback=readFeedback}={}) { return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  if(req.method!=='GET') return send(405,{error:'GET only'});
  // Always require owner auth, even when other legacy owner tools are unlocked.
  if(!await gate(req,{env:{...process.env,OWNER_TOOLS_LOCKED:'true'},robot:true})) return send(401,OWNER_ONLY);
  const p=new URL(req.url,'https://studio.invalid').searchParams;
  if((p.get('q')||'').length>1200 || (p.get('study')||'').length>100) return send(400,{error:'Question or study too long'});
  try {
    const {studioPacket}=await import('../look/studio-context.mjs');
    let evidence=[], feedbackStatus='not requested';
    if(p.get('feedback')==='1') {
      try {evidence=(await feedback(req)).map(e=>({id:e.id,source:`/api/feedback#${e.id}`,summary:e.note || '',observedAt:e.receivedAt,study:e.studyId || e.entryId,revision:e.sha || e.buildId,status:'unreviewed user feedback'}));feedbackStatus='latest feedback read; not an exhaustive history';}
      catch {feedbackStatus='unavailable; no claim of current feedback coverage';}
    }
    const packet=studioPacket(data,{study:p.get('study')||'',question:p.get('q')||'',evidence});
    return send(200,{...packet,feedbackStatus});
  } catch {return send(503,{error:'Studio context unavailable'});}
};}
module.exports=createHandler();
module.exports.createHandler=createHandler;
