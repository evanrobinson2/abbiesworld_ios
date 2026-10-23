export const SCENE_SCHEMA=1;
const PREFIX='abbies-sandbox-scene-v1:';
export function validateScene(value){
 if(!value||value.schemaVersion!==SCENE_SCHEMA||typeof value.name!=='string'||!value.name.trim()||value.name.length>100)throw Error('Invalid scene name or unsupported scene version.');
 const s=value.scene;
 if(!s||!['ranch','city','suburban','cemetery','moon','starship'].includes(s.family)||!s.config||!Number.isInteger(s.config.seed)||!s.snapshot||typeof s.snapshot!=='object'||!s.camera||!['position','target'].every(k=>Array.isArray(s.camera[k])&&s.camera[k].length===3&&s.camera[k].every(Number.isFinite)))throw Error('Incomplete scene: settings, seed, simulation and camera are required.');
 if(JSON.stringify(value).length>12000000)throw Error('Scene exceeds the 12 MB import limit.');
 return structuredClone(value);
}
export function createSceneStore(storage,{id=()=>crypto.randomUUID(),now=()=>new Date().toISOString()}={}){
 let revision=0;
 function read(key){const raw=storage.getItem(PREFIX+key);if(!raw)throw Error('Saved scene not found.');return validateScene(JSON.parse(raw));}
 function write(record){const valid=validateScene(record);storage.setItem(PREFIX+valid.id,JSON.stringify(valid));revision++;return structuredClone(valid);}
 function list(){const entries=[],errors=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(PREFIX))continue;try{const entry=read(key.slice(PREFIX.length));if(!entry.removed)entries.push(entry);}catch{errors.push('An unreadable saved scene was retained in storage.');}}return {entries:entries.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),errors};}
 function save(name,scene,buildId){return write({schemaVersion:1,id:id(),revision:1,name:name.trim(),favorite:false,createdAt:now(),buildId:buildId||'unknown',generator:'sandbox-lab',scene:structuredClone(scene)});}
 function favorite(key,value){const record=read(key);record.favorite=value;record.revision++;return write(record);}
 function importScene(text){let value;try{value=validateScene(JSON.parse(text));}catch(e){throw Error('Import failed: '+e.message);}return write({...value,id:id(),revision:1,createdAt:now(),importedFrom:value.id});}
 function update(key,patch){const record=read(key);return write({...record,...patch,id:key,revision:record.revision+1,updatedAt:now()});}
 function autosave(key,name,scene,buildId){let prior;try{prior=read(key);}catch{}if(prior?.removed)return prior;return write({schemaVersion:1,id:key,revision:(prior?.revision||0)+1,name:prior?.name||name,favorite:prior?.favorite||false,createdAt:prior?.createdAt||now(),updatedAt:now(),buildId:buildId||'unknown',generator:'sandbox-lab',scene:structuredClone(scene)});}
 return {read,list,save,favorite,importScene,update,autosave,get revision(){return revision;}};
}
