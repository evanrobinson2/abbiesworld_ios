import {worldSnapshot} from './world-snapshot.mjs';
import {instanceCells as instanceCellsForDrop} from './playground-model.js';
import {editBoard,cardKey,validateBoard} from './playground-model.js';
// Geometry is immutable and shared across undo snapshots; edits clone only mutable state.
const snapshot=b=>({...b,cards:{...b.cards},instances:structuredClone(b.instances),simulation:structuredClone(b.simulation),supplies:structuredClone(b.supplies),world:worldSnapshot(b.world)});
const light=c=>({...c,rendition:{sourceCard:{id:c.id,revision:c.revision}}});
export function editComposition(board,action,args){const cards=Object.fromEntries(Object.entries(board.cards).map(([k,c])=>[k,light(c)])),next=editBoard({...board,cards},action,['place','replace'].includes(action)?{...args,card:light(args.card)}:args);next.cards={...board.cards};if(['place','replace'].includes(action))next.cards[cardKey(args.card.id,args.card.revision)]=board.cards[cardKey(args.card.id,args.card.revision)]||args.card;return next;}
export function compositionHistory(initial){let current=snapshot(initial),undo=[],redo=[];return {commit(next){validateBoard(next);undo.push(snapshot(current));undo=undo.slice(-40);redo=[];current=snapshot(next);},peek(type){const stack=type==='undo'?undo:redo;if(!stack.length)throw Error('Nothing to '+type);return {...snapshot(stack.at(-1)),revision:current.revision+1};},accept(type,next){const source=type==='undo'?undo:redo,target=type==='undo'?redo:undo;source.pop();target.push(snapshot(current));current=snapshot(next);},checkpoint(next){current=snapshot(next);},available:()=>({undo:undo.length,redo:redo.length})};}

// Fork the rendition for one instance. Source cards and sibling instances remain pinned.
export function replaceComposition(board,instanceId,card){
 const instance=board.instances.find(i=>i.instanceId===instanceId);
 if(!instance)throw Error('Select a tile');
 if(!card?.id||!card.rendition)throw Error('A resolved card is required');
 if(board.cards[cardKey(card.id,card.revision)])throw Error('Replacement must have a new card identity');
 const next={...board,revision:board.revision+1,cards:{...board.cards,[cardKey(card.id,card.revision)]:card},instances:board.instances.map(i=>i===instance?{...i,cardId:card.id,cardRevision:card.revision}:i)};
 validateBoard(next);return next;
}

// Resolve one drop without mutating cards or instances. Validation happens on commit.
export function resolveDrop(board,{selected,card,q,r,rotation=0,newInstanceId='preview'}){
 const target=board.instances.find(i=>i.instanceId!==selected&&instanceCellsForDrop(i,board.cards[cardKey(i.cardId,i.cardRevision)]).some(c=>c.q===q&&c.r===r));
 if(card)return {action:target?'replace':'place',args:{card,newInstanceId,q:target?.q??q,r:target?.r??r,rotation,...(target?{targetInstanceId:target.instanceId}:{})}};
 if(!selected)throw Error('Select a composition');
 return target?{action:'swap',args:{instanceId:selected,targetInstanceId:target.instanceId}}:{action:'move',args:{instanceId:selected,q,r}};
}
