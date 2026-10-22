import {editComposition} from './board-state.js';
import {cardKey,cellWorld,instanceCells,validateBoard,HEX_RADIUS,emptyBoard} from './playground-model.js';
import {BOARD_CELLS,validateFootprints,boardHeight,coastFacesOuterEdge} from './board-terrain.js';
import {planComposition} from './board-composition.js';
import {resolveBoardEconomy} from './board-economy.js';

const snapshot=b=>({...b,cards:{...b.cards},instances:structuredClone(b.instances),simulation:structuredClone(b.simulation),supplies:structuredClone(b.supplies)});
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key=c=>c.q+','+c.r;
const radius=c=>Math.max(Math.abs(c.q),Math.abs(c.r),Math.abs(c.q+c.r));
export function planSettlementPreset({cards,entries,dimensions={},assetIndex,boardId='settlement-preview',sites,maxCandidates=8}={}){
 if(!Array.isArray(cards)||!Array.isArray(entries)||!cards.length||cards.length!==entries.length)throw Error('One saved card is required per preset entry');
 let layout=emptyBoard(boardId);
 for(let i=0;i<cards.length;i++){const e=entries[i];if(!Number.isInteger(e.q)||!Number.isInteger(e.r))throw Error('Invalid preset cell');layout=editComposition(layout,'place',{card:cards[i],newInstanceId:e.instanceId||'settlement-'+i+'-'+cards[i].id,q:e.q,r:e.r,rotation:e.rotation||0});}
 return selectSettlementSite({layout,dimensions,assetIndex,sites,maxCandidates});
}
// Packing changes instance positions only. Saved cells, recipes and renditions stay pinned.
export function compactSettlementLayout(board,{anchorInstanceId,heroInstanceId}={}){
 validateBoard(board);if(!board.instances.length)throw Error('Settlement needs saved card instances');
 const anchor=anchorInstanceId||board.instances[0].instanceId;
 if(!board.instances.some(i=>i.instanceId===anchor)||heroInstanceId&&!board.instances.some(i=>i.instanceId===heroInstanceId))throw Error('Unknown settlement anchor or hero');
 const next=snapshot(board),order=[anchor,...(heroInstanceId&&heroInstanceId!==anchor?[heroInstanceId]:[]),...next.instances.map(i=>i.instanceId).filter(id=>id!==anchor&&id!==heroInstanceId)],occupied=new Set();
 for(const id of order){const instance=next.instances.find(i=>i.instanceId===id),card=next.cards[cardKey(instance.cardId,instance.cardRevision)],offsets=instanceCells({...instance,q:0,r:0},card),candidates=new Map();
  if(!occupied.size)candidates.set('0,0',{q:0,r:0});
  else for(const cellKey of occupied){const [q,r]=cellKey.split(',').map(Number);for(const [dq,dr]of directions)for(const offset of offsets){const c={q:q+dq-offset.q,r:r+dr-offset.r};candidates.set(key(c),c);}}
  const choices=[...candidates.values()].map(c=>{const cells=offsets.map(o=>({q:c.q+o.q,r:c.r+o.r}));return {c,cells,extent:Math.max(...cells.map(radius)),contacts:cells.reduce((n,p)=>n+directions.filter(([q,r])=>occupied.has(key({q:p.q+q,r:p.r+r}))).length,0)};}).filter(x=>x.extent<=12&&!x.cells.some(c=>occupied.has(key(c)))).sort((a,b)=>a.extent-b.extent||radius(a.c)-radius(b.c)||b.contacts-a.contacts||a.c.r-b.c.r||a.c.q-b.c.q);
  if(!choices.length)throw Error('Saved footprints cannot fit a compact settlement');const chosen=choices[0];instance.q=chosen.c.q;instance.r=chosen.c.r;for(const c of chosen.cells)occupied.add(key(c));
 }
 next.revision++;validateBoard(next);return next;
}

export function settlementFocusBounds(board,heightAt){
 const min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
 for(const instance of board.instances)for(const cell of instanceCells(instance,board.cards[cardKey(instance.cardId,instance.cardRevision)])){const center=cellWorld(cell);for(let i=0;i<6;i++){const x=center.x+Math.sin(i*Math.PI/3)*HEX_RADIUS,z=center.z+Math.cos(i*Math.PI/3)*HEX_RADIUS,y=heightAt(x,z);min.x=Math.min(min.x,x);min.y=Math.min(min.y,y);min.z=Math.min(min.z,z);max.x=Math.max(max.x,x);max.y=Math.max(max.y,y);max.z=Math.max(max.z,z);}}
 return {space:'world-metres',kind:'occupied-ground',min,max};
}

