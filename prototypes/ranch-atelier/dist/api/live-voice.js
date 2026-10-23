// Live mode voice: ElevenLabs speaks the Computer's lines when the family picks it in /live-voice.
//  GET  /api/live-voice                      {configured, voices:[{id,name,about}]}
//  POST /api/live-voice {ticket, text, voice, speed}   24 kHz 16-bit mono PCM, streamed
//  POST /api/live-voice {preview:true, voice, speed}   the same, for one fixed hello line (settings page)
// Only the Computer's own words come here, never anything a child said, and nothing is stored.
// The brain, tools and guard stay on the realtime session (api/live-socket.js); this is a mouth.
const {checkTicket,ticketAccount}=require('../lib/live-ticket.cjs');
const {account}=require('../lib/account.cjs');
const {wallet,PRICES}=require('../lib/wallet.cjs');
const API='https://api.elevenlabs.io';
const MODEL='eleven_flash_v2_5'; // ElevenLabs' lowest-latency voice model
const PREVIEW="Hi! I'm the Computer. What shall we build today?";
const buckets=new Map();let voiceCache=null;

function createHandler({fetcher=fetch,env=process.env,now=Date.now,who=account,purse=wallet}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const json=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
 const {screen,ELEVEN_VOICES,ELEVEN_VOICE_PATTERN}=await import('../simulations/live/policy.mjs');
 const key=env.ELEVENLABS_API_KEY;
 if(req.method==='GET'){
  if(!key)return json(200,{configured:false,voices:ELEVEN_VOICES});
  if(!voiceCache||now()-voiceCache.at>600000){
   try{const r=await fetcher(`${API}/v1/voices`,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(6000)});
    if(!r.ok)throw Error('voices '+r.status);
    const list=((await r.json()).voices||[]).filter(v=>ELEVEN_VOICE_PATTERN.test(v.voice_id||'')).slice(0,80).map(v=>({id:v.voice_id,name:String(v.name||'').slice(0,40),
     about:[v.labels?.description||v.labels?.descriptive,v.labels?.accent,v.labels?.gender,v.labels?.age].filter(Boolean).join(', ').slice(0,60),category:v.category}));
    voiceCache={at:now(),voices:list.length?list:ELEVEN_VOICES};
   }catch(e){console.error('[live-voice]',e.message);return json(200,{configured:true,voices:ELEVEN_VOICES,note:'Showing the standard voices; the account list did not load.'});}
  }
  return json(200,{configured:true,voices:voiceCache.voices});
 }
 if(req.method!=='POST')return json(405,{error:'Use POST.'});
 const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
 if(!origin||origin!==`https://${host}`&&!(env.LIVE_DEV_ORIGIN&&origin===env.LIVE_DEV_ORIGIN))return json(403,{error:'Open live mode from the game.'});
 if(env.LIVE_MODE_ENABLED==='false')return json(503,{error:'Live mode is switched off.'});
 if(!key)return json(503,{error:'ElevenLabs is not connected yet.'});
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return json(400,{error:'Invalid request.'});}
 if(!body||typeof body!=='object')return json(400,{error:'Invalid request.'});
 const preview=body.preview===true;
 // Per address: a session says a few hundred lines an hour; previews are a handful.
 const at=now(),ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0];
 const [max,window]=preview?[40,3600000]:[900,3600000],bucket=(preview?'preview:':'speak:')+ip;
 for(const [k,v]of buckets)if(at-v.at>v.window)buckets.delete(k);
 const rate=buckets.get(bucket)||{at,n:0,window};if(rate.n>=max)return json(429,{error:'Please wait a little and try again.'});rate.n++;buckets.set(bucket,rate);
 if(!preview&&!checkTicket(body.ticket,env,at,'voice:'))return json(401,{error:'Live mode session expired. Tap Talk again.'});
 const voice=typeof body.voice==='string'&&ELEVEN_VOICE_PATTERN.test(body.voice)?body.voice:null;
 if(!voice)return json(400,{error:'Pick a voice.'});
 const text=preview?PREVIEW:typeof body.text==='string'?body.text.replace(/\s+/g,' ').trim().slice(0,400):'';
 if(!text)return json(400,{error:'Nothing to say.'});
 if(!screen(text,{level:'speech'}).ok)return json(422,{error:'Not said.'});
 // Every spoken character is charged to the player first: the ticket's for a session, the cookie's for a preview.
 const me=preview?who(req,env):ticketAccount(body.ticket);
 if(!me)return json(401,{error:'Sign in to hear the voices.'});
 if(!await purse().charge(me,text.length*PRICES.elevenChar))return json(402,{error:'The voice has used up its magic for now.',budget:true});
 const speed=Number.isFinite(body.speed)?Math.min(1.2,Math.max(0.7,body.speed)):1;
 try{
  const r=await fetcher(`${API}/v1/text-to-speech/${voice}/stream?output_format=pcm_24000`,{method:'POST',signal:AbortSignal.timeout(15000),
   headers:{'xi-api-key':key,'Content-Type':'application/json',Accept:'audio/pcm'},
   body:JSON.stringify({text,model_id:MODEL,voice_settings:{stability:0.5,similarity_boost:0.75,speed}})});
  if(!r.ok||!r.body){console.error('[live-voice] tts',r.status,(await r.text().catch(()=>'')).slice(0,200));return json(502,{error:'The voice did not answer.'});}
  res.statusCode=200;res.setHeader('Content-Type','audio/pcm;rate=24000');
  const reader=r.body.getReader();
  for(;;){const {done,value}=await reader.read();if(done)break;res.write(Buffer.from(value));}
  res.end();
 }catch(e){console.error('[live-voice]',e.message);if(!res.headersSent)return json(502,{error:'The voice did not answer.'});res.end();}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
