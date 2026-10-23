// Browser-local immutable composition revisions. Geometry and recipes travel together.
export const CARD_SCHEMA_VERSION=1;
// Session-local, bounded metadata only. Never retain cards, geometry or request URLs.
const storageAttempts=[],connectionIds=new WeakMap();
let storageSequence=0,connectionSequence=0;
const diagnosticClock=()=>globalThis.performance?.now?.()??Date.now();
const safeError=error=>error?{name:String(error.name||'Error').slice(0,80),message:String(error.message||'').slice(0,240),code:typeof error.code==='number'?error.code:null}:null;
function storageEvent(attempt,stage,detail={}){if(!attempt)return;attempt.counts[stage]=(attempt.counts[stage]||0)+1;if(detail.key)detail.key=String(detail.key).slice(0,160);attempt.events.push({stage,ms:Math.round(diagnosticClock()-attempt.clock),...detail});if(attempt.events.length>32){attempt.events.shift();attempt.droppedEvents++;}}
function storageEstimate(attempt,when){
 attempt[when]={pending:true};try{const estimate=globalThis.navigator?.storage?.estimate?.();if(estimate)Promise.resolve(estimate).then(value=>{attempt[when]={usage:Number.isFinite(value.usage)?value.usage:null,quota:Number.isFinite(value.quota)?value.quota:null};},()=>{attempt[when]={unavailable:true};});else attempt[when]={unavailable:true};}catch{attempt[when]={unavailable:true};}
}
function beginStorageAttempt(kind){const attempt={id:'storage-'+Date.now().toString(36)+'-'+(++storageSequence),kind,origin:globalThis.location?.origin??null,startedAt:new Date().toISOString(),clock:diagnosticClock(),status:'pending',events:[],counts:{},droppedEvents:0,connections:[],rows:[],rowCount:0,totalEncodedBytes:0,largestEncodedBytes:0};storageAttempts.push(attempt);if(storageAttempts.length>8)storageAttempts.shift();storageEstimate(attempt,'estimateBefore');return attempt;}
function storageConnection(attempt,connection){if(!connectionIds.has(connection))connectionIds.set(connection,'connection-'+(++connectionSequence));const id=connectionIds.get(connection);if(!attempt.connections.includes(id))attempt.connections.push(id);storageEvent(attempt,'connection',{connectionId:id});return id;}
function storageRow(attempt,row){attempt.rowCount++;try{const bytes=row.packed?.byteLength??new TextEncoder().encode(JSON.stringify(row)).byteLength;attempt.totalEncodedBytes+=bytes;attempt.largestEncodedBytes=Math.max(attempt.largestEncodedBytes,bytes);if(attempt.rows.length<16)attempt.rows.push({key:String(row.key).slice(0,160),encoding:row.encoding||'legacy',bytes,...(row.fingerprint?{fingerprint:String(row.fingerprint).slice(0,64)}:{})});}catch{attempt.sizeUnavailable=true;}}
function diagnosticSnapshot(attempt){const {clock,...safe}=attempt;return structuredClone(safe);}
function finishStorageAttempt(attempt,error){attempt.status=error?'failed':'succeeded';attempt.durationMs=Math.round(diagnosticClock()-attempt.clock);if(error){attempt.error=safeError(error);attempt.cause=safeError(error.cause);attempt.failureStage=error.stage||attempt.events.at(-1)?.stage||'unknown';if(error.firstFailure)attempt.firstFailure={...safeError(error.firstFailure),stage:error.firstFailure.stage};}storageEstimate(attempt,'estimateAfter');if(error)error.storageDiagnostics=diagnosticSnapshot(attempt);}
export function getStorageDiagnostics(){return {version:1,scope:'this-page-session',limit:8,attempts:storageAttempts.map(diagnosticSnapshot)};}
// Explicit opt-in scan; cursor reads one envelope at a time and never decodes geometry.
export async function inspectStorageEnvelopes({limit=100}={}){
 if(!Number.isInteger(limit)||limit<1||limit>500)throw Error('Envelope scan limit must be 1–500');
 const connection=await db();return new Promise((resolve,reject)=>{
  const result={limit,scanned:0,legacy:0,compressed:0,unknown:0,packedBytes:0,largestPackedBytes:0,complete:false,legacyBytes:'not-measured'};
  const tx=connection.transaction('cards','readonly'),request=tx.objectStore('cards').openCursor();
  request.onerror=()=>reject(cardStorageError(request.error,'envelope inspection failed'));
  tx.onabort=()=>reject(cardStorageError(tx.error,'envelope inspection aborted'));
  tx.oncomplete=()=>resolve(result);
  request.onsuccess=()=>{const cursor=request.result;if(!cursor){result.complete=true;return;}if(result.scanned>=limit)return;const row=cursor.value;result.scanned++;if(row.card)result.legacy++;else if(row.encoding==='gzip-json-v1'){result.compressed++;const bytes=row.packed?.byteLength||0;result.packedBytes+=bytes;result.largestPackedBytes=Math.max(result.largestPackedBytes,bytes);}else result.unknown++;cursor.continue();};
 });
}
export function validateCard(card){
 if(card?.schemaVersion!==1||!card.id||!Number.isInteger(card.revision)||card.revision<1||!card.name||card.units!=='metres')throw Error('Invalid saved card identity');
 if(!Array.isArray(card.cells)||!card.cells.length||!card.cells.every(c=>Number.isInteger(c.q)&&Number.isInteger(c.r)))throw Error('Card needs an axial footprint');
 if(new Set(card.cells.map(c=>c.q+','+c.r)).size!==card.cells.length)throw Error('Duplicate footprint cell');
 if(!card.rendition||!(card.rendition.scene?.object||Array.isArray(card.rendition.meshes)||Array.isArray(card.rendition.assets)))throw Error('An actual resolved rendition is required');
 return true;
}
export function createCard(input){const card={...structuredClone(input),schemaVersion:1,id:input.id||crypto.randomUUID(),revision:input.revision||1,units:'metres',createdAt:input.createdAt||new Date().toISOString(),ports:input.ports||[],capabilities:input.capabilities||{},storageScope:'this-browser'};validateCard(card);return card;}
let database;
function db(){if(database)return database;database=new Promise((resolve,reject)=>{let failed=false;const r=indexedDB.open('ranch-night-survivor-start-composition-library',1);r.onupgradeneeded=()=>r.result.createObjectStore('cards',{keyPath:'key'});r.onsuccess=()=>{if(failed){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();database=undefined;};resolve(r.result);};r.onerror=()=>{failed=true;reject(r.error);};r.onblocked=()=>{failed=true;reject(Error('Close older Board tabs, then retry the save'));};}).catch(error=>{database=undefined;throw error;});return database;}
export function cardSummary(card){return {id:card.id,revision:card.revision,name:card.name,type:card.type,createdAt:card.createdAt,cells:card.cells,recipe:{type:card.recipe?.type,generator:card.recipe?.generator,version:card.recipe?.version}};}
const summaryCache=new Map();
// Compress the complete JSON rendition, not a recipe-only substitute. Old rows remain readable.
export async function encodeStoredCard(card){
 const key=card.id+'@'+card.revision;
 if(typeof CompressionStream==='undefined')return {key,card};
 const json=JSON.stringify(card),bytes=new TextEncoder().encode(json);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const packed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 return {key,encoding:'gzip-json-v1',fingerprint,packed,summary:cardSummary(card)};
}
export async function decodeStoredCard(row){
 if(!row)return null;if(row.card){if(row.key&&row.key!==row.card.id+'@'+row.card.revision)throw Error('Saved card identity mismatch');return row.card;}
 if(row.encoding!=='gzip-json-v1')throw Error('Unknown saved card encoding');
 const json=await new Response(new Blob([row.packed]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json))),b=>b.toString(16).padStart(2,'0')).join('');if(fingerprint!==row.fingerprint)throw Error('Saved card checksum mismatch');
 const card=JSON.parse(json);validateCard(card);if(row.key!==card.id+'@'+card.revision)throw Error('Saved card identity mismatch');return card;
}
function cardStorageError(error,fallback){const result=Error('Card storage: '+(error?.message||error?.name||fallback),{cause:error});result.name=error?.name||'Error';return result;}
let cardSaveLock=Promise.resolve();
const quotaError=error=>error?.name==='QuotaExceededError'||/QuotaExceededError/.test(error?.message||'');
function writeCardRows(connection,cards,rows,diagnostics){return new Promise((resolve,reject)=>{
 let tx,requestError=null,stage='transaction',failureStage=null;
 const remember=(error,at)=>{if(error&&(!requestError||(requestError.name==='AbortError'&&error.name!=='AbortError'))){requestError=error;failureStage=at;}};
 const fail=()=>{const error=cardStorageError(requestError||tx?.error,'save cancelled');error.stage=failureStage||stage;error.cause=requestError||tx?.error;reject(error);};
 try{
  storageEvent(diagnostics,'transaction-start');tx=connection.transaction('cards','readwrite');const store=tx.objectStore('cards');
  tx.onerror=event=>{const error=event?.target?.error||tx.error;storageEvent(diagnostics,'transaction-error',{error:safeError(error)});remember(error,stage);};
  tx.onabort=()=>{storageEvent(diagnostics,'transaction-abort',{error:safeError(tx.error),requestError:safeError(requestError)});fail();};
  tx.oncomplete=()=>{storageEvent(diagnostics,'transaction-complete');resolve(cards);};
  for(let i=0;i<cards.length;i++){
   const row=rows[i],card=cards[i];stage='lookup';const lookup=store.get(row.key);
   lookup.onerror=()=>{storageEvent(diagnostics,'lookup-error',{key:row.key,error:safeError(lookup.error)});remember(lookup.error,'lookup');};
   lookup.onsuccess=()=>{try{
    storageEvent(diagnostics,'lookup-success',{key:row.key,existing:!!lookup.result});
    if(lookup.result){const old=lookup.result,same=old.card?JSON.stringify(old.card)===JSON.stringify(card):old.fingerprint===row.fingerprint;
     if(!same){remember(Error('That card revision is immutable'),'identity');tx.abort();}}
    else{stage='add';storageEvent(diagnostics,'add-start',{key:row.key});const request=store.add(row);if(request){request.onerror=()=>{storageEvent(diagnostics,'add-error',{key:row.key,error:safeError(request.error)});remember(request.error,'add');};request.onsuccess=()=>storageEvent(diagnostics,'add-success',{key:row.key});}}
   }catch(error){storageEvent(diagnostics,'request-exception',{key:row.key,error:safeError(error)});remember(error,'add');tx.abort();}};
  }
 }catch(error){storageEvent(diagnostics,'transaction-exception',{error:safeError(error)});remember(error,stage);if(tx){try{tx.abort();}catch{fail();}}else fail();}
 });}
