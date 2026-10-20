const labels={woodland:'Gathering fuel',garden:'Harvesting',pottery:'Making pottery',preservation:'Preserving food'};
const resources={rawFood:'raw food',fuel:'fuel',clay:'clay',vessels:'vessels',food:'food'};
export function sceneActivity(instanceId,report,state){
 const jobs=(report.lastDay?.jobs||[]).filter(j=>j.instanceId===instanceId);
 const events=(state.events||[]).filter(e=>e.instanceId===instanceId&&e.kind==='production');
 const totals={};for(const e of events)totals[e.resource]=(totals[e.resource]||0)+e.amount;
 return {day:report.day,hasDay:!!report.lastDay,workers:jobs.filter(j=>j.status==='working').length,jobs:jobs.map(j=>({label:labels[j.job]||j.job,status:j.status,detail:j.status==='working'?`${j.amount} ${resources[j.resource]||j.resource} produced`:j.reason})),history:events.slice(-5).reverse().map(e=>`Day ${e.day}: +${e.amount} ${resources[e.resource]||e.resource}`),totals:Object.entries(totals).map(([k,v])=>`${v} ${resources[k]||k}`),warnings:report.warnings.filter(w=>!w.instanceIds?.length||w.instanceIds.includes(instanceId)).map(w=>w.message)};
}
