// Shared, time-based presentation curves; never mutate the scene recipe.
export const motionDefaults={duration:1200,hold:180,stagger:180,strength:1};
export function spring(t){if(t<=0)return 0;if(t>=1)return 1;return 1-Math.exp(-7*t)*(Math.cos(14*t)+.5*Math.sin(14*t));}
export function motionSample(elapsed,settings=motionDefaults,index=0,count=1){
 const delay=settings.hold+settings.stagger*index/Math.max(1,count-1),t=Math.max(0,Math.min(1,(elapsed-delay)/settings.duration));
 const rise=Math.min(1,Math.max(0,elapsed/Math.max(1,settings.hold)));
 return {progress:spring(t),hover:settings.strength*.65*rise*(1-t)*(1-t),wobble:t===1?0:settings.strength*.09*Math.sin(t*22+index*.8)*Math.sin(Math.PI*t)*(1-t),done:elapsed>=delay+settings.duration};
}
export function captureMotion(groups){const result=new Map();for(const[id,g]of groups){result.set(id,{position:g.position.clone(),pieces:new Map(g.children.filter(o=>o.userData.motionKey).map(o=>[o.userData.motionKey,{position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone()}]))});}return result;}
export function createTileMotion({render,changed,shadow,settings,reduced}){
 let active=false,last=null,frame=0,finish=null,progress=1;
 function settle(){if(finish)finish();}
 async function play(groups,before){
  settle();const records=[];for(const[id,g]of groups){const old=before.get(id);if(!old)continue;const end=g.position.clone();records.push({o:g,start:old.position.clone(),end,rotation:g.rotation.clone(),scale:g.scale.clone(),base:true});
   for(const o of g.children){if(!o.userData.motionKey)continue;const previous=old.pieces.get(o.userData.motionKey);records.push({o,start:previous?.position.clone()||o.position.clone(),end:o.position.clone(),rotation:o.rotation.clone(),oldRotation:previous?.rotation.clone()||o.rotation.clone(),scale:o.scale.clone()});}}
  if(!records.length)return;last={groups,before};if(reduced()){render();return;}
  const config={...settings()},total=config.hold+config.stagger+config.duration;active=true;progress=0;changed();
  await new Promise(resolve=>{const start=performance.now();finish=()=>{cancelAnimationFrame(frame);for(const r of records){r.o.position.copy(r.end);r.o.rotation.copy(r.rotation);r.o.scale.copy(r.scale);}active=false;progress=1;finish=null;shadow();render();changed();resolve();};
   const tick=now=>{const elapsed=now-start;progress=Math.min(1,elapsed/total);if(elapsed>=total||reduced()){settle();return;}for(let i=0;i<records.length;i++){const r=records[i],v=motionSample(elapsed,config,i,records.length);if(r.base){const t=spring(Math.min(1,elapsed/Math.max(240,config.duration*.45)));r.o.position.lerpVectors(r.start,r.end,t);r.o.position.y+=config.strength*.22*Math.sin(Math.min(1,elapsed/Math.max(240,config.duration*.45))*Math.PI);}else{r.o.position.lerpVectors(r.start,r.end,v.progress);r.o.position.y+=v.hover;r.o.rotation.copy(r.rotation);r.o.rotation.y=r.oldRotation.y+Math.atan2(Math.sin(r.rotation.y-r.oldRotation.y),Math.cos(r.rotation.y-r.oldRotation.y))*v.progress;r.o.rotation.x+=v.wobble;r.o.rotation.z+=v.wobble*.65;}}render();frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  });
 }
 return {play,settle,replay:()=>last?play(last.groups,last.before):Promise.resolve(),state:()=>({active,progress,settings:{...settings()},canReplay:!!last,reducedMotion:reduced()})};
}

