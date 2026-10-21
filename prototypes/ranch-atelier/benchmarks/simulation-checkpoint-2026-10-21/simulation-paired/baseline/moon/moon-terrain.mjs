import {landscapeParameters} from '../landscape-parameters.mjs';
import {slopeAt} from '../new-england-terrain.mjs';
const cache=new Map(),EXTENT=96,STEP=.75,N=257;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Bake geological detail once. Runtime navigation and rendering read the same field.
export function lunarTerrain(seed,parameters={}){
 const knobs=landscapeParameters(parameters),key=JSON.stringify([seed,knobs]);if(cache.has(key))return cache.get(key);
 let n=seed>>>0;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296),profile=((seed%3)+3)%3;
 const craters=Array.from({length:72},(_,i)=>{const a=random()*Math.PI*2,r=i<28?10+random()*30:35+random()*85,radius=i<12?5+random()*6:1.2+random()*3.8;return {x:Math.cos(a)*r,z:Math.sin(a)*r,r:radius,depth:radius*(.14+random()*.14),age:random(),angle:random()*6.28,stretch:.85+random()*.3};});
 // Stable base service area, with local pads instead of one circular flat disc.
 const pads=[[6,-2,4.8],[-4,-3,4],[-12,4.5,3],[-11,-11,3],[10,-11,3],[-11,13,3],[13,13,5.8],[-18,-5,3.2],[-18,-10,3.2],[-9,-8,3],[-7,-10,3],[-7,-3,2.2],[3,-12,2.5],[-3,15,4.8],[-3,-18,4.5],[9,-18,4.5],[17,-7,3],[17,-13,2.3],[-16,1,2.8],[0,-10,2]];
 const paths=[[[0,7],[-12,7]],[[0,7],[6,2.8]],[[0,7],[-4,.5]],[[0,7],[-11,10.8]],[[0,7],[6,4.4]],[[0,7],[-3,-13]],[[0,7],[9,-13]],[[0,7],[-3,20]],[[0,7],[17,-3]]];
 const clearance=(x,z)=>{let d=100;for(const [px,pz,r]of pads)d=Math.min(d,Math.hypot(x-px,z-pz)-r);for(const [[ax,az],[bx,bz]]of paths){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-ax-dx*t,z-az-dz*t)-1.8);}return smooth(d/3);};
 // At least one readable impact basin outside the operational pads on small tiles.
 for(let i=0;i<24;i++){const a=(i/24)*Math.PI*2+seed*.17,x=Math.cos(a)*26,z=Math.sin(a)*26;if(clearance(x,z)<.95)continue;craters.unshift({x,z,r:4.8,depth:1.8,age:.15,angle:a,stretch:.94});break;}
 const raw=(x,z)=>{
  const radial=Math.hypot(x,z),edge=clearance(x,z),phase=seed*.31;
  const broad=profile===0?1.8*Math.sin(x*.055+phase)*Math.cos(z*.044):profile===1?4*Math.exp(-((x*.065+Math.sin(z*.055+phase))**2)):2.8*(1-Math.exp(-((z*.065+Math.sin(x*.055+phase))**2)));
  const grain=.09*Math.sin(x*.57+Math.sin(z*.31))+.055*Math.sin(z*.87-x*.43)+.035*Math.cos(x*1.71+z*.93);
  let y=1.7+.06*Math.sin(x*.15+phase)*Math.cos(z*.16)+edge*(broad*knobs.relief+grain*knobs.rockRoughness);
  for(const c of craters){const dx=(x-c.x)/c.r,dz=(z-c.z)/c.r,q2=dx*dx*c.stretch+dz*dz/c.stretch;if(q2>7)continue;
   const q=Math.sqrt(q2),angle=Math.atan2(dz,dx)-c.angle,irregular=1+.045*Math.sin(angle*5)+.025*Math.sin(angle*9+c.age*5),d=q/irregular;
   const bowl=-c.depth*Math.max(0,1-d*d)**2;
   const rim=c.depth*(.28-.13*c.age)*Math.exp(-(((d-1.02)/(.12+c.age*.12))**2));
   const apron=d>1?c.depth*.10*Math.exp(-(d-1)*2.7)*(1+.3*Math.sin(angle*13+c.age*6)):0;
   y+=edge*(bowl+rim+apron);
  }
  return y;
 };
 const data=new Float32Array(N*N);for(let z=0;z<N;z++)for(let x=0;x<N;x++)data[z*N+x]=raw(x*STEP-EXTENT,z*STEP-EXTENT);
 const h=(x,z)=>{const u=(x+EXTENT)/STEP,v=(z+EXTENT)/STEP;if(u<0||v<0||u>=N-1||v>=N-1)return raw(x,z);const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*N+i;return (data[k]*(1-a)+data[k+1]*a)*(1-b)+(data[k+N]*(1-a)+data[k+N+1]*a)*b;};
 h.seed=seed;h.version=3;h.profile=['crater-highlands','ejecta-ridge','sinuous-rille'][profile];h.parameters=knobs;h.slope=(x,z)=>slopeAt(h,x,z);h.bakedBytes=data.byteLength;h.craters=craters.map(c=>({...c}));
 if(cache.size>=6)cache.delete(cache.keys().next().value);cache.set(key,h);return h;
}
