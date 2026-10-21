// Conservative broad phase. Results retain authored peer order so narrow-phase
// collision tests and floating-point pressure sums produce identical decisions.
export function createPeerIndex(peers,cellSize=2){
 if(!(cellSize>0)||!Number.isFinite(cellSize))throw new RangeError('Invalid cell size');
 const cells=new Map(),locations=new Map(),order=new Map(peers.map((p,i)=>[p,i]));
 const maxRadius=Math.max(0,...peers.map(p=>p.radius));let queries=0,candidates=0,possible=0;
 const key=(x,z)=>x+','+z;
 function update(p){const k=key(Math.floor(p.x/cellSize),Math.floor(p.z/cellSize)),old=locations.get(p);if(k===old)return;if(old!==undefined){const bucket=cells.get(old);bucket.delete(p);if(!bucket.size)cells.delete(old);}let bucket=cells.get(k);if(!bucket)cells.set(k,bucket=new Set());bucket.add(p);locations.set(p,k);}
 function rebuild(){cells.clear();locations.clear();for(const p of peers)update(p);}
 function query(position,reach,radius,exclude){const limit=Math.abs(reach)+radius+maxRadius+.8+1e-9,result=[];for(let x=Math.floor((position.x-limit)/cellSize);x<=Math.floor((position.x+limit)/cellSize);x++)for(let z=Math.floor((position.z-limit)/cellSize);z<=Math.floor((position.z+limit)/cellSize);z++)for(const p of cells.get(key(x,z))||[]){if(p===exclude)continue;const local=Math.abs(reach)+radius+p.radius+.8+1e-9;if(Math.abs(position.x-p.x)<=local&&Math.abs(position.z-p.z)<=local)result.push(p);}result.sort((a,b)=>order.get(a)-order.get(b));queries++;candidates+=result.length;possible+=Math.max(0,peers.length-(exclude?1:0));return result;}
 rebuild();return {rebuild,update,query,report:()=>({queries,candidates,possible})};
}
