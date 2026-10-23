import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFixedClock,createDecisionSchedule,createOccupancy,createStatefulRandom,agendaWindow} from '../simulation/runtime-scheduling.mjs';
import {random} from '../tile-board.js';
import {schedule} from '../ranch-rhythm.mjs';
import {population} from '../town-life/people/core.mjs';
import {createCareState,advanceNeeds,reserveJob,collect,deliver,cancelJob} from '../ranch-life-state.mjs';
import {resourceBalance} from '../simulation/resource-loop.mjs';

test('30, 60 and 144 Hz render sequences produce identical simulation steps',()=>{
 const results=[30,60,144].map(hz=>{const c=createFixedClock();let sum=0;for(let i=0;i<hz*10;i++)c.advance(1/hz,dt=>sum+=dt);return {ticks:c.report().ticks,sum};});assert.deepEqual(results,[results[0],results[0],results[0]]);assert.equal(results[0].ticks,200);
});
test('stall retains backlog, bounds work, and resumes serialized pending time',()=>{
 const c=createFixedClock({maxSteps:2});let count=0;assert.equal(c.advance(1,()=>count++),2);assert.ok(c.report().pendingSeconds>.89);
 const restored=createFixedClock({maxSteps:2});restored.restore(JSON.parse(JSON.stringify(c.snapshot())));assert.deepEqual(restored.snapshot(),c.snapshot());
 while(restored.report().backlogged)restored.advance(0,()=>count++);assert.equal(count,20);assert.ok(restored.report().pendingSeconds<1e-9);
});
test('failed tick is retained and invalid time is rejected',()=>{const c=createFixedClock();assert.throws(()=>c.advance(.1,()=>{throw Error('failed');}));assert.equal(c.report().ticks,0);assert.equal(c.report().pendingSeconds,.1);for(const value of [-1,NaN,Infinity])assert.throws(()=>c.advance(value,()=>{}));});
test('decisions wake on deadline or changed dependency, and survive save',()=>{const d=createDecisionSchedule();let n=0;const call=(t,key='clear')=>d.read('actor',key,t,1,()=>++n);assert.equal(call(0),1);assert.equal(call(0),1);assert.equal(call(.01,'rain'),2);assert.equal(call(2,'rain'),3);const copy=createDecisionSchedule();copy.restore(JSON.parse(JSON.stringify(d.snapshot())));assert.equal(copy.read('actor','rain',2,1,()=>99),3);d.forget('actor');assert.equal(call(2,'rain'),4);});
test('place capacity claims exclude self and release on movement or interruption',()=>{const o=createOccupancy();for(let i=0;i<5;i++){if(o.count('shop')<3)o.set('p'+i,'shop');}assert.equal(o.count('shop'),3);assert.equal(o.count('shop','p0'),2);o.set('p0',null);o.set('p3','shop');assert.equal(o.count('shop'),3);o.set('p1','home');assert.equal(o.count('shop'),2);assert.equal(o.count('home'),1);});
test('serializable RNG matches old stream and resumes exactly',()=>{const a=createStatefulRandom(214),b=random(214);for(let i=0;i<1000;i++)assert.equal(a(),b());const snapshot=a.snapshot(),expected=Array.from({length:100},a);a.restore(snapshot);assert.deepEqual(Array.from({length:100},a),expected);});
test('agenda windows cover all existing schedule transitions',()=>{for(const day of [1,6,7])for(const weather of ['clear','rain','heat','snow'])for(const p of population(214,'alder').slice(0,12).map((p,i)=>({...p,alive:true,age:[4,12,35,70][i%4],occupation:i%2?'town':'ranch'}))){const windows=new Map();for(let minute=0;minute<1440;minute++){const hour=minute/60,key=agendaWindow(hour),value=schedule(p,{day,hour},weather);if(windows.has(key))assert.deepEqual(value,windows.get(key));else windows.set(key,value);}}});
test('fixed steps preserve finite shared resources through shortage, delivery and cancellation',()=>{const s=createCareState([{id:'pen',species:'cow',count:50}]);s.baseline=false;for(const a of s.pens[0].animals){a.atWater=a.atFeed=true;}const c=createFixedClock();for(let i=0;i<900;i++){c.advance(1/30,dt=>{advanceNeeds(s,dt*6);if(i%30===0){const job=reserveJob(s,'worker');if(job){collect(s,job);i%60===0?deliver(s,job):cancelJob(s,job);}}});for(const r of ['feed','water']){assert.ok(Math.abs(resourceBalance(s,r))<1e-8);assert.ok(s.stock[r]>=0&&s.pens[0][r]>=0);}}assert.ok(s.used.water>0);});
