const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../storage-environment.js'),'utf8').replace(/\bexport /g,'');
function run(storage){const context=vm.createContext({setTimeout,clearTimeout,navigator:{userAgent:'ExampleBrowser/1',storage},location:{origin:'https://example.test'},isSecureContext:true,indexedDB:{open(){throw Error('No database access allowed');}}});vm.runInContext(source+'\nglobalThis.inspect=inspectStorageEnvironment;',context);return context.inspect();}
test('environment inspection calls only the two read-only storage APIs',async()=>{
 const calls=[];const result=await run({estimate(){calls.push('estimate');return {usage:12,quota:24,usageDetails:{indexedDB:12}};},persisted(){calls.push('persisted');return false;},persist(){throw Error('Must never request persistence');}});
 assert.deepEqual(calls,['estimate','persisted']);assert.equal(result.persisted,false);assert.equal(result.estimate.usage,12);assert.equal(result.estimate.usageDetails.indexedDB,12);assert.equal(result.userAgent,'ExampleBrowser/1');
});
test('unavailable and denied storage reads remain explicitly unknown',async()=>{
 const missing=await run();assert.equal(missing.persisted,null);assert.equal(missing.estimate.unavailable,true);
 const denied=await run({estimate(){throw new DOMException('blocked','SecurityError');},persisted(){return Promise.reject(new DOMException('blocked','SecurityError'));}});
 assert.equal(denied.persisted,null);assert.equal(denied.estimate.error,'SecurityError');assert.equal(denied.persistenceStatus.error,'SecurityError');
});
test('a hanging storage API is bounded and does not mask the other result',async()=>{
 const result=await run({estimate:()=>new Promise(()=>{}),persisted:()=>true});assert.equal(result.persisted,true);assert.equal(result.estimate.reason,'timeout');
});
