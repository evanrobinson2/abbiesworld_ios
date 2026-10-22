// Family Teleport model kit: ~140 simple, named, procedural models.
// Each recipe builds a semantic part hierarchy (named groups and meshes) at three levels of
// detail: 0 blockout (a few low-poly parts, appears instantly), 1 simple, 2 full (faces,
// spots, trims). Recipes are code, so a whole world costs no download and no model tokens;
// only answers the kit cannot match go to the modeler as new model orders.
import * as T from 'three';

const geoCache=new Map(),matCache=new Map();
const SEG=[6,10,20];
function geo(kind,seg){
 const key=kind+seg;if(geoCache.has(key))return geoCache.get(key);
 const g=kind==='ball'?new T.SphereGeometry(.5,seg,Math.max(4,seg*.7|0)):kind==='box'?new T.BoxGeometry(1,1,1):kind==='cyl'?new T.CylinderGeometry(.5,.5,1,seg):kind==='cone'?new T.ConeGeometry(.5,1,seg):kind==='torus'?new T.TorusGeometry(.5,.18,Math.max(4,seg/2|0),seg*2):kind==='cap'?new T.CapsuleGeometry(.5,1,Math.max(2,seg/4|0),seg):kind==='pyr'?new T.ConeGeometry(.5,1,4):null;
 geoCache.set(key,g);return g;
}
export function mat(color,{glow=0,detail=2,metal=0,opacity=1}={}){
 const key=[color,glow,detail?1:0,metal,opacity].join();if(matCache.has(key))return matCache.get(key);
 const m=new T.MeshStandardMaterial({color,roughness:metal?.35:.72,metalness:metal,flatShading:detail===0,emissive:glow?color:'#000',emissiveIntensity:glow,transparent:opacity<1,opacity});
 matCache.set(key,m);return m;
}

// The part builder handed to every recipe. Sizes are full extents, positions are centres.
function builder(root,detail){
 const seg=SEG[detail];
 function add(kind,name,color,size,pos=[0,0,0],o={}){
  if(o.d!==undefined&&detail<o.d)return null;
  const m=new T.Mesh(geo(kind,o.seg??seg),mat(color,{glow:o.glow,detail,metal:o.metal,opacity:o.opacity}));
  m.name=name;m.scale.set(...size);m.position.set(...pos);if(o.r)m.rotation.set(...o.r);
  m.castShadow=detail>0&&!o.noShadow;m.receiveShadow=detail>0;(o.parent||root).add(m);return m;
 }
 const p={detail,root,
  ball:(n,c,s,pos,o)=>add('ball',n,c,s,pos,o),box:(n,c,s,pos,o)=>add('box',n,c,s,pos,o),
  cyl:(n,c,s,pos,o)=>add('cyl',n,c,s,pos,o),cone:(n,c,s,pos,o)=>add('cone',n,c,s,pos,o),
  torus:(n,c,s,pos,o)=>add('torus',n,c,s,pos,o),cap:(n,c,s,pos,o)=>add('cap',n,c,s,pos,o),pyr:(n,c,s,pos,o)=>add('pyr',n,c,s,pos,o),
  // A pivot group (hip, shoulder, wing root) so the part can swing.
  joint(name,pos,parent=root){const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;},
  eyes(y,z,spread,size=.07,parent){if(detail<1)return;for(const s of [-1,1]){add('ball','eye',  '#ffffff',[size,size,size*.6],[s*spread,y,z],{parent,seg:8});add('ball','pupil','#1d1a18',[size*.55,size*.55,size*.4],[s*spread,y,z+size*.25],{parent,seg:8,d:1});}},
 };
 return p;
}

// ---- families of recipes ------------------------------------------------------------------
// Four-legged animals: one parametric body covers dogs to giraffes.
function quad(p,c,q){
 const L=q.len??1,H=q.leg??.35,W=q.wid??.55,BH=q.bodyH??.5,y=H+BH/2;
 const body=p.joint('body',[0,0,0]);
 p.ball('torso',c.main,[W,BH,L],[0,y,0],{parent:body});
 if(q.spots&&p.detail>1)for(let i=0;i<5;i++)p.ball('spot',c.accent,[W*.32,BH*.3,L*.22],[(i%2?.5:-.5)*W*.62,y+BH*.18*(i%3-1),(i/4-.5)*L*.7],{parent:body,seg:8});
 if(q.stripes&&p.detail>1)for(let i=0;i<5;i++)p.box('stripe',c.accent,[W*1.02,BH*.92,L*.06],[0,y,(i/4-.5)*L*.7],{parent:body});
 const legs=[[-1,1],[1,1],[-1,-1],[1,-1]];
 for(const [sx,sz] of legs){const j=p.joint('leg',[sx*W*.3,H,sz*L*.32],body);p.cyl('leg-mesh',q.legColor||c.main,[W*.24,H,W*.24],[0,-H/2,0],{parent:j});if(q.hooves)p.cyl('hoof',q.hooves,[W*.26,H*.18,W*.26],[0,-H*.92,0],{parent:j,d:1});}
 const neck=q.neck??.15,headS=q.head??.42,hy=y+BH*.35+neck,hz=L*.5+headS*.15;
 if(neck>.2)p.cyl('neck',c.main,[headS*.45,neck+BH*.3,headS*.45],[0,y+BH*.2+neck/2,L*.42],{r:[.3,0,0]});
 const head=p.joint('head',[0,hy,hz],body);
 p.ball('skull',q.headColor||c.main,[headS,headS*.9,headS],[0,0,0],{parent:head});
 if(q.snout!==0)p.ball('snout',q.snoutColor||c.accent,[headS*.55,headS*.42,(q.snout??.45)],[0,-headS*.12,headS*.45],{parent:head});
 if(q.snout!==0)p.ball('nose','#2b2320',[headS*.16,headS*.12,headS*.1],[0,-headS*.02,headS*.45+(q.snout??.45)*.48],{parent:head,d:1,seg:8});
 p.eyes(headS*.15,headS*.4,headS*.24,headS*.17,head);
 const ear=q.ears||'point';
 for(const s of [-1,1]){
  if(ear==='point')p.cone('ear',c.main,[headS*.3,headS*.4,headS*.18],[s*headS*.28,headS*.5,0],{parent:head,r:[0,0,-s*.25]});
  if(ear==='round')p.ball('ear',c.main,[headS*.32,headS*.32,headS*.12],[s*headS*.38,headS*.42,0],{parent:head});
  if(ear==='flop')p.ball('ear',c.accent,[headS*.18,headS*.55,headS*.3],[s*headS*.5,-headS*.1,0],{parent:head,r:[0,0,s*.3]});
  if(ear==='long')p.cap('ear',c.main,[headS*.22,headS*.9,headS*.22],[s*headS*.18,headS*1.05,-headS*.1],{parent:head,r:[0,0,-s*.12]});
  if(ear==='big')p.ball('ear',c.main,[headS*.12,headS*1.1,headS*.9],[s*headS*.6,0,-headS*.1],{parent:head});
 }
 if(q.horn)p.cone('horn',q.horn,[headS*.16,headS*.8,headS*.16],[0,headS*.75,headS*.25],{parent:head,r:[.35,0,0],glow:q.hornGlow||0});
 if(q.horns)for(const s of [-1,1])p.cone('horn',q.horns,[headS*.14,headS*.5,headS*.14],[s*headS*.25,headS*.6,0],{parent:head,r:[0,0,-s*.5]});
 if(q.antlers)for(const s of [-1,1]){p.cyl('antler',q.antlers,[.05,headS*1.1,.05],[s*headS*.4,headS*.9,0],{parent:head,r:[0,0,-s*.6]});p.cyl('antler-tine',q.antlers,[.04,headS*.6,.04],[s*headS*.55,headS*1.05,headS*.15],{parent:head,r:[.6,0,-s*.2],d:1});}
 if(q.trunk)p.cyl('trunk',c.main,[headS*.2,headS*1.1,headS*.2],[0,-headS*.55,headS*.55],{parent:head,r:[.35,0,0]});
 if(q.mane)p.ball('mane',q.mane,[headS*.9,headS*1.1,headS*.8],[0,0,-headS*.15],{parent:head,d:0});
 const tail=q.tail||'thin',tj=p.joint('tail',[0,y+BH*.1,-L*.5],body);
 if(tail==='thin')p.cyl('tail-mesh',c.main,[.06,.45,.06],[0,0,-.18],{parent:tj,r:[-.9,0,0]});
 if(tail==='fluff')p.ball('tail-mesh',q.tailColor||'#ffffff',[.24,.24,.24],[0,.05,-.05],{parent:tj});
 if(tail==='bushy')p.ball('tail-mesh',c.main,[.25,.25,.7],[0,.15,-.3],{parent:tj,r:[-.5,0,0]});
 if(tail==='long')p.cone('tail-mesh',c.main,[W*.4,L*.9,W*.4],[0,-.05,-L*.4],{parent:tj,r:[-1.45,0,0]});
 if(tail==='curl')p.torus('tail-mesh',c.main,[.25,.25,.25],[0,.05,-.08],{parent:tj,r:[0,Math.PI/2,0]});
 return body;
}
function biped(p,c,q){ // dinosaurs and big birds
 const H=q.leg??.5,L=q.len??1.1,y=H+.3;
 const body=p.joint('body',[0,0,0]);
 p.ball('torso',c.main,[.7,.75,L],[0,y,0],{parent:body,r:[-.25,0,0]});
 for(const s of [-1,1]){const j=p.joint('leg',[s*.25,H+.05,0],body);p.cyl('leg-mesh',c.main,[.22,H,.26],[0,-H/2,0],{parent:j});p.box('foot',c.accent,[.24,.08,.32],[0,-H,.08],{parent:j,d:1});}
 const head=p.joint('head',[0,y+.45,L*.5],body);
 p.ball('skull',c.main,[.5,.45,.62],[0,0,0],{parent:head});
 p.box('jaw',c.accent,[.42,.12,.45],[0,-.18,.1],{parent:head,d:1});
 p.eyes(.08,.2,.17,.1,head);
 if(q.arms)for(const s of [-1,1])p.cyl('arm',c.main,[.08,.25,.08],[s*.28,y+.1,L*.36],{parent:body,r:[.9,0,0]});
 const tj=p.joint('tail',[0,y,-L*.45],body);p.cone('tail-mesh',c.main,[.45,1.1,.45],[0,-.1,-.45],{parent:tj,r:[-1.35,0,0]});
 if(q.plates)for(let i=0;i<5;i++)p.pyr('plate',c.accent,[.22,.3,.08],[0,y+.42-(Math.abs(i-2))*.05,L*(.3-i*.17)],{parent:body});
 if(q.frill){p.cyl('frill',c.accent,[.9,.08,.9],[0,.15,-.15],{parent:head,r:[1.2,0,0]});for(const s of [-1,0,1])p.cone('horn','#f3ead2',[.08,.35,.08],[s*.15,.25,.22],{parent:head,r:[.9,0,0]});}
 if(q.wings)for(const s of [-1,1]){const w=p.joint('wing',[s*.3,y+.25,0],body);p.box('wing-mesh',c.accent,[1.1,.05,.6],[s*.55,0,0],{parent:w,r:[0,0,s*.2]});}
 return body;
}
function bird(p,c,q){
 const body=p.joint('body',[0,0,0]),H=q.leg??.18,s=q.size??1;
 p.ball('torso',c.main,[.5*s,.55*s,.65*s],[0,H+.28*s,0],{parent:body});
 const head=p.joint('head',[0,H+.65*s,.18*s],body);
 p.ball('skull',q.headColor||c.main,[.36*s,.36*s,.36*s],[0,0,0],{parent:head});
 p.cone('beak',q.beak||'#f2a33a',[.1*s,.22*s,.1*s],[0,-.02*s,.22*s],{parent:head,r:[Math.PI/2,0,0]});
 p.eyes(.04*s,.13*s,.09*s,.07*s,head);
 for(const sx of [-1,1]){const w=p.joint('wing',[sx*.25*s,H+.35*s,0],body);p.ball('wing-mesh',c.accent,[.12*s,.35*s,.5*s],[sx*.04*s,-.05*s,0],{parent:w});
  const l=p.joint('leg',[sx*.1*s,H,0],body);p.cyl('leg-mesh',q.legs||'#f2a33a',[.04,H,.04],[0,-H/2,0],{parent:l});}
 if(q.crest)p.cone('crest',q.crest,[.12*s,.2*s,.06*s],[0,.22*s,0],{parent:head});
 if(q.tuft)for(const sx of [-1,1])p.cone('tuft',c.main,[.08*s,.16*s,.06*s],[sx*.12*s,.2*s,0],{parent:head});
 return body;
}
function fish(p,c,q){
 const body=p.joint('body',[0,.6,0]),L=q.len??.8,s=q.size??1;
 p.ball('torso',c.main,[.3*s*(q.wid??1),.45*s*(q.tall??1),L*s],[0,0,0],{parent:body});
 const tj=p.joint('tail',[0,0,-L*s*.48],body);p.cone('tail-mesh',c.accent,[.08*s,.4*s,.4*s],[0,0,-.15*s],{parent:tj,r:[Math.PI/2,0,0]});
 p.cone('fin',c.accent,[.05*s,.3*s,.3*s],[0,.25*s*(q.tall??1),0],{parent:body});
 p.eyes(.06*s,L*s*.32,.13*s*(q.wid??1),.08*s,body);
 if(q.stripes&&p.detail>1)for(const z of [-.15,.1])p.box('stripe',c.accent,[.31*s*(q.wid??1),.42*s,.06*s],[0,0,z*s],{parent:body});
 return body;
}
function tree(p,c,{trunk='#8a5a36',h=1.6,crown='ball',r=.7}={}){
 p.cyl('trunk',trunk,[.18,h*.55,.18],[0,h*.27,0]);
 if(crown==='ball'){p.ball('canopy',c.main,[r*1.6,r*1.4,r*1.6],[0,h*.75,0]);p.ball('canopy-puff',c.accent,[r,r*.9,r],[r*.45,h*.85,.2],{d:1});p.ball('canopy-puff',c.main,[r*.9,r*.8,r*.9],[-r*.4,h*.95,-.2],{d:1});}
 if(crown==='pine')for(let i=0;i<3;i++)p.cone('canopy',i%2?c.accent:c.main,[r*2*(1-i*.22),h*.42,r*2*(1-i*.22)],[0,h*(.45+i*.22),0],{d:i?1:0});
 if(crown==='palm')for(let i=0;i<6;i++)p.box('frond',c.main,[.18,.04,1],[Math.sin(i)*.4,h*.95,Math.cos(i)*.4],{r:[.35,i,0]});
}

