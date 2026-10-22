import * as T from '../vendor/three.module.js';
export function drawStorybookDressing(recipe,plan,heightAt){
 const root=new T.Group();root.name='Seeded working edges';root.userData.representationOnly=true;const mats=new Map(),geos=new Map();
 const mat=c=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:1,flatShading:true}));return mats.get(c);};
 const geo=(key,make)=>{if(!geos.has(key))geos.set(key,make());return geos.get(key);};
 const add=(group,geometry,color,x,y,z,sx=1,sy=1,sz=1)=>{const m=new T.Mesh(geometry,mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};
 const box=(g,c,x,y,z,w,h,d)=>add(g,geo('box',()=>new T.BoxGeometry(1,1,1)),c,x,y,z,w,h,d);
 const orb=(g,c,x,y,z,r,s=1)=>add(g,geo('leaf',()=>new T.IcosahedronGeometry(1,1)),c,x,y,z,r,r*s,r);
 const cylinder=(g,c,x,y,z,r,h)=>add(g,geo('trunk',()=>new T.CylinderGeometry(1,1,1,7)),c,x,y,z,r,h,r);
 // Ground-following symbolic surfaces; these do not claim hydraulic simulation or navigation barriers.
 function surface(p,color,scale,offset){
  const vertices=[],indices=[],segments=40,rings=6;
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,wave=1+.08*Math.sin(a*3+p.phase)+.05*Math.cos(a*5-p.phase),r=ring/rings*scale*wave,x=plan.center.x+p.x+Math.cos(a)*p.rx*r,z=plan.center.z+p.z+Math.sin(a)*p.rz*r;vertices.push(x*.1,heightAt(x,z)*.1+offset,z*.1);}
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments,c=a+segments,d=b+segments;indices.push(a,c,b,b,c,d);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const m=new T.Mesh(geometry,mat(color));m.material.side=T.DoubleSide;m.receiveShadow=true;root.add(m);
 }
 for(const p of recipe.patches||[]){if(p.kind==='water'){surface(p,'#7e9a76',1.2,.032);surface(p,'#b7b88a',1.09,.038);surface(p,'#58a5b7',1,.044);surface(p,'#3e8ba5',.72,.049);}else surface(p,p.kind==='dry'?'#c0bb83':'#9caf78',1,.022);}
 for(const item of recipe.items){const g=new T.Group();g.position.set((plan.center.x+item.x)*.1,heightAt(plan.center.x+item.x,plan.center.z+item.z)*.1+.025,(plan.center.z+item.z)*.1);g.rotation.y=item.turn;g.scale.setScalar(.1*item.scale);g.userData.dressing={kind:item.kind,story:item.story};root.add(g);
  if(item.kind==='tree'||item.kind==='sapling'){
   const young=item.kind==='sapling',height=young?3:5+item.variation*2,canopy=young?1.3:2.5+item.variation;g.rotation.y=item.turn;cylinder(g,'#6e5740',0,height*.45,0,young?.16:.32,height*.9);const branch=cylinder(g,'#6e5740',.6,height*.68,0,.12,height*.38);branch.rotation.z=-.55;orb(g,'#69864b',0,height,0,canopy,1.1);orb(g,'#91a45d',-canopy*.48,height*.9,.6,canopy*.7);orb(g,'#b1bb71',canopy*.5,height*.95,-.3,canopy*.6);if(!young&&recipe.type==='ranch')for(const [x,y,z]of [[1,height,.8],[-1,height-.5,1],[.4,height+1,-1]])orb(g,'#c77a45',x,y,z,.22);
  }else if(item.kind==='stump'){cylinder(g,'#775a3f',0,.4,0,.65,.8);cylinder(g,'#c1a77a',0,.82,0,.56,.04);orb(g,'#6c8749',.6,.5,.4,.4);
  }else if(item.kind==='grass'||item.kind==='flowers'){for(let i=0;i<4;i++){const x=(i%2-.5)*.8,z=(Math.floor(i/2)-.5)*.65;const blade=box(g,i%2?'#91a061':'#758c51',x,.45,z,.1,.9,.12);blade.rotation.z=(i%2?1:-1)*.25;if(item.kind==='flowers'){orb(g,['#e6c85d','#d3b5cb','#e9dfad'][i%3],x,.85,z,.22);}}
  }else if(item.kind==='seedheads'){for(let i=0;i<3;i++){const x=(i-1)*.48,h=1.2+i*.22;const stem=box(g,'#92965e',x,h/2,0,.07,h,.07);stem.rotation.z=.12*(i-1);orb(g,'#b9b284',x,h,0,.15,2.2);}
  }else if(item.kind==='reeds'){for(let i=0;i<5;i++){const x=(i-2)*.38,z=i%2*.5,h=1.5+(i%3)*.35;box(g,'#647c48',x,h/2,z,.11,h,.12);cylinder(g,'#7c6540',x,h,z,.14,.45);}
  }else if(item.kind==='stones'){orb(g,'#9f9d85',0,.35,0,1.1,.38);orb(g,'#b6b39b',1,.2,.4,.6,.45);
  }else if(item.kind==='vegetable'){box(g,'#927150',0,.08,0,3,.16,2);for(const x of [-.8,0,.8]){orb(g,'#62824b',x,.5,0,.55,.75);orb(g,'#94a75d',x+.2,.65,0,.35);}
  }else if(item.kind==='crate'){box(g,'#b08a54',0,.65,0,1.5,1.3,1.3);for(const y of [.25,.7,1.15])box(g,'#6e5338',0,y,.67,1.5,.07,.05);box(g,'#d6b57c',0,1.33,0,1.6,.08,1.4);
  }else if(item.kind==='barrel'){cylinder(g,'#9e7950',0,.9,0,.7,1.8);for(const y of [.3,1.4])cylinder(g,'#5c6158',0,y,0,.73,.12);
  }else if(item.kind==='hay'){cylinder(g,'#c2ad63',0,1,0,1,1.8).rotation.z=Math.PI/2;for(const x of [-.65,.65])box(g,'#87734b',x,1,0,.08,1.9,1.9);
  }else if(item.kind==='trough'){box(g,'#8b9388',0,.5,0,3.4,1,1.3);box(g,'#71939a',0,1.02,0,2.9,.03,.9);
  }else if(item.kind==='cart'){box(g,'#ad8454',0,1.2,0,2.7,.25,1.6);for(const z of [-.9,.9])cylinder(g,'#495249',0,.65,z,.65,.16).rotation.x=Math.PI/2;for(const z of [-.6,.6])box(g,'#795d3e',1.8,1,z,2.2,.12,.12);
  }else if(item.kind==='fruit'){for(let i=0;i<3;i++)orb(g,'#c38c49',(i-1)*.45,.17,i%2*.35,.18);}
 }
 return root;
}
