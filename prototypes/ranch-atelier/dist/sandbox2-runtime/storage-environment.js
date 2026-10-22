// Explicit read-only diagnostics. Never requests persistence or opens a database.
export async function inspectStorageEnvironment(){
 const nav=globalThis.navigator,storage=nav?.storage;
 const read=async method=>{
  if(typeof storage?.[method]!=='function')return {unavailable:true};
  let timer;
  try{return await Promise.race([Promise.resolve().then(()=>storage[method]()),new Promise(resolve=>{timer=setTimeout(()=>resolve({unavailable:true,reason:'timeout'}),2000);})]);}
  catch(error){return {unavailable:true,error:String(error?.name||'Error').slice(0,80)};}
  finally{clearTimeout(timer);}
 };
 const [estimate,persisted]=await Promise.all([read('estimate'),read('persisted')]);
 const number=value=>Number.isFinite(value)&&value>=0?value:null;
 return {version:1,capturedAt:new Date().toISOString(),origin:globalThis.location?.origin??null,
  userAgent:String(nav?.userAgent||'').slice(0,512),secureContext:globalThis.isSecureContext??null,
  persisted:typeof persisted==='boolean'?persisted:null,persistenceStatus:typeof persisted==='boolean'?'available':persisted,
  estimate:estimate?.unavailable?estimate:{usage:number(estimate?.usage),quota:number(estimate?.quota),usageDetails:Object.fromEntries(Object.entries(estimate?.usageDetails||{}).slice(0,16).map(([key,value])=>[key.slice(0,80),number(value)]))},
  quotaMeaning:'Browser estimate; not proof of writable capacity',devtoolsQuota:'unavailable through this action'};
}
