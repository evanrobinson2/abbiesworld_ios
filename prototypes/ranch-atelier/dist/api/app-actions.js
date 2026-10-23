const {timingSafeEqual,createHash}=require('node:crypto');
const PREFIX='ranch-actions/v1/';
const safe=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(s);
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const capability=key=>key?createHash('sha256').update('ranch-actions-v1:'+key).digest('hex'):null;
function createHandler(store=require('@vercel/blob')) {
  async function read(path){const r=await store.get(path,{access:'private',useCache:false});return r?.statusCode===200?JSON.parse(await new Response(r.stream).text()):null;}
  async function writeOnce(path,value){await store.put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',cacheControlMaxAge:60});}
  return async function(req,res){
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
    const reply=(status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
    const token=(req.headers.authorization||'').replace(/^Bearer /,''),browser=equal(token,process.env.RANCH_VIEW_WRITE_KEY),agent=equal(token,capability(process.env.RANCH_VIEW_WRITE_KEY)),reader=equal(token,process.env.RANCH_VIEW_READ_KEY);
    if(!browser&&!agent&&!reader)return reply(401,{error:'Action authentication required'});
    if(req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`)return reply(403,{error:'Origin rejected'});
    try {
      const query=new URL(req.url,'https://actions.invalid').searchParams;
      if(req.method==='GET'){
        const sessionId=query.get('sessionId'),id=query.get('id');
        if(!safe(sessionId)||id&&!safe(id))return reply(400,{error:'Invalid target identifier'});
        if(id){
          const command=await read(PREFIX+sessionId+'/commands/'+id+'.json');if(!command)return reply(404,{error:'Unknown command'});
          const receipt=await read(PREFIX+sessionId+'/receipts/'+id+'.json');
          return reply(200,{command,receipt:receipt||{id,status:await read(PREFIX+sessionId+'/started/'+id+'.json')?'running':command.expiresAt<Date.now()?'expired':'queued'}});
        }
        if(!browser)return reply(403,{error:'Only paired browsers may retrieve commands'});
        const blobs=[];let cursor;
        do {const page=await store.list({prefix:PREFIX+sessionId+'/commands/',limit:1000,...(cursor?{cursor}:{})});blobs.push(...page.blobs);cursor=page.hasMore?page.cursor:null;}while(cursor);
        const commands=[];
        for(const item of blobs.filter(b=>Date.now()-Date.parse(b.uploadedAt)<60000).slice(-50)){
          const command=await read(item.pathname);
          if(command&&!await read(PREFIX+sessionId+'/receipts/'+command.id+'.json'))commands.push(command);
        }
        commands.sort((a,b)=>a.createdAt-b.createdAt);return reply(200,{commands});
      }
      if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(!body||JSON.stringify(body).length>1000000)return reply(400,{error:'Invalid action payload'});
      if(body.kind==='started'){
        if(!browser||!safe(body.sessionId)||!safe(body.id))return reply(403,{error:'Invalid browser command start'});
        if(!await read(PREFIX+body.sessionId+'/commands/'+body.id+'.json'))return reply(404,{error:'Unknown command'});
        const path=PREFIX+body.sessionId+'/started/'+body.id+'.json';
        if(!await read(path))try{await writeOnce(path,{id:body.id,startedAt:new Date().toISOString()});}catch(error){if(!await read(path))throw error;}
        return reply(200,{ok:true});
      }
      if(body.kind==='receipt'){
        if(!browser)return reply(403,{error:'Browser receipt authentication required'});
        const {sessionId,receipt}=body;
        if(!safe(sessionId)||!safe(receipt?.id)||!['succeeded','failed'].includes(receipt.status))return reply(400,{error:'Invalid receipt'});
        if(!await read(PREFIX+sessionId+'/commands/'+receipt.id+'.json'))return reply(404,{error:'Unknown command'});
        const path=PREFIX+sessionId+'/receipts/'+receipt.id+'.json';
        if(!await read(path))try{await writeOnce(path,receipt);}catch(error){if(!await read(path))throw error;}
        return reply(200,{ok:true});
      }
      if(!agent)return reply(403,{error:'Mutation capability required; observation access is insufficient'});
      const c=body.command;
      if(!safe(c?.id)||!safe(c?.target?.sessionId)||typeof c.action!=='string'||!c.arguments||Array.isArray(c.arguments)||typeof c.arguments!=='object'||!Number.isFinite(c.expiresAt)||c.expiresAt<Date.now()||c.expiresAt>Date.now()+60000)return reply(400,{error:'Invalid command'});
      const path=PREFIX+c.target.sessionId+'/commands/'+c.id+'.json';
      const match=old=>JSON.stringify([old.target,old.action,old.arguments,old.expectedRevision])===JSON.stringify([c.target,c.action,c.arguments,c.expectedRevision]);
      const existing=await read(path);
      if(existing)return reply(match(existing)?200:409,match(existing)?{command:existing,status:'accepted'}:{error:'Command ID conflict'});
      const view=await read('ranch-view/v1/'+c.target.sessionId+'.json');
      if(!view||!view.sharing||view.visibility!=='visible'||!Number.isFinite(Date.parse(view.receivedAt))||Date.now()-Date.parse(view.receivedAt)>90000)return reply(409,{error:'Target disconnected, paused, hidden or stale'});
      const advertised=view.actions;
      if(!advertised?.target?.enabled||['sessionId','documentId','slug','search','buildId'].some(k=>advertised.target[k]!==c.target[k]))return reply(409,{error:'Target page/build mismatch or actions unavailable'});
      const provider=advertised.providers.find(p=>p.actions.some(a=>a.name===c.action)),action=provider?.actions.find(a=>a.name===c.action);
      if(!action)return reply(400,{error:'Action not advertised by target'});
      if(provider.revision!==c.expectedRevision||action.disabledReason)return reply(409,{error:action.disabledReason||'Revision conflict'});
      const command={id:c.id,target:c.target,action:c.action,arguments:c.arguments,expectedRevision:c.expectedRevision,expiresAt:c.expiresAt,createdAt:Date.now()};
      try{await writeOnce(path,command);}catch(error){const old=await read(path);if(!old)throw error;if(!match(old))return reply(409,{error:'Command ID conflict'});}
      return reply(202,{command,status:'accepted'});
    }catch(error){return reply(500,{error:'Action transport unavailable'});}
  };
}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.capability=capability;
