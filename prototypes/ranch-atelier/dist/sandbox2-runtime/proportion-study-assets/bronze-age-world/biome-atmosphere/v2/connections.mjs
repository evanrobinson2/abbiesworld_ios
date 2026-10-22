/** Local prefab connector adapter. Simulation consumes its world-space route output only.
 * Hex cell allocation/rotation belongs to the PC Board adapter, not this local study.
 */
export function connectPorts(from,to,tolerance=.001){
 const a={x:from.origin.x+from.port.x,z:from.origin.z+from.port.z},b={x:to.origin.x+to.port.x,z:to.origin.z+to.port.z};
 if(Math.hypot(a.x-b.x,a.z-b.z)>tolerance)throw Error('Prefab ports do not meet');
 if(from.port.kind!==to.port.kind||from.port.facing!==-to.port.facing)throw Error('Incompatible prefab ports');
 return{from:from.id,to:to.id,position:a,width:Math.min(from.port.width,to.port.width),kind:from.port.kind};
}
export function makePrefabConnection(placements,plots){
 const farming=new Set(plots.map(p=>p.id));
 const home={id:'homestead',origin:{x:0,z:-12},port:{id:'garden-route',x:0,z:12,kind:'footpath',facing:1,width:3.2}};
 const garden={id:'cultivation',origin:{x:0,z:12},port:{id:'home-route',x:0,z:-12,kind:'footpath',facing:-1,width:3.2}};
 const prefabs=[home,garden].map(p=>({...p,placements:placements.filter(q=>farming.has(q.group)===(p.id==='cultivation')).map(q=>({...q,position:{...q.position,x:q.position.x-p.origin.x,z:q.position.z-p.origin.z},...(q.entrance?{entrance:{...q.entrance,x:q.entrance.x-p.origin.x,z:q.entrance.z-p.origin.z}}:{}),...(q.approach?{approach:{...q.approach,x:q.approach.x-p.origin.x,z:q.approach.z-p.origin.z}}:{})}))}));
 return{prefabs,joins:[connectPorts(home,garden)],boardAdapter:{status:'not integrated',hexRole:'connection and placement topology only; no simulation boundary'}};
}
export function resolvePlacements(connection){return connection.prefabs.flatMap(p=>p.placements.map(q=>({...q,position:{...q.position,x:q.position.x+p.origin.x,z:q.position.z+p.origin.z},...(q.entrance?{entrance:{...q.entrance,x:q.entrance.x+p.origin.x,z:q.entrance.z+p.origin.z}}:{}),...(q.approach?{approach:{...q.approach,x:q.approach.x+p.origin.x,z:q.approach.z+p.origin.z}}:{})})));}
/** Output is grid-agnostic: explicit route geometry, plot identities, yields and storage. */
export function compileTravelRoutes(plots,storage,join){
 return Object.fromEntries(plots.map(p=>[p.id,[{x:storage.x,z:storage.z},{x:join.position.x,z:storage.z},{...join.position},{x:p.access.x,z:p.access.z},{...p.stand}]]));
}
