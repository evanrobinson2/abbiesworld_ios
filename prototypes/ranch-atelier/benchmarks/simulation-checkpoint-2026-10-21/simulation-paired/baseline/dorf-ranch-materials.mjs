// Ranch adaptation of dorf-materials.js, tree shader1084/002-ps and
// house shader1112/004-ps. Retains reconstructed gradient/overlay/facing math.
// Ranch lacks original UV paint/mask textures and vertex material IDs:
// use its semantic material roles and metre-space noise instead. No fake AO.
const applied=new WeakSet();
export function applyDorfRanch(group){let count=0;
 group.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){const role=m?.userData?.dorfRole;
 if(!['foliage','roof','plaster','timber','clay','ground'].includes(role))continue;count++;if(applied.has(m)||m.userData.dorfReconstruction==='ranch-adaptation-v1')continue;applied.add(m);
 const previous=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(s,r){previous.call(this,s,r);
 s.vertexShader='varying vec3 vDorfPosition; varying float vDorfUp;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDorfPosition=position;vDorfUp=normal.y;');
 s.fragmentShader=`varying vec3 vDorfPosition;varying float vDorfUp;
 vec2 dorfGrad(vec2 p){p=mod(p,289.);float x=mod((34.*p.x+1.)*p.x,289.)+p.y;x=mod((34.*x+1.)*x,289.);x=fract(x/41.)*2.-1.;return normalize(vec2(x-floor(x+.5),abs(x)-.5));}
 float dorfNoise(vec2 p){vec2 i=floor(p),f=fract(p);float a=dot(dorfGrad(i),f),b=dot(dorfGrad(i+vec2(0,1)),f-vec2(0,1)),c=dot(dorfGrad(i+vec2(1,0)),f-vec2(1,0)),d=dot(dorfGrad(i+1.),f-1.);vec2 w=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(a,b,w.y),mix(c,d,w.y),w.x)+.5;}
 `+s.fragmentShader;
 // Run after path blending, before physical lighting; shadows remain intact.
 const foliage=role==='foliage';
 const code=foliage?`
 float dn=clamp(dorfNoise(vDorfPosition.xz*2.8+vDorfPosition.y*.8),0.,1.);
 vec3 dc=diffuseColor.rgb*mix(vec3(.78,.88,.82),vec3(1.14,1.1,.91),dn);
 vec3 over=mix(4.*dc*dc,1.-2.*(1.-dc)*(1.-2.*dc),step(vec3(.500001),dc));
 float facing=clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.);
 dc-=vDorfUp*pow(1.-facing,.64)*(over-dc)*.36;
 float edge=smoothstep(.48,.78,pow(1.-facing,1.8));
 diffuseColor.rgb=max(vec3(.015),mix(dc,dc*vec3(.48,.63,.49),edge*.42));
 `:`
 float dp=dorfNoise(vDorfPosition.xz*3.1+vDorfPosition.y*1.7);
 vec3 remapped=vec3(mix(.43,.58,clamp(dp,0.,1.)));
 vec3 base=diffuseColor.rgb;
 vec3 over=mix(2.*base*remapped,1.-2.*(1.-base)*(1.-remapped),step(vec3(.500001),base));
 diffuseColor.rgb=mix(base,over,${role==='ground'?'.22':'.65'});
 `;
 s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>',code+'\n#include <lights_physical_fragment>');
 };
 m.customProgramCacheKey=()=>key+'-dorf-ranch-v1-'+role;m.needsUpdate=true;m.userData.dorfReconstruction='ranch-adaptation-v1';
 }});return count;
}
