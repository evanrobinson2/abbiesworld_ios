// Search everything the Oracle knows, or read one game's identity record.
//   GET /api/knowledge?q=tile placing&kinds=identity,anatomy&limit=12
//   GET /api/knowledge?identity=dorfromantik   (slug or Steam app id)
import {searchKnowledge,getIdentity} from '../lib/knowledge.js';
import studioContext from '../data/studio-context.json' with {type:'json'};
const KINDS=['identity','steam-profile','anatomy','lesson','catalog','style'];
export default function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public, s-maxage=600');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const p=new URL(req.url,'https://oracle.invalid').searchParams;
 for(const k of p.keys())if(!k.startsWith('_vercel')&&!['q','kinds','limit','identity','studio'].includes(k))return res.status(400).json({error:'Unknown parameter: '+k});
 if(p.get('studio')==='1')return res.json(studioContext);
 if(p.has('identity')){const r=getIdentity(p.get('identity'));return res.status(r?200:404).json(r||{error:'No identity record or Steam profile for that game yet.'});}
 const kinds=p.has('kinds')?p.get('kinds').split(','):KINDS;
 if(kinds.some(k=>!KINDS.includes(k)))return res.status(400).json({error:'kinds must be from '+KINDS.join(', ')});
 const limit=Number(p.get('limit')??12);if(!Number.isInteger(limit)||limit<1||limit>50||(p.get('q')||'').length>240)return res.status(400).json({error:'Invalid q or limit'});
 return res.json(searchKnowledge({q:p.get('q')||'',kinds,limit}));
}
