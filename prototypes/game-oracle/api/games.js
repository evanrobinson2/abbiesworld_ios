import {search,catalog,similar} from '../lib/search.js';
export default function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
 if(req.method!=='GET')return res.status(405).json({error:'Read-only API. Use GET.'});
 const p=Object.fromEntries(new URL(req.url,'https://oracle.invalid').searchParams);
 if(p.id){const game=catalog.games.find(g=>g.id===p.id);return res.status(game?200:404).json(game?{version:catalog.meta.version,game}:{error:'Unknown game ID'});}
 if(p.similar){const result=similar(p.similar);return res.status(result?200:404).json(result||{error:'Unknown game ID'});}
 for(const [key,allowed]of Object.entries({ownership:['owned-snapshot','unverified'],installed:['true','false'],status:['source-reported','unclassified']}))if(p[key]&&!allowed.includes(p[key]))return res.status(400).json({error:'Invalid '+key,allowed});
 return res.status(200).json(search(p));
}
