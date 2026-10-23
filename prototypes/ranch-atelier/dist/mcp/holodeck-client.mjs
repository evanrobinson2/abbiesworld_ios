// Creator-side client for the Holodeck relay. Keeps one WebSocket open, caches the latest
// scene state the stage pushes, queues the viewer's taps and selections, and sends command
// batches that resolve when the stage has drawn the result.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import WebSocket from 'ws';
import {HttpsProxyAgent} from 'https-proxy-agent';

// The test deployment until the Creator ships to the live app (a production deploy Evan approves).
export const DEFAULT_URL='https://abbies-holodeck-preview.vercel.app';
const roomFile=path.join(os.homedir(),'.config','holodeck','room.json');

// The room key lives outside the repository. HOLODECK_ROOM overrides it.
export function roomConfig({fresh=false}={}){
 const base=(process.env.HOLODECK_URL||DEFAULT_URL).replace(/\/$/,'');
 let room=process.env.HOLODECK_ROOM;
 if(!room&&!fresh)try{room=JSON.parse(fs.readFileSync(roomFile,'utf8')).room;}catch{}
 if(!room||fresh){room=randomBytes(18).toString('base64url');if(!process.env.HOLODECK_ROOM){fs.mkdirSync(path.dirname(roomFile),{recursive:true,mode:0o700});fs.writeFileSync(roomFile,JSON.stringify({room,created:new Date().toISOString()}),{mode:0o600});}}
 const relay=process.env.HOLODECK_RELAY||base.replace(/^http/,'ws')+'/api/holodeck';
 return {base,room,relay,link:`${base}/sandbox?creator=${room}`+(process.env.HOLODECK_RELAY?`&relay=${encodeURIComponent(process.env.HOLODECK_RELAY)}`:'')};
}

export function createClient({relay,room,log=()=>{}}){
 let socket=null,peers={stage:0,creator:0},instance=null,state=null,stateAt=0,opened=null,closing=false;
 const events=[],waiting=new Map(),listeners=new Set();
 const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 const noProxy=(process.env.NO_PROXY||'').split(',').map(s=>s.trim()).filter(Boolean);
 function agentFor(url){const host=new URL(url).hostname;if(!proxy||url.startsWith('ws:')||noProxy.some(n=>host===n||n.startsWith('.')&&host.endsWith(n)||n.startsWith('*.')&&host.endsWith(n.slice(1))))return undefined;return new HttpsProxyAgent(proxy);}

 function open(){
  if(opened)return opened;
  opened=new Promise((resolve,reject)=>{
   const url=new URL(relay);url.searchParams.set('room',room);url.searchParams.set('role','creator');
   const ws=new WebSocket(url,{agent:agentFor(relay),handshakeTimeout:10000});socket=ws;
   ws.on('message',data=>{let m;try{m=JSON.parse(data);}catch{return;}
    if(m.t==='welcome'){instance=m.instance;peers=m.peers;if(m.state){state=m.state.state;stateAt=Date.now();}resolve();}
    else if(m.t==='presence')peers=m.peers;
    else if(m.t==='state'){state=m.state;stateAt=Date.now();}
    else if(m.t==='event'){events.push({...m,receivedAt:new Date().toISOString()});if(events.length>50)events.shift();}
    else if(m.t==='ack'||m.t==='pong'){const w=waiting.get(m.id??('ping'+m.at));if(w){waiting.delete(m.id??('ping'+m.at));w(m);}}
    for(const l of listeners)l(m);});
   ws.on('close',()=>{socket=null;opened=null;peers={stage:0,creator:0};for(const [id,w] of waiting){waiting.delete(id);w({t:'ack',id,ok:false,error:'disconnected'});}});
   ws.on('error',e=>{log('relay error: '+e.message);reject(e);});
  });
  return opened;
 }
 // Vercel pins each WebSocket to one function instance, so the stage and the Creator must land
 // on the same one. If the stage is not visible here, reconnect a few times to find it.
 async function ready({wait=2500,attempts=5}={}){
  for(let i=0;i<attempts;i++){
   await open();
   const until=Date.now()+wait;while(!peers.stage&&Date.now()<until)await new Promise(r=>setTimeout(r,50));
   if(peers.stage)return true;
   if(i<attempts-1){log('stage not on relay instance '+instance+'; reconnecting');socket?.close();await new Promise(r=>setTimeout(r,150));}
  }
  return false;
 }
 async function send(ops,{probe,timeout=20000}={}){
  if(!await ready())return {ok:false,error:'The viewer is not connected. Ask them to open the holodeck link.'};
  const id=randomBytes(8).toString('hex'),sentAt=Date.now(),t0=performance.now();
  const ack=await new Promise(resolve=>{const timer=setTimeout(()=>{if(waiting.delete(id))resolve({t:'ack',id,ok:false,error:'timeout'});},timeout);waiting.set(id,m=>{clearTimeout(timer);resolve(m);});socket.send(JSON.stringify({t:'cmd',id,ops,sentAt,probe}));});
  const roundTrip=performance.now()-t0;
  if(ack.error==='no-stage'){opened=null;socket?.close();return send(ops,{probe,timeout});}
  ack.roundTripMs=Math.round(roundTrip*10)/10;
  // One-way estimate: the stage's own time (receive to drawn) plus half of the remaining network time.
  if(ack.timing?.drawn!=null)ack.commandToPixelMs=Math.round((ack.timing.drawn+(roundTrip-ack.timing.drawn)/2)*10)/10;
  return ack;
 }
 async function ping(){await open();const at=performance.now();return new Promise(resolve=>{waiting.set('ping'+at,()=>resolve(performance.now()-at));socket.send(JSON.stringify({t:'ping',at}));});}
 return {open,ready,send,ping,on:l=>(listeners.add(l),()=>listeners.delete(l)),
  get state(){return state;},get stateAge(){return stateAt?Date.now()-stateAt:null;},get peers(){return peers;},get instance(){return instance;},
  drainEvents(){return events.splice(0);},close(){closing=true;socket?.close();}};
}
