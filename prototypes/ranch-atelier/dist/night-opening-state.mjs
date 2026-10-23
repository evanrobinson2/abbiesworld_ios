export const OPENING=Object.freeze({version:1,seed:41,heroLevel:10,zombieLevel:0,heroHp:100,zombieHp:4,reward:1});
export function makeOpening(syncEncounter,center){
 const nodes={},adj={};for(let i=0;i<9;i++){const id='opening#'+i;nodes[id]={x:center.x-4+i,y:0,z:center.z};adj[id]=[];}
 for(let i=0;i<8;i++){adj['opening#'+i].push({id:'opening#'+(i+1),cost:1});adj['opening#'+(i+1)].push({id:'opening#'+i,cost:1});}
 const graph={nodes,adj,hubs:{},signature:'night-opening-v1:'+JSON.stringify(center),obstacles:[],heightAt:()=>0};
 const board={id:'night-opening-v1',instances:[{instanceId:'opening',cardId:'hero',cardRevision:1}],cards:{'hero@1':{id:'hero',revision:1,recipe:{seed:41,agents:{archetype:'person',count:1}}}}};
 let world=syncEncounter({version:1,id:board.id,seconds:0,entities:{'place/opening':{id:'place/opening',kind:'place',active:true,parentId:null,affinities:{}}},groups:{},agents:{},inventories:{}},board,graph);
 const hero=Object.values(world.actors)[0];Object.assign(hero,{name:'You',level:10,position:{x:center.x-2,y:0,z:center.z},hp:100,maxHp:100,weapon:'bat',speed:2.2,fleeAt:0,decisionAt:0});
 const zombie={...structuredClone(hero),id:'actor/opening/zombie',name:'Lone zombie',level:0,archetype:'zombie',team:'undead',tags:['undead'],diet:['living'],position:{x:center.x+2,y:0,z:center.z},hp:4,maxHp:4,weapon:'bite',speed:.35,attackReady:0,radius:.45};
 world.actors[zombie.id]=zombie;world.entities[zombie.id]={...structuredClone(world.entities[hero.id]),id:zombie.id,name:zombie.name};
 return {world,graph,heroId:hero.id,zombieId:zombie.id,phase:'ready',reward:0,arrival:0};
}
export function stepOpening(state,advanceEncounter,dt=.25){
 if(state.phase!=='combat')return state;
 const world=advanceEncounter(state.world,state.graph,dt),won=world.actors[state.zombieId].hp<=0;
 return {...state,world,phase:won?'arrival':'combat',reward:won?OPENING.reward:state.reward,arrival:0};
}
