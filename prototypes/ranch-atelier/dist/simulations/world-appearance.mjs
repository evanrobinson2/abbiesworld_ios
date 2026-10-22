import * as T from './vendor/three.module.js';
// Shared uniforms change palette without regenerating terrain or allocating materials.
export function createWorldAppearance({vibrancy=0}={}){
 const patched=new WeakSet(),colors=Object.fromEntries(['ground','foliage','roof','plaster','timber','neutral'].map(k=>[k,{value:new T.Color()}]));
 const chroma={value:1+vibrancy},strength={value:vibrancy?.18:.35},paper=new T.Color(),air=new T.Color(),earth=new T.Color();let name='Sunroom';
 function setTheme(t){name=t[0];const pop=name==='Cartoon Pop';strength.value=pop?.82:(vibrancy?.18:.35);chroma.value=pop?1.65:1+vibrancy;paper.set(t[5]);air.set(t[12]);earth.set(t[11]);colors.ground.value.set(t[11]);colors.foliage.value.set(t[11]).multiplyScalar(.75);colors.roof.value.set(t[12]);colors.plaster.value.set(t[5]);colors.timber.value.set(t[13]);colors.neutral.value.set(t[13]);if(pop){colors.foliage.value.set('#24b94d');colors.roof.value.set('#f25368');colors.plaster.value.set('#ffe7a1');colors.timber.value.set('#b66b28');}}
 function attach(group){group?.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.color||m.isShaderMaterial||patched.has(m))continue;patched.add(m);const role=m.userData?.dorfRole||m.userData?.seasonRole,kind=['groundcover','meadow','deciduous','evergreen'].includes(role)?'foliage':['ground','foliage','roof','plaster','timber'].includes(role)?role:'neutral',previous=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.worldPalette=colors[kind];shader.uniforms.worldPaletteStrength=strength;shader.uniforms.worldChroma=chroma;if(shader.fragmentShader.includes('uniform vec3 worldPalette;'))return;shader.fragmentShader='uniform vec3 worldPalette;uniform float worldPaletteStrength;uniform float worldChroma;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`float themeLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 vec3 themeColor=worldPalette*themeLuma/max(.08,dot(worldPalette,vec3(.2126,.7152,.0722)));
 diffuseColor.rgb=mix(vec3(themeLuma),diffuseColor.rgb,worldChroma);
 diffuseColor.rgb=max(vec3(0.),mix(diffuseColor.rgb,themeColor,worldPaletteStrength*${kind==='neutral'?'.35':'1.'}*(1.-smoothstep(.65,.95,themeLuma))));
 diffuseColor.rgb*=1.-vBakedShade;
 #include <lights_physical_fragment>`);
 // Contact shade baked by ranch-composer's batchTile; an absent attribute reads as 0.
 shader.fragmentShader='varying float vBakedShade;\n'+shader.fragmentShader;shader.vertexShader='attribute float bakedShade;varying float vBakedShade;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBakedShade=bakedShade;');};m.customProgramCacheKey=()=>key+'-world-palette-contact-'+kind;m.needsUpdate=true;
 }});}
 function light(sun,sky,fill,floor){sun.color.lerp(paper,.16);sky.color.lerp(air,.24);sky.groundColor.lerp(earth,.3);fill.color.lerp(air,.16);if(floor.visible)floor.material.color.lerp(earth,.24);}
 return {setTheme,attach,light,get palette(){return {name,sky:air,horizon:paper};}};
}
