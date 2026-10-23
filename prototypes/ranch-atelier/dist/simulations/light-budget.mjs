import * as T from './vendor/three.module.js';
// three.js bakes the number of point lights into every lit material's shader. Each placed tile brought up to four
// lamp lights, so every placement changed that number and recompiled hundreds of programs. The scene now always
// holds exactly `budget` visible point lights: the first ones found are real, extra lamps are switched off (their
// glowing bulbs and ground pools are separate and stay), and dark stand-ins fill any gap. One program set, forever.
export function createLightBudget(scene,budget=8){
 const fillers=Array.from({length:budget},()=>{const light=new T.PointLight('#000000',0,1,2);light.userData.lightBudgetFiller=true;light.visible=false;return light;});
 const holder=new T.Group();holder.name='light-budget';scene.add(holder);holder.add(...fillers);
 let key='';
 function apply(force=false){
  const next=scene.children.map(o=>o.id+(o.visible?'':'x')).join();if(!force&&next===key)return false;
  // Give back any light a previous pass switched off, then choose again.
  scene.traverse(o=>{if(o.userData?.lightBudgetOff){o.userData.lightBudgetOff=false;o.visible=true;}});
  let real=0;scene.traverseVisible(o=>{if(o.isPointLight&&!o.userData.lightBudgetFiller){if(real<budget)real++;else{o.visible=false;o.userData.lightBudgetOff=true;}}});
  fillers.forEach((light,i)=>{light.visible=i<budget-real;});
  key=scene.children.map(o=>o.id+(o.visible?'':'x')).join();return true;
 }
 return {apply};
}
