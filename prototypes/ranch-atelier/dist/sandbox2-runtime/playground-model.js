const clone=x=>structuredClone(x);
export const BOARD_KEY='ranch-playground-boards-v1';
import {TILE_RADIUS_METRES} from './tile-metrics.js';
export const HEX_RADIUS=TILE_RADIUS_METRES;
export function rotateCell({q,r},turns){for(let i=0;i<((turns%6)+6)%6;i++)[q,r]=[-r,q+r];return {q,r};}
export function cellWorld({q,r}){return {x:Math.sqrt(3)*HEX_RADIUS*(q+r/2),z:HEX_RADIUS*1.5*r};}
export function instanceCells(instance,card){return card.cells.map(c=>{const t=rotateCell(c,instance.rotation);return {q:t.q+instance.q,r:t.r+instance.r};});}
export function transformPoint(p,instance){const a=-instance.rotation*Math.PI/3,c=cellWorld(instance);return {x:c.x+p.x*Math.cos(a)+p.z*Math.sin(a),z:c.z-p.x*Math.sin(a)+p.z*Math.cos(a),y:(p.y??0)+(instance.elevation??0)};}
export const cardKey=(id,revision)=>id+'@'+revision;
export function emptyBoard(id){return {version:1,id,revision:0,population:6,cards:{},instances:[],simulation:null};}
export function validateBoard(board){
 if(board?.version!==1||typeof board.id!=='string'||!Number.isInteger(board.revision)||!Array.isArray(board.instances)||!board.cards)throw Error('Invalid Playground board');
 const ids=new Set(),occupied=new Set();
 for(const i of board.instances){if(!i.instanceId||ids.has(i.instanceId))throw Error('Duplicate instance ID');ids.add(i.instanceId);if(![i.q,i.r,i.rotation].every(Number.isInteger)||i.rotation<0||i.rotation>5||Math.max(Math.abs(i.q),Math.abs(i.r),Math.abs(i.q+i.r))>12)throw Error('Placement outside the board');const card=board.cards[cardKey(i.cardId,i.cardRevision)];if(!card?.cells?.length)throw Error('Pinned card rendition is missing');for(const c of instanceCells(i,card)){if(Math.max(Math.abs(c.q),Math.abs(c.r),Math.abs(c.q+c.r))>12)throw Error('Card extends outside the board');const key=c.q+','+c.r;if(occupied.has(key))throw Error('Card footprints overlap');occupied.add(key);}}
 return true;
}
// Economic access is opt-in. Nearby ports alone are only rendering candidates.
const pedestrian=p=>p.kind==='pedestrian'||p.kind==='footpath'||(p.kind==='access'&&p.mode==='pedestrian');
const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
function worldDirection(direction,instance){if(!direction||![direction.x,direction.z].every(Number.isFinite))return null;const length=Math.hypot(direction.x,direction.z);if(length<1e-6)return null;const a=-instance.rotation*Math.PI/3;return {x:(direction.x*Math.cos(a)+direction.z*Math.sin(a))/length,z:(-direction.x*Math.sin(a)+direction.z*Math.cos(a))/length};}
function joinSignature(a,b,board){return JSON.stringify([board.id,board.revision,[a,b].map(p=>[p.instanceId,p.cardId,p.cardRevision,p.id,p.x,p.y,p.z,p.direction])]);}
function checkEvidence(e,access,signature){
 if(!e||e.signature!==signature||e.verified!==true||e.traversable!==true||e.obstructionFree!==true||e.terrainChecked!==true||e.kind!=='pedestrian')return 'Joining segment has no verified pedestrian traversal evidence';
 const path=e.path;if(!Array.isArray(path)||path.length<2||!path.every(finitePoint))return 'Joining segment has no valid sampled path';
 const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
 if(distance(path[0],access.a)>.05||distance(path.at(-1),access.b)>.05)return 'Joining evidence does not match current endpoints';
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],run=Math.hypot(a.x-b.x,a.z-b.z);if(Math.abs(a.y-b.y)>Math.max(.01,run*.25))return 'Joining segment exceeds pedestrian slope limit';}
 return null;
}
export function inspectConnections(board,{verifyJoin,resolvedPortsByInstance}={}){
 const connections=[],candidates=[],warnings=[],ports=board.instances.flatMap(i=>{const card=board.cards[cardKey(i.cardId,i.cardRevision)];const overlay=resolvedPortsByInstance?.[i.instanceId];if(resolvedPortsByInstance!==undefined){if(!overlay||overlay.space!=='world-metres'||overlay.boardId!==board.id||overlay.boardRevision!==board.revision||!Array.isArray(overlay.ports)){warnings.push({instanceId:i.instanceId,cardId:i.cardId,reason:'Missing or stale resolved access ports'});return [];}return overlay.ports.map(p=>({...p,direction:worldDirection(p.direction,{rotation:0}),instanceId:i.instanceId,cardId:i.cardId,cardRevision:i.cardRevision}));}return (card.ports||[]).map(p=>({...p,...transformPoint(p,i),direction:worldDirection(p.direction,i),instanceId:i.instanceId,cardId:i.cardId,cardRevision:i.cardRevision}));});
 for(let i=0;i<board.instances.length;i++)for(let j=i+1;j<board.instances.length;j++){
  const a=board.instances[i],b=board.instances[j],matches=[];
  for(const p of ports.filter(p=>p.instanceId===a.instanceId))for(const q of ports.filter(p=>p.instanceId===b.instanceId)){
   if(!finitePoint(p)||!finitePoint(q))continue;
   const distance=Math.hypot(p.x-q.x,p.z-q.z),rise=Math.abs(p.y-q.y);if(distance>8)continue;
   const reasons=[],access={a:p,b:q,distance,rise},signature=joinSignature(p,q,board);
   if(p.verified!==true||q.verified!==true||typeof p.id!=='string'||!p.id||typeof q.id!=='string'||!q.id)reasons.push('Both ports need stable IDs and explicit verification');
   if(!pedestrian(p)||!pedestrian(q))reasons.push('Ports are not compatible pedestrian access');
   if(!p.direction||!q.direction)reasons.push('Outward port direction is missing');
   else {const dot=p.direction.x*q.direction.x+p.direction.z*q.direction.z;if(dot>-.5)reasons.push('Port directions do not face one another');if(distance>.05){const dx=(q.x-p.x)/distance,dz=(q.z-p.z)/distance;if(p.direction.x*dx+p.direction.z*dz<.5||q.direction.x*dx+q.direction.z*dz>-.5)reasons.push('Joining segment approaches the back of a port');}}
   if(rise>Math.max(.01,distance*.25))reasons.push('Joining segment exceeds pedestrian slope limit');
   const candidate={a:a.instanceId,b:b.instanceId,valid:false,signature,access,reasons};
   if(!reasons.length){let evidence;try{evidence=verifyJoin?verifyJoin(candidate,board):(board.joinEvidence||[]).find(e=>e.signature===signature);}catch{reasons.push('Joining segment verification failed');}if(!reasons.length){const issue=checkEvidence(evidence,access,signature);if(issue)reasons.push(issue);else {candidate.valid=true;candidate.path=clone(evidence.path);matches.push(candidate);}}}
   candidates.push(candidate);
  }
  if(matches.length){matches.sort((a,b)=>a.access.distance-b.access.distance);connections.push(matches[0]);}
 }
 for(const i of board.instances)if(board.instances.length>1&&!connections.some(c=>c.a===i.instanceId||c.b===i.instanceId))warnings.push({instanceId:i.instanceId,cardId:i.cardId,reason:'No verified traversable pedestrian connection'});
 return {connections,candidates,warnings};
}
export function simulationBoard(board,options){const {connections}=inspectConnections(board,options);return {id:board.id,revision:board.revision,population:board.population,instances:board.instances.map(i=>{const card=board.cards[cardKey(i.cardId,i.cardRevision)];return {instanceId:i.instanceId,cardId:i.cardId,cardRevision:i.cardRevision,capabilities:clone(card.capabilities||{}),initialStock:clone(card.initialStock||{})};}),connections};}
export function editBoard(board,action,args){const next=clone(board),instance=next.instances.find(i=>i.instanceId===args.instanceId);
 if(action==='place'){const card=clone(args.card);if(!card.id||!Number.isInteger(card.revision)||!card.rendition)throw Error('A saved card rendition is required');const key=cardKey(card.id,card.revision);if(next.cards[key]&&JSON.stringify(next.cards[key])!==JSON.stringify(card))throw Error('Saved revision differs from pinned rendition');next.cards[key]=card;next.instances.push({instanceId:args.newInstanceId,cardId:card.id,cardRevision:card.revision,q:args.q,r:args.r,rotation:args.rotation||0,elevation:0});}
 else if(action==='swap'){const other=next.instances.find(i=>i.instanceId===args.targetInstanceId);if(!instance||!other||instance===other)throw Error('Choose two different compositions');[instance.q,other.q]=[other.q,instance.q];[instance.r,other.r]=[other.r,instance.r];}
 else if(action==='replace'){const other=next.instances.find(i=>i.instanceId===args.targetInstanceId);if(!other)throw Error('Choose a composition to replace');const card=clone(args.card);if(!card.id||!Number.isInteger(card.revision)||!card.rendition)throw Error('A saved card rendition is required');next.cards[cardKey(card.id,card.revision)]=card;next.instances=next.instances.filter(i=>i!==other);next.instances.push({instanceId:args.newInstanceId,cardId:card.id,cardRevision:card.revision,q:args.q,r:args.r,rotation:args.rotation||0,elevation:0});}
 else if(action==='move'){if(!instance)throw Error('Select a card instance');instance.q=args.q;instance.r=args.r;}
 else if(action==='rotate'){if(!instance)throw Error('Select a card instance');instance.rotation=(instance.rotation+(args.turns??1)+6)%6;}
 else if(action==='remove'){if(!instance)throw Error('Select a card instance');next.instances=next.instances.filter(i=>i!==instance);}
 else if(action==='duplicate'){if(!instance)throw Error('Select a card instance');next.instances.push({...instance,instanceId:args.newInstanceId,q:args.q,r:args.r});}
 else throw Error('Unsupported board edit');
 validateBoard(next);next.revision++;return next;
}
export function createHistory(initial){let current=clone(initial),undo=[],redo=[];return {read:()=>clone(current),commit(next){validateBoard(next);undo.push(clone(current));undo=undo.slice(-40);redo=[];current=clone(next);return this.read();},undo(){if(!undo.length)throw Error('Nothing to undo');redo.push(clone(current));const revision=current.revision+1;current=undo.pop();current.revision=revision;return this.read();},redo(){if(!redo.length)throw Error('Nothing to redo');undo.push(clone(current));const revision=current.revision+1;current=redo.pop();current.revision=revision;return this.read();},available:()=>({undo:undo.length,redo:redo.length})};}
