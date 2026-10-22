// Immutable bounds captured by each generated instance, never by a global size.
const HEX_NORMALS=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3),Math.sin(i*Math.PI/3)]);
const RING=Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4),Math.sin(i*Math.PI/4)]);
export function hexBounds(radius){
 if(!Number.isFinite(radius)||radius<=0)throw new RangeError('A positive hex radius is required');
 const apothem=radius*Math.sqrt(3)/2;
 return (p,margin=0)=>{const limit=apothem-margin+1e-7;for(const [c,s] of HEX_NORMALS)if(p.x*c+p.z*s>limit)return false;return true;};
}
// Same answer as testing every tile: a point can only lie in hexes whose
// circumscribed circle covers it, so each grid cell lists just those centers.
export function boardBounds(plans,radius){
 const inside=hexBounds(radius),centers=plans.map(p=>({...p.center})),cell=radius*2,reach=radius+1e-6,cells=new Map();
 const key=(i,j)=>(i+32768)*65536+(j+32768);
 for(const c of centers)for(let i=Math.floor((c.x-reach)/cell);i<=Math.floor((c.x+reach)/cell);i++)for(let j=Math.floor((c.z-reach)/cell);j<=Math.floor((c.z+reach)/cell);j++){const k=key(i,j);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(c);}
 const offset={x:0,z:0};let last=null;
 const within=(q,c)=>{offset.x=q.x-c.x;offset.z=q.z-c.z;return inside(offset);};
 const point=(x,z)=>{const q={x,z};if(last&&within(q,last))return true;const list=cells.get(key(Math.floor(x/cell),Math.floor(z/cell)));if(!list)return false;for(const c of list)if(within(q,c)){last=c;return true;}return false;};
 return (q,r=0)=>{if(!point(q.x,q.z))return false;for(const [c,s] of RING)if(!point(q.x+c*r,q.z+s*r))return false;return true;};
}
