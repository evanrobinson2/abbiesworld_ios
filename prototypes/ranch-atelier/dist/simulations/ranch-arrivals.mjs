import {createStorybookArrival} from './storybook-arrival.mjs';
import * as T from 'three';
import {arrivalOptions} from './arrival-settings.mjs?page=2';
export const ARRIVALS=[['hologram','Holographic'],['laser','Laser printed'],['space','Fly in from space'],['quantum','Quantum parts'],['storybook','Storybook page'],['organic','Organic time-lapse']];
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Temporary presentation only. Restore exact transforms/materials before life resumes.
export function createArrival(group,mode,{reducedMotion=false,parameters={}}={}){
 const options=arrivalOptions(mode,parameters);if(mode==='storybook'&&!reducedMotion)return createStorybookArrival(group,options);let elapsed=0,done=false,restored=false;const duration=reducedMotion?.35:options.duration;
 group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group),center=bounds.getCenter(new T.Vector3()),span=bounds.getSize(new T.Vector3());
 const progress={value:0},clock={value:0},originals=[],materials=new Map(),pieces=[];
 const moving=['space','quantum','storybook'].includes(mode)&&!reducedMotion;
 group.traverse(o=>{if(!o.isMesh)return;
  originals.push({o,material:o.material,castShadow:o.castShadow});o.castShadow=false;
  const decorate=m=>{if(materials.has(m))return materials.get(m);const c=m.clone(),previous=m.onBeforeCompile,key=m.customProgramCacheKey();c.userData={...m.userData,shared:false};
   c.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);Object.assign(shader.uniforms,{arrivalProgress:progress,arrivalClock:clock,arrivalMin:{value:bounds.min},arrivalSpan:{value:span},arrivalHold:{value:Math.min(.68,.18+(options.hold||0)/duration)},arrivalScan:{value:options.scan??.6},arrivalBeam:{value:options.beam??.012},arrivalWave:{value:options.wave??.035},arrivalGlow:{value:options.glow??.45}});
    shader.vertexShader='varying vec3 vArrivalWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvArrivalWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader='varying vec3 vArrivalWorld; uniform float arrivalProgress; uniform float arrivalClock; uniform float arrivalHold,arrivalScan,arrivalBeam,arrivalWave,arrivalGlow; uniform vec3 arrivalMin; uniform vec3 arrivalSpan;\n'+shader.fragmentShader;
    let code='';
    if(mode==='laser')code=`float sweep=(vArrivalWorld.x-arrivalMin.x)/max(arrivalSpan.x,.001);if(sweep>min(1.,arrivalProgress/.9)*1.04)discard;float beam=1.-smoothstep(.001,arrivalBeam,abs(sweep-min(1.,arrivalProgress/.9)*1.04));gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.,.34,.08),beam*.9);`;
    else if(mode==='organic')code=`float growth=(vArrivalWorld.y-arrivalMin.y)/max(arrivalSpan.y,.001);float waviness=sin(vArrivalWorld.x*3.)*sin(vArrivalWorld.z*3.)*arrivalWave;if(growth+waviness>min(1.,arrivalProgress/.9)*1.12)discard;float tip=(1.-smoothstep(.0,.035,abs(growth+waviness-min(1.,arrivalProgress/.9)*1.12)))*(1.-arrivalProgress);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.65,.85,.3),tip*arrivalGlow);`;
    else if(mode==='hologram')code=`float scan=.5+.5*sin(vArrivalWorld.y*95.-arrivalClock*5.);float grid=pow(.5+.5*sin(vArrivalWorld.x*50.),24.)+pow(.5+.5*sin(vArrivalWorld.z*50.),24.);float scanHeight=(vArrivalWorld.y-arrivalMin.y)/max(arrivalSpan.y,.001);if(scanHeight>min(1.,arrivalProgress/.18)*1.02)discard;float solid=smoothstep(arrivalHold,.9,arrivalProgress);vec3 hologram=vec3(.08,.65,.75)*(1.-arrivalScan*.4+arrivalScan*.4*scan)+grid*vec3(.1,.25,.3)*arrivalScan;gl_FragColor.rgb=mix(hologram,gl_FragColor.rgb,solid);gl_FragColor.a=mix(.65+arrivalScan*.15*scan,1.,solid)*smoothstep(0.,.08,arrivalProgress);`;
    else if(reducedMotion)code='gl_FragColor.a*=arrivalProgress;';
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\n'+code);
   };
   c.customProgramCacheKey=()=>key+'-arrival-'+mode+(reducedMotion?'-reduced':'');if(mode==='hologram'||reducedMotion){c.transparent=true;c.depthWrite=false;}materials.set(m,c);return c;
  };
  o.material=Array.isArray(o.material)?o.material.map(decorate):decorate(o.material);
  if(moving){const base=o.position.clone(),scale=o.scale.clone(),rotation=o.quaternion.clone();o.geometry.computeBoundingBox();const pivot=o.geometry.boundingBox.getCenter(new T.Vector3()).multiply(scale).applyQuaternion(rotation);const world=o.getWorldPosition(new T.Vector3()),i=pieces.length,angle=i*2.399963;
   let startWorld;if(mode==='quantum')startWorld=center.clone().add(new T.Vector3(Math.cos(angle)*.03,span.y*.4,Math.sin(angle)*.03));else if(mode==='space')startWorld=world.clone().add(new T.Vector3(Math.cos(angle)*span.x*.5,(options.height||80)*.1+(i%9)*.15,Math.sin(angle)*span.z*.5));else startWorld=world.clone();
   const start=mode==='storybook'?base.clone():o.parent.worldToLocal(startWorld).sub(pivot);pieces.push({o,base,scale,rotation,start,delay:(i%17)/17*(options.stagger??.22),angle});
  }
 });
 // Small motes make the quantum origin and printed leading edge legible.
 const dustCount=mode==='quantum'?100:mode==='laser'?32:mode==='storybook'?60:0,dustGeo=new T.BufferGeometry(),dustData=new Float32Array(dustCount*3);
 const dustMat=new T.PointsMaterial({color:mode==='laser'?'#edb25c':mode==='storybook'?'#ecd794':'#8ce3dc',size:.045,transparent:true,opacity:.8,depthWrite:false});
 dustGeo.setAttribute('position',new T.BufferAttribute(dustData,3));const dust=new T.Points(dustGeo,dustMat);group.add(dust);dust.visible=!reducedMotion;
 function restore(){if(restored)return;restored=true;for(const p of pieces){p.o.position.copy(p.base);p.o.scale.copy(p.scale);p.o.quaternion.copy(p.rotation);}for(const x of originals){x.o.material=x.material;x.o.castShadow=x.castShadow;}for(const m of materials.values())m.dispose();group.remove(dust);dustGeo.dispose();dustMat.dispose();}
 function finish(){if(done)return;restore();done=true;}
 function update(dt){if(done)return;elapsed+=Math.max(0,dt);const t=clamp(elapsed/duration);if(t>=.94){restore();if(elapsed>=duration-1e-9)done=true;return;}progress.value=t;clock.value=elapsed;
  for(const p of pieces){const u=smooth((t/.9-p.delay)/(1-p.delay));p.o.position.lerpVectors(p.start,p.base,u);p.o.quaternion.copy(p.rotation);
   if(mode==='space'){p.o.scale.copy(p.scale).multiplyScalar(.1+.9*u);p.o.rotateY((1-u)*Math.PI*2*(options.spin??.35));}
   if(mode==='quantum'){const burst=Math.sin(Math.PI*clamp(t/.55))*(1-u),parentScale=p.o.parent.getWorldScale(new T.Vector3());p.o.position.x+=Math.cos(p.angle)*span.x*options.spread*burst/parentScale.x;p.o.position.z+=Math.sin(p.angle)*span.z*options.spread*burst/parentScale.z;p.o.position.y+=Math.sin(p.angle*.7)*span.y*.7*burst/parentScale.y;p.o.scale.copy(p.scale).multiplyScalar(.015+.985*u);p.o.rotateY((1-u)*Math.sin(p.angle)*Math.PI*2*options.spin);}
   if(mode==='storybook'){const radius=p.base.length(),delay=Math.min(.65,radius*.009+p.delay),pop=smooth((t/.9-delay)/(1-delay));p.o.scale.copy(p.scale).multiplyScalar(Math.max(.001,pop));}
  }
  for(let i=0;i<dustCount;i++){const a=i*2.399963,r=mode==='quantum'?Math.sin(t*Math.PI)*span.x*.35:span.x*.5*Math.sqrt(i/dustCount);dustData[i*3]=mode==='laser'?bounds.min.x+span.x*Math.min(1,t/.9)*1.04:center.x+Math.cos(a)*r;dustData[i*3+1]=mode==='laser'?bounds.min.y+.05+(i%4)*.08:center.y+Math.sin(i*1.7)*r*.3+t*.5;dustData[i*3+2]=mode==='laser'?bounds.min.z+span.z*i/dustCount:center.z+Math.sin(a)*r;}dustGeo.attributes.position.needsUpdate=true;dustMat.opacity=Math.sin(Math.PI*clamp(t/.9))*(mode==='laser'?options.sparks:mode==='storybook'?options.motes:.75);
  if(t>=1)finish();
 }
 update(0);return {update,finish,get done(){return done;},get progress(){return clamp(elapsed/duration);},mode};
}
