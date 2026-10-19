import * as T from 'three';
// Original ranch materials: broad values, subtle pigment, restrained ink.
// Inspired by the recovered Dorf study; no game textures or meshes used here.
const ramp=new T.DataTexture(new Uint8Array([105,180,245]),3,1,T.RedFormat);
ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
export function storyMaterial(color,kind='wood'){
 const m=new T.MeshToonMaterial({color,gradientMap:ramp});
 m.userData.storyKind=kind;
 return m;
}
const outline=new T.MeshBasicMaterial({color:'#233327',side:T.BackSide});
outline.onBeforeCompile=s=>{
 s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normal * 0.035;');
};
outline.customProgramCacheKey=()=> 'ranch-ink-shell-v1';
export function inkEdges(object){
 if(object.material.userData.storyKind==='ground')return;
 if(object.geometry instanceof T.IcosahedronGeometry || object.geometry instanceof T.CylinderGeometry){
  const shell=new T.Mesh(object.geometry,outline);shell.raycast=()=>{};object.add(shell);
 }
 if(object.geometry instanceof T.BoxGeometry){
  const size=new T.Box3().setFromObject(object).getSize(new T.Vector3());
  if(Math.max(size.x,size.y,size.z)<.7)return;
  const ink=new T.LineSegments(new T.EdgesGeometry(object.geometry,35),new T.LineBasicMaterial({color:'#293227'}));
  ink.raycast=()=>{};object.add(ink);
 }
}
export function meadowPatches(scene){
 const patch=(points,color,y=.018)=>{const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const geom=new T.ShapeGeometry(shape);geom.rotateX(-Math.PI/2);const o=new T.Mesh(geom,storyMaterial(color,'ground'));o.position.y=y;o.receiveShadow=true;scene.add(o);};
 patch([[-23,-2],[-20,-9],[-14,-13],[-7,-10],[-9,-3],[-15,2]],'#94a667');
 patch([[-18,5],[-12,1],[-6,4],[-8,12],[-14,14],[-20,9]],'#b0b878');
 patch([[-12,-14],[-3,-18],[5,-17],[7,-11],[0,-9]],'#bac17b');
 patch([[6,-15],[15,-13],[21,-7],[19,-1],[12,-4],[7,-8]],'#9dac68');
 patch([[13,0],[21,0],[23,5],[18,12],[11,13],[7,8]],'#93a665');
 patch([[-3,7],[3,4],[9,8],[11,14],[3,18],[-3,16]],'#b5be7a');
 patch([[-10,-3],[-3,-3],[-1,1],[-2,8],[-8,9],[-11,4]],'#c4b58a',.025);
 patch([[-1,-4],[9,-4],[10,2],[1,3]],'#a2ab70',.025);
}
