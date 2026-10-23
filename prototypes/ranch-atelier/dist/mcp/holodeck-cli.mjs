// Holodeck Creator CLI: the same client as the MCP server, for shells and scripts.
//   node mcp/holodeck-cli.mjs link [--new]      print the viewer link (--new makes a fresh room)
//   node mcp/holodeck-cli.mjs state [--world]   print the scene state and pending viewer events
//   node mcp/holodeck-cli.mjs do '<ops json>'   apply a batch, e.g. '[{"op":"spawn","args":{"shape":"star"}}]'
//   node mcp/holodeck-cli.mjs look [file.jpg]   save what the viewer sees
//   node mcp/holodeck-cli.mjs bench [n]         measure command-to-pixel latency over n commands
import fs from 'node:fs';
import {createClient,roomConfig} from './holodeck-client.mjs';

const [cmd='link',arg]=process.argv.slice(2);
const config=roomConfig({fresh:cmd==='link'&&process.argv.includes('--new')});
if(cmd==='link'){console.log(config.link);process.exit(0);}
const client=createClient({relay:config.relay,room:config.room,log:m=>console.error(m)});
const out=v=>console.log(JSON.stringify(v,null,1));
try{
 if(cmd==='state'){const ack=await client.send([{op:'state',args:{world:process.argv.includes('--world')}}]);out(ack.ok?{state:ack.results[0],events:client.drainEvents()}:ack);}
 else if(cmd==='do'){const ack=await client.send(JSON.parse(arg));out({...ack,results:ack.results?.map(r=>r?.mime?{screenshot:`${r.width}x${r.height}`}:r)});process.exitCode=ack.ok?0:1;}
 else if(cmd==='look'){const ack=await client.send([{op:'screenshot',args:{width:1280}}]);if(!ack.ok){out(ack);process.exitCode=1;}else{fs.writeFileSync(arg||'holodeck.jpg',Buffer.from(ack.results[0].data,'base64'));console.log(arg||'holodeck.jpg');}}
 else if(cmd==='bench'){out(await bench(client,Number(arg)||30));}
 else{console.error('Unknown command '+cmd);process.exitCode=2;}
}finally{client.close();}

export async function bench(client,n){
 if(!await client.ready())return {error:'viewer not connected'};
 const pings=[];for(let i=0;i<10;i++)pings.push(await client.ping());
 const rows=[];
 await client.send([{op:'remove',args:{all:true}},{op:'spawn',args:{id:'probe',shape:'box',color:'#ff00ff',emissive:'#ff00ff',scale:2,ground:false,at:client.state?.camera?.target||[0,0,0]}}]);
 await new Promise(r=>setTimeout(r,800));
 for(let i=0;i<n;i++){
  // Colour flips are instant (a spawn plays a short grow-in), so each sample measures one visible change.
  const c=i%2?'#00ffff':'#ff00ff',a=[{op:'style',args:{id:'probe',color:c,emissive:c}}];
  const ack=await client.send(a,{probe:'probe'});
  const t=ack.timing||{};
  // Epoch fields compare the Creator's clock with the viewer's: exact on one machine, approximate across machines.
  rows.push({roundTrip:ack.roundTripMs,commandToPixel:ack.commandToPixelMs,stageApply:t.applied,stageDrawn:t.drawn,stagePresented:t.presented,arrive:t.receivedEpoch-ack.sentAt,sendToPresented:t.presentedEpoch-ack.sentAt,pixel:t.probe?.rgb});
  await new Promise(r=>setTimeout(r,60));
 }
 await client.send([{op:'remove',args:{all:true}}]);
 const q=(k,p)=>{const v=rows.map(r=>r[k]).filter(Number.isFinite).sort((a,b)=>a-b);return v.length?Math.round(v[Math.min(v.length-1,Math.floor(p*v.length))]*10)/10:null;};
 const stat=k=>({p50:q(k,.5),p90:q(k,.9),max:q(k,1)});
 return {samples:n,relayPingMs:{p50:pings.sort((a,b)=>a-b)[5]},roundTripMs:stat('roundTrip'),commandToPixelMs:stat('commandToPixel'),stageApplyMs:stat('stageApply'),stageReceiveToDrawnMs:stat('stageDrawn'),stageReceiveToPresentedMs:stat('stagePresented'),sendToStageMs:stat('arrive'),sendToPresentedMs:stat('sendToPresented'),probePixels:rows.slice(0,6).map(r=>r.pixel)};
}
