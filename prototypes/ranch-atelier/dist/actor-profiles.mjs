import {forkEncounter} from './world-snapshot.mjs';
import {applyActorConditions} from './world-conditions.mjs';
export const TEMPERAMENTS=Object.freeze({natural:{label:'Natural'},cautious:{label:'Cautious',fleeAt:.7},steadfast:{label:'Steadfast',fleeAt:.05},fearless:{label:'Fearless',fleeAt:0}});
export const ACTOR_VARIANTS=Object.freeze({standard:{label:'Standard'},scout:{label:'Scout',speed:1.25,sense:1.2,health:.8},hardy:{label:'Hardy',speed:.9,health:1.5,coldResistance:1},nightborn:{label:'Nightborn',nightVision:1},fireproof:{label:'Fireproof',resistances:{fire:1}}});
export function captureBaseStats(actor){return actor.baseStats??={speed:actor.speed,sense:actor.sense,fleeAt:actor.fleeAt,maxHp:actor.maxHp,resistances:{...actor.resistances}};}
export function configureActor(actor,{temperament='natural',variant='standard'}={},conditions){
 if(!TEMPERAMENTS[temperament]||!ACTOR_VARIANTS[variant])throw Error('Unknown temperament or variant');
 const base=captureBaseStats(actor),form=ACTOR_VARIANTS[variant],fraction=actor.maxHp?actor.hp/actor.maxHp:0;
 actor.temperament=temperament;actor.variant=variant;actor.maxHp=base.maxHp*(form.health||1);actor.hp=Math.min(actor.maxHp,Math.round(actor.maxHp*fraction*10000)/10000);
 actor.fleeAt=TEMPERAMENTS[temperament].fleeAt??base.fleeAt;actor.resistances={...base.resistances,...form.resistances};
 actor.conditionTraits={nightVision:form.nightVision??(actor.archetype==='wolf'?.85:actor.archetype==='zombie'?.65:0),coldResistance:form.coldResistance??(actor.tags.includes('undead')?1:actor.tags.includes('animal')?.8:0)};
 actor.speed=base.speed*(form.speed||1);actor.sense=base.sense*(form.sense||1);
 actor.profileStats={speed:actor.speed,sense:actor.sense};applyActorConditions(actor,conditions);
 actor.decisionAt=0;actor.windup=null;actor.route=null;actor.pathJob=null;actor.targetId=null;
 return actor;
}
export function setActorProfile(world,entityId,settings){
 const entity=world.entities[entityId];if(!entity?.active)throw Error('Choose an active actor or its scene');
 const ids=Object.values(world.actors||{}).filter(a=>world.entities[a.id]?.active&&(a.id===entityId||(entity.kind==='place'&&a.instanceId===entity.instanceId))).map(a=>a.id);
 if(!ids.length)throw Error('Choose an actor or a scene containing actors');
 const w=forkEncounter(world);for(const id of ids)configureActor(w.actors[id],settings,w.conditions);
 w.encounter.events.unshift({at:w.encounter.time,text:ids.length+' actors: '+TEMPERAMENTS[settings.temperament].label+', '+ACTOR_VARIANTS[settings.variant].label});w.encounter.events=w.encounter.events.slice(0,25);return w;
}
