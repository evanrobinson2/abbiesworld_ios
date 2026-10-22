import {ensureOrganism,advanceOrganism,ANIMAL_TRAITS} from './ranch-story-adapter.mjs';
import {inheritTraits} from './simulation/life-traits.mjs';
import {hash} from './town-life/people/core.mjs';
export const LIFE_YEARS={horse:28,cow:20,goat:14,chicken:8};
export function renewAnimal(a,year,world){const span=LIFE_YEARS[a.species]||15;if(a.birthYear==null){a.birthYear=year-span*(.2+hash(a.id)%50/100);a.generation=1;}
 // Story invariant: a protected animal is never succeeded; it stays the same individual, at its oldest.
 if(a.storyProtected&&year-a.birthYear>=span*.95)a.birthYear=year-span*.95;if(world){const slot='animal:'+a.id;ensureOrganism(world,{slot,type:a.species,label:a.species,born:a.birthYear,traits:inheritTraits(ANIMAL_TRAITS,[],slot),capabilities:['needs','movement','kinship']});const e=advanceOrganism(world,slot,{year,span,type:a.species,label:a.species,originKind:'birth-known-parent',biological:true,traitSchema:ANIMAL_TRAITS});if(a.storyId&&a.storyId!==e.id){a.hunger=.2;a.thirst=.2;}a.storyId=e.id;a.traits=e.traits;a.birthYear=e.lifecycle.born;a.generation=e.generation;}else while(year-a.birthYear>=span){a.birthYear+=span;a.generation++;a.hunger=.2;a.thirst=.2;}a.age=Math.max(0,year-a.birthYear);return .5+.5*Math.min(1,a.age/(a.species==='chicken'?.5:2));}
export function plantCycle(year,seed){const age=((year+seed)%1+1)%1;return {age,stage:age<.15?'seedling':age<.5?'flowering':age<.8?'seeding':'renewing',scale:age<.15?.2+age*4:age<.8?1:.3};}
export function patchState(p,dt,grazers,rain){p.cover=Math.max(.12,Math.min(1,p.cover+dt*(rain?.002:.001)-grazers*dt*.0008));return p;}
