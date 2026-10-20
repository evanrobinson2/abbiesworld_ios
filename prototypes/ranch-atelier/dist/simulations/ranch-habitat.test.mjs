import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {habitat,restingPoint} from './ranch-habitat.mjs';
import {spaceRequirements,RANCH_MODELS} from './ranch-spaces.mjs';
import {setLabHexDiameter} from './tile-metrics.js';
import {planAssembly} from './tile-adapter.js';
import {ranchSiteCost} from './ranch-spaces.mjs';
const scales={'family-home-complete':2,'feed-store-complete':2,'water-point-complete':1,'cattle-shelter-complete':2,'goat-shelter-complete':1.5,'chicken-coop-complete':1};
const dimensions={};
for(const id of RANCH_MODELS){const data=JSON.parse(await readFile(new URL('../simulation-assets/buildings/'+id+'.json',import.meta.url)));const axis=i=>data.flatMap(p=>p.positions.filter((_,j)=>j%3===i));const x=axis(0),z=axis(2);dimensions[id]={w:(Math.max(...x)-Math.min(...x))*scales[id],d:(Math.max(...z)-Math.min(...z))*scales[id]};}
test('all supported livestock counts have resting slots inside their roof and enclosure',()=>{
 for(const [species,count,radius]of [['horse',4,.65],['goat',8,.35],['chicken',12,.16]])for(const size of [50,100,180]){
  const p=habitat(species,count,dimensions,size),s=p.shelter;
  for(let i=0;i<count;i++){const q=restingPoint(p,i,count,radius);assert.ok(Math.abs(q.x-s.x)+radius<s.w/2);assert.ok(Math.abs(q.z-s.z)+radius<s.d/2,JSON.stringify({species,s,q,radius}));assert.ok(Math.abs(q.x)+radius<p.w/2);assert.ok(Math.abs(q.z)+radius<p.d/2);}
 }
});
test('shelter metadata survives actual generator plans across 27 seed/profile/size combinations',()=>{
 for(const seed of [41,173,24741])for(const size of [50,100,180])for(const preset of ['homestead','working','pasture']){
  setLabHexDiameter(size);const types={homestead:['ranch'],working:['ranch','paddock','crop'],pasture:['ranch','paddock']}[preset];
  const requirements=spaceRequirements(dimensions,1,size,{horses:4,goats:8,chickens:12},preset);
  const board={tiles:types.map((type,i)=>({id:type,type,cell:i,rotation:0,seed:seed+i*43}))};
  const assembly=planAssembly(board,{dimensions,requirementsByType:requirements,siteCost:ranchSiteCost});
  for(const pen of assembly.plans.flatMap(p=>p.placements).filter(p=>p.species)){assert.ok(pen.shelter);assert.ok(pen.shelter.w<pen.w);assert.ok(pen.shelter.d<pen.d);}
  if(assembly.plans.flatMap(p=>p.placements).filter(p=>p.species).length<3)assert.ok(assembly.plans.some(p=>p.warnings.length));
 }
});