// ---- the kit ------------------------------------------------------------------------------
// id: {name, tags (madlib words that should match), cat, h (natural height in person units),
//      c: default colours {main, accent}, make(p, c)}
const K={};
const add=(id,name,cat,h,c,make,tags='')=>{K[id]={id,name,cat,h,c,make,tags:[id,...id.split('-'),...name.toLowerCase().split(' '),...tags.split(' ').filter(Boolean)]};};

// Animals (quadrupeds)
const Q=(id,name,h,c,q,tags)=>add(id,name,'animal',h,c,(p,col)=>quad(p,col,q),tags);
Q('dog','Dog',.8,{main:'#c98d55',accent:'#f2dcc0'},{ears:'flop',tail:'thin'},'puppy doggy pup');
Q('cat','Cat',.6,{main:'#e59a4c',accent:'#ffe6c7'},{len:.8,leg:.3,head:.38,snout:.2,ears:'point',tail:'long',stripes:1},'kitty kitten');
Q('pig','Pig',.6,{main:'#f3a9b6',accent:'#f7c3cb'},{leg:.22,bodyH:.55,snout:.2,ears:'point',tail:'curl'},'piggy piglet hog');
Q('cow','Cow',1.1,{main:'#f6f2ea',accent:'#2e2a28'},{len:1.3,leg:.45,wid:.7,bodyH:.6,head:.48,spots:1,horns:'#efe2c2',ears:'round',tail:'thin',hooves:'#3a302a'},'moo calf');
Q('horse','Horse',1.4,{main:'#8b5a3c',accent:'#5a3a26'},{len:1.4,leg:.7,wid:.55,bodyH:.55,neck:.45,head:.42,snout:.5,mane:'#3a2618',hooves:'#2a211b'},'pony');
Q('unicorn','Unicorn',1.5,{main:'#fbf6ff',accent:'#f7d3ff'},{len:1.3,leg:.7,wid:.52,bodyH:.55,neck:.45,head:.42,snout:.45,mane:'#c08bff',horn:'#ffd84a',hornGlow:.6,hooves:'#e6c3ff'},'magic sparkle');
Q('sheep','Sheep',.8,{main:'#f6f3ec',accent:'#3a3532'},{bodyH:.6,wid:.7,leg:.25,head:.36,snout:.25,headColor:'#3a3532',ears:'flop',tail:'fluff'},'lamb wool');
Q('bunny','Bunny',.6,{main:'#d8c7b4',accent:'#f6e9de'},{len:.6,leg:.15,wid:.45,bodyH:.45,head:.36,snout:.18,ears:'long',tail:'fluff'},'rabbit hare');
Q('fox','Fox',.7,{main:'#e3712f',accent:'#fff3e3'},{len:.9,leg:.3,head:.38,snout:.4,ears:'point',tail:'bushy'},'');
Q('bear','Bear',1.2,{main:'#7a4b2e',accent:'#b78a62'},{len:1.2,leg:.4,wid:.8,bodyH:.75,head:.55,snout:.25,ears:'round',tail:'fluff',tailColor:'#7a4b2e'},'grizzly teddy');
Q('panda','Panda',1.1,{main:'#f7f5f0',accent:'#26231f'},{len:1.1,leg:.38,wid:.8,bodyH:.75,head:.55,snout:.22,ears:'round',spots:1,legColor:'#26231f',tail:'fluff',tailColor:'#f7f5f0'},'');
Q('polar-bear','Polar Bear',1.2,{main:'#f7f9fb',accent:'#dfe7ee'},{len:1.3,leg:.42,wid:.8,bodyH:.75,head:.5,snout:.3,ears:'round',tail:'fluff',tailColor:'#f7f9fb'},'polar');
Q('lion','Lion',1.1,{main:'#d9a24e',accent:'#f2d39c'},{len:1.2,leg:.45,bodyH:.55,head:.48,snout:.25,ears:'round',mane:'#9b5a24',tail:'long'},'king');
Q('tiger','Tiger',1.0,{main:'#ee8a2c',accent:'#2a211b'},{len:1.3,leg:.42,bodyH:.5,head:.46,snout:.22,ears:'round',stripes:1,tail:'long'},'');
Q('elephant','Elephant',2.2,{main:'#9aa0a8',accent:'#b9bec5'},{len:1.8,leg:.9,wid:1.2,bodyH:1.1,head:.9,snout:0,ears:'big',trunk:1,tail:'thin',horns:'#f7f1df'},'jumbo');
Q('giraffe','Giraffe',3,{main:'#f1c25b',accent:'#9b5f2e'},{len:1.1,leg:1.1,wid:.55,bodyH:.6,neck:1.3,head:.35,snout:.3,spots:1,horns:'#9b5f2e',hooves:'#3a2c22'},'tall');
Q('zebra','Zebra',1.4,{main:'#f8f8f6',accent:'#1f1c1a'},{len:1.3,leg:.7,bodyH:.55,neck:.4,head:.42,snout:.45,stripes:1,mane:'#1f1c1a',hooves:'#1f1c1a'},'');
Q('deer','Deer',1.3,{main:'#b07a4b',accent:'#f3e3cc'},{len:1.1,leg:.75,wid:.45,bodyH:.45,neck:.4,head:.36,snout:.35,antlers:'#d8c3a0',tail:'fluff'},'reindeer fawn');
Q('moose','Moose',2,{main:'#5a3d2b',accent:'#7d5a40'},{len:1.4,leg:.95,wid:.7,bodyH:.75,neck:.3,head:.5,snout:.5,antlers:'#d8c3a0',hooves:'#2a211b'},'');
Q('goat','Goat',.9,{main:'#e9e2d6',accent:'#b9ab95'},{len:.9,leg:.42,wid:.45,bodyH:.45,head:.36,snout:.35,horns:'#8b7b66',ears:'flop',tail:'thin'},'');
Q('mouse','Mouse',.3,{main:'#a9a4a0',accent:'#f2b8c0'},{len:.5,leg:.08,wid:.35,bodyH:.32,head:.3,snout:.25,ears:'big',tail:'long'},'mice rat hamster');
Q('hippo','Hippo',1.2,{main:'#8e7f9c',accent:'#c9a7b6'},{len:1.6,leg:.35,wid:1.1,bodyH:.9,head:.8,snout:.6,ears:'round',tail:'thin'},'hippopotamus');
Q('rhino','Rhino',1.3,{main:'#9a958e',accent:'#b9b2a7'},{len:1.6,leg:.45,wid:1,bodyH:.85,head:.65,snout:.5,horn:'#e9e1d0',ears:'point',tail:'thin'},'rhinoceros');
Q('wolf','Wolf',.9,{main:'#8d9198',accent:'#e9ecef'},{len:1.1,leg:.4,head:.42,snout:.45,ears:'point',tail:'bushy'},'husky');
Q('raccoon','Raccoon',.5,{main:'#8b8580',accent:'#2e2a28'},{len:.7,leg:.18,wid:.5,bodyH:.4,head:.36,snout:.25,ears:'point',tail:'bushy',stripes:1},'');
Q('squirrel','Squirrel',.4,{main:'#b5652f',accent:'#f2dcc0'},{len:.45,leg:.1,wid:.32,bodyH:.35,head:.3,snout:.15,ears:'point',tail:'bushy'},'chipmunk');
Q('hedgehog','Hedgehog',.3,{main:'#6e5440',accent:'#e8d2b5'},{len:.5,leg:.06,wid:.45,bodyH:.35,head:.26,snout:.25,ears:'round',tail:'fluff',tailColor:'#6e5440'},'porcupine');
Q('kangaroo','Kangaroo',1.4,{main:'#c08452',accent:'#e6c09a'},{len:.8,leg:.5,wid:.55,bodyH:.75,neck:.25,head:.38,snout:.35,ears:'long',tail:'long'},'roo');
Q('koala','Koala',.6,{main:'#a7a3a0',accent:'#e9e6e3'},{len:.6,leg:.15,wid:.55,bodyH:.55,head:.5,snout:.15,ears:'round',tail:'fluff'},'');
Q('dragon','Dragon',2.2,{main:'#3fae6a',accent:'#ffd84a'},{len:2,leg:.6,wid:.9,bodyH:.8,neck:.8,head:.6,snout:.45,horns:'#f3ead2',ears:'point',tail:'long'},'dragons wyvern');
Q('alligator','Alligator',.5,{main:'#4f7a3a',accent:'#9fbf6e'},{len:1.8,leg:.12,wid:.6,bodyH:.35,head:.4,snout:.9,ears:'none',tail:'long'},'crocodile croc gator');
Q('llama','Llama',1.6,{main:'#efe4d0',accent:'#c9b58f'},{len:1,leg:.7,wid:.5,bodyH:.55,neck:.8,head:.34,snout:.3,ears:'long',tail:'fluff'},'alpaca');
Q('frog','Frog',.35,{main:'#5cbf4a',accent:'#d9f2a8'},{len:.5,leg:.08,wid:.55,bodyH:.35,head:.42,snout:0,ears:'none',tail:'none'},'toad');
Q('turtle','Turtle',.4,{main:'#6f9a4a',accent:'#a7c46a'},{len:.8,leg:.12,wid:.75,bodyH:.4,head:.3,snout:.15,ears:'none',tail:'thin',spots:1},'tortoise');
// Dinosaurs and two-legged creatures
add('t-rex','T-Rex','animal',2.2,{main:'#6aa84f',accent:'#3f6b2f'},(p,c)=>biped(p,c,{leg:.7,len:1.4,arms:1}),'dinosaur dino trex tyrannosaurus');
add('raptor','Raptor','animal',1.2,{main:'#c2894f',accent:'#7a4f2a'},(p,c)=>biped(p,c,{leg:.45,len:1,arms:1}),'velociraptor');
add('stegosaurus','Stegosaurus','animal',1.6,{main:'#7da35a',accent:'#e2814a'},(p,c)=>{quad(p,c,{len:1.7,leg:.45,wid:.8,bodyH:.75,head:.3,snout:.2,ears:'none',tail:'long'});for(let i=0;i<5;i++)p.pyr('plate',c.accent,[.32,.4,.08],[0,1.15-Math.abs(i-2)*.08,.6-i*.3]);},'stego');
add('triceratops','Triceratops','animal',1.4,{main:'#5f8fb3',accent:'#e9c46a'},(p,c)=>biped(p,c,{leg:.45,len:1.3,frill:1}),'trike');
add('brontosaurus','Brontosaurus','animal',3,{main:'#8ab0a0',accent:'#5d8576'},(p,c)=>quad(p,c,{len:2,leg:.8,wid:1,bodyH:.9,neck:1.6,head:.4,snout:.25,ears:'none',tail:'long'}),'brachiosaurus diplodocus longneck');
add('pterodactyl','Pterodactyl','animal',1,{main:'#b9744a',accent:'#e0a37a'},(p,c)=>biped(p,c,{leg:.3,len:.7,wings:1}),'pterosaur');
add('penguin','Penguin','animal',.8,{main:'#26303a',accent:'#26303a'},(p,c)=>{bird(p,c,{size:1.2,leg:.08,headColor:'#26303a'});p.ball('belly','#fbfaf7',[.42,.5,.3],[0,.42,.17]);},'');
add('owl','Owl','animal',.6,{main:'#9a7350',accent:'#c9a77d'},(p,c)=>bird(p,c,{tuft:1,leg:.06,beak:'#e8c27a'}),'hoot');
add('chicken','Chicken','animal',.6,{main:'#fbf8f1',accent:'#ece4d2'},(p,c)=>bird(p,c,{crest:'#e53c3c'}),'hen rooster chick');
add('duck','Duck','animal',.5,{main:'#fff4a3',accent:'#ffe36b'},(p,c)=>bird(p,c,{beak:'#ff9d2e',leg:.08}),'duckling ducky');
add('flamingo','Flamingo','animal',1.4,{main:'#ff8fb1',accent:'#ff6f9b'},(p,c)=>bird(p,c,{leg:.75,legs:'#ff8fb1',beak:'#2b2320'}),'');
add('parrot','Parrot','animal',.6,{main:'#2fbf5a',accent:'#2f7fe0'},(p,c)=>bird(p,c,{headColor:'#ef3b36',beak:'#f2e6c9'}),'macaw bird');
add('eagle','Eagle','animal',.8,{main:'#6b4a2f',accent:'#4f3522'},(p,c)=>bird(p,c,{headColor:'#ffffff',beak:'#f2c12e',size:1.2}),'hawk');
add('peacock','Peacock','animal',1,{main:'#2a5fbf',accent:'#2fa36b'},(p,c)=>{bird(p,c,{crest:'#2fa36b'});if(p.detail)for(let i=0;i<7;i++)p.ball('tail-feather',i%2?c.accent:'#3fd0c9',[.25,.9,.06],[Math.sin((i-3)*.35)*.6,.8,-.35-Math.cos((i-3)*.35)*.2],{r:[0,0,(i-3)*.35]});},'');
add('monkey','Monkey','animal',.8,{main:'#8b5a3c',accent:'#f0cfa8'},(p,c)=>{const b=p.joint('body',[0,0,0]);p.ball('torso',c.main,[.45,.55,.4],[0,.5,0],{parent:b});const h=p.joint('head',[0,.95,0],b);p.ball('skull',c.main,[.42,.4,.4],[0,0,0],{parent:h});p.ball('face',c.accent,[.3,.26,.12],[0,-.04,.17],{parent:h});p.eyes(.04,.2,.08,.07,h);for(const s of [-1,1]){p.ball('ear',c.accent,[.14,.14,.05],[s*.22,.02,0],{parent:h});const a=p.joint('arm',[s*.24,.68,0],b);p.cyl('arm-mesh',c.main,[.09,.45,.09],[0,-.2,0],{parent:a});const l=p.joint('leg',[s*.12,.28,0],b);p.cyl('leg-mesh',c.main,[.1,.28,.1],[0,-.14,0],{parent:l});}p.cyl('tail-mesh',c.main,[.05,.6,.05],[0,.4,-.3],{r:[-.6,0,0]});},'ape chimp gorilla');
add('sloth','Sloth','animal',.6,{main:'#9b8263',accent:'#e9dcc3'},(p,c)=>{p.ball('torso',c.main,[.55,.5,.45],[0,.3,0]);p.ball('skull',c.accent,[.36,.32,.32],[0,.65,.1]);p.eyes(.66,.25,.08,.06);},'');
add('snake','Snake','animal',.3,{main:'#7cc444',accent:'#f2d14a'},(p,c)=>{for(let i=0;i<8;i++)p.ball('segment',i%2?c.accent:c.main,[.22,.2,.3],[Math.sin(i*.9)*.25,.11,-i*.2+.7]);p.ball('skull',c.main,[.28,.22,.34],[0,.14,.95]);p.eyes(.2,1.08,.08,.05);},'serpent python');
add('snail','Snail','animal',.4,{main:'#e9c9a0',accent:'#c06f4a'},(p,c)=>{p.cap('foot',c.main,[.2,.4,.2],[0,.1,0],{r:[Math.PI/2,0,0]});p.torus('shell',c.accent,[.5,.5,.5],[0,.32,-.05],{r:[0,Math.PI/2,0]});p.ball('shell-core',c.accent,[.3,.3,.2],[0,.32,-.05]);p.eyes(.3,.42,.06,.05);},'slug');
add('octopus','Octopus','animal',.8,{main:'#b05ad6',accent:'#d99af2'},(p,c)=>{p.ball('head',c.main,[.7,.8,.7],[0,.75,0]);p.eyes(.75,.32,.14,.1);for(let i=0;i<8;i++){const a=i/8*Math.PI*2,j=p.joint('tentacle',[Math.sin(a)*.25,.4,Math.cos(a)*.25]);p.cone('tentacle-mesh',c.accent,[.12,.5,.12],[Math.sin(a)*.12,-.2,Math.cos(a)*.12],{parent:j,r:[Math.PI-Math.cos(a)*.6,0,Math.sin(a)*.6]});}},'squid kraken');
add('whale','Whale','animal',1.4,{main:'#3e6fa8',accent:'#dbe7f2'},(p,c)=>{fish(p,c,{len:2.4,size:1.3,wid:2,tall:1.6});},'orca');
add('dolphin','Dolphin','animal',.8,{main:'#8fb2cf',accent:'#7aa0bf'},(p,c)=>fish(p,c,{len:1.5,size:1}),'porpoise');
add('fish','Fish','animal',.5,{main:'#ff9e2c',accent:'#ffffff'},(p,c)=>fish(p,c,{len:.6,size:.8,tall:1.3,stripes:1}),'goldfish clownfish nemo');
add('shark','Shark','animal',1,{main:'#8a9aa8',accent:'#6f7f8d'},(p,c)=>fish(p,c,{len:2,size:1,tall:1}),'jaws');
add('crab','Crab','animal',.35,{main:'#e84a3a',accent:'#f27a5a'},(p,c)=>{p.ball('shell',c.main,[.7,.3,.5],[0,.25,0]);p.eyes(.42,.18,.12,.08);for(const s of [-1,1]){p.ball('claw',c.accent,[.22,.16,.2],[s*.45,.3,.25]);for(let i=0;i<3;i++){const j=p.joint('leg',[s*.3,.2,(i-1)*.15]);p.cyl('leg-mesh',c.accent,[.05,.3,.05],[s*.1,-.08,0],{parent:j,r:[0,0,s*.9]});}}},'lobster');
add('jellyfish','Jellyfish','animal',.9,{main:'#f2a8ff',accent:'#ffd6ff'},(p,c)=>{p.ball('bell',c.main,[.7,.5,.7],[0,1,0],{glow:.3,opacity:.85});for(let i=0;i<6;i++){const a=i/6*Math.PI*2;p.cyl('tentacle',c.accent,[.04,.7,.04],[Math.sin(a)*.2,.55,Math.cos(a)*.2],{glow:.3});}},'jelly');
add('starfish','Starfish','animal',.15,{main:'#ff8a5c',accent:'#ffc19e'},(p,c)=>{for(let i=0;i<5;i++)p.cone('arm',c.main,[.15,.45,.08],[Math.sin(i*1.2566)*.2,.06,Math.cos(i*1.2566)*.2],{r:[Math.PI/2,0,-i*1.2566+Math.PI]});p.ball('centre',c.accent,[.2,.1,.2],[0,.07,0]);},'sea star');
add('butterfly','Butterfly','animal',.5,{main:'#ff7ac2',accent:'#7ad3ff'},(p,c)=>{const b=p.joint('body',[0,.8,0]);p.cap('torso','#3a2c3a',[.06,.3,.06],[0,0,0],{parent:b,r:[Math.PI/2,0,0]});for(const s of [-1,1]){const w=p.joint('wing',[s*.03,0,0],b);p.ball('wing-mesh',c.main,[.5,.04,.4],[s*.25,0,.08],{parent:w});p.ball('wing-mesh',c.accent,[.32,.05,.3],[s*.18,0,-.18],{parent:w,d:1});}},'moth');
add('bee','Bee','animal',.3,{main:'#ffd23a',accent:'#2a2420'},(p,c)=>{const b=p.joint('body',[0,.7,0]);p.ball('torso',c.main,[.3,.3,.42],[0,0,0],{parent:b});p.box('stripe',c.accent,[.31,.31,.06],[0,0,-.05],{parent:b,d:1});p.eyes(.04,.18,.07,.07,b);for(const s of [-1,1]){const w=p.joint('wing',[s*.08,.14,0],b);p.ball('wing-mesh','#e8f6ff',[.3,.03,.2],[s*.15,0,0],{parent:w,opacity:.7});}},'bumblebee wasp');
add('ladybug','Ladybug','animal',.2,{main:'#e43b2e',accent:'#1e1a18'},(p,c)=>{p.ball('shell',c.main,[.4,.25,.45],[0,.14,0]);p.ball('head',c.accent,[.2,.16,.16],[0,.12,.24]);if(p.detail>1)for(const [x,z] of [[-.1,.05],[.1,.05],[-.08,-.12],[.08,-.12]])p.ball('spot',c.accent,[.08,.04,.08],[x,.26,z]);},'ladybird beetle bug');
add('ghost','Friendly Ghost','animal',1.1,{main:'#f6f7ff',accent:'#bfc6ff'},(p,c)=>{const b=p.joint('body',[0,.3,0]);p.ball('sheet',c.main,[.8,1.1,.8],[0,.55,0],{parent:b,opacity:.85,glow:.25});p.cone('hem',c.main,[.8,.4,.8],[0,.05,0],{parent:b,opacity:.85,r:[Math.PI,0,0]});p.eyes(.8,.36,.15,.12,b);},'boo spooky');
add('robot','Robot','thing',1.1,{main:'#9fb8c9',accent:'#ffcf4a'},(p,c)=>{const b=p.joint('body',[0,0,0]);p.box('torso',c.main,[.6,.6,.4],[0,.7,0],{parent:b,metal:.6});const h=p.joint('head',[0,1.18,0],b);p.box('skull',c.main,[.45,.36,.36],[0,0,0],{parent:h,metal:.6});p.ball('lamp',c.accent,[.12,.12,.12],[0,.25,0],{parent:h,glow:.8});for(const s of [-1,1]){p.ball('eye',c.accent,[.1,.1,.05],[s*.11,.02,.18],{parent:h,glow:1});const a=p.joint('arm',[s*.38,.9,0],b);p.cyl('arm-mesh',c.main,[.1,.45,.1],[0,-.2,0],{parent:a,metal:.6});const l=p.joint('leg',[s*.15,.4,0],b);p.box('leg-mesh',c.main,[.16,.4,.16],[0,-.2,0],{parent:l,metal:.6});}},'robots bot android');
add('alien','Little Alien','animal',.9,{main:'#7be36b',accent:'#b7ff9f'},(p,c)=>{const b=p.joint('body',[0,0,0]);p.cap('torso',c.main,[.35,.3,.35],[0,.4,0],{parent:b});const h=p.joint('head',[0,.85,0],b);p.ball('skull',c.main,[.55,.5,.5],[0,0,0],{parent:h});for(const s of [-1,1]){p.ball('eye','#1a1a2a',[.16,.2,.08],[s*.13,.02,.22],{parent:h});p.cyl('antenna',c.accent,[.03,.3,.03],[s*.12,.35,0],{parent:h,r:[0,0,-s*.3]});p.ball('antenna-tip',c.accent,[.08,.08,.08],[s*.18,.5,0],{parent:h,glow:.8});const l=p.joint('leg',[s*.1,.2,0],b);p.cyl('leg-mesh',c.main,[.08,.2,.08],[0,-.1,0],{parent:l});}},'martian et space-creature');

