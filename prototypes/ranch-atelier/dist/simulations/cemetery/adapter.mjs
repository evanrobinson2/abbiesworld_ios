import {createCemeteryEvent} from './event.mjs';
import {makePerson,animatePerson} from '../town-life/people/models.mjs';
import * as T from 'three';
import {planCemetery} from './plan.mjs';
import {createRanchComposer} from '../ranch-composer.js';
let composerPromise;
export async function createCemeteryAdapter(seed,options={},saved){
 const plan=planCemetery(seed,options),group=new T.Group(),root=new T.Group();group.add(root);root.scale.setScalar(.1);root.rotation.y=plan.angle;
 const c=plan.condition,materials=new Map(),geometries=new Set();
 const color=(a,b)=>new T.Color(a).lerp(new T.Color(b),c);
 function material(key,a,b=a){if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:color(a,b),roughness:1}));return materials.get(key);}
 function box(parent,x,y,z,w,h,d,mat){const geometry=new T.BoxGeometry(w,h,d);geometries.add(geometry);const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const grass=material('grass','#91a570','#596548'),path=material('path','#d6c7a7','#85806c'),stone=material('stone','#b4b8ad','#717967'),earth=material('earth','#8c7962','#5b554a'),iron=material('iron','#555e57','#554a3f'),moss=material('moss','#77935a','#4a5c37');
 // Triangulated hex terrain, with a visible earthen cut edge.
 const vertices=[],indices=[],rings=18;
 for(let r=0;r<=rings;r++)for(let i=0;i<6;i++)for(let k=0;k<12;k++){const a=plan.boundary[i],b=plan.boundary[(i+1)%6],t=k/12,x=(a.x+(b.x-a.x)*t)*r/rings,z=(a.z+(b.z-a.z)*t)*r/rings;vertices.push(x,plan.heightAt(x,z),z);}
 for(let r=0;r<rings;r++)for(let i=0;i<72;i++){const a=r*72+i,b=r*72+(i+1)%72,c=a+72,d=b+72;indices.push(a,b,c,b,d,c);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();geometries.add(geo);const ground=new T.Mesh(geo,grass);ground.receiveShadow=true;root.add(ground);
 const edgeVertices=[];for(let i=0;i<6;i++){const a=plan.boundary[i],b=plan.boundary[(i+1)%6];for(let k=0;k<12;k++){const t=k/12,u=(k+1)/12,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,X=a.x+(b.x-a.x)*u,Z=a.z+(b.z-a.z)*u,y=plan.heightAt(x,z),Y=plan.heightAt(X,Z);edgeVertices.push(x,y,z,X,Y,Z,x,-.8,z,X,Y,Z,X,-.8,Z,x,-.8,z);}}
 const eg=new T.BufferGeometry();eg.setAttribute('position',new T.Float32BufferAttribute(edgeVertices,3));eg.computeVertexNormals();geometries.add(eg);const em=earth.clone();em.side=T.DoubleSide;materials.set('edge',em);root.add(new T.Mesh(eg,em));
 ground.userData.inspect={title:plan.name,kind:'Hex cemetery',description:'Paths shape burial clusters. Older graves grow outward into later infill.'};
 for(const p of plan.paths){const dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,len=Math.hypot(dx,dz);for(let t=0;t<len;t+=.45){const f=(t+.225)/len,x=p.a.x+dx*f,z=p.a.z+dz*f;const m=box(root,x,plan.heightAt(x,z)+.025,z,p.width,.045,.55,path);m.rotation.y=Math.atan2(dx,dz);}}
 for(let i=0;i<6;i++){const a=plan.boundary[i],b=plan.boundary[(i+1)%6],len=Math.hypot(b.x-a.x,b.z-a.z);for(let t=.6;t<len;t+=1.15){const f=t/len,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;if(z>16&&Math.abs(x)<2.1)continue;const m=box(root,x,plan.heightAt(x,z)+.24,z,.9,.45+.1*Math.sin(t+seed),.45,stone);m.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);}}
 for(const x of [-2,2])box(root,x,plan.heightAt(x,17)+.9,17,.6,1.8,.6,stone);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;const ctx=canvas.getContext('2d');ctx.fillStyle='#e8dfc7';ctx.font='bold 34px serif';ctx.textAlign='center';ctx.fillText('CEMETERY',256,52);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sg=new T.PlaneGeometry(3.8,.55);geometries.add(sg);const sm=new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide});const lettering=new T.Mesh(sg,sm);lettering.position.set(0,2.1+plan.heightAt(0,17),17.05);root.add(lettering);box(root,0,lettering.position.y,17,4.2,.6,.15,iron);
 const plotObjects=[];
 for(const p of plan.plots){const g=new T.Group();g.position.set(p.x,plan.heightAt(p.x,p.z),p.z);g.rotation.y=p.yaw;g.userData.inspect={title:`${p.occupied?'Grave':'Reserved plot'} ${p.rank+1}`,kind:p.occupied?'Occupied burial plot':'Empty burial plot',description:p.occupied?'Occupancy is controlled by Fullness. Condition changes weathering, not burial count.':'Reserved ground; contains no grave or headstone.'};g.userData.plotId=p.id;root.add(g);plotObjects.push(g);
 // Low, flush corner pegs distinguish reservations from actual graves.
 // Unoccupied ground stays meadow, without a visible reservation grid.
 if(p.occupied){box(g,0,.09,.1,1.4,.1,2.1,material('grave','#a3ad83','#67724f'));const head=new T.Group();head.position.set(0,.12,-.86);head.rotation.z=p.lean*c;g.add(head);
 box(head,0,.45,0,p.style===2?.76:.65,p.style===2?.9:.75,.22,stone);if(p.style===0){const geo=new T.CylinderGeometry(.325,.325,.22,12,1,false,0,Math.PI);geo.rotateX(Math.PI/2);geometries.add(geo);const cap=new T.Mesh(geo,stone);cap.position.y=.83;head.add(cap);}if(p.style===1){box(head,0,1.1,0,.18,.6,.22,stone);box(head,0,1.15,0,.65,.16,.22,stone);}
 for(let i=0;i<2;i++)box(head,0,.4+i*.16,.117,.33-i*.05,.028,.01,iron);
 if(c>.25&&p.wear<c)box(g,.35,.17,-.7,.5,.07,.4,moss);
 }
 if(c>.1){for(let i=0;i<Math.floor(c*(2+p.wear*5));i++){const t=box(g,Math.sin(i*23+p.rank)*.72,.12+c*.18,Math.cos(i*13+p.rank)*1.1,.07,.15+c*.34,.07,moss);t.rotation.z=Math.sin(i)*.3;}}
 }
 // Shared calibrated stock trees; no independent substitute tree recipe.
 const composer=await(composerPromise??=createRanchComposer());
 for(const [i,[x,z]] of plan.trees.entries()){const tree=await composer.model('tree-standing',{stage:'original'});tree.scale.multiplyScalar(10);tree.position.set(x,plan.heightAt(x,z),z);tree.rotation.z=(i%2?1:-1)*c*.08;tree.traverse(o=>{if(o.isMesh){const m=o.material.clone();m.userData={...m.userData,shared:false};m.color.lerp(new T.Color('#535e4e'),c*.6);o.material=m;materials.set(m.uuid,m);}});root.add(tree);}
 const event=createCemeteryEvent(plan,saved?.event,{linkedDeceased:options.linkedDeceased||[],extendGraph:options.extendGraph}),actors=new Map();
 function present(dt=0){for(const [id,body] of actors)if(!event.world.actors[id]){root.remove(body);actors.delete(id);}for(const a of Object.values(event.world.actors)){let body=actors.get(a.id);if(!body){const person={index:actors.size,role:'resident',appearance:{build:1,height:1.75,skin:'#8d9c7d',hair:'#4c5045',hairStyle:actors.size%3},wardrobe:{top:['#786a5a','#665b65','#52665e'][actors.size%3],bottom:'#424b43',hat:'none',accessory:'none'}};body=makePerson(person);body.userData.inspect={title:a.name,kind:'Zombie · '+(a.identity.provenance==='generated-fictional'?'fictional identity':'recorded deceased'),description:'Raised from '+a.sourceGraveId+'. Hungry for brains. No living targets in this isolated cemetery.'};root.add(body);actors.set(a.id,body);}const dx=a.position.x-body.position.x,dz=a.position.z-body.position.z;animatePerson(body,{phase:'idle'},Math.hypot(dx,dz),dt);if(Math.hypot(dx,dz)>.001)body.rotation.y=Math.atan2(dx,dz);const rise=Math.min(1,(event.state.elapsed-a.raisedAt)/1.5);body.position.set(a.position.x,plan.heightAt(a.position.x,a.position.z)-1.65*(1-rise),a.position.z);body.userData.activity=rise<1?'Rising from grave':'Hungry for brains · '+a.intent;body.userData.liveReadout=()=>a.identity.provenance+' · '+a.sourceGraveId+' · '+a.metres.toFixed(1)+' m travelled';}}
 present();
 let state={seconds:0,pens:[],weather:'clear',...saved,fullness:plan.fullness,condition:c};
 const life={get state(){return state;},workers:[],places:plan.plots,update(dt){state.seconds+=dt;event.update(dt);present(dt);},snapshot:()=>({...structuredClone(state),event:event.snapshot()}),restore(s){state={...state,seconds:Number(s?.seconds)||0};},summary:()=>({occupied:plan.occupied,capacity:plan.capacity,animals:0}),navigation:()=>({paths:plan.paths.length,workers:[],animals:0}),notices:()=>[],dispose(){},describePlace:()=>'',get readout(){return `${plan.occupied} / ${plan.capacity} occupied plots · ${Math.round(c*100)}% decrepit`;}};
 return {group,plan,life,event,raise(fraction){const result=event.raise(fraction);present();return result;},resetEvent(){event.reset();present();},recipe:{name:plan.name,seed,tiles:[]},heightAt:()=>0,assembly:{plans:[{id:'cemetery',center:{x:0,z:0},placements:[],paths:plan.paths,plantedAssets:['tree-standing']}]},tileObjects:[],fitBounds:new T.Box3().setFromObject(group),dispose(){for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();texture.dispose();sm.dispose();}};
}
