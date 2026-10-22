// A finite coastal inset. No deck or boat grants pedestrian support.
const A=50*Math.sqrt(3)/2,normals=Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3),z:Math.sin(i*Math.PI/3)}));
export const DEFAULT_COAST=Object.freeze({waterOffset:1.2,depth:2,shoreWidth:4,wetPolygonLocal:Object.freeze([[-26,16],[26,16],[40,24],[0,46],[-40,24]].map(([x,z])=>Object.freeze({x,z})))});
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
const edgeDistance=(p,a,b)=>{const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1)));return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);};
const inPolygon=(p,poly)=>poly.every((a,i)=>cross(a,poly[(i+1)%poly.length],p)>=-1e-9);
const margin=p=>{let distance=Infinity;for(const n of normals)distance=Math.min(distance,A-p.x*n.x-p.z*n.z);return distance;};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function allowsCoastDressing(heightAt,plan,dressing){
 const coast=heightAt.coasts?.find(c=>c.id===plan.id);if(!coast)return true;
 const p={x:plan.center.x+dressing.x,z:plan.center.z+dressing.z};
 return !heightAt.isWater(p.x,p.z)&&coast.wetPolygon.every((a,i)=>edgeDistance(p,a,coast.wetPolygon[(i+1)%coast.wetPolygon.length])>(dressing.kind==='tree'?7:1.5));
}
function segmentsMeet(a,b,c,d){const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);if(abC*abD<0&&cdA*cdB<0)return true;return edgeDistance(a,c,d)<1e-9||edgeDistance(b,c,d)<1e-9||edgeDistance(c,a,b)<1e-9||edgeDistance(d,a,b)<1e-9;}
export function createCoastSurface({baseHeightAt,coasts=[]}={}){
 if(typeof baseHeightAt!=='function'||!Array.isArray(coasts)||coasts.length>100)throw Error('Invalid coast surface');
 const records=coasts.map(input=>{const c=structuredClone({...DEFAULT_COAST,...input}),poly=c.wetPolygonLocal;
  if(!finite(c.center)||!Number.isInteger(c.rotation)||!Number.isFinite(c.waterLevel)||!Number.isFinite(c.depth)||c.depth<=0||!Number.isFinite(c.shoreWidth)||c.shoreWidth<=0||c.shoreWidth>8||!Array.isArray(poly)||poly.length<3||poly.length>16||poly.some(p=>!finite(p)||margin(p)<2-1e-7)||poly.some((p,i)=>cross(p,poly[(i+1)%poly.length],poly[(i+2)%poly.length])<=0))throw Error('Invalid coast geometry');
  const angle=c.rotation*Math.PI/3,cos=Math.cos(angle),sin=Math.sin(angle),world=p=>({x:c.center.x+p.x*cos+p.z*sin,z:c.center.z-p.x*sin+p.z*cos});
  return {...c,wetPolygon:poly.map(world),local:(x,z)=>({x:(x-c.center.x)*cos-(z-c.center.z)*sin,z:(x-c.center.x)*sin+(z-c.center.z)*cos})};
 });
 function waterAt(x,z){return records.find(c=>Math.abs(x-c.center.x)<=50&&Math.abs(z-c.center.z)<=50&&inPolygon(c.local(x,z),c.wetPolygonLocal));}
 function heightAt(x,z){const base=baseHeightAt(x,z);for(const c of records){if(Math.abs(x-c.center.x)>50||Math.abs(z-c.center.z)>50)continue;const p=c.local(x,z),boundary=margin(p);if(boundary<=0)continue;const inside=inPolygon(p,c.wetPolygonLocal),distance=Math.min(...c.wetPolygonLocal.map((a,i)=>edgeDistance(p,a,c.wetPolygonLocal[(i+1)%c.wetPolygonLocal.length])));if(!inside&&distance>=c.shoreWidth)continue;
   const bed=c.waterLevel-.05-c.depth*smooth(inside?distance/6:0),blend=(inside?1:smooth(1-distance/c.shoreWidth))*smooth(boundary/2);return base+(bed-base)*blend;
  }return base;
 }
 const isWater=(x,z)=>!!waterAt(x,z);
 const surfaceAt=(x,z)=>{const coast=waterAt(x,z);return {kind:coast?'water':'ground',terrainY:heightAt(x,z),waterLevel:coast?.waterLevel??null,walkable:!coast,coastId:coast?.id??null};};
 const coversDryCorridor=(a,b,clearance=.6)=>{
  if(!finite(a)||!finite(b)||!Number.isFinite(clearance)||clearance<0)return false;
  for(const c of records){const p=c.local(a.x,a.z),q=c.local(b.x,b.z),poly=c.wetPolygonLocal;if(inPolygon(p,poly)||inPolygon(q,poly))return false;for(let i=0;i<poly.length;i++){const u=poly[i],v=poly[(i+1)%poly.length];if(segmentsMeet(p,q,u,v)||Math.min(edgeDistance(p,u,v),edgeDistance(q,u,v),edgeDistance(u,p,q),edgeDistance(v,p,q))<=clearance+1e-9)return false;}}
  return true;
 };
 return {heightAt,isWater,surfaceAt,coversDryCorridor,coasts:records.map(({local,...c})=>structuredClone(c))};
}
