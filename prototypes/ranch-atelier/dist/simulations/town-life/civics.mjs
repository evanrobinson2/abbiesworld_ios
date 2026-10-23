// Authored illustrative rules, not predictions of crime or a legal/medical model.
export const clock=s=>(s.day-1)*24+s.hour;
export const available=(s,id)=>!(s.conditions||[]).some(c=>c.person===id&&c.until>clock(s));
export function addIncident(state,type){
 if(!['injury','theft','report','serious'].includes(type))throw Error('Unknown incident');
 const s=structuredClone(state);s.cases||=[];s.conditions||=[];
 const n=s.cases.length,person=`${(n+1)%s.households.length}:0`,victim=`${n%s.households.length}:1`;
 const c={id:n+1,type,person,victim,at:clock(s),stage:'reported',steps:0,evidence:[],history:['Report received; no finding has been made.'],consent:type==='theft',harm:type==='serious'?3:1,status:'open'};
 if(type==='injury'){s.conditions.push({person,kind:'injury',until:clock(s)+10000});c.history=['A worker slipped on a damaged walkway. Care requested.'];c.place='road';}
 else {c.place='market';c.history=[type==='report'?'A resident reported missing goods. The cause is not yet known.':type==='serious'?'A serious property-damage incident was reported at the market.':'Missing market goods were reported. Support offered to the affected resident.'];}
 s.cases.push(c);return s;
}
export function advanceCivics(s,staff){
 s.cases||=[];s.conditions||=[];s.civicLog||=[];
 const log=(c,text)=>{c.history.push(text);s.civicLog.unshift({day:s.day,hour:s.hour,text:`Case ${c.id}: ${text}`});s.civicLog=s.civicLog.slice(0,30);};
 for(const c of s.cases){if(c.status==='closed')continue;c.steps++;
  if(c.type==='injury'){
   if(c.stage==='reported'){c.stage='care';log(c,staff('nurse')?'Clinic worker responds; the family receives support.':'Visiting clinic team responds while local staff are unavailable.');}
   else if(c.stage==='care'&&c.steps>=3){c.stage='recovery';const condition=s.conditions.find(x=>x.person===c.person&&x.kind==='injury');if(condition)condition.until=clock(s)+8;log(c,'Treatment completed. Eight simulated hours of supported recovery; no work assigned.');}
   else if(c.stage==='recovery'&&available(s,c.person)){c.status='closed';c.stage='recovered';s.maintenanceRepairs=(s.maintenanceRepairs||0)+1;log(c,'Resident recovered; maintenance repaired the walkway. Ordinary routines resume.');}
   continue;
  }
  if(c.stage==='reported'){c.stage='investigating';log(c,staff('police')?'Civilian safety staff collect accounts and check records.':'A visiting investigator supports the understaffed safety service.');}
  else if(c.stage==='investigating'&&c.steps>=3){
   if(c.type==='report'){c.stage='closed';c.status='closed';log(c,'Inventory records resolve the report: misplaced goods, no offence established. No detention.');}
   else {c.evidence=['independent witness account','matching inventory or damage record'];c.stage='hearing';log(c,'Two corroborating sources documented. Independent hearing scheduled; allegation alone is insufficient.');}
  }else if(c.stage==='hearing'&&c.steps>=5){
   if(c.evidence.length<2){c.status='closed';c.stage='not-established';log(c,'Evidence insufficient. Case closed without a finding.');}
   else if(c.harm<3&&c.consent){c.stage='repair';log(c,'Finding established. Both parties voluntarily accepted a supported restitution plan.');}
   else if(c.harm<3){c.stage='repair';log(c,'Finding established. Non-custodial restitution ordered; restorative meeting was not required.');}
   else {c.stage='custody';c.release=clock(s)+12;s.conditions.push({person:c.person,kind:'custody',until:c.release});log(c,'Independent review ordered time-limited custody for the serious harm. Care, family contact and return-to-work support continue.');}
  }else if(c.stage==='repair'&&c.steps>=9){c.stage='resolved';c.status='closed';log(c,'Loss repaired, affected resident supported, and the responsible resident resumes ordinary life.');}
  else if(c.stage==='custody'&&clock(s)>=c.release){c.stage='reintegration';log(c,'Custody ended. Housing and job access preserved; reintegration support begins.');}
  else if(c.stage==='reintegration'){c.stage='resolved';c.status='closed';log(c,'Follow-up completed. No permanent criminal label or exclusion from town life.');}
 }
 s.conditions=s.conditions.filter(c=>c.until>clock(s));
}
