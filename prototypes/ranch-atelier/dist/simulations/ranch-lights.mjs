import * as T from 'three';
export function houseLightLevel(mode,seconds,index){
 if(mode==='day')return 0;
 if(mode==='evening')return .8;
 if(mode==='morning')return index%3===0?.35:0;
 const t=((seconds%180)+180)%180,bedtime=28+(index*17)%55,wake=145+(index*7)%22;
 if(t<bedtime)return 1;if(t<bedtime+5)return 1-(t-bedtime)/5;
 if(t>wake)return Math.min(.65,(t-wake)/8);return 0;
}
export {outdoorLevel,farmLightLayout} from './farm-light-layout.mjs';
import {outdoorLevel,farmLightLayout} from './farm-light-layout.mjs';
export function createFarmLights(group,places,heightAt,assembly={plans:[]}){
 const homes=places.filter(p=>p.role==='home'),windows=[],owners=[],fixtures=[];
 group.updateWorldMatrix(true,true);group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.userData.homeWindow&&!windows.includes(m)){windows.push(m);const c=new T.Box3().setFromObject(o).getCenter(new T.Vector3());owners.push(homes.length?homes.reduce((best,h,i)=>Math.hypot(c.x-h.world.x*.1,c.z-h.world.z*.1)<Math.hypot(c.x-homes[best].world.x*.1,c.z-homes[best].world.z*.1)?i:best,0):-1);}});
 const root=new T.Group();root.name='Farm night lighting';group.add(root);
 const dark=new T.MeshStandardMaterial({color:'#4b4639',roughness:.85}),glow=new T.MeshBasicMaterial({color:'#ffce87',toneMapped:false});
 const poleGeometry=new T.CylinderGeometry(.009,.013,.22,6),capGeometry=new T.ConeGeometry(.045,.035,6),bulbGeometry=new T.BoxGeometry(.035,.045,.035);
 const poolMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:'varying vec2 lampUV;void main(){lampUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 lampUV;uniform float strength;void main(){float r=length(lampUV-.5)*2.;float a=pow(max(0.,1.-r*r),2.)*strength;gl_FragColor=vec4(vec3(1.,.65,.27),a*.24);}'});
 for(const [i,p]of farmLightLayout(places,{plans:assembly.plans}).entries()){
  const x=p.x*.1,z=p.z*.1,y=heightAt(p.x,p.z)*.1;if(!Number.isFinite(y))continue;const fixture=new T.Group();fixture.position.set(x,y,z);root.add(fixture);
  const pole=new T.Mesh(poleGeometry,dark);pole.position.y=.11;fixture.add(pole);const cap=new T.Mesh(capGeometry,dark);cap.position.y=.27;fixture.add(cap);const bulb=new T.Mesh(bulbGeometry,glow);bulb.position.y=.235;fixture.add(bulb);
  const light=i<8?new T.PointLight('#ffcc88',0,2.2,2):null;if(light){light.position.y=.235;light.castShadow=false;fixture.add(light);}
  const vertices=[],uvs=[],radius=.65;for(let k=0;k<24;k++){for(const [dx,dz]of [[0,0],[Math.cos(k*Math.PI/12)*radius,Math.sin(k*Math.PI/12)*radius],[Math.cos((k+1)*Math.PI/12)*radius,Math.sin((k+1)*Math.PI/12)*radius]]){vertices.push(dx,heightAt(p.x+dx*10,p.z+dz*10)*.1-y+.018,dz);uvs.push(dx/radius/2+.5,dz/radius/2+.5);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));const pool=new T.Mesh(geo,poolMaterial);pool.material.side=T.DoubleSide;pool.renderOrder=2;fixture.add(pool);fixtures.push({fixture,placeId:p.placeId,bulb,light,pool,kind:p.kind});
 }
 return {relocatePlace(id,delta){for(const f of fixtures)if(f.placeId===id)f.fixture.position.add(new T.Vector3(...delta).multiplyScalar(.1));},update(mode,seconds,nightTime,occupancy=[]){const strength=outdoorLevel(mode);poolMaterial.uniforms.strength.value=strength;windows.forEach((m,i)=>{m.emissive.set('#ffc47c');m.emissiveIntensity=owners[i]>=0&&occupancy[owners[i]]?.awake>0&&mode!=='day'?1.6:0;});for(const f of fixtures){f.bulb.visible=strength>0;f.pool.visible=strength>0;if(f.light)f.light.intensity=strength*.9;}return {phase:mode,litFixtures:strength?fixtures.length:0,roadLanterns:fixtures.filter(f=>f.kind==='road').length,pointLights:Math.min(8,fixtures.length),litHomes:windows.filter(m=>m.emissiveIntensity>.1).length};}};
}
