// Toy versions of the family. A character sheet is a small JSON record (colours, hair, height,
// glasses); it is kept only in this browser. Photos are read on the device to pick colours
// and are never uploaded or stored.
import * as T from 'three';
import {mat} from './kit.mjs';

export const HAIR_STYLES=['short','long','ponytail','curly','spiky','bun','bald'];
export const PLACEHOLDER_FAMILY=[
 {id:'dad',name:'Dad',role:'adult',height:1,skin:'#e9b48f',hair:'#5a3a26',hairStyle:'short',shirt:'#3a6fb0',pants:'#3a3f4a',shoes:'#2a2624',glasses:true,beard:true},
 {id:'abbie',name:'Abbie',role:'kid',height:.72,skin:'#f2c4a0',hair:'#c98a3a',hairStyle:'ponytail',shirt:'#ff6aa8',pants:'#6a5ad8',shoes:'#ffffff'},
 {id:'kid2',name:'Buddy',role:'kid',height:.62,skin:'#f2c4a0',hair:'#3a2a1e',hairStyle:'spiky',shirt:'#4fca5a',pants:'#3a5ad8',shoes:'#e8333f'},
];

const STORE='teleport.family.v1';
export function loadFamily(){try{const f=JSON.parse(localStorage.getItem(STORE));if(Array.isArray(f)&&f.length)return f;}catch{}return structuredClone(PLACEHOLDER_FAMILY);}
export function saveFamily(f){try{localStorage.setItem(STORE,JSON.stringify(f));}catch{}}

function part(parent,kind,name,color,size,pos,o={}){
 const g=kind==='ball'?new T.SphereGeometry(.5,18,14):kind==='cap'?new T.CapsuleGeometry(.5,1,4,14):kind==='cyl'?new T.CylinderGeometry(.5,.5,1,14):kind==='cone'?new T.ConeGeometry(.5,1,14):new T.BoxGeometry(1,1,1);
 const m=new T.Mesh(g,mat(color,{glow:o.glow||0}));m.name=name;m.scale.set(...size);m.position.set(...pos);if(o.r)m.rotation.set(...o.r);m.castShadow=true;parent.add(m);return m;
}
function joint(parent,name,pos){const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}

// Chunky toy proportions: big head, round body. Height 1 = adult. Faces +Z.
export function makeCharacter(s){
 const root=new T.Group();root.name='person:'+s.id;
 const body=joint(root,'body',[0,0,0]);
 const kid=s.role==='kid',H=s.height??1,headR=kid?.42:.38;
 const legH=kid?.22:.3,torsoH=kid?.3:.38,hipY=legH+.06;
 for(const side of [-1,1]){
  const leg=joint(body,'leg',[side*.1,hipY,0]);
  part(leg,'cap','leg-mesh',s.pants,[.13,legH*.6,.13],[0,-legH/2,0]);
  part(leg,'ball','shoe',s.shoes||'#2a2624',[.16,.1,.24],[0,-legH-.02,.04]);
 }
 part(body,'cap','torso',s.shirt,[.36,torsoH*.55,.28],[0,hipY+torsoH*.5,0]);
 part(body,'ball','hips',s.pants,[.34,.18,.27],[0,hipY+.02,0]);
 for(const side of [-1,1]){
  const arm=joint(body,'arm',[side*.21,hipY+torsoH*.82,0]);
  part(arm,'cap','sleeve',s.shirt,[.1,.18,.1],[side*.02,-.13,0],{r:[0,0,side*.12]});
  part(arm,'ball','hand',s.skin,[.1,.1,.1],[side*.04,-.29,0]);
 }
 const head=joint(body,'head',[0,hipY+torsoH+headR*.55,0]);
 part(head,'ball','face',s.skin,[headR,headR*.95,headR*.92],[0,0,0]);
 for(const side of [-1,1]){
  part(head,'ball','eye','#1d1a18',[.05,.065,.03],[side*.08,.02,headR*.44]);
  part(head,'ball','eye-shine','#ffffff',[.018,.018,.01],[side*.075,.035,headR*.47]);
  part(head,'ball','cheek','#ff9a9a',[.06,.035,.02],[side*.12,-.06,headR*.42]);
 }
 part(head,'box','smile','#7a3a2a',[.08,.015,.01],[0,-.08,headR*.455]);
 hair(head,s,headR);
 if(s.glasses){for(const side of [-1,1])part(head,'cyl','glasses-lens','#2a2624',[.1,.01,.1],[side*.085,.025,headR*.47],{r:[Math.PI/2,0,0]});part(head,'box','glasses-bridge','#2a2624',[.07,.012,.01],[0,.03,headR*.48]);}
 if(s.beard)part(head,'ball','beard',s.hair,[headR*.75,headR*.42,headR*.5],[0,-headR*.3,headR*.18]);
 if(s.hat)part(head,'cyl','hat',s.hat,[headR*1.05,.12,headR*1.05],[0,headR*.48,0]);
 // Normalise to the sheet's height.
 const box=new T.Box3().setFromObject(root),h=box.max.y-box.min.y;root.scale.setScalar(H/h);
 root.userData.person={id:s.id,name:s.name};
 root.userData.rig={body,head,legs:body.children.filter(c=>c.name==='leg'),arms:body.children.filter(c=>c.name==='arm')};
 root.add(nameTag(s.name,H/root.scale.y));
 return root;
}
function hair(head,s,r){
 const c=s.hair,st=s.hairStyle||'short';
 if(st==='bald')return;
 part(head,'ball','hair-cap',c,[r*1.04,r*.62,r*.98],[0,r*.2,-r*.04]);
 if(st==='long'){part(head,'ball','hair-back',c,[r*.98,r*1.05,r*.5],[0,-r*.2,-r*.3]);}
 if(st==='ponytail'){part(head,'ball','hair-tie','#ff4a6a',[.07,.07,.07],[0,r*.25,-r*.5]);part(head,'cap','ponytail',c,[.12,.18,.12],[0,0,-r*.62],{r:[.4,0,0]});}
 if(st==='bun')part(head,'ball','bun',c,[r*.45,r*.45,r*.45],[0,r*.52,-r*.2]);
 if(st==='curly')for(let i=0;i<8;i++)part(head,'ball','curl',c,[r*.38,r*.38,r*.38],[Math.sin(i*.8)*r*.45,r*.32+Math.cos(i*1.7)*r*.08,Math.cos(i*.8)*r*.42-r*.05]);
 if(st==='spiky')for(let i=0;i<6;i++)part(head,'cone','spike',c,[r*.25,r*.4,r*.25],[(i-2.5)*r*.15,r*.48,-r*.05+(i%2)*r*.1],{r:[-.2,0,(i-2.5)*.18]});
}
function nameTag(text,height){
 const c=document.createElement('canvas'),x=c.getContext('2d');c.width=256;c.height=72;x.font='700 40px Manrope, system-ui, sans-serif';
 const w=Math.min(250,x.measureText(text).width+40);x.fillStyle='rgba(255,250,240,.92)';x.beginPath();x.roundRect((256-w)/2,6,w,60,30);x.fill();x.fillStyle='#3a2a1c';x.textAlign='center';x.textBaseline='middle';x.fillText(text,128,38);
 const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));s.name='name-tag';s.renderOrder=999;s.scale.set(.9,.25,1);s.position.y=height+.25;return s;
}

