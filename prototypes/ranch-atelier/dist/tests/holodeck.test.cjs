const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const WebSocket=require('ws');
const {attach}=require('../lib/holodeck-relay.cjs');
const ROOM='holodeckTestRoom_0123456789';

async function relay(){const server=http.createServer();attach(server);await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,url:`ws://127.0.0.1:${server.address().port}/api/holodeck`};}
function join(url,role,{room=ROOM,origin}={}){
 const ws=new WebSocket(`${url}?room=${room}&role=${role}`,origin?{headers:{Origin:origin}}:{}),inbox=[];
 ws.on('message',d=>inbox.push(JSON.parse(d)));
 ws.next=(t,ms=2000)=>new Promise((resolve,reject)=>{const until=Date.now()+ms;(function look(){const i=inbox.findIndex(m=>m.t===t);if(i>=0)return resolve(inbox.splice(i,1)[0]);if(Date.now()>until)return reject(Error('no '+t));setTimeout(look,5);})();});
 ws.closed=new Promise(r=>ws.on('close',(code,reason)=>r({code,reason:reason.toString()})));
 return ws;
}

test('relay forwards commands to the stage and acks, state and events to the creator',async()=>{
 const {server,url}=await relay();
 const stage=join(url,'stage');await stage.next('welcome');
 const creator=join(url,'creator');const welcome=await creator.next('welcome');
 assert.deepEqual(welcome.peers,{stage:1,creator:1});
 assert.equal((await stage.next('presence')).peers.creator,1);
 creator.send(JSON.stringify({t:'cmd',id:'c1',ops:[{op:'narrate',args:{text:'Hello'}}]}));
 const cmd=await stage.next('cmd');assert.equal(cmd.ops[0].args.text,'Hello');
 stage.send(JSON.stringify({t:'ack',id:'c1',ok:true,results:[{shown:true}]}));
 assert.equal((await creator.next('ack')).id,'c1');
 stage.send(JSON.stringify({t:'state',rev:3,state:{family:'ranch'}}));
 assert.equal((await creator.next('state')).rev,3);
 // A creator that joins later receives the cached state immediately.
 const late=join(url,'creator');assert.equal((await late.next('welcome')).state.rev,3);
 stage.close();creator.close();late.close();server.close();
});

test('commands with no stage on this relay instance are refused so the creator can reconnect',async()=>{
 const {server,url}=await relay();
 const creator=join(url,'creator');await creator.next('welcome');
 creator.send(JSON.stringify({t:'cmd',id:'c2',ops:[]}));
 const ack=await creator.next('ack');assert.equal(ack.ok,false);assert.equal(ack.error,'no-stage');assert.ok(ack.instance);
 creator.close();server.close();
});

test('rooms are isolated, keys are validated and stages must come from the app origin',async()=>{
 const {server,url}=await relay();
 const other=join(url,'stage',{room:'someOtherRoomKey_0123456789'});await other.next('welcome');
 const creator=join(url,'creator');assert.equal((await creator.next('welcome')).peers.stage,0);
 assert.equal((await join(url,'creator',{room:'short'}).closed).reason,'Invalid room');
 assert.equal((await join(url,'admin').closed).reason,'Invalid role');
 assert.equal((await join(url,'stage',{origin:'https://evil.example'}).closed).reason,'Origin rejected');
 const ping=join(url,'creator');await ping.next('welcome');ping.send(JSON.stringify({t:'ping',at:42}));assert.equal((await ping.next('pong')).at,42);
 other.close();creator.close();ping.close();server.close();
});

test('protocol accepts the documented ops and rejects unknown or malformed ones',async()=>{
 const {checkCommand,OPS}=await import('../simulations/holodeck/protocol.mjs');
 assert.ok(Object.keys(OPS).length>=12);
 checkCommand({op:'spawn',args:{id:'star-1',shape:'star',at:[0,0,0],color:'#ffcc00',behavior:'spin'}});
 checkCommand({op:'camera',args:{focus:'star-1',duration:0.5}});
 checkCommand({op:'time',args:{hour:19,paused:false,speed:2}});
 assert.throws(()=>checkCommand({op:'eval',args:{}}),/Unknown op/);
 assert.throws(()=>checkCommand({op:'spawn',args:{shape:'star',asset:'shelter-planned'}}),/exactly one/);
 assert.throws(()=>checkCommand({op:'spawn',args:{shape:'dragon'}}),/must be one of/);
 assert.throws(()=>checkCommand({op:'move',args:{id:'x',to:[1,2]}}),/wrong length/);
 assert.throws(()=>checkCommand({op:'style',args:{id:'x',color:'red'}}),/invalid format/);
 assert.throws(()=>checkCommand({op:'narrate',args:{text:'hi',html:'<b>'}}),/Unknown argument/);
});
