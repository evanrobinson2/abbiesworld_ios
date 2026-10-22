const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const tick=()=>new Promise(setImmediate);
function harness({throwAt}={}){
 const transactions=[],waiters=new Map(),saved=new Map([['boards:b',{id:'b',revision:9,simulation:{day:0}}],['meta:current',{key:'current',id:'b'}]]);
 let opens=0,closes=0,cacheWrites=0;
 const context=vm.createContext({structuredClone,TextEncoder,crypto,localStorage:{setItem(){cacheWrites++;}},indexedDB:{open(name){
  const connectionId=++opens,r={result:{close(){closes++;},transaction(stores){
   if(stores==='cards')return {objectStore:()=>({getKey(key){const req={};queueMicrotask(()=>{req.result=key;req.onsuccess();});return req;}})};
   const record={connectionId,rows:[],requests:[]};
   const tx={error:null,abort(){queueMicrotask(()=>tx.onabort());},objectStore:store=>({put(value){if(store===throwAt)throw new DOMException('Cannot serialize','DataCloneError');const req={};record.rows.push([store,value]);record.requests.push(req);return req;}})};
   record.tx=tx;record.successfulRequests=()=>record.requests.forEach(req=>req.onsuccess?.());
   record.abort=error=>{tx.error=error;tx.onabort();};
   record.complete=()=>{for(const [store,value]of record.rows)saved.set(store+':'+(value.key||value.id),structuredClone(value));tx.oncomplete();};
   const index=transactions.push(record)-1;waiters.get(index)?.(record);return tx;
  }}};queueMicrotask(()=>r.onsuccess());return r;
 }}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../card-library.js'),'utf8').replace(/\bexport /g,'')+'\nglobalThis.api={saveBoard,getStorageDiagnostics};',context);
 return {api:context.api,transactions,saved,counts:()=>({opens,closes,cacheWrites}),wait:index=>transactions[index]?Promise.resolve(transactions[index]):new Promise(resolve=>waiters.set(index,resolve))};
}
const board=()=>({id:'b',revision:10,simulation:{day:1},cards:{'card@1':{id:'card',revision:1,rendition:{geometry:'must-not-be-copied'}}}});
const quota=()=>new DOMException('','QuotaExceededError');

for(const failRetry of [false,true])test(`commit-time quota retries identical pinned rows once (${failRetry?'failure':'success'})`,async()=>{
 const h=harness(),input=board();let settled=false;
 const saving=h.api.saveBoard(input);saving.then(()=>{settled=true;},()=>{settled=true;});
 const first=await h.wait(0);first.successfulRequests();await tick();
 assert.equal(settled,false,'Successful puts are not a committed save');assert.equal(h.saved.get('boards:b').revision,9);
 const q=quota();first.tx.onerror({target:{error:q}});await tick();
 assert.equal(h.transactions.length,1,'Do not retry on request/error event before abort');assert.equal(h.counts().closes,0);
 first.abort(q);const second=await h.wait(1);
 assert.notEqual(first.connectionId,second.connectionId);assert.equal(h.counts().closes,1);
 assert.strictEqual(first.rows[0][1],second.rows[0][1]);assert.strictEqual(first.rows[1][1],second.rows[1][1]);
 assert.equal(second.rows[0][1].cards['card@1'].libraryRef,'card@1');assert.equal(second.rows[0][1].cards['card@1'].rendition,undefined);
 input.simulation.day=99;assert.equal(second.rows[0][1].simulation.day,1,'Retry snapshot is detached from caller memory');
 if(failRetry){const rejected=assert.rejects(saving,e=>e.name==='QuotaExceededError'&&e.firstFailure.name==='QuotaExceededError');second.successfulRequests();second.abort(quota());await rejected;assert.equal(h.saved.get('boards:b').revision,9);assert.equal(h.counts().cacheWrites,0);}
 else{second.successfulRequests();second.complete();assert.equal((await saving).persisted,true);assert.equal(h.saved.get('boards:b').simulation.day,1);assert.equal(h.counts().cacheWrites,1);}
 await tick();assert.equal(h.transactions.length,2);assert.equal(h.saved.size,2);
 const d=h.api.getStorageDiagnostics().attempts[0];assert.equal(d.counts['quota-reopen'],1);assert.equal(d.failureStage,failRetry?'commit':undefined);
 const expected=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(first.rows[0][1])))),b=>b.toString(16).padStart(2,'0')).join('');
 assert.equal(d.snapshotFingerprint,expected);assert.equal(d.counts['snapshot-fingerprint'],1);
 assert(d.events.filter(e=>e.stage==='transaction-start').every(e=>e.snapshotFingerprint===expected));
});

test('Board save lock retains ordering across retry and releases after failure',async()=>{
 const h=harness();const one=h.api.saveBoard(board());const rejected=assert.rejects(one,/QuotaExceededError/);
 const first=await h.wait(0);const two=h.api.saveBoard({...board(),revision:11,simulation:{day:2}});
 await tick();assert.equal(h.transactions.length,1);
 first.abort(quota());const retry=await h.wait(1);await tick();assert.equal(h.transactions.length,2);
 retry.abort(quota());await rejected;const next=await h.wait(2);assert.equal(next.rows[0][1].revision,11);
 next.complete();assert.equal((await two).persisted,true);assert.equal(h.saved.get('boards:b').revision,11);
});

test('non-quota abort preserves the old board and does not reopen',async()=>{
 const h=harness(),saving=h.api.saveBoard(board());const rejected=assert.rejects(saving,e=>e.name==='UnknownError');
 const tx=await h.wait(0);tx.abort(new DOMException('IO failure','UnknownError'));await rejected;await tick();
 assert.equal(h.transactions.length,1);assert.equal(h.counts().closes,0);assert.equal(h.saved.get('boards:b').revision,9);
});

test('synchronous second put exception aborts the first staged write and retains its cause',async()=>{
 const h=harness({throwAt:'meta'});
 await assert.rejects(h.api.saveBoard(board()),e=>e.name==='DataCloneError'&&e.cause.name==='DataCloneError'&&e.stage==='meta.put');
 assert.equal(h.transactions.length,1);assert.equal(h.saved.get('boards:b').revision,9);assert.equal(h.counts().closes,0);
 assert.equal(h.api.getStorageDiagnostics().attempts[0].counts['transaction-abort'],1);
});

test('Outbreak saves its own board pointer and persistent actor state without replacing the main board',async()=>{const h=harness(),b={...board(),id:'outbreak-board',world:{actors:{a:{hp:2,weapon:'broom',position:{x:1,y:0,z:4}}},encounter:{time:12}}};const saving=h.api.saveBoard(b,'outbreak'),tx=await h.wait(0);tx.complete();await saving;assert.equal(h.saved.get('meta:current').id,'b');assert.equal(h.saved.get('meta:outbreak').id,'outbreak-board');assert.deepEqual(h.saved.get('boards:outbreak-board').world,b.world);b.world.actors.a.hp=0;assert.equal(h.saved.get('boards:outbreak-board').world.actors.a.hp,2);});
