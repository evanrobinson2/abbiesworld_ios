import * as T from './vendor/three.module.js';
// Shared uniforms change palette without regenerating terrain or allocating materials.
export function createWorldAppearance(){
 const patched=new WeakSet(),colors=Object.fromEntries(['ground','foliage','roof','plaster','timber','neutral'].map(k=>[k,{value:new T.Color()}]));
 const strength={value:.35},paper=new T.Color(),air=new T.Color(),earth=new T.Color();let name='Sunroom';
 function setTheme(t){name=t[0];paper.set(t[5]);air.set(t[12]);earth.set(t[11]);colors.ground.value.set(t[11]);colors.foliage.value.set(t[11]).multiplyScalar(.75);colors.roof.value.set(t[12]);colors.plaster.value.set(t[5]);colors.timber.value.set(t[13]);colors.neutral.value.set(t[13]);}
 function attach(group){group?.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m?.color||m.isShaderMaterial||patched.has(m))continue;patched.add(m);const role=m.userData?.dorfRole||m.userData?.seasonRole,kind=['groundcover','meadow','deciduous','evergreen'].includes(role)?'foliage':['ground','foliage','roof','plaster','timber'].includes(role)?role:'neutral',previous=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){previous.call(this,shader,renderer);shader.uniforms.worldPalette=colors[kind];shader.uniforms.worldPaletteStrength=strength;if(shader.fragmentShader.includes('uniform vec3 worldPalette;'))return;shader.fragmentShader='uniform vec3 worldPalette;uniform float worldPaletteStrength;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`float themeLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 vec3 themeColor=worldPalette*themeLuma/max(.08,dot(worldPalette,vec3(.2126,.7152,.0722)));
 diffuseColor.rgb=mix(diffuseColor.rgb,themeColor,worldPaletteStrength*${kind==='neutral'?'.35':'1.'}*(1.-smoothstep(.65,.95,themeLuma)));
 #include <lights_physical_fragment>`);};m.customProgramCacheKey=()=>key+'-world-palette-'+kind;m.needsUpdate=true;
 }});}
 function light(sun,sky,fill,floor){sun.color.lerp(paper,.16);sky.color.lerp(air,.24);sky.groundColor.lerp(earth,.3);fill.color.lerp(air,.16);if(floor.visible)floor.material.color.lerp(earth,.24);}
 return {setTheme,attach,light,get palette(){return {name,sky:air,horizon:paper};}};
}
