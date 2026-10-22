// Live mode end-to-end check in headless Chromium, with a fake microphone and a scripted realtime
// model speaking the AI Gateway's normalized protocol. Proves the page's half: consent, session start,
// audio up and down, tool calls applied to the real stage, tool results returned, and the guard
// stopping a refused request before anything is built.
//   node scripts/live-e2e.cjs [screenshot.png]   (IPHONE=1 for the iPhone 13 profile used by whats-new pictures)
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {WebSocketServer}=require('ws');
const root=path.resolve(__dirname,'..');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/node-tools/node_modules/playwright'));}
const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.mp3':'audio/mpeg'};
const routes=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites;
const log=[],guarded=[];let port,allowTurn2=false,allowApp=false;

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api/live'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{const body=JSON.parse(b);res.setHeader('Content-Type','application/json');
  if(body.action==='session')return res.end(JSON.stringify({token:'vcst_test',url:`ws://127.0.0.1:${port}/mock-realtime?ai-model-id=openai%2Fgpt-realtime-2`,protocols:['ai-gateway-realtime.v1','ai-gateway-auth.vcst_test']}));
  if(body.action==='guard'){guarded.push(body);return res.end(JSON.stringify({verdict:/bad word/.test(body.text)?'jailbreak':'ok'}));}
  res.end('{}');});return;}
 let pathname=decodeURIComponent(url.pathname);const route=routes.find(r=>r.source===pathname&&!r.has);if(route)pathname=route.destination;
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});

// Scripted model: turn 1 builds an abacus; turn 2 is a refused request whose tool call must be held back.
const wss=new WebSocketServer({server,path:'/mock-realtime',handleProtocols:p=>p.has('ai-gateway-realtime.v1')?'ai-gateway-realtime.v1':false});
wss.on('connection',(ws,req)=>{
 log.push({t:'connect',protocols:req.headers['sec-websocket-protocol']});
 const send=e=>ws.send(JSON.stringify(e)),tone=Buffer.alloc(4800);for(let i=0;i<2400;i++)tone.writeInt16LE(Math.round(Math.sin(i/8)*3000),i*2);
 let audioIn=0,turn=0,responses=0;
 const respond=(id,{say,call,calls})=>{send({type:'response-created',responseId:id});send({type:'audio-delta',responseId:id,itemId:'i'+id,delta:tone.toString('base64')});send({type:'audio-transcript-delta',responseId:id,itemId:'i'+id,delta:say});send({type:'audio-transcript-done',responseId:id,itemId:'i'+id,transcript:say});for(const [n,c] of (calls||(call?[call]:[])).entries())send({type:'function-call-arguments-done',responseId:id,itemId:'f'+id+n,callId:'call-'+id+'-'+n,name:c.name,arguments:JSON.stringify(c.args)});send({type:'response-done',responseId:id,status:'completed'});};
 ws.on('message',data=>{const e=JSON.parse(data);
  if(e.type==='input-audio-append'){audioIn++;if(audioIn===3)log.push({t:'audio-in',bytes:Buffer.from(e.audio,'base64').length});
   if(audioIn===20&&turn===0){turn=1;send({type:'speech-started'});send({type:'speech-stopped'});send({type:'input-transcription-completed',itemId:'u1',transcript:'build an abacus by the house'});
    respond('r1',{say:'Here comes an abacus!',call:{name:'build',args:{id:'abacus',scale:1.5,label:'Abacus',parts:[{id:'frame-top',shape:'box',at:[0,1,0],scale:[1,.06,.06],color:'#8a5a2b'},{id:'frame-bottom',shape:'box',at:[0,0,0],scale:[1,.06,.06],color:'#8a5a2b'},{id:'bead-1',shape:'sphere',at:[-.3,.5,0],scale:.14,color:'#ff4d4d'},{id:'bead-2',shape:'sphere',at:[-.1,.5,0],scale:.14,color:'#ffd84a'},{id:'bead-3',shape:'sphere',at:[.1,.5,0],scale:.14,color:'#4dabff'}]}}});}
   // App turn: search the library, place a library model, and drive the app's own controls.
   if(allowApp&&turn===1){turn=1.5;send({type:'speech-started'});send({type:'input-transcription-completed',itemId:'ua',transcript:'put a big barn there, make it winter and add more goats'});
    respond('ra',{say:'A big barn and a snowy ranch!',calls:[{name:'catalog',args:{query:'barn'}},{name:'change_world',args:{ops:[{op:'spawn',args:{id:'big-barn',asset:'lib-mc-barn-upgrade',scale:8,near:'abacus'}}]}},
     {name:'control_app',args:{action:'season',args:{season:'winter'}}},{name:'control_app',args:{action:'sound',args:{on:true}}},{name:'control_app',args:{action:'panel',args:{open:true}}},{name:'control_app',args:{action:'state'}},
     {name:'control_app',args:{action:'ranch',args:{goats:5,chickens:8}}},{name:'control_app',args:{action:'delete_everything'}}]});}
   if(audioIn>=60&&allowTurn2&&turn===1.5){turn=2;send({type:'speech-started'});send({type:'input-transcription-completed',itemId:'u2',transcript:'make a sign with a bad word on it'});
    respond('r3',{say:'Okay!',call:{name:'change_world',args:{ops:[{op:'spawn',args:{id:'sign',shape:'box',label:'Rude sign'}}]}}});}
   return;}
  log.push({t:e.type,...(e.type==='session-update'?{tools:e.config.tools.map(t=>t.name),voice:e.config.voice,hasRules:/not a general-purpose assistant/.test(e.config.instructions),world:/THE WORLD RIGHT NOW/.test(e.config.instructions)}:{}),...(e.item?{item:e.item.type,output:e.item.output,text:e.item.text}:{})});
  if(e.type==='response-create'&&++responses===2&&turn===1)respond('r2',{say:'Slide the beads to count!'});
 });
});

