import * as T from 'three';
// Transient construction UI, not an asset or an inhabitant. No fake production readout.
export function constructionBoundary(tile,diameter,heightAt){
 const group=new T.Group();group.name='AI construction boundary';group.userData.aiBoundary=true;
 const radius=diameter*.048,center=tile.center;
 for(let e=0;e<6;e++)for(let i=0;i<12;i++){
  const a=e*Math.PI/3,b=(e+1)*Math.PI/3,t0=i/12,t1=(i+1)/12;
  const x0=radius*(Math.sin(a)*(1-t0)+Math.sin(b)*t0),z0=radius*(Math.cos(a)*(1-t0)+Math.cos(b)*t0),x1=radius*(Math.sin(a)*(1-t1)+Math.sin(b)*t1),z1=radius*(Math.cos(a)*(1-t1)+Math.cos(b)*t1);
  const y=heightAt(center.x+(x0+x1)*5,center.z+(z0+z1)*5)*.1+.12;
  const strip=new T.Mesh(new T.PlaneGeometry(Math.hypot(x1-x0,z1-z0)+.006,.055),new T.MeshBasicMaterial({color:i%2?'#39362f':'#efc951',side:T.DoubleSide}));
  strip.position.set((x0+x1)/2,y,(z0+z1)/2);strip.rotation.y=-Math.atan2(z1-z0,x1-x0);strip.raycast=()=>{};group.add(strip);
 }
 return group;
}
export function materialize(group,{reducedMotion=false}={}){
 const parts=group.children.filter(o=>o.visible&&!o.userData.aiBoundary),original=parts.map(o=>o.scale.clone());
 const box=new T.Box3().setFromObject(group),height=Math.max(.2,box.max.y-box.min.y),beam=new T.Mesh(new T.CylinderGeometry(.018,.018,1,6),new T.MeshBasicMaterial({color:'#ff694f',transparent:true,opacity:.9,depthWrite:false}));
 beam.raycast=()=>{};group.add(beam);
 const dust=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(new Float32Array(36*3),3)),new T.PointsMaterial({color:'#d9c69e',size:.09,transparent:true,opacity:.75,depthWrite:false}));dust.raycast=()=>{};group.add(dust);
 let time=0,done=false;const duration=reducedMotion?0:2.6;parts.forEach(o=>o.visible=false);
 const finish=()=>{if(done)return;parts.forEach((o,i)=>{o.visible=true;o.scale.copy(original[i]);});group.remove(beam,dust);beam.geometry.dispose();beam.material.dispose();dust.geometry.dispose();dust.material.dispose();done=true;};
 return {get done(){return done;},get progress(){return duration?Math.min(1,time/duration):1;},finish,update(dt){if(done)return;time+=Math.max(0,dt);if(time>=duration){finish();return;}const progress=time/duration*parts.length,index=Math.min(parts.length-1,Math.floor(progress));parts.forEach((o,i)=>{o.visible=i<=index;if(i<=index)o.scale.copy(original[i]).multiplyScalar(i===index ? .08+.92*(progress-index) : 1);});const target=parts[index]?.position||new T.Vector3(),beamHeight=Math.max(.1,height+1-target.y);beam.position.set(target.x,target.y+beamHeight/2,target.z);beam.scale.y=beamHeight;const positions=dust.geometry.attributes.position;for(let i=0;i<positions.count;i++){const a=i*2.4+time*2,life=(time*1.6+i/positions.count)%1;positions.setXYZ(i,target.x+Math.cos(a)*life*.25,target.y+life*.35,target.z+Math.sin(a)*life*.25);}positions.needsUpdate=true;}};
}
