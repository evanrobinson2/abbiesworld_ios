// Live mode with the ElevenLabs voice, end to end in headless Chromium: the settings page saves the
// family's choices, the session asks for text replies, each sentence is spoken through /api/live-voice
// (mocked here with a tone) in order, and the guard still cuts a bad line. Also screenshots /live-voice.
//   node scripts/live-voice-e2e.cjs [settings.png]   (IPHONE=1 for the iPhone 13 profile)
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {WebSocketServer}=require('ws');
const root=path.resolve(__dirname,'..');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/node-tools/node_modules/playwright'));}
const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.mp3':'audio/mpeg'};
const routes=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites;
const log=[],guarded=[],spoken=[];let port;

const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/api/live'&&req.method==='POST'){let b='';req.on('data',c=>b+=c);req.on('end',()=>{const body=JSON.parse(b);res.setHeader('Content-Type','application/json');
  if(body.action==='session')return res.end(JSON.stringify({voiceTicket:'vt_test',token:'vcst_test',url:`ws://127.0.0.1:${port}/mock-realtime?ai-model-id=openai%2Fgpt-realtime-2`,protocols:['ai-gateway-realtime.v1','ai-gateway-auth.vcst_test']}));
  if(body.action==='guard'){guarded.push(body);return res.end(JSON.stringify({verdict:/bad word/.test(body.text)?'jailbreak':'ok'}));}
  res.end('{}');});return;}
 if(url.pathname==='/api/live-voice'){
  if(req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({configured:true,voices:[{id:'XrExE9yKIg1WjnnlVkGX',name:'Matilda',about:'warm, friendly'},{id:'pFZP5JQG7iQjIQuC4Bku',name:'Lily',about:'gentle'}]}));}
  let b='';req.on('data',c=>b+=c);req.on('end',()=>{const body=JSON.parse(b);spoken.push(body);const pcm=Buffer.alloc(9601);for(let i=0;i<4800;i++)pcm.writeInt16LE(Math.round(Math.sin(i/6)*2000),i*2);
   res.setHeader('Content-Type','audio/pcm');res.write(pcm.subarray(0,4001));setTimeout(()=>res.end(pcm.subarray(4001)),60);});return;}
 let pathname=decodeURIComponent(url.pathname);const route=routes.find(r=>r.source===pathname&&!r.has);if(route)pathname=route.destination;
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});

