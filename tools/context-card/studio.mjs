// node tools/context-card/studio.mjs [--build|--check] [--study ID] [--question TEXT]
// Optional --evidence FILE accepts an authorized app/database export. It never writes that export to public output.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {studioPacket, studioText} from '../../prototypes/ranch-atelier/dist/look/studio-context.mjs';
const root = new URL('../../', import.meta.url);
const path = new URL('prototypes/ranch-atelier/dist/studies/context.json', root);
const args=process.argv.slice(2), value=k=>args.includes(k)?args[args.indexOf(k)+1]:'';
const data=JSON.parse(readFileSync(path,'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const normalized=x=>x.replace(/\r\n/g,'\n');
const sources=Object.fromEntries([...new Set(data.studio.entries.map(e=>e.ref))].sort().map(ref=>[ref,hash(normalized(readFileSync(new URL(ref,root),'utf8')))]));
const {revision, sourceHashes, ...content}=data.studio;
const next={...content,sourceHashes:sources,revision:hash(JSON.stringify({content,sources})).slice(0,16)};
const bundle=new URL('prototypes/game-oracle/data/studio-context.json',root);
if(args.includes('--build')) {
  data.studio=next;
  writeFileSync(path,JSON.stringify(data,null,2)+'\n');
  writeFileSync(bundle,JSON.stringify(next,null,2)+'\n');
  console.log(`Studio context ${next.revision}; source changes require reviewing the summaries before publishing.`);
} else if(args.includes('--check')) {
  if(JSON.stringify(data.studio)!==JSON.stringify(next) || JSON.stringify(JSON.parse(readFileSync(bundle,'utf8')))!==JSON.stringify(next)) throw new Error('Studio context stale: review changed sources, then run --build');
  console.log(`Studio context ${next.revision} current`);
} else {
  const raw=value('--evidence')?JSON.parse(readFileSync(value('--evidence'),'utf8')):[];
  const evidence=Array.isArray(raw)?raw:raw.items;
  if(!Array.isArray(evidence)) throw new Error('Evidence must be an array or {items:[]}');
  const packet=studioPacket(data,{study:value('--study'),question:value('--question'),evidence});
  packet.stale=revision!==next.revision;
  console.log(args.includes('--json')?JSON.stringify(packet,null,2):studioText(packet)+(packet.stale?'\n\nWARNING: sources changed; review before relying on this brief.':''));
}
