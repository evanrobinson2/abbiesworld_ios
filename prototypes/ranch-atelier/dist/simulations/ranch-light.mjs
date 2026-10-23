import * as T from './vendor/three.module.js';
// The Ranch's light grammar (docs/oracle/aesthetic, remaster study R5). One signal, the sun's height plus the weather,
// picks every colour: the paper sky around the board (a glow near the board, deeper toward the edge), the key light,
// the sky-blue shadow fill and the moonlight. Day paper, apricot golden hour, ink-blue night; weather pulls it all
// toward slate. Pure colour maths, called once per clock tick: no textures, no extra lights.
const c=hex=>new T.Color(hex);
const P={
 dayGlow:c('#f3ead6'),dayEdge:c('#d8ccb2'),duskGlow:c('#f2b688'),duskEdge:c('#a67a7c'),
 nightGlow:c('#34405f'),nightEdge:c('#141a2b'),slateGlow:c('#9aa3ae'),slateEdge:c('#5e6874'),
 sunWhite:c('#fff6e5'),sunGold:c('#ffb45e'),sunStorm:c('#aeb8c4'),
 // Hemisphere: sky-blue fill so shadows read blue (#5a6a8c on the ground), moonlit blue at night.
 fillDay:c('#b7c8ea'),fillDusk:c('#f4c99a'),fillNight:c('#8ea6e4'),fillStorm:c('#aeb8c4'),
 groundDay:c('#927448'),groundNight:c('#2c3048'),moon:c('#a8c4f0')
};
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function ranchLight(light,{overcast=0,storm=0}={}){
 const day=light.daylight,dusk=light.warmth*smooth(.05,.6,day),grey=Math.max(0,overcast-.15)/.85*.65*day;
 const glow=P.dayGlow.clone().lerp(P.duskGlow,dusk).lerp(P.nightGlow,1-day).lerp(P.slateGlow,grey).multiplyScalar(1-.4*storm);
 const edge=P.dayEdge.clone().lerp(P.duskEdge,dusk).lerp(P.nightEdge,1-day).lerp(P.slateEdge,grey).multiplyScalar(1-.45*storm);
 const sun=P.sunWhite.clone().lerp(P.sunGold,Math.min(1,light.warmth*1.25)*(1-.7*storm)).lerp(P.sunStorm,storm*.55);
 const fill=P.fillDay.clone().lerp(P.fillDusk,dusk*.7).lerp(P.fillNight,1-day).lerp(P.fillStorm,overcast*.35);
 const ground=P.groundDay.clone().lerp(P.groundNight,1-day);
 return {glow,edge,sun,fill,ground,moon:P.moon,dusk,
  // Night keeps a blue moonlit floor of light instead of sinking to green-black.
  fillIntensity:(.85+.8*day+.7*dusk)*(1-.3*storm),exposure:(.92+.16*day)*(1-.1*storm),
  // Golden hour: the low sun grazes the land, so it burns brighter and warmer to keep the gold on the grass.
  sunBoost:1+1.6*light.warmth*smooth(.1,.5,day)};
}
// An unlit floor that fades from the glow colour around the board to the edge colour: the paper sky the tile floats in.
export function glowFloorMaterial(){
 const material=new T.MeshBasicMaterial({color:'#efe5cf',toneMapped:false});
 const uniforms={edgeColor:{value:new T.Color('#d8ccb2')},glowCentre:{value:new T.Vector2()},glowRadius:{value:20}};
 material.userData.glow=uniforms;
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGlowXZ;').replace('#include <project_vertex>','#include <project_vertex>\nvGlowXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vGlowXZ;uniform vec3 edgeColor;uniform vec2 glowCentre;uniform float glowRadius;')
   .replace('vec4 diffuseColor = vec4( diffuse, opacity );','float glowT=smoothstep(glowRadius*.35,glowRadius*2.2,length(vGlowXZ-glowCentre));vec4 diffuseColor=vec4(mix(diffuse,edgeColor,glowT),opacity);');};
 return material;
}
