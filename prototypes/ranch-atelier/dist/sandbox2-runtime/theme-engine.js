/* Theme composition and Three.js adapters. Original asset data is never changed. */
const KEY='ranch-theme-v1',IDENTITY=new Set(['skin','hair','fur']),WEAR=new Set(['bark','roof','plaster','timber','metal','fabric','soil']);
const materialEffects=new WeakMap();
let contract=null,state={version:2,preset:'original',season:'original',weathering:0,bloom:0,palette:{},recolorIdentity:false};
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v),clamp=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(1,Number(v))):0;
function clean(value={}){value=value&&typeof value==='object'?value:{};const palette={};for(const [k,v] of Object.entries(value.palette||{}))if(contract?.roles[k]&&hex(v))palette[k]=v.toLowerCase();return {version:2,preset:contract?.presets.some(p=>p.id===value.preset)?value.preset:'custom',season:contract?.seasons[value.season]?value.season:'original',weathering:clamp(value.weathering),bloom:clamp(value.bloom),palette,recolorIdentity:value.recolorIdentity===true};}
export function getTheme(){return structuredClone(state)}
export async function initTheme(url='/theme-contract.json'){if(!contract){const r=await fetch(url);if(!r.ok)throw Error('Theme directions could not be loaded');contract=await r.json();try{state=clean(JSON.parse(localStorage.getItem(KEY))||state)}catch{state=clean(state)}}return structuredClone(contract)}
export function setTheme(value,{persist=true}={}){if(!contract)throw Error('Call initTheme first');state=clean(value);let saved=true;if(persist)try{localStorage.setItem(KEY,JSON.stringify(state))}catch{saved=false}window.dispatchEvent(new CustomEvent('ranch-theme-change',{detail:getTheme()}));return {theme:getTheme(),saved};}
export function usePreset(id){const p=contract?.presets.find(p=>p.id===id);if(!p)throw Error('Unknown theme');return setTheme({...p,preset:p.id,recolorIdentity:state.recolorIdentity})}
export function resetTheme(){return setTheme({preset:'original',palette:{},recolorIdentity:false})}
export function composePalette(theme=state){return {...(contract?.seasons[theme.season]?.palette||{}),...(theme.palette||{})}}
export function resolveColor(part,theme=state){const original=part.color||part.defaultColor||[1,1,1],role=part.role;if(!role||role==='unmapped'||(IDENTITY.has(role)&&!theme.recolorIdentity))return [...original];const color=composePalette(theme)[role];const rgb=hex(color)?[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255):[...original];if(WEAR.has(role)){const w=clamp(theme.weathering)*.32,gray=rgb[0]*.3+rgb[1]*.5+rgb[2]*.2;return rgb.map(c=>c*(1-w)+(gray*.7+.3)*w)}return rgb;}
export function isBloomEligible(part){return part?.role==='foliage'&&/^Rounded canopy(?:\.\d+)?$/.test(part.surfaceName||part.name||'')}
function weatherMaterial(material,part,theme){
 const amount=WEAR.has(part.role)?clamp(theme.weathering):0;
 if(!materialEffects.has(material)){
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey.bind(material);
  const wear={value:amount};materialEffects.set(material,{uniform:wear,roughness:material.roughness});
  material.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.ranchWear=wear;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ranchSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nranchSurface = position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 ranchSurface;\nuniform float ranchWear;\nfloat ranchHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat ranchNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(ranchHash(i),ranchHash(i+vec3(1,0,0)),f.x),mix(ranchHash(i+vec3(0,1,0)),ranchHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ranchHash(i+vec3(0,0,1)),ranchHash(i+vec3(1,0,1)),f.x),mix(ranchHash(i+vec3(0,1,1)),ranchHash(i+vec3(1,1,1)),f.x),f.y),f.z);}').replace('#include <color_fragment>','#include <color_fragment>\nfloat ranchGrain = 0.65*ranchNoise(ranchSurface*5.0)+0.35*ranchNoise(ranchSurface*19.0);\ndiffuseColor.rgb *= 1.0-ranchWear*(0.03+0.22*smoothstep(0.25,0.8,ranchGrain));');};
  const key=cache();material.customProgramCacheKey=()=>key+'-ranch-wear-v2';material.needsUpdate=true;
 }
 const wear=materialEffects.get(material);wear.uniform.value=amount;if(typeof wear.roughness==='number')material.roughness=wear.roughness+(1-wear.roughness)*amount;
}
function blossoms(mesh,THREE,theme){
 const eligible=isBloomEligible(mesh.userData.themeSurface),amount=eligible?clamp(theme.bloom):0;
 const color=contract?.seasons[theme.season]?.blossomColor||'#f5cbd4',key=amount+':'+color;
 if(mesh.userData.ranchBloomKey===key)return;
 for(const child of [...mesh.children])if(child.userData.ranchBlossoms){mesh.remove(child);child.geometry.dispose();child.material.dispose()}
 mesh.userData.ranchBloomKey=key;if(!amount)return;
 const geometry=mesh.geometry;geometry.computeBoundingBox();const box=geometry.boundingBox,center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).multiplyScalar(.5),count=Math.round(amount*24);
 if(!count)return;
 const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshStandardMaterial({color,roughness:.85}),count*5);
 petals.userData.ranchBlossoms=true;petals.name='Seasonal blossom petals';
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),normal=new THREE.Vector3(),q=new THREE.Quaternion();
 const size=Math.min(radius.x,radius.y,radius.z)*.085;
 for(let i=0;i<count;i++){
  const y=.12+.84*(i+.5)/count,a=i*2.39996323,h=Math.sqrt(1-y*y);normal.set(Math.cos(a)*h,y,Math.sin(a)*h);q.setFromUnitVectors(up,normal);
  const anchor=normal.clone().multiply(radius).multiplyScalar(1.015).add(center);
  for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;dummy.position.set(Math.cos(angle)*size*.72,0,Math.sin(angle)*size*.72).applyQuaternion(q).add(anchor);dummy.quaternion.copy(q);dummy.scale.set(size*.67,size*.26,size*.67);dummy.updateMatrix();petals.setMatrixAt(i*5+j,dummy.matrix)}
 }
 petals.instanceMatrix.needsUpdate=true;mesh.add(petals);
}
export function applyToThree(group,THREE,theme=state){const meshes=[];group.traverse(mesh=>{if(mesh.userData?.themeSurface&&mesh.material?.color)meshes.push(mesh)});for(const mesh of meshes){const part=mesh.userData.themeSurface;mesh.material.color.setRGB(...resolveColor(part,theme),THREE.SRGBColorSpace);weatherMaterial(mesh.material,part,theme);blossoms(mesh,THREE,theme)}return meshes.length;}
export const RanchThemes={initTheme,getTheme,setTheme,usePreset,resetTheme,composePalette,resolveColor,isBloomEligible,applyToThree};
if(typeof window!=='undefined'){window.RanchThemes=RanchThemes;window.addEventListener('storage',e=>{if(e.key===KEY&&contract){try{state=clean(JSON.parse(e.newValue)||{preset:'original'});window.dispatchEvent(new CustomEvent('ranch-theme-change',{detail:getTheme()}))}catch{}}});}

