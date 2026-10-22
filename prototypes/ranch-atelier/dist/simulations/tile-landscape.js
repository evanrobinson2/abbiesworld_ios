import {selectRanchTerrain} from './new-england-terrain.mjs';
import {TILE_RADIUS_METRES} from './tile-metrics.js';
import {random,cellCenter} from './tile-board.js';
import {inside,segmentDistance} from './tile-adapter.js';
export function landscapeSettings(board){return {height:Math.max(0,Math.min(30,Number(board.landscape?.height??12))),vegetation:Math.max(0,Math.min(8,Number(board.landscape?.vegetation??2))),biodiversity:board.landscape?.biodiversity??2,props:board.landscape?.props??1,seed:board.landscape?.seed??173};}
export function terrainSampler(board,assembly){
 const settings=landscapeSettings(board);
 if(board.landscape?.procedural)return selectRanchTerrain(settings.seed,settings.height*1.6,assembly);
 return (x,z)=>settings.height*(.48+.24*Math.sin(x/28+1)*Math.cos(z/37)+.18*Math.sin(z/19+x/51));
}
export function dressingPlan(plan,settings,heightAt){
 const rng=random(plan.seed^settings.seed),items=[],amount=settings.vegetation;
 const clear=(p,r)=>(!plan.ranchSpaces||Math.hypot(p.x-plan.hub.x,p.z-plan.hub.z)>8+r)&&inside(p,r+1)&&plan.placements.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>o.radius+r+1)&&plan.paths.every(path=>path.points.slice(1).every((b,i)=>segmentDistance(p,path.points[i],b)>path.width/2+r+.7));
 for(let i=0;i<amount*1100;i++){
  const p={x:(rng()-.5)*TILE_RADIUS_METRES*1.76,z:(rng()-.5)*TILE_RADIUS_METRES*1.92},field=heightAt?.habitat?.(p.x+plan.center.x,p.z+plan.center.z),cluster=field?field.woodland*2-1:(Math.sin(p.x*.17+plan.seed)+Math.cos(p.z*.14))/2;
  if(!clear(p,.6))continue;if(field&&rng()>(field.kind==='woodland'?.94:field.kind==='edge'?.65:field.kind==='rock'?.12:.22))continue;
  const kind=field?.kind==='rock'?'rock':i<amount*45&&(!field||field.kind==='woodland')?'tree':i%11===0?'shrub':i%37===0?'rock':'grass',radius=kind==='tree'?2.5:kind==='shrub'?1.2:amount>6?.3:.45;
  if(!clear(p,radius)||items.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<radius+q.radius))continue;
  items.push({...p,habitat:field?.kind,kind,radius,size:.7+rng()*.7,angle:rng()*Math.PI*2});
 }
 if(settings.props)for(const o of plan.placements.filter(o=>['barn','store','home','shelter'].includes(o.role))){
  for(let i=0;i<3;i++){const a=o.angle+Math.PI/2+i*.24,p={x:o.x+Math.sin(a)*(o.radius+2.5),z:o.z+Math.cos(a)*(o.radius+2.5)};if(clear(p,.6))items.push({...p,kind:'prop',role:o.role,slot:i,model:o.role==='home'?'wood-partial':i%2?'hay-partial':'ration-full',size:1,angle:o.angle});}
 }
 return items;
}
