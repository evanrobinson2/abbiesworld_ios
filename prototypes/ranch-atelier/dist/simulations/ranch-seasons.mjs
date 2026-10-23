import * as T from 'three';
import {SEASONS,seasonalState} from './ranch-seasons-state.mjs';
const uniforms={seasonColor:{value:new T.Color()},seasonSnow:{value:0},seasonLeaf:{value:1},ecologyYear:{value:0},windTime:{value:0},windStrength:{value:0}};
const attached=new WeakSet();let deciduous=[];
// The weather's wind for shaders that sway on their own (ranch-ground-cover.mjs), set by setEcologyYear.
export const windUniforms={windTime:uniforms.windTime,windStrength:uniforms.windStrength};
export function setEcologyYear(year,time=0,strength=0){uniforms.ecologyYear.value=year;uniforms.windTime.value=time;uniforms.windStrength.value=strength;}
export function setSeasonAppearance(phase){const s=seasonalState(phase);uniforms.seasonColor.value.set(SEASONS[s.index].color).lerp(new T.Color(SEASONS[s.next].color),s.blend);uniforms.seasonSnow.value=s.snow;uniforms.seasonLeaf.value=s.leaf;for(const mesh of deciduous)mesh.visible=s.leaf>=.12;return s;}
export function attachSeasons(group){deciduous=[];group.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
 const role=m.userData.seasonRole||(m.userData.dorfRole==='groundcover'?'meadow':m.userData.dorfRole==='foliage'?'deciduous':m.userData.dorfRole==='roof'?'roof':null);if(role==='deciduous')deciduous.push(o);if(!role||attached.has(m))continue;attached.add(m);
 const previous=m.onBeforeCompile,key=m.customProgramCacheKey();m.onBeforeCompile=function(s,r){previous.call(this,s,r);Object.assign(s.uniforms,uniforms);s.vertexShader='uniform float windTime;uniform float windStrength;uniform float ecologyYear;varying float plantPhase;varying float seasonalUp;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nseasonalUp=normal.y;plantPhase=position.x*.17+position.z*.13;');if(['meadow','deciduous'].includes(role)&&!m.userData.ownWind)s.vertexShader=s.vertexShader.replace('plantPhase=position.x*.17+position.z*.13;','plantPhase=position.x*.17+position.z*.13;transformed.x+=sin(windTime*.8+plantPhase)*windStrength*.025;');s.fragmentShader='uniform float ecologyYear;varying float plantPhase;varying float seasonalUp;uniform vec3 seasonColor;uniform float seasonSnow;uniform float seasonLeaf;\n'+s.fragmentShader;
 let effect=role==='deciduous'?`if(seasonLeaf<.12)discard;diffuseColor.rgb=mix(diffuseColor.rgb,seasonColor,.82);`:role==='meadow'?`float renewal=.65+.35*sin(ecologyYear*6.283+plantPhase);diffuseColor.rgb=mix(diffuseColor.rgb,seasonColor,.45)*renewal;` : '';
 if(role!=='deciduous')effect+=`diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.92,.91),seasonSnow*${role==='ground'?'.94':'.8'}*smoothstep(.05,.55,seasonalUp)${m.userData.seasonPaths?'*(1.-pathMask*.7)':''});`;
 s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>',effect+'\n#include <lights_physical_fragment>');};m.customProgramCacheKey=()=>key+'-season-'+role;m.needsUpdate=true;
 }});}
