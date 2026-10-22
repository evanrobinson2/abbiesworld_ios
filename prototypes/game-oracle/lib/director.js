// The Oracle's director: a plain-language idea in, a game design plan out. The plan holds the rules,
// story beats and choices, a presentation style, and requests for the model, sound, voice and music
// factories, grounded in the studies the Oracle holds. It never emits code and never copies a game's
// expression (art, text, characters, levels); it takes style and mechanics only (GAME_IDENTITY.md).
import {searchKnowledge,styles,HOUSE_IDENTITY,repo,identityCard} from './knowledge.js';

export const PLAN_SCHEMA='oracle.plan.v1';
export const DEFAULT_MODEL='anthropic/claude-sonnet-5.5';
export const STYLE_IDS=styles.styles.map(s=>s.id);
const FACTORIES=['model','sound','voice','music'];
export const AUDIENCES=['kid','family','maker'];

// Retrieval: the few studies that bear on this idea, plus the style it suggests.
export function retrieve(idea,{style}={}){
 const hits=searchKnowledge({q:idea,limit:30}).results;
 const pick=(kinds,n)=>hits.filter(h=>kinds.includes(h.kind)).slice(0,n);
 let identities=pick(['identity'],3);
 // With nothing specific, the house identity's five reference games are the default.
 if(!identities.length)identities=repo.identities.slice(0,3).map(identityCard);
 const studies=pick(['anatomy','lesson'],3),catalog=pick(['catalog'],3);
 const styleHit=style&&STYLE_IDS.includes(style)?style:hits.find(h=>h.kind==='style'&&h.score>0)?.id||'clean';
 return {identities,studies,catalog,style:styles.styles.find(s=>s.id===styleHit)};
}

function audienceRules(audience){
 if(audience==='maker')return 'The audience is a game maker (Evan). Be specific and technical where it helps.';
 return `The players are ${audience==='kid'?'young children (about 4 to 8), often Abbie, who may not read yet':'a family playing together, including young children'}. Everything is PG and gentle: cartoon silliness is fine; no gore, real weapons, romance, drugs, alcohol, gambling, brands, real people or frightening real-world danger. Never give homework answers in any form. Rules are short enough to say out loud. Prefer no fail state or instant retries. Choices have two or three options and no harsh timer.`;
}

export const SYSTEM_PROMPT=`You are the Game Oracle of Abbie's World, a 3D toy-world game (three.js) built by a family. You are a game designer and narrative director. You turn a plain-language idea into a design plan the game's systems can build: rules, story beats, choices, a presentation style, and requests to the asset factories.

Ground rules:
- Take style and mechanics from the reference games, never their expression: no characters, names, text, levels, art or music from any existing game, film or book. Say what to take and what to leave.
- Default to the house identity of Abbie's World unless the idea asks otherwise:
${HOUSE_IDENTITY.map(s=>'  - '+s).join('\n')}
- The world is a miniature ranch and countryside with people, animals, buildings, weather and a day clock. Things can be built from shapes or ordered as proper models from the workshop. The voice can speak lines, show captions, move the camera and change time and weather.
- Keep it small enough to build: at most 6 rules, 6 beats, 3 choices, 6 model requests, 6 sounds, 4 voices, 2 music cues.
- Presentation style is one of: ${STYLE_IDS.join(', ')}.

Reply with one JSON object only, exactly this shape:
{"reading": "<one sentence: how you understood the idea>",
 "title": "<2 to 5 words>", "pitch": "<one or two sentences>", "fantasy": "<you are ... who ...>",
 "verbs": ["<core player verbs, at most 5>"],
 "rules": [{"rule": "<one sentence>", "why": "<short>"}],
 "goal": "<what counts as done or won>", "fail": "<what happens on a mistake, or null>",
 "beats": [{"title": "<short>", "what": "<what happens>", "player": "<what the player does>"}],
 "choices": [{"atBeat": <beat index from 0>, "prompt": "<question>", "options": [{"label": "<short>", "consequence": "<what changes>"}], "timerSeconds": <number or null>, "remembered": "<what the world remembers, or null>"}],
 "presentation": {"style": "<style id>", "why": "<short>", "overlays": ["<overlay>"], "readAloud": <true|false>},
 "factory": [{"factory": "model|sound|voice|music", "name": "<short id>", "brief": "<what to make>", "for": "<rule, beat or character it serves>"}],
 "references": [{"title": "<game title from the context>", "take": "<style or mechanic we take>", "leave": "<expression we leave>"}],
 "kidFit": "<who can play it and how>"}`;