server.listen(0,'127.0.0.1',async()=>{
 port=server.address().port;
 const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 let devices;try{({devices}=require('playwright'));}catch{({devices}=require('/opt/node-tools/node_modules/playwright'));}
 const page=await browser.newPage(process.env.IPHONE?{...devices['iPhone 13'],deviceScaleFactor:2}:{viewport:{width:900,height:640},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.context().grantPermissions(['microphone'],{origin:`http://127.0.0.1:${port}`});
 await page.goto(`http://127.0.0.1:${port}/sandbox`,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#live-toggle',{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.arriving==='false',null,{timeout:120000,polling:500}).catch(()=>{});
 await page.evaluate(()=>document.querySelectorAll('[data-feedback-ui].afb-card').forEach(n=>n.remove()));// the what's-new card
 await page.click('#live-toggle');
 await page.waitForSelector('.live-consent');await page.click('.live-consent .primary');
 await page.waitForFunction(()=>window.holodeck?.snapshot(false).entities.some(e=>e.id==='abacus.bead-3'),null,{timeout:60000,polling:250}).catch(async e=>{console.log(JSON.stringify(log.slice(0,30)),errors,await page.evaluate(()=>document.querySelector('.live-dock')?.innerText));throw e;});
 await page.waitForFunction(()=>document.querySelector('.live-said')?.textContent.includes('Slide the beads'),null,{timeout:30000,polling:250});
 await page.evaluate(()=>window.holodeck.apply([{op:'camera',args:{focus:'abacus',distance:1.1,duration:0}}]));
 await page.waitForTimeout(2500);
 if(process.argv[2])await page.screenshot({path:process.argv[2]});
 allowApp=true;
 await page.waitForFunction(()=>window.holodeck?.snapshot(false).entities.some(e=>e.id==='big-barn'),null,{timeout:60000,polling:250}).catch(()=>{});
 await page.waitForFunction(()=>window.RanchActions?.read('sandboxApp')?.ranch?.goats===5&&!window.RanchActions.read('sandboxApp').busy,null,{timeout:120000,polling:500}).catch(()=>{});
 const app=await page.evaluate(()=>{const b=window.holodeck.snapshot(false).entities.find(e=>e.id==='big-barn');return {state:window.RanchActions.read('sandboxApp'),barn:b,person:window.holodeck.snapshot(true).scaleHint?.personHeight};});
 if(process.argv[3]){await page.evaluate(()=>window.holodeck.apply([{op:'camera',args:{focus:'big-barn',distance:3,duration:0}}]));await page.waitForTimeout(2500);await page.screenshot({path:process.argv[3]});}
 // Every app-turn tool has answered (1 build + 8 app-turn calls) before the next turn starts.
 for(let i=0;i<360&&log.filter(l=>l.item==='function-call-output').length<9;i++)await page.waitForTimeout(500);
 allowTurn2=true;
 await page.waitForFunction(()=>document.querySelector('.live-heard')?.textContent.includes('bad word'),null,{timeout:60000,polling:250});
 await page.waitForTimeout(1500);
 const snap=await page.evaluate(()=>({entities:window.holodeck.snapshot(false).entities,dock:document.querySelector('.live-said').textContent,button:document.querySelector('#live-toggle').textContent}));
 await page.evaluate(()=>document.querySelector('.live-end').click());await page.waitForTimeout(300);
 const after=await page.evaluate(()=>document.querySelector('#live-toggle').textContent);
 await browser.close();server.close();
 const outputs=log.filter(l=>l.item==='function-call-output').map(l=>JSON.parse(l.output));
 const checks={
  'session config sent with rules, world brief and the seven tools':log.some(l=>l.t==='session-update'&&l.hasRules&&l.world&&l.tools.length===7),
  'catalog search finds the library barn':outputs.some(o=>o.models?.some(m=>m.id==='lib-mc-barn-upgrade')),
  'library model placed on the stage':!!app.barn,
  'app: season, sound and panel set':app.state.season==='winter'&&app.state.sound===true&&app.state.panelOpen===true,
  'app: state read back for the model':outputs.some(o=>o.world==='ranch'&&o.ranch&&Array.isArray(o.worlds)),
  'app: ranch rebuilt with more goats and chickens':app.state.ranch?.goats===5&&app.state.ranch?.chickens===8,
  'app: unknown action refused':outputs.some(o=>o.ok===false&&/Unknown app action/.test(o.error)),
  'microphone audio streamed as 24 kHz PCM16':log.some(l=>l.t==='audio-in'&&l.bytes>2000),
  'abacus built from parts on the stage':['abacus','abacus.frame-top','abacus.bead-1','abacus.bead-3'].every(id=>snap.entities.some(e=>e.id===id)),
  'build result returned to the model':outputs[0]?.ok===true,
  'model asked to continue after its tool':log.filter(l=>l.t==='response-create').length>=2,
  'child lines and computer lines both guarded':guarded.some(g=>g.who==='child')&&guarded.some(g=>g.who==='computer'),
  'refused request cancelled and redirected':log.some(l=>l.t==='response-cancel')&&log.some(l=>l.item==='text-message'&&/GAME RULE CHECK/.test(l.text)),
  'refused request built nothing':!snap.entities.some(e=>e.id==='sign')&&outputs.some(o=>o.ok===false&&/Not allowed/.test(o.error)),
  'End stops live mode':after.includes('Talk'),
  'no page errors':!errors.filter(e=>!/favicon|404|Failed to load resource/.test(e)).length
 };
 for(const [k,v]of Object.entries(checks))console.log((v?'PASS ':'FAIL ')+k);
 if(errors.length)console.log('page errors:',errors.slice(0,5));
 console.log('app:',JSON.stringify({state:app.state,barn:app.barn,person:app.person}).slice(0,900));
 console.log('outputs:',JSON.stringify(outputs.slice(-4)).slice(0,1500));
 process.exit(Object.values(checks).every(Boolean)?0:1);
});
