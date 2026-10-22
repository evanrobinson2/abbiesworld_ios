// Shared, deterministic game definitions. Generators select these; no species-pair scripts.
export const ABILITIES=Object.freeze({
 bite:{label:'Bite',kind:'melee',consumes:true,approachRange:.6,range:1.35,damage:1,cooldown:1.7,windup:.35,accuracy:.85,stagger:0,damageType:'physical'},
 broom:{label:'Broom',kind:'melee',range:2.1,damage:1,cooldown:1.3,windup:.3,accuracy:.9,stagger:.45,damageType:'physical'},
 spear:{label:'Spear',kind:'melee',range:2.7,damage:2,cooldown:1.5,windup:.4,accuracy:.9,stagger:.3,damageType:'physical'},
 claw:{label:'Claw',kind:'melee',consumes:true,range:1.1,approachRange:.65,damage:1.5,cooldown:1.2,windup:.25,accuracy:.9,stagger:0,damageType:'physical'},
 fireball:{label:'Fireball',kind:'projectile',range:32,damage:2.5,cooldown:2.5,windup:.75,accuracy:1,stagger:0,damageType:'fire',cost:2,projectile:{speed:24,radius:.25,lifetime:2,splash:3.5},burn:{duration:4,dps:.75}}
});
export const ACTOR_TYPES=Object.freeze({
 zombie:{name:'Zombie',team:'undead',tags:['undead'],diet:['living'],speed:1.8,hp:4,sense:130,fleeAt:0,weapon:'bite',color:'#74864b',radius:.45,body:'person'},
 person:{name:'Person',team:'living',tags:['living','human'],diet:[],speed:1.45,hp:5,sense:85,fleeAt:.3,weapon:null,color:'#6991a0',radius:.4,body:'person'},
 'broom-elder':{name:'Broom lady',team:'living',tags:['living','human'],diet:[],speed:1.3,hp:5,sense:85,fleeAt:.2,weapon:'broom',color:'#9a7492',radius:.4,body:'person'},
 wizard:{name:'Wizard',team:'living',tags:['living','human'],diet:[],speed:1.6,hp:12,sense:70,fleeAt:.2,weapon:'fireball',abilities:['fireball'],mana:8,maxMana:8,manaRegen:.6,resistances:{fire:.35},color:'#6855a1',radius:.45,body:'wizard'},
 rabbit:{name:'Rabbit',team:'wildlife',tags:['living','prey','animal'],diet:[],speed:3.8,hp:3,sense:45,fleeAt:1,weapon:null,color:'#d1b99b',radius:.28,body:'rabbit'},
 wolf:{name:'Wolf',team:'wildlife',tags:['living','predator','animal'],diet:['prey'],speed:4.6,hp:7,sense:65,fleeAt:.12,weapon:'claw',color:'#686c70',radius:.45,body:'wolf'}
});
export const SIMULATION_LIMITS=Object.freeze({actors:512,decisionsPerTick:96,pathExpansionsPerTick:2048,pathSlice:64,perceptionCandidates:96,projectiles:128,detailActors:64});
