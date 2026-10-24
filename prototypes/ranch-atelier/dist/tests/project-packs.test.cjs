const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const items=JSON.parse(fs.readFileSync(__dirname+'/../../../../preview/diorama-swipe/models.json','utf8')).items;
test('packs group the library, search understands themes, and exclusions always win',async()=>{
 const P=await import('../simulations/project-chat/packs.mjs'),packs=P.buildPacks(items);
 assert.ok(packs.some(p=>p.id==='c:Zombie survival gear')&&packs.some(p=>p.id==='t:Animal'));
 const z=P.search(items,'zombies');assert.ok(z.keys.length>10);
 const all=P.allowed(items,packs,{include:new Set(),exclude:new Set()});assert.equal(all.size,items.length);
 const noZ=P.allowed(items,packs,{include:new Set(),exclude:new Set(['c:Zombie survival gear'])});assert.ok(noZ.size<items.length);
 const zk=new Set(packs.find(p=>p.id==='c:Zombie survival gear').keys);assert.ok([...noZ].every(k=>!zk.has(k)));
 const ranchNoZ=P.allowed(items,packs,{include:new Set(['p:Ranch']),exclude:new Set(['t:Animal'])});
 const by=new Map(items.map(i=>[i.key,i]));assert.ok([...ranchNoZ].every(k=>by.get(k).place==='Ranch'&&by.get(k).type!=='Animal'));
 assert.deepEqual(P.search(items,'').keys,[]);
});
