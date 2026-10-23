const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../card-library.js'),'utf8').replace(/\bexport /g,'');
function harness({fail=false,estimate=()=>Promise.resolve({usage:123,quota:456}),envelopes=[]}={}){
 const writes=[],modes=[];let opens=0,closes=0;
 const context=vm.createContext({structuredClone,crypto,TextEncoder,Event,location:{origin:'https://example.test'},navigator:{storage:{estimate}},window:{dispatchEvent(){}},localStorage:{setItem(){}},indexedDB:{open(){opens++;const r={result:{close(){closes++;},transaction(names,mode){
  modes.push(mode);const tx={error:null,abort(){queueMicrotask(()=>tx.onabort?.());}};
  const store={get(){const req={};queueMicrotask(()=>req.onsuccess());return req;},add:row=>put(row,'add'),put:row=>put(row,'put'),openCursor(){const req={};let index=0;const next=()=>queueMicrotask(()=>{req.result=index<envelopes.length?{value:envelopes[index++],continue:next}:null;req.onsuccess();});next();return req;}};
  function put(row,stage){writes.push(row);const req={};queueMicrotask(()=>{if(fail){req.error=new DOMException('Browser refused storage','QuotaExceededError');req.onerror?.();tx.onerror?.({target:req});}else req.onsuccess?.();});return req;}
  tx.objectStore=()=>store;setImmediate(()=>{if(fail&&mode==='readwrite'){tx.error=new DOMException('Browser refused storage','QuotaExceededError');tx.onabort?.();}else tx.oncomplete?.();});return tx;
 }}};queueMicrotask(()=>r.onsuccess());return r;}}});
 vm.runInContext(source+'\nglobalThis.api={createCard,saveCards,saveBoard,getStorageDiagnostics,inspectStorageEnvelopes};',context);
 return {api:context.api,writes,modes,counts:()=>({opens,closes})};
}
const card=(api,id='a')=>api.createCard({id,name:'SECRET-GEOMETRY-LABEL',cells:[{q:0,r:0}],rendition:{meshes:[{positions:['SECRET-GEOMETRY-PAYLOAD']}]}});

test('successful save exposes detached size/timing diagnostics without geometry or labels',async()=>{
 const h=harness();await h.api.saveCards([card(h.api)]);await new Promise(setImmediate);
 const a=h.api.getStorageDiagnostics().attempts[0];
 assert.equal(a.status,'succeeded');assert.equal(a.origin,'https://example.test');assert.equal(a.rowCount,1);
 assert.equal(a.totalEncodedBytes,new TextEncoder().encode(JSON.stringify(h.writes[0])).byteLength);
 assert.equal(a.largestEncodedBytes,a.totalEncodedBytes);assert.equal(a.counts['add-success'],1);assert.equal(a.counts['transaction-complete'],1);
 assert(a.durationMs>=0);assert.equal(a.estimateBefore.usage,123);assert.equal(a.estimateAfter.quota,456);
 assert(!JSON.stringify(a).includes('SECRET'));a.events.length=0;assert(h.api.getStorageDiagnostics().attempts[0].events.length>0);
});

test('quota failure attaches raw cause, both connection IDs and one bounded retry',async()=>{
 const h=harness({fail:true});let failure;
 await assert.rejects(h.api.saveCards([card(h.api)]),e=>{failure=e;return e.name==='QuotaExceededError';});
 const d=failure.storageDiagnostics;
 assert.equal(failure.cause.name,'QuotaExceededError');assert.equal(d.status,'failed');assert.equal(d.failureStage,'add');
 assert.equal(d.connections.length,2);assert.notEqual(d.connections[0],d.connections[1]);
 assert.equal(d.counts['transaction-abort'],2);assert.equal(d.counts['quota-reopen'],1);assert.equal(d.rowCount,1);
 assert.equal(d.firstFailure.name,'QuotaExceededError');assert.equal(h.counts().opens,2);
 assert(d.events.some(e=>e.stage==='add-error'&&e.error.message==='Browser refused storage'));
});

test('Board failure retains request cause and identifies both writes across one bounded retry',async()=>{
 const h=harness({fail:true});let failure;
 await assert.rejects(h.api.saveBoard({id:'b',revision:2,instances:[]}),e=>{failure=e;return e.name==='QuotaExceededError';});
 await new Promise(setImmediate);
 assert.equal(failure.cause.name,'QuotaExceededError');const d=h.api.getStorageDiagnostics().attempts[0];
 assert.equal(d.kind,'board');assert.equal(d.boardRevision,2);assert.equal(d.counts['transaction-start'],2);
 assert(d.events.some(e=>e.stage==='put-error'&&e.store==='boards'));assert(d.events.some(e=>e.stage==='put-error'&&e.store==='meta'));
 assert.equal(d.counts['transaction-abort'],2);assert.equal(h.counts().opens,2);
});

test('diagnostic limits bound attempts, rows and events while counters retain totals',async()=>{
 const h=harness();await h.api.saveCards(Array.from({length:20},(_,i)=>card(h.api,'a'+i)));
 let d=h.api.getStorageDiagnostics().attempts[0];assert.equal(d.rows.length,16);assert.equal(d.rowCount,20);assert.equal(d.events.length,32);assert(d.droppedEvents>0);assert.equal(d.counts['add-success'],20);
 for(let i=0;i<9;i++)await h.api.saveBoard({id:'b'+i,revision:i});
 const all=h.api.getStorageDiagnostics();assert.equal(all.attempts.length,8);assert.equal(new Set(all.attempts.map(a=>a.id)).size,8);
});

test('unavailable or hanging estimates cannot block saving',async()=>{
 for(const estimate of [()=>new Promise(()=>{}),()=>Promise.reject(Error('denied')),()=>{throw Error('denied');}]){
  const h=harness({estimate});await h.api.saveCards([card(h.api)]);assert.equal(h.api.getStorageDiagnostics().attempts[0].status,'succeeded');
 }
});

test('diagnostic JSON sizing failure does not reject a structured-clone-compatible Board',async()=>{
 const h=harness(),board={id:'cyclic-board',revision:1};board.extra=board;
 assert.equal((await h.api.saveBoard(board)).persisted,true);
 const d=h.api.getStorageDiagnostics().attempts[0];assert.equal(d.status,'succeeded');assert.equal(d.sizeUnavailable,true);
});

test('explicit bounded envelope inspection is read-only and never returns payloads',async()=>{
 const envelopes=[{card:{rendition:'SECRET'}},{encoding:'gzip-json-v1',packed:new Uint8Array(12)},{encoding:'gzip-json-v1',packed:new Uint8Array(30)}];
 const h=harness({envelopes});const result=await h.api.inspectStorageEnvelopes({limit:2});
 assert.equal(result.scanned,2);assert.equal(result.complete,false);assert.equal(result.legacy,1);assert.equal(result.compressed,1);assert.equal(result.packedBytes,12);
 assert.deepEqual(h.modes,['readonly']);assert.equal(h.writes.length,0);assert(!JSON.stringify(result).includes('SECRET'));
 await assert.rejects(h.api.inspectStorageEnvelopes({limit:501}),/limit/);
});