// Food
const F=(id,name,h,c,make,tags)=>add(id,name,'food',h,c,make,tags);
F('pizza','Pizza',.15,{main:'#f2c46a',accent:'#d8402c'},(p,c)=>{p.cyl('crust','#d79a4c',[1,.08,1],[0,.04,0]);p.cyl('cheese',c.main,[.9,.04,.9],[0,.09,0]);if(p.detail)for(let i=0;i<6;i++)p.cyl('pepperoni',c.accent,[.16,.03,.16],[Math.sin(i)*.28,.12,Math.cos(i*1.3)*.28]);},'pepperoni slice');
F('donut','Donut',.3,{main:'#d99a5a',accent:'#ff8fc8'},(p,c)=>{p.torus('dough',c.main,[.8,.8,1.2],[0,.15,0],{r:[Math.PI/2,0,0]});p.torus('icing',c.accent,[.8,.8,.6],[0,.24,0],{r:[Math.PI/2,0,0],d:1});},'doughnut');
F('cupcake','Cupcake',.5,{main:'#f7a8d0',accent:'#8fd0ff'},(p,c)=>{p.cyl('wrapper',c.accent,[.4,.3,.3],[0,.15,0]);p.ball('frosting',c.main,[.48,.35,.48],[0,.38,0]);p.ball('cherry','#e1262e',[.1,.1,.1],[0,.58,0],{d:1});},'muffin');
F('ice-cream','Ice Cream',.8,{main:'#ffd0e0',accent:'#e3a764'},(p,c)=>{p.cone('cone',c.accent,[.36,.6,.36],[0,.3,0],{r:[Math.PI,0,0]});p.ball('scoop',c.main,[.42,.4,.42],[0,.7,0]);p.ball('scoop','#7b4a2e',[.38,.36,.38],[0,.98,0],{d:1});},'icecream gelato sundae');
F('cake','Birthday Cake',.7,{main:'#fff1f6',accent:'#ff7aa8'},(p,c)=>{p.cyl('tier',c.main,[1,.35,1],[0,.18,0]);p.cyl('tier',c.accent,[.7,.3,.7],[0,.5,0]);if(p.detail)for(let i=0;i<5;i++){p.cyl('candle','#8fd0ff',[.04,.18,.04],[Math.sin(i*1.25)*.2,.74,Math.cos(i*1.25)*.2]);p.ball('flame','#ffcf4a',[.05,.08,.05],[Math.sin(i*1.25)*.2,.86,Math.cos(i*1.25)*.2],{glow:1});}},'birthday');
F('apple','Apple',.4,{main:'#e0322a',accent:'#4fa83a'},(p,c)=>{p.ball('fruit',c.main,[.4,.38,.4],[0,.19,0]);p.cyl('stem','#6b4a2f',[.03,.1,.03],[0,.42,0],{d:1});p.ball('leaf',c.accent,[.12,.03,.07],[.06,.42,0],{d:1});},'');
F('banana','Banana',.2,{main:'#ffe14a',accent:'#8a6a2a'},(p,c)=>{p.torus('fruit',c.main,[.6,.6,.6],[0,.1,0],{r:[Math.PI/2,0,0]});},'');
F('watermelon','Watermelon',.5,{main:'#3f9a3a',accent:'#ff5a6a'},(p,c)=>{p.ball('rind',c.main,[.8,.55,.6],[0,.27,0]);p.ball('stripe','#2f7a2a',[.81,.4,.2],[0,.28,0],{d:2});},'melon');
F('cookie','Cookie',.08,{main:'#d9a45f',accent:'#5a3a24'},(p,c)=>{p.cyl('biscuit',c.main,[.6,.08,.6],[0,.04,0]);if(p.detail)for(let i=0;i<5;i++)p.ball('chip',c.accent,[.07,.05,.07],[Math.sin(i*2)*.18,.09,Math.cos(i*2.5)*.18]);},'biscuit');
F('burger','Burger',.4,{main:'#d99a4c',accent:'#6b3a22'},(p,c)=>{p.cyl('bun',c.main,[.6,.1,.6],[0,.05,0]);p.cyl('patty',c.accent,[.62,.1,.62],[0,.15,0]);p.cyl('lettuce','#6cc24a',[.66,.03,.66],[0,.21,0],{d:1});p.cyl('cheese','#ffcf3a',[.64,.03,.64],[0,.235,0],{d:1});p.ball('bun-top',c.main,[.6,.3,.6],[0,.28,0]);},'hamburger cheeseburger');
F('taco','Taco',.3,{main:'#f2c46a',accent:'#6cc24a'},(p,c)=>{p.cyl('shell',c.main,[.6,.05,.6],[0,.25,0],{r:[0,0,Math.PI/2]});p.box('filling',c.accent,[.12,.18,.45],[0,.3,0],{d:1});},'burrito');
F('carrot','Carrot',.6,{main:'#ff8a2a',accent:'#4fa83a'},(p,c)=>{p.cone('root',c.main,[.2,.55,.2],[0,.28,0],{r:[Math.PI,0,0]});p.cone('leaves',c.accent,[.15,.25,.15],[0,.65,0]);},'');
F('strawberry','Strawberry',.35,{main:'#e8333f',accent:'#4fa83a'},(p,c)=>{p.cone('berry',c.main,[.35,.4,.35],[0,.2,0],{r:[Math.PI,0,0]});p.ball('top',c.main,[.35,.15,.35],[0,.38,0]);p.cone('leaves',c.accent,[.3,.08,.3],[0,.46,0],{d:1});},'berry berries');
F('lollipop','Lollipop',.9,{main:'#ff5ab4',accent:'#ffffff'},(p,c)=>{p.cyl('stick',c.accent,[.05,.6,.05],[0,.3,0]);p.cyl('candy',c.main,[.45,.1,.45],[0,.75,0],{r:[Math.PI/2,0,0]});p.torus('swirl',c.accent,[.2,.2,.3],[0,.75,.05],{d:2});},'lolly sucker candy sweets');
F('candy-cane','Candy Cane',1,{main:'#ffffff',accent:'#e8333f'},(p,c)=>{p.cyl('shaft',c.main,[.1,.8,.1],[0,.4,0]);p.torus('hook',c.accent,[.3,.3,.3],[.15,.82,0],{r:[0,0,0]});},'peppermint');
F('cheese','Cheese',.3,{main:'#ffcf3a',accent:'#e6b020'},(p,c)=>{p.pyr('wedge',c.main,[.7,.3,.5],[0,.15,0],{r:[0,0,0]});},'');
F('pancakes','Pancakes',.35,{main:'#e0a85c',accent:'#ffe9a0'},(p,c)=>{for(let i=0;i<4;i++)p.cyl('pancake',c.main,[.7,.07,.7],[0,.04+i*.075,0]);p.box('butter',c.accent,[.15,.06,.15],[0,.36,0],{d:1});},'pancake waffle');
F('popcorn','Popcorn',.5,{main:'#fff6dc',accent:'#e8333f'},(p,c)=>{p.cyl('box',c.accent,[.36,.4,.36],[0,.2,0]);for(let i=0;i<6;i++)p.ball('kernel',c.main,[.14,.12,.14],[Math.sin(i)*.12,.45+(i%2)*.06,Math.cos(i)*.12]);},'');
F('hot-dog','Hot Dog',.2,{main:'#e8b56a',accent:'#c8442a'},(p,c)=>{p.cap('bun',c.main,[.22,.5,.22],[0,.1,0],{r:[0,0,Math.PI/2]});p.cap('sausage',c.accent,[.12,.6,.12],[0,.18,0],{r:[0,0,Math.PI/2]});},'hotdog sausage');
F('broccoli','Broccoli',.5,{main:'#3f9a3a',accent:'#9fd07a'},(p,c)=>{p.cyl('stalk',c.accent,[.14,.3,.14],[0,.15,0]);p.ball('florets',c.main,[.45,.35,.45],[0,.4,0]);},'vegetable veggies');
F('pineapple','Pineapple',.7,{main:'#f2b632',accent:'#3f9a3a'},(p,c)=>{p.ball('fruit',c.main,[.4,.55,.4],[0,.28,0]);p.cone('crown',c.accent,[.25,.35,.25],[0,.68,0]);},'');
F('cherry','Cherries',.3,{main:'#c8102e',accent:'#4fa83a'},(p,c)=>{for(const s of [-1,1]){p.ball('cherry',c.main,[.18,.18,.18],[s*.09,.09,0]);p.cyl('stem',c.accent,[.02,.25,.02],[s*.05,.24,0],{r:[0,0,-s*.3]});}},'cherries');
F('egg','Egg',.4,{main:'#fff6e8',accent:'#ffcf3a'},(p,c)=>p.ball('shell',c.main,[.3,.4,.3],[0,.2,0]),'eggs');
F('spaghetti','Spaghetti',.3,{main:'#f2d58a',accent:'#d8402c'},(p,c)=>{p.cyl('plate','#ffffff',[.8,.04,.8],[0,.02,0]);p.ball('noodles',c.main,[.55,.2,.55],[0,.1,0]);p.ball('sauce',c.accent,[.3,.1,.3],[0,.2,0],{d:1});p.ball('meatball','#7a3a22',[.1,.1,.1],[.08,.25,.05],{d:1});},'pasta noodles macaroni');
F('sandwich','Sandwich',.25,{main:'#f2d9a8',accent:'#6cc24a'},(p,c)=>{p.box('bread',c.main,[.5,.06,.5],[0,.03,0]);p.box('filling',c.accent,[.52,.06,.52],[0,.09,0]);p.box('bread',c.main,[.5,.06,.5],[0,.15,0]);},'toast');
F('chocolate','Chocolate Bar',.1,{main:'#6b3a22',accent:'#c9a77d'},(p,c)=>{p.box('bar',c.main,[.8,.08,.4],[0,.04,0]);p.box('wrapper',c.accent,[.4,.09,.41],[.2,.045,0],{d:1});},'chocolates');
F('pie','Pie',.25,{main:'#e0a85c',accent:'#a33a3a'},(p,c)=>{p.cyl('dish',c.main,[.8,.2,.8],[0,.1,0]);p.cyl('filling',c.accent,[.7,.05,.7],[0,.2,0],{d:1});},'tart');
F('marshmallow','Marshmallow',.25,{main:'#fff8fb',accent:'#ffd0e0'},(p,c)=>p.cyl('puff',c.main,[.3,.3,.3],[0,.15,0]),'smores');
F('gummy-bear','Gummy Bear',.4,{main:'#ff4a6a',accent:'#ff8aa0'},(p,c)=>{p.ball('belly',c.main,[.3,.35,.25],[0,.2,0],{opacity:.8});p.ball('head',c.main,[.25,.22,.22],[0,.45,0],{opacity:.8});for(const s of [-1,1])p.ball('ear',c.main,[.08,.08,.06],[s*.1,.56,0],{opacity:.8});},'gummies gummy jelly-bean');

