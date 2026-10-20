import * as T from 'three';
import {WEATHER,easeWeather} from './simulation/weather-state.mjs';
// Fixed GPU particle pool, one cloud draw, shared sun shadow map. No particle physics.
export function createRanchWeather({scene,assembly,heightAt,seed=1}){
 const root=new T.Group();root.name='Weather presentation';scene.add(root);
 let rngSeed=seed>>>0;const random=()=>((rngSeed=Math.imul(rngSeed,1664525)+1013904223>>>0)/4294967296);
 const radius=assembly.radiusMetres??50,plans=assembly.plans;
 const count=1200,positions=new Float32Array(count*3),phases=new Float32Array(count);
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,top=0;
 for(let i=0;i<count;i++){const p=plans[i%plans.length];let x,z;do{x=(random()*2-1)*radius*.86;z=(random()*2-1)*radius;}while(Math.abs(z)+Math.abs(x)/Math.sqrt(3)>radius);x+=p.center.x;z+=p.center.z;const y=heightAt(x,z)*.1;positions.set([x*.1,y,z*.1],i*3);phases[i]=random();minX=Math.min(minX,x*.1);maxX=Math.max(maxX,x*.1);minZ=Math.min(minZ,z*.1);maxZ=Math.max(maxZ,z*.1);top=Math.max(top,y);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('phase',new T.BufferAttribute(phases,1));
 const uniforms={time:{value:0},amount:{value:0},kind:{value:1},wind:{value:0},motion:{value:1},brightness:{value:1}};
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms,vertexShader:`attribute float phase;uniform float time,kind,wind,motion;varying float vPhase;varying float vBounce;void main(){vPhase=phase;float speed=kind<1.5?1.1:kind<2.5?.85:.13;float t=fract(phase+time*speed);float y=(1.-t)*3.;vBounce=0.;if(kind>1.5&&kind<2.5&&t>.85){float b=(t-.85)/.15;y=sin(b*3.14159)*.18;vBounce=1.;}vec3 p=position;p.y+=y;p.x+=wind*(t-.5)*.5*motion;if(kind>2.5)p.x+=sin(time*.7+phase*50.)*.12*motion;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=kind<1.5?7.:kind<2.5?3.:4.;}`,fragmentShader:`uniform float amount,kind,brightness;varying float vPhase;varying float vBounce;void main(){if(vPhase>amount)discard;vec2 p=gl_PointCoord-.5;float shape=kind<1.5?1.-smoothstep(.06,.14,abs(p.x+p.y*.18)):1.-smoothstep(.25,.5,length(p));float a=shape*(kind<1.5?.4:.8);if(a<.01)discard;gl_FragColor=vec4(vec3(.78,.86,.94)*brightness,a);}`});
 const particles=new T.Points(geo,mat);particles.frustumCulled=false;root.add(particles);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');for(const [x,y,r]of [[43,65,31],[67,45,32],[87,68,30],[64,83,27]]){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 const texture=new T.CanvasTexture(canvas),cloudGeo=new T.PlaneGeometry(1,1),cloudMat=new T.MeshStandardMaterial({map:texture,color:'#e6ebed',transparent:true,opacity:.34,alphaTest:.08,depthWrite:false,side:T.DoubleSide,roughness:1});
 const clouds=new T.InstancedMesh(cloudGeo,cloudMat,10);clouds.castShadow=true;clouds.frustumCulled=false;clouds.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:texture,alphaTest:.32,side:T.DoubleSide});root.add(clouds);
 const cloudSeeds=Array.from({length:10},()=>({x:random(),z:random(),size:2.5+random()*2})),dummy=new T.Object3D();let time=0,cloudOffset=0,cloud=.12,wind=.15,amount=0,lastKind=1;
 return {get cloudCover(){return cloud;},update(dt,state,{reduced=false,daylight=1,hidden=false}={}){
 root.visible=!hidden;if(hidden)return;dt=Math.max(0,Math.min(.05,dt));const w=WEATHER[state.weather]??WEATHER.clear;cloud=easeWeather(cloud,w.cloud,dt);wind=easeWeather(wind,w.wind,dt);amount=easeWeather(amount,w.precip,dt);if(w.precip)lastKind=w.kind;
 time=(time+dt)%10000;if(!reduced)cloudOffset+=dt*.055*(.3+wind);uniforms.time.value=time;uniforms.kind.value=lastKind;uniforms.amount.value=reduced?amount*.3:amount;uniforms.wind.value=wind;uniforms.motion.value=reduced?0:1;uniforms.brightness.value=.35+.65*daylight;particles.visible=amount>.005;
 clouds.count=Math.ceil(cloud*10);cloudMat.opacity=.18+cloud*.18;cloudMat.color.set(daylight>.2?'#e6ebed':'#637080');
 const width=maxX-minX+6,depth=maxZ-minZ+6;for(let i=0;i<clouds.count;i++){const c=cloudSeeds[i];dummy.position.set(minX-3+((c.x*width+cloudOffset)%width),top+2.5+i*.025,minZ-3+c.z*depth);dummy.rotation.set(-Math.PI/2,0,.3);dummy.scale.set(c.size,c.size*.7,1);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix);}clouds.instanceMatrix.needsUpdate=true;
 return {type:state.weather,cloudCover:cloud,particles:particles.visible?Math.ceil(count*uniforms.amount.value):0,capacity:count,clouds:clouds.count,drawCalls:particles.visible?2:1};
 },dispose(){scene.remove(root);geo.dispose();mat.dispose();cloudGeo.dispose();cloudMat.dispose();clouds.customDepthMaterial.dispose();texture.dispose();clouds.dispose();}};
}
