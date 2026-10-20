import test from 'node:test';
import assert from 'node:assert/strict';
import {seasonalState,advanceSeason} from '../ranch-seasons-state.mjs';
import {createCareState,advanceNeeds} from '../ranch-life-state.mjs';
test('year wraps and transitions remain continuous',()=>{
 assert.equal(advanceSeason(.9,48,8),0);
 for(let n=0;n<4;n++){const a=seasonalState((n+1)/4-1e-7),b=seasonalState((n+1)/4);for(const k of ['grazing','water','feed','snow','leaf'])assert.ok(Math.abs(a[k]-b[k])<1e-5);}
 assert.equal(advanceSeason(.4,0,8),.4);
});
test('winter removes pasture intake and increases reliance on feed',()=>{
 const make=p=>{const s=createCareState([{id:'pen',species:'goat',count:1}]);s.season=seasonalState(p);Object.assign(s.pens[0].animals[0],{hunger:.2,thirst:.2});return s;};
 const summer=make(.25),winter=make(.75);
 for(let i=0;i<200;i++){advanceNeeds(summer,.1);advanceNeeds(winter,.1);}
 assert.equal(winter.foraged,0);assert.ok(summer.foraged>0);assert.ok(winter.pens[0].animals[0].hunger>summer.pens[0].animals[0].hunger);
});
test('summer increases water demand with identical animals',()=>{
 const make=p=>{const s=createCareState([{id:'pen',species:'cow',count:1}]);s.season=seasonalState(p);return s;};const spring=make(0),summer=make(.25);advanceNeeds(spring,10);advanceNeeds(summer,10);assert.ok(summer.pens[0].animals[0].thirst>spring.pens[0].animals[0].thirst);
});
