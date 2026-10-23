import * as T from 'three';
export const NPC_ANIMATION_VERSION='npc-motion-1';
export function isHumanAsset(id=''){return /^(abbie|ani|mommy|daddy|jeff|alexis)(-|$)/i.test(id)||/^(GF-008|WW-006|CE-007|BA-00(8[1-9]|90))$/i.test(id);}
export function markNPC(root,activity='idle'){root.userData.npcMotion={activity};return root;}
export function motionKind(activity='',moving=false){if(moving)return /carry|bring|deliver|return|load/i.test(activity)?'carry':'walk';if(/rest|sleep|idle|ready|wait/i.test(activity))return 'idle';if(/read|plan|inspect/i.test(activity))return 'read';if(/talk|sell|trade|social/i.test(activity))return 'talk';return 'work';}
const rigs=new WeakMap(),sceneState=new WeakMap();
function rig(root){
 root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),parts=[],bounds=new T.Box3();
 root.traverse(mesh=>{if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh)return;const source=mesh.geometry.getAttribute('position');if(!source)return;
 const matrix=new T.Matrix4().multiplyMatrices(inv,mesh.matrixWorld),positions=new Float32Array(source.count*3),v=new T.Vector3();
 for(let i=0;i<source.count;i++){v.fromBufferAttribute(source,i).applyMatrix4(matrix);v.toArray(positions,i*3);bounds.expandByPoint(v);}
 // Each instance owns its animated geometry. Cached templates remain untouched.
 mesh.geometry=mesh.geometry.clone();mesh.userData.sharedGeometry=false;mesh.userData.ownedGeometry=true;
 parts.push({mesh,positions,inverse:matrix.clone().invert()});
 });
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const data={parts,bounds,size,center,phase:0,time:0,last:null,kind:'idle'};rigs.set(root,data);return data;
}
function deform(r,kind){
 const h=r.size.y||1,cx=r.center.x,cz=r.center.z,base=r.bounds.min.y,w=r.size.x||1,s=Math.sin(r.phase),beat=Math.sin(r.time*3),v=new T.Vector3();
 for(const p of r.parts){const attr=p.mesh.geometry.attributes.position;
 for(let i=0;i<attr.count;i++){
  const x=p.positions[i*3],y=p.positions[i*3+1],z=p.positions[i*3+2],ny=(y-base)/h,side=x<cx?-1:1;let angle=0,pivot=base+h*.48;
  const walking=kind==='walk'||kind==='carry';
  if(ny>.025&&ny<.48)angle=walking?s*side*.30*Math.min(1,(.48-ny)/.09):0;
  else if(ny>.48&&ny<.83&&Math.abs(x-cx)>w*.26){pivot=base+h*.76;angle=walking?(kind==='carry'?-.23:-s*side*.23):kind==='work'?-.24+beat*side*.16:kind==='read'?-.28:kind==='talk'?-.18+beat*.13:0;}
  else if(ny>.82){pivot=base+h*.82;angle=kind==='work'?.07:Math.sin(r.time*.8)*.025;}
  const dy=y-pivot,dz=z-cz,bob=walking&&ny>.025?Math.abs(s)*h*.012:0;
  v.set(x,pivot+dy*Math.cos(angle)-dz*Math.sin(angle)+bob,cz+dy*Math.sin(angle)+dz*Math.cos(angle)).applyMatrix4(p.inverse);attr.setXYZ(i,v.x,v.y,v.z);
 }
 attr.needsUpdate=true;p.mesh.geometry.computeVertexNormals();p.mesh.geometry.computeBoundingSphere();
 }
}
export function animateNPCScene(scene,now=performance.now()){
 let state=sceneState.get(scene);if(!state){state={last:now-40,time:0,count:0};sceneState.set(scene,state);}const dt=Math.max(0,Math.min(.1,(now-state.last)/1000));if(dt<1/35)return state.count;state.last=now;state.count=0;
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 function visit(root){
  if(!root.visible)return;
  if(root.userData.npcMotion){state.count++;const cfg=root.userData.npcMotion,r=rigs.get(root)||rig(root),position=new T.Vector3();root.getWorldPosition(position);
   const distance=r.last?position.distanceTo(r.last):0;r.last=position;
   if(!cfg.paused&&!scene.userData.npcPaused&&!reduced){r.time+=dt;const height=r.size.y*Math.abs(root.getWorldScale(new T.Vector3()).y)||1;const moving=cfg.moving??(distance>height*.0001&&distance<height*4);
   r.phase+=moving?Math.min(distance/height,.25)*Math.PI*3:0;r.kind=motionKind(cfg.activity||root.userData.activity||'idle',moving);deform(r,r.kind);}
   root.userData.npcAnimationState={version:NPC_ANIMATION_VERSION,clip:r.kind,paused:!!cfg.paused||!!scene.userData.npcPaused,vertices:r.parts.reduce((n,p)=>n+p.positions.length/3,0)};return;
  }
  for(const child of [...root.children]){
   const asset=child.userData.asset||child.userData.assetId||(child.name||'').split(' ')[0];
   if(!child.userData.npcMotion&&isHumanAsset(asset)){
    if(child.isMesh){const wrapper=new T.Group();root.add(wrapper);wrapper.add(child);markNPC(wrapper);visit(wrapper);continue;}
    markNPC(child);
   }
   visit(child);
  }
 }
 scene.updateMatrixWorld(true);visit(scene);return state.count;
}
// Keep event-driven previews alive, while avoiding an extra draw on pages already rendering.
export function installNPCAnimations(renderer){
 if(renderer.npcAnimations)return;renderer.npcAnimations=true;const draw=renderer.render.bind(renderer);let current=null,lastDraw=0,count=0,disposed=false;
 renderer.render=(scene,camera)=>{if(!renderer.getRenderTarget()){current={scene,camera};lastDraw=performance.now();count=animateNPCScene(scene,lastDraw);renderer.domElement.dataset.npcAnimations=NPC_ANIMATION_VERSION;renderer.domElement.dataset.animatedNpcs=String(count);if(count)renderer.shadowMap.needsUpdate=true;}return draw(scene,camera);};
 const dispose=renderer.dispose.bind(renderer);renderer.dispose=()=>{disposed=true;dispose();};
 function tick(now){if(disposed)return;if(current&&count&&now-lastDraw>32&&renderer.domElement.isConnected&&!document.hidden)renderer.render(current.scene,current.camera);requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
