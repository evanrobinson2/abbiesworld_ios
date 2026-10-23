import * as T from 'three';
import {WEATHER,easeWeather,frontApproach} from './simulation/weather-state.mjs';
// Weather you can see, at almost no cost. The simulation only says which weather it is (simulation/weather-state.mjs:
// fronts on a seeded chain, no physics); this file eases a handful of numbers toward it and the GPU does the rest.
// Three draws at most: soft lit cloud puffs (one instanced draw), rain/hail/snow (one fixed point pool) and cloud
// shadows (16 cards that write no colour or depth, so only the sun's shadow map sees them). Per frame the CPU moves 16
// cloud centres.
// A cloud passing over the ranch shows twice: the soft puff itself and its shadow sliding across the fields.
const CLOUDS=16,PUFFS=7;
// Clouds sail low over the diorama, about 20 m above its highest ground (render units are 0.1 per metre), and stay
// see-through where they cross the board so the world keeps reading underneath (Evan, 2026-10-23).
const CLOUD_BASE=20*.1,OVER_BOARD=.8;
const col=hex=>new T.Color(hex);
const TONES={dayLit:col('#fffaf1'),warmLit:col('#ffc995'),nightLit:col('#5a6a90'),stormLit:col('#77818f'),
 dayShade:col('#8c9cb4'),warmShade:col('#9a7f98'),nightShade:col('#26304a'),stormShade:col('#38414e'),flash:col('#e9eeff')};
