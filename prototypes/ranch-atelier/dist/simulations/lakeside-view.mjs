import {townFrontage} from './town-frontage.mjs';
import {makePerson} from './town-life/people/models.mjs';
import * as T from 'three';
import {domesticAsset} from './domestic-assets.js';
import {lakeRadius} from './lakeside-plan.mjs';
const S=.1;
export function townGroundPaths(assembly,plan,diameter){for(const tile of assembly.plans){tile.paths=tile.paths.filter(p=>!p.lakeside);for(const p of plan.paths){if(!p.points.some(([x,z])=>Math.abs(x-tile.center.x)<diameter*.9&&Math.abs(z-tile.center.z)<diameter*.9))continue;tile.paths.push({kind:'lakeside',lakeside:true,width:p.width,points:p.points.map(([x,z])=>({x:x-tile.center.x,z:z-tile.center.z}))});} }
}
export async function drawLakeside(plan,heightAt){
 const root=new T.Group();root.name='Lakeside town';const {k,lake,square}=plan;
 const mat=(c)=>new T.MeshStandardMaterial({color:c,roughness:.86});
 const stone=mat('#c1bca4'),wood=mat('#80664d'),teal=mat('#527e78'),cream=mat('#f0dba6');
 function box(x,y,z,w,h,d,m){const o=new T.Mesh(new T.BoxGeometry(w*S,h*S,d*S),m);o.position.set(x*S,y*S,z*S);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 const waterShape=new T.Shape();for(let i=0;i<=128;i++){const a=i*Math.PI*2/128,r=lakeRadius(a)*1.018,x=(lake.x+Math.cos(a)*lake.rx*r)*S,z=(lake.z+Math.sin(a)*lake.rz*r)*S;i?waterShape.lineTo(x,-z):waterShape.moveTo(x,-z);}
 const water=new T.Mesh(new T.ShapeGeometry(waterShape),new T.MeshStandardMaterial({color:'#538f9e',roughness:.3,metalness:.12}));water.rotation.x=-Math.PI/2;water.position.y=lake.waterLevel*S;water.receiveShadow=true;water.userData.inspect={title:'Lake',kind:'Water',description:'A sheltered lake beside the town. Water is not a walking route.'};root.add(water);
 // Open irregular common, with rounded boundary and no central obstruction.
 const squareShape=new T.Shape(),verts=[[-16,-11],[-8,-17],[10,-15],[17,-6],[16,10],[4,16],[-13,12],[-18,2]];verts.forEach(([x,z],i)=>{x=(square.x+x*k)*S;z=(square.z+z*k)*S;i?squareShape.lineTo(x,-z):squareShape.moveTo(x,-z)});squareShape.closePath();const sg=new T.ShapeGeometry(squareShape);sg.rotateX(-Math.PI/2);const pa=sg.attributes.position;for(let i=0;i<pa.count;i++)pa.setY(i,heightAt(pa.getX(i)/S,pa.getZ(i)/S)*S+.012);sg.computeVertexNormals();const common=new T.Mesh(sg,stone);common.receiveShadow=true;root.add(common);
 const roofColors=['#95604e','#527568','#b58b59','#6b7881','#8f6a57'];
 for(const [i,b]of plan.buildings.entries()){
  const group=new T.Group();group.position.set(b.x*S,heightAt(b.x,b.z)*S,b.z*S);group.rotation.y=b.angle;group.scale.setScalar(S*k);
  const model=await domesticAsset('GF-191');group.add(model);
  await townFrontage(group,b,i,{wood,cream});
  group.userData.coffeeShop=b.id==='coffee-shop';group.userData.inspect={title:b.kind==='home'?'Town house':b.kind.replaceAll('-',' '),kind:'Lakeside town',description:b.id==='coffee-shop'?'Coffee shop on Main Street Square. Tap to enter the guided coffee station.':'Street frontage from the existing town-growth generator.'};root.add(group);
  if(b.kind!=='home'){
   // Physical cup emblem identifies the reserved café frontage at overview scale.
   if(b.id==='coffee-shop'){const cup=new T.Mesh(new T.CylinderGeometry(.35,.25,.5,12),cream);cup.rotation.x=Math.PI/2;cup.position.set(0,3.15,2.93);group.add(cup);}
  }
 }
 for(const [x,z]of plan.trees){const tree=await domesticAsset('WW-001');tree.scale.setScalar(S*k*1.6);tree.position.set(x*S,heightAt(x,z)*S,z*S);root.add(tree);}
 // A shore landing is scenery; it does not advertise a route across the lake.
 const dx=176*k,dz=113*k;box(dx,3.5*k,dz,15*k,.35*k,4*k,wood);for(const x of [170,181])for(const z of [111.5,114.5])box(x*k,2.3*k,z*k,.3*k,2.4*k,.3*k,wood);
 const boat=await domesticAsset('CE-006');boat.scale.setScalar(S*k*1.5);boat.position.set(168*k*S,(lake.waterLevel-.2*k)*S,119*k*S);boat.rotation.y=Math.PI/2;boat.userData.inspect={title:'Moored rowing boat',kind:'Lake scenery',description:'Static boat beside the shore landing; not a transport action.'};root.add(boat);
 const prop=async(id,x,z,size=1,a=0,y=0)=>{const o=await domesticAsset(id);o.scale.setScalar(S*k*size);o.position.set(x*k*S,(heightAt(x*k,z*k)+y*k)*S,z*k*S);o.rotation.y=a;root.add(o);return o;};
 // The square's south terrace and north market pockets leave the through street open.
 for(const [x,z]of [[211,28],[235,29]]){await prop('GF-017',x,z,1.35);await prop('BA-0012',x,z+2.5,1.5);await prop('GF-025',x-2,z+2,1.3);await prop('BA-0043',x,z+2.5,1.4,0,.85);}
 for(const [x,z]of [[211,49],[236,49]]){await prop('BA-0012',x,z,1.7);await prop('GF-194',x,z+2,1.6);await prop('GF-194',x,z-2,1.6,Math.PI);await prop('BA-0024',x,z,.8,0,1);}
 const fountain=new T.Group();fountain.position.set(plan.fountain.x*S,heightAt(plan.fountain.x,plan.fountain.z)*S,plan.fountain.z*S);root.add(fountain);
 const bowl=new T.Mesh(new T.CylinderGeometry(2.5*k*S,2.8*k*S,.7*k*S,16),stone);bowl.position.y=.35*k*S;fountain.add(bowl);
 const pool=new T.Mesh(new T.CylinderGeometry(2.2*k*S,2.2*k*S,.08*k*S,24),teal);pool.position.y=.72*k*S;fountain.add(pool);
 const pedestal=new T.Mesh(new T.CylinderGeometry(.4*k*S,.7*k*S,1.7*k*S,12),cream);pedestal.position.y=1*k*S;fountain.add(pedestal);
 for(const [x,z]of [[207,53],[239,54],[205,23],[239,23]])await prop('GF-014',x,z,1.5);
 for(const [i,[x,z]]of [[211,30],[235,31],[209,49],[237,49],[223,23],[225,24],[218,48],[219,49]].entries()){
  const person=makePerson({appearance:{height:1.85,build:1.1,skin:['#d4a17d','#986846','#e5bd99'][i%3],hair:'#514333',hairStyle:i%3},wardrobe:{top:['#a95e4e','#648e8d','#d1ab5d','#87976b'][i%4],bottom:'#536570',hat:'none',accessory:'none'}});
  person.scale.multiplyScalar(S*k*1.35);person.position.set(x*k*S,heightAt(x*k,z*k)*S,z*k*S);person.rotation.y=i*.8;person.userData.inspect={title:i<2?'Market vendor':'Town visitor',kind:'Scenic figure',description:'Static scenic figure; town jobs are not simulated.'};person.traverse(o=>{if(o.isMesh){o.userData.sharedGeometry=true;o.material.userData.shared=true;}});root.add(person);
 }
 return {root,report:{version:plan.version,generator:plan.generator,buildings:plan.buildings.length,uses:plan.buildings.reduce((a,b)=>(a[b.kind]=(a[b.kind]||0)+1,a),{}),neighbourhoods:4,paths:plan.paths.length,lake:plan.lake,square:plan.square,coffeeShop:plan.coffeeShop,simulation:plan.simulation}};
}
