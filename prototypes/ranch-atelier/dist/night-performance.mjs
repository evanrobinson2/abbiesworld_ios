// Presentation only: combat results remain owned by the encounter simulation.
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export function articulate(T,model){
 const {limbs,head}=model.userData,elbows=[],knees=[];
 for(const i of [0,2]){
  const arm=limbs[i],upper=arm.children.find(c=>c.isMesh),hand=arm.children.find(c=>c.isMesh&&c!==upper);
  upper.scale.y=.22;upper.position.y=-.11;
  const elbow=new T.Group();elbow.position.y=-.22;arm.add(elbow);
  const forearm=upper.clone();forearm.scale.y=.18;forearm.position.y=-.09;elbow.add(forearm);
  if(hand){arm.remove(hand);hand.position.y=-.18;elbow.add(hand);}elbows.push(elbow);
 }
 for(const i of [1,3]){
  const leg=limbs[i],upper=leg.children[0],shoe=leg.children[1];upper.scale.y=.33;upper.position.y=-.17;
  const knee=new T.Group();knee.position.y=-.34;leg.add(knee);
  const shin=upper.clone();shin.position.y=-.17;knee.add(shin);leg.remove(shoe);shoe.position.y=-.41;knee.add(shoe);knees.push(knee);
 }
 const torso=new T.Group();torso.position.y=.83;
 for(const child of [...model.children])if(child===head||child===limbs[0]||child===limbs[2]||(child.isMesh&&child.position.y>.85)){model.remove(child);child.position.y-=.83;torso.add(child);}
 model.add(torso);model.userData.performance={torso,elbows,knees,box:new T.Box3(),time:0,wind:0,death:0,started:false};
 const hand=new T.Group();hand.position.y=-.18;elbows[1].add(hand);return hand;
}
export function perform(model,actor,dt,{zombie=false,phase='ready'}={}){
 const rig=model.userData,p=rig.performance;if(!p)return;
 p.time+=dt;const t=p.time,L=rig.limbs;
 if(!p.started){model.position.set(actor.position.x,0,actor.position.z);p.started=true;}
 const old=model.position.clone(),blend=1-Math.exp(-dt*18);
 model.position.x+=(actor.position.x-model.position.x)*blend;model.position.z+=(actor.position.z-model.position.z)*blend;
 const speed=dt?Math.hypot(model.position.x-old.x,model.position.z-old.z)/dt:0;
 rig.gait+=speed*dt*6;const walk=Math.min(1,speed/.65),s=Math.sin(rig.gait),c=Math.cos(rig.gait);
 model.rotation.order="YXZ";model.rotation.set(0,zombie?-Math.PI/2:Math.PI/2,0);model.position.y=Math.abs(s)*.025*walk;
 p.torso.rotation.set(zombie?.17:.035,Math.sin(t*1.4)*.035,Math.sin(t*2)*.015);
 rig.head.rotation.set(zombie?.18:-.04,Math.sin(t*.9)*.12,Math.sin(t*1.7)*.025);
 L[1].rotation.set(s*.48*walk,0,0);L[3].rotation.set(-s*.48*walk,0,0);
 p.knees[0].rotation.x=Math.max(0,-s)*.65*walk;p.knees[1].rotation.x=Math.max(0,s)*.65*walk;
 L[0].rotation.set(zombie?-1.0:-.65,0,zombie?-.12:-.18);L[2].rotation.set(zombie?-.8:-.8,0,zombie?.13:.12);
 p.elbows[0].rotation.x=zombie?-.3:-.8;p.elbows[1].rotation.x=zombie?-.25:-.85;
 if(zombie){
  L[0].rotation.x+=c*.12;L[2].rotation.x-=c*.16;p.torso.rotation.z+=s*.065*walk;
  if(actor.hp<=0){
   p.death+=dt;const buckle=ease(p.death/.35),fall=ease((p.death-.18)/.7),settle=Math.sin(clamp((p.death-.88)/.3)*Math.PI)*.035;
   p.knees.forEach(k=>k.rotation.x=.85*buckle*(1-fall)+.32*fall);
   L[1].rotation.x=-.55*buckle;L[3].rotation.x=-.35*buckle;
   p.torso.rotation.set(.35*buckle,0,.15*buckle);rig.head.rotation.x=.28;
   model.rotation.x=-1.48*fall;model.position.y=-.22*buckle*(1-fall)+.19*fall+settle;
   L[0].rotation.set(-.35,0,-.45*fall);L[2].rotation.set(.15,0,.5*fall);
   p.elbows[0].rotation.x=-.55;p.elbows[1].rotation.x=-.25;
   model.updateMatrixWorld(true);p.box.setFromObject(model);if(p.box.min.y<.015)model.position.y+=.015-p.box.min.y;
  }else p.death=0;
 }else{
  if(actor.windup){p.wind=Math.min(1,p.wind+dt/.4);p.death=0;}
  else if(phase==='arrival'||phase==='won'){p.death+=dt;p.wind=1-ease((p.death-.12)/.65);}
  else{p.wind=0;p.death=0;}
  const w=ease(p.wind),strike=(phase==='arrival'||phase==='won')?Math.sin(clamp(p.death/.24)*Math.PI):0;
  p.torso.rotation.y=-.65*w+1.1*strike;p.torso.rotation.x=.04+.15*strike;
  L[2].rotation.x=-.8-1.25*w+1.6*strike;L[2].rotation.z=.12+.3*w;
  p.elbows[1].rotation.x=-.85+.65*strike;
  L[0].rotation.x=-.65-.85*w+1.2*strike;
  rig.head.rotation.y=-p.torso.rotation.y*.6;
  if(phase==='ready'){p.torso.position.y=.83+Math.sin(t*3.2)*.008;L[2].rotation.z+=Math.sin(t*17)*.012;}
 }
}
export function resetPerformance(model){const p=model.userData.performance;p.started=false;p.wind=0;p.death=0;p.time=0;}