export function createRanchWeather({scene,assembly,heightAt,seed=1}){
 const root=new T.Group();root.name='Weather';scene.add(root);
 let rngSeed=seed>>>0;const random=()=>((rngSeed=Math.imul(rngSeed,1664525)+1013904223>>>0)/4294967296);
 const radius=assembly.radiusMetres??50,plans=assembly.plans;
 // Rain, hail and snow: one fixed pool of points over the land, animated entirely in the vertex shader.
 const count=1200,positions=new Float32Array(count*3),phases=new Float32Array(count);
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,top=0;
 for(let i=0;i<count;i++){const p=plans[i%plans.length];let x,z;do{x=(random()*2-1)*radius*.86;z=(random()*2-1)*radius;}while(Math.abs(z)+Math.abs(x)/Math.sqrt(3)>radius);x+=p.center.x;z+=p.center.z;const y=heightAt(x,z)*.1;positions.set([x*.1,y,z*.1],i*3);phases[i]=random();minX=Math.min(minX,x*.1);maxX=Math.max(maxX,x*.1);minZ=Math.min(minZ,z*.1);maxZ=Math.max(maxZ,z*.1);top=Math.max(top,y);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('phase',new T.BufferAttribute(phases,1));
 const uniforms={time:{value:0},amount:{value:0},kind:{value:1},wind:{value:0},motion:{value:1},brightness:{value:1}};
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms,vertexShader:`attribute float phase;uniform float time,kind,wind,motion;varying float vPhase;varying float vBounce;void main(){vPhase=phase;float speed=kind<1.5?1.1:kind<2.5?.85:.13;float t=fract(phase+time*speed);float y=(1.-t)*3.;vBounce=0.;if(kind>1.5&&kind<2.5&&t>.85){float b=(t-.85)/.15;y=sin(b*3.14159)*.18;vBounce=1.;}vec3 p=position;p.y+=y;p.x+=wind*(t-.5)*.5*motion;if(kind>2.5)p.x+=sin(time*.7+phase*50.)*.12*motion;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=kind<1.5?7.:kind<2.5?3.:4.;}`,fragmentShader:`uniform float amount,kind,brightness,wind;varying float vPhase;varying float vBounce;void main(){if(vPhase>amount)discard;vec2 p=gl_PointCoord-.5;float shape=kind<1.5?1.-smoothstep(.06,.14,abs(p.x+p.y*(.18+wind*.25))):1.-smoothstep(.25,.5,length(p));float a=shape*(kind<1.5?.45:.85);if(a<.01)discard;gl_FragColor=vec4(vec3(.78,.86,.94)*brightness,a);}`});
 const particles=new T.Points(geo,mat);particles.name='Rain, hail and snow';particles.frustumCulled=false;root.add(particles);
 // Cloud field: CLOUDS clusters drifting downwind through a box around the board, wrapping where they are invisible.
 const span=Math.max(maxX-minX,maxZ-minZ,1),margin=span*.18,box={x:minX-margin,z:minZ-margin,w:maxX-minX+margin*2,d:maxZ-minZ+margin*2};
 const centre=new T.Vector3((minX+maxX)/2,top*.5,(minZ+maxZ)/2),tileRadius=span*.55;
 const heading=random()*Math.PI*2,drift=new T.Vector2(Math.cos(heading),Math.sin(heading));
 const seeds=Array.from({length:CLOUDS},(_,i)=>({u:random(),v:random(),y:top+CLOUD_BASE*(.9+random()*.3),size:span*(.075+random()*.05),order:(i+random()*.6)/CLOUDS}));
 const puffGeo=new T.InstancedBufferGeometry();puffGeo.index=new T.PlaneGeometry(1,1).index;puffGeo.setAttribute('position',new T.PlaneGeometry(1,1).getAttribute('position'));
 const puff=new Float32Array(CLOUDS*PUFFS*4),meta=new Float32Array(CLOUDS*PUFFS*2);
 for(let c=0;c<CLOUDS;c++)for(let k=0;k<PUFFS;k++){const i=c*PUFFS+k,a=k/PUFFS*Math.PI*2+random(),r=k?.35+random()*.45:0;puff.set([Math.cos(a)*r*1.25,(k?random()*.38-.08:.12),Math.sin(a)*r*.7,k?.55+random()*.45:1.05],i*4);meta.set([c,random()],i*2);}
 puffGeo.setAttribute('puff',new T.InstancedBufferAttribute(puff,4));puffGeo.setAttribute('meta',new T.InstancedBufferAttribute(meta,2));puffGeo.instanceCount=CLOUDS*PUFFS;
 const cloudData=Array.from({length:CLOUDS},()=>new T.Vector4()),sunDir=new T.Vector3(0,1,0);
 const cloudAlpha=new Array(CLOUDS).fill(0),cloudUniforms={clouds:{value:cloudData},presence:{value:cloudAlpha},sunDir:{value:sunDir},litColor:{value:new T.Color()},shadeColor:{value:new T.Color()},flash:{value:0},opacity:{value:.9},tileNdc:{value:new T.Vector2()},tileNdcRadius:{value:0},aspect:{value:1}};
 const cloudMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:cloudUniforms,vertexShader:`
 #define OVER_BOARD ${OVER_BOARD.toFixed(2)}
 attribute vec4 puff;attribute vec2 meta;uniform vec4 clouds[${CLOUDS}];uniform float presence[${CLOUDS}];uniform vec3 sunDir;uniform vec2 tileNdc;uniform float tileNdcRadius,aspect,opacity;
 varying vec2 vUv;varying float vAlpha,vSeed,vHeight;varying vec3 vSun;
 void main(){
  int i=int(meta.x);vec4 c=clouds[i];vec3 at=c.xyz+puff.xyz*c.w;
  vec4 view=modelViewMatrix*vec4(at,1.);vec4 clip=projectionMatrix*view;
  vec2 d=(clip.xy/max(clip.w,.0001)-tileNdc)*vec2(aspect,1.);
  float clearOfBoard=tileNdcRadius>0.?mix(OVER_BOARD,1.,smoothstep(tileNdcRadius*.6,tileNdcRadius*1.1,length(d))):1.;
  float nearFade=smoothstep(c.w*.8,c.w*2.4,-view.z);
  view.xy+=position.xy*puff.w*c.w*1.15;gl_Position=projectionMatrix*view;
  vUv=position.xy*2.;vSeed=meta.y;vHeight=puff.y;vAlpha=opacity*presence[i]*clearOfBoard*nearFade;
  vSun=normalize((viewMatrix*vec4(sunDir,0.)).xyz);
 }`,fragmentShader:`
 uniform vec3 litColor,shadeColor;uniform float flash;varying vec2 vUv;varying float vAlpha,vSeed,vHeight;varying vec3 vSun;
 void main(){
  float r=length(vUv),ang=atan(vUv.y,vUv.x);float wob=.07*sin(ang*5.+vSeed*40.)+.05*sin(ang*9.-vSeed*17.);
  float a=(1.-smoothstep(.5+wob,1.+wob*.4,r))*vAlpha;if(a<.01)discard;
  vec3 n=normalize(vec3(vUv,sqrt(max(0.,1.-r*r))));float lambert=clamp(dot(n,vSun)*.5+.5,0.,1.);
  float belly=smoothstep(-.7,.8,vUv.y*.6+vHeight*1.8);
  vec3 c=mix(shadeColor,litColor,clamp(lambert*.65+belly*.45,0.,1.))+flash*vec3(.75,.8,.95);
  gl_FragColor=vec4(c,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const cloudMesh=new T.Mesh(puffGeo,cloudMat);cloudMesh.name='Clouds';cloudMesh.frustumCulled=false;cloudMesh.renderOrder=2;cloudMesh.raycast=()=>{};root.add(cloudMesh);
 // Shadows: one flat soft card per cloud, seen only by the sun's shadow camera.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');for(const [x,y,r]of [[43,65,31],[67,45,32],[87,68,30],[64,83,27]]){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 const texture=new T.CanvasTexture(canvas),shadowGeo=new T.PlaneGeometry(1,1),shadowMat=new T.MeshBasicMaterial({map:texture,colorWrite:false,depthWrite:false,alphaTest:.3,side:T.DoubleSide});
 const shadows=new T.InstancedMesh(shadowGeo,shadowMat,CLOUDS);shadows.name='Cloud shadows';shadows.castShadow=true;shadows.frustumCulled=false;shadows.raycast=()=>{};
 shadows.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:texture,alphaTest:.42,side:T.DoubleSide});root.add(shadows);
 const dummy=new T.Object3D(),projected=new T.Vector3(),edge=new T.Vector3(),right=new T.Vector3();
 let time=0,travel=0,cloud=.3,wind=.15,amount=0,dark=0,lastKind=1,flash=0,flashAge=9,nextStrike=6+random()*8;
 const signal={cloud,wind,dark,flash,approach:0};
 function targets(state){const w=WEATHER[state.weather]??WEATHER.clear,approach=frontApproach(state.weatherFront),next=WEATHER[state.weatherFront?.next]??w;
  // An arriving front shows before it lands: wind picks up, clouds gather and the light drops.
  return {w,approach,cloud:Math.max(w.cloud,next.cloud*approach*.8),wind:Math.max(w.wind,next.wind*approach),dark:Math.max(w.dark,next.dark*approach*.6)};}
 function place(){const width=box.w,depth=box.d;
  for(let i=0;i<CLOUDS;i++){const s=seeds[i],u=((s.u*width+travel*drift.x)%width+width)%width/width,v=((s.v*depth+travel*drift.y)%depth+depth)%depth/depth;
   const wrap=Math.min(smooth(0,.14,u),smooth(1,.86,u),smooth(0,.14,v),smooth(1,.86,v)),presence=smooth(s.order-.1,s.order+.06,cloud)*wrap,size=s.size*(1+.35*dark)*(.35+.65*presence);
   cloudData[i].set(box.x+u*width,s.y,box.z+v*depth,presence>.01?size:0);cloudAlpha[i]=presence;
   dummy.position.set(cloudData[i].x,s.y,cloudData[i].z);dummy.rotation.set(-Math.PI/2,0,i);const shadowSize=presence>.15?size*2.1:0;dummy.scale.set(shadowSize,shadowSize*.75,1);dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);}
  shadows.instanceMatrix.needsUpdate=true;}
 function tint(light,daylight){const warmth=light?.warmth??0,lit=cloudUniforms.litColor.value,shade=cloudUniforms.shadeColor.value;
  lit.copy(TONES.dayLit).lerp(TONES.warmLit,warmth*.8);shade.copy(TONES.dayShade).lerp(TONES.warmShade,warmth*.7);
  lit.lerp(TONES.stormLit,Math.min(1,dark*1.35));shade.lerp(TONES.stormShade,Math.min(1,dark*1.4));
  lit.lerp(TONES.nightLit,1-daylight);shade.lerp(TONES.nightShade,1-daylight);
  const d=light?.direction;if(d)sunDir.set(d[0],Math.max(.25,d[1]),d[2]).normalize();}
 function frame(camera){if(!camera){cloudUniforms.tileNdcRadius.value=0;return;}
  projected.copy(centre).project(camera);right.setFromMatrixColumn(camera.matrixWorld,0);edge.copy(centre).addScaledVector(right,tileRadius).project(camera);
  const aspect=camera.aspect||1;cloudUniforms.aspect.value=aspect;cloudUniforms.tileNdc.value.set(projected.x,projected.y);cloudUniforms.tileNdcRadius.value=Math.hypot((edge.x-projected.x)*aspect,edge.y-projected.y);}
 return {get cloudCover(){return cloud;},get signal(){return signal;},
 // Jump straight to the current weather (captures, a told story setting the scene); play eases instead.
 settle(state){const t=targets(state);cloud=t.cloud;wind=t.wind;dark=t.dark;amount=t.w.precip;if(t.w.precip)lastKind=t.w.kind;},
 update(dt,state,{reduced=false,daylight=1,hidden=false,light=null,camera=null}={}){
 root.visible=!hidden;if(hidden)return;dt=Math.max(0,Math.min(.05,dt));const t=targets(state),w=t.w;
 cloud=easeWeather(cloud,t.cloud,dt);wind=easeWeather(wind,t.wind,dt);dark=easeWeather(dark,t.dark,dt);amount=easeWeather(amount,w.precip,dt);if(w.precip)lastKind=w.kind;
 time=(time+dt)%10000;if(!reduced)travel+=dt*span*.012*(.35+wind*1.6);
 uniforms.time.value=time;uniforms.kind.value=lastKind;uniforms.amount.value=reduced?amount*.3:amount;uniforms.wind.value=wind;uniforms.motion.value=reduced?0:1;uniforms.brightness.value=(.3+.7*daylight)*(1-.35*dark);particles.visible=amount>.005;
 // Lightning only in thunderstorms (and the darkest rain), soft and never a strobe; none with reduced motion.
 let strike=false;flashAge+=dt;const stormy=state.weather==='hail'||state.weather==='rain'&&dark>.5;
 if(stormy&&!reduced&&(nextStrike-=dt)<=0){strike=true;flashAge=0;nextStrike=(state.weather==='hail'?7:16)+random()*12;}
 flash=flashAge<1.2?(Math.exp(-flashAge*8)+(flashAge>.2?.55*Math.exp(-(flashAge-.2)*9):0))*.55:0;
 cloudUniforms.flash.value=flash;cloudUniforms.opacity.value=.82+.14*dark;
 place();tint(light,daylight);frame(camera);
 Object.assign(signal,{cloud,wind,dark,flash,approach:t.approach});
 const visibleClouds=cloudData.filter(c=>c.w>0).length;
 return {type:state.weather,cloudCover:cloud,wind,dark,flash,strike,front:state.weatherFront?.front??null,next:state.weatherFront?.next??null,inHours:state.weatherFront?.inHours??null,particles:particles.visible?Math.ceil(count*uniforms.amount.value):0,capacity:count,clouds:visibleClouds,drawCalls:(particles.visible?1:0)+(visibleClouds?2:0)};
 },dispose(){scene.remove(root);geo.dispose();mat.dispose();puffGeo.dispose();cloudMat.dispose();shadowGeo.dispose();shadowMat.dispose();shadows.customDepthMaterial.dispose();texture.dispose();shadows.dispose();}};
}
function smooth(a,b,v){const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);}
