// Evan's Steam library, indexed: installed games (tools/steam-study snapshot) and the owned snapshot,
// joined to art styles, Steam study profiles and identity records.
//   GET /api/steam?q=tile&installed=true
import {steamLibrary} from '../lib/knowledge.js';
export default function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public, s-maxage=600');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const p=new URL(req.url,'https://oracle.invalid').searchParams;
 const inst=p.get('installed');if(inst&&!['true','false'].includes(inst))return res.status(400).json({error:'installed must be true or false'});
 if((p.get('q')||'').length>240)return res.status(400).json({error:'q is too long'});
 return res.json(steamLibrary({q:p.get('q')||'',installed:inst?inst==='true':undefined}));
}
