// Holodeck relay: pairs one viewer's stage (the app page) with the Creator (Claude or another
// model) in a room named by an unguessable key, and forwards frames between them unchanged.
// The room key is the capability: anyone holding it can direct that scene, so it is never logged.
const {randomBytes}=require('node:crypto');
const ROOM=/^[A-Za-z0-9_-]{22,64}$/,ROLES=['stage','creator'],MAX_PER_ROLE=4,MAX_FRAME=4*1024*1024,RATE=240;
const instance=randomBytes(4).toString('hex'),rooms=new Map();

function peers(room){return {stage:room.stage.size,creator:room.creator.size};}
function broadcast(room,message,except){const text=JSON.stringify(message);for(const role of ROLES)for(const s of room[role])if(s!==except&&s.readyState===1)s.send(text);}

// Returns an error string, or null when the socket was admitted.
function admit(socket,{room:key,role,origin,host}){
 if(!ROOM.test(key||''))return 'Invalid room';
 if(!ROLES.includes(role))return 'Invalid role';
 // Browsers always send Origin; the stage must come from the app's own host.
 if(role==='stage'&&origin&&new URL(origin).host!==host)return 'Origin rejected';
 const room=rooms.get(key)||{stage:new Set(),creator:new Set(),state:null};rooms.set(key,room);
 if(room[role].size>=MAX_PER_ROLE)return 'Room full';
 room[role].add(socket);
 let window=Date.now(),count=0;
 socket.send(JSON.stringify({t:'welcome',instance,role,peers:peers(room),state:role==='creator'?room.state:undefined}));
 broadcast(room,{t:'presence',instance,peers:peers(room)},socket);
 socket.on('message',(data,isBinary)=>{
  if(isBinary||data.length>MAX_FRAME)return socket.close(1009,'Frame too large');
  if(Date.now()-window>1000){window=Date.now();count=0;}if(++count>RATE)return socket.close(1008,'Rate limit');
  let m;try{m=JSON.parse(data);}catch{return;}
  if(m.t==='ping')return socket.send(JSON.stringify({t:'pong',at:m.at,server:Date.now(),instance}));
  if(role==='stage'&&m.t==='state')room.state=m;
  const targets=role==='creator'?room.stage:room.creator;
  if(role==='creator'&&m.t==='cmd'&&!targets.size)return socket.send(JSON.stringify({t:'ack',id:m.id,ok:false,error:'no-stage',instance}));
  const text=data.toString();for(const s of targets)if(s.readyState===1)s.send(text);
 });
 const alive=setInterval(()=>socket.readyState===1&&socket.ping(),25000);
 socket.on('close',()=>{clearInterval(alive);room[role].delete(socket);if(!room.stage.size&&!room.creator.size)rooms.delete(key);else broadcast(room,{t:'presence',instance,peers:peers(room)});});
 socket.on('error',()=>{});
 return null;
}

// Attach to any http.Server: upgrades /api/holodeck?room=&role= to a WebSocket.
function attach(server,{WebSocketServer}=require('ws')){
 const wss=new WebSocketServer({noServer:true,maxPayload:MAX_FRAME});
 server.on('upgrade',(req,sock,head)=>{
  const url=new URL(req.url,'http://relay.invalid');
  if(url.pathname!=='/api/holodeck'){sock.destroy();return;}
  wss.handleUpgrade(req,sock,head,ws=>{const error=admit(ws,{room:url.searchParams.get('room'),role:url.searchParams.get('role'),origin:req.headers.origin,host:req.headers['x-forwarded-host']||req.headers.host});if(error)ws.close(1008,error);});
 });
 return wss;
}
module.exports={attach,admit,instance,rooms,ROOM};
