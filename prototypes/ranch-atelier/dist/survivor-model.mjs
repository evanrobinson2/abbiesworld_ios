// Survivor scene recipe; geometry, routes and saved actor state share metre coordinates.
export function campRecipe(seed=41,cell={q:-2,r:1},layout='roadside'){
 if(!Number.isInteger(seed)||seed<1||seed>4294967295)throw Error('Use a seed from 1 to 4294967295');
 if(!['roadside','sheltered','lookout'].includes(layout))throw Error('Unknown camp layout');
 return {version:1,seed,cell:{q:cell.q,r:cell.r},layout,people:3,vehicle:'survivor-black-suv',vehicleYaw:layout==='lookout'?-.35:layout==='sheltered'?.25:0,roles:['mechanic','nurse','delivery']};
}
export function campNavigation(center,yaw=0){
 const points=[[-3.5,-2.6],[0,-3.3],[3.5,-2.6],[3.8,0],[3.5,2.6],[0,3.3],[-3.5,2.6],[-3.8,0]],nodes={},adj={};
 for(let i=0;i<points.length;i++){const [x,z]=points[i];nodes['camp#'+i]={x:center.x+x*Math.cos(yaw)-z*Math.sin(yaw),y:0,z:center.z+x*Math.sin(yaw)+z*Math.cos(yaw)};adj['camp#'+i]=[];}
 for(let i=0;i<points.length;i++){const a='camp#'+i,b='camp#'+((i+1)%points.length),cost=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z);adj[a].push({id:b,cost});adj[b].push({id:a,cost});}
 return {nodes,adj,hubs:{},signature:JSON.stringify(nodes),obstacles:[],heightAt:()=>0};
}
