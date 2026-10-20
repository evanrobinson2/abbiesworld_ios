import {distanceToSegment} from './generator.mjs';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** Continuous presentation landscape; no cell boundaries or tile radius. */
export function landscapeHeight(plan,x,z){
 let clear=Infinity;
 for(const p of plan.placements)clear=Math.min(clear,Math.hypot(x-p.position.x,z-p.position.z)-p.radius-2);
 for(const r of plan.routes)clear=Math.min(clear,distanceToSegment({x,z},r.a,r.b)-r.width/2-2);
 for(const f of plan.fields)clear=Math.min(clear,Math.hypot(Math.max(0,Math.abs(x-f.x)-f.w/2),Math.max(0,Math.abs(z-f.z)-f.d/2))-2);
 const border=smooth((120-Math.max(Math.abs(x),Math.abs(z)))/20);
 return 2.2*(.55+.45*Math.sin(x*.07+.4)*Math.cos(z*.08))*smooth(clear/12)*border;
}
export function landscapeMesh(plan){const positions=[],indices=[],n=160,size=240;for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const x=(i/n-.5)*size,z=(j/n-.5)*size;positions.push(x,landscapeHeight(plan,x,z),z);}for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;indices.push(a,c,b,b,c,d);}return{positions,indices};}
