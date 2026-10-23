// Progress is stage-specific: no invented percentages for planning or asset requests.
export function createBuildProgress(){
 const root=document.createElement('div');root.id='scene-build-progress';root.hidden=true;root.innerHTML='<span role="status" aria-live="polite"></span><progress aria-label="Scene preparation"></progress>';document.body.append(root);const label=root.firstElementChild,bar=root.lastElementChild;
 return {stage(text,done,total){root.hidden=false;label.textContent=text;if(Number.isFinite(total)&&total>0){bar.max=total;bar.value=Math.min(total,Math.max(0,done));bar.setAttribute('aria-valuetext',`${text}: ${Math.round(bar.value/total*100)}%`);}else{bar.removeAttribute('value');bar.removeAttribute('aria-valuetext');}},finish(){root.hidden=true;}};
}
export async function warmScene(renderer,scene,camera,lightingScene){
 // Models and their texture requests have already resolved at this boundary.
 // Shared outlines swap materials, so compile synchronously before animation.
 renderer.compile(scene,camera,lightingScene);
 scene.traverse?.(object=>{for(const material of (Array.isArray(object.material)?object.material:[object.material]))if(material)for(const value of Object.values(material))if(value?.isTexture)renderer.initTexture(value);});
 await new Promise(resolve=>requestAnimationFrame(resolve));
}
export function stagedBuild(group,{reducedMotion=false}={}){
 const parts=group.children.filter(o=>o.visible),duration=reducedMotion?0:1.6;let time=0,done=false;
 for(const o of parts)o.visible=false;
 const finish=()=>{for(const o of parts)o.visible=true;done=true;};
 return {update(dt){if(done)return;time+=Math.max(0,dt);if(time>=duration){finish();return;}const n=Math.ceil(parts.length*time/duration);for(let i=0;i<n;i++)parts[i].visible=true;},finish,get done(){return done;},get progress(){return duration?Math.min(1,time/duration):1;}};
}