function contextFor(idea,audience,ctx){
 return JSON.stringify({idea,audience:audienceRules(audience),
  suggestedStyle:{id:ctx.style.id,summary:ctx.style.summary,overlays:ctx.style.overlays,pacing:ctx.style.pacing,kidFit:ctx.style.kidFit},
  referenceIdentities:ctx.identities.map(({title,fantasy,pillars,signatureMoment,antiGoals,signatures,take,leave})=>({title,fantasy,pillars,signatureMoment,antiGoals,signatures:(signatures||[]).map(s=>s.description),take:(take||[]).map(t=>t.setting),leave})),
  studies:ctx.studies.map(s=>({title:s.title,genre:s.genre,findings:s.findings.slice(0,3).map(f=>f.title+': '+f.finding)})),
  artReferences:ctx.catalog.map(c=>({title:c.title,styles:c.styles}))});
}

// Shape and trim whatever the model returned; anything unusable becomes a clear error, never a half plan.
const str=(v,n=400)=>typeof v==='string'&&v.trim()?v.trim().slice(0,n):null;
const arr=(v,n)=>Array.isArray(v)?v.slice(0,n):[];
export function normalisePlan(raw,{idea,audience,source,model,ctx}){
 if(!raw||typeof raw!=='object')throw new Error('The Oracle returned no plan.');
 const beats=arr(raw.beats,6).map(b=>({title:str(b?.title,80),what:str(b?.what),player:str(b?.player)})).filter(b=>b.title&&b.what);
 const style=STYLE_IDS.includes(raw.presentation?.style)?raw.presentation.style:ctx.style.id;
 const styleDef=styles.styles.find(s=>s.id===style);
 const plan={schema:PLAN_SCHEMA,idea,audience,source,model:model||null,
  reading:str(raw.reading),title:str(raw.title,60),pitch:str(raw.pitch),fantasy:str(raw.fantasy),
  verbs:arr(raw.verbs,5).map(v=>str(v,40)).filter(Boolean),
  rules:arr(raw.rules,6).map(r=>({rule:str(r?.rule??r,240),why:str(r?.why,160)})).filter(r=>r.rule),
  goal:str(raw.goal),fail:str(raw.fail),
  beats,
  choices:arr(raw.choices,3).map(c=>({atBeat:Number.isInteger(c?.atBeat)&&c.atBeat>=0&&c.atBeat<beats.length?c.atBeat:null,prompt:str(c?.prompt,160),
   options:arr(c?.options,3).map(o=>({label:str(o?.label,40),consequence:str(o?.consequence,200)})).filter(o=>o.label),
   timerSeconds:typeof c?.timerSeconds==='number'&&c.timerSeconds>0?Math.min(30,c.timerSeconds):null,remembered:str(c?.remembered,160)})).filter(c=>c.prompt&&c.options.length>=2),
  presentation:{style,name:styleDef.name,why:str(raw.presentation?.why,200),overlays:arr(raw.presentation?.overlays,6).map(o=>str(o,40)).filter(Boolean),
   readAloud:typeof raw.presentation?.readAloud==='boolean'?raw.presentation.readAloud:styleDef.readAloud||audience==='kid',pacing:styleDef.pacing},
  factory:arr(raw.factory,18).map(f=>({factory:FACTORIES.includes(f?.factory)?f.factory:null,name:str(f?.name,48),brief:str(f?.brief,300),for:str(f?.for,120)})).filter(f=>f.factory&&f.name&&f.brief),
  references:arr(raw.references,6).map(r=>({title:str(r?.title,80),take:str(r?.take,240),leave:str(r?.leave,240)})).filter(r=>r.title),
  kidFit:str(raw.kidFit),
  grounding:{identities:ctx.identities.map(i=>i.title),studies:ctx.studies.map(s=>s.title),styleSuggested:ctx.style.id}};
 if(!plan.title||!plan.rules.length||!plan.beats.length)throw new Error('The Oracle plan was missing a title, rules or beats.');
 return plan;
}

