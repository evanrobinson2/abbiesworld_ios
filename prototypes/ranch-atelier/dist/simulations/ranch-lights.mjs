import * as T from 'three';
export function houseLightLevel(mode,seconds,index){
 if(mode==='day')return 0;
 if(mode==='evening')return .8;
 if(mode==='morning')return index%3===0?.35:0;
 const t=((seconds%180)+180)%180,bedtime=28+(index*17)%55,wake=145+(index*7)%22;
 if(t<bedtime)return 1;if(t<bedtime+5)return 1-(t-bedtime)/5;
 if(t>wake)return Math.min(.65,(t-wake)/8);return 0;
}
const smoothLight=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export {outdoorLevel,farmLightLayout} from './farm-light-layout.mjs';
import {outdoorLevel,farmLightLayout} from './farm-light-layout.mjs';
import {lampKit,lampInstance,LAMP_GLOW} from './ranch-kits.mjs';
lampKit().catch(()=>{});   // start loading the kit with the module
export function createFarmLights(group,places,heightAt,assembly={plans:[]}){
 const homes=places.filter(p=>p.role==='home'),windows=[],owners=[],fixtures=[];
 group.updateWorldMatrix(true,true);group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.userData.homeWindow&&!windows.includes(m)){windows.push(m);const c=new T.Box3().setFromObject(o).getCenter(new T.Vector3());owners.push(homes.length?homes.reduce((best,h,i)=>Math.hypot(c.x-h.world.x*.1,c.z-h.world.z*.1)<Math.hypot(c.x-homes[best].world.x*.1,c.z-homes[best].world.z*.1)?i:best,0):-1);}});
 const root=new T.Group();root.name='Farm night lighting';group.add(root);
 // Lamps from the lamp kit (remaster R4, tools/ranch-rebuild/models/lamp-kit): crook lanterns along the paths, porch
 // lamps on the homes, the store and the animal shelters, post lanterns at gates and the water point, string lights
 // over the playground. Positions, the round and the glow pools are as before; each fixture sits under its lamp's
 // LightAnchor, so its pool and (first four only) point light are centred on the glass. Lamps beyond the layout
 // (shelter porches, string lights) are emissive only: no pool, no light.
 const poolMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:'varying vec2 lampUV;void main(){lampUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 lampUV;uniform float strength;void main(){float r=length(lampUV-.5)*2.;float a=pow(max(0.,1.-r),1.8)*strength;gl_FragColor=vec4(vec3(1.,.72,.36),a*.36);}'});
 const byId=new Map(places.map(p=>[p.id,p])),local=(c,a,lx,lz)=>({x:c.x+lx*Math.cos(a)+lz*Math.sin(a),z:c.z-lx*Math.sin(a)+lz*Math.cos(a)});
 const ray=new T.Raycaster(),toWorld=v=>group.localToWorld(v),toLocal=v=>group.worldToLocal(v);
 // Distance (metres) from an outside point to the first surface of `target` straight toward -dir, at height h.
 function wallAt(target,point,dir,h,reach){if(!target)return null;const o=toWorld(new T.Vector3(point.x*.1,(heightAt(point.x,point.z)+h)*.1,point.z*.1)),e=toWorld(new T.Vector3((point.x-dir.x)*.1,(heightAt(point.x,point.z)+h)*.1,(point.z-dir.z)*.1));
  ray.set(o,e.sub(o).normalize());ray.far=o.distanceTo(toWorld(new T.Vector3((point.x-dir.x*reach)*.1,(heightAt(point.x,point.z)+h)*.1,(point.z-dir.z*reach)*.1)));const hit=ray.intersectObject(target,true)[0];if(!hit)return null;const q=toLocal(hit.point.clone());return {x:q.x*10,z:q.z*10};}
 const pieceOf=id=>{let found=null;group.traverse(o=>{if(!found&&o.userData.motionKey===id&&o!==group)found=o;});return found;};
 // Where each lamp goes: model origin (metres, on the ground plan), its height above the ground there, and its yaw.
 function mount(p){
  if(p.kind==='road')return {kind:'crook-lantern',x:p.x,z:p.z,yaw:p.facing??0,lift:0};
  const place=byId.get(p.placeId);if(!place)return {kind:'post-lantern',x:p.x,z:p.z,yaw:0,lift:0};
  const a=place.angle||0,dir={x:Math.sin(a),z:Math.cos(a)},c=place.world;
  if(place.role==='home'||place.role==='store'){const side=Math.min(.9,place.w*.18),out=local(c,a,side,place.d/2+1.5),hit=wallAt(pieceOf(place.id),out,dir,2.1,place.d/2+1.5)||local(c,a,side,place.d/2);return {kind:'porch-lamp',x:hit.x,z:hit.z,yaw:a,lift:2.1};}
  const gate=place.entry||c,beside={x:gate.x+Math.cos(a)*1.3+dir.x*.3,z:gate.z-Math.sin(a)*1.3+dir.z*.3};
  return {kind:'post-lantern',x:beside.x,z:beside.z,yaw:a,lift:0};
 }
 const extras=[];
 for(const pen of places.filter(p=>p.shelter)){const a=pen.angle||0,dir={x:Math.sin(a),z:Math.cos(a)},s=pen.shelter,c=local(pen.world,a,s.x,s.z);
  let target=null,best=Infinity;group.traverse(o=>{if(/resting shelter|roost/i.test(o.userData.inspect?.title||'')){const w=new T.Vector3().setFromMatrixPosition(o.matrixWorld);toLocal(w);const dd=Math.hypot(w.x*10-c.x,w.z*10-c.z);if(dd<best){best=dd;target=o;}}});
  if(best>s.w)target=null;const side=s.w*.28,lift=Math.min(1.6,s.h?s.h*.6:1.6),hit=wallAt(target,local(c,a,side,s.d/2+1.2),dir,lift,s.d/2+1.2);
  if(hit)extras.push({kind:'porch-lamp',x:hit.x,z:hit.z,yaw:a,lift,placeId:pen.id,extra:'shelter-porch'});}
 for(const play of places.filter(p=>p.role==='playground')){const a=play.angle||0;for(const sx of [-1,1]){const q=local(play.world,a,sx*Math.max(1.4,play.w/2-1.7),play.d/2-.4);extras.push({kind:'string-lights',x:q.x,z:q.z,yaw:a,lift:0,placeId:play.id,extra:'string-lights'});}}
 const plan=[...farmLightLayout(places,{plans:assembly.plans}).map(p=>({...mount(p),placeId:p.placeId,layoutKind:p.kind})),...extras];
 // The light hangs at the lamp's anchor: fixture = anchor's ground point, model offset back by the anchor.
 lampKit().then(kit=>{for(const [i,m]of plan.entries()){
  const lamp=lampInstance(kit,m.kind),A=lamp.anchors.length>1?lamp.anchors.reduce((s,v)=>s.add(v),new T.Vector3()).multiplyScalar(1/lamp.anchors.length):lamp.anchors[0]||new T.Vector3();
  const fx=m.x+A.x*Math.cos(m.yaw)+A.z*Math.sin(m.yaw),fz=m.z-A.x*Math.sin(m.yaw)+A.z*Math.cos(m.yaw),y=heightAt(fx,fz)*.1,base=heightAt(m.x,m.z)*.1;if(!Number.isFinite(y)||!Number.isFinite(base))continue;
  const fixture=new T.Group();fixture.position.set(fx*.1,y,fz*.1);fixture.rotation.y=m.yaw;fixture.name=m.kind;root.add(fixture);
  lamp.object.scale.setScalar(.1);lamp.object.position.set(-A.x*.1,base-y+m.lift*.1,-A.z*.1);fixture.add(lamp.object);
  const bulb=new T.Object3D();bulb.position.set(0,base-y+(m.lift+A.y)*.1,0);fixture.add(bulb);
  const anchors=lamp.anchors.map(v=>v.clone().multiplyScalar(.1).add(lamp.object.position));
  const real=!m.extra,light=real&&i<4?new T.PointLight('#ffc56b',0,2.2,2):null;if(light){light.position.copy(bulb.position);light.castShadow=false;fixture.add(light);}
  let pool=null;if(real){const vertices=[],uvs=[],radius=.65;for(let k=0;k<24;k++){for(const [dx,dz]of [[0,0],[Math.cos(k*Math.PI/12)*radius,Math.sin(k*Math.PI/12)*radius],[Math.cos((k+1)*Math.PI/12)*radius,Math.sin((k+1)*Math.PI/12)*radius]]){const wx=dx*Math.cos(m.yaw)+dz*Math.sin(m.yaw),wz=-dx*Math.sin(m.yaw)+dz*Math.cos(m.yaw);vertices.push(dx,heightAt(fx+wx*10,fz+wz*10)*.1-y+.018,dz);uvs.push(dx/radius/2+.5,dz/radius/2+.5);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));pool=new T.Mesh(geo,poolMaterial);pool.material.side=T.DoubleSide;pool.renderOrder=2;fixture.add(pool);}
  fixtures.push({fixture,placeId:m.placeId,bulb,light,pool,glass:lamp.glass,kind:m.layoutKind||m.extra,lamp:m.kind,anchors});
 }lastUpdate&&update(...lastUpdate);}).catch(e=>console.warn('Lamp kit unavailable',e));
 let lastUpdate=null;
 // For the Weather and clouds thread: every lamp's light centres (LightAnchor nodes) in this group's space, which of
 // them carry a real light or a glow pool, and whether they are lit. Glass glow is the only light this file adds.
 const anchors=()=>fixtures.flatMap(f=>{f.fixture.updateWorldMatrix(true,true);return f.anchors.map((_,k)=>{const v=f.fixture.localToWorld(f.anchors[k].clone());group.worldToLocal(v);return {lamp:f.lamp,kind:f.kind,placeId:f.placeId??null,position:v.toArray(),realLight:!!f.light,pool:!!f.pool,lit:f.bulb.visible};});});
 function update(mode,seconds,nightTime,occupancy=[],{dark=null}={}){lastUpdate=[mode,seconds,nightTime,occupancy,{dark}];
  // With the sky's darkness (0 noon, 1 night) lamps light at sunset, not at 17:00, one after another as if someone
 // walks the round; without it, the old time-of-day modes.
 const lit=dark===null?null:i=>dark>.4+.14*((i*7)%5)/5,strength=dark===null?outdoorLevel(mode):smoothLight(.38,.62,dark);
 // Pools only read once the ground is dark; at dusk they would wash the grass yellow.
 poolMaterial.uniforms.strength.value=dark===null?strength*(mode==='night'?1:.3):strength*(.3+.7*smoothLight(.6,.85,dark));
 const indoors=dark===null?mode!=='day':dark>.45;windows.forEach((m,i)=>{m.emissive.set('#ffc47c');m.emissiveIntensity=owners[i]>=0&&occupancy[owners[i]]?.awake>0&&indoors?1.6:0;});
 fixtures.forEach((f,i)=>{const on=lit?lit(i):strength>0;f.bulb.visible=on;if(f.pool)f.pool.visible=on;if(f.glass)f.glass.emissiveIntensity=on?LAMP_GLOW:0;if(f.light)f.light.intensity=on?strength*(dark===null?(mode==='night'?.9:.35):.35+.55*smoothLight(.6,.85,dark)):0;});return {phase:mode,litFixtures:fixtures.filter(f=>f.bulb.visible).length,roadLanterns:fixtures.filter(f=>f.kind==='road').length,pointLights:fixtures.filter(f=>f.light).length,litHomes:windows.filter(m=>m.emissiveIntensity>.1).length};}
 return {relocatePlace(id,delta){for(const f of fixtures)if(f.placeId===id)f.fixture.position.add(new T.Vector3(...delta).multiplyScalar(.1));},update,anchors};
}
