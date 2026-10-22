// Buildings are fitted to their irregular parcels with bilinear coordinates.
// All artwork here is original procedural geometry; no Townscaper assets are used.
export function buildMarketArt(T,w,people,dressing={items:[]}){
 const style=w.config.style;
 const layers={work:new T.Group(),life:new T.Group(),landscape:new T.Group()};

 const cloth=['#b47f65','#799c96','#c5aa6c','#9096ac','#b9b48a'];
 let grain=null;if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),img=ctx.createImageData(64,64);for(let i=0;i<4096;i++){const v=220+Math.floor(22*Math.abs(Math.sin(i*12.9898)));img.data.set([v,v,v,255],i*4);}ctx.putImageData(img,0,0);grain=new T.CanvasTexture(canvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(4,4);}

 const world=new T.Group(),roofs=[],actors=[],ownGoods=[],gridLines=new T.Group(),materials=new Map();world.add(gridLines,...Object.values(layers));gridLines.visible=false;
 const mat=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.88,side:T.DoubleSide,map:grain,bumpMap:grain,bumpScale:.035}));return materials.get(color);};
 const mesh=(geo,color,x=0,y=0,z=0,parent=world)=>{const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(x,y,z,sx,sy,sz,color,parent=world)=>mesh(new T.BoxGeometry(sx,sy,sz),color,x,y,z,parent);
 const ball=(x,y,z,r,color,parent=world)=>mesh(new T.IcosahedronGeometry(r,1),color,x,y,z,parent);
 const beam=(a,b,r,color,parent=world)=>{const start=new T.Vector3(a.x,a.y,a.z),end=new T.Vector3(b.x,b.y,b.z),delta=end.clone().sub(start);const m=mesh(new T.CylinderGeometry(r,r,delta.length(),7),color,0,0,0,parent);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;};
 const at=(c,u,v)=>({x:c[0].x*(1-u)*(1-v)+c[1].x*u*(1-v)+c[2].x*u*v+c[3].x*(1-u)*v,z:c[0].z*(1-u)*(1-v)+c[1].z*u*(1-v)+c[2].z*u*v+c[3].z*(1-u)*v});
 const corners=(c,a,b,d,e)=>[at(c,a,d),at(c,b,d),at(c,b,e),at(c,a,e)];
 const slab=(points,y,h,color,parent=world)=>{const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelThickness:.08,bevelSize:.08,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);return mesh(geo,color,0,y,0,parent);};
 const face=(p,color,parent=world)=>{const geo=new T.BufferGeometry(),a=[];for(let i=1;i<p.length-1;i++)for(const v of [p[0],p[i],p[i+1]])a.push(v.x,v.y,v.z);geo.setAttribute('position',new T.Float32BufferAttribute(a,3));geo.computeVertexNormals();return mesh(geo,color,0,0,0,parent);};
 const panel=(a,b,y,h,color,parent=world)=>face([{...a,y},{...b,y},{...b,y:y+h},{...a,y:y+h}],color,parent);
 function tree(x,z,scale=1){beam({x,y:.1,z},{x:x+.15*scale,y:3.1*scale,z:z+.1},.21*scale,'#85735b');for(const [dx,dy,dz,r,col]of [[0,3.8,0,1.6,'#719278'],[-.9,3.1,.4,1.2,'#86a37a'],[.8,3.2,-.5,1.25,'#8aa978'],[.15,4.4,.2,1.1,'#a3b783']])ball(x+dx*scale,dy*scale,z+dz*scale,r*scale,col);}
 function pot(x,z,color='#e2ae79'){mesh(new T.CylinderGeometry(.37,.25,.55,8),'#be8565',x,.35,z);for(let i=0;i<5;i++){const a=i*2.4;ball(x+Math.cos(a)*.25,.84+Math.sin(i)*.08,z+Math.sin(a)*.25,.22,color);}}
 const gate=w.nodes.find(n=>n.id==='gate'),drop=w.nodes.find(n=>n.id==='drop'),store=w.nodes.find(n=>n.id==='store'),home=w.nodes.find(n=>n.id==='home');
 const hex=w.tile.corners;
 const clip=(poly,a,b)=>{const side=p=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x),out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(p),sq=side(q);if(sp>=-1e-8)out.push(p);if((sp>=0)!==(sq>=0)){const t=sp/(sp-sq);out.push({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t});}}return out;};
 const insideHex=poly=>hex.reduce((p,a,i)=>clip(p,a,hex[(i+1)%6]),poly);
 slab(hex,-.05-.45/w.tile.display.scale,.45/w.tile.display.scale-.35,'#b3a58a');
 if(!w.waterfront)slab(hex,-.4,.35,'#b4c29a');
 if(w.waterfront){
  const {bankZ,minX,maxX}=w.waterfront,mid=(minX+maxX)/2,landing=w.nodes.find(n=>n.id==='landing');
  const land=clip(hex,{x:1,z:bankZ},{x:0,z:bankZ}),water=clip(hex,{x:0,z:bankZ},{x:1,z:bankZ});
  slab(land,-.4,.35,'#b4c29a');slab(water,-.4,.15,'#77aaa4');
  const ends=land.filter(p=>Math.abs(p.z-bankZ)<1e-6).sort((a,b)=>a.x-b.x);if(ends.length>1)beam({...ends[0],y:-.05},{...ends.at(-1),y:-.05},.15,'#988b69');
  for(let i=0;i<14;i++)box(landing.x,.13,bankZ-1+i*.28,3,.17,.24,'#b39971');
  for(const dx of [-1.5,1.5])for(const dz of [-.8,2.7])box(landing.x+dx,.15,bankZ+dz,.15,1.3,.15,'#8d7759');
  for(const dx of [-8,8]){const x=landing.x+dx,z=bankZ+5;
   const hull=[{x:x-4.5,z},{x:x-3.4,z:z-1.2},{x:x+3.4,z:z-1.2},{x:x+4.5,z},{x:x+3.4,z:z+1.2},{x:x-3.4,z:z+1.2}];
   slab(hull,-.25,.42,'#866c51');
   slab([{x:x-3.5,z:z-.85},{x:x+3.5,z:z-.85},{x:x+3.5,z:z+.85},{x:x-3.5,z:z+.85}],.18,.08,'#5e5949');
   for(let i=0;i<6;i++){const a=hull[i],b=hull[(i+1)%6];panel(a,b,.16,.4,'#ac8058');beam({...a,y:.56},{...b,y:.56},.085,'#d3ad76');}
   for(const offset of [-2.4,1.9])box(x+offset,.46,z,.36,.15,1.8,'#c2a477');
   for(let j=0;j<4;j++){box(x-.8+j*.65,.4,z-.25,.5,.2,.65,'#ba9663');ball(x-.8+j*.65,.66,z-.25,.28,j%2?'#a8b466':'#dfaf69');}
   mesh(new T.CylinderGeometry(.27,.34,.55,8),'#729995',x-2.4,.9,z);ball(x-2.4,1.35,z,.26,'#dfbd98');mesh(new T.CylinderGeometry(.43,.43,.09,12),'#e4cd9c',x-2.4,1.61,z);
   beam({x:x-2.3,y:.7,z:z-.7},{x:x-.8,y:-.1,z:z-2},.055,'#d8bd87');
  }
 }
 for(const c of w.cells)slab(c.corners,-.01,.075,style==='canal'?'#bdab87':style==='souk'?'#d5b998':c.id===w.plaza.id?'#e1d3b8':'#d8ccb4');
 // The same graph used by the simulator draws the walkable lanes.
 for(const e of w.edges){const a=w.nodes.find(n=>n.id===e.a),b=w.nodes.find(n=>n.id===e.b),dx=b.x-a.x,dz=b.z-a.z,len=e.length,nx=-dz/len,nz=dx/len,width=e.a==='home'?3:1.5;
  const paving=insideHex([{x:a.x+nx*width/2,z:a.z+nz*width/2},{x:b.x+nx*width/2,z:b.z+nz*width/2},{x:b.x-nx*width/2,z:b.z-nz*width/2},{x:a.x-nx*width/2,z:a.z-nz*width/2}]);if(paving.length>=3)slab(paving,.065,.025,'#e6d7b8');
  const inMarket=id=>id.startsWith('v-')||id.startsWith('stall-');const onBoundary=w.boundary.some(q=>Math.abs((a.x-q.a.x)*(q.b.z-q.a.z)-(a.z-q.a.z)*(q.b.x-q.a.x))<.001&&Math.abs((b.x-q.a.x)*(q.b.z-q.a.z)-(b.z-q.a.z)*(q.b.x-q.a.x))<.001);
  if((style==='souk'||style==='arcade')&&inMarket(e.a)&&inMarket(e.b)&&!onBoundary){
   const cover=new T.Group();world.add(cover);roofs.push(cover);const h=style==='arcade'?4.7:4.2,rise=style==='arcade'?.8:0;
   for(const side of [-1,1]){const pa={x:a.x+nx*1.05*side,z:a.z+nz*1.05*side},pb={x:b.x+nx*1.05*side,z:b.z+nz*1.05*side};
    beam({...pa,y:.1},{...pa,y:h},.065,'#8a795e',cover);
    face([{...pa,y:h},{...pb,y:h},{...b,y:h+rise},{...a,y:h+rise}],style==='arcade'?'#c6d4cb':'#bca578',cover);
    beam({...pa,y:h+.02},{...pb,y:h+.02},.05,'#948973',cover);
   }
  }
 }
 for(const c of w.cells){const points=c.corners.map(p=>new T.Vector3(p.x,.24,p.z));points.push(points[0]);const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#577b92',depthTest:false}));gridLines.add(line);}
 const pc=w.plaza.center;
 // A small well gives the lanes a destination without occupying their edges.
 mesh(new T.CylinderGeometry(1.1,1.2,.5,12),'#acac99',pc.x,.3,pc.z);mesh(new T.CylinderGeometry(.82,.82,.03,12),'#719a9a',pc.x,.57,pc.z);
 for(const x of [-1,1])box(pc.x+x,1.5,pc.z,.15,2.7,.15,'#8f7456');
 face([{x:pc.x-1.5,y:2.6,z:pc.z-1.2},{x:pc.x,y:3.4,z:pc.z-1.2},{x:pc.x,y:3.4,z:pc.z+1.2},{x:pc.x-1.5,y:2.6,z:pc.z+1.2}],'#cb8b65');face([{x:pc.x,y:3.4,z:pc.z-1.2},{x:pc.x+1.5,y:2.6,z:pc.z-1.2},{x:pc.x+1.5,y:2.6,z:pc.z+1.2},{x:pc.x,y:3.4,z:pc.z+1.2}],'#dfaa7b');
 for(const s of w.stalls){
  const g=new T.Group();g.userData.place=s.id;world.add(g);const c=s.corners,base=corners(c,.18,.82,.18,.82),height=s.height;
  slab(base,.13,.16,s.indoor?'#bdb8a4':'#c1b58e',g);
  if(s.indoor){
   const wall=s.color;for(let i=1;i<4;i++)panel(base[i],base[(i+1)%4],.3,height,wall,g);
   for(const [a,b]of [[.18,.39],[.61,.82]])roofs.push(panel(at(c,a,.18),at(c,b,.18),.3,height,wall,g));
   panel(at(c,.39,.18),at(c,.61,.18),height-.65,.95,wall,g);
   // Door jambs and high lintel make a readable entrance in roof and cutaway views.
   for(const u of [.39,.61]){const p=at(c,u,.175);beam({...p,y:.3},{...p,y:height-.65},.09,'#f7e8c6',g);}
   for(const v of [.37,.65]){const a=at(c,.819,v-.07),b=at(c,.819,v+.07);panel(a,b,1.7,.9,'#526e71',g);beam({...a,y:1.65},{...b,y:1.65},.08,'#f3dfba',g);}
   const roofColors=style==='arcade'?['#667e80','#75898a','#7d858a','#7d9591']:['#bd735b','#739b94','#d4a35e','#8c91a0'],color=roofColors[s.cellId%4],roofGroup=new T.Group();g.add(roofGroup);roofs.push(roofGroup);
   const eave=height+.3,ridge=eave+1.4;
   if(style==='souk'){
    slab(corners(c,.16,.84,.16,.84),eave,.2,'#dfc5a1',roofGroup);
    const rim=corners(c,.18,.82,.18,.82);for(let i=0;i<4;i++)panel(rim[i],rim[(i+1)%4],eave,.48,wall,roofGroup);
   }else{
   for(const [u1,u2]of [[.13,.5],[.5,.87]]){const y1=u1===.5?ridge:eave,y2=u2===.5?ridge:eave;face([{...at(c,u1,.12),y:y1},{...at(c,u2,.12),y:y2},{...at(c,u2,.88),y:y2},{...at(c,u1,.88),y:y1}],color,roofGroup);}
   for(const v of [.12,.88])face([{...at(c,.13,v),y:eave},{...at(c,.87,v),y:eave},{...at(c,.5,v),y:ridge}],wall,roofGroup);
   for(let k=1;k<5;k++)for(const [u1,u2]of [[.13,.5],[.5,.87]]){const u=u1+(u2-u1)*k/5,y=eave+(1-Math.abs(u-.5)/.37)*1.4+.025;beam({...at(c,u,.12),y},{...at(c,u,.88),y},.025,'#a47b62',roofGroup);}
   const chimney=at(c,.7,.69);box(chimney.x,eave+.7,chimney.z,.55,1.6,.6,'#dcc6a1',roofGroup);box(chimney.x,eave+1.53,chimney.z,.7,.14,.75,'#b79171',roofGroup);
   }
   if(style==='arcade')for(let k=0;k<4;k++)panel(at(c,.39+k*.055,.17),at(c,.438+k*.055,.17),height-1.3,.65,s.cellId%2?'#678b94':'#bd8069',g);
  }else{
   const canopy=new T.Group();g.add(canopy);roofs.push(canopy);
   // Fabric sags between supports, with scalloped valances and alternating strips.
   for(const u of [.2,.8])for(const v of [.22,.76]){const p=at(c,u,v);beam({...p,y:.25},{...p,y:3.15},.075,'#917654',g);}
   for(let stripe=0;stripe<6;stripe++){const u0=.14+stripe*.12,u1=u0+.12,color=style==='canal'?(stripe%2?'#d8caa4':cloth[s.cellId%cloth.length]):stripe%2?'#f4e7c5':s.color;for(let k=0;k<5;k++){const v0=.14+k*.14,v1=v0+.14,y=v=>style==='canal'?3.1+.7*Math.sin((v-.14)/.7*Math.PI):3.35-.42*Math.sin((v-.14)/.7*Math.PI);face([{...at(c,u0,v0),y:y(v0)},{...at(c,u1,v0),y:y(v0)},{...at(c,u1,v1),y:y(v1)},{...at(c,u0,v1),y:y(v1)}],color,canopy);}const a=at(c,u0,.14),b=at(c,u1,.14),m=at(c,(u0+u1)/2,.14);face([{...a,y:3.1},{...b,y:3.1},{...b,y:2.9},{...m,y:2.8},{...a,y:2.9}],color,canopy);}
  }
  const counter=corners(c,.28,.72,.27,.39);slab(counter,.35,.85,'#a98761',g);slab(counter,1.2,.1,'#ddc399',g);
  for(let i=0;i<5;i++){const p=at(c,.32+i*.09,.33);box(p.x,1.4,p.z,.42,.22,.4,'#9b805a',g);let item;
   if(s.trade==='Flowers'){for(let j=0;j<3;j++)ball(p.x+(j-1)*.11,1.85,p.z,.15,['#e4b18b','#e5dcb0','#b8b5cf'][j],g);item=mesh(new T.CylinderGeometry(.15,.1,.4,7),'#84a289',p.x,1.6,p.z,g);}
   else if(s.trade==='Bread'){item=mesh(new T.SphereGeometry(.19,8,6),'#dfb77e',p.x,1.61,p.z,g);item.scale.z=1.6;}
   else if(s.trade==='Preserves')item=mesh(new T.CylinderGeometry(.14,.14,.35,8),'#c48272',p.x,1.6,p.z,g);
   else if(s.trade==='Cloth')item=box(p.x,1.6,p.z,.38,.12,.4,s.color,g);
   else item=ball(p.x,1.63,p.z,.19,i%2?'#a7b367':'#d38c60',g);
   if(s.id===w.booth)ownGoods.push(item);
  }
  const plant=at(c,.77,.22);pot(plant.x,plant.z,s.trade==='Flowers'?'#e1a0ab':'#9daf79');
  const crate=at(c,.75,.65);box(crate.x,.5,crate.z,.65,.7,.65,'#b59b73',g);for(const y of [.35,.58])box(crate.x,y,crate.z+.34,.68,.05,.04,'#8d7859',g);
  const frontA=at(c,.25,.05),frontB=at(c,.75,.05);if(!s.indoor){beam({...frontA,y:3.6},{...frontB,y:3.6},.018,'#887d64',g);for(let i=0;i<5;i++){const u=.27+i*.1,p=at(c,u,.05),p2=at(c,u+.07,.05);face([{...p,y:3.55},{...p2,y:3.55},{x:(p.x+p2.x)/2,z:(p.z+p2.z)/2,y:3.15}],['#d99778','#e3c777','#8dafa2'][i%3],g);}}
  if(s.id===w.booth){const p=at(c,.84,.17);beam({...p,y:.2},{...p,y:4.3},.06,'#8a7455',g);face([{...p,y:4.25},{x:p.x+1,y:3.9,z:p.z},{...p,y:3.55}],'#e9b94e',g);}
 }
 // A little cart court and a sheltered store sit beside the entrance.
 box(drop.x,.22,drop.z,5,.2,3.5,'#cabb9d');box(drop.x,.8,drop.z,2.1,.22,1.2,'#ad8761');for(const dx of [-.8,.8])for(const dz of [-.65,.65]){const wheel=mesh(new T.CylinderGeometry(.38,.38,.12,10),'#766954',drop.x+dx,.44,drop.z+dz);wheel.rotation.x=Math.PI/2;}box(drop.x,1.1,drop.z-.58,2.1,.65,.12,'#b89a70');
 box(store.x,.15,store.z,4.5,.2,3.8,'#c3b08c');box(store.x-2.2,1.4,store.z,.15,2.6,3.8,'#d7c09a');for(const dz of [-1.9,1.9])box(store.x,1.4,store.z+dz,4.5,2.6,.15,'#d7c09a');for(const dz of [-1.65,1.65])box(store.x+2.2,1.4,store.z+dz,.15,2.6,.5,'#d7c09a');const storeRoof=box(store.x,2.9,store.z,5.1,.22,4.5,'#819d8c');storeRoof.rotation.z=.1;pot(store.x-2.8,store.z,'#c9b78f');for(let i=0;i<3;i++)box(store.x-1.3,.55,store.z-.9+i*.9,.7,.8,.7,'#b29673');
 // Home is outside this scene tile; its route remains in the simulation.
 for(const p of people){const g=new T.Group();world.add(g);mesh(new T.CylinderGeometry(.32,.43,1.1,8),p.id?'#c4905e':'#658f9a',0,.8,0,g);ball(0,1.55,0,.29,'#dfbd98',g);mesh(new T.CylinderGeometry(.44,.44,.1,12),'#e4cd9c',0,1.81,0,g);const basket=box(.5,.7,0,.42,.4,.4,'#b89a6a',g);actors.push({g,basket});}

 // Dressing is separate from functional geometry and uses audited semantic anchors.
 function localPerson(g,color){
  for(const x of [-.13,.13])box(x,.35,0,.16,.6,.19,'#675f50',g);
  mesh(new T.CylinderGeometry(.23,.32,.7,7),color,0,.94,0,g);ball(0,1.52,0,.25,'#d2ab87',g);
  mesh(new T.CylinderGeometry(.4,.4,.08,10),'#dcca99',0,1.77,0,g);
  beam({x:-.23,y:1.12,z:0},{x:-.35,y:.9,z:-.28},.08,'#d2ab87',g);beam({x:.23,y:1.12,z:0},{x:.35,y:.9,z:-.28},.08,'#d2ab87',g);
 }
 function basket(g,x,z,goods=true){mesh(new T.CylinderGeometry(.37,.27,.45,9),'#ae8b5d',x,.31,z,g);for(const y of [.13,.28,.43,.54]){const ring=mesh(new T.TorusGeometry(.29+y*.12,.022,4,10),'#d0b180',x,y,z,g);ring.rotation.x=Math.PI/2;}if(goods)for(let i=0;i<5;i++)ball(x+Math.cos(i*2.4)*.2,.59,z+Math.sin(i*2.4)*.2,.14,i%2?'#c89261':'#94a263',g);}
 function jar(g,x,z,h=.8){mesh(new T.CylinderGeometry(.22,.31,h*.7,9),'#b57e62',x,h*.36+.07,z,g);mesh(new T.CylinderGeometry(.16,.22,h*.3,9),'#c99471',x,h*.85+.07,z,g);mesh(new T.CylinderGeometry(.12,.12,.025,9),'#675e4c',x,h+.08,z,g);}
 function bush(g,x,z,r,color){ball(x,r*.6,z,r,color,g);}
 for(const item of dressing.items){const g=new T.Group();g.position.set(item.x,.1,item.z);g.rotation.y=-item.angle||0;g.userData.dressingId=item.id;layers[item.pass].add(g);const v=item.variation;
  if(item.kind==='person'){localPerson(g,item.color);continue;}
  if(item.kind==='stock'){
   if(item.trade==='Cloth'){for(let i=0;i<4;i++)box(0,.2+i*.16,0,.85,.14,.65,cloth[(i+Math.floor(v*5))%5],g);}
   else if(item.trade==='Preserves'){for(const [x,z,h]of [[-.28,0,.75],[.26,.14,.95],[0,-.32,.55]])jar(g,x,z,h);}
   else if(item.trade==='Tools'){box(0,.3,0,.75,.45,.65,'#ab865c',g);for(let i=0;i<3;i++){beam({x:-.25+i*.25,y:.45,z:0},{x:-.2+i*.25,y:1.1,z:.1},.04,'#806444',g);box(-.2+i*.25,1.1,.1,.25,.12,.12,'#707974',g);}}
   else {basket(g,-.22,0);basket(g,.28,.25,item.trade!=='Bread');}
  }
  if(item.kind==='display'){
   box(0,.01,0,2.6,.035,1.9,['#b8886d','#a9ad80','#819d97'][Math.floor(v*3)],g);
   for(let i=0;i<5;i++)box(-1.15+i*.55,.035,0,.035,.015,1.8,'#dbcfad',g);
   box(0,.85,0,1.65,.15,.75,'#ac8c61',g);for(const x of [-.65,.65])for(const z of [-.25,.25])box(x,.43,z,.1,.85,.1,'#80694d',g);
   if(item.trade==='Cloth'){for(let i=0;i<3;i++)box(-.5+i*.48,1.02,0,.4,.15,.6,cloth[i],g);}
   else if(item.trade==='Preserves'){for(let i=0;i<3;i++){const vessels=new T.Group();vessels.position.set(-.5+i*.5,.93,0);vessels.scale.setScalar(.55);g.add(vessels);jar(vessels,0,0);}}
   else for(let i=0;i<7;i++)ball(-.6+(i%4)*.35,1.07+(i>3?.16:0),i>3?0:-.15,.18,item.trade==='Bread'?'#dcb781':i%2?'#afba71':'#ce8d61',g);
   basket(g,-1,.4);jar(g,1,.35,.85);box(.9,.45,-.6,.65,.7,.6,'#b1966c',g);
  }
  if(item.kind==='wares'){jar(g,0,0,.9);basket(g,.15,-.24,false);}
  if(item.kind==='rest'){box(0,.65,0,2,.18,.6,'#ad8e67',g);for(const x of [-.75,.75])box(x,.32,0,.18,.65,.4,'#876f53',g);basket(g,1.25,.1,false);}
  if(item.kind==='garden'||item.kind==='tree'){
   const patch=mesh(new T.CircleGeometry(1.3,9),'#9eac80',0,-.015,0,g);patch.rotation.x=-Math.PI/2;
   for(let i=0;i<6;i++){const a=i*2.4,d=.5+(i%2)*.5;bush(g,Math.cos(a)*d,Math.sin(a)*d,.22+(i%3)*.08,['#7e946c','#9eab7b','#b0b98b'][i%3]);}
   if(item.kind==='tree'){g.scale.setScalar(1.5);beam({x:0,y:0,z:0},{x:.13,y:2.6,z:.15},.17,'#837058',g);beam({x:.07,y:1.6,z:.08},{x:-.6,y:2.5,z:.2},.1,'#837058',g);for(const [x,y,z,r,col]of [[0,3.1,0,.9,'#86a278'],[-.55,2.6,.2,.65,'#71916c'],[.5,2.8,-.3,.65,'#a3b485']])ball(x,y,z,r,col,g);}
   else for(let i=0;i<3;i++){const rock=ball(-.8+i*.65,.12,.6,.18,'#c3bb9b',g);rock.scale.y=.65;}
  }
 }
 const translucent=new Map();
 const setRoofMode=mode=>{for(const roof of roofs){roof.visible=mode!=='cutaway';roof.traverse(o=>{if(!o.material)return;const base=o.userData.opaqueMaterial??o.material;o.userData.opaqueMaterial=base;if(mode==='xray'){if(!translucent.has(base)){const m=base.clone();m.transparent=true;m.opacity=.26;m.depthWrite=false;translucent.set(base,m);}o.material=translucent.get(base);o.castShadow=false;}else{o.material=base;o.castShadow=true;}});}};
 const setMaterials=enabled=>{for(const m of [...materials.values(),...translucent.values()]){m.map=enabled?grain:null;m.bumpMap=enabled?grain:null;m.needsUpdate=true;}};

 const scale=w.tile.display.scale;world.scale.setScalar(scale);world.position.set(-w.tile.cx*scale,0,-w.tile.cz*scale);
 return {world,roofs,actors,ownGoods,gridLines,layers,setMaterials,setRoofMode,grain,disposeMaterials:()=>{for(const m of [...materials.values(),...translucent.values()])m.dispose();}};
}
