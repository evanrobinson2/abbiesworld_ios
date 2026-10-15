// Original scene composition. Versioned GLBs remain the source of every generated landmark.
export function buildSeasonal(T,group,templates,theme,options={}){
 const seed=options.seed||42,layout=options.arrangement||'signature',generator=options.generator||'clusters';const moon=theme==='moon',R=2.2,rand=(a,b)=>{const v=Math.sin(a*127.1+b*311.7+seed*.813)*43758.5453;return v-Math.floor(v)};
 let instances=0;const batches=new Map();
 function add(id,x,y,z,s=1,yaw=0){const root=templates.get(id);if(!root)return;if(!batches.has(id))batches.set(id,[]);batches.get(id).push({x,y,z,s,yaw});instances++}
 const sites=moon?[
 ['HUB',0,0,-9,1],['HABITAT',-17,0,4,1],['HABITAT',15,0,-3,.8],['OBSERVATORY',23,3,-22,.85],['ROCKET',-24,0,-16,.8],['GREENHOUSE',4,0,13,1],['SOLAR',19,0,12,1],['SOLAR',27,0,13,.8],['ROVER',-5,0,14,1.25],['AIRLOCK',-6,0,3,1]
 ]:[['CASTLE',0,3,-25,.85],['WORKSHOP',-20,0,-4,.9],['BAKERY',-13,0,13,1],['CLOCKTOWER',21,0,-11,.8],['CAROUSEL',19,0,12,.85],['SLEIGH',0,0,12,1],['MARKET',-3,0,22,1],['MARKET',6,0,22,1],['STATION',-29,0,15,.85],['TREE',0,0,1,1.4]];
 for(const [i,site] of sites.entries()){if(layout==='plaza'&&i>0){const a=(i-1)*Math.PI*2/(sites.length-1);site[1]=Math.cos(a)*25;site[3]=Math.sin(a)*22+2;}if(layout==='hamlets'&&i>0){const village=i%3;site[1]=[-23,20,2][village]+Math.cos(i*2.4)*6;site[3]=[-5,5,22][village]+Math.sin(i*2.4)*5;}if(layout==='frontier'){const x=site[1];site[1]=-site[3]*.95;site[3]=x*.95;}}
 const occupied=(x,z)=>sites.some(([id,a,y,b,s])=>Math.hypot(x-a,z-b)<(id==='CASTLE'?17:id==='HUB'?14:id==='ROCKET'?7:6));
 for(let q=-11;q<=11;q++)for(let r=-11;r<=11;r++){
  if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))>11)continue;
  const x=Math.sqrt(3)*R*(q+r/2),z=R*1.5*r,n=generator==='rings'?Math.abs(Math.sin(Math.hypot(x,z)*.35+seed*.1)):rand(Math.floor(q/2),Math.floor(r/2))*.45+rand(q,r)*.55,ridge=z<-19&&Math.abs(x)>12;
  if(generator==='islands'&&Math.abs(x)>4&&Math.abs(z-7)>3&&!occupied(x,z)&&rand(q+5,r+9)<.27)continue;const y=ridge?3:0,path=Math.abs(x)<2||Math.abs(z-7)<1.8;
  const biome=moon?(ridge?'BASALT':n>.86?'ICE':path?'PAD':'REGOLITH'):(ridge?'FROST':path?'PATH':n>.85?'ICE':'SNOW');
  add('AW-HEX-'+(moon?'MOON-':'XMAS-')+biome,x,y,z);
  if(occupied(x,z)||path)continue;
  if(moon){if(n>.83)add('AW-MOON-CRATER-001',x,y+.04,z,.6,n*6);else if(n>.58)add('AW-MOON-ROCK-001',x,y,z,.65+n*.35,n*6);else if(n<.08)add('AW-MOON-ICE-001',x,y,z,.65,n*6);if(n>.95)add('AW-MOON-SUPPLY-001',x+1,y,z+1,.7)}
  else {if(n>.36)add(n>.78?'AW-XMAS-TREE-003':'AW-XMAS-TREE-002',x,y,z,.65+n*.4,n*6);if(n<.06)add('AW-XMAS-SNOWMAN-001',x,y,z,1,n*3);if(n>.94)add('AW-XMAS-GIFTS-001',x+1,y,z+1,.7)}
 }
 for(const [id,x,y,z,s] of sites)add((moon?'AW-MOON-':'AW-XMAS-')+id+'-001',x,y+.06,z,s);
 if(!moon){for(const x of [-8,8])for(const z of [1,10,19])add('AW-XMAS-LAMP-001',x,0,z,.8);add('AW-XMAS-WREATH-001',0,0,29,1);add('AW-XMAS-REINDEER-001',-4,0,14,1.1);add('AW-XMAS-GIFTS-001',3,0,2,1.5)}
 // Batched source geometry keeps repeated trees and hexes inexpensive.
 for(const [id,list]of batches){const root=templates.get(id);root.updateWorldMatrix(true,true);const inv=root.parent.matrixWorld.clone().invert();root.traverse(m=>{if(!m.isMesh)return;const geom=m.geometry.clone();geom.applyMatrix4(inv.clone().multiply(m.matrixWorld));const mesh=new T.InstancedMesh(geom,m.material,list.length),dummy=new T.Object3D();list.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.y=p.yaw;dummy.scale.setScalar(p.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)})}
 // Original architectural paving and navigation lamps, not substitute generated assets.
 const groundMat=new T.MeshStandardMaterial({color:moon?'#303a49':'#ba8064',roughness:.85});
 if(moon){const rocketSite=sites.find(s=>s[0]==='ROCKET'),rx=rocketSite[1],rz=rocketSite[3];const pad=new T.Mesh(new T.CylinderGeometry(6.5,6.6,.18,48),groundMat);pad.position.set(rx,.06,rz);pad.receiveShadow=true;group.add(pad);const ring=new T.Mesh(new T.TorusGeometry(5.5,.12,6,64),new T.MeshStandardMaterial({color:'#ffc568',emissive:'#ad671b',emissiveIntensity:.3}));ring.rotation.x=-Math.PI/2;ring.position.set(rx,.17,rz);group.add(ring)}
 for(let i=-4;i<=4;i++){const mat=new T.MeshStandardMaterial({color:moon?'#ffbc64':'#ffd389',emissive:moon?'#e77e25':'#ff9c36',emissiveIntensity:1.2}),post=new T.Mesh(new T.CylinderGeometry(.08,.11,1.1,6),groundMat);post.position.set(i*6,.6,8);group.add(post);const lamp=new T.Mesh(new T.SphereGeometry(.18,8,6),mat);lamp.position.set(i*6,1.2,8);group.add(lamp)}
 if(moon){
  const positions=[];for(let i=0;i<520;i++){const a=rand(i,17)*Math.PI*2,b=rand(i,28)*1.3;positions.push(Math.cos(a)*Math.cos(b)*150,Math.sin(b)*125+20,Math.sin(a)*Math.cos(b)*150)}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));group.add(new T.Points(geo,new T.PointsMaterial({color:'#dbeaff',size:.22,sizeAttenuation:true})));
  const earth=new T.Mesh(new T.SphereGeometry(6,32,20),new T.MeshStandardMaterial({color:'#5b98be',roughness:.8}));earth.position.set(-38,37,-68);group.add(earth);
 }else{
  const positions=[];for(let i=0;i<400;i++)positions.push((rand(i,17)-.5)*90,rand(i,28)*30+2,(rand(i,39)-.5)*80);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));group.add(new T.Points(geo,new T.PointsMaterial({color:'#fff7e6',size:.12,sizeAttenuation:true,transparent:true,opacity:.7})));
 }
 group.userData.instances=instances;
}
