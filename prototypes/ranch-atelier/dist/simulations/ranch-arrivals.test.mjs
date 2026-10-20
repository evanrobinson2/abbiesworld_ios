import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from './vendor/three.module.js';
const pageSource=(await readFile(new URL('./storybook-arrival.mjs',import.meta.url),'utf8')).replace("'three'",JSON.stringify(new URL('./vendor/three.module.js',import.meta.url).href));
const pageURL='data:text/javascript;base64,'+Buffer.from(pageSource).toString('base64');
const source=(await readFile(new URL('./ranch-arrivals.mjs',import.meta.url),'utf8')).replace("'./storybook-arrival.mjs'",JSON.stringify(pageURL)).replace("'./arrival-settings.mjs?page=2'",JSON.stringify(new URL('./arrival-settings.mjs',import.meta.url).href)).replace("'three'",JSON.stringify(new URL('./vendor/three.module.js',import.meta.url).href));
const {createArrival,ARRIVALS}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const [mode]of ARRIVALS)test(mode+' restores exact scene state on completion and interruption',()=>{
 const group=new T.Group(),parent=new T.Group();parent.scale.setScalar(.1);parent.position.set(2,0,3);group.add(parent);
 const material=new T.MeshStandardMaterial({color:'red'}),mesh=new T.Mesh(new T.BoxGeometry(2,3,4),material);mesh.position.set(4,2,-7);mesh.rotation.set(.1,.3,.2);mesh.scale.set(2,1,.5);mesh.castShadow=true;parent.add(mesh);
 const p=mesh.position.clone(),q=mesh.quaternion.clone(),s=mesh.scale.clone();
 for(const cancel of [false,true]){const arrival=createArrival(group,mode);arrival.update(.4);if(cancel)arrival.finish();else for(let i=0;i<120;i++)arrival.update(.05);assert.equal(arrival.done,true);assert.ok(mesh.position.equals(p));assert.ok(mesh.scale.equals(s));assert.ok(mesh.quaternion.equals(q));assert.equal(mesh.material,material);assert.equal(mesh.castShadow,true);assert.equal(group.children.length,1);arrival.finish();}
 const reduced=createArrival(group,mode,{reducedMotion:true});assert.ok(mesh.position.equals(p));reduced.update(.4);assert.equal(reduced.done,true);
});
test('arrival duration uses elapsed seconds across slow and fast frames',()=>{
 const make=()=>{const group=new T.Group();group.add(new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()));return group};
 const a=createArrival(make(),'hologram',{parameters:{duration:8}}),b=createArrival(make(),'hologram',{parameters:{duration:8}});
 a.update(4);for(let i=0;i<80;i++)b.update(.05);assert.ok(Math.abs(a.progress-b.progress)<1e-10);assert.equal(a.done,false);a.update(4);b.update(4);assert.equal(a.done,true);assert.equal(b.done,true);
});
test('all modes honor custom duration and settle before simulation resumes',()=>{
 for(const [mode]of ARRIVALS){const group=new T.Group(),material=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),material);group.add(mesh);const a=createArrival(group,mode,{parameters:{duration:10}});a.update(9.5);assert.equal(a.done,false);assert.equal(mesh.material,material);a.update(.5);assert.equal(a.done,true);}
});
test('storybook turns one page with the actual ranch hidden behind it, then restores it',()=>{
 const group=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(6,2,5),new T.MeshStandardMaterial());mesh.position.set(2,1,3);group.add(mesh);const position=mesh.position.clone(),parent=mesh.parent;
 const a=createArrival(group,'storybook',{parameters:{duration:6,curl:.8,pop:.5}});const hinge=group.getObjectByName('Storybook turning page');assert.ok(hinge);assert.equal(mesh.parent.visible,false);assert.ok(Math.abs(hinge.rotation.z-Math.PI)<1e-8);
 a.update(3);assert.equal(mesh.parent.visible,true);assert.ok(hinge.rotation.z>0&&hinge.rotation.z<Math.PI/2);assert.ok(mesh.parent.scale.y<1);const page=group.getObjectByName('Ivory storybook leaf');assert.ok(Array.from(page.geometry.attributes.position.array).some((v,i)=>i%3===1&&v>.01));
 a.finish();assert.equal(mesh.parent,parent);assert.ok(mesh.position.equals(position));assert.equal(group.children.length,1);
});
