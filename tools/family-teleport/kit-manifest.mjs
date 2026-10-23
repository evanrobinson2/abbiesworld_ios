// Writes the Family Teleport kit manifest: one entry per procedural model with its parts,
// triangle budget per detail level, matching words and recipe source. Run from the repo root:
//   node --no-warnings --experimental-loader ./prototypes/ranch-atelier/dist/scripts/character-motion-loader.mjs tools/family-teleport/kit-manifest.mjs
import {writeFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
const dist=new URL('../../prototypes/ranch-atelier/dist/',import.meta.url);
const {KIT,KIT_IDS,build,triangles,match}=await import(new URL('teleport/kit.mjs',dist));
const {WORLDS,SAMPLE_ANSWERS,modelOrder}=await import(new URL('teleport/worlds.mjs',dist));
const {parse}=await import(new URL('teleport/commands.mjs',dist));

function parts(o,depth=0){return o.children.filter(c=>!c.isSprite).map(c=>c.isMesh?c.name:{[c.name]:parts(c,depth+1)});}
const commit=(()=>{try{return execSync('git rev-parse --short HEAD').toString().trim();}catch{return null;}})();
const models=KIT_IDS.map(id=>{const k=KIT[id],full=build(id,{detail:2});return {
 id,name:k.name,category:k.cat,heightInPeople:k.h,colors:k.c,matches:[...new Set(k.tags)],
 triangles:{blockout:triangles(build(id,{detail:0})),simple:triangles(build(id,{detail:1})),full:triangles(full)},
 parts:parts(full.children[0]?.isMesh?full:full),
 usedIn:WORLDS.filter(w=>w.place.some(p=>p.k===id)).map(w=>w.id)};});
const manifest={kind:'family-teleport/kit',version:1,generatedAt:new Date().toISOString(),commit,
 units:'1 = an adult toy person; y up; models face +z',source:'prototypes/ranch-atelier/dist/teleport/kit.mjs',
 purpose:'Simple, recognisable, kid-scale models that a madlib answer can summon instantly with no download or model tokens. Answers the kit cannot match become new model orders for the modeler.',
 tools:[{name:'three.js procedural recipe',version:'r170'}],count:models.length,models};
writeFileSync(new URL('teleport/kit-manifest.json',dist),JSON.stringify(manifest,null,1));

// Self-checks: every recipe builds at all three levels, and the parser understands the demo lines.
const fail=[];
for(const m of models)if(!m.triangles.blockout||m.triangles.full<m.triangles.blockout)fail.push('detail levels: '+m.id);
const expect={'make it night':'time','make it snow':'weather','everybody dance':'emote','add 5 unicorns':'spawn','switch it up':'remix','make the sky green':'sky','next world':'go'};
for(const [line,act] of Object.entries(expect)){const r=parse(line,{present:['t-rex']});if(!r.actions.some(a=>a.do===act))fail.push('parse: '+line);}
if(parse('add 5 unicorns').actions[0]?.count!==5)fail.push('parse count');
if(parse('make the t-rex giant',{present:['t-rex']}).actions[0]?.do!=='scale')fail.push('parse scale');
if(match('hot dogs')?.id!=='hot-dog'||match('rocket ship')?.id!=='rocket'||match('lightsaber')?.id!==null)fail.push('match');
const order=modelOrder(SAMPLE_ANSWERS,match);
console.log(`${models.length} kit models; demo needs ${order.length} (${order.filter(o=>!o.id).length} new); full-detail triangles ${models.reduce((a,m)=>a+m.triangles.full,0)}`);
if(fail.length){console.error('FAIL',fail);process.exit(1);}console.log('checks PASS');
