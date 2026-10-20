import test from 'node:test';import assert from 'node:assert/strict';
import {shapeTiles} from '../../ranch-shapes.mjs';
import {planAssembly} from '../../tile-adapter.js';
import {setLabHexDiameter} from '../../tile-metrics.js';
import {assemblyPhysics} from '../assembly.mjs';import {PROFILES,meshTriangles} from '../world.mjs';
import {compileTriangles} from '../collider.mjs';
import * as T from '../../vendor/three.module.js';
test('actual Ranch generator links cross physics volumes at multiple seeds/sizes/layouts',()=>{
 for(const size of [50,100,180])for(const seed of [41,214,801])for(const preset of ['pasture','working','flower']){
  setLabHexDiameter(size);const recipe={tiles:shapeTiles(preset,size,seed)},assembly=planAssembly(recipe,{connectionTree:true});assert.ok(assembly.links.length);
  for(const link of assembly.links){const a=assembly.plans.find(p=>p.id===link.a),b=assembly.plans.find(p=>p.id===link.b),dx=b.center.x-a.center.x,dz=b.center.z-a.center.z,len=Math.hypot(dx,dz),direction=[dx/len,0,dz/len];const w=assemblyPhysics({assembly,radiusMetres:size/2,profiles:{[a.id]:PROFILES.earth,[b.id]:PROFILES.moon}}),body=w.addBody({id:'traveller',position:[link.point.x-direction[0]*.01,10,link.point.z-direction[2]*.01],velocity:direction.map(v=>v*3)});assert.equal(body.tileId,a.id);w.advance(1/120);assert.equal(body.tileId,b.id);assert.equal(body.velocity[0],direction[0]*3);assert.equal(body.velocity[2],direction[2]*3);}
 }setLabHexDiameter(100);
});
test('mesh extraction preserves geometry and local metre calibration',()=>{
 const root=new T.Group();root.position.set(5,2,9);root.rotation.y=.7;const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,0,1],3));const mesh=new T.Mesh(geo);root.add(mesh);mesh.position.set(.1,0,.2);const before=Array.from(geo.attributes.position.array),out=meshTriangles(mesh,root,.1);assert.deepEqual(Array.from(geo.attributes.position.array),before);out[0].forEach((v,i)=>assert.ok(Math.abs(v-[1,0,2,11,0,2,1,0,12][i])<1e-10));
});
test('triangle broad phase never excludes an actual sphere contact',()=>{
 let n=42;const random=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/2**32);const triangles=Array.from({length:300},()=>Array.from({length:9},()=>random()*100-50)),index=compileTriangles(triangles);
 for(let j=0;j<100;j++){const p=[random()*100-50,random()*100-50,random()*100-50],r=random()*3,found=new Set(index.query(p,r));for(let i=0;i<triangles.length;i++){const a=triangles[i],tri=new T.Triangle(new T.Vector3(...a.slice(0,3)),new T.Vector3(...a.slice(3,6)),new T.Vector3(...a.slice(6,9)));if(tri.closestPointToPoint(new T.Vector3(...p),new T.Vector3()).distanceTo(new T.Vector3(...p))<=r)assert.ok(found.has(i));}}
});
