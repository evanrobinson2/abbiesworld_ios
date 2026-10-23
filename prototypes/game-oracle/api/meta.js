import {catalog,dictionary} from '../lib/search.js';
export default function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','public, s-maxage=3600');
 res.json({...catalog.meta,facets:Object.fromEntries(['dimension','perspective','rendering','palette','animation','materials'].map(k=>[k,[...new Set(catalog.games.flatMap(g=>g.styles[k]))].sort()])),dictionary});
}
