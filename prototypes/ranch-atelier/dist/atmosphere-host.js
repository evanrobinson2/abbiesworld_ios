import {atmosphere} from './atmosphere-description.js';
import {renderAtmosphere} from './atmosphere-render.js';

// Owns presentation resources only; call dispose before replacing the host scene.
export function createAtmosphereHost(T,scene,{center,span=10,camera,lights=[]}={}){
 const original={background:scene.background,fog:scene.fog,lights:lights.map(light=>({light,color:light.color.clone(),intensity:light.intensity}))};
 let effect=null,description=null,disposed=false;
 function restore(){scene.background=original.background;scene.fog=original.fog;for(const s of original.lights){s.light.color.copy(s.color);s.light.intensity=s.intensity;}}
 function set(options){
  if(disposed)throw Error('Atmosphere host disposed');
  const next=options.enabled===false?null:atmosphere(options); // Validate before changing the visible state.
  effect?.dispose();effect=null;description=next;restore();
  if(!next)return;
  effect=renderAtmosphere(T,next);effect.group.position.copy(center||new T.Vector3());effect.group.scale.setScalar(span/40);scene.add(effect.group);
  if(next.environment!=='interior'){
   const palette={day:'#dce5d5',dusk:'#b99b9d',night:'#18233d'};
   scene.background=new T.Color(palette[next.time]);
   for(const s of original.lights){s.light.color.set(next.time==='night'?'#a9c4ed':next.time==='dusk'?'#ffc98b':'#fff0d8');s.light.intensity=s.intensity*(next.time==='night'?.32:next.time==='dusk'?.7:1);}
   if(next.fog){const distance=camera?camera.position.distanceTo(center):span*2;scene.fog=new T.Fog(scene.background,Math.max(span*.1,distance-span*.6),distance+span*1.7);}
  }
  effect.update(0);
 }
 return {set,update(seconds){effect?.update(seconds);},read(){return description?{enabled:true,environment:description.environment,time:description.time,requestedWeather:description.requestedWeather,weather:description.weather,intensity:description.intensity,reducedMotion:description.reducedMotion,stars:description.stars.length,clouds:description.clouds.length,particles:description.particles.length,moon:!!description.moon,fog:!!description.fog,gameplayEffects:[]}: {enabled:false};},dispose(){if(disposed)return;effect?.dispose();effect=null;description=null;restore();disposed=true;}};
}
