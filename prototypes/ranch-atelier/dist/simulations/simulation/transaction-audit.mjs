// Read-only evidence for the most recent paused manipulation; no growing log.
export function transactionLedger(s){
 const sites=s.sites||s.pens,resources={};
 for(const key of Object.keys(s.resources)){const carried=Object.values(s.activeJobs).reduce((n,j)=>n+(j.resource===key?j.load:0),0);resources[key]={stock:s.stock[key],atSites:sites.reduce((n,p)=>n+p[key],0),carried,used:s.used[key],replenished:s.replenished[key]};}
 const jobs=Object.values(s.activeJobs).map(j=>({id:j.id,worker:j.worker,resource:j.resource,siteId:j.siteId,phase:j.phase,load:j.load})).sort((a,b)=>a.id.localeCompare(b.id));
 const reservationsValid=jobs.every(j=>sites.some(p=>p.id===j.siteId&&p.reserved[j.resource]===j.id))&&sites.every(p=>Object.entries(p.reserved).every(([resource,id])=>id==null||jobs.some(j=>j.id===id&&j.siteId===p.id&&j.resource===resource)))&&new Set(jobs.map(j=>j.worker)).size===jobs.length;
 return {seconds:s.seconds,identities:Object.keys(s.lifeStories?.entities||{}).sort(),resources,jobs,reservationsValid};
}
export function compareTransaction(before,after,{cancelled=false}={}){
 const near=(a,b)=>Math.abs(a-b)<1e-7,checks={clock:before.seconds===after.seconds,identities:JSON.stringify(before.identities)===JSON.stringify(after.identities),resources:true,reservations:before.reservationsValid&&after.reservationsValid,jobs:after.jobs.every(j=>before.jobs.some(p=>p.id===j.id&&p.worker===j.worker&&p.resource===j.resource&&p.siteId===j.siteId&&p.phase===j.phase&&near(p.load,j.load)))};
 for(const [key,a]of Object.entries(before.resources)){const b=after.resources[key];if(!b||!near(a.stock+a.atSites+a.carried,b.stock+b.atSites+b.carried)||!near(a.used,b.used)||!near(a.replenished,b.replenished))checks.resources=false;}
 if(cancelled)checks.exactRestore=JSON.stringify(before)===JSON.stringify(after);
 return {passed:Object.values(checks).every(Boolean),checks,before,after};
}
