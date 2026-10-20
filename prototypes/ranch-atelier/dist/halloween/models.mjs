import * as T from '../vendor/three.module.js';
import {part,makePerson,animatePerson} from '../scale-study/models.mjs';
const palettes=[['#e68b38','#614d85','#8aaa78','#e4dcc3'],['#91c9df','#526aa1','#a9bad5','#edf1ea'],['#ed9aaf','#8959a7','#77bcac','#f1cf8a']];
export function makeCreature(spec,variant=0){
 const root=new T.Group(),body=new T.Group();root.add(body);let [orange,purple,green,ivory]=palettes[variant];if(spec.id==='moon-witch')purple=['#3f577b','#b7c9e2','#8295bc'][variant];if(spec.id==='gourdling')orange=['#d3b151','#b4cfaf','#f0c98d'][variant];if(spec.id==='patchwork-mummy')ivory=['#d6acb3','#acb7d7','#e7acc9'][variant];let human;const shape=spec.shape,details=[];
 const add=(type,color,size,pos,g=body)=>part(g,type,color,size,pos);
 const eye=(x,y,z,size=.035,color='#f8d879',g=body)=>add('sphere',color,[size,size,size*.65],[x,y,z],g);
 const eyes=(y,z,spread=.13,g=body)=>{eye(-spread,y,z,.04,'#242533',g);eye(spread,y,z,.04,'#242533',g);};
 const cone=(color,r,h,pos,g=body)=>{const m=new T.Mesh(new T.ConeGeometry(r,h,8),new T.MeshStandardMaterial({color,roughness:.9}));m.position.set(...pos);m.castShadow=true;m.userData.disposable=true;g.add(m);return m;};
 const wing=(side,y,color)=>{const g=new T.Group();g.position.set(side*.17,y,0);body.add(g);const pts=new T.Shape();pts.moveTo(0,0);pts.lineTo(side*.75,.32);pts.lineTo(side*.68,-.25);pts.lineTo(side*.42,-.12);pts.lineTo(side*.2,-.32);pts.closePath();const m=new T.Mesh(new T.ShapeGeometry(pts),new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:1}));m.userData.disposable=true;g.add(m);details.push({kind:'wing',g,side});};
 const humanoids=['spirit','vampire','witch','wolf','giant','pumpkin','scarecrow','mummy','robot','gargoyle'];
 if(humanoids.includes(shape)){
 const skin=shape==='giant'?green:shape==='wolf'?'#936c51':shape==='gargoyle'?['#9d9fa6','#8eafc8','#bd9cba'][variant]:ivory;
 const person={index:spec.index,role:'resident',appearance:{skin,hair:shape==='wolf'?'#6d493e':'#3c3441',hairStyle:0,build:shape==='giant'?1.45:1,height:spec.height},wardrobe:{top:['mummy','gargoyle'].includes(shape)?skin:shape==='robot'?'#ae9261':shape==='scarecrow'?orange:purple,bottom:shape==='mummy'?ivory:'#494457',hat:'none',accessory:'none'}};
 human=makePerson(person);body.add(human);const head=human.userData.head;
 if(['vampire','spirit','witch'].includes(shape)){add('box',shape==='vampire'?'#793a51':purple,[.55,.85,.06],[0,1.02,-.16],human);if(shape==='vampire')for(const x of [-.04,.04])cone(ivory,.018,.06,[x,.085,.13],head);}
 if(shape==='witch'||shape==='scarecrow'){add('cylinder',shape==='witch'?purple:'#ba9b61',[.28,.05,.28],[0,.3,0],head);cone(shape==='witch'?purple:'#ba9b61',.22,shape==='witch'?.57:.24,[0,shape==='witch'?.59:.43,0],head);}
 if(shape==='pumpkin'){for(const child of head.children)child.visible=false;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;add('sphere',orange,[.19,.26,.19],[Math.cos(a)*.12,.16,Math.sin(a)*.12],head);}add('cylinder','#75865c',[.04,.14,.04],[0,.45,0],head);for(const x of [-.12,.12])cone('#302b36',.06,.1,[x,.22,.28],head);add('box','#302b36',[.19,.045,.025],[0,.06,.30],head);}
 if(shape==='wolf'){for(const side of [-1,1])cone('#936c51',.085,.22,[side*.11,.36,0],head);add('sphere','#b4906b',[.10,.065,.15],[0,.1,.18],head);eye(0,.13,.32,.035,'#2b2932',head);const tail=add('cylinder','#936c51',[.07,.65,.07],[0,.72,-.35],human);tail.rotation.x=.7;}
 if(shape==='giant'){for(const side of [-1,1]){const bolt=add('cylinder','#bac0bc',[.045,.12,.045],[side*.17,.06,0],head);bolt.rotation.z=Math.PI/2;}add('box','#3e4651',[.21,.04,.035],[0,.19,.12],head);}
 if(shape==='mummy'){for(let i=0;i<6;i++){const band=add('box',i%2?'#c4bba3':ivory,[.36,.035,.215],[0,.9+i*.075,0],human);band.rotation.z=(i%2?1:-1)*.08;}for(let i=0;i<3;i++)add('box','#c4bba3',[.25,.027,.23],[0,.04+i*.07,0],head);}
 if(shape==='scarecrow'){for(const side of [-1,1])for(let i=0;i<3;i++){const straw=add('cylinder','#dbc083',[.012,.18,.012],[side*.04,-.48,.015*i],human.userData.limbs[side===-1?0:2]);straw.rotation.z=(i-1)*.22;}add('box','#799487',[.12,.15,.025],[-.07,1.09,.12],human);}
 if(shape==='robot'){add('box','#b8a077',[.32,.30,.27],[0,.15,0],head);for(const x of [-.08,.08])eye(x,.18,.15,.04,'#8fe5c5',head);add('cylinder','#d1bb80',[.02,.2,.02],[0,.4,0],head);eye(0,.51,0,.05,orange,head);}
 if(shape==='gargoyle'){wing(-1,1.4,'#8f93a0');wing(1,1.4,'#8f93a0');for(const side of [-1,1])cone('#9d9fa6',.06,.23,[side*.11,.36,0],head);}
 if(shape==='spirit'){human.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.72;o.userData.ownMaterial=true;}});}
 }
 if(shape==='skeleton'){
 add('sphere',ivory,[.22,.25,.18],[0,1.5,0]);eyes(1.55,.168,.085);add('box',ivory,[.28,.1,.18],[0,1.3,0]);for(let i=0;i<4;i++)add('box',ivory,[.36-i*.035,.035,.15],[0,1.17-i*.085,0]);add('cylinder',ivory,[.035,.5,.035],[0,.98,0]);
 for(const side of [-1,1]){for(const [kind,x,y,len] of [['arm',.25,1.2,.5],['leg',.11,.78,.65]]){const g=new T.Group();g.position.set(side*x,y,0);body.add(g);add('cylinder',ivory,[.035,len,.035],[0,-len/2,0],g);add('sphere',ivory,[.055,.055,.055],[0,-len,0],g);details.push({kind,g,side});}}if(spec.id==='bone-musician')for(const side of [-1,1])add('sphere',orange,[.085,.055,.03],[side*.065,1.27,.13]);if(spec.id==='bone-guard')add('cylinder',purple,[.24,.1,.2],[0,1.73,0]);
 }
 if(shape==='ghost'){
 add('sphere',spec.id==='banshee'?purple:ivory,[.40,.55,.32],[0,1.1,0]);cone(spec.id==='banshee'?purple:ivory,.48,.9,[0,.68,0]);for(const side of [-1,1]){const a=add('sphere',ivory,[.19,.09,.10],[side*.42,1,0]);details.push({kind:'ghostArm',g:a,side});}eyes(1.25,.30,.13);add('sphere','#35323e',[.055,.08,.015],[0,1.05,.325]);
 }
 if(shape==='wisp'){const color=spec.id==='marsh-spirit'?green:orange;add('sphere',color,[.29,.36,.27],[0,1,0]);cone(color,.22,.58,[0,1.4,0]);eyes(1.05,.25,.10);for(let i=0;i<3;i++){const a=add('sphere',color,[.07,.07,.07],[.3*Math.cos(i*2),.5+i*.2,.3*Math.sin(i*2)]);details.push({kind:'spark',g:a,side:i});}}
 if(shape==='mushroom'){add('cylinder',ivory,[.19,.85,.19],[0,.55,0]);add('sphere',variant===0?'#bd5362':purple,[.65,.25,.55],[0,1.05,0]);for(let i=0;i<7;i++){const a=i*2.4;add('sphere',ivory,[.08,.03,.08],[Math.cos(a)*.43,1.24,Math.sin(a)*.33]);}eyes(.72,.185,.08);}
 if(shape==='tree'){add('cylinder','#7f6955',[.21,1.4,.21],[0,.75,0]);eyes(1.03,.20,.08);for(const side of [-1,1]){const a=add('cylinder','#7f6955',[.055,.7,.055],[side*.36,1,0]);a.rotation.z=side*-.8;cone(green,.3,.55,[side*.57,1.38,0]);}cone(green,.42,.7,[0,1.65,0]);}
 if(['cat','toad','owl','bat','spider','slime'].includes(shape)){
 const color=shape==='cat'?['#373341','#64768e','#90718c'][variant]:shape==='toad'||shape==='slime'?green:purple;
 add('sphere',color,shape==='slime'?[.48,.4,.43]:shape==='spider'?[.29,.21,.38]:[.25,.27,.3],[0,shape==='bat'||shape==='owl'?1:.35,0]);
 if(shape==='slime'){eyes(.5,.36,.14);add('sphere',ivory,[.07,.10,.025],[-.22,.59,.30]);}
 if(shape==='cat'){add('sphere',color,[.21,.22,.2],[0,.65,.19]);eyes(.69,.38,.08);for(const side of [-1,1])cone(color,.09,.22,[side*.13,.88,.18]);const tail=add('cylinder',color,[.035,.6,.035],[0,.65,-.36]);tail.rotation.x=-.4;details.push({kind:'tail',g:tail,side:1});}
 if(shape==='toad'){for(const side of [-1,1]){add('sphere',green,[.11,.12,.1],[side*.15,.57,.15]);eye(side*.15,.6,.24,.05);add('sphere',green,[.15,.12,.22],[side*.29,.17,0]);}}
 if(shape==='owl'||shape==='bat'){eyes(1.1,.28,.1);wing(-1,1,purple);wing(1,1,purple);if(shape==='bat')for(const side of [-1,1])cone(purple,.09,.23,[side*.15,1.33,0]);else cone(orange,.055,.13,[0,1,.32]).rotation.x=Math.PI/2;}
 if(shape==='spider'){for(const side of [-1,1])for(let i=0;i<4;i++){const leg=add('cylinder',purple,[.025,.65,.025],[side*.37,.2,(i-1.5)*.16]);leg.rotation.z=side*1.1;details.push({kind:'spiderLeg',g:leg,side:side*(i+1)});}for(const x of [-.12,-.04,.04,.12])eye(x,.43,.35,.03,ivory);}
 if(shape==='cat')for(const side of [-1,1])for(const z of [-.16,.2]){const foot=add('cylinder',color,[.06,.28,.06],[side*.16,.15,z]);details.push({kind:'paw',g:foot,side:side*(z>0?1:-1)});}
 }
 if(shape==='mimic'){add('box',variant===0?'#8e634c':purple,[.9,.48,.58],[0,.27,0]);const lid=new T.Group();lid.position.set(0,.52,-.29);body.add(lid);add('box',variant===0?'#b58657':orange,[.94,.17,.62],[0,.07,.29],lid);eyes(.1,.61,.17,lid);for(const x of [-.3,-.1,.1,.3])cone(ivory,.04,.1,[x,-.05,.57],lid).rotation.z=Math.PI;details.push({kind:'lid',g:lid,side:1});for(const x of [-.33,.33])add('box','#c4ad6c',[.07,.46,.6],[x,.28,0]);}
 if(shape==='candle'){add('cylinder',ivory,[.24,1.15,.24],[0,.65,0]);eyes(.92,.235,.09);cone(orange,.12,.4,[0,1.46,0]);add('cylinder','#a68153',[.37,.1,.37],[0,.07,0]);for(const x of [-.14,.12])add('sphere',ivory,[.07,.18,.06],[x,1.08,.19]);}
 root.userData={spec,body,human,details,time:spec.index*.37};return root;
}
export function animateCreature(root,dt,mode='idle',paused=false){if(paused)return;const r=root.userData,t=r.time+=dt,s=Math.sin(t*4),walking=mode==='walk',greeting=mode==='greet';if(r.human)animatePerson(r.human,{phase:'work'},walking?dt*.75:0,dt);r.body.position.y=['floats','flaps'].includes(r.spec.motion)?.15+Math.sin(t*2)*.10:['bounces','hops'].includes(r.spec.motion)?Math.max(0,s)*.10:0;r.body.rotation.z=r.spec.motion==='sways'?Math.sin(t*1.7)*.07:0;
 r.body.rotation.y=greeting?Math.sin(t*2)*.15:0;
 if(r.spec.shape==='slime')r.body.scale.set(1+s*.06,1-s*.08,1+s*.06);
 if(greeting&&r.human){r.human.userData.limbs[2].rotation.z=-2.3+Math.sin(t*7)*.2;r.human.userData.head.rotation.z=Math.sin(t*2)*.12;}
 for(const d of r.details){if(d.kind==='wing')d.g.rotation.y=d.side*(.25+Math.sin(t*(walking?10:5))*.65);if(d.kind==='arm'||d.kind==='leg')d.g.rotation.x=walking?s*d.side*(d.kind==='leg'?.4:-.3):greeting&&d.kind==='arm'?-1.8:Math.sin(t)*.04;if(d.kind==='lid')d.g.rotation.x=-.12-(greeting?.5:.18)*(1+Math.sin(t*3));if(d.kind==='ghostArm')d.g.rotation.z=d.side*(Math.sin(t*2)*.25+(greeting?.7:0));if(d.kind==='spark')d.g.position.x=Math.cos(t+d.side*2)*.4;if(d.kind==='spiderLeg')d.g.rotation.x=Math.sin(t*(walking?9:2)+d.side)*.18;if(d.kind==='paw')d.g.rotation.x=walking?s*d.side*.3:0;if(d.kind==='tail')d.g.rotation.z=Math.sin(t*2)*.25;}
 root.position.y=r.spec.motion==='stomps'&&walking?Math.abs(s)*.035:0;
}
