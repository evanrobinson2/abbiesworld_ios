// World edits return a new value. Shared branches are recursively sealed so neither
// a later edit nor an Undo consumer can mutate an earlier simulation snapshot.
const sealed=new WeakSet();
export function sealWorld(value){
 if(!value||typeof value!=='object'||sealed.has(value))return value;
 for(const child of Object.values(value))sealWorld(child);
 Object.freeze(value);sealed.add(value);return value;
}
export function forkEncounter(world){
 const next={...world,actors:structuredClone(world.actors),encounter:structuredClone(world.encounter)};
 for(const [key,value]of Object.entries(world))if(key!=='actors'&&key!=='encounter')sealWorld(value);
 return next;
}
export function worldSnapshot(world){
 if(!world||sealed.has(world))return world;
 return sealWorld(world.actors&&world.encounter?forkEncounter(world):structuredClone(world));
}
