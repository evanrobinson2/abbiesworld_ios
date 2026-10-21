import {landscapeParameters} from './landscape-parameters.mjs';
import {random} from './tile-board.js';
import {TILE_RADIUS_METRES} from './tile-metrics.js';
const clamp=x=>Math.max(0,Math.min(1,x));
function noise(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),smooth=t=>t*t*(3-2*t),u=smooth(x-ix),v=smooth(z-iz);
 const hash=(a,b)=>{let n=Math.imul(a,374761393)^Math.imul(b,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;
}
export function slopeAt(h,x,z){return Math.hypot((h(x+.5,z)-h(x-.5,z)),(h(x,z+.5)-h(x,z-.5)));}
export function newEnglandTerrain(seed,height=15,controls={}){
 const knobs=landscapeParameters(controls);height*=knobs.relief;
 const rng=random(seed),angle=rng()*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),offset=(rng()-.5)*120,side=rng()>.5?1:-1,phase=rng()*6.28;
 const length=(45+rng()*65)*knobs.ridgeLength,center=(rng()-.5)*100,width=(25+rng()*35)*knobs.ridgeWidth,profile=seed%3;
 // A weathered ridge with a broken steep flank, rounded shoulders and a saddle.
 // Local rock relief fades into foothills; there is no board-wide step function.
 const h=(x,z)=>{
  const u=(x*c+z*s)*side,v=-x*s+z*c;
  const edge=offset+8*Math.sin(v/31+phase)+3*Math.sin(v/12-phase);
  const d=u-edge,along=(v-center)/length;
  const shoulder=Math.exp(-Math.pow(along,4)),saddle=1-.28*Math.exp(-Math.pow((v-center-length*.2)/14,2));
  const faceWidth=(5+3*(.5+.5*Math.sin(v/17+phase)))*knobs.faceSoftness;
  const ridge=(.5+.5*Math.tanh(d/faceWidth))*Math.exp(-Math.pow(Math.max(0,d-8)/width,2))*shoulder*saddle;
  const rock= Math.exp(-Math.pow(d/12,2))*shoulder*(.55*Math.sin(v*.55+phase)+.25*Math.sin(u*.8+v*.3));
  const hills=.65*Math.sin(u/55+phase)*Math.cos(v/63)+.22*Math.sin(v/23-phase);
  const rounded=Math.exp(-Math.pow((d-12)/(width*.85),2)-Math.pow(along,4));
  const opposite=.65*Math.exp(-Math.pow((d+width*1.7*knobs.valleySpacing)/(width*.65),2)-Math.pow((v-center-length*.35)/(length*.8),4));
  const form=profile===0?ridge:profile===1?rounded:ridge*.8+opposite;
  return 3+height*form+(profile===1?.15:1)*rock*knobs.rockRoughness+hills*knobs.foothillVariation;
 };
 h.seed=seed;h.parameters=knobs;h.profile=['broken-ridge','glacial-hill','valley-shoulders'][profile];h.slope=(x,z)=>slopeAt(h,x,z);
 h.habitat=(x,z)=>{const u=x*c+z*s,v=-x*s+z*c,slope=h.slope(x,z),patch=clamp(.7*noise(x/(35*knobs.habitatPatchSize),z/(35*knobs.habitatPatchSize),seed)+.3*((noise(x/12,z/12,seed^0x51a7)-.5)*knobs.habitatDetail+.5)+knobs.woodlandCoverage),moisture=clamp(.8-h(x,z)/(height+6)*.65);return {slope,moisture,woodland:clamp(patch),kind:slope>.5?'rock':patch>.62?'woodland':patch>.43?'edge':moisture>.6?'wet-meadow':'meadow'};};return h;
}
export function assessRanchTerrain(h,assembly){
 const failures=[];if(!assembly.plans.some(p=>p.placements.length))return {valid:false,failures:[{type:"empty-site"}]};
 for(const p of assembly.plans){
  for(const o of p.placements){const x=p.center.x+o.x,z=p.center.z+o.z,r=Math.max(1,o.radius||Math.hypot(o.w||2,o.d||2)/2);let lo=Infinity,hi=-Infinity,maxSlope=0;
   for(let ix=-r;ix<=r;ix+=Math.min(1,r))for(let iz=-r;iz<=r;iz+=Math.min(1,r)){const y=h(x+ix,z+iz);lo=Math.min(lo,y);hi=Math.max(hi,y);maxSlope=Math.max(maxSlope,slopeAt(h,x+ix,z+iz));}
   if(!Number.isFinite(lo+hi)||hi-lo>.85||maxSlope>.12)failures.push({type:'foundation',id:o.id,relief:hi-lo,slope:maxSlope});
  }
  for(const path of p.paths)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)));for(let j=0;j<=n;j++){const x=p.center.x+a.x+(b.x-a.x)*j/n,z=p.center.z+a.z+(b.z-a.z)*j/n;if(slopeAt(h,x,z)>.25){failures.push({type:'route'});break;}}}
 }
 return {valid:!failures.length,failures};
}
export function selectRanchTerrain(seed,height,assembly,attempts=64){
 for(let attempt=0;attempt<attempts;attempt++){const terrain=newEnglandTerrain((seed+attempt*7919)>>>0,height),assessment=assessRanchTerrain(terrain,assembly);let low=Infinity,high=-Infinity;for(const p of assembly.plans)for(let a=0;a<6;a++){const y=terrain(p.center.x+Math.sin(a*Math.PI/3)*TILE_RADIUS_METRES,p.center.z+Math.cos(a*Math.PI/3)*TILE_RADIUS_METRES);low=Math.min(low,y);high=Math.max(high,y);}if(assessment.valid&&high-low>=height*.25){terrain.validation={...assessment,attempts:attempt+1,seed:terrain.seed};return terrain;}}
 throw new Error('No suitable New England terrain found for this ranch. Try another layout or randomize. No placement constraints were relaxed.');
}