// Vehicles
const V=(id,name,h,c,make,tags)=>add(id,name,'vehicle',h,c,make,tags);
const wheels=(p,xs,zs,r=.18,y=r)=>{for(const x of xs)for(const z of zs){const w=p.joint('wheel',[x,y,z]);p.cyl('tyre','#2a2624',[r*2,.12,r*2],[0,0,0],{parent:w,r:[0,0,Math.PI/2]});p.cyl('hub','#d8d2c8',[r,.13,r],[0,0,0],{parent:w,r:[0,0,Math.PI/2],d:1});}};
V('car','Car',.6,{main:'#3a8fe0',accent:'#cfe7ff'},(p,c)=>{p.box('chassis',c.main,[.8,.3,1.5],[0,.35,0]);p.box('cabin',c.main,[.7,.3,.8],[0,.65,-.1]);p.box('windscreen',c.accent,[.66,.22,.05],[0,.66,.31],{d:1,glow:.1});wheels(p,[-.4,.4],[-.5,.5]);},'auto automobile');
V('race-car','Race Car',.4,{main:'#e8333f',accent:'#ffffff'},(p,c)=>{p.box('chassis',c.main,[.7,.2,1.6],[0,.25,0]);p.box('cockpit','#2a2624',[.35,.15,.4],[0,.4,-.1]);p.box('spoiler',c.accent,[.8,.05,.2],[0,.5,-.75]);wheels(p,[-.42,.42],[-.55,.55],.16);},'racecar racing go-kart kart');
V('bus','School Bus',1.1,{main:'#ffc62a',accent:'#2a2624'},(p,c)=>{p.box('body',c.main,[1,1,2.6],[0,.75,0]);if(p.detail)for(let i=0;i<4;i++)p.box('window','#cfe7ff',[1.02,.3,.4],[0,.95,-.9+i*.55]);wheels(p,[-.5,.5],[-.9,.9],.22);},'schoolbus');
V('train','Train',1.2,{main:'#d8402c',accent:'#2a2624'},(p,c)=>{p.cyl('boiler',c.main,[.7,1.4,.7],[0,.75,.3],{r:[Math.PI/2,0,0]});p.box('cab',c.main,[.9,.9,.7],[0,.85,-.65]);p.cyl('chimney',c.accent,[.2,.4,.2],[0,1.25,.75]);wheels(p,[-.45,.45],[-.6,0,.6],.2);},'locomotive choo');
V('rocket','Rocket',3,{main:'#f4f1ea',accent:'#e8333f'},(p,c)=>{p.cyl('hull',c.main,[.7,2,.7],[0,1.4,0]);p.cone('nose',c.accent,[.7,.8,.7],[0,2.8,0]);for(let i=0;i<4;i++)p.box('fin',c.accent,[.06,.6,.4],[Math.sin(i*1.57)*.4,.5,Math.cos(i*1.57)*.4],{r:[0,i*1.57,0]});p.cyl('window','#7ad3ff',[.25,.06,.25],[0,1.9,.35],{r:[Math.PI/2,0,0],glow:.3,d:1});p.cone('flame','#ffb02e',[.4,.6,.4],[0,.1,0],{r:[Math.PI,0,0],glow:1,d:1});},'spaceship rocketship');
V('ufo','Flying Saucer',.7,{main:'#b9c6d2',accent:'#7cf2c8'},(p,c)=>{p.ball('saucer',c.main,[1.8,.3,1.8],[0,.6,0],{metal:.5});p.ball('dome',c.accent,[.7,.5,.7],[0,.8,0],{opacity:.75,glow:.3});if(p.detail)for(let i=0;i<8;i++)p.ball('light','#ffe14a',[.1,.1,.1],[Math.sin(i*.785)*.85,.55,Math.cos(i*.785)*.85],{glow:1});},'saucer spaceship flying-saucer');
V('hot-air-balloon','Hot Air Balloon',3,{main:'#ff6a3a',accent:'#ffd84a'},(p,c)=>{p.ball('envelope',c.main,[1.6,1.9,1.6],[0,2.2,0]);p.ball('band',c.accent,[1.62,.5,1.62],[0,2.1,0],{d:1});p.box('basket','#a87a4a',[.5,.4,.5],[0,.2,0]);for(const [x,z] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]])p.cyl('rope','#6b4a2f',[.02,1.2,.02],[x,.9,z],{d:1});},'balloon-ride airship blimp');
V('boat','Sailboat',1.6,{main:'#ffffff',accent:'#3a8fe0'},(p,c)=>{p.box('hull',c.accent,[.7,.35,1.6],[0,.18,0]);p.cyl('mast','#8a5a36',[.06,1.4,.06],[0,1,0]);p.pyr('sail',c.main,[.05,1.1,.9],[0,1.05,-.2],{r:[0,Math.PI/2,0]});},'sailboat ship yacht canoe');
V('pirate-ship','Pirate Ship',2.5,{main:'#7a4f2e',accent:'#f4f1ea'},(p,c)=>{p.box('hull',c.main,[1.2,.7,3],[0,.4,0]);p.box('deck-castle',c.main,[1.2,.4,.8],[0,.9,-1.1]);for(const z of [-.4,.7]){p.cyl('mast','#5a3a24',[.1,2.2,.1],[0,1.8,z]);p.box('sail',c.accent,[1.4,.9,.04],[0,2,z]);}p.box('flag','#1e1a18',[.4,.25,.02],[0,3,.7],{d:1});},'pirates galleon');
V('submarine','Submarine',1,{main:'#ffd23a',accent:'#7ad3ff'},(p,c)=>{p.cap('hull',c.main,[.8,1.4,.8],[0,.6,0],{r:[Math.PI/2,0,0]});p.box('tower',c.main,[.3,.4,.5],[0,1.1,.1]);for(const z of [-.3,.2,.7])p.cyl('porthole',c.accent,[.18,.05,.18],[.41,.65,z],{r:[0,0,Math.PI/2],d:1,glow:.3});p.cone('propeller','#8a8a8a',[.3,.2,.3],[0,.6,-1.1],{r:[-Math.PI/2,0,0]});},'sub');
V('airplane','Airplane',1,{main:'#f4f1ea',accent:'#3a8fe0'},(p,c)=>{p.cap('fuselage',c.main,[.4,1.8,.4],[0,.6,0],{r:[Math.PI/2,0,0]});p.box('wing',c.accent,[2.4,.06,.5],[0,.6,.1]);p.box('tail-wing',c.accent,[.8,.05,.25],[0,.65,-.95]);p.box('fin',c.accent,[.05,.4,.3],[0,.85,-.95]);},'plane jet aeroplane');
V('helicopter','Helicopter',1,{main:'#e8333f',accent:'#2a2624'},(p,c)=>{p.ball('cabin',c.main,[.8,.7,1],[0,.6,0]);p.cyl('boom',c.main,[.12,1.1,.12],[0,.7,-.9],{r:[Math.PI/2,0,0]});const r=p.joint('rotor',[0,1.05,0]);p.box('blade',c.accent,[2.2,.03,.12],[0,0,0],{parent:r});p.box('blade',c.accent,[.12,.03,2.2],[0,0,0],{parent:r});p.box('skid',c.accent,[.06,.06,1],[-.3,.12,0]);p.box('skid',c.accent,[.06,.06,1],[.3,.12,0]);},'chopper');
V('tractor','Tractor',1,{main:'#3f9a3a',accent:'#ffd23a'},(p,c)=>{p.box('engine',c.main,[.6,.5,.8],[0,.6,.35]);p.box('cab',c.main,[.7,.8,.6],[0,.9,-.3]);wheels(p,[-.45,.45],[-.35],.4,.4);wheels(p,[-.38,.38],[.55],.22);},'farm');
V('fire-truck','Fire Truck',1,{main:'#d8202c',accent:'#f4f1ea'},(p,c)=>{p.box('body',c.main,[.9,.8,2.2],[0,.6,0]);p.box('ladder',c.accent,[.3,.1,1.8],[0,1.1,-.1]);p.box('light','#3a8fe0',[.4,.1,.12],[0,1.05,.95],{glow:.8,d:1});wheels(p,[-.45,.45],[-.7,.7],.22);},'firetruck fire-engine firefighter');
V('bicycle','Bicycle',.8,{main:'#3ac2c2',accent:'#2a2624'},(p,c)=>{for(const z of [-.4,.4])p.torus('wheel',c.accent,[.55,.55,.3],[0,.3,z],{r:[0,Math.PI/2,0]});p.cyl('frame',c.main,[.05,.8,.05],[0,.45,0],{r:[Math.PI/2.4,0,0]});p.box('seat','#2a2624',[.12,.05,.25],[0,.75,-.15]);},'bike');
V('skateboard','Skateboard',.15,{main:'#ff7a2a',accent:'#2a2624'},(p,c)=>{p.box('deck',c.main,[.3,.04,1],[0,.12,0]);wheels(p,[-.12,.12],[-.35,.35],.05);},'skate');
V('scooter','Scooter',.8,{main:'#b05ad6',accent:'#2a2624'},(p,c)=>{p.box('deck',c.main,[.2,.05,.8],[0,.1,0]);p.cyl('stem',c.main,[.05,.8,.05],[0,.5,.35]);p.box('handle',c.accent,[.5,.05,.05],[0,.9,.35]);wheels(p,[0],[-.35,.35],.07);},'');
V('magic-carpet','Magic Carpet',.2,{main:'#b02a5a',accent:'#ffd84a'},(p,c)=>{p.box('carpet',c.main,[1.2,.04,1.8],[0,.6,0]);p.box('trim',c.accent,[1.25,.03,1.85],[0,.58,0],{d:1});},'carpet flying-carpet');
V('dragon-boat','Swan Boat',1,{main:'#ffffff',accent:'#ff9d2e'},(p,c)=>{p.ball('hull',c.main,[1,.5,1.6],[0,.3,0]);p.cyl('neck',c.main,[.15,.8,.15],[0,.8,.7],{r:[-.3,0,0]});p.ball('head',c.main,[.25,.25,.3],[0,1.2,.85]);p.cone('beak',c.accent,[.1,.2,.1],[0,1.18,1.05],{r:[Math.PI/2,0,0]});},'swan pedal-boat');

