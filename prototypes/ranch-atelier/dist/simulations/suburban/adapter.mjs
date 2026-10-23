import * as T from 'three';
import {createCemeteryAdapter} from '../cemetery/adapter.mjs';
import {createRanchComposer} from '../ranch-composer.js';
import {makePerson,animatePerson} from '../town-life/people/models.mjs';
import {planSuburb,extendSuburbGraph} from './plan.mjs';
import {createHalloweenRuntime} from './runtime.mjs';
let composerPromise;
export async function createSuburbanAdapter(seed,options={},saved){
 const plan=planSuburb(seed),cemetery=await createCemeteryAdapter(seed,{fullness:.5,condition:.65,extendGraph:g=>extendSuburbGraph(g,plan)},{event:saved?.cemetery});
 const group=cemetery.group,root=group.children[0],owned=[],materials=new Map(),composer=await(composerPromise??=createRanchComposer());
 root.add(new T.HemisphereLight('#b0bed7','#403c30',.8));
 const sim=createHalloweenRuntime(plan,cemetery.event,saved);
 const mat=(color,glow=false)=>{const key=color+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.85,...(glow?{emissive:color,emissiveIntensity:1.4}:{})}));return materials.get(key);};
 function mesh(parent,geo,color,pos,glow=false){owned.push(geo);const o=new T.Mesh(geo,mat(color,glow));o.position.set(...pos);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const box=(g,x,y,z,w,h,d,c,glow=false)=>mesh(g,new T.BoxGeometry(w,h,d),c,[x,y,z],glow);
 // Four contiguous flat-topped hexes, each 80.83 m corner-to-corner.
 for(const tile of plan.tiles){const ground=mesh(root,new T.CylinderGeometry(40.4145,40.4145,.7,6),tile.id==='hex0'?'#65714f':'#7d8c60',[0,-.42,tile.z]);ground.rotation.y=Math.PI/6;ground.userData.inspect={title:tile.label,kind:'Connected neighborhood hex',description:'Normal metre scale; fictional connecting suburbia.'};}
 for(const r of plan.roads){const dx=r.b.x-r.a.x,dz=r.b.z-r.a.z;const road=box(root,(r.a.x+r.b.x)/2,r.width>3?.02:.08,(r.a.z+r.b.z)/2,r.width,.08,Math.hypot(dx,dz),r.width>3?'#626363':'#c9bca0');road.rotation.y=Math.atan2(dx,dz);}
 mesh(root,new T.CylinderGeometry(11,11,.1,48),'#626363',[0,.03,210]);
 for(const h of plan.homes){const g=new T.Group();g.position.set(h.x,0,h.z);g.rotation.y=h.angle;root.add(g);g.userData.inspect={title:h.id==='home0'?'Garden-side refuge':'Porch '+(Number(h.id.slice(4))+1),kind:'Reference-inspired suburban home',description:'Clapboard, white trim and garden details inspired by public Sherman Place photos; dimensions and plot arrangement are generated.'};
 box(g,0,.25,0,h.width+.35,.5,h.depth+.35,'#aaa49a');box(g,0,h.height/2+.5,0,h.width,h.height,h.depth,h.color);
 // Pitched roof geometry with white fascia. Horizontal courses retain brick-built clarity.
 const w=h.width/2+.45,d=h.depth/2+.45,y=h.height+.5,rise=2.5;
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-w,y,-d,w,y,-d,0,y+rise,-d,-w,y,d,0,y+rise,d,w,y,d,-w,y,-d,0,y+rise,-d,-w,y,d,0,y+rise,-d,0,y+rise,d,-w,y,d,w,y,-d,w,y,d,0,y+rise,-d,0,y+rise,-d,w,y,d,0,y+rise,d],3));geo.computeVertexNormals();mesh(g,geo,'#495054',[0,0,0]).material.side=T.DoubleSide;
 for(let yy=.7;yy<y;yy+=.4)for(const side of [-1,1])box(g,0,yy,side*(h.depth/2+.015),h.width,.035,.035,'#89968a');
 for(const x of [-h.width/2,h.width/2])for(const z of [-h.depth/2,h.depth/2])box(g,x,y/2,z,.16,y,.16,'#f0e9d8');
 for(const side of [-1,1])for(const x of [-h.width*.28,h.width*.28])for(const yy of [2.1,5.1]){box(g,x,yy,side*(h.depth/2+.04),1.55,1.8,.12,'#eee8d8');box(g,x,yy,side*(h.depth/2+.12),1.25,1.5,.06,'#edc58a',true);box(g,x,yy,side*(h.depth/2+.16),.06,1.5,.04,'#fff3da');box(g,x,yy,side*(h.depth/2+.16),1.25,.06,.04,'#fff3da');}
 box(g,0,1.4,h.depth/2+.1,1.25,2.3,.2,'#a34e3d');box(g,0,.25,h.depth/2+1.2,3,.5,2.4,'#b6b0a1');box(g,0,3,h.depth/2+1,3.3,.18,2.6,'#e3ddce');for(const x of [-1.4,1.4])box(g,x,1.6,h.depth/2+2,.14,2.7,.14,'#f6ead9');
 const porch=new T.PointLight('#ffbd72',.32,1.2,2);porch.position.set(0,2.5,h.depth/2+1.8);g.add(porch);
 for(const side of [-1,1]){const pumpkin=mesh(g,new T.SphereGeometry(.32,10,8),'#d97431',[side*.8,.55,h.depth/2+2]);pumpkin.scale.y=.8;box(g,side*.8,.86,h.depth/2+2,.08,.14,.08,'#61553b');}
 if(Number(h.id.slice(4))%3===0){const gx=-h.width/2-2;box(g,gx,1.5,0,4,3,6,h.color);box(g,gx,3.12,0,4.4,.24,6.4,'#495054');box(g,gx,1.25,3.04,2.8,2.4,.12,'#e3dfd0');for(let i=0;i<5;i++)box(g,gx,.45+i*.42,3.12,2.7,.025,.03,'#aba99c');box(g,gx,.03,5.3,3.7,.08,4.5,'#878985');}
 if(h.deck){box(g,0,.8,-h.depth/2-1.7,4,.22,3.4,'#d2c9af');for(const x of [-1.9,1.9]){box(g,x,1.4,-h.depth/2-3,.1,1.2,.1,'#efe7d4');box(g,x,1.9,-h.depth/2-1.8,.1,.1,2.6,'#efe7d4');}}
 if(h.id==='home0'){for(const x of [-2,2])for(const z of [-2,2])box(g,h.width/2+5+x,1.5,z,.17,3,.17,'#eee8d8');for(let i=-2;i<=2;i++)box(g,h.width/2+5,3,i,4.7,.18,.18,'#eee8d8');}
 const tree=await composer.model('tree-standing',{stage:'original'});tree.scale.multiplyScalar(10);tree.position.set(h.x+(h.x<0?-8:8),0,h.z-8);root.add(tree);
 }
 const cache=box(root,plan.nodes[plan.supply].x+1,.5,plan.nodes[plan.supply].z,1,.9,.7,'#61998f');cache.userData.inspect={title:'Neighborhood supply cache',kind:'Finite supplies',description:'Two batteries and one diversion signal; collect once by reaching this porch.'};
 const people=['Kit','Milo','June'].map((name,i)=>{const person={index:i,role:'student',appearance:{build:1,height:i===2?1.7:1.35,skin:['#d6a87c','#986b4d','#ddb694'][i],hair:'#40372e',hairStyle:i},wardrobe:{top:['#db8b39','#8678ac','#598d89'][i],bottom:'#41475a',hat:i===0?'cap':'none',accessory:'bag'}};const body=makePerson(person);body.userData.inspect={title:name,kind:'Fictional Halloween party',description:'Shared inventory and resolve. Stylized encounters; no injuries simulated.'};root.add(body);return {body,person,name,get phase(){return sim.state.route.length?'walking':'waiting';}};});
 const ring=mesh(root,new T.TorusGeometry(1.5,.07,6,32),'#f5d179',[0,.12,0],true);ring.rotation.x=Math.PI/2;
 const lantern=new T.PointLight('#ffe7a0',.2,1.3,2);root.add(lantern);
 function present(dt){const s=sim.state;lantern.position.set(s.position.x,1.8,s.position.z);lantern.intensity=.2*s.light/100;cache.visible=!s.supplyTaken;people.forEach((p,i)=>{const prev=p.body.position.clone();p.body.position.set(s.position.x+(i-1)*.65,0,s.position.z+i*.5);animatePerson(p.body,{phase:s.route.length?'walking':'idle'},prev.distanceTo(p.body.position),dt);p.body.userData.activity=s.choice?'Choosing next move':s.route.length?'Walking connected path':'At porch';});ring.position.set(s.position.x,.12,s.position.z);cemetery.life.update(0);}
 present(0);
 const life={get state(){return sim.state;},workers:people,places:plan.homes,update(dt){sim.update(dt);present(dt);},snapshot:()=>sim.snapshot(),restore:s=>{sim.restore(s);present(0);},summary:()=>({animals:0,candy:sim.state.candy,raised:cemetery.event.state.raised.length}),navigation:()=>({connectedNodes:Object.keys(cemetery.event.graph.nodes).length,workers:people.map(p=>p.body.position.toArray())}),notices:()=>[],describePlace:()=>'',dispose(){}};
 return {group,life,sim,plan,event:cemetery.event,recipe:{name:'Sherman-inspired Halloween',seed,tiles:[]},assembly:{plans:plan.tiles.map(t=>({id:t.id,center:{x:t.x,z:t.z},placements:[],paths:[],plantedAssets:[]}))},tileObjects:[],heightAt:()=>0,solarCenter:new T.Vector3(0,0,12),solarExtent:35,fitBounds:new T.Box3().setFromObject(group),focusPoint(id='party'){group.updateMatrixWorld(true);const p=id==='party'?sim.state.position:id==='cemetery'?{x:0,z:0}:id==='horde'?(Object.values(cemetery.event.world.actors)[0]?.position||{x:0,z:0}):plan.nodes[id];return root.localToWorld(new T.Vector3(p.x,0,p.z));},dispose(){cemetery.dispose();for(const g of owned)g.dispose();for(const m of materials.values())m.dispose();}};
}
