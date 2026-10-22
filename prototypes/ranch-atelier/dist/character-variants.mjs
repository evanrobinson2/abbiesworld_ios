import * as T from 'three';
import {clone} from './character-skeleton-utils.mjs';
export const CHARACTER_VARIANTS={hero:{name:'Hero',skin:'#bb896b',shirt:'#526047',pants:'#364954',boots:'#302c28',hair:'#30251f'},zombie:{name:'Zombie',skin:'#899384',shirt:'#76574c',pants:'#444b48',boots:'#34332f',hair:'#45453b'}};
// Same bind geometry, inverse bind matrices, skeleton and animation tracks as source.
// Only surface colours and rigid facial/clothing details change; no limb/head scaling.
export function createCharacterVariant(source,kind='hero'){
 const palette=CHARACTER_VARIANTS[kind];if(!palette)throw Error('Unknown character variant');
 const root=clone(source);root.updateMatrixWorld(true);const zombie=kind==='zombie';
 root.traverse(o=>{if(!o.isSkinnedMesh)return;
  o.geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();const g=o.geometry,p=g.attributes.position,j=g.attributes.skinIndex,w=g.attributes.skinWeight,colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i+=3){let x=0,y=0,z=0;for(let k=0;k<3;k++){x+=p.getX(i+k)/3;y+=p.getY(i+k)/3;z+=p.getZ(i+k)/3;}let slot=0;for(let k=1;k<4;k++)if(w.getComponent(i,k)>w.getComponent(i,slot))slot=k;const bone=o.skeleton.bones[j.getComponent(i,slot)]?.name||'';
   let color=palette.shirt;
   if(/head|neck|hand|thumb|f_/.test(bone))color=palette.skin;
   else if(/foot|toe/.test(bone)||y<.20)color=palette.boots;
   else if(/thigh|shin|hips/.test(bone)||y<.99)color=palette.pants;
   else if(/forearm/.test(bone)&&Math.abs(x)>.54)color=palette.skin;
   else if(Math.abs(x)<.045&&z>.06&&y>1.12)color=zombie?'#605b4b':'#d6cbb3';
   // Asymmetric frayed hems and exposed skin, without changing the skeleton.
   if(zombie&&/upper_arm|forearm/.test(bone)&&x<-.32&&y<1.50+Math.sin(x*80)*.018)color=palette.skin;
   if(zombie&&/shin/.test(bone)&&x>.04&&y>.28&&y<.48+Math.sin(z*95)*.02)color=palette.skin;
   const c=new T.Color(color);if(zombie&&color===palette.skin){const stain=Math.sin(x*71+y*49+z*83)*Math.cos(y*107-x*37);if(stain>.4)c.lerp(new T.Color('#655b50'),.32);}
   for(let k=0;k<3;k++)c.toArray(colors,(i+k)*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));o.material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94});o.castShadow=true;o.receiveShadow=true;
 });
 const head=root.getObjectByName('DEF-head');
 function detail(bone,geometry,color,position,scale,rotation){const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.9}));mesh.position.set(...position);if(scale)mesh.scale.set(...scale);if(rotation)mesh.rotation.set(...rotation);mesh.castShadow=true;root.add(mesh);root.updateMatrixWorld(true);bone.attach(mesh);return mesh;}
 if(head){
  // Coordinates refer to the unmodified 1.829m source bind pose, facing +Z.
  detail(head,new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.52),palette.hair,[0,1.765,-.005],[.087,.076,.082]);
  for(const x of [-.032,.032]){
   detail(head,new T.SphereGeometry(1,8,6),zombie?'#55594d':'#493c31',[x,1.715,.115],[.018,.009,.007]);
   detail(head,new T.SphereGeometry(1,8,6),zombie?'#c7c8a9':'#d2c5ac',[x,1.716,.122],[.009,.004,.003]);
   detail(head,new T.BoxGeometry(.027,.006,.007),palette.hair,[x,1.731,.112],null,[0,0,x<0?.08:-.08]);
  }
  detail(head,new T.SphereGeometry(1,8,6),palette.skin,[0,1.691,.119],[.013,.019,.013]);
  detail(head,new T.BoxGeometry(.034,zombie?.009:.004,.005),zombie?'#4b4740':'#79594a',[0,1.659,.108]);
 }
 const chest=(root.getObjectByName('DEF-spine.003')||root.getObjectByName('DEF-spine003'));if(chest&&!zombie){detail(chest,new T.BoxGeometry(.055,.055,.015),'#657054',[-.086,1.36,.123]);detail(chest,new T.BoxGeometry(.055,.055,.015),'#657054',[.086,1.36,.123]);}
 const bounds=new T.Box3().setFromObject(root),height=bounds.max.y-bounds.min.y;
 const wrapper=new T.Group();wrapper.name=palette.name;wrapper.add(root);root.scale.setScalar(1.8/height);root.position.y=-bounds.min.y*root.scale.y;
 wrapper.userData.character={kind,heightMetres:1.8,forward:'+Z',rig:'Quaternius Standard',proportions:'Unmodified source skeleton and body'};
 return {group:wrapper,rig:root,head:root.getObjectByName('DEF-head'),rightHand:(root.getObjectByName('DEF-hand.R')||root.getObjectByName('DEF-handR')),leftHand:(root.getObjectByName('DEF-hand.L')||root.getObjectByName('DEF-handL'))};
}
