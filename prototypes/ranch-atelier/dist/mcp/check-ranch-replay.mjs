// Explicit integration check: use only a fresh test tab; changes its in-memory ranch.
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const sessionId=process.argv[2];if(!sessionId)throw Error('Pass the explicit test-tab session ID');
const client=new Client({name:'neighbor-mission-check',version:'1'});
const sleep=()=>new Promise(r=>setTimeout(r,750));
await client.connect(new StdioClientTransport({command:process.execPath,env:{...process.env},args:[fileURLToPath(new URL('./ranch-view.mjs',import.meta.url))]}));
const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0]?.text);return JSON.parse(r.content[0].text);};
const proof=[];let expected;
try{
 async function action(name,args){
  let d,p;for(let i=0;i<160;i++){d=await call('list_actions',{sessionId});p=d.providers.find(p=>p.name==='simulator');if(p&&!p.actions.find(a=>a.name===name)?.disabledReason&&(expected===undefined||p.revision===expected))break;await sleep();}
  assert(p,'Simulator provider missing');const commandId=crypto.randomUUID(),input={target:d.target,action:name,arguments:args,expectedRevision:p.revision,commandId};
  await call('execute_action',input);let result;
  for(let i=0;i<160;i++){result=await call('get_action_result',{sessionId,commandId});if(['succeeded','failed','expired'].includes(result.receipt.status))break;await sleep();}
  assert.equal(result.receipt.status,'succeeded',JSON.stringify(result.receipt));expected=result.receipt.afterRevision;
  proof.push(result.receipt);console.log(JSON.stringify({action:name,status:'succeeded',revision:expected}));return result.receipt;
 }

 await action('simulator.simulate',{days:1,deliveries:true});
 const before=(await action('simulator.inspect',{})).result;
 const seek=await action('simulator.replaySeek',{seconds:28800});
 assert.equal(seek.result.seconds,28800);assert.equal(seek.result.playing,false);
 await action('simulator.replayResident',{id:seek.result.people[0].id});
 async function cameraView(){for(let i=0;i<80;i++){const v=await call('get_current_view',{sessionId});if(v.actions.providers.find(p=>p.name==='simulator')?.revision===expected)return v.context.sceneGenerator;await sleep();}throw Error('Fresh camera snapshot missing');}
 const wide=await cameraView();
 await action('simulator.replayFollow',{enabled:true});
 const close=await cameraView(),distance=v=>Math.hypot(...v.camera.map((n,i)=>n-v.cameraTarget[i]));
 assert(distance(close)<distance(wide)/2,'Follow must frame the resident closely');
 await action('simulator.replayFollow',{enabled:false});
 const restored=await cameraView();
 for(let i=0;i<3;i++){assert(Math.abs(restored.camera[i]-wide.camera[i])<1e-6);assert(Math.abs(restored.cameraTarget[i]-wide.cameraTarget[i])<1e-6);}
 await action('simulator.replayFollow',{enabled:true});
 await action('simulator.replayEmojis',{mode:'selected'});
 await action('simulator.replaySpeed',{speed:4});
 const step=await action('simulator.replayStep',{seconds:60});assert.equal(step.result.seconds,28860);
 await action('simulator.replayPlay',{});
 const pause=await action('simulator.replayPause',{});assert.equal(pause.result.playing,false);assert(pause.result.seconds>28860);
 const after=(await action('simulator.inspect',{})).result;
 assert.deepEqual(after.neighborhood,before.neighborhood);assert.deepEqual(after.summary,before.summary);
 assert.equal(after.replay.mode,'completed-run-replay');assert.equal(after.replay.changesCompletedRun,false);
 fs.writeFileSync(path.join(os.homedir(),'.codex','ranch-view','ranch-replay-proof.json'),JSON.stringify({sessionId,checkedAt:new Date().toISOString(),proof},null,2));
 console.log('MCP ranch replay: seek, select, follow, emojis, speed, step, play, pause passed; completed result unchanged.');
}finally{await client.close();}
