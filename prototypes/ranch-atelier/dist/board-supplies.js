// Finite initial supplies belong to a board, never to a reusable card.
export const SUPPLY_SCHEMA_VERSION=1;
export const DEMO_SUPPLY_RESERVE=Object.freeze({clay:30});
const resources=['rawFood','fuel','clay','vessels','food'];
const clone=x=>structuredClone(x);
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=200;
function stock(input){if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Explicit supply amounts are required');for(const [key,value]of Object.entries(input))if(!resources.includes(key)||!Number.isSafeInteger(value)||value<0||value>1000000)throw Error('Invalid supply amount: '+key);return Object.fromEntries(resources.map(key=>[key,input[key]??0]));}
export function createSupplies(boardId,initialReserve){if(!validId(boardId))throw Error('Supply reserve needs a board ID');const initial=stock(initialReserve);return {schemaVersion:SUPPLY_SCHEMA_VERSION,boardId,revision:0,policy:'finite-board-reserve',initialReserve:initial,reserve:clone(initial),allocations:[]};}
export function validateSupplies(ledger,boardId=ledger?.boardId){
 if(ledger?.schemaVersion!==SUPPLY_SCHEMA_VERSION||ledger.policy!=='finite-board-reserve'||!validId(ledger.boardId)||ledger.boardId!==boardId||!Number.isSafeInteger(ledger.revision)||ledger.revision<0||!Array.isArray(ledger.allocations))throw Error('Invalid board supply ledger');
 const initial=stock(ledger.initialReserve),remaining=stock(ledger.reserve),totals=stock({}),ids=new Set();
 for(const a of ledger.allocations){if(!validId(a.instanceId)||ids.has(a.instanceId)||!validId(a.cardId)||!Number.isSafeInteger(a.cardRevision)||a.cardRevision<1)throw Error('Invalid or repeated supply allocation');ids.add(a.instanceId);const amounts=stock(a.stock);if(!Object.values(amounts).some(v=>v>0))throw Error('Empty supply allocation');for(const key of resources)totals[key]+=amounts[key];}
 for(const key of resources)if(remaining[key]+totals[key]!==initial[key])throw Error('Supply conservation failed: '+key);
 return true;
}
function validateSimulation(board){const sim=board.simulation;if(sim==null)return;if(sim.boardId!==board.id||!Array.isArray(sim.stockGranted)||!sim.stockGranted.every(validId))throw Error('Supply allocation needs this board simulation ledger');}
export function allocateSupplies(ledger,board,instanceId,amounts){
 validateSupplies(ledger,board.id);validateSimulation(board);
 const matches=board.instances.filter(i=>i.instanceId===instanceId);if(matches.length!==1)throw Error('Allocate to one existing stable instance');const instance=matches[0];
 if(ledger.allocations.some(a=>a.instanceId===instanceId))throw Error('This instance already has an immutable allocation');
 if(board.simulation?.stockGranted.includes(instanceId))throw Error('Initial supplies already processed for this instance');
 const requested=stock(amounts),available=stock(ledger.reserve);if(!Object.values(requested).some(v=>v>0))throw Error('Allocate at least one supply');
 for(const key of resources)if(requested[key]>available[key])throw Error('Insufficient board reserve: '+key);
 const next=clone(ledger);next.reserve=available;for(const key of resources)next.reserve[key]-=requested[key];next.allocations.push({instanceId,cardId:instance.cardId,cardRevision:instance.cardRevision,stock:requested});next.revision++;validateSupplies(next,board.id);return next;
}
export function allocatedStock(ledger,instance){validateSupplies(ledger);const allocation=ledger.allocations.find(a=>a.instanceId===instance.instanceId&&a.cardId===instance.cardId&&a.cardRevision===instance.cardRevision);return allocation?clone(allocation.stock):{};}
// Pass the result to village-simulation. This overwrites any card-derived initialStock.
// Missing ledger is deliberately empty: old saved cards do not mint resources.
export function withAllocatedSupplies(villageBoard,ledger){if(ledger!=null)validateSupplies(ledger,villageBoard.id);return {...villageBoard,instances:villageBoard.instances.map(i=>({...i,initialStock:ledger?allocatedStock(ledger,i):{}}))};}
// Board owners commit this returned snapshot with the simulation in one history entry.
export function allocateBoardSupplies(board,instanceId,amounts){if(!Number.isSafeInteger(board.revision)||board.revision<0)throw Error('Invalid board revision');if(!board.supplies)throw Error('Initialize the finite board reserve explicitly');const supplies=allocateSupplies(board.supplies,board,instanceId,amounts);return {...board,revision:board.revision+1,supplies};}
