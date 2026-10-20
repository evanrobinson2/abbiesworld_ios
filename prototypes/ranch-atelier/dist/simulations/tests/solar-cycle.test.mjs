import test from 'node:test';
import assert from 'node:assert/strict';
import {solarCycle} from '../simulation/solar-cycle.mjs';
test('sun crosses east to west, with shorter noon shadows and no nighttime sunlight',()=>{
 const morning=solarCycle(8),noon=solarCycle(12),evening=solarCycle(16);
 assert.ok(morning.direction[0]>0&&evening.direction[0]<0);
 assert.ok(noon.altitude>morning.altitude&&noon.altitude>evening.altitude);
 assert.equal(solarCycle(0).direct,0);
 assert.ok(solarCycle(12,.25).altitude>solarCycle(12,.75).altitude);
});
test('sun motion is continuous at period boundaries and midnight',()=>{
 for(const h of [0,6,8,12,17,20,24]){const a=solarCycle(h-.0001),b=solarCycle(h+.0001);assert.ok(Math.hypot(...a.direction.map((v,i)=>v-b.direction[i]))<.001);}
});
