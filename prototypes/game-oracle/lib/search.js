import catalog from '../data/catalog.json' with {type:'json'};
import dictionary from '../data/dictionary.json' with {type:'json'};
export {catalog,dictionary};
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9.]+/g,' ').trim();
export function expand(q){
  let remaining=norm(q), groups=[];
  for(const concept of dictionary){
    const aliases=[concept.term,...concept.aliases].map(norm).sort((a,b)=>b.length-a.length);
    const matched=aliases.find(a=>(' '+remaining+' ').includes(' '+a+' '));
    if(matched){groups.push({input:matched,terms:[...new Set(aliases)],concept:concept.term}); remaining=(' '+remaining+' ').replaceAll(' '+matched+' ',' ').trim();}
  }
  for(const word of remaining.split(/\s+/).filter(Boolean))if(!['a','an','the','and','with','game','games','like','style','art'].includes(word))groups.push({input:word,terms:[word]});
  return groups;
}
export function search(params={}){
  const q=String(params.q||'').slice(0,240),groups=expand(q),offset=Math.max(0,parseInt(params.offset)||0),limit=Math.min(100,Math.max(1,parseInt(params.limit)||30));
  let rows=catalog.games.filter(g=>(!params.ownership||g.ownership===params.ownership)&&(!params.installed||String(g.installation.present)===params.installed)&&(!params.status||g.styleStatus===params.status)&&(!params.dimension||g.styles.dimension.includes(params.dimension))&&(!params.perspective||g.styles.perspective.includes(params.perspective))&&(!params.rendering||g.styles.rendering.includes(params.rendering)));
  rows=rows.map(g=>{
    let score=0,matched=[];
    const sections=[[g.name,9],[Object.values(g.styles).flat().join(' '),7],[g.tags.join(' '),3],[g.summary,1]];
    for(const group of groups){let best=0;for(const [text,weight]of sections)if(group.terms.some(t=>(' '+norm(text)+' ').includes(' '+t+' ')))best=Math.max(best,weight);if(best){score+=best;matched.push(group.concept||group.input);}}
    if(norm(g.name)===norm(q)&&q)score+=30;
    return {...g,score,matchedConcepts:matched};
  }).filter(g=>!groups.length||g.score>0);
  if(q)rows.sort((a,b)=>b.matchedConcepts.length-a.matchedConcepts.length||b.score-a.score||a.name.localeCompare(b.name));
  return {version:catalog.meta.version,query:q,method:catalog.meta.searchVersion,expandedConcepts:groups,total:rows.length,offset,limit,results:rows.slice(offset,offset+limit)};
}
export function similar(id){
 const base=catalog.games.find(g=>g.id===id);if(!base)return null;
 const values=g=>Object.entries(g.styles).flatMap(([k,v])=>v.map(t=>k+': '+t));const terms=new Set(values(base));
 return {version:catalog.meta.version,source:id,method:'shared source-reported art attributes',results:catalog.games.filter(g=>g.id!==id).map(g=>({...g,shared:values(g).filter(t=>terms.has(t))})).filter(g=>g.shared.length).sort((a,b)=>b.shared.length-a.shared.length||a.name.localeCompare(b.name)).slice(0,12)};
}
