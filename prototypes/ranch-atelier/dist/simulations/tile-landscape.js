import {selectRanchTerrain} from './new-england-terrain.mjs';
import {TILE_RADIUS_METRES} from './tile-metrics.js';
import {random,cellCenter} from './tile-board.js';
import {inside,segmentDistance} from './tile-adapter.js';
// Preview of asset-factory brick-kit props (simulation-assets/generated/): open the sandbox with ?kit.
const KIT_PROPS=new URLSearchParams(globalThis.location?.search||'').has('kit')?['kit-wheelbarrow-with-pumpkins','kit-hay-bale-stack','kit-roadside-mailbox','kit-beehive-box-on-stand','kit-stone-well-with-roof-and-bucket','kit-farm-tractor','kit-water-trough']:null;
export function landscapeSettings(board){return {height:Math.max(0,Math.min(30,Number(board.landscape?.height??12))),vegetation:Math.max(0,Math.min(8,Number(board.landscape?.vegetation??2))),biodiversity:board.landscape?.biodiversity??2,props:board.landscape?.props??1,seed:board.landscape?.seed??173};}
export function terrainSampler(board,assembly){
 const settings=landscapeSettings(board);
 if(board.landscape?.procedural)return selectRanchTerrain(settings.seed,settings.height*1.6,assembly);
 return (x,z)=>settings.height*(.48+.24*Math.sin(x/28+1)*Math.cos(z/37)+.18*Math.sin(z/19+x/51));
}
export function dressingPlan(plan,settings,heightAt){
 const rng=random(plan.seed^settings.seed),items=[],amount=settings.vegetation;
 const clear=(p,r)=>(!plan.ranchSpaces||Math.hypot(p.x-plan.hub.x,p.z-plan.hub.z)>8+r)&&inside(p,r+1)&&plan.placements.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.radius+r+1)&&plan.paths.every(path=>path.points.slice(1).every((b,i)=>segmentDistance(p,path.points[i],b)>path.width/2+r+.7));
 const mountain=heightAt?.profile==='three-complete-mountains';
 for(let i=0;i<amount*(mountain?1800:1100);i++){
  const p={x:(rng()-.5)*TILE_RADIUS_METRES*1.76,z:(rng()-.5)*TILE_RADIUS_METRES*1.92},field=heightAt?.habitat?.(p.x+plan.center.x,p.z+plan.center.z),cluster=field?field.woodland*2-1:(Math.sin(p.x*.17+plan.seed)+Math.cos(p.z*.14))/2;
  if(heightAt?.lakeside){const w=heightAt.lakeside,x=p.x+plan.center.x,z=p.z+plan.center.z;if(w.wet(x,z,.14)||w.roadDistance(x,z)<3*w.k||w.buildings.some(b=>Math.hypot(b.x-x,b.z-z)<6*w.k)||Math.hypot(x-w.square.x,z-w.square.z)<w.square.radius+2*w.k)continue;}if(heightAt?.overland){const o=heightAt.overland,x=p.x+plan.center.x,z=p.z+plan.center.z;if(o.roadDistance(x,z)<4||o.clearings.some(c=>Math.hypot(x-c.x,z-c.z)<c.r)||o.items.some(q=>Math.hypot(x-q.x,z-q.z)<q.radius+3))continue;if(x>105*o.k&&z<170*o.k&&heightAt(x,z)<12&&i%5!==0)continue;}if(!clear(p,.6))continue;if(field&&rng()>(field.kind==='woodland'?.94:field.kind==='edge'?.65:field.kind==='rock'?.12:.22))continue;
  const kind=field?.kind==='rock'?'rock':(mountain?i%2===0:i<amount*45)&&(!field||field.kind==='woodland')?'tree':i%11===0?'shrub':i%37===0?'rock':'grass',radius=kind==='tree'?2.5:kind==='shrub'?1.2:amount>6?.3:.45;
  if(!clear(p,radius)||items.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<radius+q.radius))continue;
  items.push({...p,habitat:field?.kind,kind,radius,size:(mountain&&kind==='tree'?1.15:.7)+rng()*.7,angle:rng()*Math.PI*2});
 }
 if(settings.props)for(const o of plan.placements.filter(o=>['barn','store','home','shelter'].includes(o.role))){
  for(let i=0;i<3;i++){const a=o.angle+Math.PI/2+i*.24,p={x:o.x+Math.sin(a)*(o.radius+2.5),z:o.z+Math.cos(a)*(o.radius+2.5)};if(clear(p,.6))items.push({...p,kind:'prop',model:KIT_PROPS?KIT_PROPS[(i+Math.round(Math.abs(o.x*7+o.z*3)))%KIT_PROPS.length]:o.role==='home'?'wood-partial':i%2?'hay-partial':'ration-full',size:1,angle:o.angle});}
 }
 return items;
}
