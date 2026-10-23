import {wetWeather,stormNear} from './weather-state.mjs';
import {ensureOrganism,advanceOrganism,PLANT_TRAITS,recordActivity} from '../ranch-story-adapter.mjs';
import {inheritTraits} from './life-traits.mjs';
import {hash} from '../town-life/people/core.mjs';
import {plantCycle,patchState} from '../ranch-ecology-state.mjs?v=2';
export function createEcologyCore(places,seed){
 const patches=places.filter(p=>p.species).map(p=>({id:p.id,cover:1})),anchors=places.filter(p=>p.role==='field'),blooms=[];
 for(const anchor of anchors)for(let i=0;i<8;i++)blooms.push({slot:'plant:'+anchor.plan.id+':'+anchor.id+':'+i,seed:hash(seed+anchor.id+i)%100/100});
 let pollinatorsVisible=false;
 return {patches,blooms,get pollinatorsVisible(){return pollinatorsVisible;},step(dt,state){
  const year=state.calendar?.year??0;
  for(const b of blooms){ensureOrganism(state.lifeStories,{slot:b.slot,type:'meadow-flower',label:'Meadow flower',born:year-((year+b.seed)%1),traits:inheritTraits(PLANT_TRAITS,[],b.slot),capabilities:['seed-propagation','flowering'],detail:'lineage'});const individual=advanceOrganism(state.lifeStories,b.slot,{year,span:1,type:'meadow-flower',label:'Meadow flower',originKind:'seed',biological:true,traitSchema:PLANT_TRAITS});const life=plantCycle(year-individual.lifecycle.born,0);recordActivity(state.lifeStories,individual.id,life.stage,year);b.individual=individual;b.stage=life.stage;b.scale=life.scale*individual.traits.bloom;b.visible=state.season?.index!==3&&life.stage!=='renewing';}
  for(const patch of patches){const organism=ensureOrganism(state.lifeStories,{slot:'pasture:'+patch.id,type:'pasture-colony',label:'Perennial pasture colony',born:year,capabilities:['regrowth'],detail:'lineage'});organism.consequences.cover=patch.cover;recordActivity(state.lifeStories,organism.id,patch.cover<.4?'recovering':'growing',year);const pen=state.pens.find(p=>p.id===patch.id);patchState(patch,dt,pen?.animals.filter(a=>a.activity==='Grazing').length||0,wetWeather(state.weather));}
  pollinatorsVisible=state.season?.index!==3&&!wetWeather(state.weather)&&!stormNear(state.weatherFront)&&(state.calendar?.hour??12)>6&&(state.calendar?.hour??12)<19;
  if(wetWeather(state.weather)){const q=Math.min(Math.max(0,state.resources.water.stockCapacity-state.stock.water),dt*.15);state.stock.water+=q;state.replenished.water+=q;}
  state.ecology={flowering:blooms.filter(b=>b.visible).length,patches:patches.length,cover:patches.length?patches.reduce((n,p)=>n+p.cover,0)/patches.length:1,pollinators:pollinatorsVisible?Math.min(12,anchors.length*4):0};
 },snapshot:()=>patches.map(p=>({id:p.id,cover:p.cover})),restore(saved){for(const p of patches){const q=saved?.find(q=>q.id===p.id);if(q)p.cover=q.cover;}}};
}
