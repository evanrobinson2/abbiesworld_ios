// Keep each Moonbase's real production and colony state alongside the ranch snapshot.
export function joinMoonRuntimes(life,entries){
 const original={update:life.update.bind(life),snapshot:life.snapshot.bind(life),restore:life.restore.bind(life),dispose:life.dispose?.bind(life),notices:life.notices?.bind(life)};
 life.update=(dt,animationDt,...rest)=>{original.update(dt,animationDt,...rest);for(const {adapter}of entries)adapter.life.update(Math.min(60,animationDt??dt));};
 life.snapshot=()=>({...original.snapshot(),moonTileStates:Object.fromEntries(entries.map(({id,adapter})=>[id,adapter.life.snapshot()]))});
 life.restore=saved=>{original.restore(saved);for(const {id,adapter}of entries)if(saved.moonTileStates?.[id])adapter.life.restore(saved.moonTileStates[id]);};
 life.notices=()=>[...(original.notices?.()||[]),...entries.flatMap(({adapter})=>adapter.life.notices().map(n=>({...n,text:'Moonbase: '+n.text})))];
 life.dispose=()=>{original.dispose?.();for(const {adapter}of entries){adapter.life.dispose();adapter.dispose();}};
 return life;
}
