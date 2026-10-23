const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const load=()=>import('data:text/javascript;base64,'+fs.readFileSync(require('node:path').join(__dirname,'../simulation-intent.js')).toString('base64'));
test('transit intent names the recorded delivery target and resource',async()=>{
  const {intentFor}=await load();
  assert.deepEqual(intentFor({activity:'carrying-materials',job:'feed'}),{text:'Taking wood to the feed store',transit:true});
  const frame={careJobs:[{id:'water-2',habitat:'habitat-2'}],animals:[{habitat:'habitat-2',species:'cow'}]};
  assert.equal(intentFor({activity:'carrying-water',job:'water-2'},frame).text,'Taking water to the cow habitat');
  assert.equal(intentFor({activity:'walking-to-care-supplies',material:'food'}).text,'Going to collect feed');
});
test('missing or cleared jobs do not invent a destination from a stale frame',async()=>{
  const {intentFor}=await load();
  assert.equal(intentFor({activity:'carrying-water',job:null,task:{job:'water'}}).text,'Taking water');
  assert.equal(intentFor({activity:'walking-home'}).text,'Heading back to the depot');
  assert.equal(intentFor({activity:'planning-the-farm'}).transit,false);
  assert.equal(intentFor({activity:'new-recorded-action'}).text,'new recorded action');
});
