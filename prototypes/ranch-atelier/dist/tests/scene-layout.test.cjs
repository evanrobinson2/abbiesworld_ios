const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../scene-layout.js'),'utf8');
const modulePromise=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const ids=new Set(JSON.parse(fs.readFileSync(path.join(__dirname,'../simulation-assets/catalog.json'),'utf8')).map(x=>x.id));
test('seeded ranch layouts preserve dry, distinct footprints and a connected courtyard',async()=>{
 const {generateScene}=await modulePromise;
 for(const radius of [2,3,5])for(let seed=0;seed<100;seed++){
  const s=generateScene({seed,radius});assert.deepEqual(s,generateScene({seed,radius}));assert.equal(s.tiles.length,1+3*radius*(radius+1));
  const tiles=new Map(s.tiles.map(t=>[`${t.q},${t.r}`,t])),occupied=new Set();
  for(const p of s.placements){const k=`${p.q},${p.r}`,t=tiles.get(k);assert(t);assert(!occupied.has(k));occupied.add(k);assert(ids.has(p.assetId));assert(!['water','courtyard','path'].includes(t.kind));assert(p.scale*Math.SQRT2<2*Math.sqrt(3));assert.equal(p.x,Math.sqrt(3)*2*(p.q+p.r/2));assert.equal(p.z,3*p.r);}
  assert.equal(s.placements.filter(p=>p.assetId==='family-home-complete').length,2);
  const water=s.tiles.filter(t=>t.kind==='water');assert.equal(water.length,1);assert.equal(Math.max(Math.abs(water[0].q),Math.abs(water[0].r),Math.abs(water[0].q+water[0].r)),radius);
  assert.equal(s.paths.length,11);const reached=new Set(['0,0']);for(const p of s.paths){assert(reached.has(`${p.from.x},${p.from.z}`));reached.add(`${p.to.x},${p.to.z}`);}
 }
});
test('different seeds change asset-to-tile composition, with explicit input limits',async()=>{
 const {generateScene}=await modulePromise;
 const layouts=new Set(Array.from({length:30},(_,seed)=>JSON.stringify(generateScene({seed}).placements.map(({assetId,q,r})=>({assetId,q,r})))));assert.equal(layouts.size,30);
 assert.throws(()=>generateScene({radius:1}),RangeError);assert.throws(()=>generateScene({seed:NaN}),TypeError);
});
