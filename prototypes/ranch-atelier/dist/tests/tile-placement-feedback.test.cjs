const test=require('node:test'),assert=require('node:assert/strict');
test('tile settling restores exact world transform, including interruption and reduced motion',async()=>{
 const T=await import('../simulations/vendor/three.module.js'),{settleTile}=await import('../simulations/tile-placement-feedback.mjs');
 for(const reducedMotion of [false,true]){const group=new T.Group();group.position.set(17,2,-9);group.scale.set(1.2,.8,1);const position=group.position.toArray(),scale=group.scale.toArray(),motion=settleTile(group,{reducedMotion});
 if(!reducedMotion){assert(group.position.y>2);motion.update(.3);assert(!motion.done);}
 motion.update(1);assert(motion.done);assert.deepEqual(group.position.toArray(),position);assert.deepEqual(group.scale.toArray(),scale);motion.update(.5);assert.deepEqual(group.position.toArray(),position);
 const interrupted=settleTile(group);interrupted.update(.1);interrupted.finish();assert.deepEqual(group.position.toArray(),position);assert.deepEqual(group.scale.toArray(),scale);
 }
});