// Places, nature and things
const P=(id,name,cat,h,c,make,tags)=>add(id,name,cat,h,c,make,tags);
P('tree','Round Tree','nature',2.2,{main:'#5aa84a',accent:'#7cc45a'},(p,c)=>tree(p,c,{h:2.2,r:.8}),'trees oak');
P('pine-tree','Pine Tree','nature',2.6,{main:'#2f7a4a',accent:'#3f9a5a'},(p,c)=>tree(p,c,{h:2.6,crown:'pine',r:.7}),'pine christmas-tree fir');
P('palm-tree','Palm Tree','nature',2.6,{main:'#3f9a3a',accent:'#5aa84a'},(p,c)=>tree(p,c,{h:2.6,crown:'palm',trunk:'#b58a5a'}),'palm coconut');
P('candy-tree','Candy Tree','nature',2.2,{main:'#ff9ad6',accent:'#ffd0ef'},(p,c)=>tree(p,c,{h:2.2,r:.8,trunk:'#ffffff'}),'cotton-candy');
P('jungle-tree','Jungle Tree','nature',3.4,{main:'#2f8a3a',accent:'#4faa4a'},(p,c)=>{tree(p,c,{h:3.4,r:1.1,trunk:'#6b4a2f'});if(p.detail>1)p.cyl('vine','#3f9a3a',[.04,1.6,.04],[.6,1.8,.2]);},'rainforest');
P('autumn-tree','Autumn Tree','nature',2.2,{main:'#e8822a',accent:'#d8402c'},(p,c)=>tree(p,c,{h:2.2,r:.8}),'fall maple');
P('bush','Bush','nature',.6,{main:'#4f9a3a',accent:'#6cba4a'},(p,c)=>{p.ball('leaves',c.main,[.9,.6,.8],[0,.3,0]);p.ball('leaves',c.accent,[.5,.45,.5],[.3,.35,.1],{d:1});},'shrub hedge');
P('flower','Flower','nature',.6,{main:'#ff7ac2',accent:'#ffd84a'},(p,c)=>{p.cyl('stem','#4f9a3a',[.04,.5,.04],[0,.25,0]);for(let i=0;i<6;i++)p.ball('petal',c.main,[.14,.05,.1],[Math.sin(i*1.05)*.09,.52,Math.cos(i*1.05)*.09],{d:1});p.ball('centre',c.accent,[.1,.08,.1],[0,.53,0]);},'flowers daisy rose tulip blossom');
P('giant-flower','Giant Flower','nature',2.5,{main:'#ff6ab0',accent:'#fff04a'},(p,c)=>{p.cyl('stem','#3f9a3a',[.12,2.2,.12],[0,1.1,0]);for(let i=0;i<8;i++)p.ball('petal',c.main,[.5,.12,.3],[Math.sin(i*.785)*.35,2.25,Math.cos(i*.785)*.35],{r:[0,i*.785,0]});p.ball('centre',c.accent,[.35,.2,.35],[0,2.3,0]);p.ball('leaf','#4fa83a',[.4,.05,.2],[.25,1,0],{d:1});},'sunflower');
P('mushroom','Mushroom','nature',.6,{main:'#e8333f',accent:'#ffffff'},(p,c)=>{p.cyl('stalk',c.accent,[.18,.35,.18],[0,.18,0]);p.ball('cap',c.main,[.6,.35,.6],[0,.42,0]);if(p.detail>1)for(let i=0;i<4;i++)p.ball('dot',c.accent,[.08,.04,.08],[Math.sin(i*1.6)*.17,.56,Math.cos(i*1.6)*.17]);},'toadstool mushrooms');
P('rock','Rock','nature',.6,{main:'#8d8a85',accent:'#a7a39d'},(p,c)=>{p.ball('stone',c.main,[1,.6,.8],[0,.25,0],{seg:7});p.ball('stone',c.accent,[.5,.4,.5],[.35,.2,.2],{seg:6,d:1});},'boulder stone rocks');
P('crystal','Crystal','nature',1.2,{main:'#8fd8ff',accent:'#d7a8ff'},(p,c)=>{p.cone('shard',c.main,[.35,1.2,.35],[0,.6,0],{seg:6,glow:.4,opacity:.85});p.cone('shard',c.accent,[.25,.8,.25],[.25,.4,.1],{seg:6,glow:.4,opacity:.85,r:[0,0,-.4]});p.cone('shard',c.main,[.2,.6,.2],[-.22,.3,-.1],{seg:6,glow:.4,opacity:.85,r:[0,0,.4],d:1});},'crystals diamond gem jewel');
P('cloud','Cloud','sky',1,{main:'#ffffff',accent:'#f2f4ff'},(p,c)=>{p.ball('puff',c.main,[1.2,.7,.8],[0,.4,0]);p.ball('puff',c.accent,[.8,.6,.6],[.55,.35,.1]);p.ball('puff',c.main,[.8,.7,.6],[-.5,.4,0],{d:1});},'clouds');
P('rainbow','Rainbow','sky',3,{main:'#ff4a4a',accent:'#4a8aff'},(p,c)=>{['#ff4a4a','#ff9d2e','#ffe14a','#4fca5a','#4a8aff','#9a5aff'].forEach((col,i)=>p.torus('band',col,[6-i*.36,6-i*.36,.5],[0,0,0],{r:[0,0,0],glow:.25,d:i%2&&p.detail<1?9:0}));},'rainbows');
P('volcano','Volcano','place',3,{main:'#6b4a3a',accent:'#ff5a2a'},(p,c)=>{p.cone('mountain',c.main,[4,3,4],[0,1.5,0],{seg:9});p.cyl('lava',c.accent,[.9,.1,.9],[0,2.7,0],{glow:1});p.cone('lava-flow',c.accent,[.3,1.6,.3],[.6,2,.5],{glow:.8,d:1,r:[.5,0,-.4]});},'lava eruption');
P('mountain','Mountain','place',4,{main:'#8a9aa8',accent:'#ffffff'},(p,c)=>{p.cone('peak',c.main,[5,4,5],[0,2,0],{seg:7});p.cone('snowcap',c.accent,[1.6,1.3,1.6],[0,3.4,0],{seg:7});},'mountains hill');
P('house','Cottage','place',2,{main:'#f2e2c4',accent:'#c8442a'},(p,c)=>{p.box('walls',c.main,[1.6,1.2,1.4],[0,.6,0]);p.pyr('roof',c.accent,[2.2,.9,2],[0,1.65,0],{r:[0,Math.PI/4,0]});p.box('door','#7a4f2e',[.35,.6,.05],[0,.3,.71],{d:1});p.box('window','#8fd0ff',[.3,.3,.05],[.5,.75,.71],{d:1,glow:.2});},'home cottage cabin');
P('castle','Castle','place',4,{main:'#d8d2c8',accent:'#5a7ad8'},(p,c)=>{p.box('keep',c.main,[2,2,2],[0,1,0]);for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]]){p.cyl('tower',c.main,[.7,3,.7],[x,1.5,z]);p.cone('spire',c.accent,[.85,1,.85],[x,3.5,z]);if(p.detail>1)p.box('flag','#ff4a6a',[.3,.2,.02],[x+.15,4.1,z]);}p.box('gate','#6b4a2f',[.6,.9,.05],[0,.45,1.01],{d:1});},'palace fortress kingdom');
P('tower','Wizard Tower','place',4,{main:'#a89ac8',accent:'#3a2a7a'},(p,c)=>{p.cyl('tower',c.main,[1,3.2,1],[0,1.6,0]);p.cone('roof',c.accent,[1.4,1.4,1.4],[0,3.9,0]);p.ball('star','#ffe14a',[.2,.2,.2],[0,4.7,0],{glow:1,d:1});},'wizard');
P('windmill','Windmill','place',3,{main:'#f2e2c4',accent:'#c8442a'},(p,c)=>{p.cyl('tower',c.main,[1,2.4,1.2],[0,1.2,0]);p.cone('cap',c.accent,[1.1,.6,1.1],[0,2.7,0]);const s=p.joint('sails',[0,2.3,.6]);for(let i=0;i<4;i++)p.box('sail','#ffffff',[.25,1.4,.04],[Math.sin(i*1.57)*.7,Math.cos(i*1.57)*.7,0],{parent:s,r:[0,0,-i*1.57]});},'mill');
P('lighthouse','Lighthouse','place',3.5,{main:'#ffffff',accent:'#e8333f'},(p,c)=>{p.cyl('tower',c.main,[.9,3,1.2],[0,1.5,0]);p.cyl('stripe',c.accent,[1.05,.5,1.05],[0,1.5,0],{d:1});p.cyl('lamp','#ffe14a',[.6,.5,.6],[0,3.2,0],{glow:1});p.cone('cap',c.accent,[.8,.5,.8],[0,3.7,0]);},'');
P('tent','Tent','place',1.2,{main:'#ff9d2e',accent:'#7a4f2e'},(p,c)=>p.pyr('canvas',c.main,[1.6,1.2,1.6],[0,.6,0]),'camping');
P('igloo','Igloo','place',1.2,{main:'#f2f8ff',accent:'#cfe2f2'},(p,c)=>{p.ball('dome',c.main,[2,2,2],[0,0,0]);p.cyl('entrance',c.accent,[.6,.6,.8],[0,.3,.95],{r:[Math.PI/2,0,0]});},'');
P('bridge','Bridge','place',.8,{main:'#a87a4a',accent:'#7a4f2e'},(p,c)=>{p.box('deck',c.main,[1,.12,3],[0,.5,0]);for(const s of [-1,1])p.box('rail',c.accent,[.06,.4,3],[s*.5,.75,0],{d:1});},'');
P('fence','Fence','thing',.5,{main:'#e8dcc4',accent:'#c9b896'},(p,c)=>{for(let i=-1;i<=1;i++)p.box('post',c.main,[.1,.6,.1],[i*.6,.3,0]);p.box('rail',c.accent,[1.4,.08,.05],[0,.4,0]);},'');
P('lamp-post','Lamp Post','thing',1.8,{main:'#2a2624',accent:'#ffe9a0'},(p,c)=>{p.cyl('pole',c.main,[.08,1.6,.08],[0,.8,0],{metal:.5});p.ball('lamp',c.accent,[.3,.3,.3],[0,1.7,0],{glow:1});},'streetlight lantern light');
P('bench','Bench','thing',.5,{main:'#a87a4a',accent:'#2a2624'},(p,c)=>{p.box('seat',c.main,[1.2,.08,.4],[0,.4,0]);p.box('back',c.main,[1.2,.3,.06],[0,.65,-.18]);for(const s of [-1,1])p.box('leg',c.accent,[.06,.4,.35],[s*.5,.2,0]);},'');
P('treasure-chest','Treasure Chest','thing',.6,{main:'#8a5a36',accent:'#ffd23a'},(p,c)=>{p.box('box',c.main,[.8,.45,.5],[0,.22,0]);p.cyl('lid',c.main,[.5,.8,.5],[0,.45,0],{r:[0,0,Math.PI/2]});p.box('band',c.accent,[.1,.5,.52],[0,.3,0],{metal:.6,d:1});p.ball('gold',c.accent,[.5,.15,.3],[0,.62,0],{glow:.4,metal:.6,d:1});},'treasure chest gold coins loot');
P('crown','Crown','thing',.4,{main:'#ffd23a',accent:'#e8333f'},(p,c)=>{p.cyl('band',c.main,[.5,.2,.5],[0,.1,0],{metal:.7});for(let i=0;i<5;i++)p.cone('point',c.main,[.1,.2,.1],[Math.sin(i*1.25)*.22,.28,Math.cos(i*1.25)*.22],{metal:.7});p.ball('jewel',c.accent,[.08,.08,.04],[0,.1,.25],{glow:.5,d:1});},'tiara king queen princess prince');
P('star','Star','sky',1,{main:'#ffe14a',accent:'#fff6b0'},(p,c)=>{for(let i=0;i<5;i++)p.cone('point',c.main,[.25,.5,.15],[Math.sin(i*1.2566)*.22,.6+Math.cos(i*1.2566)*.22,0],{r:[0,0,-i*1.2566],glow:.6});p.ball('core',c.accent,[.35,.35,.16],[0,.6,0],{glow:.6});},'stars wishing-star shooting-star');
P('moon','Moon','sky',1,{main:'#f2efe2',accent:'#cfcabc'},(p,c)=>{p.ball('moon',c.main,[1,1,1],[0,.5,0],{glow:.3});if(p.detail>1)for(let i=0;i<4;i++)p.ball('crater',c.accent,[.2,.2,.08],[Math.sin(i*2)*.25,.5+Math.cos(i*1.7)*.25,.46]);},'');
P('planet','Ringed Planet','sky',1.5,{main:'#f2b25a',accent:'#d99af2'},(p,c)=>{p.ball('planet',c.main,[1.2,1.2,1.2],[0,.6,0]);p.torus('ring',c.accent,[2,2,.6],[0,.6,0],{r:[1.2,0,.3]});},'saturn jupiter planets');
P('satellite','Satellite','sky',.8,{main:'#d8d2c8',accent:'#3a5ad8'},(p,c)=>{p.box('core',c.main,[.4,.4,.4],[0,.5,0],{metal:.6});for(const s of [-1,1])p.box('panel',c.accent,[.8,.03,.35],[s*.65,.5,0],{metal:.3});p.cone('dish',c.main,[.3,.2,.3],[0,.8,0],{r:[Math.PI,0,0],d:1});},'');
P('snowman','Snowman','thing',1.3,{main:'#ffffff',accent:'#ff8a2a'},(p,c)=>{p.ball('base',c.main,[.8,.75,.8],[0,.36,0]);p.ball('middle',c.main,[.6,.55,.6],[0,.95,0]);p.ball('head',c.main,[.42,.42,.42],[0,1.38,0]);p.cone('nose',c.accent,[.06,.25,.06],[0,1.38,.25],{r:[Math.PI/2,0,0]});p.eyes(1.45,.18,.08,.06);p.cyl('hat','#2a2624',[.3,.25,.3],[0,1.68,0],{d:1});},'snowmen frosty');
P('ball','Beach Ball','thing',.5,{main:'#e8333f',accent:'#ffffff'},(p,c)=>{p.ball('ball',c.main,[.5,.5,.5],[0,.25,0]);p.torus('stripe',c.accent,[.5,.5,.2],[0,.25,0],{d:1});},'beachball soccer football basketball');
P('kite','Kite','sky',1,{main:'#3ac2c2',accent:'#ff5ab4'},(p,c)=>{p.pyr('sail',c.main,[.8,1,.04],[0,1.5,0],{r:[0,0,0]});p.cyl('string','#ffffff',[.01,1.4,.01],[0,.7,0],{d:1});},'');
P('balloon','Balloon','sky',1.2,{main:'#ff4a6a',accent:'#ffffff'},(p,c)=>{p.ball('balloon',c.main,[.45,.55,.45],[0,1.1,0],{glow:.15});p.cyl('string',c.accent,[.01,.8,.01],[0,.45,0],{d:1});},'balloons party-balloon');
P('gift','Present','thing',.5,{main:'#5a7ad8',accent:'#ffd23a'},(p,c)=>{p.box('box',c.main,[.5,.45,.5],[0,.22,0]);p.box('ribbon',c.accent,[.52,.47,.1],[0,.22,0]);p.box('ribbon',c.accent,[.1,.47,.52],[0,.22,0]);p.torus('bow',c.accent,[.2,.2,.2],[0,.5,0],{d:1});},'present gifts presents surprise box');
P('sandcastle','Sandcastle','place',.8,{main:'#e8cf8f',accent:'#d4b36a'},(p,c)=>{p.box('base',c.main,[1,.4,1],[0,.2,0]);for(const [x,z] of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]])p.cyl('turret',c.accent,[.25,.6,.25],[x,.3,z]);p.cone('top',c.main,[.4,.4,.4],[0,.6,0]);},'sand beach');
P('coral','Coral','nature',1,{main:'#ff7a8a',accent:'#ffb06a'},(p,c)=>{for(let i=0;i<5;i++)p.cap('branch',i%2?c.accent:c.main,[.12,.4+i*.08,.12],[Math.sin(i*1.3)*.2,.35+i*.04,Math.cos(i*1.3)*.2],{r:[Math.sin(i)*.4,0,Math.cos(i)*.4]});},'reef');
P('seaweed','Seaweed','nature',1.4,{main:'#3fa86a',accent:'#6cc48a'},(p,c)=>{for(let i=0;i<3;i++){const j=p.joint('frond',[(i-1)*.15,0,0]);p.cap('frond-mesh',i%2?c.accent:c.main,[.1,1.1,.04],[0,.65,0],{parent:j});}},'kelp');
P('shell','Seashell','nature',.3,{main:'#ffd0c0',accent:'#ffb0a0'},(p,c)=>{p.cone('shell',c.main,[.4,.3,.2],[0,.15,0],{seg:8,r:[0,0,0]});},'seashell conch');
P('bubble','Bubble','sky',.5,{main:'#bfefff',accent:'#ffffff'},(p,c)=>p.ball('bubble',c.main,[.5,.5,.5],[0,.25,0],{opacity:.35,glow:.3,noShadow:1}),'bubbles');
P('campfire','Campfire','thing',.6,{main:'#ff8a2a',accent:'#7a4f2e'},(p,c)=>{for(let i=0;i<4;i++)p.cyl('log',c.accent,[.1,.6,.1],[0,.08,0],{r:[Math.PI/2,i*.785,0]});p.cone('flame',c.main,[.35,.6,.35],[0,.4,0],{glow:1});p.cone('flame','#ffe14a',[.2,.35,.2],[0,.35,0],{glow:1,d:1});},'fire bonfire');
P('swing','Swing Set','thing',1.5,{main:'#e8333f',accent:'#ffd23a'},(p,c)=>{for(const s of [-1,1])p.cyl('frame',c.main,[.08,1.6,.08],[s*.8,.8,0]);p.cyl('bar',c.main,[.08,1.7,.08],[0,1.6,0],{r:[0,0,Math.PI/2]});p.box('seat',c.accent,[.4,.05,.2],[0,.4,0]);},'swings playground');
P('slide','Slide','thing',1.5,{main:'#3a8fe0',accent:'#ffd23a'},(p,c)=>{p.box('chute',c.accent,[.5,.06,2],[0,.75,0],{r:[.7,0,0]});p.box('ladder',c.main,[.5,1.5,.06],[0,.75,-.8]);},'waterslide');
P('trampoline','Trampoline','thing',.4,{main:'#2a2624',accent:'#3ac2c2'},(p,c)=>{p.cyl('mat',c.main,[1.6,.05,1.6],[0,.4,0]);p.torus('rim',c.accent,[1.6,1.6,.3],[0,.4,0],{r:[Math.PI/2,0,0]});},'bouncy');
P('ferris-wheel','Ferris Wheel','place',4,{main:'#ff5ab4',accent:'#ffe14a'},(p,c)=>{const w=p.joint('wheel',[0,2.2,0]);p.torus('rim',c.main,[3.6,3.6,.4],[0,0,0],{parent:w});for(let i=0;i<8;i++)p.box('car',c.accent,[.3,.3,.3],[Math.sin(i*.785)*1.8,Math.cos(i*.785)*1.8,0],{parent:w});for(const s of [-1,1])p.cyl('leg','#d8d2c8',[.1,2.4,.1],[s*.6,1.1,0],{r:[0,0,s*.25]});},'funfair fair');
P('carousel','Carousel','place',2,{main:'#ff7ac2',accent:'#ffe14a'},(p,c)=>{p.cyl('base',c.accent,[2,.2,2],[0,.1,0]);p.cyl('pole','#ffffff',[.12,1.6,.12],[0,.9,0]);p.cone('roof',c.main,[2.2,.7,2.2],[0,1.95,0]);},'merry-go-round');
P('bouncy-castle','Bouncy Castle','place',1.6,{main:'#ff4a6a',accent:'#4a8aff'},(p,c)=>{p.box('floor',c.accent,[2,.3,2],[0,.15,0]);for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]])p.cyl('tower',c.main,[.5,1.4,.5],[x,.7,z]);},'');
P('magic-wand','Magic Wand','thing',.6,{main:'#2a2624',accent:'#ffe14a'},(p,c)=>{p.cyl('stick',c.main,[.04,.5,.04],[0,.25,0]);p.ball('tip',c.accent,[.15,.15,.15],[0,.55,0],{glow:1});},'wand spell');
P('book','Storybook','thing',.2,{main:'#3a5ad8',accent:'#fff6e0'},(p,c)=>{p.box('cover',c.main,[.5,.08,.65],[0,.04,0]);p.box('pages',c.accent,[.47,.06,.62],[.01,.045,0]);},'books');
P('umbrella','Umbrella','thing',1.2,{main:'#ffd23a',accent:'#2a2624'},(p,c)=>{p.cyl('shaft',c.accent,[.04,1.1,.04],[0,.55,0]);p.cone('canopy',c.main,[1.1,.4,1.1],[0,1.2,0],{seg:8});},'parasol');
P('teddy-bear','Teddy Bear','thing',.5,{main:'#c08a5a',accent:'#f0d0b0'},(p,c)=>{p.ball('belly',c.main,[.35,.38,.3],[0,.2,0]);p.ball('head',c.main,[.3,.28,.28],[0,.48,0]);p.ball('muzzle',c.accent,[.12,.1,.08],[0,.45,.13]);for(const s of [-1,1])p.ball('ear',c.main,[.1,.1,.05],[s*.12,.6,0]);p.eyes(.52,.13,.06,.04);},'teddy plush toy');
P('gem','Giant Gem','thing',.8,{main:'#e8336a',accent:'#ff8ab0'},(p,c)=>{p.cone('top',c.main,[.6,.3,.6],[0,.6,0],{seg:6,glow:.4});p.cone('bottom',c.accent,[.6,.5,.6],[0,.25,0],{seg:6,r:[Math.PI,0,0],glow:.4});},'ruby emerald sapphire');
P('pumpkin','Pumpkin','nature',.5,{main:'#ff8a1a',accent:'#4f7a2a'},(p,c)=>{p.ball('gourd',c.main,[.6,.45,.6],[0,.22,0]);p.cyl('stem',c.accent,[.06,.15,.06],[0,.5,0]);},'jack-o-lantern pumpkins');
P('ice-castle','Ice Palace','place',4,{main:'#cfefff',accent:'#8fd8ff'},(p,c)=>{p.box('keep',c.main,[2,2,2],[0,1,0],{opacity:.85,glow:.15});for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]])p.cone('spire',c.accent,[.6,3,.6],[x,1.5,z],{seg:6,opacity:.85,glow:.2});},'frozen ice-palace snow-queen');
P('cloud-castle','Cloud Castle','place',5,{main:'#fdf6ff',accent:'#ffcf5a'},(p,c)=>{p.ball('cloud-base',c.main,[4.5,1.2,4.5],[0,.6,0]);p.box('hall',c.main,[2,1.8,2],[0,2,0]);for(const [x,z] of [[-1.1,-1.1],[1.1,-1.1],[-1.1,1.1],[1.1,1.1]]){p.cyl('tower',c.main,[.7,2.6,.7],[x,2.3,z]);p.cone('spire',c.accent,[.85,1,.85],[x,4.1,z],{metal:.5});}p.cone('dome',c.accent,[1.4,1.4,1.4],[0,3.6,0],{metal:.5});},'sky-castle');
P('moon-base','Moon Base Dome','place',2,{main:'#e8eaee',accent:'#7ad3ff'},(p,c)=>{p.ball('dome',c.accent,[2.4,2.4,2.4],[0,0,0],{opacity:.6,glow:.15});p.cyl('ring',c.main,[2.5,.25,2.5],[0,.12,0],{metal:.5});p.cyl('airlock',c.main,[.6,.8,.9],[0,.4,1.2],{r:[Math.PI/2,0,0]});},'moonbase space-station base');
P('lunar-rover','Moon Buggy','vehicle',.7,{main:'#e8eaee',accent:'#ff8a2a'},(p,c)=>{p.box('deck',c.main,[.9,.15,1.3],[0,.45,0],{metal:.4});p.box('seat',c.accent,[.5,.3,.3],[0,.65,-.1]);p.cone('dish',c.main,[.3,.15,.3],[.3,.9,-.4],{d:1,r:[Math.PI,0,0]});wheels(p,[-.5,.5],[-.45,.45],.22);},'rover buggy moon-buggy');
P('flag','Flag','thing',1.5,{main:'#e8333f',accent:'#ffffff'},(p,c)=>{p.cyl('pole','#d8d2c8',[.04,1.5,.04],[0,.75,0]);p.box('cloth',c.main,[.6,.4,.02],[.3,1.3,0]);},'banner');
P('portal','Teleport Pad','thing',.3,{main:'#7af2ff',accent:'#b07aff'},(p,c)=>{p.cyl('pad','#3a3f4a',[1.4,.12,1.4],[0,.06,0],{metal:.6});p.torus('ring',c.main,[1.3,1.3,.3],[0,.14,0],{r:[Math.PI/2,0,0],glow:1});},'teleporter teleport transporter');
P('door','Secret Door','place',2.2,{main:'#7a4f2e',accent:'#ffd84a'},(p,c)=>{p.box('frame','#d8d2c8',[1.4,2.4,.25],[0,1.2,0]);p.box('door',c.main,[1.1,2.1,.2],[0,1.05,.04]);p.ball('knob',c.accent,[.1,.1,.1],[.4,1.05,.18],{glow:.6});p.box('light',c.accent,[1.1,.1,.02],[0,.02,.2],{glow:1,d:1});},'secret-door doorway');
P('mystery','Mystery Box','thing',.8,{main:'#b07aff',accent:'#ffe14a'},(p,c)=>{p.box('box',c.main,[.7,.7,.7],[0,.35,0],{glow:.25});p.box('question',c.accent,[.12,.3,.72],[0,.42,0],{glow:.6,d:1});},'');

