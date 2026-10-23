// Pure simulation mechanics: no renderer, scene names, or species.
export function createResourceState(resources, sites, stock={}) {
 const s={seconds:0,baseline:true,resources,sites,jobs:0,nextJob:1,stock:{},initial:{},used:{},delivered:{},replenished:{},activeJobs:{}};
 for(const [key,r] of Object.entries(resources)){
  s.stock[key]=stock[key]??r.initialStock;s.used[key]=s.delivered[key]=s.replenished[key]=0;
  for(const site of sites){site[key]??=r.initialAtSite;site.reserved??={};site.reserved[key]=null;site.visits??=0;}
  s.initial[key]=s.stock[key]+sites.reduce((n,site)=>n+site[key],0);
 }
 return s;
}
export function advanceResources(s,dt){
 if(!Number.isFinite(dt)||dt<0)throw new RangeError('Invalid simulation timestep');
 s.seconds+=dt;if(!s.baseline)return;
 for(const [key,r] of Object.entries(s.resources)){const q=Math.max(0,Math.min(r.stockCapacity-s.stock[key],dt*r.replenishRate));s.stock[key]+=q;s.replenished[key]+=q;}
}
// Needs are normalized deficits. Arrival must come from actual scene movement.
export function advanceConsumer(s,site,consumer,rules,dt,arrived){
 for(const r of rules)consumer[r.need]=Math.min(1,consumer[r.need]+dt*r.growth);
 let rule=rules.find(r=>r.resource===consumer.intent);
 if(rule&&(consumer[rule.need]<rule.stop||site[rule.resource]<=0))rule=null;
 rule??=rules.find(r=>consumer[r.need]>r.start&&site[r.resource]>0);
 consumer.intent=rule?.resource??null;if(!rule)return null;
 const atStation=!!arrived(rule.resource),q=atStation?Math.min(site[rule.resource],dt*rule.rate):0;
 site[rule.resource]-=q;s.used[rule.resource]+=q;consumer[rule.need]=Math.max(0,consumer[rule.need]-q*rule.relief);
 return {resource:rule.resource,arrived:atStation,amount:q};
}
export function reserveDelivery(s,worker,available=()=>true){
 if(Object.values(s.activeJobs).some(j=>j.worker===worker))return null;
 const choices=[];
 for(const site of s.sites)for(const [resource,r]of Object.entries(s.resources))if(available(resource)&&site.reserved[resource]==null&&site[resource]<r.refillBelow&&s.stock[resource]>0)choices.push({site,resource,priority:(r.refillBelow-site[resource])*r.priority});
 choices.sort((a,b)=>b.priority-a.priority);const choice=choices[0];if(!choice)return null;
 const job={id:String(s.nextJob++),worker,siteId:choice.site.id,resource:choice.resource,load:0,phase:'reserved'};
 choice.site.reserved[job.resource]=job.id;s.activeJobs[job.id]=job;return job;
}
function ownedSite(s,job){if(!job||s.activeJobs[job.id]!==job)return null;return s.sites.find(p=>p.id===job.siteId&&p.reserved[job.resource]===job.id);}
export function collectDelivery(s,job){
 if(!ownedSite(s,job)||job.phase!=='reserved')return 0;
 const q=Math.min(s.resources[job.resource].carryCapacity,s.stock[job.resource]);s.stock[job.resource]-=q;job.load=q;job.phase='carrying';return q;
}
export function finishDelivery(s,job){
 const p=ownedSite(s,job);if(!p||job.phase!=='carrying')return 0;
 const q=Math.max(0,Math.min(job.load,p.capacity-p[job.resource]));p[job.resource]+=q;s.delivered[job.resource]+=q;s.stock[job.resource]+=job.load-q;job.load=0;p.reserved[job.resource]=null;delete s.activeJobs[job.id];job.phase='complete';
 if(q>0){p.visits++;s.jobs++;}return q;
}
export function cancelDelivery(s,job){
 const p=ownedSite(s,job);if(!p)return;s.stock[job.resource]+=job.load;job.load=0;p.reserved[job.resource]=null;delete s.activeJobs[job.id];job.phase='cancelled';
}
export function resourceBalance(s,key){const carried=Object.values(s.activeJobs).reduce((n,j)=>n+(j.resource===key?j.load:0),0);return s.stock[key]+s.sites.reduce((n,p)=>n+p[key],0)+carried+s.used[key]-s.initial[key]-s.replenished[key];}
