import test from 'node:test';
import assert from 'node:assert/strict';
import {WEATHER,weatherFor,easeWeather,wetWeather} from '../simulation/weather-state.mjs';
import {schedule} from '../ranch-rhythm.mjs';
test('weather is seeded, seasonal, valid and changes in bounded six-hour fronts',()=>{
 const seen=new Set();for(let day=1;day<100;day++)for(let season=0;season<4;season++)for(let hour=0;hour<24;hour+=6){const w=weatherFor(day,season,hour,41);assert.ok(WEATHER[w]);assert.equal(w,weatherFor(day,season,hour+5.9,41));seen.add(w);if(season===3)assert.notEqual(w,'heat');}
 for(const w of Object.keys(WEATHER))assert.ok(seen.has(w));
});
test('transition remains bounded and does not jump after a long hidden frame',()=>{
 assert.equal(easeWeather(.2,1,0),.2);assert.equal(easeWeather(.2,1,300),easeWeather(.2,1,.05));
 let v=0;for(let i=0;i<1000;i++){v=easeWeather(v,1,1/60);assert.ok(v>=0&&v<=1);}assert.ok(v>.99);
});
test('hail and rain send a child indoors; precipitation types preserve liquid collection meaning',()=>{
 for(const weather of ['hail','rain'])assert.ok(schedule({id:'child',age:10,alive:true},{day:6,hour:14},weather).indoors);
 assert.ok(wetWeather('hail'));assert.ok(!wetWeather('snow'));
});
