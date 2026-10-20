import {markNPC,isHumanAsset,installNPCAnimations} from '/npc-animation.js';
import {createContours} from './ranch-contours.js';
import * as T from 'three';
import {attachMaterialProfile,setEmphasisPass,isProfileMaterial} from './tile-materials.js';
import {MATERIAL_ROLES,VISUAL_PROFILE,materialRole} from './material-policy.js';
const converted=new WeakMap(),lights=new WeakSet();
const properties=['map','alphaMap','normalMap','bumpMap','aoMap','lightMap','emissiveMap','roughnessMap','metalnessMap','transparent','opacity','alphaTest','side','vertexColors','depthWrite','depthTest','wireframe','visible','flatShading','polygonOffset','polygonOffsetFactor','polygonOffsetUnits'];
export function roleFor(mesh,material){
 const explicit=material.userData.materialRole||mesh.userData.materialRole||mesh.userData.themeSurface?.role||material.userData.storyKind;
 return materialRole(material.name,mesh.name,explicit||(material.userData.dorfRole!=='plain'?material.userData.dorfRole:null));
}
export function sharedMaterial(source,role='plain'){
 if(!source||isProfileMaterial(source)||source.isShaderMaterial||source.isMeshBasicMaterial||source.isLineBasicMaterial||source.isPointsMaterial||source.isSpriteMaterial)return source;
 let roles=converted.get(source);if(!roles){roles=new Map();converted.set(source,roles);}
 if(roles.has(role))return roles.get(role);
 // Unknown materials keep their authored PBR response. Color and textures are never replaced.
 const m=source.isMeshStandardMaterial?source.clone():new T.MeshStandardMaterial({color:source.color||'#ffffff'});
 for(const key of properties)if(source[key]!==undefined)m[key]=source[key];
 m.name=source.name;m.userData={...source.userData};
 if(source.emissive)m.emissive.copy(source.emissive);
 if(source.normalScale)m.normalScale.copy(source.normalScale);
 for(const key of ['bumpScale','aoMapIntensity','lightMapIntensity','emissiveIntensity'])if(source[key]!==undefined)m[key]=source[key];
 const policy=MATERIAL_ROLES[role];
 if(role!=='plain'&&policy){m.roughness=policy.roughness;m.metalness=policy.metalness;}
 // Existing source modifications (e.g. theme weathering) remain composable.
 m.onBeforeCompile=source.onBeforeCompile;
 m.customProgramCacheKey=source.customProgramCacheKey.bind(source);
 attachMaterialProfile(m,role);
 source.addEventListener('dispose',()=>{m.dispose();roles.delete(role);});
 roles.set(role,m);return m;
}
export function prepareRanchScene(scene){
 scene.traverse(o=>{
  if(o.isLight&&!lights.has(o)){lights.add(o);if(o.isHemisphereLight){o.color.set('#f1f4ed');o.groundColor.set('#7d8878');o.intensity=1.3;}else if(o.isDirectionalLight){o.color.set('#fff0d8');o.intensity=2;}}
  if(!o.isMesh||!o.material||o.userData.ranchInk)return;
  if(!o.geometry.getAttribute('paintPosition'))o.geometry.setAttribute('paintPosition',o.geometry.getAttribute('position').clone());
  o.material=Array.isArray(o.material)?o.material.map(m=>sharedMaterial(m,roleFor(o,m))):sharedMaterial(o.material,roleFor(o,o.material));
 });
}
export class RanchRenderer extends T.WebGLRenderer{
 constructor(options={}){
  const {animateNPCs=true,contourSamples=4,...webglOptions}=options;
  super({...webglOptions,preserveDrawingBuffer:true});this.outputColorSpace=T.SRGBColorSpace;
  const render=this.render.bind(this),contours=createContours(this,render,{samples:contourSamples});
  this.render=(scene,camera)=>{
   prepareRanchScene(scene);
   if(this.shadowMap.type!==T.PCFSoftShadowMap){this.shadowMap.type=T.PCFSoftShadowMap;this.shadowMap.needsUpdate=true;}
   this.toneMapping=T.NoToneMapping;this.toneMappingExposure=1;
   this.ranchScene=scene;this.ranchCamera=camera;
   if(!this.ranchRegistered&&this.domElement.isConnected&&window.RanchView){
    this.ranchRegistered=true;
    window.RanchView.register('rendering',()=>({style:VISUAL_PROFILE,texturesAdded:false,camera:this.ranchCamera.position.toArray(),...this.ranchStats,programs:this.info.programs.length}),()=>this.render(this.ranchScene,this.ranchCamera));
   }
   this.domElement.dataset.ranchShader=VISUAL_PROFILE;
   if(this.getRenderTarget())return render(scene,camera);
   setEmphasisPass(scene,true);
   try{this.ranchStats=contours.draw(scene,camera);}finally{setEmphasisPass(scene,false);}
  };
  if(animateNPCs)installNPCAnimations(this);
  const dispose=this.dispose.bind(this);this.dispose=()=>{contours.dispose();dispose();};
 }
}
