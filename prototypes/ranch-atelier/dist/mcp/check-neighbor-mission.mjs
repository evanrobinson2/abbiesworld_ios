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
 const quest=true,count=5;
 await action('simulator.planVisits',{families:Array.from({length:count},(_,i)=>'Test neighbor family '+(i+1)).join('\n'),reserve:quest?'prepare':'full'});
 let completed=false,delivered=0;
 for(let step=0;step<(quest?5:1);step++){
  const first=await action('simulator.simulate',{days:quest?7:1,deliveries:true});
  assert(first.result.neighborhood.delivered>=delivered);delivered=first.result.neighborhood.delivered;
  assert(Object.values(first.result.giftBalances).every(v=>v===0));assert.equal(first.result.renderReady,true);
  await action('simulator.adopt',{});
  if(first.result.neighborhood.complete){completed=true;break;}
 }
 assert(completed,'Mission did not finish within its bounded check');assert.equal(delivered,count);
 const next=await action('simulator.simulate',{days:1,deliveries:true});
 assert.equal(next.result.neighborhood.delivered,count);assert.equal(next.result.neighborhood.complete,true);
 assert(Object.values(next.result.giftBalances).every(v=>v===0));
 fs.writeFileSync(path.join(os.homedir(),'.codex','ranch-view',quest?'neighbor-quest-proof.json':'neighbor-mission-proof.json'),JSON.stringify({sessionId,checkedAt:new Date().toISOString(),proof},null,2));
 console.log('MCP neighborhood mission: '+count+' families complete; adopted continuation preserves stock.');
}finally{await client.close();}
