const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('Castle heroes retain reviewed metre-scale geometry and no invented economic capabilities',async()=>{
 const {HERO_SCENES,castleRecipe}=await import('../castle-scenes.js'),manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../castle-assets/manifest.json'),'utf8'));
 assert.deepEqual(HERO_SCENES.castle.capabilities,{});
 for(const preset of Object.keys(HERO_SCENES.castle.presets)){
  const recipe=castleRecipe(preset,41),group=recipe.requirements[0],asset=group.items[0],record=manifest.assets.find(a=>a.id===asset.asset),data=fs.readFileSync(path.join(__dirname,'../castle-assets',asset.asset+'.glb'));
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),record.sha256);
  assert.equal(record.scale,1);assert.equal(record.geometryUp,'Y');assert.equal(recipe.tiles.length,1);assert.equal(record.sourceFootprint.cell_count,7);assert.equal(record.boardCells,1);
  const meta=JSON.parse(fs.readFileSync(path.join(__dirname,'../castle-assets',asset.asset+'.json'),'utf8'));
  for(const x of [meta.bounds_min[0],meta.bounds_max[0]])for(const z of [-meta.bounds_max[1],-meta.bounds_min[1]])assert(Math.hypot(x,z)<=group.radius);
  assert(group.items.every(i=>i.purpose));assert.equal(asset.size,undefined);
 }
});
test('Settlement presets compose ordinary cards with explicit purposes and preserve the seven-scene core',async()=>{
 const {settlementPreset}=await import('../settlement-presets.js'),hamlet=settlementPreset('hamlet'),burg=settlementPreset('burg');
 assert.equal(hamlet.entries.length,7);assert.equal(burg.entries.length,8);assert.deepEqual(burg.entries.slice(0,7),hamlet.entries);assert.equal(burg.entries.at(-1).type,'castle');assert.equal(new Set(burg.entries.map(e=>e.q+','+e.r)).size,8);
 hamlet.entries[0].q=999;assert.equal(settlementPreset('hamlet').entries[0].q,0);assert.throws(()=>settlementPreset('unknown'));
});
