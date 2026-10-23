import {forkEncounter} from './world-snapshot.mjs';
export const WORLD_CONDITIONS=Object.freeze({season:['spring','summer','autumn','winter'],timeOfDay:['dawn','day','dusk','night'],weather:['clear','rain','fog']});
export const DEFAULT_CONDITIONS=Object.freeze({season:'spring',timeOfDay:'day',weather:'clear'});
export const CONDITION_PRESETS=Object.freeze({clear:{label:'Spring daylight',...DEFAULT_CONDITIONS},night:{label:'Foggy night',season:'autumn',timeOfDay:'night',weather:'fog'},winter:{label:'Winter dawn',season:'winter',timeOfDay:'dawn',weather:'clear'},rain:{label:'Summer rain',season:'summer',timeOfDay:'day',weather:'rain'}});
export function conditionsOf(world){return {...DEFAULT_CONDITIONS,...world.conditions};}
export function conditionLabel(world){const c=conditionsOf(world);return c.season+' · '+c.timeOfDay+' · '+c.weather;}
// Applied at a condition/profile edit or spawn, never as another per-tick weather loop.
export function applyActorConditions(actor,conditions){
 if(!conditions)return actor;
 const c={...DEFAULT_CONDITIONS,...conditions};
 actor.baseStats??={speed:actor.speed,sense:actor.sense,fleeAt:actor.fleeAt,maxHp:actor.maxHp,resistances:{...actor.resistances}};
 const base=actor.profileStats||actor.baseStats,undead=actor.tags.includes('undead'),animal=actor.tags.includes('animal'),traits=actor.conditionTraits||{},nightVision=traits.nightVision??(actor.archetype==='wolf'?.85:undead?.65:0),coldResistance=traits.coldResistance??(undead?1:animal?.8:0);
 const light={dawn:.8,day:1,dusk:.65,night:.4}[c.timeOfDay],visibility={clear:1,rain:.8,fog:.45}[c.weather],cold={spring:0,summer:0,autumn:.05,winter:.25}[c.season],heat=c.season==='summer'&&animal&&!undead?.1:0;
 actor.sense=base.sense*(light+(1-light)*nightVision)*visibility;actor.speed=base.speed*(1-cold*(1-coldResistance)-heat);
 return actor;
}
export function setWorldConditions(world,changes){
 if(!changes||Object.keys(changes).some(k=>!WORLD_CONDITIONS[k]||!WORLD_CONDITIONS[k].includes(changes[k])))throw Error('Choose a supported season, time of day and weather');
 const w=forkEncounter(world);w.conditions={...conditionsOf(world),...changes};
 for(const actor of Object.values(w.actors||{})){applyActorConditions(actor,w.conditions);actor.decisionAt=0;actor.windup=null;actor.route=null;actor.pathJob=null;actor.targetId=null;}
 w.encounter.events.unshift({at:w.encounter.time,text:'World conditions: '+conditionLabel(w)});w.encounter.events=w.encounter.events.slice(0,25);return w;
}