export async function saveCards(inputs){
 const diagnostics=beginStorageAttempt('cards');
 try{
 const cards=inputs.map(input=>{if(input.schemaVersion===CARD_SCHEMA_VERSION){validateCard(input);return input;}return createCard(input);}),keys=cards.map(c=>c.id+'@'+c.revision);
 if(new Set(keys).size!==keys.length)throw Error('Duplicate card revision in batch');
 const rows=[];for(const card of cards){try{storageEvent(diagnostics,'encoding-start',{key:card.id+'@'+card.revision});const row=await encodeStoredCard(card);rows.push(row);storageRow(diagnostics,row);storageEvent(diagnostics,'encoding-complete',{key:row.key});}catch(cause){const error=new Error('Card encoding '+card.id+'@'+card.revision+': '+(cause.message||cause.name),{cause});error.name=cause.name||'Error';error.stage='card-encoding';throw error;}}
 storageEvent(diagnostics,'queued');
 const write=async()=>{
  storageEvent(diagnostics,'database-open');let connection=await db();storageConnection(diagnostics,connection);
  try{await writeCardRows(connection,cards,rows,diagnostics);}catch(first){
   if(!quotaError(first))throw first;
   // The first transaction has settled. Retry the identical encoded rows once.
   diagnostics.firstFailure={...safeError(first),stage:first.stage};storageEvent(diagnostics,'quota-reopen');
   connection.close();storageEvent(diagnostics,'connection-close');database=undefined;connection=await db();storageConnection(diagnostics,connection);
   try{await writeCardRows(connection,cards,rows,diagnostics);}catch(error){error.firstFailure={name:first.name,message:first.message,stage:first.stage};throw error;}
  }
  try{window.dispatchEvent(new Event('ranch-card-library'));}catch{}
  return cards;
 };
 const result=cardSaveLock.then(write,write);cardSaveLock=result.catch(()=>{});const saved=await result;finishStorageAttempt(diagnostics);return saved;
 }catch(error){finishStorageAttempt(diagnostics,error);throw error;}
}
// Quota recovery only: rewrite legacy storage envelopes losslessly, never remove cards or change revisions.
export async function compactCardStorage(){
 if(typeof CompressionStream==='undefined')return 0;
 const database=await db(),keys=await new Promise((resolve,reject)=>{const r=database.transaction('cards').objectStore('cards').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});let count=0;
 for(const key of keys){const old=await new Promise((resolve,reject)=>{const r=database.transaction('cards').objectStore('cards').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(!old?.card)continue;
  const row=await encodeStoredCard(old.card);await new Promise((resolve,reject)=>{const tx=database.transaction('cards','readwrite'),store=tx.objectStore('cards'),r=store.get(key);r.onsuccess=()=>{if(r.result?.card&&JSON.stringify(r.result.card)===JSON.stringify(old.card))store.put(row);};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Card compaction cancelled'));});count++;
 }return count;
}
export async function saveCard(input){return (await saveCards([input]))[0];}
export async function listCards(){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('cards').objectStore('cards').getAll();r.onsuccess=()=>Promise.all(r.result.map(decodeStoredCard)).then(cards=>resolve(cards.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))),reject);r.onerror=()=>reject(r.error);});}
// Deck browsing needs labels and footprints, not every saved mesh in memory.
export async function listCardSummaries(){const database=await db();const rows=await new Promise((resolve,reject)=>{const r=database.transaction('cards').objectStore('cards').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const result=[];for(const row of rows){const cacheKey=row.key+':'+(row.fingerprint||'legacy');let summary=row.summary||summaryCache.get(cacheKey);if(!summary){summary=cardSummary(await decodeStoredCard(row));summaryCache.set(cacheKey,summary);}result.push(summary);}return result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function getCard(id,revision){if(revision===undefined){const all=await listCards();return all.filter(c=>c.id===id).sort((a,b)=>b.revision-a.revision)[0]||null;}const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('cards').objectStore('cards').get(id+'@'+revision);r.onsuccess=()=>decodeStoredCard(r.result).then(resolve,reject);r.onerror=()=>reject(r.error);});}
async function pinnedReferences(cards){const database=await db(),entries=Object.entries(cards);const missing=await Promise.all(entries.map(([key,card])=>new Promise((resolve,reject)=>{const r=database.transaction('cards').objectStore('cards').getKey(key);r.onsuccess=()=>resolve(r.result?null:card);r.onerror=()=>reject(r.error);})));if(missing.some(Boolean))await saveCards(missing.filter(Boolean));return Object.fromEntries(entries.map(([key,c])=>[key,{libraryRef:key,id:c.id,revision:c.revision}]));}
async function hydrateBoard(board){if(!board?.cards)return board;const entries=await Promise.all(Object.entries(board.cards).map(async([key,c])=>{if(!c.libraryRef)return [key,c];if(key!==c.libraryRef||key!==c.id+'@'+c.revision)throw Error('Saved board card reference mismatch: '+key);const card=await getCard(c.id,c.revision);if(!card)throw Error('Saved composition missing from this browser: '+c.libraryRef);return [key,card];}));return {...board,cards:Object.fromEntries(entries)};}

let boardsDb;
function boardDatabase(){if(boardsDb)return boardsDb;boardsDb=new Promise((resolve,reject)=>{let failed=false;const r=indexedDB.open('ranch-night-survivor-start-board-storage',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('boards'))r.result.createObjectStore('boards',{keyPath:'id'});if(!r.result.objectStoreNames.contains('meta'))r.result.createObjectStore('meta',{keyPath:'key'});};r.onsuccess=()=>{if(failed){r.result.close();return;}r.result.onversionchange=()=>{r.result.close();boardsDb=undefined;};resolve(r.result);};r.onerror=()=>{failed=true;reject(r.error);};r.onblocked=()=>{failed=true;reject(Error('Close older Board tabs, then retry the save'));};}).catch(error=>{boardsDb=undefined;throw error;});return boardsDb;}
let boardSaveLock=Promise.resolve();
function writeBoardSnapshot(connection,rows,diagnostics){return new Promise((resolve,reject)=>{
 let tx,firstError=null,stage='transaction',failureStage=null;
 const remember=(error,at)=>{if(error&&(!firstError||(firstError.name==='AbortError'&&error.name!=='AbortError'))){firstError=error;failureStage=at;}};
 const fail=()=>{const cause=firstError||tx?.error;const error=Error('Board storage: '+(cause?.message||cause?.name||'save aborted'),{cause});error.name=cause?.name||'Error';error.stage=failureStage||stage;reject(error);};
 try{
  storageEvent(diagnostics,'transaction-start',{snapshotFingerprint:diagnostics.snapshotFingerprint||null});tx=connection.transaction(['boards','meta'],'readwrite');
  tx.onerror=event=>{const error=event?.target?.error||tx.error;remember(error,stage);storageEvent(diagnostics,'transaction-error',{error:safeError(error)});};
  tx.onabort=()=>{storageEvent(diagnostics,'transaction-abort',{error:safeError(tx.error),requestError:safeError(firstError)});fail();};
  tx.oncomplete=()=>{storageEvent(diagnostics,'transaction-complete');resolve();};
  for(const [store,value]of rows){stage=store+'.put';storageEvent(diagnostics,'put-start',{store});const request=tx.objectStore(store).put(value);
   if(request){request.onsuccess=()=>storageEvent(diagnostics,'put-success',{store});request.onerror=()=>{remember(request.error,store+'.put');storageEvent(diagnostics,'put-error',{store,error:safeError(request.error)});};}
  }
  stage='commit';
 }catch(error){remember(error,stage);storageEvent(diagnostics,'transaction-exception',{error:safeError(error)});if(tx){try{tx.abort();}catch{fail();}}else fail();}
});}
export async function saveBoard(board){
 const diagnostics=beginStorageAttempt('board');diagnostics.boardId=String(board.id).slice(0,160);diagnostics.boardRevision=board.revision;
 // Queue preparation as well as writes so asynchronous pinning cannot reorder saves.
 const write=async()=>{
  storageEvent(diagnostics,'pin-cards');const snapshot=structuredClone(board.cards?{...board,cards:await pinnedReferences(board.cards)}:board);
  const rows=[['boards',snapshot],['meta',{key:'current',id:snapshot.id}]];
  try{diagnostics.snapshotFingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot)))),b=>b.toString(16).padStart(2,'0')).join('');storageEvent(diagnostics,'snapshot-fingerprint',{fingerprint:diagnostics.snapshotFingerprint});}catch{diagnostics.snapshotFingerprintUnavailable=true;}
  storageRow(diagnostics,{key:snapshot.id,card:snapshot});storageEvent(diagnostics,'database-open');let connection=await boardDatabase();storageConnection(diagnostics,connection);
  try{await writeBoardSnapshot(connection,rows,diagnostics);}catch(first){
   if(!quotaError(first))throw first;
   diagnostics.firstFailure={...safeError(first),stage:first.stage};storageEvent(diagnostics,'quota-reopen');
   // Abort has settled; preserve these exact pinned rows for one fresh-connection attempt.
   connection.close();storageEvent(diagnostics,'connection-close');boardsDb=undefined;
   try{connection=await boardDatabase();storageConnection(diagnostics,connection);await writeBoardSnapshot(connection,rows,diagnostics);}
   catch(error){error.firstFailure={name:first.name,message:first.message,stage:first.stage};throw error;}
  }
  const warnings=[];try{localStorage.setItem('ranch-night-survivor-start-board-current',snapshot.id);}catch{warnings.push('Browser pointer cache unavailable; the board and current-board pointer are saved in IndexedDB.');}
  return {boardId:snapshot.id,persisted:true,storageScope:'this-browser',warnings};
 };
 storageEvent(diagnostics,'queued');const result=boardSaveLock.then(write,write);boardSaveLock=result.catch(()=>{});
 try{const saved=await result;finishStorageAttempt(diagnostics);return saved;}catch(error){finishStorageAttempt(diagnostics,error);throw error;}
}
export async function loadBoard(){const d=await boardDatabase();return new Promise((resolve,reject)=>{const t=d.transaction(['boards','meta']),r=t.objectStore('meta').get('current');r.onsuccess=()=>{let id=r.result?.id;if(!id)try{id=localStorage.getItem('ranch-night-survivor-start-board-current');}catch{}if(!id){resolve(null);return;}const b=t.objectStore('boards').get(id);b.onsuccess=()=>hydrateBoard(b.result||null).then(resolve,reject);b.onerror=()=>reject(b.error);};r.onerror=()=>reject(r.error);t.onabort=()=>reject(t.error||Error('Board load aborted'));});}
