import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from './vendor/three.module.js';
const source=(await readFile(new URL('./livestock-animation.mjs',import.meta.url),'utf8')).replace("'three'",JSON.stringify(new URL('./vendor/three.module.js',import.meta.url).href));
const {rigLivestock}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const species of ['horse','goat','chicken'])test(species+' authored parts articulate without changing shared geometry',async()=>{
 const parts=JSON.parse(await readFile(new URL('../simulation-assets/organics/'+species+'-idle.json',import.meta.url),'utf8')),wrapper=new T.Group(),model=new T.Group();wrapper.add(model);wrapper.scale.setScalar(species==='horse'?1:species==='goat'?.5:.35);
 for(const p of parts){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));model.add(new T.Mesh(g,new T.MeshBasicMaterial()));}
 model.updateMatrixWorld(true);const meshes=[...model.children],before=meshes.map(m=>m.localToWorld(new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,0))),arrays=meshes.map(m=>Array.from(m.geometry.attributes.position.array));
 const rig=rigLivestock(wrapper,species);wrapper.updateMatrixWorld(true);
 assert.equal(rig.legs.length,species==='chicken'?2:4);assert.ok(rig.legs.every(l=>l.children.length>=2));assert.ok(rig.head.children.length>=4);
 meshes.forEach((m,i)=>assert.ok(m.localToWorld(new T.Vector3().fromBufferAttribute(m.geometry.attributes.position,0)).distanceTo(before[i])<1e-6));
 rig.update(.13,.1,'Exploring');assert.ok(rig.legs.some(l=>Math.abs(l.rotation.z)>.01));
 for(let i=0;i<90;i++)rig.update(0,1/30,'Feeding');assert.ok(rig.head.rotation.z<-.9);assert.ok(rig.legs.every(l=>Math.abs(l.rotation.z)<.001));
 meshes.forEach((m,i)=>assert.deepEqual(Array.from(m.geometry.attributes.position.array),arrays[i]));
 const neck=rig.head.rotation.clone();rig.update(0,0,'Feeding');assert.ok(Math.abs(rig.head.rotation.z-neck.z)<1e-12);
});
