import {landformHeight} from './region-presets.mjs';
import {townSurface} from './town-life/layouts.mjs';
import {createCoastSurface,DEFAULT_COAST} from './coast-surface.js';
import {gradeTerrain} from './terrain-grading.js';
import {memoizeHeight} from './height-cache.js';
import {cellWorld,instanceCells,cardKey} from './playground-model.js';
export const BOARD_CELLS=Array.from({length:100},(_,i)=>{const row=Math.floor(i/10),col=i%10;return {q:col-Math.floor(row/2)-3,r:row-5,row,col};});
const keys=new Set(BOARD_CELLS.map(c=>c.q+','+c.r));
export function onBoard(c){return keys.has(c.q+','+c.r);}
export function coastFacesOuterEdge(center,rotation=0){
 const angle=rotation*Math.PI/3;
 return [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].every(([q,r])=>{const delta=cellWorld({q,r});if((delta.x*Math.sin(angle)+delta.z*Math.cos(angle))/Math.hypot(delta.x,delta.z)<=.7)return true;return !BOARD_CELLS.some(c=>{const p=cellWorld(c);return Math.hypot(p.x-center.x-delta.x,p.z-center.z-delta.z)<.01;});});
}
export function validateFootprints(board){for(const i of board.instances)for(const c of instanceCells(i,board.cards[cardKey(i.cardId,i.cardRevision)]))if(!onBoard(c))throw Error('Composition extends beyond the 10 × 10 board');return true;}
export function rawTerrain(x,z,seed=41,relief=1,landform){if(landform&&landform!=='rolling')return landformHeight(x,z,seed,relief,landform);const phase=(seed%101)*.023,river=90*Math.sin(z/260+phase)-45;return relief*2.1*(12+49*Math.exp(-((x+265)**2/90000+(z-110)**2/190000))+37*Math.exp(-((x-320)**2/65000+(z+260)**2/110000))+11*Math.sin(x/240+z/330+phase)-14*Math.exp(-(((x-river)/68)**2))+3*Math.sin(x/71)*Math.sin(z/96));}
export function boardHeight(assembly,seed=41,{cache=false,relief=1,landform}={}){
 const pads=assembly.plans.flatMap(p=>p.placements.map(o=>({...o,id:p.id+':'+o.id,x:o.x+p.center.x,z:o.z+p.center.z})));
 const paths=assembly.plans.flatMap(p=>(p.paths||[]).map(path=>({...path,points:path.points.map(v=>({x:v.x+p.center.x,z:v.z+p.center.z}))})));
 for(const plan of assembly.plans.filter(p=>p.type==='castle'))for(const placement of plan.placements){const pad=pads.find(p=>p.id===plan.id+':'+placement.id);if(!pad)continue;const radius=pad.radius||0;pad.height=Math.max(...Array.from({length:13},(_,i)=>rawTerrain(pad.x+(i?Math.cos(i*Math.PI/6)*radius:0),pad.z+(i?Math.sin(i*Math.PI/6)*radius:0),seed,relief,landform)))+2;}
 const grading=gradeTerrain({heightAt:(x,z)=>rawTerrain(x,z,seed,relief,landform),pads,paths});
 const shores=assembly.plans.filter(p=>p.type==='seaside').map(p=>{const pad=p.placements.find(o=>o.role==='seaside');if(!pad)return null;const spec={...DEFAULT_COAST,...pad.coast};return {...spec,id:p.id,tileId:p.id,center:{...p.center},rotation:p.rotation||0,waterLevel:grading.heightAt(p.center.x+pad.x,p.center.z+pad.z)-spec.waterOffset};}).filter(Boolean);
 const surface=shores.length?createCoastSurface({baseHeightAt:grading.heightAt,coasts:shores}):null;
 const shoreWarnings=shores.filter(c=>!coastFacesOuterEdge(c.center,c.rotation)).map(c=>({tileId:c.id,reason:'Seaward edges must face outside the Board'}));
 let townHeight=surface?.heightAt||grading.heightAt;for(const p of assembly.plans){const spec=p.placements.find(o=>o.townTerrain)?.townTerrain;if(spec)townHeight=townSurface(p,spec.preset,spec.seed,townHeight);}
 const heightAt=townHeight,cached=memoizeHeight(heightAt),metadata={valid:grading.valid&&!shoreWarnings.length,warnings:[...grading.warnings,...shoreWarnings],pads:grading.pads};
 for(const sampler of [heightAt,cached]){sampler.grading=metadata;if(surface){sampler.coasts=surface.coasts;sampler.isWater=surface.isWater;sampler.surfaceAt=surface.surfaceAt;sampler.coversDryCorridor=surface.coversDryCorridor;}}
 heightAt.cached=cached;return cache?cached:heightAt;
}
export function boardTiles(board){return board.instances.flatMap(i=>{const card=board.cards[cardKey(i.cardId,i.cardRevision)],cells=instanceCells(i,card);return card.recipe.tiles.map((t,index)=>({...t,id:i.instanceId+':'+t.id,type:t.type||t.id,cell:index,rotation:(t.rotation+i.rotation)%6,center:cellWorld(cells[index]),instanceId:i.instanceId}));});}
