import {createCityAdapter} from './city-adapter.mjs';
export async function createCityBoardTile(tile,diameter,heightAt,saved){
 if(diameter<80)throw Error('City districts need an 80 m or larger hex. Increase the board hex size first.');
 const adapter=await createCityAdapter(tile.seed+(tile.placement?.variant||1)*97,{size:diameter,complexity:tile.placement?.complexity||1},saved);
 adapter.group.position.y=heightAt(tile.center.x,tile.center.z)*.1;
 adapter.fitBounds.translate(adapter.group.position);
 return adapter;
}
export function joinCityRuntimes(life,entries){
 const original={update:life.update.bind(life),snapshot:life.snapshot.bind(life),restore:life.restore.bind(life),dispose:life.dispose?.bind(life),notices:life.notices?.bind(life)};
 life.update=(dt,animationDt,...rest)=>{original.update(dt,animationDt,...rest);for(const {adapter}of entries)adapter.life.update(Math.min(60,animationDt??dt));};
 life.snapshot=()=>({...original.snapshot(),cityTileStates:Object.fromEntries(entries.map(({id,adapter})=>[id,adapter.life.snapshot()]))});
 life.restore=s=>{original.restore(s);for(const {id,adapter}of entries)if(s.cityTileStates?.[id])adapter.life.restore(s.cityTileStates[id]);};
 life.notices=()=>[...(original.notices?.()||[]),...entries.flatMap(({adapter})=>adapter.life.notices())];
 life.dispose=()=>{original.dispose?.();for(const {adapter}of entries){adapter.life.dispose();adapter.dispose();}};
}
