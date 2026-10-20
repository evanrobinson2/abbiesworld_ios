const test=require('node:test'),assert=require('node:assert/strict');
test('legacy recovery preserves old isolated flat pads and terrain without granting valid grading',async()=>{
 const {legacyBoardHeight}=await import('../board-legacy-terrain.js'),{rawTerrain}=await import('../board-terrain.js');
 const assembly={plans:[{center:{x:100,z:50},placements:[{x:0,z:0,radius:10}]}]},warnings=[{reason:'Excessive earthwork'}],h=legacyBoardHeight(assembly,41,warnings);
 assert.equal(h(100,50),rawTerrain(100,50));assert.equal(h(105,50),rawTerrain(100,50));assert.equal(h(200,200),rawTerrain(200,200));assert.equal(h.grading.valid,false);assert.equal(h.grading.recovery,true);assert.equal(h.grading.warnings[0].reason,warnings[0].reason);assert.notEqual(h.grading.warnings[0],warnings[0]);assert.equal(warnings.length,1);
});
test('legacy recovery reproduces historical overlapping aprons deterministically',async()=>{
 const {legacyBoardHeight}=await import('../board-legacy-terrain.js'),{rawTerrain}=await import('../board-terrain.js');const placements=[{x:0,z:0,radius:10},{x:22,z:0,radius:10}],assembly={plans:[{center:{x:0,z:0},placements}]},h=legacyBoardHeight(assembly);
 for(let x=-25;x<=45;x+=.5){let expected=rawTerrain(x,0);for(const p of placements){const v=Math.max(0,Math.min(1,(p.radius+9-Math.abs(x-p.x))/9)),blend=v*v*(3-2*v);if(blend)expected=expected*(1-blend)+rawTerrain(p.x,p.z)*blend;}assert.equal(h(x,0),expected);}
});
