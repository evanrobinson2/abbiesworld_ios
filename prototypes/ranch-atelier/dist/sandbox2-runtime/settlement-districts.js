// District recipes are ordinary saved-card entries. This adds no population model.
const rows={
 seaside:[['seaside','landing',0,0],['gathering','meal',0,-1],['garden','kitchen',1,-1],['preservation','roots',0,-2],['pottery','kiln',1,-2],['woodland','coppice',-1,-1],['animals','care',2,-2]],
 neighborhood:[
  ['neighborhood','court',0,0],['gathering','meal',1,0],['garden','kitchen',1,1],
  ['preservation','roots',0,1],['pottery','kiln',-1,1],['woodland','coppice',-1,0],['animals','care',2,0]
 ],
 town:[
  ['town','market',0,0],['gathering','market',1,0],['preservation','roots',1,-1],
  ['pottery','kiln',0,-1],['woodland','coppice',-1,0],['garden','kitchen',-1,1],
  ['animals','care',0,1],['garden','kitchen',2,-1],['pottery','vessels',1,1]
 ]
};
export function settlementDistrictEntries(id){
 if(!rows[id])throw Error('Unknown settlement district');
 return rows[id].map(([type,preset,q,r],index)=>({type,preset,q,r,seed:41+index*11}));
}

export function districtTopology(entries){
 const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]],byCell=new Map();
 for(const [index,e]of entries.entries()){if(!Number.isInteger(e.q)||!Number.isInteger(e.r)||byCell.has(e.q+','+e.r))throw Error('Invalid or overlapping district entries');byCell.set(e.q+','+e.r,index);}
 const links=[],degree=entries.map(()=>0);for(const [i,e]of entries.entries())for(const [q,r]of directions){const j=byCell.get((e.q+q)+','+(e.r+r));if(j>i){links.push([i,j]);degree[i]++;degree[j]++;}}
 const visited=new Set(),queue=entries.length?[0]:[];while(queue.length){const i=queue.pop();if(visited.has(i))continue;visited.add(i);for(const [a,b]of links)if(a===i||b===i)queue.push(a===i?b:a);}
 return {cells:entries.length,links,connected:entries.length>0&&visited.size===entries.length,degree,throughCells:degree.filter(d=>d>=2).length,residentialCards:entries.filter(e=>['home','neighborhood','town'].includes(e.type)).length,core:entries.findIndex(e=>e.q===0&&e.r===0),scope:'adjacency-only; actual terrain and pedestrian access require preflight'};
}