export const KIT=K;
export const KIT_IDS=Object.keys(K);
const FALLBACK_SYNONYM={puppies:'dog',kittens:'cat',ponies:'horse',dinosaurs:'t-rex',dinos:'t-rex',pets:'dog',candy:'lollipop',sweets:'lollipop',treat:'cupcake',dessert:'cake',fruit:'apple',spaceship:'rocket',ship:'pirate-ship',car:'car',trucks:'fire-truck',truck:'fire-truck',tree:'tree',plants:'bush',gold:'treasure-chest',money:'treasure-chest',jewels:'gem',sword:'magic-wand',toy:'teddy-bear',toys:'teddy-bear',sun:'star',space:'planet'};

// Turn a madlib word ("purple dragons", "a huge pizza") into a kit match plus a tint.
export const COLORS={red:'#e8333f',orange:'#ff8a2a',yellow:'#ffe14a',gold:'#ffd23a',golden:'#ffd23a',green:'#4fca5a',blue:'#3a8fe0',purple:'#a35ad8',violet:'#9a5aff',pink:'#ff7ac2',white:'#ffffff',black:'#2a2624',brown:'#8a5a36',grey:'#9a9a9a',gray:'#9a9a9a',silver:'#cfd6de',rainbow:'#ff7ac2',teal:'#3ac2c2',turquoise:'#3ad8c8',aqua:'#5ae0ff',cyan:'#5ae0ff',sparkly:'#ffd8ff',glowing:'#bfffd8',lime:'#a8f04a',magenta:'#ff3ad8',navy:'#2a3a8a',peach:'#ffb48a',mint:'#a8f0d0',lavender:'#c8b0ff'};
export function match(text){
 const words=String(text||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(Boolean);
 let color=null,size=1;const rest=[];
 for(const w of words){if(/^(a|an|the|some|my|our|of|and|with|lots|many|very|really|please)$/.test(w))continue;if(COLORS[w]){color=COLORS[w];continue;}if(/^(giant|huge|enormous|massive|big|gigantic|mega)$/.test(w)){size=w==='big'?1.6:2.6;continue;}if(/^(tiny|little|small|mini|baby)$/.test(w)){size=.5;continue;}rest.push(w);}
 const stems=w=>[w,w.replace(/ies$/,'y'),w.replace(/es$/,''),w.replace(/s$/,'')];
 // Two-word ids first ("ice cream", "hot dogs"), then exact ids, then tags, then synonyms.
 const out=id=>({id,color,size,word:rest.join(' ')});
 for(let i=0;i<rest.length-1;i++)for(const s of stems(rest[i+1])){const id=rest[i]+'-'+s;if(K[id])return out(id);}
 const order=[...rest].reverse();
 for(const w of order)for(const s of stems(w))if(K[s])return out(s);
 for(const w of order)for(const s of stems(w)){const hit=KIT_IDS.find(id=>K[id].tags.includes(s));if(hit)return out(hit);}
 for(const w of order)for(const s of stems(w))if(FALLBACK_SYNONYM[s])return out(FALLBACK_SYNONYM[s]);
 return rest.length?{id:null,color,size,word:rest.join(' ')}:null;
}

// Build one model. Returns a Group whose userData records the kit id and detail.
export function build(id,{detail=2,color=null,accent=null}={}){
 const r=K[id]||K.mystery,root=new T.Group();root.name=r.id;
 const c={main:color||r.c.main,accent:accent||r.c.accent};
 r.make(builder(root,detail),c);
 root.userData.kit={id:r.id,detail,color:c.main,name:r.name,cat:r.cat};
 // Recipes are authored at a natural size; normalise to the declared height (person = 1).
 const box=new T.Box3().setFromObject(root),hgt=box.max.y-Math.min(0,box.min.y);
 if(r.cat!=='sky'||r.id==='cloud'){const s=hgt>0?r.h/hgt:1;if(Math.abs(s-1)>.05)root.children.forEach(ch=>{ch.position.multiplyScalar(s);ch.scale.multiplyScalar(s);});}
 return root;
}
export function triangles(object){let n=0;object.traverse(o=>{if(o.isMesh){const g=o.geometry;n+=(g.index?g.index.count:g.attributes.position.count)/3;}});return n|0;}
export function list(){return KIT_IDS.map(id=>({id,label:K[id].name,category:'kit:'+K[id].cat}));}
