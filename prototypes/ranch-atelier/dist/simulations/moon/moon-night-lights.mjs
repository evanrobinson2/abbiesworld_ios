import * as T from 'three';
export const baseNightLevel=mode=>mode==='night'?1:mode==='evening'?.65:mode==='morning'?.12:0;
// Reuse registered models/material regions. Light emitters are effects, not new assets.
export function createMoonNightLights(root,plan){
 const materials=[],cache=new Map(),lights=[],beacons=[];
 function register(object,id){
  object.traverse(o=>{if(!o.isMesh)return;const apply=material=>{
   const name=material.name||'',home=['ME-072','ME-082'].includes(id),lab=id==='ME-001';
   const glass=(home&&/Teal/.test(name))||(id==='MR-002'&&/DomeGlass|OrangeBand/.test(name))||(lab&&/Amber/.test(name))||(/^RE-07[35]$/.test(id)&&/ShellGlass/.test(name));
   const guide=id==='RE-074'&&/CradleMark/.test(name),lamp=/Amber|ShellLight|HeadlightGlass|TailLight/.test(name)&&!glass;
   if(!glass&&!guide&&!lamp)return material;
   const key=material.uuid+':'+(glass?'window':guide?'guide':'lamp');if(cache.has(key))return cache.get(key);
   const m=material.clone();m.emissive.set(glass?'#ffcb83':guide?'#7de8ed':'#ffd18b');m.emissiveIntensity=0;m.userData={...m.userData,scienceBaseLight:true};cache.set(key,m);materials.push({m,kind:glass?'window':guide?'guide':'lamp'});return m;
  };o.material=Array.isArray(o.material)?o.material.map(apply):apply(o.material);});
 }
 function install(model){
  const points=[{x:plan.corridor.x+.9,z:plan.corridor.z+.8},{x:plan.home.x+1,z:plan.home.z+.6}];
  for(const p of plan.placements.filter(p=>p.id==='landing'||p.id==='construction-pad'))for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;points.push({x:p.x+Math.cos(a)*(p.radius+.4),z:p.z+Math.sin(a)*(p.radius+.4)});}
  for(const p of points){const beacon=model('ME-010');beacon.position.set(p.x,plan.heightAt(p.x,p.z),p.z);beacon.userData.inspect={title:'Navigation beacon',kind:'Base lighting',description:'Registered surface beacon marking a route or landing approach.'};root.add(beacon);beacons.push(beacon);}
  for(const p of plan.placements.filter(p=>p.id==='habitat'||p.id==='lab')){const light=new T.PointLight('#ffd092',0,1.45,2);light.position.set(p.x,plan.heightAt(p.x,p.z)+2.5,p.z+2.7);light.castShadow=false;root.add(light);lights.push(light);}
 }
 function marker(object){const m=object.material;m.emissive.set('#e9bd79');materials.push({m,kind:'path',external:true});}
 return {register,install,marker,update(mode,seconds=0){const level=baseNightLevel(mode);for(const {m,kind}of materials)m.emissiveIntensity=kind==='window'?level*1.3:kind==='guide'?level*1.6:kind==='path'?level*.55:(.08+level*1.7)*(1-.05*Math.sin(seconds*2));for(const light of lights){light.visible=level>.01;light.intensity=.09*level;}return {nightLevel:level,glowingSurfaces:materials.filter(({m})=>m.emissiveIntensity>.1).length,beacons:beacons.length,localLights:level>.01?lights.length:0};},dispose(){for(const {m,external}of materials)if(!external)m.dispose();for(const light of lights){root.remove(light);light.dispose();}for(const beacon of beacons)root.remove(beacon);materials.length=0;cache.clear();}};
}