// Read-only preflight: caller saves only after a ready result and successful rendering.
export function selectSettlementSite({layout,assetIndex,dimensions={},sites,maxCandidates=8}={}){
 validateBoard(layout);if(!layout.instances.length)throw Error('Settlement is empty');
 if(!assetIndex||typeof assetIndex!=='object')throw Error('Actual asset collision inventory is required');
 if(!Number.isInteger(maxCandidates)||maxCandidates<1||maxCandidates>100)throw Error('Invalid site search limit');
 const coastal=layout.instances.some(i=>layout.cards[cardKey(i.cardId,i.cardRevision)].recipe?.type==='seaside');
 const candidates=sites||(coastal?[{q:-4,r:4},{q:-3,r:4},...BOARD_CELLS.filter(c=>c.row===9)]:[{q:-4,r:3},{q:-2,r:-4},...BOARD_CELLS]),seen=new Set(),attempts=[];let best=null;
 for(const site of candidates){if(!Number.isInteger(site.q)||!Number.isInteger(site.r))throw Error('Site offsets must be integer axial cells');if(seen.has(key(site)))continue;seen.add(key(site));if(attempts.length>=maxCandidates)break;
  const board=snapshot(layout);board.revision++;for(const i of board.instances){i.q+=site.q;i.r+=site.r;}
  let result;try{
   validateBoard(board);validateFootprints(board);
   for(const instance of board.instances){const card=board.cards[cardKey(instance.cardId,instance.cardRevision)];if(card.recipe?.type!=='seaside')continue;for(const [index,cell]of instanceCells(instance,card).entries())if(!coastFacesOuterEdge(cellWorld(cell),((card.recipe.tiles[index].rotation||0)+instance.rotation)%6))throw Error('Seaward edges must face outside the Board');}
   const {assembly}=planComposition(board,dimensions),heightAt=boardHeight(assembly),economy=resolveBoardEconomy(board,assembly,heightAt,assetIndex,dimensions),connected=new Set(economy.report.connectedInstanceIds);
   const perCard=board.instances.map(i=>({instanceId:i.instanceId,cardId:i.cardId,cardRevision:i.cardRevision,status:connected.has(i.instanceId)?'connected':'blocked',accessScope:assembly.plans.filter(p=>p.id.startsWith(i.instanceId+':')).flatMap(p=>p.placements).every(p=>p.accessScope==='exterior-only')?'exterior-only':'working-entrances',capabilities:structuredClone(board.cards[cardKey(i.cardId,i.cardRevision)].capabilities||{}),warnings:economy.accessWarnings.filter(w=>w.instanceId===i.instanceId||w.tileId?.startsWith(i.instanceId+':'))}));
   const warnings=[...assembly.warnings,...economy.accessWarnings],ready=heightAt.grading.valid&&warnings.length===0&&perCard.every(c=>c.status==='connected');
   result={status:ready?'ready':'blocked',site:{q:site.q,r:site.r},board,assembly,heightAt,economy,perCard,warnings,focusBounds:settlementFocusBounds(board,heightAt)};
   attempts.push({site:result.site,status:result.status,connected:perCard.filter(c=>c.status==='connected').length,total:perCard.length,gradingValid:heightAt.grading.valid,warnings:structuredClone(warnings)});
  }catch(error){attempts.push({site:{q:site.q,r:site.r},status:'blocked',connected:0,total:board.instances.length,warnings:[{reason:error.message}]});continue;}
  if(!best||result.perCard.filter(c=>c.status==='connected').length>best.perCard.filter(c=>c.status==='connected').length)best=result;
  if(result.status==='ready')return {...result,attempts};
 }
 return best?{...best,attempts}:{status:'blocked',board:null,perCard:layout.instances.map(i=>({instanceId:i.instanceId,cardId:i.cardId,cardRevision:i.cardRevision,status:'blocked'})),warnings:[{reason:'No candidate site could be planned'}],attempts,focusBounds:null};
}
