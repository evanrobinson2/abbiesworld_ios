// One bounded sample per two simulation seconds; no timers, subscriptions or history.
export function createAdvisors(){let last=-Infinity;const tracks=new Map();let notices=[];return {
 update(state,workers){if(state.seconds-last<2)return notices;last=state.seconds;const alive=new Set();let stalled=0;
 for(const w of workers){const id=w.person.id;alive.add(id);const old=tracks.get(id),moving=w.body.visible&&['to-source','to-pen','offsite-route','to-rest','activity-route'].includes(w.phase);const same=old&&old.phase===w.phase&&Math.hypot(old.x-w.position.x,old.z-w.position.z)<.15;const since=moving&&same?old.since:state.seconds;tracks.set(id,{x:w.position.x,z:w.position.z,phase:w.phase,since});if(moving&&state.seconds-since>=10)stalled++;}
 for(const id of tracks.keys())if(!alive.has(id))tracks.delete(id);
 const animals=state.pens.flatMap(p=>p.animals),thirsty=animals.filter(a=>a.thirst>.65).length,hungry=animals.filter(a=>a.hunger>.65).length;
 notices=[];if(stalled)notices.push({id:'routes',text:`${stalled} worker${stalled===1?' is':'s are'} stuck on a route. Rerouting is being attempted.`});
 if(thirsty)notices.push({id:'water',text:`${thirsty} animal${thirsty===1?' needs':'s need'} water. Check trough access and deliveries.`});
 if(hungry)notices.push({id:'feed',text:`${hungry} animal${hungry===1?' needs':'s need'} feed. Check feed access and deliveries.`});
 if(state.stock.water<6||state.stock.feed<6)notices.push({id:'stores',text:'Care supplies are low at the store.'});
 const hour=state.calendar?.hour??12;if(hour>=8&&hour<18&&animals.length&&!workers.some(w=>w.body.visible&&w.person.age>=18&&w.person.age<67))notices.push({id:'staff',text:'No adult care workers are on site during the workday.'});
 return notices;},clear(){tracks.clear();notices=[];last=-Infinity;},get size(){return tracks.size;}};}
export function pickupAvailable(state,resource){return !Object.values(state.activeJobs).some(j=>j.resource===resource&&j.phase==='reserved');}
