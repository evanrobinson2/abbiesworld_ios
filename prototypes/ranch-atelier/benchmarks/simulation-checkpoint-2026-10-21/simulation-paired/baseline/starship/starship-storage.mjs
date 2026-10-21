// A separate recovery copy protects Aurora against older open scene tabs writing stale libraries.
export const STARSHIP_SAVE_KEY='abbies-starship-saves-v2';
const read=(storage,key)=>{try{const data=JSON.parse(storage.getItem(key)||'null');return Array.isArray(data?.instances)?data.instances:[];}catch{return [];}};
function merge(records,next){if(!next?.id||!next.config)return;const existing=records.find(p=>p.id===next.id);if(!existing)records.push(structuredClone(next));else if(existing.family==='starship'&&next.family==='starship'&&(existing.snapshot?.version||0)!==(next.snapshot?.version||0)){if((next.snapshot?.version||0)>(existing.snapshot?.version||0))Object.assign(existing,structuredClone(next));}else if((next.updated||0)>=(existing.updated||0))Object.assign(existing,structuredClone(next));}
export function hydrateStarshipInstances(storage,instances){for(const next of read(storage,STARSHIP_SAVE_KEY))if(next.family==='starship')merge(instances,next);}
export function backupStarshipInstance(storage,current,instances,sharedKey){
 const backup=read(storage,STARSHIP_SAVE_KEY).filter(i=>i.family==='starship');merge(backup,current);storage.setItem(STARSHIP_SAVE_KEY,JSON.stringify({version:2,instances:backup}));
 // Preserve newer progress in other scene families before publishing Aurora's shared library entry.
 for(const next of read(storage,sharedKey))if(next.id!==current.id)merge(instances,next);
 hydrateStarshipInstances(storage,instances);
}
