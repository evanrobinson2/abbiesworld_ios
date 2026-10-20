// Immutable bounds captured by each generated instance, never by a global size.
export function hexBounds(radius){
 if(!Number.isFinite(radius)||radius<=0)throw new RangeError('A positive hex radius is required');
 const apothem=radius*Math.sqrt(3)/2;
 return (p,margin=0)=>{for(let i=0;i<6;i++){const a=i*Math.PI/3;if(p.x*Math.cos(a)+p.z*Math.sin(a)>apothem-margin+1e-7)return false;}return true;};
}
export function boardBounds(plans,radius){
 const inside=hexBounds(radius),centers=plans.map(p=>({...p.center}));
 const point=q=>centers.some(c=>inside({x:q.x-c.x,z:q.z-c.z}));
 return (q,r=0)=>point(q)&&Array.from({length:8},(_,i)=>({x:q.x+Math.cos(i*Math.PI/4)*r,z:q.z+Math.sin(i*Math.PI/4)*r})).every(point);
}
