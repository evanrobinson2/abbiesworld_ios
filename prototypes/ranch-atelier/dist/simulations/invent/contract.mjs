// Make (the player build harness): a few words become one new thing in the world.
// Shared by the server (api/invent.js) and the page (invent.mjs) so the limits cannot drift. See INVENT.md.
// The designer model only ever returns data in the live `build` shape (simulations/live/policy.mjs): toy parts
// from the holodeck kit, no code, no assets, no text in the world. constrain() is the one gate every recipe
// passes, from the designer, from the shared cache, from a saved make, or from Suzy's voice build.
import {SHAPES,BEHAVIORS} from '../holodeck/protocol.mjs';
import {screen} from '../live/policy.mjs';

export const INVENT_VERSION='invent/1';
export const LIMITS={parts:24,voice:{maxParts:40,reach:12,maxScale:12},words:160,name:40,say:120,size:[0.3,6],at:1.6,partScale:[0.02,2]};
export const KIT=SHAPES.filter(s=>s!=='empty');
// Whole-thing and part behaviours. chase (walk after people) stays with the voice, which can see who is near.
export const MOVES=BEHAVIORS.filter(b=>b!=='chase');

export const DESIGNER_PROMPT=`You design one toy for Abbie's World, a 3D miniature toy world for young children. A child describes something in a few words and you build it from simple toy shapes, like a designer at a toy company working with wooden blocks.

Answer with JSON only:
{"name": string, "say": string, "size": number, "behavior": string, "parts": [{"id": string, "shape": string, "at": [x,y,z], "scale": number or [x,y,z], "rotation": [x,y,z], "color": "#rrggbb", "emissive": "#rrggbb", "behavior": string}]}

- name: what it is, 1-4 friendly words ("Rainbow Dragon"). No real people, brands or characters from films, books or games: make your own friendly version and name it plainly.
- say: one short, cheerful line for the child (at most 12 words), e.g. "Here's your rainbow dragon!"
- size: how tall the whole thing is, in person heights: a cat 0.3, a pony 1, a tree 4, a tower 6.
- behavior (whole thing) and part behavior: one of ${MOVES.join(', ')}. Usually none; use bob for floaty things, spin for windmill sails or wheels, hop for bouncy animals, pulse for glowing things.
- parts: 6 to ${LIMITS.parts} parts. Shapes: ${KIT.join(', ')}.
- Space: the thing's own space. [0,0,0] is the middle of its base on the ground and y=1 is its top. x is left-right, z is front-back. Keep x and z between -1 and 1 and y between 0 and 1.
- Every shape is one unit tall with its base at "at": a box at [0,0.2,0] with scale [0.6,0.3,0.4] spans y 0.2 to 0.5. scale is relative to the whole thing (1 is the whole thing). Make parts touch so nothing floats unless it should (clouds, halos).
- rotation is degrees about x, y, z. torus and ring lie flat; rotate [90,0,0] to stand them up like wheels.
- Use rich, warm toy colours. emissive only for things that glow (lanterns, stars, eyes).
- Make it recognisable: the parts a child would point at (head, ears, eyes, tail, wheels, roof, door, chimney).
- Ids are short lowercase words with dashes ("left-ear").
- Never add text, numbers, letters, signs with writing, weapons, or anything scary or not PG. If the request is not something a kind toy maker would build for a five-year-old, make the closest friendly toy instead.`;

const HEX=/^#[0-9a-fA-F]{6}$/;
const num=(v,lo,hi,d)=>Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):d;
const round=v=>Math.round(v*1000)/1000;
const vec=(v,lo,hi,d)=>Array.isArray(v)&&v.length===3?v.map((x,i)=>round(num(x,lo[i]??lo,hi[i]??hi,d[i]))):null;
const slug=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const clean=(s,max)=>typeof s==='string'?s.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';

// The words a cache entry is filed under: case, spacing and punctuation don't make a new invention.
export function wishKey(text){return clean(text,LIMITS.words).toLowerCase().replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim();}

// Any recipe -> a safe build in the live `build` shape, or an Error. Out-of-range numbers are pulled in, unknown
// shapes and fields are dropped, text that fails the PG screen is replaced. A recipe with no usable parts fails.
// The voice (Suzy) builds bigger scenes, so it passes wider bounds; the toy kit, colours and text rules are the same.
export function constrain(raw,{maxParts=LIMITS.parts,id,reach=LIMITS.at,maxScale=LIMITS.partScale[1]}={}){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.parts))throw Error('That one didn’t come out right. Try saying it another way.');
 const seen=new Set(),parts=[];
 for(const p of raw.parts){
  if(parts.length>=maxParts)break;
  if(!p||typeof p!=='object'||!KIT.includes(p.shape))continue;
  let pid=slug(p.id).slice(0,20)||p.shape;if(!screen(pid).ok)pid=p.shape;
  while(seen.has(pid))pid=pid.replace(/-\d+$/,'')+'-'+(parts.length+1);
  seen.add(pid);
  const part={id:pid,shape:p.shape};
  const at=vec(p.at,[-reach,-0.2,-reach],[reach,reach,reach],[0,0,0]);if(at)part.at=at;
  const lo=LIMITS.partScale[0],hi=maxScale;
  if(Number.isFinite(p.scale))part.scale=round(num(p.scale,lo,hi,0.2));else{const s=vec(p.scale,lo,hi,[0.2,0.2,0.2]);if(s)part.scale=s;}
  const rot=vec(p.rotation,-360,360,[0,0,0]);if(rot&&rot.some(Boolean))part.rotation=rot;
  if(HEX.test(p.color))part.color=p.color.toLowerCase();
  if(HEX.test(p.emissive)&&p.emissive!=='#000000')part.emissive=p.emissive.toLowerCase();
  if(Number.isFinite(p.opacity)&&p.opacity<1)part.opacity=round(num(p.opacity,0.2,1,1));
  if(MOVES.includes(p.behavior)&&p.behavior!=='none')part.behavior=p.behavior;
  parts.push(part);
 }
 if(!parts.length)throw Error('That one didn’t come out right. Try saying it another way.');
 let name=clean(raw.name,LIMITS.name);if(!name||!screen(name).ok)name='My invention';
 let say=clean(raw.say,LIMITS.say);if(!say||!screen(say,{level:'speech'}).ok)say=`Here's your ${name.toLowerCase()}!`;
 const out={id:id||slug(name).slice(0,24)||'invention',name,say,scale:round(num(raw.size??raw.scale,LIMITS.size[0],LIMITS.size[1],1)),parts};
 if(MOVES.includes(raw.behavior)&&raw.behavior!=='none')out.behavior=raw.behavior;
 return out;
}

// A made thing -> the live build tool's arguments (buildOps turns them into holodeck ops).
export function toBuild(recipe,{id,at,near}={}){
 const b={id:id||recipe.id,scale:recipe.scale,parts:recipe.parts};
 if(recipe.behavior)b.behavior=recipe.behavior;
 if(at)b.at=at;else if(near)b.near=near;
 return b;
}
