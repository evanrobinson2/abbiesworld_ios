import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {fileURLToPath} from 'node:url';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const client=new Client({name:'ranch-action-smoke',version:'1.0.0'});
const timeout=setTimeout(()=>{console.error('Action smoke timed out');process.exit(1)},90000);
await client.connect(new StdioClientTransport({command:process.execPath,env:{...process.env},args:[fileURLToPath(new URL('./ranch-view.mjs',import.meta.url))]}));
const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});if(r.isError)throw Error(r.content[0]?.text);return JSON.parse(r.content[0].text);};
const wait=()=>new Promise(r=>setTimeout(r,750));
try{
 const views=await call('list_views',{}),v=views.find(v=>v.slug==='/scene-generator'&&!v.stale);assert(v,'No fresh paired tile board');
 const sessionId=v.sessionId,proof=[];
 let expected;
 async function run(action,args){
  let d;
  for(let i=0;i<30;i++){d=await call('list_actions',{sessionId});const p=d.providers.find(p=>p.name==='tiles');if(p&&!p.actions.some(a=>a.disabledReason)&&(!expected||p.revision===expected))break;await wait();}
  const p=d.providers.find(p=>p.name==='tiles');assert(p,'No tile provider');
  const commandId=crypto.randomUUID(),input={target:d.target,action,arguments:args,expectedRevision:p.revision,commandId};
  const submitted=await call('execute_action',input);assert.equal(submitted.status,'accepted');
  let result;
  for(let i=0;i<60;i++){result=await call('get_action_result',{sessionId,commandId});if(['succeeded','failed','expired'].includes(result.receipt.status))break;await wait();}
  assert.equal(result.receipt.status,'succeeded',JSON.stringify(result.receipt));expected=result.receipt.afterRevision;
  const retry=await call('execute_action',input);assert.equal(retry.command.id,commandId);
  proof.push({action,id:commandId,before:result.receipt.beforeRevision,after:expected,state:result.receipt.state,result:result.receipt.result});console.log(JSON.stringify({action,status:result.receipt.status,revision:expected}));return result.receipt;
 }
 const initial=await run('tiles.inspect',{}),cell=initial.state.board.tiles.find(t=>t.id==='ranch').cell;
 await run('tiles.move',{id:'ranch',cell:4});await run('tiles.move',{id:'ranch',cell});
 await run('tiles.view',{preset:'top'});await run('tiles.save',{});await run('tiles.load',{});
 const exported=await run('tiles.export',{});assert.deepEqual(exported.result.artifact,initial.state.board);
 fs.writeFileSync(path.join(os.homedir(),'.codex','ranch-view','action-smoke-proof.json'),JSON.stringify({checkedAt:new Date().toISOString(),sessionId,proof},null,2));
 console.log('MCP action smoke passed: move/restore, view, save/load, export and idempotent replay.');
}finally{clearTimeout(timeout);await client.close();}