const wss=new WebSocketServer({server,path:'/mock-realtime',handleProtocols:p=>p.has('ai-gateway-realtime.v1')?'ai-gateway-realtime.v1':false});
wss.on('connection',ws=>{
 const send=e=>ws.send(JSON.stringify(e));let audioIn=0,turn=0;
 const say=(id,parts,call)=>{send({type:'response-created',responseId:id});for(const p of parts)send({type:'text-delta',responseId:id,itemId:'t'+id,delta:p});send({type:'text-done',responseId:id,itemId:'t'+id,text:parts.join('')});
  if(call)send({type:'function-call-arguments-done',responseId:id,itemId:'f'+id,callId:'c'+id,name:call.name,arguments:JSON.stringify(call.args)});send({type:'response-done',responseId:id,status:'completed'});};
 ws.on('message',d=>{const e=JSON.parse(d);
  if(e.type==='input-audio-append'){audioIn++;
   if(audioIn===20&&turn===0){turn=1;send({type:'speech-started'});send({type:'speech-stopped'});send({type:'input-transcription-completed',itemId:'u1',transcript:'make a big star'});
    say('r1',['Here comes ','a big star! ','It ','will spin.'],{name:'change_world',args:{ops:[{op:'spawn',args:{id:'star',shape:'star',scale:2,color:'#ffd84d',behavior:'spin'}}]}});}
   if(audioIn===80&&turn===1){turn=2;send({type:'speech-started'});send({type:'input-transcription-completed',itemId:'u2',transcript:'say a rude thing'});say('r2',['Okay, damn it all.']);}
   return;}
  log.push({t:e.type,...(e.type==='session-update'?{config:e.config}:{})});
 });
});
server.listen(0,'127.0.0.1',async()=>{
 port=server.address().port;
 const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 let devices;try{({devices}=require('playwright'));}catch{({devices}=require('/opt/node-tools/node_modules/playwright'));}
 const page=await browser.newPage(process.env.IPHONE?{...devices['iPhone 13'],deviceScaleFactor:2}:{viewport:{width:900,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.context().grantPermissions(['microphone'],{origin:`http://127.0.0.1:${port}`});
 // 1. The settings page: pick ElevenLabs, Lily, playful, patient, slower speech.
 await page.goto(`http://127.0.0.1:${port}/live-voice`);
 await page.waitForSelector('#voices-openai button');
 await page.click('[data-setting=provider] [data-value=elevenlabs]');
 await page.waitForSelector('#voices-eleven [data-value=pFZP5JQG7iQjIQuC4Bku]');
 await page.click('#voices-eleven [data-value=pFZP5JQG7iQjIQuC4Bku] strong');
 await page.click('[data-setting=personality] [data-value=playful]');await page.click('[data-setting=wait] [data-value=patient]');
 await page.$eval('#speed',el=>{el.value='0.9';el.dispatchEvent(new Event('change'));});
 await page.click('[data-play=pFZP5JQG7iQjIQuC4Bku]');await page.waitForTimeout(400);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('abbies-live-settings-v1')));
 if(process.argv[2]){await page.waitForTimeout(1900);await page.screenshot({path:process.argv[2],fullPage:!process.env.IPHONE});}
 // 2. Live mode with that voice.
 await page.goto(`http://127.0.0.1:${port}/sandbox`,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#live-toggle',{timeout:60000});
 await page.evaluate(()=>document.querySelectorAll('[data-feedback-ui].afb-card').forEach(n=>n.remove()));
 await page.click('#live-toggle');await page.waitForSelector('.live-consent');await page.click('.live-consent .primary');
 await page.waitForFunction(()=>window.holodeck?.snapshot(false).entities.some(e=>e.id==='star'),null,{timeout:90000,polling:250}).catch(()=>{});
 for(let i=0;i<120&&!log.some(l=>l.t==='response-cancel');i++)await page.waitForTimeout(500);
 await page.waitForTimeout(800);
 const star=await page.evaluate(()=>!!window.holodeck?.snapshot(false).entities.some(e=>e.id==='star'));
 const caption=await page.evaluate(()=>document.querySelector('.live-said')?.textContent);
 await page.evaluate(()=>document.querySelector('.live-end')?.click());
 await browser.close();server.close();
 const update=log.find(l=>l.t==='session-update')?.config||{};
 const checks={
  'settings page saved the choices':saved?.provider==='elevenlabs'&&saved.elevenVoice==='pFZP5JQG7iQjIQuC4Bku'&&saved.personality==='playful'&&saved.wait==='patient'&&saved.speed===0.9,
  'preview asked for the fixed hello line':spoken.some(s=>s.preview===true&&s.voice==='pFZP5JQG7iQjIQuC4Bku'),
  'session asks for text replies with the chosen settings':update.outputModalities?.[0]==='text'&&update.liveSettings?.provider==='elevenlabs'&&update.turnDetection?.silenceDurationMs===1300,
  'each sentence spoken with the ticket, voice and speed':JSON.stringify(spoken.filter(s=>!s.preview).map(s=>s.text).sort())===JSON.stringify(['Here comes a big star!','It will spin.'])&&spoken.filter(s=>!s.preview).every(s=>s.ticket==='vt_test'&&s.voice==='pFZP5JQG7iQjIQuC4Bku'&&s.speed===0.9),
  'tool still runs on the ElevenLabs path':star,
  'bad line cut off and never spoken':log.some(l=>l.t==='response-cancel')&&!spoken.some(s=>/damn/i.test(s.text||'')),
  'bad line not left on screen':!/damn/i.test(caption||''),
  'one bad line is one strike (session keeps going)':!/stopped to keep things friendly/.test(caption||''),
  'no page errors':!errors.filter(e=>!/favicon|404|Failed to load resource/.test(e)).length
 };
 for(const [k,v]of Object.entries(checks))console.log((v?'PASS ':'FAIL ')+k);
 console.log('spoken:',JSON.stringify(spoken.map(s=>s.text||'(preview)')),'caption:',caption);if(errors.length)console.log(errors.slice(0,4));
 process.exit(Object.values(checks).every(Boolean)?0:1);
});
