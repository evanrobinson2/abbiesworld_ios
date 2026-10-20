// Opening-specific ability data; the shared simulation and all other definitions stay authoritative.
import {ABILITIES as shared,ACTOR_TYPES,SIMULATION_LIMITS} from '/actor-catalog.mjs?opening-base';
export {ACTOR_TYPES,SIMULATION_LIMITS};
export const ABILITIES=Object.freeze({...shared,bat:{label:'Baseball bat',kind:'melee',range:2.1,damage:10,cooldown:1.3,windup:.5,accuracy:1,stagger:.6,damageType:'physical'}});
