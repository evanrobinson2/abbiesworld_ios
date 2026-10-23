import * as T from 'three';
import {COFFEE_ROOM,coffeeHexes} from './coffee-room-plan.mjs';

// Original geometry. References inform joinery, scale and material relationships,
// not borrowed artwork. The shell cuts away for the staff-side activity camera.
export function createCoffeeRoom(){
 const root=new T.Group();root.name='Level 1 — contemporary mountain café';
 const shell=new T.Group();shell.name='Architectural cutaway';root.add(shell);
 const materials=new Map();
 const mat=c=>{if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.72}));return materials.get(c);};
 const metal=new T.MeshStandardMaterial({color:'#a4aaa5',metalness:.65,roughness:.28});
 const glow=new T.MeshStandardMaterial({color:'#fff0d3',emissive:'#ffe4bb',emissiveIntensity:.35,roughness:.6});
 const glass=new T.MeshStandardMaterial({color:'#b5ced0',transparent:true,opacity:.24,roughness:.12,depthWrite:false});
 const walnut='#683442',oak='#aa7880',plaster='#f0dadd',stone='#e4d7cb',clay='#d89aa8',olive='#a87385',dark='#472c37',linen='#f2e3d5';
 const mesh=(g,c,x,y,z,p=root)=>{const o=new T.Mesh(g,typeof c==='string'?mat(c):c);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const box=(w,h,d,c,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
 const cyl=(r,h,c,x,y,z,p)=>mesh(new T.CylinderGeometry(r,r,h,40),c,x,y,z,p);
 const ell=(rx,ry,rz,c,x,y,z,p)=>{const o=mesh(new T.SphereGeometry(1,24,16),c,x,y,z,p);o.scale.set(rx,ry,rz);return o;};
 function round(w,h,d,r,c,x,y,z,p=root){r=Math.min(r,w/2-.001,d/2-.001);const s=new T.Shape(),a=w/2,b=d/2;
  s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);
  const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);g.translate(0,-h/2,0);return mesh(g,c,x,y,z,p);
 }
 function tube(points,r,c,p=root){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),24,r,8,false),c,0,0,0,p);}
 function mug(x,y,z,c=linen,p=root){const profile=[[0,0],[.052,0],[.073,.13],[.059,.13],[.043,.025],[0,.025]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(profile,24),c,x,y,z,p);cyl(.052,.003,'#49352a',x,y+.10,z,p);const h=mesh(new T.TorusGeometry(.038,.012,8,20),c,x+.072,y+.07,z,p);h.rotation.y=Math.PI/2;}
 function vase(x,y,z,h=.3,c=clay){const points=[[0,0],[.10,0],[.14,h*.2],[.11,h*.7],[.055,h],[.045,h],[.045,h*.9]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(points,32),c,x,y,z);}
 // Quiet large mineral slabs, with purposeful joints instead of plank noise.
 round(12.45,.28,10.45,.12,walnut,0,-.18,0);box(12,.07,10,stone,0,-.025,0);
 for(let x=-5;x<6;x+=2)box(.009,.003,10,'#b0a89d',x,.012,0);
 for(let z=-3;z<5;z+=2)box(12,.003,.009,'#b0a89d',0,.012,z);
 box(12,3.4,.22,plaster,0,1.7,-5,shell);
 // Real openings between masonry piers; slender bronze mullions and deep sills.
 box(.22,.68,10,plaster,-6,.34,0,shell);box(.22,.4,10,plaster,-6,3.2,0,shell);
 for(const z of [-4.9,-1.65,1.65,4.9])box(.24,2.32,.23,plaster,-6,1.84,z,shell);
 for(const z of [-3.3,0,3.3]){box(.04,2.1,3,glass,-6,1.84,z,shell);for(const zz of [z-1.5,z+1.5])box(.10,2.18,.045,walnut,-5.94,1.84,zz,shell);box(.1,.045,3,walnut,-5.94,2.94,z,shell);box(.42,.09,3.15,stone,-5.87,.77,z,shell);}
 box(11.9,.12,.10,walnut,0,.08,-4.85,shell);
 // Low front/right cutaway reveals furniture. The entrance remains 1.6 m wide.
 box(.16,.18,10,plaster,6,.09,0);for(const x of [-3.45,3.45])box(5.1,.18,.16,plaster,x,.09,5);
 for(const x of [-.88,.88])box(.055,2.5,.08,walnut,x,1.25,5,shell);
 box(1.82,.055,.08,walnut,0,2.5,5,shell);round(1.6,.015,1.05,.08,'#8c826e',0,.024,4.3);
 // Continuous walnut bar, softly rounded stone top and recessed toe kick.
 round(7.3,.84,1.05,.48,walnut,-1.35,.53,-2.1);round(7.45,.09,1.16,.52,stone,-1.35,1.005,-2.1);
 round(7.05,.12,.86,.38,dark,-1.35,.08,-2.1);
 for(let x=-4.2;x<1.6;x+=.65)box(.012,.72,.012,'#49372f',x,.53,-1.57);
 box(5.7,.025,.025,glow,-1.4,.915,-1.561);
 // Back bar: integrated storage, sage tile backsplash, warm under-shelf light.
 box(9,.89,.65,walnut,-.2,.445,-4.45);box(9.2,.07,.82,stone,-.2,.93,-4.45);
 for(let x=-4.3;x<4.2;x+=.9){box(.88,.75,.035,oak,x,.48,-4.105);box(.25,.018,.03,dark,x,.81,-4.08);}
 for(let i=0;i<23;i++)for(let j=0;j<3;j++)box(.38,.23,.025,'#cfb0b5',-4.6+i*.4,1.1+j*.25,-4.865,shell);
 for(const y of [1.9,2.65]){box(4.1,.065,.42,walnut,-3,y,-4.65,shell);box(3.8,.018,.10,glow,-3,y-.042,-4.49,shell);}
 for(let i=0;i<7;i++)mug(-4.7+i*.32,1.94,-4.58,i%2?linen:clay,shell);
 for(let i=0;i<5;i++){box(.26,.36,.18,['#ba9670','#b8b5a1'][i%2],-4.55+i*.6,2.86,-4.6,shell);box(.12,.1,.015,plaster,-4.55+i*.6,2.85,-4.5,shell);}
 // Grinder, wash point and crockery all stay on the staff side.
 round(.4,.48,.42,.06,metal,-.7,1.2,-4.4);cyl(.17,.3,'#685040',-.7,1.59,-4.4);cyl(.18,.035,dark,-.7,1.76,-4.4);
 box(.6,.025,.42,metal,3.5,.98,-4.4);round(.48,.025,.32,.07,dark,3.5,1,-4.4);
 tube([[3.5,1,-4.67],[3.5,1.4,-4.67],[3.5,1.4,-4.4],[3.5,1.23,-4.4]],.022,metal);
 for(let i=0;i<5;i++)cyl(.15,.025,linen,.1,.98+i*.025,-4.4);
 // Low glass pastry vitrine and compact ordering point; no towering cage.
 round(1.55,.06,.75,.07,walnut,1.15,1.09,-2.1);box(1.55,.025,.75,glass,1.15,1.59,-2.1);
 for(const x of [.39,1.91])box(.02,.48,.75,glass,x,1.34,-2.1);box(1.55,.48,.02,glass,1.15,1.34,-1.73);
 for(const z of [-2.46,-1.74])box(1.55,.025,.025,metal,1.15,1.6,z);
 for(let i=0;i<4;i++){cyl(.13,.015,linen,.65+i*.32,1.13,-2.08);for(let j=0;j<3;j++)ell(.045,.065,.11,'#b77d46',.61+i*.32+j*.04,1.2,-2.08);}
 box(.12,.23,.12,dark,-.1,1.15,-2.15);const terminal=round(.37,.025,.28,.03,dark,-.1,1.3,-2.13);terminal.rotation.x=.5;
 // Bentwood backs, slender metal legs and upholstered seats replace block chairs.
 function chair(x,z,a){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=a;root.add(g);
  round(.50,.085,.48,.16,olive,0,.47,0,g);
  for(const dx of [-.18,.18])for(const dz of [-.17,.17])tube([[dx*1.15,.03,dz*1.2],[dx,.43,dz]],.018,metal,g);
  tube([[-.22,.48,-.16],[-.25,.78,-.19],[0,.85,-.26],[.25,.78,-.19],[.22,.48,-.16]],.035,walnut,g);
  const back=mesh(new T.CylinderGeometry(.25,.25,.18,32,1,true,-Math.PI*.43,Math.PI*.86),walnut,0,.75,-.02,g);back.rotation.y=Math.PI;back.material=mat(walnut).clone();back.material.side=T.DoubleSide;
 }
 for(const [i,t]of COFFEE_ROOM.tables.entries()){
  if(i===2)round(1.3,.055,1.1,.24,walnut,t.x,.76,t.z);else cyl(t.r,.055,i===0?stone:walnut,t.x,.76,t.z);
  cyl(.045,.68,metal,t.x,.37,t.z);cyl(.3,.028,metal,t.x,.025,t.z);
  for(const a of t.chairAngles||[0,Math.PI])chair(t.x+Math.sin(a)*1.05,t.z+Math.cos(a)*1.05,a);
  mug(t.x-.2,.795,t.z+.12,i%2?clay:linen);box(.23,.018,.3,'#ad8769',t.x+.22,.8,t.z-.1);
 }
 // Upholstered banquette occupies the perimeter, leaving the central routes open.
 round(.85,.42,4.7,.30,walnut,5.37,.23,1.2);round(.9,.16,4.7,.32,clay,5.32,.49,1.2);
 round(.16,.62,4.65,.07,clay,5.75,.77,1.2);
 for(const z of [-.3,.65,1.6,2.55]){const cushion=round(.53,.16,.57,.12,linen,5.32,.62,z);cushion.rotation.z=-.12;}
 // Low library and listening nook with a turntable and two honest speaker enclosures.
 round(1.8,.7,.65,.05,walnut,4.7,.37,-4.35);box(1.65,.045,.7,stone,4.7,.75,-4.35);
 for(let i=0;i<8;i++)box(.09,.45,.33,['#92745b','#727b68','#a86c53'][i%3],4.03+i*.13,.43,-4.15);
 box(.46,.06,.35,dark,4.55,.82,-4.35);cyl(.15,.012,'#242522',4.55,.858,-4.35);
 for(const x of [4,5.4]){box(.24,.35,.25,walnut,x,.97,-4.4);const cone=cyl(.075,.015,dark,x,.98,-4.265);cone.rotation.x=Math.PI/2;}
 function plant(x,z,s=1){vase(x,0,z,.48*s,stone);tube([[x,.3*s,z],[x-.08*s,1.3*s,z],[x+.12*s,2*s,z]],.022*s,walnut);
  for(let i=0;i<11;i++){const a=i*2.4,y=.8+(i%5)*.23,dx=Math.cos(a)*.37*s,dz=Math.sin(a)*.37*s;tube([[x,y*s,z],[x+dx,y*s+.12,z+dz]],.009*s,walnut);const leaf=ell(.16*s,.035*s,.29*s,i%2?'#6a7960':'#485e49',x+dx,y*s+.12,z+dz);leaf.rotation.set(.25,a,.3);}}
 plant(-5.55,4.45,.6);plant(5,-3,.8);vase(-3.7,.8,2.5,.22,clay);
 // A physical branded sign, separate from player controls.
 round(3.1,1.2,.09,.04,walnut,.35,2.55,-4.79,shell);
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f7e7e5';ctx.fillRect(0,0,1024,384);
  ctx.textAlign='center';ctx.fillStyle='#682c40';ctx.font='italic 92px Georgia';ctx.fillText('Pretty Pink',512,140);
  ctx.font='42px Georgia';ctx.fillText('C O F F E E   H O U S E',512,224);
  ctx.font='30px Georgia';ctx.fillText('B E R G U N D Y',512,300);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  mesh(new T.PlaneGeometry(2.94,1.08),new T.MeshBasicMaterial({map:texture}),.35,2.55,-4.733,shell);
 }
 // Cat furniture belongs in the seating zone, with no perch on food preparation.
 function cat(x,y,z,a,coat,pose='sit'){
  const g=new T.Group();g.name='Scenic cat — '+pose;root.add(g);g.position.set(x,y,z);g.rotation.y=a;
  const sleeping=pose==='sleep';
  ell(sleeping?.28:.17,sleeping?.14:.25,sleeping?.19:.20,coat,0,sleeping?.15:.27,0,g);
  const hx=sleeping?.17:0,hy=sleeping?.19:.55,hz=sleeping?.06:.06;
  ell(.14,.13,.13,coat,hx,hy,hz,g);
  for(const side of [-1,1]){const ear=mesh(new T.ConeGeometry(.075,.16,3),coat,hx+side*.095,hy+.12,hz,g);ear.rotation.z=-side*.18;ell(.037,.048,.008,'#ca8f9c',hx+side*.095,hy+.13,hz+.035,g);}
  for(const side of [-1,1]){ell(.025,.028,.013,'#f4e9dc',hx+side*.05,hy-.025,hz+.12,g);if(sleeping)tube([[hx+side*.065-.018,hy+.016,hz+.122],[hx+side*.065+.018,hy+.016,hz+.128]],.006,dark,g);else ell(.013,.019,.009,'#423638',hx+side*.052,hy+.022,hz+.12,g);}
  ell(.014,.012,.01,'#a16476',hx,hy-.015,hz+.14,g);
  for(const side of [-1,1])ell(.06,.055,.10,coat,side*.085,.055,.15,g);
  tube([[.09,.12,-.13],[.30,.09,-.13],[.32,.07,.13],[.15,.08,.25]],.047,coat,g);
  if(!sleeping){const collar=mesh(new T.TorusGeometry(.10,.014,8,32),walnut,0,.45,.06,g);collar.rotation.x=Math.PI/2;ell(.025,.028,.012,'#c9a270',0,.43,.16,g);}
 }
 function bed(x,y,z){round(.88,.12,.7,.30,walnut,x,y+.06,z);round(.73,.12,.57,.24,clay,x,y+.15,z);}
 bed(-4.95,0,3.9);cat(-4.95,.22,3.9,.5,'#d6b28b','sleep');
 cat(5.28,.71,2.65,-Math.PI/2,'#eee1ce','sleep');
 // Climber: grounded scratch posts, staggered platforms, and a sheltered cubby.
 round(.95,.08,.85,.15,walnut,-5.23,.04,1.35);
 for(const [x,z,h]of [[-5.45,1.2,1.35],[-5.03,1.55,.78]]){cyl(.07,h,'#c6ad8e',x,h/2+.08,z);for(let y=.18;y<h;y+=.095)cyl(.073,.012,'#b99b7f',x,y,z);}
 round(.74,.08,.62,.22,clay,-5.45,1.47,1.2);round(.67,.08,.6,.20,linen,-5.03,.9,1.55);
 cat(-5.43,1.51,1.2,.7,'#9b7461');
 // Wall-mounted cat steps follow the window edge rather than the staff counter.
 for(const [z,y]of [[-.5,.85],[.2,1.15]]){round(.52,.07,.48,.12,walnut,-5.7,y,z);box(.03,.28,.25,walnut,-5.85,y-.14,z);}
 // A few small flowers and a watering bowl make the theme legible at close scale.
 for(const [x,z]of [[4,-1.1],[3.5,2.5]]){vase(x,.8,z,.2,linen);for(let i=0;i<3;i++){const dx=(i-1)*.055;tube([[x,.9,z],[x+dx,1.16+i*.025,z]],.006,'#6b8066');for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ell(.034,.022,.034,i%2?'#b85576':'#edb4c2',x+dx+Math.cos(a)*.033,1.17+i*.025,z+Math.sin(a)*.033);}ell(.018,.02,.018,'#d3ad6e',x+dx,1.18+i*.025,z);}}
 cyl(.14,.045,linen,-5.15,.025,3.25);cyl(.11,.008,'#adc7cd',-5.15,.051,3.25);
 // Opal pendants and a linear bar light have thin fittings and soft luminous bodies.
 for(const [x,z,r]of [[-3.8,1.2,.34],[3.8,1.6,.42]]){cyl(.012,.7,dark,x,3.25,z,shell);ell(r,r*.8,r,glow,x,2.72,z,shell);cyl(.065,.08,metal,x,3,z,shell);}
 for(const x of [-3.6,.6])cyl(.012,.52,dark,x,3.25,-2.1,shell);
 round(4.8,.07,.18,.08,walnut,-1.5,2.98,-2.1,shell);box(4.6,.018,.12,glow,-1.5,2.934,-2.1,shell);
 const grid=new T.Group();grid.name='One human per hex scale';grid.visible=false;root.add(grid);const lineMat=new T.LineBasicMaterial({color:'#476e64',transparent:true,opacity:.45});for(const h of coffeeHexes()){const points=[];for(let i=0;i<=6;i++){const a=Math.PI/6+i*Math.PI/3;points.push(new T.Vector3(h.x+Math.cos(a)*h.r,.045,h.z+Math.sin(a)*h.r));}grid.add(new T.Line(new T.BufferGeometry().setFromPoints(points),lineMat));}
 return {root,grid,shell,report:{...COFFEE_ROOM,occupants:[],design:'Pretty Pink Coffee House Bergundy — blush, burgundy, cream, cat perches and floral accents',cats:{count:3,behavior:'static scenic poses; no autonomous cat simulation',locations:['window climber','front bed','banquette']},scale:'1 metre across a hex; approximately one standing human',zones:['arrival','order and pickup','barista aisle','washing and storage','window seating','reading nook','shared tables']}};
}
