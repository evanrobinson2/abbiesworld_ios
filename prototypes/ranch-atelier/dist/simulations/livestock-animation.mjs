import * as T from 'three';
const TAU=Math.PI*2;
const SPECS={cow:{hip:.91,legX:.52,legZ:.248,neck:[.3,1,0],stride:.8,duty:.72,lift:.08,phases:[0,.5,.75,.25]},horse:{hip:1.14,legX:.49,legZ:.22,neck:[.31,1.26,0],stride:1.15,duty:.68,lift:.13,phases:[0,.5,.75,.25]},goat:{hip:.88,legX:.4,legZ:.17,neck:[.2,.84,0],stride:.52,duty:.62,lift:.12,phases:[0,.5,.5,0]},chicken:{hip:.32,legX:.02,legZ:.125,neck:[.06,.57,0],stride:.19,duty:.58,lift:.09,phases:[0,.5]}};
// Rig the existing authored parts without modifying their shared geometry.
export function rigLivestock(wrapper,species){
 const spec=SPECS[species],model=wrapper.children[0],parts=[...model.children].filter(o=>o.isMesh),bounds=new Map();
 for(const m of parts){m.geometry.computeBoundingBox();bounds.set(m,m.geometry.boundingBox.clone());}
 function joint(name,pivot,selected,parent=model){const g=new T.Group();g.name=name;g.position.fromArray(pivot);parent.add(g);for(const m of selected){parent.remove(m);m.position.sub(g.position);g.add(m);}return g;}
 const headParts=parts.filter(m=>{const b=bounds.get(m);return species==='cow'?b.min.y>.7&&b.min.x>.28:species==='horse'?b.min.y>=1.23&&b.getCenter(new T.Vector3()).x>.15:species==='goat'?b.min.y>=.78&&b.min.x>.2: b.min.y>=.56&&b.min.x>=.05;});
 const head=joint('neck-and-head',spec.neck,headParts);
 const legs=[];
 for(let i=0;i<(species==='chicken'?2:4);i++){const front=species==='chicken'||i<2,side=i%2===0?1:-1,x=species==='chicken'?spec.legX:(front?spec.legX:-spec.legX),z=side*spec.legZ;
  const selected=parts.filter(m=>{if(m.parent!==model)return false;const b=bounds.get(m),c=b.getCenter(new T.Vector3());return b.max.y<=spec.hip+.025&&b.min.y<.2&&Math.sign(c.z)===side&&(species==='chicken'||Math.sign(c.x)===(front?1:-1));});
  legs.push(joint('leg-'+i,[x,spec.hip,z],selected));
 }
 const tailParts=parts.filter(m=>{if(m.parent!==model)return false;const b=bounds.get(m);return species==='cow'?b.max.x<-.78:species==='horse'?b.max.x<-.65:species==='goat'?b.max.x<-.49&&b.min.y>.9:b.max.x<-.1&&b.min.y>.45;});
 const tail=joint('tail',species==='cow'?[-.84,.95,0]:species==='horse'?[-.83,1.16,0]:species==='goat'?[-.5,1.05,0]:[-.2,.56,0],tailParts);
 const wings=species==='chicken'?[1,-1].map(side=>joint('wing',[0,.53,side*.18],parts.filter(m=>m.parent===model&&bounds.get(m).min.y>.25&&bounds.get(m).max.y<.72&&bounds.get(m).getCenter(new T.Vector3()).z*side>.15))):[];
 const ears=[];
 if(species!=='chicken')for(const side of [1,-1]){const selected=head.children.filter(m=>{if(!m.isMesh)return false;const b=bounds.get(m),c=b.getCenter(new T.Vector3());return c.z*side>.08&&(species==='horse'?b.min.y>2&&b.max.x<.91:b.min.y>1.2&&b.max.y<1.4);});const pivot=species==='horse'?[.8,2.08,side*.15]:[.7,1.3,side*.2];const local=pivot.map((n,i)=>n-spec.neck[i]);ears.push(joint('ear',local,selected,head));}
 const rest=model.position.clone();let phase=0,time=0,lower=0,walkBlend=0;
 wrapper.userData.articulation={species,legs:legs.map(l=>l.children.length),head:head.children.length};
 return {legs,head,tail,wings,update(distance,dt,activity,seed=0){
  time+=dt;phase+=distance/spec.stride;const moving=distance>1e-5;walkBlend=T.MathUtils.damp(walkBlend,moving?1:0,12,dt);
  const drinking=activity==='Drinking',feeding=activity==='Feeding'||activity==='Grazing',resting=activity==='Resting';lower=T.MathUtils.damp(lower,!moving&&(drinking||feeding)?1:0,5,dt);
  const nativeStride=spec.stride/wrapper.scale.x;
  for(let i=0;i<legs.length;i++){const f=((phase+spec.phases[i]+seed*.137)%1+1)%1,duty=spec.duty;let x,y;
   if(f<duty){x=(.5-f/duty)*nativeStride*duty;y=0;}
   else{const u=(f-duty)/(1-duty),ease=u*u*(3-2*u);x=(-.5+ease)*nativeStride*duty;y=Math.sin(Math.PI*u)*spec.lift;}
   const angle=Math.atan2(x,spec.hip-y);legs[i].rotation.z=angle*walkBlend;legs[i].scale.y=1+(Math.hypot(x,spec.hip-y)/spec.hip-1)*walkBlend;
  }
  const peck=species==='chicken'?Math.pow(Math.max(0,Math.sin(time*(drinking?4:7)+seed)),4):Math.sin(time*3+seed)*.035;
  const angle=species==='cow'?(drinking?.75:1.1):species==='horse'?(drinking?1.05:1.46):species==='goat'?(drinking?.65:1.15):(drinking?1.2:1.55);
  head.rotation.z=-lower*(angle+(species==='chicken'?peck*.4:peck))+(1-lower)*Math.sin(time*.8+seed)*.025;
  head.rotation.y=(1-lower)*Math.sin(time*.65+seed)*.08;
  tail.rotation.x=Math.sin(time*(species==='horse'?1.8:3)+seed)*(species==='horse'?.18:.12);
  ears.forEach((ear,i)=>ear.rotation.x=Math.pow(Math.max(0,Math.sin(time*1.3+seed+i*2)),12)*.24*(i?1:-1));
  wings.forEach((wing,i)=>wing.rotation.x=Math.sin(time*2+seed)*.045*(i?1:-1));
  // Small breathing and weight shift; feet supply the locomotion, not root bouncing.
  model.position.copy(rest);model.rotation.x=Math.sin(phase*TAU)*walkBlend*.012;
  if(species==='chicken'){head.position.x=spec.neck[0]+Math.sin(phase*TAU*2)*walkBlend*.045;}
  if(resting)head.rotation.y+=Math.sin(time*.4+seed)*.06;
 }};
}
