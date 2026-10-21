// Simulation time is independent of requestAnimationFrame. Work is bounded per
// frame, but pending time is retained and exposed rather than silently dropped.
export function createFixedClock({step=1/20,maxSteps=2}={}){
 if(!(step>0)||!Number.isFinite(step)||!Number.isInteger(maxSteps)||maxSteps<1)throw new RangeError('Invalid clock configuration');
 let pending=0,ticks=0;
 return {
  advance(elapsed,update){
   if(!Number.isFinite(elapsed)||elapsed<0)throw new RangeError('Invalid elapsed time');
   pending+=elapsed;let count=0;
   while(pending+1e-10>=step&&count<maxSteps){update(step);pending=Math.max(0,pending-step);ticks++;count++;}
   return count;
  },
  get alpha(){return Math.min(1,pending/step);},
  report(){return {stepSeconds:step,ticks,pendingSeconds:pending,backlogged:pending>=step,simulatedSeconds:ticks*step};},
  snapshot(){return {version:1,step,pending,ticks};},
  restore(saved){pending=saved?.version===1&&saved.step===step&&Number.isFinite(saved.pending)&&saved.pending>=0?saved.pending:0;ticks=Number.isSafeInteger(saved?.ticks)&&saved.ticks>=0?saved.ticks:0;}
 };
}

// A deadline is an event: reconsider on expiry or immediately when a dependency
// changes. Stable ID offsets distribute routine decisions across simulation steps.
export function createDecisionSchedule(){
 const entries=new Map();let computed=0,reused=0;
 return {
  read(id,signature,now,interval,decide){
   const old=entries.get(id);
   if(old&&old.signature===signature&&now<old.due){reused++;return old.value;}
   let hash=0;for(const c of id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
   const offset=(hash%997)/997*interval;
   const due=(Math.floor((now-offset)/interval)+1)*interval+offset;
   const value=decide();entries.set(id,{signature,due:Math.max(now+1e-9,due),value});computed++;return value;
  },
  forget(id){entries.delete(id);},clear(){entries.clear();},
  report(){return {computed,reused,scheduled:entries.size};},
  snapshot(){return structuredClone([...entries]);},
  restore(saved){entries.clear();for(const [id,e] of Array.isArray(saved)?saved:[])if(typeof id==='string'&&e&&Number.isFinite(e.due))entries.set(id,structuredClone(e));}
 };
}

// Capacity claims change synchronously in the existing deterministic worker order.
// A departing or interrupted worker releases its claim before another can take it.
export function createOccupancy(){
 const members=new Map(),counts=new Map();let version=0;
 return {
  set(id,place){place??=null;const prior=members.get(id)??null;if(prior===place)return;if(prior!=null){counts.set(prior,(counts.get(prior)||1)-1);members.delete(id);}if(place!=null){members.set(id,place);counts.set(place,(counts.get(place)||0)+1);}version++;},
  count(place,except){return (counts.get(place)||0)-(except!=null&&members.get(except)===place?1:0);},
  get version(){return version;},restoreVersion(value){if(Number.isSafeInteger(value)&&value>=0)version=value;},clear(){members.clear();counts.clear();version++;}
 };
}

// Match the existing seeded generator, while making continuation serializable.
export function createStatefulRandom(seed){
 const next=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 next.snapshot=()=>seed|0;next.restore=value=>{if(Number.isInteger(value))seed=value|0;};return next;
}

// All schedule boundaries used by ranch-rhythm, including individual wake offsets.
export function agendaWindow(hour){
 const boundaries=[0,1,2,3,4,5,6,6.15,6.3,6.45,7,7.5,8,9,10,10.5,11,12,13,14,15,15.5,16,17,18,19,20,21,21.15,21.3,21.45,22,23,24];
 return boundaries.findIndex(boundary=>hour<boundary);
}
