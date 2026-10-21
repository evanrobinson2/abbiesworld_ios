import * as T from 'three';
export function astronautPose(seconds,moving,working=false,offset=0){const phase=seconds*5+offset,swing=moving?Math.sin(phase):0;return {leftLeg:swing*.55,rightLeg:-swing*.55,leftKnee:moving?Math.max(0,-swing)*.45:0,rightKnee:moving?Math.max(0,swing)*.45:0,leftArm:working?-.65+Math.sin(seconds*3+offset)*.18:-swing*.42,rightArm:working?-.85+Math.sin(seconds*3+offset+1)*.2:swing*.42,head:Math.sin(seconds*.7+offset)*.1};}
// Add a lightweight rig to the existing authored, unrigged suit. No replacement figure.
export function animateAstronaut(root,{name,persona,offset=0}={}){
 const bones=Array.from({length:8},()=>new T.Bone());bones[0].name='suit-root';
 function bone(i,parent,x,y,z=0){bones[i].position.set(x,y,z);bones[parent].add(bones[i]);}
 bone(1,0,-.17,.88);bone(2,0,.17,.88);bone(3,1,0,-.43);bone(4,2,0,-.43);bone(5,0,-.32,1.42);bone(6,0,.32,1.42);bone(7,0,0,1.55);
 root.add(bones[0]);root.updateMatrixWorld(true);const skeleton=new T.Skeleton(bones),meshes=[],geometries=[];
 root.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh)meshes.push(o);});
 for(const old of meshes){const geometry=old.geometry.clone(),position=geometry.getAttribute('position'),indices=[],weights=[];
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i);let boneIndex=0;if(y<.87)boneIndex=y<.45?(x<0?3:4):(x<0?1:2);else if(Math.abs(x)>.27&&y<1.53)boneIndex=x<0?5:6;else if(y>1.55)boneIndex=7;indices.push(boneIndex,0,0,0);weights.push(1,0,0,0);}
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));const mesh=new T.SkinnedMesh(geometry,old.material);mesh.name=old.name;mesh.position.copy(old.position);mesh.quaternion.copy(old.quaternion);mesh.scale.copy(old.scale);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData={...old.userData};old.parent.add(mesh);mesh.updateMatrixWorld(true);mesh.bind(skeleton,old.matrixWorld);old.parent.remove(old);geometries.push(geometry);
 }
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=112;const context=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const material=new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}),banner=new T.Sprite(material);banner.position.y=2.28;banner.scale.set(2.5,.73,1);banner.userData.inspect={title:name,kind:persona,description:'Persistent colony identity'};root.add(banner);let last='';
 function label(nextName,nextPersona){const key=nextName+'|'+nextPersona;if(key===last)return;last=key;context.clearRect(0,0,384,112);context.fillStyle='rgba(250,246,230,.92)';context.beginPath();context.roundRect(4,4,376,104,22);context.fill();context.fillStyle='#343b40';context.textAlign='center';context.font='600 32px sans-serif';context.fillText(nextName,192,46,350);context.fillStyle='#657a80';context.font='23px sans-serif';context.fillText(nextPersona,192,82,350);texture.needsUpdate=true;banner.userData.inspect.title=nextName;}
 label(name,persona);
 return {update(seconds,moving,working=false,nextName=name){label(nextName,persona);const p=astronautPose(seconds,moving,working,offset);bones[1].rotation.x=p.leftLeg;bones[2].rotation.x=p.rightLeg;bones[3].rotation.x=p.leftKnee;bones[4].rotation.x=p.rightKnee;bones[5].rotation.x=p.leftArm;bones[6].rotation.x=p.rightArm;bones[7].rotation.y=p.head;},dispose(){for(const g of geometries)g.dispose();skeleton.dispose();material.dispose();texture.dispose();}};
}
