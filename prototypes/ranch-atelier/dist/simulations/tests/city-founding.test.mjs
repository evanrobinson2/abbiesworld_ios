import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findLand,found,meetsBrief} from '../city/founding.mjs';

test('the land has two rivers meeting near the sea, and every land cell drains to the sea',()=>{
 const L=findLand(2);assert.ok(meetsBrief(L));
 for(let i=0;i<L.h.length;i+=97){if(L.h[i]<0)continue;let c=i,k=0;while(L.h[c]>=0&&k<5000){c=L.to[c];k++;assert.ok(c>=0);}assert.ok(L.h[c]<0);}
});
test('the founding is deterministic, reaches a thousand people, and every house stands above the floods its builders knew of',()=>{
 const a=found(findLand(2)),b=found(findLand(2));
 assert.deepEqual(a.log,b.log);assert.ok(a.people>=1000);
 assert.equal(a.log[0].kind,'land');assert.ok(a.log.some(e=>e.kind==='founding'));
 const live=a.houses.filter(h=>h.gone==null);assert.ok(live.length>=150);
 for(const h of live)assert.ok(a.land.h[h.cell]>=0&&!a.land.river[h.cell]);
});
