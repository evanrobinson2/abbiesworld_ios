const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
test('Ranch core headless/replay/lifecycle and compiled navigation regression suite',()=>{
 const result=spawnSync(process.execPath,['--test',path.join(__dirname,'ranch-engine/headless.test.mjs'),path.join(__dirname,'ranch-engine/navigation.test.mjs')],{encoding:'utf8',maxBuffer:8*1024*1024});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);console.log(result.stdout);
});
