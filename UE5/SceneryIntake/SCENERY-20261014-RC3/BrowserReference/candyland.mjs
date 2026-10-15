const colors={MEADOW:'#d79b3b',FOREST:'#754051',AUTUMN:'#da7c2c',HIGHLAND:'#603a2c',SNOW:'#f3dfb5',MARSH:'#986740',WATER:'#b9772b'};
export function makeCandyMaterial(T,id,source){
 if(Array.isArray(source))return source.map(s=>makeCandyMaterial(T,id,s));
 if(id.startsWith('AW-HW-')){const m=new T.MeshPhysicalMaterial({map:source.map,normalMap:source.normalMap,roughnessMap:source.roughnessMap,color:source.color?.clone()||new T.Color('white'),roughness:.36,metalness:0,clearcoat:.42,clearcoatRoughness:.24});return m}
 let color='#69402e',roughness=.35;
 if(id.startsWith('AW-HEX-')){color=colors[id.slice(7)]||color;if(source.name.includes('earth-edge'))color='#4a281e';if(source.name.includes('oat-edge'))color='#d5af73';if(source.name.includes('deep-edge'))color='#281b21';roughness=id.endsWith('WATER')?.19:.48}
 else if(id==='AW-VAR-TREE-006'){color='#9d7659';roughness=.6}
 else if(id.includes('TREE')){color=id.endsWith('003')?'#c96824':id.endsWith('002')?'#6c305d':'#3b223a';roughness=.22}
 else if(id.includes('ROCK')||id.includes('CLIFF'))color='#5f392a';
 else if(id.includes('ICE'))color='#edd2a3';
 else if(id.includes('HOUSE')||id.includes('TAVERN')){const m=source.clone();m.color.set('#e4b775');m.roughness=.58;m.metalness=0;return m}
 else if(id.includes('FLOWER'))color=id.endsWith('001')?'#f69b28':'#ead9a7';
 else if(id.includes('GRASS')||id.includes('WATERPLANT')||id.includes('CLOVER'))color='#a96b36';
 else if(id.includes('MUSHROOM'))color='#985486';
 else if(id.includes('DEER')){const m=source.clone();m.color.set('#e4bc8d');m.roughness=.65;return m}
 return new T.MeshPhysicalMaterial({color,roughness,metalness:0,clearcoat:id.includes('WATER')?.8:.45,clearcoatRoughness:.25,side:T.DoubleSide});
}
export function addCandyLandmarks(T,group,templates){
 const caramel=new T.MeshPhysicalMaterial({color:'#c58a3e',roughness:.3,clearcoat:.75}),choco=new T.MeshPhysicalMaterial({color:'#4b291f',roughness:.5,clearcoat:.3}),purple=new T.MeshPhysicalMaterial({color:'#6a295e',roughness:.3,clearcoat:.65}),cream=new T.MeshStandardMaterial({color:'#f4dfbd',roughness:.72}),orange=new T.MeshPhysicalMaterial({color:'#e88221',roughness:.33,clearcoat:.4}),glow=new T.MeshStandardMaterial({color:'#ffb94c',emissive:'#ff8416',emissiveIntensity:1.3});
 function mesh(geo,mat,x,y,z,parent=group){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function original(id,x,y,z,scale=1){const template=templates.get(id);if(!template)return false;const root=template.clone(true),holder=new T.Group();root.traverse(m=>{if(m.isMesh){m.material=makeCandyMaterial(T,id,m.material);m.castShadow=true;m.receiveShadow=true}});holder.add(root);holder.position.set(x,y,z);holder.scale.setScalar(scale);group.add(holder);return true}
 // Original procedural candy accents are replaced by the explicitly versioned Meshy landmarks when delivered.
 const mega=templates.has('AW-HW-MEGA-CASTLE-001');if(!(mega?original('AW-HW-MEGA-CASTLE-001',-3,4.5,-29,.8):original('AW-HW-CASTLE-001',-3,4.5,-28,1.65))){
 const castle=new T.Group();castle.position.set(-3,4.5,-28);group.add(castle);mesh(new T.BoxGeometry(8,4,5),choco,0,2,0,castle);for(const x of [-4,4])for(const z of [-2.5,2.5]){mesh(new T.CylinderGeometry(1.2,1.3,6,12),caramel,x,3,z,castle);mesh(new T.ConeGeometry(1.7,3,12),purple,x,7.4,z,castle);mesh(new T.TorusGeometry(1.2,.12,6,16),cream,x,5.6,z,castle).rotation.x=Math.PI/2}for(const x of [-2,0,2])mesh(new T.BoxGeometry(.5,.9,.08),glow,x,3,2.56,castle);mesh(new T.BoxGeometry(1.5,2,.1),purple,0,1,2.58,castle)}
 if(!original('AW-HW-CAFE-001',-8,1.5,10,1)){
 const cafe=new T.Group();cafe.position.set(-8,1.5,10);group.add(cafe);mesh(new T.BoxGeometry(4,2.5,3),caramel,0,1.25,0,cafe);mesh(new T.ConeGeometry(3.2,1.5,4),choco,0,3.15,0,cafe).rotation.y=Math.PI/4;const cup=mesh(new T.CylinderGeometry(.75,.55,.9,16),cream,0,4.3,0,cafe);mesh(new T.CylinderGeometry(.66,.66,.05,16),choco,0,4.78,0,cafe);mesh(new T.TorusGeometry(.35,.12,8,16),cream,.8,4.3,0,cafe);mesh(new T.BoxGeometry(.7,1.7,.08),choco,.7,.85,1.56,cafe);mesh(new T.BoxGeometry(1.1,1,.08),glow,-.8,1.45,1.56,cafe)}
 for(let i=0;i<22;i++){const x=Math.sin(i*2.399)*31,z=Math.cos(i*2.399)*22,y=z<-18?3:z>15?0:1.5;if(i%3===0){mesh(new T.CylinderGeometry(.09,.09,2,8),cream,x,y+1,z);mesh(new T.SphereGeometry(.65,16,12),i%2?purple:orange,x,y+2.3,z);mesh(new T.TorusGeometry(.38,.08,6,16),cream,x,y+2.3,z+.55)}else if(!original('AW-HW-PUMPKIN-001',x,y,z,.65)){const g=new T.Group();g.position.set(x,y,z);group.add(g);mesh(new T.SphereGeometry(.5,12,8),orange,0,.42,0,g).scale.y=.8;mesh(new T.CylinderGeometry(.06,.1,.22,7),choco,0,.9,0,g);for(const sx of [-.16,.16])mesh(new T.SphereGeometry(.065,6,4),glow,sx,.5,.44,g)}}
 addGraveyard(T,group,templates,original);original('AW-HW-MANOR-001',-27,1.5,-10,.65);original('AW-HW-BELLTOWER-001',26,3,-20,.6);original('AW-HW-CAROUSEL-001',23,1.5,8,.65);
 // A real little bridge joins the villages across the caramel river.
 const bridge=new T.Group();bridge.position.set(0,1.5,-1);bridge.rotation.y=-.22;group.add(bridge);mesh(new T.BoxGeometry(9,.22,1.7),choco,0,.45,0,bridge);for(const z of [-.8,.8]){mesh(new T.BoxGeometry(9,.12,.12),caramel,0,1.4,z,bridge);for(const x of [-4,-2,0,2,4])mesh(new T.BoxGeometry(.12,1,.12),cream,x,.95,z,bridge)}
}

function addGraveyard(T,group,templates,original){
 const site=new T.Group();site.position.set(-25,1.5,5);group.add(site);const cocoa=new T.MeshPhysicalMaterial({color:'#674337',roughness:.72}),licorice=new T.MeshPhysicalMaterial({color:'#231c22',roughness:.3,clearcoat:.45}),icing=new T.MeshStandardMaterial({color:'#edd7a9',roughness:.6}),cookie=new T.MeshPhysicalMaterial({color:'#ad7543',roughness:.68});
 function m(geo,mat,x,y,z){const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;site.add(mesh);return mesh}
 m(new T.CylinderGeometry(9.5,9.7,.12,6),cocoa,0,.1,0);
 for(const z of [-7.5,7.5])for(let i=-4;i<=4;i++){if(z>0&&Math.abs(i)<2)continue;const x=i*1.8;m(new T.CylinderGeometry(.07,.09,1.4,7),licorice,x,.8,z);m(new T.ConeGeometry(.15,.3,6),icing,x,1.6,z)}
 for(const z of [-7.5,7.5]){m(new T.BoxGeometry(z<0?15:5,.09,.09),licorice,z<0?0:-5,1.1,z);if(z>0)m(new T.BoxGeometry(5,.09,.09),licorice,5,1.1,z)}
 for(let r=0;r<3;r++)for(let c=0;c<4;c++){const x=-5+c*3,z=-4+r*3;if(!original('AW-HW-GRAVE-001',-25+x,1.7,5+z,.7)){m(new T.BoxGeometry(.7,.75,.22),cookie,x,.55,z);m(new T.SphereGeometry(.35,10,8),cookie,x,.95,z).scale.z=.32;m(new T.BoxGeometry(.3,.06,.03),icing,x,.75,z+.13)}}
 original('AW-HW-CRYPT-001',-30,1.7,0,.9);original('AW-HW-MAUSOLEUM-001',-21,1.7,0,.8);original('AW-HW-GATE-001',-25,1.7,12.5,.9);
}
