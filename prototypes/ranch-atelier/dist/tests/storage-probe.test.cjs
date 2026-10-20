const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function harness({failAt=0,failOpen=false}={}){
 const data=new Map(),opens=[],transactions=[],schema=[];let closes=0;
 const context=vm.createContext({structuredClone,TextEncoder,crypto,performance,location:{origin:'https://example.test'},indexedDB:{
  deleteDatabase(){throw Error('Deletion forbidden');},
  open(name,version){
   assert.match(name,/^ranch-storage-probe-[0-9a-f-]+$/);assert.equal(version,1);opens.push(name);
   const req={transaction:{error:null},result:{close(){closes++;},createObjectStore(name){assert(['primary','secondary'].includes(name));schema.push(name);},transaction(stores,mode){
    assert(stores.every(name=>['primary','secondary'].includes(name)));const staged=new Map(),write=mode==='readwrite',number=transactions.filter(t=>t.mode==='readwrite').length+1;
    let aborted=false;const tx={error:null,abort(){aborted=true;queueMicrotask(()=>tx.onabort?.());}};
    const detail={stores:Array.from(stores),mode,requests:[]};transactions.push(detail);
    tx.objectStore=store=>({
     add:value=>put('add',store,value),put:value=>put('put',store,value),
     get(id){const r={};detail.requests.push({method:'get',store});queueMicrotask(()=>{r.result=data.get(store+':'+id);r.onsuccess();});return r;},
     delete(){throw Error('Deletion forbidden');},clear(){throw Error('Clearing forbidden');}
    });
    function put(method,store,value){const r={};detail.requests.push({method,store,value:structuredClone(value)});staged.set(store+':'+value.id,structuredClone(value));queueMicrotask(()=>r.onsuccess());return r;}
    setImmediate(()=>{if(aborted)return;if(write&&number===failAt){tx.error=new DOMException('Commit refused','QuotaExceededError');tx.onabort();}else{for(const [key,value]of staged)data.set(key,value);tx.oncomplete();}});
    return tx;
   }}};
   queueMicrotask(()=>{if(failOpen){req.error=new DOMException('Open refused','QuotaExceededError');req.onerror();return;}req.onupgradeneeded();req.transaction.oncomplete();req.onsuccess();});return req;
  }
 }});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../storage-probe.js'),'utf8').replace(/\bexport /g,'')+'\nglobalThis.run=runStorageProbe;',context);
 return {run:context.run,data,opens,transactions,schema,closes:()=>closes};
}

test('isolated probe commits insert, equal-size overwrite and combined writes, then reads back',async()=>{
 const h=harness(),result=await h.run();
 assert.equal(result.status,'succeeded');assert.deepEqual(h.schema,['primary','secondary']);assert.equal(h.opens.length,1);
 assert.equal(result.databaseName,h.opens[0]);assert.equal(result.retries,0);assert.equal(result.retained,true);
 const writes=h.transactions.filter(t=>t.mode==='readwrite');assert.equal(writes.length,3);
 assert.deepEqual(writes.map(t=>t.stores),[['primary'],['primary'],['primary','secondary']]);
 assert.equal(result.steps[0].jsonBytes,result.steps[1].jsonBytes);
 assert.equal(result.readback.primary.sequence,2);assert.equal(result.readback.secondary.sequence,0);assert(result.readback.primary.payloadMatches);
 assert.equal(h.transactions.filter(t=>t.mode==='readonly').length,1);assert.equal(h.data.size,2);assert.equal(h.closes(),1);
 assert.equal(result.events.filter(e=>e.stage==='transaction-complete').length,3);assert.equal(result.events.filter(e=>e.stage==='request-success').length,4);
 assert(result.events.length<=64);assert(result.steps.every(s=>s.status==='committed'));
});

for(const failAt of [1,2,3])test(`commit abort at step ${failAt} stops writes and reads back only earlier commits`,async()=>{
 const h=harness({failAt}),result=await h.run();
 assert.equal(result.status,'failed');assert.equal(result.error.name,'QuotaExceededError');assert.equal(result.steps.length,failAt);
 assert.equal(result.failureStage,['insert','overwrite','combined'][failAt-1]);assert.equal(result.steps.at(-1).status,'failed');
 assert.equal(h.transactions.filter(t=>t.mode==='readwrite').length,failAt);assert.equal(h.opens.length,1);
 assert.equal(result.events.filter(e=>e.stage==='transaction-abort').length,1);
 assert.equal(result.readback.secondary.present,false);
 if(failAt===1)assert.equal(result.readback.primary.present,false);else assert.equal(result.readback.primary.sequence,failAt-2);
 assert.equal(h.data.size,failAt===1?0:1);assert.equal(result.retries,0);
});

test('re-entry rejects while active; subsequent calls return a detached cached report without writes',async()=>{
 const h=harness(),pending=h.run();await assert.rejects(h.run(),/already running/);
 const first=await pending;first.steps.length=0;
 const repeated=await h.run();assert.equal(repeated.steps.length,3);assert.equal(h.opens.length,1);assert.equal(h.transactions.length,4);
});

test('open failure reports the database name and does not retry to read back',async()=>{
 const h=harness({failOpen:true}),result=await h.run();
 assert.equal(result.status,'failed');assert.equal(result.failureStage,'open');assert.equal(result.error.name,'QuotaExceededError');
 assert(result.readback.unavailable);assert.equal(h.opens.length,1);assert.equal(h.transactions.length,0);assert.equal(h.data.size,0);
 assert.equal((await h.run()).databaseName,result.databaseName);
});
