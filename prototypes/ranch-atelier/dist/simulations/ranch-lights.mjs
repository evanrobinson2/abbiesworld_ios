import * as T from 'three';
export function houseLightLevel(mode,seconds,index){
 if(mode==='day')return 0;
 if(mode==='evening')return .8;
 if(mode==='morning')return index%3===0?.35:0;
 const t=((seconds%180)+180)%180,bedtime=28+(index*17)%55,wake=145+(index*7)%22;
 if(t<bedtime)return 1;if(t<bedtime+5)return 1-(t-bedtime)/5;
 if(t>wake)return Math.min(.65,(t-wake)/8);return 0;
}
export function createFarmLights(group,places,heightAt){
 const homes=places.filter(p=>p.role==='home'),windows=[],owners=[],fixtures=[];
 group.updateWorldMatrix(true,true);group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.homeWindow&&!windows.includes(m)){windows.push(m);const center=new T.Box3().setFromObject(o).getCenter(new T.Vector3());owners.push(homes.reduce((best,h,i)=>Math.hypot(center.x-h.world.x*.1,center.z-h.world.z*.1)<Math.hypot(center.x-homes[best].world.x*.1,center.z-homes[best].world.z*.1)?i:best,0));}});
 const root=new T.Group();root.name='Farm night lighting';group.add(root);
 for(const [i,p]of places.filter(p=>['home','store','water-source'].includes(p.role)).entries()){
  const point=p.entry||p.world,x=point.x*.1,z=point.z*.1,y=heightAt(point.x,point.z)*.1;
  const fixture=new T.Group();fixture.position.set(x,y+.16,z);root.add(fixture);
  const bulb=new T.Mesh(new T.SphereGeometry(.022,8,6),new T.MeshBasicMaterial({color:'#ffc476',toneMapped:false}));fixture.add(bulb);
  const cap=new T.Mesh(new T.CylinderGeometry(.035,.035,.015,8),new T.MeshStandardMaterial({color:'#4d503e'}));cap.position.y=.03;fixture.add(cap);
  const light=i<8?new T.PointLight('#ffc17a',0,1.25,2):null;if(light)fixture.add(light);
  fixtures.push({bulb,light,home:p.role==='home',index:homes.indexOf(p)});
 }
 let previous=null,start=0;
 return {update(mode,seconds,nightTime,occupancy=[]){if(mode!==previous){previous=mode;start=seconds;}const elapsed=nightTime??seconds-start;
  const level=i=>occupancy.length?(occupancy[i%occupancy.length]?.awake>0&&mode!=='day'?.8:0):0;
  windows.forEach((m,i)=>{m.emissive.set('#ffc47c');m.emissiveIntensity=level(owners[i])*2;});
  let lit=0;for(const f of fixtures){const strength=f.home?level(f.index)*.7:mode==='night'?.3:mode==='evening'?.45:0;f.bulb.visible=strength>0;if(f.light)f.light.intensity=strength*.32;if(strength>.15)lit++;}
  return {phase:mode==='night'?(elapsed%180<60?'Settling in':elapsed%180<145?'Quiet hours':'Early risers'):mode,litFixtures:lit,litHomes:windows.filter(m=>m.emissiveIntensity>.1).length};
 }};
}
