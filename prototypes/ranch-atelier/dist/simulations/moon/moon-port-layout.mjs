// The two large VTOL sites share their footprint with planning and terrain.
export const LARGE_PORT_MIN_SIZE=80;
export function moonPorts(size,construction=false){
 if(construction&&size<LARGE_PORT_MIN_SIZE)throw new RangeError('Aurora construction needs a Moonbase at least 80 m across. Increase Size before placing this tile.');
 if(size<LARGE_PORT_MIN_SIZE)return [{id:'landing',asset:'ME-070',ship:'RE-072',x:13,z:13,radius:4.1,deck:.62,label:'Rocket port'}];
 const ports=[{id:'landing',asset:'RE-074',ship:'RE-073',x:16,z:15.5,radius:8.1,deck:1.2,label:'Aurora VTOL port'}];
 if(construction)ports.push({id:'construction-pad',asset:'RE-074',ship:'RE-075',x:-21.5,z:12,radius:8.1,deck:1.2,label:'Aurora construction pad'});
 return ports;
}
export function withPortTerrain(base,size,construction=false){
 const ports=moonPorts(size,construction);if(size<LARGE_PORT_MIN_SIZE)return base;
 const pads=ports.map(p=>({...p,y:base(p.x,p.z)}));
 const h=(x,z)=>{let y=base(x,z);for(const p of pads){const d=Math.hypot(x-p.x,z-p.z),t=Math.max(0,Math.min(1,(d-p.radius)/2));if(t<1){const w=t*t*(3-2*t);y=p.y*(1-w)+y*w;}}return y;};
 Object.assign(h,base);h.portTerrain=true;h.slope=(x,z)=>Math.hypot(h(x+.25,z)-h(x-.25,z),h(x,z+.25)-h(x,z-.25))/.5;return h;
}
