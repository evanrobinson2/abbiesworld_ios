import * as T from 'three';
import {METEORITE_SITE} from './moon-terrain.mjs';
// MB4 (AW-STUDY-0007): the mysterious meteorite, 60% buried in its fresh crater by the geology field. It is in the
// world layer: residents and the survey buggy can see it, and its pulse lights the crater walls (diegetic).
// Cyan #00ffd1 belongs to it and the Star Child only. States: buried, glowing, opening, open.
const PULSE_SECONDS=2,OPEN_SECONDS=6;
export function createMeteorite(model,plan,root){
 const group=new T.Group(),body=model('MR-004'),site=METEORITE_SITE,ground=plan.heightAt(site.x,site.z);
 group.position.set(site.x,ground+.28*.2,site.z);group.add(body);root.add(group);
 const glow=[];body.traverse(o=>{if(!o.isMesh)return;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(m=>{if(!/MeteorCore|MeteorCrystal|MeteorVein/.test(m.name))return m;const c=m.clone();glow.push({m:c,base:/Core/.test(m.name)?3:/Crystal/.test(m.name)?1.6:.8});return c;});if(o.material.length===1)o.material=o.material[0];});
 const petals=[];body.traverse(o=>{if(/^Petal_/.test(o.name)){const out=new T.Vector3(o.position.x,0,o.position.z).normalize();petals.push({o,rest:o.quaternion.clone(),axis:new T.Vector3(-out.z,0,out.x)});}});
 const light=new T.PointLight('#00ffd1',0,.5,2);light.position.set(site.x,ground+.9,site.z);light.castShadow=false;root.add(light);
 let state='glowing',opened=0;
 body.userData.storyId='meteorite';
 body.userData.inspect={title:'Mysterious meteorite',kind:'Fresh impact',description:'A dark, craggy stone half buried in a new crater. Cyan crystals break through its cracks and it glows like a slow heartbeat.'};
 function update(seconds,dt=0){
  const beat=Math.pow(.5+.5*Math.cos(seconds/PULSE_SECONDS*Math.PI*2),3),level=state==='buried'?.15+.1*beat:.35+.65*beat;
  for(const {m,base}of glow)m.emissiveIntensity=base*level;
  light.intensity=.025*level*(state==='open'?1.6:1);
  if(state==='opening'){opened=Math.min(1,opened+dt/OPEN_SECONDS);if(opened>=1)state='open';}
  const ease=opened*opened*(3-2*opened);for(const p of petals)p.o.quaternion.copy(p.rest).premultiply(new T.Quaternion().setFromAxisAngle(p.axis,-ease*1.9));
 }
 update(0);
 return {group,light,get state(){return state;},open(){if(state!=='open')state='opening';},bury(){state='buried';},glow(){state='glowing';opened=0;},update,dispose(){root.remove(group);root.remove(light);light.dispose();for(const {m}of glow)m.dispose();}};
}
