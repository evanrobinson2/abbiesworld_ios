import {containsBoardPoint} from './board-bounds.js';
// World-metre pedestrian corridor checks. Terrain is sampled; obstacles are intersected analytically.
import {BOARD_CELLS,boardHeight} from './board-terrain.js';
import {cellWorld,HEX_RADIUS} from './playground-model.js';
const finite=(...v)=>v.every(Number.isFinite);
const local=(p,o)=>{const x=p.x-o.x,z=p.z-o.z,c=Math.cos(o.angle||0),s=Math.sin(o.angle||0);return {x:x*c-z*s,z:x*s+z*c};};
function intersects(a,b,o,padding){
 const p=local(a,o),q=local(b,o);
 if(o.kind==='circle'){const dx=q.x-p.x,dz=q.z-p.z,t=Math.max(0,Math.min(1,-(p.x*dx+p.z*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x+dx*t,p.z+dz*t)<=o.radius+padding;}
 let lo=0,hi=1;for(const [axis,half]of [['x',o.w/2+padding],['z',o.d/2+padding]]){const delta=q[axis]-p[axis];if(Math.abs(delta)<1e-9){if(Math.abs(p[axis])>half)return false;}else{let x=(-half-p[axis])/delta,y=(half-p[axis])/delta;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;}}return true;
}
function validateObstacle(o){if(!o||!finite(o.x,o.z,o.angle??0)||!['box','circle'].includes(o.kind)||(o.kind==='circle'? !finite(o.radius)||o.radius<=0:!finite(o.w,o.d)||o.w<=0||o.d<=0))throw Error('Invalid pedestrian obstacle');}
export function assemblyObstacles(assembly){
 if(!Array.isArray(assembly?.plans))throw Error('Resolved assembly is required');const result=[];
 for(const p of assembly.plans)for(const o of p.placements){const base={kind:'box',x:p.center.x+o.x,z:p.center.z+o.z,w:o.w,d:o.d,angle:o.angle||0};validateObstacle(base);
  if(o.role!=='enclosure'){result.push(base);continue;}
  // Ranch renderer's 3.2 m gate is on local +z. Fence rails are conservative 0.35 m strips.
  const add=(x,z,w,d)=>{if(w<=0||d<=0)return;const c=Math.cos(base.angle),s=Math.sin(base.angle);result.push({kind:'box',x:base.x+x*c+z*s,z:base.z-x*s+z*c,w,d,angle:base.angle});};
  add(-o.w/2,0,.35,o.d);add(o.w/2,0,.35,o.d);add(0,-o.d/2,o.w,.35);const wing=(o.w-3.2)/2;if(wing>0){add(-(1.6+wing/2),o.d/2,wing,.35);add(1.6+wing/2,o.d/2,wing,.35);}
 }
 return result;
}
export function createJoinVerifier({boardId,boardRevision,heightAt,contains,obstacles=[],obstaclesComplete=false,clearance=.6,sampleStep=.5}){
 if(typeof heightAt!=='function'||typeof contains!=='function'||!finite(clearance,sampleStep)||clearance<.3||clearance>3||sampleStep<=0||sampleStep>.5)throw Error('Explicit terrain, bounds and pedestrian corridor settings required');
 const blockers=structuredClone(obstacles);blockers.forEach(validateObstacle);
 return (candidate,board)=>{
  if(!obstaclesComplete||board.id!==boardId||board.revision!==boardRevision)return null;
  const {a,b}=candidate.access;if(!finite(a.x,a.y,a.z,b.x,b.y,b.z))return null;const distance=Math.hypot(b.x-a.x,b.z-a.z);if(distance>8)return null;
  if(heightAt.coasts?.length&&typeof heightAt.coversDryCorridor!=='function')return null;
  if(heightAt.coversDryCorridor&&!heightAt.coversDryCorridor(a,b,clearance))return null;
  if(blockers.some(o=>intersects(a,b,o,clearance)))return null;
  const count=Math.max(1,Math.ceil(distance/sampleStep)),nx=distance?-(b.z-a.z)/distance:1,nz=distance?(b.x-a.x)/distance:0,path=[],tracks=[[],[],[]];
  for(let i=0;i<=count;i++){const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;for(let lane=0;lane<3;lane++){const offset=(lane-1)*clearance,px=x+nx*offset,pz=z+nz*offset;if(!contains(px,pz))return null;const y=heightAt(px,pz);if(!Number.isFinite(y))return null;const track=tracks[lane],previous=track.at(-1);if(previous&&Math.abs(y-previous.y)>Math.max(.01,distance/count*.25))return null;track.push({x:px,y,z:pz});}if(Math.abs(tracks[0].at(-1).y-tracks[2].at(-1).y)>clearance*2*.25)return null;path.push(tracks[1].at(-1));}
  if(Math.abs(path[0].y-a.y)>.05||Math.abs(path.at(-1).y-b.y)>.05)return null;
  return {signature:candidate.signature,kind:'pedestrian',verified:true,traversable:true,obstructionFree:true,terrainChecked:true,path,method:'analytic-obstacles-and-sampled-heightfield',sampleStep,clearance};
 };
}
export function createBoardJoinVerifier({board,assembly,seed=41,extraObstacles=[],obstaclesComplete=false,clearance=.6}){
 const contains=containsBoardPoint,heightAt=boardHeight(assembly,seed);
 return createJoinVerifier({boardId:board.id,boardRevision:board.revision,heightAt,contains,obstacles:[...assemblyObstacles(assembly),...extraObstacles],obstaclesComplete:obstaclesComplete&&heightAt.grading?.valid!==false,clearance});
}
