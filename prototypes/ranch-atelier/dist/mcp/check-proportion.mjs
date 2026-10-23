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
  let d,p;for(let i=0;i<160;i++){d=await call('list_actions',{sessionId});p=d.providers.find(p=>p.name==='proportionStudy');if(p&&!p.actions.find(a=>a.name===name)?.disabledReason&&(expected===undefined||p.revision===expected))break;await sleep();}
  assert(p,'Study provider missing');const commandId=crypto.randomUUID(),input={target:d.target,action:name,arguments:args,expectedRevision:p.revision,commandId};
  await call('execute_action',input);let result;
  for(let i=0;i<160;i++){result=await call('get_action_result',{sessionId,commandId});if(['succeeded','failed','expired'].includes(result.receipt.status))break;await sleep();}
  assert.equal(result.receipt.status,'succeeded',JSON.stringify(result.receipt));expected=result.receipt.afterRevision;
  proof.push(result.receipt);console.log(JSON.stringify({action:name,status:'succeeded',revision:expected}));return result.receipt;
 }


 await action('proportionStudy.speed',{value:0});
 await action('proportionStudy.generate',{seed:43,abundance:'balanced'});
 await action('proportionStudy.harvest',{plot:'beans'});
 await action('proportionStudy.speed',{value:4});
 let observed;for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,1000));observed=await call('get_current_view',{sessionId});if(observed.context.proportionStudy?.simulation.stock===8)break;}
 const paused=await action('proportionStudy.speed',{value:0});assert.equal(paused.state.simulation.stock,8);assert.equal(paused.state.simulation.deliveries,1);
 await action('proportionStudy.follow',{enabled:true});
 await action('proportionStudy.recenter',{});
 const recipe=await action('proportionStudy.exportRecipe',{});assert.equal(recipe.result.plan.seed,43);
 fs.writeFileSync(path.join(os.homedir(),'.codex','ranch-view','proportion-actions-proof.json'),JSON.stringify({sessionId,proof},null,2));
 console.log('PASS typed generate/harvest/delivery/speed/follow/recenter/export');
}finally{await client.close();}
