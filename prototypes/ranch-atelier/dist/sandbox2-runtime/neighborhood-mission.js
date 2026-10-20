/* Serializable delivery missions. Quantities and travel durations are game rules. */
(function(root){
  'use strict';
  const bundle=Object.freeze({foal:1,cow:1,chicken:3,goat:1,wheatSeedKg:10});
  const workSeconds=Object.freeze({foal:14400,cow:10800,chicken:3600,goat:3600,wheatSeedKg:7200});
  const copy=x=>structuredClone(x);
  function create(families,stock,{prepare=false}={}){
    if(!Array.isArray(families)||!families.length||families.length>24)throw Error('Choose 1–24 neighboring families.');
    const ids=new Set();
    const recipients=families.map(f=>{
      if(!f||typeof f.id!=='string'||!f.id||ids.has(f.id)||typeof f.name!=='string'||!f.name.trim()||f.name.length>80)throw Error('Each family needs a unique ID and a name.');
      ids.add(f.id);
      const travelSeconds=f.travelSeconds??3600;
      if(!Number.isInteger(travelSeconds)||travelSeconds<600||travelSeconds>10800)throw Error('Travel must be 10–180 minutes each way.');
      return {id:f.id,name:f.name.trim(),travelSeconds,status:prepare?'locked':'pending',received:Object.fromEntries(Object.keys(bundle).map(k=>[k,0])),deliveredAt:null};
    });
    const initial={};for(const k of Object.keys(bundle)){const v=stock?.[k]??0;if(!Number.isSafeInteger(v)||v<0||v>100000)throw Error('Invalid gift reserve: '+k);initial[k]=v;}
    return {version:1,id:'neighbor-welcome',bundle:{...bundle},initial,stock:{...initial},produced:Object.fromEntries(Object.keys(bundle).map(k=>[k,0])),prepare,preparing:null,recipients,active:null,events:[],blocked:null,provenance:prepare?'Quest work earns gift inventory at existing habitats and garden. Game labor rates; breeding, gestation and crop seasons are not modeled.':'Explicit scenario gift reserve; separate from resident animals. No breeding or seed production modeled.'};
  }
  function inspect(m){
    if(!m)return null;
    const delivered=m.recipients.filter(f=>f.deliveredAt!==null).length;
    const remaining=m.recipients.filter(f=>['pending','locked','ready'].includes(f.status)).length;
    return {id:m.id,delivered,total:m.recipients.length,complete:delivered===m.recipients.length&&!m.active,stock:copy(m.stock),bundle:copy(m.bundle),preparing:copy(m.preparing||null),shortfalls:Object.fromEntries(Object.entries(m.bundle).map(([k,v])=>[k,Math.max(0,remaining*v-m.stock[k])])),active:copy(m.active),families:copy(m.recipients),blocked:m.blocked,provenance:m.provenance,travelModel:'Off-site timed travel; neighboring farms and gift animals are not rendered.'};
  }
  function balance(m){return Object.fromEntries(Object.keys(m.bundle).map(k=>[k,m.initial[k]+(m.produced?.[k]||0)-m.stock[k]-m.recipients.reduce((n,f)=>n+f.received[k],0)-(m.active?.cargo?.[k]||0)]));}
  function available(s){return s.workers.workers.find(w=>!['marley','daddy'].includes(w.id)&&!w.task&&!w.cargo&&!w.edge&&!w.path.length&&!(s.horseActivities||[]).some(a=>a.actor===w.id));}
  function prepareGift(s,W,f,resource){
    const m=s.neighborhood,ws=s.workers,held=new Set();
    const species={foal:'horse',cow:'cow',chicken:'chicken',goat:'goat'}[resource];
    const link=species?s.links.find(l=>l.species===species&&l.admittedAt):null;
    if(species&&!link){m.blocked='Needs a settled '+species+' habitat';return held;}
    const job=ws.jobs.find(j=>j.id===(species?link?.job:'garden')&&j.status==='complete');
    if(!job){m.blocked=species?'Needs a settled '+species+' habitat':'Needs a completed garden';return held;}
    m.preparing??={familyId:f.id,resource,workDone:0,workRequired:workSeconds[resource],actorId:null};
    const p=m.preparing,w=p.actorId?ws.workers.find(w=>w.id===p.actorId):available(s);
    if(!w){m.blocked='Waiting for a family member to prepare gifts';return held;}
    if(!p.actorId){const route=W.route(ws,w.at,job.at);if(route===null){m.blocked='No route to the gift preparation site';return held;}w.path=route;p.actorId=w.id;}
    held.add(w.id);w.offsite=false;w.motion=[];w.activity='preparing-gift-'+resource;
    const left=W.travel(ws,w,ws.config.tickSeconds);
    if(!w.edge&&!w.path.length)p.workDone+=Math.max(0,left??ws.config.tickSeconds);
    if(p.workDone>=p.workRequired){
      const quantity=m.bundle[resource];m.stock[resource]+=quantity;m.produced[resource]+=quantity;
      m.events.push({type:'gift-prepared',time:s.seconds+ws.config.tickSeconds,familyId:f.id,actorId:w.id,resource,quantity,workSeconds:p.workRequired});
      m.preparing=null;w.activity='gift-preparation-complete';
      if(Object.keys(m.bundle).every(k=>m.stock[k]>=m.bundle[k])){f.status='ready';m.events.push({type:'family-unlocked',familyId:f.id,time:s.seconds+ws.config.tickSeconds});}
    }
    return held;
  }
  function tick(s,W){
    const m=s.neighborhood;if(!m)return new Set();
    const held=new Set(),ws=s.workers,dt=ws.config.tickSeconds;
    m.blocked=null;
    if(!m.active){
      const f=m.recipients.find(f=>['pending','locked','ready'].includes(f.status));if(!f)return held;
      if(ws.jobs.some(j=>j.status!=='complete')||s.planner?.adoptions.length||s.links.some(l=>!l.admittedAt)){m.blocked='Finish the ranch and settle its animals';return held;}
      const hour=s.seconds%86400/3600,missing=Object.keys(m.bundle).filter(k=>m.stock[k]<m.bundle[k]);
      if(hour<8||hour>=14){if(m.preparing)m.preparing.actorId=null;m.blocked='Family work resumes at 08:00';return held;}
      if(ws.careJobs.some(j=>j.enabled&&j.target-j.delivered-j.reserved>.05)){if(m.preparing)m.preparing.actorId=null;m.blocked='Animal care takes priority';return held;}
      if(missing.length){if(m.prepare)return prepareGift(s,W,f,m.preparing?.resource||missing[0]);m.blocked='Gift reserve needs '+missing.join(', ');return held;}
      if(hour>=12){m.blocked='Gifts ready; visits depart before 12:00';return held;}
      const w=available(s);
      if(!w){m.blocked='Waiting for an available visitor';return held;}
      const route=W.route(ws,w.at,ws.depot);if(route===null){m.blocked='No route to the gift depot';return held;}
      for(const k of Object.keys(m.bundle))m.stock[k]-=m.bundle[k];
      w.path=route;f.status='packing';m.active={familyId:f.id,actorId:w.id,phase:'collect',elapsed:0,cargo:{...m.bundle},startedAt:s.seconds};
      m.events.push({type:'visit-assigned',time:s.seconds,familyId:f.id,actorId:w.id});
    }
    const a=m.active,f=m.recipients.find(f=>f.id===a.familyId),w=ws.workers.find(w=>w.id===a.actorId);
    if(!w)throw Error('Assigned neighborhood visitor is missing');
    held.add(w.id);w.motion=[];w.offsite=['outbound','visit','return'].includes(a.phase);
    if(a.phase==='collect'){
      w.activity='collecting-neighbor-gifts';W.travel(ws,w,dt);
      if(!w.edge&&!w.path.length){a.phase='packing';a.elapsed=0;}
    }else{
      w.activity={packing:'packing-neighbor-gifts',outbound:'traveling-to-neighbor',visit:'giving-neighbor-gifts',return:'returning-from-neighbor'}[a.phase];
      a.elapsed+=dt;
      const duration={packing:600,outbound:f.travelSeconds,visit:900,return:f.travelSeconds}[a.phase];
      if(a.elapsed>=duration){
        a.elapsed=0;
        if(a.phase==='packing'){a.phase='outbound';f.status='traveling';}
        else if(a.phase==='outbound'){a.phase='visit';f.status='visiting';}
        else if(a.phase==='visit'){
          f.received={...a.cargo};a.cargo={};f.deliveredAt=s.seconds+dt;f.status='delivered';a.phase='return';
          m.events.push({type:'gifts-delivered',time:s.seconds+dt,familyId:f.id,actorId:w.id,items:{...f.received}});
        }else{w.offsite=false;w.activity='returned-from-neighbor';w.restUntil=s.seconds+dt;m.events.push({type:'visitor-returned',time:s.seconds+dt,familyId:f.id,actorId:w.id});m.active=null;}
      }
    }
    return held;
  }
  root.NeighborhoodMission={bundle,create,inspect,balance,tick};
  if(typeof module!=='undefined')module.exports=root.NeighborhoodMission;
})(globalThis);
