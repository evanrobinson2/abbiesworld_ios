import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicsWorld,PROFILES,frame,worldPoint,localPoint,worldVelocity,localVelocity} from '../world.mjs';
const volume=(x0=-50,x1=50)=>({polygon:[[x0,-50],[x1,-50],[x1,50],[x0,50]],minY:-100,maxY:100});
const ground=[[-50,0,-50,50,0,50,50,0,-50],[-50,0,-50,-50,0,50,50,0,50]];
const close=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const run=(w,t)=>{for(let i=0;i<Math.round(t*120);i++)w.advance(1/120);};
test('Earth and Moon change acceleration, crossing never rescales world velocity',()=>{
 const w=new PhysicsWorld();w.addTile({id:'earth',volume:volume(-50,0)});w.addTile({id:'moon',volume:volume(0,50),profile:PROFILES.moon});
 const b=w.addBody({id:'traveller',position:[-.01,20,0],velocity:[2,0,0]});w.drainEvents();w.advance(1/120);assert.equal(b.tileId,'moon');close(b.velocity[0],2);const vy=b.velocity[1];w.advance(1/120);close(b.velocity[1]-vy,-1.62/120);assert.equal(w.drainEvents().filter(e=>e.type==='boundary').length,1);
});
test('moving-frame position and velocity round trip, including angular motion',()=>{
 const f=frame({position:[3,4,5],rotation:[0,Math.sin(.4),0,Math.cos(.4)],velocity:[1,2,3],angularVelocity:[0,2,0]}),p=[2,1,-3],v=[4,-1,2],wp=worldPoint(f,p),wv=worldVelocity(f,p,v);localPoint(f,wp).forEach((a,i)=>close(a,p[i]));localVelocity(f,wp,wv).forEach((a,i)=>close(a,v[i]));
});
test('gravity can explicitly follow tile orientation while world gravity does not',()=>{
 for(const gravityFrame of ['world','tile']){const w=new PhysicsWorld();w.addTile({id:'a',volume:volume(),profile:{gravity:[0,-10,0],gravityFrame},frame:{rotation:[0,0,Math.SQRT1_2,Math.SQRT1_2]}});const b=w.addBody({id:'b',position:[0,10,0]});w.advance(1/120);close(b.velocity[gravityFrame==='world'?1:0],(gravityFrame==='world'?-10:10)/120);}
});
test('real floor triangles settle a falling sphere without hidden edge clamps',()=>{
 const w=new PhysicsWorld();w.addTile({id:'a',volume:volume(),triangles:ground});const b=w.addBody({id:'b',position:[0,4,0],velocity:[2,0,0]});run(w,4);close(b.position[1],b.radius,1e-5);assert.equal(b.settled,true);assert.ok(w.drainEvents().some(e=>e.type==='settled'));const outside=w.addBody({id:'outside',position:[60,4,0]});run(w,1);assert.ok(outside.position[1]<0);assert.equal(outside.tileId,null);
});
test('visible wall triangle contact stops fast motion within supported step budget',()=>{
 const w=new PhysicsWorld({outside:{gravity:[0,0,0]}});w.addTile({id:'a',volume:volume(),profile:{gravity:[0,0,0]},triangles:[[0,-10,-10,0,10,-10,0,10,10],[0,-10,-10,0,10,10,0,-10,10]]});const b=w.addBody({id:'b',position:[-2,0,0],velocity:[100,0,0]});run(w,.1);assert.ok(b.position[0]<-.29);assert.ok(b.velocity[0]<=0);
});
test('anchored structure follows held tile and detachment inherits surface velocity',()=>{
 const w=new PhysicsWorld();w.addTile({id:'a',volume:volume(),frame:{velocity:[2,0,0],angularVelocity:[0,1,0]}});const b=w.addBody({id:'anchor',position:[1,0,0],attachment:{tileId:'a',localPosition:[1,0,0]}});run(w,.5);const f=w.tiles.get('a').frame;worldPoint(f,[1,0,0]).forEach((a,i)=>close(a,b.position[i]));const v=[...b.velocity];w.detachBody(b.id);v.forEach((a,i)=>close(a,b.velocity[i]));assert.equal(b.attachment,null);
});
test('disconnect and reconnect preserve identity, cargo and world position/velocity',()=>{
 const w=new PhysicsWorld();w.addTile({id:'a',volume:volume()});const b=w.addBody({id:'slot',storyId:'individual-717',position:[1,2,3],velocity:[4,5,6],metadata:{cargo:{feed:3},reservation:'job-9'}}),before=structuredClone(b);w.setConnected('a',false);w.membership(b);assert.equal(b.tileId,'a');w.setConnected('a',true);w.membership(b);assert.deepEqual(b,before);
});
test('snapshot restores physical state and events exactly, supports cancel/Undo and deterministic continuation',()=>{
 const w=new PhysicsWorld();w.addTile({id:'a',volume:volume(),triangles:ground});w.addBody({id:'b',storyId:'person-1',position:[0,5,0]});w.advance(.013);const saved=w.snapshot();run(w,.5);const later=w.snapshot();w.setFrame('a',{position:[10,3,0]});w.restore(saved);assert.deepEqual(w.snapshot(),saved);run(w,.5);assert.deepEqual(w.snapshot(),later);
});
test('frame cadence preserves fixed-step result and invalid input is rejected',()=>{
 const make=()=>{const w=new PhysicsWorld();w.addTile({id:'a',volume:volume()});w.addBody({id:'b',position:[0,20,0]});return w;},a=make(),b=make();for(let i=0;i<60;i++)a.advance(1/60);for(let i=0;i<20;i++)b.advance(.05);assert.deepEqual(a.bodies.get('b'),b.bodies.get('b'));assert.throws(()=>a.advance(NaN));assert.throws(()=>a.advance(-1));assert.throws(()=>a.advance(2));assert.throws(()=>a.addBody({id:'b',position:[0,0,0]}));
});
test('body contact preserves momentum and separates independent inhabitants',()=>{
 const w=new PhysicsWorld({outside:{gravity:[0,0,0],restitution:1}});const a=w.addBody({id:'a',position:[-.35,0,0],velocity:[2,0,0],mass:2}),b=w.addBody({id:'b',position:[.35,0,0],velocity:[-1,0,0],mass:1});run(w,.1);close(2*a.velocity[0]+b.velocity[0],3);assert.ok(b.position[0]-a.position[0]>=.6);assert.ok(a.velocity[0]<2);assert.ok(b.velocity[0]>-1);
});
test('driven frame sweeps actual collision mesh and stops at target',()=>{
 const w=new PhysicsWorld({outside:{gravity:[0,0,0]}});w.addTile({id:'a',volume:volume(),profile:{gravity:[0,0,0]},triangles:ground});const b=w.addBody({id:'b',position:[0,.3,0]});w.driveFrame('a',{position:[0,2,0]},.1);run(w,.1);close(w.tiles.get('a').frame.position[1],2);assert.ok(b.position[1]>=2.29);assert.deepEqual(w.tiles.get('a').frame.velocity,[0,0,0]);
});
test('unowned bodies remain navigation controlled, and driven motion survives save',()=>{
 const w=new PhysicsWorld();w.addTile({id:'a',volume:volume()});const b=w.addBody({id:'b',position:[0,10,0],kinematic:true});w.driveFrame('a',{position:[0,3,0]},.5);run(w,.1);const saved=w.snapshot();run(w,.2);const later=w.snapshot();w.restore(saved);run(w,.2);assert.deepEqual(w.snapshot(),later);assert.deepEqual(b.position,[0,10,0]);
});

test('resting adjacent inhabitants can settle without a perpetual pair-contact reset',()=>{const w=new PhysicsWorld();w.addTile({id:'a',volume:volume(),triangles:ground});const a=w.addBody({id:'a',position:[0,.3,0]}),b=w.addBody({id:'b',position:[.599,.3,0]});run(w,2);assert.equal(a.settled,true);assert.equal(b.settled,true);});
