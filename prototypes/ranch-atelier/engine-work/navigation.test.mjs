import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {createCompiledNavigation} from '../dist/simulations/simulation/compiled/navigation.mjs';
import {avoidStepWithPeers,nearbyPeers,clearSegment} from '../dist/simulations/ranch-navigation.mjs';
const wasm=await createCompiledNavigation(await fs.readFile(new URL('../dist/simulations/simulation/compiled/navigation.wasm',import.meta.url)));
let seed=214;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
test('compiled navigation matches JavaScript decisions across 20000 crowded and boundary cases',()=>{
 let maxError=0;for(let i=0;i<20000;i++){
  const p={w:8+random()*20,d:8+random()*20},r=.16+random()*.54,bounds=(q,r)=>Math.abs(q.x)<p.w/2-r-.2&&Math.abs(q.z)<p.d/2-r-.2;
  const pos={x:(random()-.5)*(p.w-2),z:(random()-.5)*(p.d-2)},target={x:(random()-.5)*p.w,z:(random()-.5)*p.d},step=.01+random()*.8;
  const obs=Array.from({length:5},()=>({x:(random()-.5)*p.w,z:(random()-.5)*p.d,w:.2+random()*2,d:.2+random()*2,angle:random()*Math.PI}));
  const peers=nearbyPeers(pos,step,r,Array.from({length:30},()=>({x:(random()-.5)*p.w,z:(random()-.5)*p.d,radius:.16+random()*.54})));
  const a=avoidStepWithPeers(pos,target,step,r,obs,peers,bounds),b=wasm.step(pos,target,step,r,obs,peers,p)??a,error=Math.hypot(a.x-b.x,a.z-b.z);maxError=Math.max(maxError,error);assert.ok(error<1e-9,JSON.stringify({i,a,b,error}));
  if(Math.hypot(b.x-pos.x,b.z-pos.z)>1e-9)assert.ok(clearSegment(pos,b,r,[...obs,...peers],bounds));
 }console.log('maximum position error',maxError);
});

const boundary=JSON.parse(await fs.readFile(new URL("./navigation-boundary.json",import.meta.url)));
test("near-integral sweep subdivision defers to JS instead of changing the collision decision",()=>{assert.equal(wasm.step(...boundary.args),null);assert(wasm.calls>0);});
