// Small reusable toy-like poses. Gait follows distance, gestures follow wall time.
export function activityPose(person,state,moving){
 if(moving)return ['crate','satchel','bag','case','book','tool'].includes(person.wardrobe.accessory)?'carry':'walk';
 if(state.phase==='home')return 'rest';
 if(state.phase!=='work')return 'idle';
 if(['police','fire','soldier','officer'].includes(person.role))return 'look';
 if(['teacher','clerk','carer','signals'].includes(person.role))return 'talk';
 if(['road','water','parks','mechanic','boat','engineer'].includes(person.role))return 'repair';
 if(['doctor','nurse','medic','baker','cook','service-cook'].includes(person.role))return 'work';
 if(['librarian','student','resident','quartermaster'].includes(person.role))return 'read';
 if(['delivery','post','milk','grocer','rail','farmer','dock','service-driver','sanitation'].includes(person.role))return 'handoff';
 return 'idle';
}
export function poseAt(kind,gait,time,accessory){
 const s=Math.sin(gait),beat=Math.sin(time*2.7);
 const pose={arms:[0,0],legs:[0,0],head:0,bob:0,lean:0};
 if(kind==='walk'||kind==='carry'){
  pose.legs=[s*.38,-s*.38];pose.arms=[-s*.30,s*.30];pose.bob=.025*(1-Math.cos(gait*2));
  if(kind==='carry')pose.arms[1]=-.25;
  if(accessory==='crate'){pose.arms=[-.65,-.65];}
 }else if(kind==='repair'){pose.arms=[-.35,-.75+beat*.28];pose.lean=.08;}
 else if(kind==='work'){pose.arms=[-.65+beat*.12,-.65-beat*.12];pose.lean=.04;}
 else if(kind==='read'){pose.arms=[-.55,-.75];pose.lean=.025;}
 else if(kind==='handoff'){pose.arms=[-.18,-.7+beat*.25];}
 else if(kind==='talk'){pose.arms=[0,-.5+beat*.2];pose.head=Math.sin(time)*.1;}
 else if(kind==='look'){pose.head=Math.sin(time*.6)*.32;}
 else if(kind==='rest'){pose.head=Math.sin(time*.3)*.09;}
 return pose;
}
