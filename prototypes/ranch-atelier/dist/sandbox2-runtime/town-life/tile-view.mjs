import {townRoute} from './layouts.mjs';
import * as T from '../vendor/three.module.js';
import {makePerson,animatePerson} from './people/models.mjs';
import {population} from './people/core.mjs';
import {routine} from './economy.mjs';
import {townSites,legacyTownSites} from './tile-state.mjs';
const views=new WeakMap();
export function attachTown(group,plan,preset,getState,heightAt=()=>0,scale=.1){
 const initial=getState(),modern=initial.layoutVersion===2,seed=initial.layoutSeed??41,stage=initial.growthStage??3;
 const root=new T.Group(),sites=modern?townSites(preset,seed,stage):legacyTownSites(preset),people=population(43,'alder'),actors=[],angle=(plan.rotation||0)*Math.PI/3;
 root.scale.setScalar(scale);root.rotation.y=angle;group.add(root);
 for(const h of getState().households)for(let member=0;member<h.adults+h.children;member++){
  const role=member>=h.adults?'student':({woodland:'farmer',craft:'mechanic',merchant:'grocer'}[h.jobs[member]]||h.jobs[member]);
  const person=structuredClone(people.find(p=>p.role===role)||people[0]);person.index=h.id*4+member;person.id=`${h.id}:${member}`;
  const model=makePerson(person);model.traverse(o=>{o.userData.sharedGeometry=true;if(o.material)o.material.userData.shared=true;});root.add(model);
  actors.push({household:h.id,member,person,model,position:new T.Vector2(...sites['home'+h.id]),path:[],target:null});
 }
 function update(dt){const state=getState();for(const a of actors){const act=routine(state,state.households[a.household],a.member),end=sites[act.place]||sites.market;if(a.target!==act.place){a.path=(modern?townRoute(preset,[a.position.x,a.position.y],end,seed,stage):[[0,a.position.y],[0,end[1]],end]).map(p=>new T.Vector2(...p));a.target=act.place;}
  let budget=dt*3,moved=0;while(budget>0&&a.path.length){const v=a.path[0].clone().sub(a.position),len=v.length();if(len<.001){a.path.shift();continue;}const amount=Math.min(len,budget);a.position.addScaledVector(v,amount/len);a.model.rotation.y=Math.atan2(v.x,v.y);budget-=amount;moved+=amount;if(amount===len)a.path.shift();}
  const x=a.position.x,z=a.position.y,wx=plan.center.x+x*Math.cos(angle)+z*Math.sin(angle),wz=plan.center.z-x*Math.sin(angle)+z*Math.cos(angle);
  animatePerson(a.model,act,moved,dt,false);a.model.position.set(x,heightAt(wx,wz)+.04+a.model.position.y,z);
 }}root.userData.townResidents=actors.length;update(0);views.set(group,{update});return root;
}
export function animateTown(group,dt){const view=views.get(group);if(view){view.update(dt);return true;}return false;}
