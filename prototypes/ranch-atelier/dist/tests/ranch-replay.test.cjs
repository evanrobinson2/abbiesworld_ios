const test=require('node:test'),assert=require('node:assert/strict');
const api=import('../ranch-replay.js');
const initial=()=>({seconds:0,playing:false,speed:1,selectedId:'',following:false,emojis:'all'});
test('replay transport clamps steps, stops at end, and restarts without changing source state',async()=>{
 const {replayChange:change,replayAdvance:advance}=await api,s=initial(),ids=['abbie'];
 assert.equal(change(s,{type:'step',seconds:-60},120,ids).seconds,0);
 const playing=change(s,{type:'play'},120,ids),end=advance(playing,300,120);
 assert.equal(end.seconds,120);assert.equal(end.playing,false);
 assert.equal(change(end,{type:'play'},120,ids).seconds,0);
 assert.equal(change({...s,seconds:100},{type:'step',seconds:60},120,ids).seconds,120);
 assert.deepEqual(s,initial());
});
test('speed changes playback rate; pause and seek never advance recording',async()=>{
 const {replayChange:change,replayAdvance:advance}=await api,s=initial();
 for(const speed of [.25,1,4])assert.equal(advance({...s,playing:true,speed},1,300).seconds,speed);
 const seek=change({...s,playing:true},{type:'seek',seconds:90},300,[]);
 assert.equal(seek.playing,false);assert.equal(advance(seek,20,300).seconds,90);
 assert.equal(change({...s,playing:true},{type:'pause'},300,[]).playing,false);
});
test('invalid time, speed, resident, follow and emoji commands leave state unchanged',async()=>{
 const {replayChange:change}=await api,s=initial();
 for(const command of [{type:'seek',seconds:-1},{type:'seek',seconds:301},{type:'seek',seconds:NaN},{type:'step',seconds:1},{type:'speed',speed:2},{type:'resident',id:'missing'},{type:'follow',enabled:true},{type:'emojis',mode:'unknown'}])assert.throws(()=>change(s,command,300,['abbie']));
 assert.throws(()=>change(s,{type:'play'},0,[]));assert.deepEqual(s,initial());
});
test('selection supports off-site residents without inventing positions and clearing it disables follow',async()=>{
 const {replayChange:change}=await api;
 let s=change(initial(),{type:'resident',id:'abbie'},300,['abbie']);
 s=change(s,{type:'follow',enabled:true},300,['abbie']);assert.equal(s.following,true);
 s=change(s,{type:'resident',id:''},300,['abbie']);assert.equal(s.following,false);
});
test('recorded sample lookup uses actual timestamps and includes final sample',async()=>{
 const {replaySample}=await api,samples=[{seconds:0,workers:[]},{seconds:10,workers:[]},{seconds:25,workers:[{id:'abbie',offsite:true}]}];
 assert.equal(replaySample(samples,24).index,1);assert.equal(replaySample(samples,25).index,2);
 assert.equal(replaySample(samples,25).current.workers[0].offsite,true);
 assert.equal(replaySample([],0),null);
});
