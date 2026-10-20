// Opening adapter, awaiting deployment of the character factory and grip review.
// Presentation does not mutate encounter health, targeting, positions or rewards.
import * as T from 'three';
import {createCharacterVariant} from '/character-variants.mjs';
export function createSkeletalActor(source,kind,{idle='Idle_Loop',facing=kind==='zombie'?-Math.PI/2:Math.PI/2}={}){
 const variant=createCharacterVariant(source.scene,kind),mixer=new T.AnimationMixer(variant.rig);
 const clips=new Map(source.animations.map(c=>[c.name,c]));let current=null,action=null,initialized=false,wasWinding=false;
 const play=(name,once=false)=>{if(current===name)return;const clip=clips.get(name);if(!clip)throw Error(`Required clip missing: ${name}`);const next=mixer.clipAction(clip);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(once?T.LoopOnce:T.LoopRepeat,Infinity);next.clampWhenFinished=true;next.play();if(action)action.crossFadeTo(next,.15,false);action=next;current=name;};
 function update(actor,dt){
  if(!initialized){variant.group.position.set(actor.position.x,0,actor.position.z);initialized=true;}
  const d=Math.hypot(actor.position.x-variant.group.position.x,actor.position.z-variant.group.position.z);
  variant.group.position.x+=(actor.position.x-variant.group.position.x)*(1-Math.exp(-dt*18));
  variant.group.position.z+=(actor.position.z-variant.group.position.z)*(1-Math.exp(-dt*18));
  variant.group.rotation.y=facing;
  if(actor.hp<=0)play('Death01',true);
  else if(actor.windup&&!wasWinding)play('Sword_Attack',true);
  else if(current==='Sword_Attack'&&action.time<action.getClip().duration){} // Finish the source clip before locomotion resumes.
  else play(d>.02?'Walk_Loop':idle);
  wasWinding=!!actor.windup;mixer.update(dt);
 }
 function reset(){mixer.stopAllAction();current=null;action=null;initialized=false;wasWinding=false;}
 return {...variant,mixer,update,reset,limitations:['Walk_Loop is ordinary human locomotion, not a bespoke zombie gait.','Sword_Attack is a temporary source-clip mapping; bat timing and grip require visual validation before gameplay deployment.']};
}