// Per-frame motion: walk cycle while moving, idle bob, plus one-off emotes.
export function animateCharacter(o,t,{moving=0,emote=null,lowGravity=false}={}){
 const r=o.userData.rig;if(!r)return;
 const ph=t*9+(o.userData.phase??=Math.random()*6);
 const swing=Math.sin(ph)*.7*moving;
 r.legs.forEach((l,i)=>l.rotation.x=i?swing:-swing);
 r.arms.forEach((a,i)=>{a.rotation.x=i?-swing:swing;a.rotation.z=0;});
 r.body.position.y=Math.abs(Math.sin(ph))*.04*moving+Math.sin(t*2+ph)*.008;
 r.body.rotation.set(0,0,0);r.head.rotation.set(0,0,0);
 if(emote==='wave'){const a=r.arms[1];a.rotation.z=2.6+Math.sin(t*12)*.35;}
 if(emote==='jump'||emote==='hop'){r.body.position.y=Math.abs(Math.sin(t*(lowGravity?2.5:6)+ph))*(lowGravity?1.4:.35);r.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*2.4);}
 if(emote==='dance'){r.body.rotation.z=Math.sin(t*8+ph)*.25;r.body.position.y=Math.abs(Math.sin(t*8+ph))*.08;r.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*(1.8+Math.sin(t*8+ph+i)*.8));r.head.rotation.z=Math.sin(t*8+ph)*.2;}
 if(emote==='spin'){r.body.rotation.y=t*10;}
 if(emote==='sleep'){r.head.rotation.x=.4;r.body.position.y=Math.sin(t*1.5)*.01;}
 if(emote==='cheer'){r.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*(2.8+Math.sin(t*14+i)*.2));r.body.position.y=Math.abs(Math.sin(t*7))*.1;}
 if(emote==='scared'){r.arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*2.9);r.body.position.x=Math.sin(t*40)*.01;}
}

// Photo colour picker: the photo stays in a local canvas; a tap reads the average colour of
// a small patch. Nothing is uploaded and the image is dropped when the dialog closes.
export function sampleColor(canvas,x,y,radius=6){
 const ctx=canvas.getContext('2d',{willReadFrequently:true});const d=ctx.getImageData(Math.max(0,x-radius),Math.max(0,y-radius),radius*2,radius*2).data;
 let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
 const hex=v=>Math.round(v/n).toString(16).padStart(2,'0');return '#'+hex(r)+hex(g)+hex(b);
}
