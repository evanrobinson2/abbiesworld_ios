import * as T from 'three';
import {MATERIAL_ROLES,VISUAL_PROFILE,canonicalMaterialRole} from './material-policy.js';
const cache=new Map(),uniforms=new WeakMap(),prepared=new WeakSet();
export const isProfileMaterial=material=>prepared.has(material);
let emphasisActive=false;
// No new textures or procedural grain. Preserve coordinates used by path blending.
export function attachMaterialProfile(material,role='plain'){
 const policy=MATERIAL_ROLES[role]||MATERIAL_ROLES.plain,previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 prepared.add(material);
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  if(shader.uniforms?.ranchEmphasisPass){const list=uniforms.get(this)||[];list.push(shader.uniforms.ranchEmphasisPass);uniforms.set(this,list);return;}
  shader.vertexShader='attribute vec3 paintPosition; varying vec3 vPaintPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPaintPosition=paintPosition;');
  shader.fragmentShader='varying vec3 vPaintPosition; uniform float ranchEmphasisPass;\n'+shader.fragmentShader;
  const uniform={value:emphasisActive&&!this.transparent?1:0};
  shader.uniforms ||= {};shader.uniforms.ranchEmphasisPass=uniform;
  const list=uniforms.get(this)||[];list.push(uniform);uniforms.set(this,list);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>\n#ifndef USE_TRANSMISSION\nif(ranchEmphasisPass>0.5)gl_FragColor.a=${policy.emphasis.toFixed(2)};\n#endif`);
 };
 material.customProgramCacheKey=()=>VISUAL_PROFILE+'-'+role+'-'+previousKey;
 material.userData={...material.userData,dorfRole:role,visualProfile:VISUAL_PROFILE};
 return material;
}
export function ranchMaterial(color,role='plain'){
 role=canonicalMaterialRole(role)||'plain';
 const c=color instanceof T.Color?color:new T.Color(color),key=role+c.getHexString();
 if(cache.has(key))return cache.get(key);
 const p=MATERIAL_ROLES[role];
 const m=attachMaterialProfile(new T.MeshStandardMaterial({color:c,roughness:p.roughness,metalness:p.metalness}),role);
 m.userData.shared=true;cache.set(key,m);return m;
}
export function setEmphasisPass(scene,enabled){
 emphasisActive=enabled;
 scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(m)for(const uniform of uniforms.get(m)||[])uniform.value=enabled&&!m.transparent?1:0;
 }});
}
export function addLandscape(scene){scene.background=new T.Color('#e5e7da');scene.fog=null;}
