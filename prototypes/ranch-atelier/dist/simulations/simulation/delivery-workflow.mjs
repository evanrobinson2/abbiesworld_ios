// The reusable reserve → travel → collect → travel → deliver → rest cycle.
// Routing/locomotion and presentation are supplied by the scene adapter.
export function stepDelivery(w,dt,h){
 const phases={source:'to-source',destination:'to-destination',home:'to-rest',...h.phases};
 const emit=event=>h.status?.(w,event);
 const stop=()=>{h.cancel(w.job);w.job=null;w.path=[];w.destination=null;w.phase='rest';w.timer=h.retrySeconds??8;emit('blocked');};
 const go=(target,phase,event)=>{if(!target||!h.route(w,target,phase)){stop();return false;}emit(event);return true;};
 let moved=0;
 if(w.phase==='idle'){
  w.job=h.reserve(w);
  if(w.job)go(h.source(w.job),phases.source,'to-source');
  else go(h.home(w),phases.home,'to-rest');
 }
 if([phases.source,phases.destination,phases.home].includes(w.phase)){
  const result=h.move(w,dt);moved=result.moved;
  if(result.arrived){h.visit?.(w);w.destination=null;
   if(w.phase===phases.source){w.phase='collect';w.timer=h.collectSeconds??3;emit('collect');}
   else if(w.phase===phases.destination){w.phase='deliver';w.timer=h.deliverSeconds??3;emit('deliver');}
   else{w.phase='rest';w.timer=h.restSeconds??7;emit('rest');}
  }
 }else if(w.phase==='collect'){
  w.timer-=dt;if(w.timer<=0){h.collect(w.job);go(h.destination(w.job),phases.destination,'to-destination');}
 }else if(w.phase==='deliver'){
  w.timer-=dt;if(w.timer<=0){h.deliver(w.job);w.job=null;w.phase='idle';}
 }else if(w.phase==='rest'){w.timer-=dt;if(w.timer<=0)w.phase='idle';}
 return moved;
}
