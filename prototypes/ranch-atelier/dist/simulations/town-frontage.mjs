import * as T from 'three';
import {domesticAsset} from './domestic-assets.js';
const colors={home:'#ead7b2','coffee-shop':'#ebc68b',bakery:'#e7b29d',bookshop:'#9db9b3',florist:'#c6c393',grocer:'#b5c597','town-hall':'#e4d9bf','produce-market':'#d9be91','bicycle-workshop':'#8eaaa5',greenhouse:'#9cbcaf','seed-library':'#dcc38e','post-office':'#d99b80','art-studio':'#a3b9c9',boathouse:'#91b8c3','community-kitchen':'#dca87f'};
export async function townFrontage(group,b,index,materials){
 const {wood,cream}=materials;
 const material=c=>new T.MeshStandardMaterial({color:c,roughness:.8});
 const wall=material(colors[b.kind]||'#d9c5a1'),trim=material('#f9edce'),glass=material('#517c82'),roof=material('#687e78');
 const mesh=(w,h,d,x,y,z,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
 const civic=['town-hall','post-office','seed-library','bookshop'].includes(b.kind),upper=civic||b.kind==='home'&&index%3===0,h=upper?5.8:3.6;
 // Keep the stock courtyard structure; add a clear façade and differentiated upper mass.
 mesh(5.6,h,.32,0,h/2,2.35,wall);if(upper)mesh(5.6,2.6,4.6,0,4.3,0,wall);
 // Close the full volume up to the eaves, including views from the street behind it.
 mesh(5.6,h,.28,0,h/2,-2.3,wall);
 for(const side of [-1,1]){
  mesh(.28,h,4.65,side*2.7,h/2,0,wall);
  for(const y of upper?[1.7,4.5]:[1.7]){
   mesh(.12,1.5,1.4,side*2.88,y,-.4,trim);mesh(.14,1.23,1.13,side*2.95,y,-.4,glass);
  }
 }
 for(const x of [-2.7,2.7])mesh(.15,h+.12,.2,x,h/2,2.57,trim);
 mesh(5.8,.18,.3,0,h-.1,2.55,trim);
 mesh(1,2,.16,0,1.05,2.6,wood);mesh(.12,.12,.1,.3,1,2.72,cream);
 for(const x of [-1.75,1.75]){mesh(1.6,1.55,.18,x,1.65,2.58,trim);mesh(1.33,1.28,.12,x,1.65,2.7,glass);mesh(.08,1.3,.08,x,1.65,2.79,trim);mesh(1.4,.08,.08,x,1.65,2.79,trim);if(upper){mesh(1.4,1.35,.15,x,4.5,2.52,trim);mesh(1.17,1.12,.1,x,4.5,2.63,glass);}}
 const pitched=await domesticAsset('roof',{roofShape:'gable',roofColor:b.kind==='coffee-shop'?'#447e79':['#a66e59','#657f79','#7d8e9b','#ac8459'][index%4]});pitched.position.y=h;pitched.scale.set(6.35,upper?1.9:1.5,5.5);group.add(pitched);
 mesh(.65,2,.65,-1.8,h+.3,-1.1,wood);
 // Constructed thresholds and window gardens give each frontage a lived-in edge.
 mesh(1.5,.18,.7,0,.09,2.85,trim);
 for(const x of [-1.75,1.75]){
  mesh(1.65,.24,.48,x,.86,2.85,wood);
  for(let j=0;j<5;j++){const leaf=new T.Mesh(new T.IcosahedronGeometry(.23,0),material(['#65814f','#78935e','#536f49'][j%3]));leaf.position.set(x-.6+j*.3,1.07,2.89);group.add(leaf);if(j%2===0){const flower=new T.Mesh(new T.IcosahedronGeometry(.1,0),material(index%2?'#d6a265':'#b98486'));flower.position.set(x-.6+j*.3,1.26,2.94);group.add(flower);}}
  for(const dx of [-.96,.96]){mesh(.26,1.55,.12,x+dx,1.65,2.66,roof);for(let y=1.1;y<2.3;y+=.24)mesh(.29,.04,.04,x+dx,y,2.74,trim);}
 }
 for(const side of [-1,1]){mesh(.12,.12,5.3,side*3.03,h-.08,0,wood);mesh(.09,h,.1,side*2.82,h/2,-2.48,roof);}
 if(upper){mesh(5.8,.15,.2,0,3.3,2.59,trim);for(const x of [-1.75,1.75]){mesh(1.5,.1,.35,x,3.8,2.68,trim);mesh(.07,1.15,.08,x,4.5,2.72,trim);}}
 if(b.kind==='town-hall'){
  mesh(1.5,2,1.5,0,h+1.9,0,wall);const cap=await domesticAsset('roof',{roofShape:'gable',roofColor:'#527b7a'});cap.position.y=h+2.9;cap.scale.set(2,1,2);group.add(cap);
  const clock=new T.Mesh(new T.CircleGeometry(.48,20),cream);clock.position.set(0,h+2,.77);group.add(clock);mesh(.06,.32,.05,0,h+2.12,.8,wood);mesh(.25,.06,.05,.1,h+2,.8,wood);
 }
 if(b.kind==='greenhouse'){for(let i=0;i<5;i++){mesh(.12,3.1,.18,-2.4+i*1.2,1.7,2.8,trim);}mesh(5.4,2.6,.12,0,1.7,2.69,glass);}
 if(b.kind!=='home'){
  // Striped fabric and display counter make commerce legible without tiny text labels.
  for(let i=0;i<7;i++)mesh(.7,.16,1.35,-2.1+i*.7,2.6,3.05,i%2?trim:(b.kind==='bakery'?material('#b56862'):roof));
  for(const x of [-2.42,2.42]){mesh(.09,2.6,.09,x,1.3,3.6,wood);mesh(.12,.32,.09,x,2.45,3.6,cream);}
  mesh(4.5,.75,.15,0,3.15,2.62,roof);
  if(['bakery','produce-market','grocer','florist','coffee-shop'].includes(b.kind)){const tray=await domesticAsset(b.kind==='bakery'?'BA-0043':b.kind==='florist'?'GF-014':'GF-025');tray.position.set(-1.8,.6,3.15);tray.scale.setScalar(.75);group.add(tray);}
 }
 return h;
}
