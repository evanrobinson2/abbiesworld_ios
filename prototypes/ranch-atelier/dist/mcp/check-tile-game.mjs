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
  let d,p;for(let i=0;i<160;i++){d=await call('list_actions',{sessionId});p=d.providers.find(p=>p.name==='tileGame');if(p&&!p.actions.find(a=>a.name===name)?.disabledReason&&(expected===undefined||p.revision===expected))break;await sleep();}
  assert(p,'Study provider missing');const commandId=crypto.randomUUID(),input={target:d.target,action:name,arguments:args,expectedRevision:p.revision,commandId};
  await call('execute_action',input);let result;
  for(let i=0;i<160;i++){result=await call('get_action_result',{sessionId,commandId});if(['succeeded','failed','expired'].includes(result.receipt.status))break;await sleep();}
  assert.equal(result.receipt.status,'succeeded',JSON.stringify(result.receipt));expected=result.receipt.afterRevision;
  proof.push(result.receipt);console.log(JSON.stringify({action:name,status:'succeeded',revision:expected}));return result.receipt;
 }


 await action('tileGame.pause',{paused:true});
 const added=await action('tileGame.place',{kind:'garden',q:-1,r:0,level:0,rotation:0});
 const id=added.result.instanceId;
 await action('tileGame.pause',{paused:false});
 let produced=false;for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,1000));const live=await call('get_current_view',{sessionId});if(live.context.tileGame?.world.tiles.find(t=>t.id===id)?.cycles>=1){produced=true;break;}}assert(produced,'Garden did not complete a production cycle');
 const before=await action('tileGame.pause',{paused:true});
 const original=before.state.world.tiles.find(t=>t.id===id);
 assert(original.age>0);
 const moved=await action('tileGame.move',{instanceId:id,q:0,r:1,level:0,rotation:2});
 const tile=moved.state.world.tiles.find(t=>t.id===id);
 assert.deepEqual(tile.inventory,original.inventory);assert.equal(tile.progress,original.progress);assert.equal(tile.age,original.age);
 await action('tileGame.reducedMotion',{enabled:true});
 await new Promise(r=>setTimeout(r,1000)); const gentle=await action('tileGame.inspect',{});assert(gentle.state.visualInertia.every(v=>v.bodies.every(b=>Object.values(b).every(n=>n===0))));
 await action('tileGame.recenter',{});
 const exported=await action('tileGame.exportWorld',{});assert.equal(exported.result.tiles.length,2);
 fs.writeFileSync(path.join(os.homedir(),'.codex','ranch-view','tile-game-actions-proof.json'),JSON.stringify({sessionId,proof},null,2));
 console.log('PASS typed place/simulation/pause/move preserves inventory, age and progress/reduced motion/export');
}finally{await client.close();}
