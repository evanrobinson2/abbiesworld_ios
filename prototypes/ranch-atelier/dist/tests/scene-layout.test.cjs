const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const modulePromise=import(pathToFileURL(path.join(__dirname,'../scene-layout.js')).href);
function fixture(){const building={id:'abbie-home',stage:'complete',footprint:{x:10,z:20,width:16,depth:18},workPosition:[8,0,28]};const frame={seconds:86400,buildings:[building],workers:[],animals:[],sources:[],habitats:[],trails:[{from:[8,0,28],to:[0,0,28],width:1,strength:1}]};return {seed:43,frames:[{...frame,seconds:0,buildings:[{...building,stage:'planned'}]},frame],world:{vegetation:[],water:{}},summary:{completed:1,total:1,animals:0},paused:false};}
test('farm placement follows simulation coordinates and stages, not hex occupancy',async()=>{const {generateScene,farmEnvelope}=await modulePromise,run=fixture(),before=JSON.stringify(run),envelope=farmEnvelope(run),end=generateScene({run,envelope}),start=generateScene({run,index:0,envelope});assert.equal(end.tiles,undefined);assert.equal(end.placements[0].assetId,'family-home-complete');assert.equal(start.placements[0].assetId,'family-home-planned');assert.equal(end.placements[0].x,(18-envelope.cx)*.1);assert.equal(end.placements[0].z,(29-envelope.cz)*.1);assert.equal(end.paths.length,1);assert.deepEqual(start.envelope,end.envelope);assert.equal(JSON.stringify(run),before);});
test('decorative boundary is derived after the farm, with a stable margin',async()=>{const {generateScene,farmEnvelope}=await modulePromise,run=fixture(),envelope=farmEnvelope(run),scene=generateScene({run,envelope});for(const p of scene.placements)for(let i=0;i<6;i++)assert(p.x*Math.cos(i*Math.PI/3)+p.z*Math.sin(i*Math.PI/3)<=envelope.radius*Math.cos(Math.PI/6));for(const f of run.frames)f.buildings[0].footprint.x+=70;assert.notEqual(farmEnvelope(run).cx,envelope.cx);assert.throws(()=>generateScene({}),/simulation/);});
test('large simulation path histories do not exceed argument limits',async()=>{const {farmEnvelope}=await modulePromise,run=fixture();run.frames[1].trails=Array.from({length:150000},()=>({from:[0,0,28],to:[8,0,28]}));assert(Number.isFinite(farmEnvelope(run).radius));});

test('terrain sampling follows simulation elevations with independent visual relief',async()=>{const {terrainHeight}=await modulePromise,run={world:{terrain:{grid:{cols:2,rows:2,spacing:10,origin:[0,0],heights:[[100,110],[100,110]]}}}},envelope={cx:0,cz:0};assert.equal(terrainHeight(run,envelope,.5,.5,1),.5);assert.equal(terrainHeight(run,envelope,.5,.5,4),2);assert.equal(terrainHeight(run,envelope,.5,.5,0),0);});

test('daily growth keeps one full-run hex and unchanged building coordinates',async()=>{
 const {generateScene,farmEnvelope}=await modulePromise,run=fixture();
 run.frames[1].workers=[{id:'abbie',position:[160,0,90]}];
 const envelope=farmEnvelope(run),first=generateScene({run,index:0,envelope}),last=generateScene({run,index:1,envelope});
 assert.deepEqual(first.envelope,last.envelope);
 assert.equal(first.placements[0].x,last.placements[0].x);
 assert.equal(first.placements[0].z,last.placements[0].z);
 assert.equal(farmEnvelope({...run,frames:[run.frames[0]]}).cx,envelope.cx);
 assert.equal(farmEnvelope({...run,frames:[run.frames[0]]}).cz,envelope.cz);
 assert(farmEnvelope({...run,frames:[run.frames[0]]}).radius<envelope.radius);
});
