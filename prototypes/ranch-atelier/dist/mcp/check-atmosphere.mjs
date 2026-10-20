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
  let d,p;for(let i=0;i<160;i++){d=await call('list_actions',{sessionId});p=d.providers.find(p=>p.name==='effectBrowser');if(p&&!p.actions.find(a=>a.name===name)?.disabledReason&&(expected===undefined||p.revision===expected))break;await sleep();}
  assert(p,'Simulator provider missing');const commandId=crypto.randomUUID(),input={target:d.target,action:name,arguments:args,expectedRevision:p.revision,commandId};
  await call('execute_action',input);let result;
  for(let i=0;i<160;i++){result=await call('get_action_result',{sessionId,commandId});if(['succeeded','failed','expired'].includes(result.receipt.status))break;await sleep();}
  assert.equal(result.receipt.status,'succeeded',JSON.stringify(result.receipt));expected=result.receipt.afterRevision;
  proof.push(result.receipt);console.log(JSON.stringify({action:name,status:'succeeded',revision:expected}));return result.receipt;
 }


 const night=await action('effectBrowser.atmosphere',{enabled:true,time:'night',weather:'rain',intensity:.5});assert(night.result.particles>0);assert(night.result.stars>0);
 const zero=await action('effectBrowser.atmosphere',{intensity:0});assert.equal(zero.result.weather,'clear');assert.equal(zero.result.particles,0);assert(zero.result.stars>0);
 const vacuum=await action('effectBrowser.atmosphere',{intensity:.5,environment:'vacuum'});assert.equal(vacuum.result.particles,0);assert(vacuum.result.moon);
 const inside=await action('effectBrowser.atmosphere',{environment:'interior'});assert.equal(inside.result.stars,0);assert.equal(inside.result.moon,false);
 const off=await action('effectBrowser.atmosphere',{enabled:false});assert.equal(off.result.enabled,false);
 const mist=await action('effectBrowser.atmosphere',{enabled:true,environment:'earth',time:'day',weather:'mist',reducedMotion:true});assert(mist.result.fog);assert(mist.result.reducedMotion);
 await action('effectBrowser.atmosphere',{time:'night',weather:'snow',reducedMotion:false});
 fs.writeFileSync(path.join(os.homedir(),'.codex','ranch-view','atmosphere-actions-proof.json'),JSON.stringify({sessionId,proof},null,2));console.log('PASS live atmosphere lifecycle and suppression');
}finally{await client.close();}
