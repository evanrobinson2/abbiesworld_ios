const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const domestic=JSON.parse(fs.readFileSync(new URL('../domestic-assets/index.json','file://'+__filename)));
const coastal=JSON.parse(fs.readFileSync(new URL('../coastal-assets/index.json','file://'+__filename)));
function footprint(o){const b=(domestic[o.asset]||coastal[o.asset])?.bounds;if(!b||['roof','soil'].includes(o.asset))return null;return {x:o.x,z:o.z,w:2*Math.max(Math.abs(b.min[0]),Math.abs(b.max[0])),d:2*Math.max(Math.abs(b.min[1]),Math.abs(b.max[1])),angle:o.angle||0};}
function checkPaths(req,label){for(const [i,path] of req.internalPaths.entries()){assert((req.internalPathWidths?.[i]||1.4)>=1.2);for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.2));for(let k=0;k<=steps;k++){const x=a.x+(b.x-a.x)*k/steps,z=a.z+(b.z-a.z)*k/steps;for(const o of req.items){const f=footprint(o);if(!f)continue;const dx=x-f.x,dz=z-f.z,c=Math.cos(f.angle),s=Math.sin(f.angle);assert(!(Math.abs(dx*c-dz*s)<f.w/2+.59&&Math.abs(dx*s+dz*c)<f.d/2+.59),`${label}: path ${i} blocked by ${o.asset}`);}}}}}
test('every domestic activity has seeded internal variation, full-size assets and clear connected work paths',async()=>{
 const {DOMESTIC_SCENES,domesticRecipe}=await import('../domestic-scenes.js');
 for(const [type,scene] of Object.entries(DOMESTIC_SCENES))for(const preset of Object.keys(scene.presets)){
  const signatures=new Set();for(const seed of [1,7,41,73]){const r=domesticRecipe(type,preset,seed);assert.deepEqual(r,domesticRecipe(type,preset,seed));for(const req of r.requirements){checkPaths(req,type+'/'+preset+'/'+seed);const reachable=[req.internalPaths[0][0]];for(const path of req.internalPaths){assert(reachable.some(a=>Math.hypot(a.x-path[0].x,a.z-path[0].z)<1e-7));reachable.push(...path);}assert(req.items.every(o=>o.purpose));}
   const items=r.requirements[0].items;signatures.add(JSON.stringify(items.map(o=>[o.asset,o.x,o.z])));
  }assert.equal(signatures.size,4,type+'/'+preset);
 }
});
test('seaside paths stay clear of actual coastal and household footprints across seeds',async()=>{
 const {seasideRecipe}=await import('../seaside-scenes.js');for(const preset of ['landing','salt','repair'])for(const seed of [1,7,41,73]){const r=seasideRecipe(preset,seed);checkPaths(r.requirements[0],preset+'/'+seed);assert.equal(r.requirements[0].items.filter(o=>o.asset==='GF-191').length,3);assert(r.requirements[0].internalPaths.flat().every(p=>p.z<=26));}
});
test('farm seeds change relative growing-room geometry, not only the whole layout offset',async()=>{
 const {composeGarden}=await import('../garden-farm.js'),dims=require('./garden-dimensions.json'),{levelGardenTerrain}=await import('../garden-adapter.js');
 for(const layout of ['court','spine','split','terraces']){const signatures=new Set();for(const seed of [1,7,41,73]){const r=composeGarden({layout,seed},dims,levelGardenTerrain),beds=r.items.filter(o=>o.role==='bed');signatures.add(JSON.stringify(beds.map(o=>[o.x-beds[0].x,o.z-beds[0].z])));assert.equal(beds.length,8);assert.equal(r.routes.filter(p=>p.id.startsWith('access-')).length,r.items.length);}assert.equal(signatures.size,4,layout);}
});
