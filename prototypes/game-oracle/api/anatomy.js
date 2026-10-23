import {anatomy,searchAnatomy} from '../lib/anatomy.js';
export default function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const p=new URL(req.url,'https://oracle.invalid').searchParams;
 for(const k of p.keys())if(!k.startsWith('_vercel')&&!['id','q','genre','domain','limit','offset'].includes(k))return res.status(400).json({error:'Unknown parameter: '+k});
 if(p.has('id')){const game=anatomy.games.find(g=>g.id===p.get('id'));return res.status(game?200:404).json(game||{error:'Unknown anatomy ID'});}
 const limit=Number(p.get('limit')??30),offset=Number(p.get('offset')??0);
 if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||(p.get('q')||'').length>240)return res.status(400).json({error:'Invalid query, limit or offset'});
 return res.json(searchAnatomy({q:p.get('q')||'',genre:p.get('genre')||'',domain:p.get('domain')||'',limit,offset}));
}
