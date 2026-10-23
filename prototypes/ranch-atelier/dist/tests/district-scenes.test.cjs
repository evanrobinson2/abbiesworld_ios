const test=require('node:test'),assert=require('node:assert/strict');
test('district grammars distinguish density, streets and civic uses with explicit Town households and unchanged neighborhood demo',async()=>{
 const {districtRecipe,DISTRICT_SCENES,describeDistrict}=await import('../district-scenes.js');
 for(const [type,scene] of Object.entries(DISTRICT_SCENES))for(const preset of Object.keys(scene.presets)){
  const a=districtRecipe(type,preset,41),b=districtRecipe(type,preset,41),req=a.requirements[0];assert.deepEqual(a,b);assert.equal(req.accessScope,'working-entrances');assert(req.internalPaths.length>4);assert(req.items.every(i=>i.purpose&&Number.isFinite(i.x)&&Number.isFinite(i.z)));assert.deepEqual(scene.capabilities,{housing:6});assert.match(describeDistrict(type,preset),type==='town'?/working households/:/Six residents/);assert(req.items.filter(i=>i.asset==='roof').every(i=>i.roofShape==='gable'&&i.size[1]>1));assert.equal(a.generator,'district-composer');
 }
 const court=districtRecipe('neighborhood','court',41),town=districtRecipe('town','market',41),count=r=>r.requirements[0].items.filter(i=>i.asset==='GF-191').length;
 assert.equal(count(court),4);assert.equal(count(town),8);assert(town.requirements[0].items.some(i=>i.purpose==='surplus exchange table'));assert(court.requirements[0].items.some(i=>i.purpose==='shared neighborhood water'));assert.throws(()=>districtRecipe('town','unknown',41),/Unknown/);
});
