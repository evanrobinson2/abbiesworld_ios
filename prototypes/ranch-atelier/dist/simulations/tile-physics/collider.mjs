// Exact conservative broad phase; original triangle order is retained at narrow phase.
export function compileTriangles(triangles){
 const records=triangles.map((t,index)=>({index,min:[0,1,2].map(k=>Math.min(t[k],t[k+3],t[k+6])),max:[0,1,2].map(k=>Math.max(t[k],t[k+3],t[k+6]))}));
 const build=list=>{if(!list.length)return null;const min=[0,1,2].map(k=>Math.min(...list.map(r=>r.min[k]))),max=[0,1,2].map(k=>Math.max(...list.map(r=>r.max[k])));if(list.length<=8)return {min,max,items:list};const axis=[0,1,2].sort((a,b)=>(max[b]-min[b])-(max[a]-min[a]))[0];list.sort((a,b)=>(a.min[axis]+a.max[axis])-(b.min[axis]+b.max[axis])||a.index-b.index);const mid=list.length>>1;return {min,max,left:build(list.slice(0,mid)),right:build(list.slice(mid))};};
 const tree=build(records),extent=triangles.reduce((r,t)=>Math.max(r,Math.hypot(...t.slice(0,3)),Math.hypot(...t.slice(3,6)),Math.hypot(...t.slice(6,9))),0);
 return {extent,query(center,radius){const result=[],visit=node=>{if(!node||[0,1,2].some(k=>center[k]+radius<node.min[k]||center[k]-radius>node.max[k]))return;if(node.items){for(const t of node.items)if(![0,1,2].some(k=>center[k]+radius<t.min[k]||center[k]-radius>t.max[k]))result.push(t.index);}else{visit(node.left);visit(node.right);}};visit(tree);return result.sort((a,b)=>a-b);}};
}