// Without a model the Oracle still answers, from its studies alone: the house identity, the closest
// reference games' takeaways and the suggested style. Marked source "studies" so callers can tell.
export function studiesPlan(idea,audience,ctx){
 const take=ctx.identities.flatMap(i=>(i.take||[]).map(t=>({title:i.title,t})));
 return normalisePlan({
  reading:`No model was used; this plan is assembled from the Oracle's studies for "${idea.slice(0,120)}".`,
  title:idea.split(/\s+/).slice(0,5).join(' '),pitch:`A small ${ctx.style.name.toLowerCase()} game built around: ${idea.slice(0,200)}`,
  fantasy:ctx.identities[0]?.fantasy||null,verbs:['build','place','watch'],
  rules:[...take.filter(x=>/rules|pacing|mechanic/i.test(x.t.layer+x.t.target)).map(x=>({rule:x.t.setting,why:'From '+x.title})),...HOUSE_IDENTITY.slice(4).map(h=>({rule:h,why:'House identity'}))].slice(0,6),
  goal:'Finish the thing you set out to build, or keep playing as long as you like.',fail:null,
  beats:[{title:'Set the scene',what:'The world shows where the game happens.',player:'Looks around and taps.'},{title:'Play',what:'The core verbs, repeated, with the world answering each one.',player:'Builds and places.'},{title:'Payoff',what:'The world celebrates what was made.',player:'Watches and shares.'}],
  choices:[],presentation:{style:ctx.style.id,why:'Suggested by the idea\'s words.',overlays:ctx.style.overlays,readAloud:ctx.style.readAloud},
  factory:[],references:ctx.identities.map(i=>({title:i.title,take:(i.take||[]).map(t=>t.setting).join(' '),leave:(i.leave||[]).join('; ')})),
  kidFit:ctx.style.kidFit},{idea,audience,source:'studies',model:null,ctx});
}

export function gatewayToken(req,env=process.env){
 const oidc=req?.headers?.['x-vercel-oidc-token']||env.VERCEL_OIDC_TOKEN;
 return oidc?{token:oidc,method:'oidc'}:env.AI_GATEWAY_API_KEY?{token:env.AI_GATEWAY_API_KEY,method:'api-key'}:null;
}

// consult({idea, audience, style}) → plan. Uses the AI Gateway when a credential is given, else studies only.
export async function consult({idea,audience='family',style}={},{fetcher=fetch,credential=null,model=DEFAULT_MODEL,timeoutMs=45000}={}){
 idea=typeof idea==='string'?idea.trim():'';
 if(idea.length<3)throw Object.assign(new Error('Describe the idea in a few words.'),{status:400});
 if(idea.length>1200)throw Object.assign(new Error('Keep the idea under 1200 characters.'),{status:400});
 if(!AUDIENCES.includes(audience))throw Object.assign(new Error('audience must be one of '+AUDIENCES.join(', ')),{status:400});
 if(style!==undefined&&style!==null&&style!==''&&!STYLE_IDS.includes(style))throw Object.assign(new Error('style must be one of '+STYLE_IDS.join(', ')),{status:400});
 const ctx=retrieve(idea,{style});
 if(!credential)return studiesPlan(idea,audience,ctx);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const r=await fetcher('https://ai-gateway.vercel.sh/v1/chat/completions',{method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${credential.token}`,'Content-Type':'application/json','ai-gateway-auth-method':credential.method},
   body:JSON.stringify({model,max_tokens:3000,response_format:{type:'json_object'},messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:contextFor(idea,audience,ctx)}]})});
  if(!r.ok){const detail=(await r.text().catch(()=>'')).slice(0,300);throw Object.assign(new Error(`AI Gateway answered ${r.status}`),{status:502,detail});}
  const body=await r.json(),text=body?.choices?.[0]?.message?.content||'';
  const json=JSON.parse(String(text).replace(/^```(?:json)?\s*|\s*```$/g,''));
  return {...normalisePlan(json,{idea,audience,source:'model',model,ctx}),usage:body.usage||null};
 }finally{clearTimeout(timer);}
}
