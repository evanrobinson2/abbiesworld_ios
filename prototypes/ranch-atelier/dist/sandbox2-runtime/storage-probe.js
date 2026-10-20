// Explicit diagnostic writes only. Never opens the card or Board databases.
let running=false,lastResult=null;
const errorInfo=e=>({name:String(e?.name||'Error').slice(0,80),message:String(e?.message||'').slice(0,200),code:typeof e?.code==='number'?e.code:null});
const record=sequence=>({id:'probe',sequence,payload:'x'.repeat(64)});
export async function runStorageProbe(){
 if(running)throw Error('Storage probe is already running');
 if(lastResult)return structuredClone(lastResult);
 running=true;
 const started=performance.now(),databaseName='ranch-storage-probe-'+crypto.randomUUID();
 const report={version:1,databaseName,origin:location.origin,startedAt:new Date().toISOString(),status:'running',steps:[],events:[],readback:null,retained:true,retries:0};
 const event=(stage,details={})=>{if(report.events.length<64)report.events.push({stage,ms:Math.round(performance.now()-started),...details});};
 const wrap=(error,stage)=>{const e=Error(error?.message||error?.name||stage,{cause:error});e.name=error?.name||'Error';e.stage=stage;return e;};
 let connection;
 function open(){return new Promise((resolve,reject)=>{
  let failed=false;event('open-start');const request=indexedDB.open(databaseName,1);
  request.onupgradeneeded=()=>{
   if(failed){request.transaction.abort();return;}
   const upgrade=request.transaction;event('schema-start');upgrade.onabort=()=>event('schema-abort',{error:errorInfo(upgrade.error)});
   upgrade.oncomplete=()=>event('schema-complete');
   request.result.createObjectStore('primary',{keyPath:'id'});request.result.createObjectStore('secondary',{keyPath:'id'});
  };
  request.onblocked=()=>{failed=true;event('open-blocked');reject(wrap(Error('Diagnostic database open blocked'),'open'));};
  request.onerror=()=>{failed=true;event('open-error',{error:errorInfo(request.error)});reject(wrap(request.error,'open'));};
  request.onsuccess=()=>{if(failed){request.result.close();return;}event('open-success');resolve(request.result);};
 });}
 function write(name,stores,operations){return new Promise((resolve,reject)=>{
  const step={name,status:'pending',stores,requestCount:operations.length,jsonBytes:operations.reduce((sum,o)=>sum+new TextEncoder().encode(JSON.stringify(o.value)).byteLength,0)};report.steps.push(step);
  let tx,firstError=null;
  const remember=e=>{if(e&&(!firstError||(firstError.name==='AbortError'&&e.name!=='AbortError')))firstError=e;};
  const fail=()=>{step.status='failed';step.error=errorInfo(firstError||tx?.error);reject(wrap(firstError||tx?.error,name));};
  try{
   event('transaction-start',{step:name});tx=connection.transaction(stores,'readwrite');
   tx.onerror=e=>{remember(e.target?.error||tx.error);event('transaction-error',{step:name,error:errorInfo(e.target?.error||tx.error)});};
   tx.onabort=()=>{remember(tx.error);event('transaction-abort',{step:name,error:errorInfo(tx.error)});fail();};
   tx.oncomplete=()=>{step.status='committed';event('transaction-complete',{step:name});resolve();};
   for(const operation of operations){const {store,method,value}=operation;event('request-start',{step:name,store,method});const request=tx.objectStore(store)[method](value);
    request.onsuccess=()=>event('request-success',{step:name,store,method});
    request.onerror=()=>{remember(request.error);event('request-error',{step:name,store,method,error:errorInfo(request.error)});};
   }
  }catch(e){remember(e);event('transaction-exception',{step:name,error:errorInfo(e)});if(tx){try{tx.abort();}catch{fail();}}else fail();}
 });}
 function readback(){return new Promise((resolve,reject)=>{
  let tx;const result={};
  try{
   event('readback-start');tx=connection.transaction(['primary','secondary'],'readonly');
   tx.onabort=()=>reject(wrap(tx.error,'readback'));tx.onerror=()=>{};tx.oncomplete=()=>{event('readback-complete');resolve(result);};
   for(const store of ['primary','secondary']){const request=tx.objectStore(store).get('probe');
    request.onsuccess=()=>{const value=request.result;result[store]=value?{present:true,sequence:value.sequence,payloadMatches:value.payload==='x'.repeat(64)}:{present:false};};
    request.onerror=()=>event('readback-error',{store,error:errorInfo(request.error)});
   }
  }catch(e){reject(wrap(e,'readback'));}
 });}
 try{
  connection=await open();connection.onversionchange=()=>{event('versionchange');connection.close();};
  await write('insert',['primary'],[{store:'primary',method:'add',value:record(0)}]);
  await write('overwrite',['primary'],[{store:'primary',method:'put',value:record(1)}]);
  await write('combined',['primary','secondary'],[{store:'primary',method:'put',value:record(2)},{store:'secondary',method:'add',value:record(0)}]);
  report.status='succeeded';
 }catch(error){report.status='failed';report.failureStage=error.stage||'open';report.error=errorInfo(error.cause||error);}
 finally{
  if(connection){try{report.readback=await readback();}catch(e){report.readback={error:errorInfo(e.cause||e)};}connection.close();event('connection-close');}
  else report.readback={unavailable:'Database did not open; no second open attempted'};
  report.durationMs=Math.round(performance.now()-started);lastResult=structuredClone(report);running=false;
 }
 return structuredClone(lastResult);
}
