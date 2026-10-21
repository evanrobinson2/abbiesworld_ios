// One writer per body. No simulation clocks or cargo are changed by this controller.
export function createPoseOwnership({capture,recover,describe}){
 const held=new Map();let sequence=0;
 return {
  owns:id=>held.has(id),
  acquire(ids,{mode='panic'}={}){if(!['panic','carry-on'].includes(mode))throw Error('Unknown response mode');for(const id of ids)if(!held.has(id)){const previous=capture(id);if(previous)held.set(id,{mode,previous});}},
  release(id,pose){const entry=held.get(id);if(!entry)return false;if(!recover(id,pose,entry))return false;held.delete(id);return true;},
  event(event){if(!Number.isInteger(event.sequence)||event.sequence<=sequence)return false;sequence=event.sequence;const entry=held.get(event.bodyId);if(entry)describe(event.bodyId,entry.mode,event.type);return true;},
  snapshot:()=>({sequence,held:[...held].map(([id,value])=>[id,structuredClone(value)])}),
  restore(saved){held.clear();sequence=saved?.sequence??0;for(const [id,value]of saved?.held??[])held.set(id,structuredClone(value));},
  clear(){held.clear();sequence=0;}
 };
}
