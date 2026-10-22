import {domesticRecipe} from './domestic-scenes.js';
export const OUTBREAK_SCENES={
 zombies:{label:'Zombies',name:'Zombies',presets:{stragglers:'Three stragglers',horde:'Small horde'},purpose:'Hungry undead seek living targets, chase along connected paths and bite.',capabilities:{},uses:['zombies'],inputs:['living prey'],outputs:[],implemented:['perception','pursuit','melee combat']},
 wizard:{label:'Wizard’s Clearing',name:'Wizard’s Clearing',presets:{apprentice:'One wizard',circle:'Three wizards',fireproof:'Fireproof wizard'},purpose:'Wizards cast travelling fireballs. Impacts deal damage and ignite actors; casting consumes regenerating mana.',capabilities:{},uses:['wizards'],inputs:[],outputs:[],implemented:['perception','projectiles','splash damage','burning']},
 rabbits:{label:'Rabbit Grove',name:'Rabbit Grove',presets:{grove:'Eight rabbits',warren:'Sixteen rabbits',predator:'Two wolves',nocturnal:'Two nightborn wolves'},purpose:'Rabbits flee threats along reachable paths. Wolves hunt prey using the same senses, pursuit and damage rules.',capabilities:{},uses:['wildlife'],inputs:[],outputs:[],implemented:['perception','fleeing','predation']},
 brains:{label:'Brains',name:'Brains',presets:{camp:'Six unarmed people',scouts:'Three unarmed people',brooms:'Three old ladies with brooms',cautious:'Cautious broom scouts',guards:'Steadfast hardy elders'},purpose:'Living people flee threats. Armed people can stand and fight.',capabilities:{},uses:['people'],inputs:[],outputs:[],implemented:['perception','fleeing','melee combat']}
};
export function outbreakRecipe(type,preset,seed){
 if(!OUTBREAK_SCENES[type]?.presets[preset])throw Error('Unknown outbreak scene preset');
 const base=domesticRecipe(type==='brains'?'home':'woodland',type==='brains'?'courtyard':'reserve',seed);
 base.requirements=base.requirements.slice(0,type==='brains'?2:1).map(r=>({...r,items:r.items.filter(i=>!/^BA-00(83|88)$/.test(i.asset))}));
 return {...base,type,preset,generator:'outbreak-composer',version:1,agents:{archetype:type==='wizard'?'wizard':type==='rabbits'?(['predator','nocturnal'].includes(preset)?'wolf':'rabbit'):type==='zombies'?'zombie':['brooms','cautious','guards'].includes(preset)?'broom-elder':'person',count:type==='wizard'?(preset==='circle'?3:1):type==='rabbits'?(['predator','nocturnal'].includes(preset)?2:preset==='warren'?16:8):type==='zombies'?(preset==='horde'?8:3):(preset==='camp'?6:3),...(preset==='cautious'?{temperament:'cautious',variant:'scout'}:preset==='guards'?{temperament:'steadfast',variant:'hardy'}:preset==='nocturnal'?{variant:'nightborn'}:preset==='fireproof'?{variant:'fireproof'}:{})},landscape:{...base.landscape,vegetation:1},tiles:[{...base.tiles[0],type,id:type}]};
}
export {ACTOR_TYPES,ABILITIES as WEAPONS} from './actor-catalog.mjs';
