const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('spatial index preserves the global surface across negative cells and influence boundaries',async()=>{
 const {gradeTerrain}=await import('../terrain-grading.js');const raw=(x,z)=>.05*x+.03*z,pads=[{x:-100,z:-48,radius:6},{x:100,z:-48,radius:6}],paths=[{width:4,points:[{x:-100,z:-48},{x:100,z:-48}]}],result=gradeTerrain({heightAt:raw,pads,paths});assert(result.valid);
 // Full-scan mathematical reference, independent of the spatial index.
 const reference=(x,z)=>{const ds=result.pads.map(p=>Math.max(0,Math.hypot(x-p.x,z-p.z)-p.radius)),roadDistance=Math.hypot(x-Math.max(-100,Math.min(100,x)),z+48)-3,edge=Math.min(...ds,roadDistance);if(edge>=18)return raw(x,z);const lower=Math.max(...result.pads.map((p,i)=>p.height-.18*ds[i])),upper=Math.min(...result.pads.map((p,i)=>p.height+.18*ds[i])),t=Math.max(0,edge/18),blend=t*t*(3-2*t);return (lower+upper)/2*(1-blend)+raw(x,z)*blend;};
 for(let x=-160;x<=160;x+=1.5)for(let z=-100;z<=20;z+=1.5)assert.equal(result.heightAt(x,z),reference(x,z));
 for(const x of [-144,-96,-48,0,48,96,144])for(const z of [-96,-48,0])for(const e of [-1e-8,0,1e-8])assert.equal(result.heightAt(x+e,z+e),reference(x+e,z+e));
});
test('grading preserves distant hills, flat pads and bounded slopes across the full road width',async()=>{
 const {gradeTerrain}=await import('../terrain-grading.js');const raw=(x,z)=>.3*x+Math.sin(z/5),pads=[{x:0,z:0,radius:5},{x:40,z:0,radius:5}],paths=[{width:4,points:[{x:0,z:0},{x:40,z:0}]}];
 const result=gradeTerrain({heightAt:raw,pads,paths});assert(result.valid);const h=result.heightAt;
 assert.equal(h(100,100),raw(100,100));assert.equal(h(0,0),h(3,0));
 for(let x=0;x<40;x+=.25)for(let z=-2;z<2;z+=.25){assert(Math.abs(h(x+.25,z)-h(x,z))<=.18*.25+1e-9);assert(Math.abs(h(x,z+.25)-h(x,z))<=.18*.25+1e-9);}
});
test('fixed entrance heights are honored and impossible adjacent pads reject without modifying terrain',async()=>{
 const {gradeTerrain}=await import('../terrain-grading.js');const raw=()=>3;
 const valid=gradeTerrain({heightAt:raw,pads:[{x:0,z:0,radius:2,height:4},{x:30,z:0,radius:2,height:6}]});assert(valid.valid);assert.equal(valid.heightAt(0,0),4);assert.equal(valid.heightAt(30,0),6);
 const invalid=gradeTerrain({heightAt:raw,pads:[{x:0,z:0,radius:3,height:0},{x:4,z:0,radius:3,height:10}]});assert(!invalid.valid);assert(invalid.warnings.some(x=>/incompatible/.test(x.reason)));assert.equal(invalid.heightAt(0,0),3);
});
test('excessive earthwork rejects explicitly and overlapping flexible pads share one elevation',async()=>{
 const {gradeTerrain}=await import('../terrain-grading.js');const pads=[{x:0,z:0,radius:4},{x:5,z:0,radius:4}];
 const valid=gradeTerrain({heightAt:x=>x,pads});assert(valid.valid);assert.equal(valid.heightAt(0,0),valid.heightAt(5,0));
 const invalid=gradeTerrain({heightAt:x=>10*x,pads,maxEarthwork:5});assert(!invalid.valid);assert(invalid.warnings.some(x=>/earthwork/.test(x.reason)));
 const hill=gradeTerrain({heightAt:x=>40*Math.sin(Math.PI*x/40),pads:[{x:0,z:0,radius:2},{x:40,z:0,radius:2}],paths:[{points:[{x:0,z:0},{x:40,z:0}]}],maxEarthwork:10});assert(!hill.valid);assert(hill.warnings.some(x=>/road earthwork/.test(x.reason)));
});
test('actual seven-card relief site has complete access, finite supplies and reachable village goals',async()=>{
 const {demoStar,routeGrades}=await import('../scripts/diagnose-access-grades.mjs'),{planComposition}=await import('../board-composition.js'),{boardHeight}=await import('../board-terrain.js'),{resolveBoardEconomy,evolveBoardEconomy}=await import('../board-economy.js');
 const root=path.join(__dirname,'..'),index=JSON.parse(fs.readFileSync(path.join(root,'domestic-assets/index.json'),'utf8')),catalog=JSON.parse(fs.readFileSync(path.join(root,'simulation-assets/catalog.json'),'utf8')),tree=catalog.find(x=>x.id==='tree-standing'),parts=JSON.parse(fs.readFileSync(path.join(root,tree.json),'utf8')),xs=[],zs=[];
 for(const part of parts)for(let i=0;i<part.positions.length;i+=3){xs.push(part.positions[i]);zs.push(part.positions[i+2]);}
 const dimensions={'tree-standing':{w:(Math.max(...xs)-Math.min(...xs))*2,d:(Math.max(...zs)-Math.min(...zs))*2}};
 let board=demoStar(-4,3);const {assembly}=planComposition(board),heightAt=boardHeight(assembly);assert(heightAt.grading.valid);assert.deepEqual(assembly.warnings,[]);
 for(const row of routeGrades(board).rows){assert(row.grade<=.180001);assert(row.crossGrade<=.180001);}
 let resolved=resolveBoardEconomy(board,assembly,heightAt,index,dimensions);assert.deepEqual(resolved.accessWarnings,[]);assert.equal(resolved.report.connectedInstanceIds.length,7);
 board=evolveBoardEconomy(board,resolved,'supplies');resolved=resolveBoardEconomy(board,assembly,heightAt,index,dimensions);board=evolveBoardEconomy(board,resolved,'day',{days:6});resolved=resolveBoardEconomy(board,assembly,heightAt,index,dimensions);assert(resolved.report.goals.every(g=>g.ready));assert.equal(resolved.report.stock.clay,18);
 const bad=demoStar(),badAssembly=planComposition(bad).assembly,badHeight=boardHeight(badAssembly);assert(!badHeight.grading.valid);const rejected=resolveBoardEconomy(bad,badAssembly,badHeight,index,dimensions);assert(rejected.report.connectedInstanceIds.length<7);assert(rejected.accessWarnings.some(w=>/earthwork/.test(w.reason)));
 const {legacyBoardHeight}=await import('../board-legacy-terrain.js'),legacy=legacyBoardHeight(badAssembly,41,badHeight.grading.warnings),recovered=resolveBoardEconomy(bad,badAssembly,legacy,index,dimensions);assert.equal(legacy.grading.valid,false);assert(recovered.report.connectedInstanceIds.length<7);assert(recovered.accessWarnings.some(w=>/Legacy terrain/.test(w.reason))); 
});
