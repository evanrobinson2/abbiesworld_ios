/** Shared positive-uniform transform convention for source-normalized anchors.
 * Does not move canonical assets, replan routes, or apply renderer settings.
 */
function finitePoint(p,label){if(!p||!['x','y','z'].every(k=>Number.isFinite(p[k]??(k==='y'?0:NaN))))throw Error('Invalid '+label);}
function validatePlacement(p,origin){finitePoint(p.position,'instance position');finitePoint(origin,'prefab origin');if(!Number.isFinite(origin.yaw??0))throw Error('Finite prefab yaw required');if(!Number.isFinite(p.scale)||p.scale<=0||!Number.isFinite(p.yaw))throw Error('Positive uniform scale and finite yaw required');}
export function normalizedPointToWorld(point,placement,prefabOrigin={x:0,y:0,z:0}){
 finitePoint(point,'normalized point');validatePlacement(placement,prefabOrigin);
 const {scale:s,yaw:a,position:p}=placement,c=Math.cos(a),n=Math.sin(a);
 const x=p.x+s*(point.x*c+point.z*n),z=p.z+s*(-point.x*n+point.z*c),pc=Math.cos(prefabOrigin.yaw??0),pn=Math.sin(prefabOrigin.yaw??0);
 return{x:prefabOrigin.x+x*pc+z*pn,y:(prefabOrigin.y??0)+(p.y??0)+s*(point.y??0),z:prefabOrigin.z-x*pn+z*pc};
}
export function worldPointToNormalized(point,placement,prefabOrigin={x:0,y:0,z:0}){
 finitePoint(point,'world point');validatePlacement(placement,prefabOrigin);
 const dx=point.x-prefabOrigin.x,dz=point.z-prefabOrigin.z,pc=Math.cos(prefabOrigin.yaw??0),pn=Math.sin(prefabOrigin.yaw??0);
 const x=(dx*pc-dz*pn-placement.position.x)/placement.scale,z=(dx*pn+dz*pc-placement.position.z)/placement.scale,c=Math.cos(placement.yaw),n=Math.sin(placement.yaw);
 return{x:x*c-z*n,y:((point.y??0)-(prefabOrigin.y??0)-(placement.position.y??0))/placement.scale,z:x*n+z*c};
}
export function sourceAnchorToWorld(asset,anchorId,placement,prefabOrigin){
 if(placement.assetId!==asset.id)throw Error('Anchor asset identity mismatch');
 const anchor=asset.anchors?.find(a=>a.id===anchorId);if(!anchor)throw Error('Missing source anchor: '+anchorId);
 if(!asset.sha256)throw Error('Missing source provenance');
 return{position:normalizedPointToWorld(anchor.position,placement,prefabOrigin),source:{assetId:asset.id,sha256:asset.sha256,anchorId},space:'world',status:'position resolved; interaction/effect unverified'};
}
export function displayedBounds(asset,placement,prefabOrigin){
 if(placement.assetId!==asset.id||!asset.dimensionsMetres?.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid measured bounds');
 const [w,d,h]=asset.dimensionsMetres,corners=[];
 for(const x of [-w/2,w/2])for(const y of [0,h])for(const z of [-d/2,d/2])corners.push(normalizedPointToWorld({x,y,z},placement,prefabOrigin));
 return{min:Object.fromEntries(['x','y','z'].map(k=>[k,Math.min(...corners.map(p=>p[k]))])),max:Object.fromEntries(['x','y','z'].map(k=>[k,Math.max(...corners.map(p=>p[k]))])),supportRadius:Math.hypot(w,d)/2*placement.scale};
}

/** Proposed adapter helpers, not installed into the frozen translation-only connection example. */
export function prefabPortToWorld(prefab,port){
 if(!port?.kind||!Number.isFinite(port.heading)||!Number.isFinite(port.width)||port.width<=0)throw Error('Explicit port kind, heading and positive width required');
 const position=normalizedPointToWorld(port.position,{position:{x:0,y:0,z:0},scale:1,yaw:0},prefab);
 const angle=port.heading+(prefab.yaw??0);
 return{position,kind:port.kind,width:port.width,direction:{x:Math.sin(angle),z:Math.cos(angle)}};
}
export function matchPrefabPorts(a,b,tolerance=.001){
 if(!Number.isFinite(tolerance)||tolerance<=0)throw Error('Positive matching tolerance required');
 if(a.kind!==b.kind||Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)>tolerance)throw Error('Ports do not meet');
 if(Math.hypot(a.direction.x+b.direction.x,a.direction.z+b.direction.z)>tolerance)throw Error('Ports do not oppose');
 return{position:{...a.position},width:Math.min(a.width,b.width),kind:a.kind,status:'geometric match only; Board integration unverified'};
}
