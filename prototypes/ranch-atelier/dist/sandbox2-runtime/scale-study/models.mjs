import * as T from '../vendor/three.module.js';
import {activityPose,poseAt} from './animation.mjs';
import {EMOTES,emotePose,neutralEmote} from './emotes.mjs';
const geometries=new Map(),materials=new Map();
const geometry=(type)=>{if(!geometries.has(type))geometries.set(type,type==='sphere'?new T.SphereGeometry(1,10,8):type==='cylinder'?new T.CylinderGeometry(1,1,1,10):new T.BoxGeometry(1,1,1));return geometries.get(type);};
const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.92}));return materials.get(color);};
export function part(group,type,color,size,pos){const m=new T.Mesh(geometry(type),material(color));m.scale.set(...size);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
export function makePerson(person){
 const root=new T.Group(),a=person.appearance,w=person.wardrobe;
 root.scale.set(a.build*a.height/1.75,a.height/1.75,a.height/1.75);
 // One anatomically proportioned body kit. Shared clothing overlays carry role signals.
 part(root,'sphere',a.skin,[.12,.15,.115],[0,1.57,0]);
 part(root,'sphere',a.hair,[.126,.075,.12],[0,1.68,-.013]);
 if(a.hairStyle===1)part(root,'sphere',a.hair,[.08,.08,.07],[0,1.58,-.12]);
 if(a.hairStyle===2)part(root,'sphere',a.hair,[.13,.12,.065],[0,1.58,-.07]);
 part(root,'cylinder',a.skin,[.055,.10,.055],[0,1.39,0]);
 part(root,'box',w.top,[.34,.48,.20],[0,1.12,0]);
 part(root,'box',w.bottom,[.32,.18,.20],[0,.83,0]);
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*.22,1.31,0);root.add(arm);
  part(arm,'box',w.top,[.105,.37,.115],[0,-.16,0]);part(arm,'sphere',a.skin,[.058,.08,.055],[0,-.40,0]);limbs.push(arm);
  const leg=new T.Group();leg.position.set(side*.09,.82,0);root.add(leg);
  part(leg,'box',w.bottom,[.13,.66,.15],[0,-.34,0]);part(leg,'box','#3f3a33',[.14,.10,.24],[0,-.75,.035]);limbs.push(leg);
 }
 for(const side of [-1,1])part(root,'sphere','#332e2b',[.012,.012,.008],[side*.043,1.59,.108]);
 part(root,'sphere',a.skin,[.025,.032,.035],[0,1.55,.112]);
 if(w.hat!=='none'){
  const hatColor=w.hat==='brim'?'#ac9369':w.top;
  part(root,'cylinder',hatColor,[w.hat==='brim'?.21:.14,.035,w.hat==='brim'?.18:.13],[0,1.70,0]);
  part(root,w.hat==='helmet'?'sphere':'cylinder',hatColor,[.13,w.hat==='helmet'?.09:.07,.12],[0,1.75,0]);
  if(['cap','peaked'].includes(w.hat))part(root,'box',hatColor,[.18,.025,.12],[0,1.71,.11]);
 }
 if(w.accessory==='apron')part(root,'box','#d4c8ac',[.29,.49,.025],[0,1.02,.115]);
 if(w.accessory==='coat'){part(root,'box','#e7e1d2',[.36,.64,.24],[0,1.03,0]);part(root,'box',w.top,[.08,.26,.025],[0,1.23,.13]);}
 if(['satchel','bag','case','book'].includes(w.accessory)){
  part(root,'box','#574d3f',[.035,.46,.23],[.12,1.12,0]);
  part(root,'box',w.accessory==='book'?'#7c5544':'#897452',[.20,.24,.10],[.24,.83,.08]);
 }
 if(w.accessory==='badge')part(root,'sphere','#c7b470',[.033,.04,.012],[-.08,1.25,.112]);
 if(['badge','belt'].includes(w.accessory))part(root,'box','#504737',[.35,.045,.23],[0,.91,0]);
 if(w.accessory==='crate')part(root,'box','#ad8b5d',[.25,.22,.23],[.29,.67,.07]);
 if(w.accessory==='tool'){part(root,'cylinder','#886e4c',[.018,.48,.018],[.26,.66,0]);part(root,'box','#66716b',[.15,.06,.065],[.26,.9,0]);}
 // Pivot the existing head and accessories; no extra character meshes required.
 const head=new T.Group();head.position.set(0,1.43,0);root.add(head);
 for(const child of [...root.children])if(child!==head&&child.isMesh&&child.position.y>1.43){root.remove(child);child.position.sub(head.position);head.add(child);}
 // Hand-held accessories follow the right arm instead of floating beside the body.
 const rightArm=limbs[2];
 for(const child of [...root.children])if(child.isMesh&&child.position.x>.23&&child.position.y<1){root.remove(child);child.position.sub(rightArm.position);rightArm.add(child);}
 root.userData={person,limbs,head,gait:person.index*.7,animationTime:person.index*.43,pose:{...neutralEmote(),...poseAt('idle',0,0)},animation:'idle'};return root;
}
export function animatePerson(model,state,distance,dt,paused=false){
 if(paused)return; // Preserve the exact paused pose.
 const rig=model.userData,moving=distance>.00001;
 rig.gait+=Math.min(distance,.5)*Math.PI*2/1.05;
 rig.animationTime+=dt;
 let kind=activityPose(rig.person,state,moving),target={...neutralEmote(),...poseAt(kind,rig.gait,rig.animationTime,rig.person.wardrobe.accessory)};
 if(rig.emote){const e=rig.emote;e.elapsed+=dt;kind=e.id;target=emotePose(e.id,e.elapsed,e.intensity);
 if(['wave','point'].includes(e.id)&&['satchel','bag','case','book','crate','tool'].includes(rig.person.wardrobe.accessory)){target.arms.reverse();target.armsZ=target.armsZ.reverse().map(v=>-v);target.head*=-1;}
 if(e.elapsed>=EMOTES.find(s=>s.id===e.id).duration)rig.emote=null;}
 const blend=1-Math.exp(-dt*12);
 for(const key of ['arms','legs','armsZ'])for(let i=0;i<2;i++)rig.pose[key][i]+=(target[key][i]-rig.pose[key][i])*blend;
 for(const key of ['bob','head','lean','headTilt','headRoll'])rig.pose[key]+=(target[key]-rig.pose[key])*blend;
 // Limb order is left arm, left leg, right arm, right leg: opposite arm/leg swings.
 rig.limbs[0].rotation.x=rig.pose.arms[0];rig.limbs[2].rotation.x=rig.pose.arms[1];
 rig.limbs[1].rotation.x=rig.pose.legs[0];rig.limbs[3].rotation.x=rig.pose.legs[1];
 rig.limbs[0].rotation.z=rig.pose.armsZ[0];rig.limbs[2].rotation.z=rig.pose.armsZ[1];
 rig.head.rotation.set(rig.pose.headTilt,rig.pose.head,rig.pose.headRoll);model.position.y=rig.pose.bob;model.rotation.x=rig.pose.lean;
 rig.animation=kind;
}
export function makeTown(places,society,military){
 const root=new T.Group();
 part(root,'box','#adb492',[88,.18,70],[0,-.14,10]);
 part(root,'box','#c6bda8',[77,.04,6],[0,.01,6]);
 part(root,'box','#b7b098',[77,.03,2],[0,.015,-5]);
 for(const [id,p] of Object.entries(places)){
  if(!military&&['barracks','training','signals'].includes(id))continue;
  part(root,'box','#c6bda8',[2,.03,Math.abs(p.z-6)],[p.x,.02,(p.z+6)/2]);
  if(['park','road','water','training'].includes(id))continue;
  const color=id==='station'?'#b6a28b':id==='clinic'?'#dbd7c6':id==='works'?'#9c9f92':'#cbb99b';
  const z=p.z+(p.z>6?4:-4),height=['hall','school'].includes(id)?4.8:3.5;
  part(root,'box',color,[7,height,5],[p.x,height/2,z]);
  part(root,'box',society.color,[7.4,.35,5.4],[p.x,height+.15,z]);
  part(root,'box','#5b655e',[1.1,2,.06],[p.x,1,z+(p.z>6?-2.53:2.53)]);
  for(const x of [-2.3,2.3])part(root,'box','#7b9294',[1.15,1.05,.07],[p.x+x,2.2,z+(p.z>6?-2.54:2.54)]);
 }
 for(const x of [-5,5])for(const z of [-2,2]){part(root,'cylinder','#796b52',[.15,1.7,.15],[x,.85,z]);part(root,'sphere','#73865d',[1.2,1.4,1.2],[x,2.4,z]);}
 part(root,'cylinder','#8faaa4',[1.7,.55,1.7],[0,.3,0]);
 if(society.id==='harbor')part(root,'box','#729da4',[10,.08,68],[43,-.02,10]);
 return root;
}
