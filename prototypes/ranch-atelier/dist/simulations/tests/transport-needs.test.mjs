import {test} from 'node:test';import assert from 'node:assert/strict';
import {createCareState,advanceNeeds,reserveJob,collect,deliver,cancelJob} from '../ranch-life-state.mjs';
import {stepDelivery} from '../simulation/delivery-workflow.mjs';
import {avoidStep} from '../ranch-navigation.mjs';import {pickupAvailable} from '../ranch-advisors.mjs';import {resourceBalance} from '../simulation/resource-loop.mjs';
for(const distance of [25,75,125])for(const season of [{feed:1,water:1,grazing:1},{feed:1.3,water:.9,grazing:0}])test(`transport plus consumer recovery: ${distance}m, grazing ${season.grazing}`,()=>{
 const s=createCareState([{id:'p',species:'goat',count:3}]);s.season=season;const workers=Array.from({length:3},(_,i)=>({id:String(i),phase:'idle',position:{x:0,z:i*2},path:[],job:null,timer:0}));
 const animalPoints=s.pens[0].animals.map((a,i)=>({x:distance,z:4+i}));for(const a of s.pens[0].animals){a.hunger=.85;a.thirst=.9;}
 let recovered=false;for(let tick=0;tick<18000;tick++){const dt=.2;advanceNeeds(s,dt);for(const w of workers)stepDelivery(w,dt,{reserve:w=>reserveJob(s,w.id,r=>pickupAvailable(s,r)),cancel:j=>cancelJob(s,j),collect:j=>collect(s,j),deliver:j=>deliver(s,j),source:()=>({x:0,z:0}),destination:()=>({x:distance,z:0}),home:()=>({x:0,z:2}),route:(w,p,phase)=>{w.target=p;w.phase=phase;return true;},move:(w,dt)=>{const next=avoidStep(w.position,w.target,dt*1.6,.3,[]);const moved=Math.hypot(next.x-w.position.x,next.z-w.position.z);w.position=next;return {moved,arrived:Math.hypot(next.x-w.target.x,next.z-w.target.z)<.1};}});
 s.pens[0].animals.forEach((a,i)=>{const p=animalPoints[i],target={x:distance,z:a.intent==='water'?1:2};animalPoints[i]=avoidStep(p,target,dt*.65,.35,[]);a.atWater=a.intent==='water'&&Math.hypot(animalPoints[i].x-target.x,animalPoints[i].z-target.z)<.4;a.atFeed=a.intent==='feed'&&Math.hypot(animalPoints[i].x-target.x,animalPoints[i].z-target.z)<.4;});
 if(s.pens[0].animals.every(a=>a.thirst<.5&&a.hunger<.5))recovered=true;
 }
 assert.ok(recovered,'animals must recover through actual arrivals and deliveries');assert.ok(s.jobs>10);for(const r of ['feed','water'])assert.ok(Math.abs(resourceBalance(s,r))<1e-6);assert.ok(s.pens[0].animals.every(a=>a.thirst<.65&&a.hunger<.65));
});
