import {catalog,dictionary,search,similar} from '../lib/search.js';
import {anatomy,searchAnatomy} from '../lib/anatomy.js';
import {searchKnowledge,getIdentity,steamLibrary} from '../lib/knowledge.js';
import {consult,gatewayToken,STYLE_IDS,DEFAULT_MODEL} from '../lib/director.js';
import {timingSafeEqual} from 'node:crypto';
const tools=[
 {name:'search_games',description:'Search the hosted Oracle art-style catalog. Source-reported tags, ownership snapshot and explicit unknowns are preserved.',inputSchema:{type:'object',properties:{q:{type:'string',maxLength:240},dimension:{type:'string'},perspective:{type:'string'},rendering:{type:'string'},ownership:{type:'string',enum:['owned-snapshot','unverified']},installed:{type:'string',enum:['true','false']},limit:{type:'integer',minimum:1,maximum:100},offset:{type:'integer',minimum:0}},additionalProperties:false}},
 {name:'get_game',description:'Get one game by stable Oracle ID with art claims, evidence and unknowns.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {name:'find_similar_games',description:'Find games sharing classified art attributes. Returns shared attributes, not embedding similarity.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {name:'get_catalog_coverage',description:'Inspect snapshot version, coverage gaps, counts and semantic search dictionary.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'search_game_anatomy',description:'Search evidence-qualified mechanics, systems, procedural generation, UI and asset studies. These are partial static studies, not observed playthroughs.',inputSchema:{type:'object',properties:{q:{type:'string',maxLength:240},genre:{type:'string'},domain:{type:'string'},limit:{type:'integer',minimum:1,maximum:100},offset:{type:'integer',minimum:0}},additionalProperties:false}},
 {name:'get_game_anatomy',description:'Read a complete technical study by anatomy ID, with source links, inventory URL, coverage and explicit gaps. Anatomy IDs are separate from Steam catalog IDs.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false}},
 {name:'search_oracle',description:'Search everything the Oracle knows in one ranked list: game identity records, Steam study profiles, anatomy studies, design lessons, the art catalog and presentation styles.',inputSchema:{type:'object',properties:{q:{type:'string',maxLength:240},limit:{type:'integer',minimum:1,maximum:50}},additionalProperties:false}},
 {name:'get_game_identity',description:'Read one game identity record (fantasy, pillars, signatures, nine layers, style-vs-expression ledger, what to take and leave) and its Steam study profile, by slug or Steam app id.',inputSchema:{type:'object',properties:{id:{type:'string',maxLength:80}},required:['id'],additionalProperties:false}},
 {name:'steam_library',description:"Evan's Steam library index: installed games and the owned snapshot, with art styles and whether an identity record or study profile exists.",inputSchema:{type:'object',properties:{q:{type:'string',maxLength:240},installed:{type:'string',enum:['true','false']}},additionalProperties:false}},
 {name:'consult_oracle',description:'Ask the Oracle to turn a plain-language game idea into a design plan: rules, story beats, choices, a presentation style ('+STYLE_IDS.join(', ')+') and requests for the model, sound, voice and music factories, grounded in its studies.',inputSchema:{type:'object',properties:{idea:{type:'string',maxLength:1200},audience:{type:'string',enum:['kid','family','maker']},style:{type:'string',enum:STYLE_IDS}},required:['idea'],additionalProperties:false}}
];
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');
 if(req.method!=='POST')return res.status(405).json({error:'Stateless MCP JSON-RPC endpoint. POST only.'});
 const b=req.body;if(!b||b.jsonrpc!=='2.0'||typeof b.method!=='string')return res.status(400).json({error:'Invalid JSON-RPC request'});
 if(b.id===undefined)return res.status(202).end();
 const reply=result=>res.json({jsonrpc:'2.0',id:b.id,result});const error=(code,message)=>res.json({jsonrpc:'2.0',id:b.id,error:{code,message}});
 if(b.method==='initialize')return reply({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'abbies-game-oracle',version:'1.1.0'}});
 if(b.method==='ping')return reply({});
 if(b.method==='tools/list')return reply({tools});
 if(b.method!=='tools/call')return error(-32601,'Method not found');
 const tool=tools.find(t=>t.name===b.params?.name);if(!tool)return error(-32602,'Unknown tool');
 const args=b.params.arguments||{};
 if(typeof args!=='object'||Array.isArray(args))return error(-32602,'Arguments must be an object');
 for(const k of Object.keys(args)){const rule=tool.inputSchema.properties[k];if(!rule)return error(-32602,'Unsupported argument: '+k);if(rule.type==='integer'&&(!Number.isInteger(args[k])||args[k]<(rule.minimum??0)||args[k]>(rule.maximum??Infinity)))return error(-32602,'Invalid '+k);if(rule.type==='string'&&(typeof args[k]!=='string'||args[k].length>(rule.maxLength??240)))return error(-32602,'Invalid '+k);if(rule.enum&&!rule.enum.includes(args[k]))return error(-32602,'Invalid '+k);}
 if(tool.inputSchema.required?.some(k=>!args[k]))return error(-32602,'Missing '+tool.inputSchema.required.join(', '));
 let result;
 if(tool.name==='search_games')result=search(args);
 if(tool.name==='get_game')result=catalog.games.find(g=>g.id===args.id);
 if(tool.name==='find_similar_games')result=similar(args.id);
 if(tool.name==='get_catalog_coverage')result={...catalog.meta,dictionary};
 if(tool.name==='search_game_anatomy')result=searchAnatomy(args);
 if(tool.name==='get_game_anatomy')result=anatomy.games.find(g=>g.id===args.id);
 if(tool.name==='search_oracle')result=searchKnowledge(args);
 if(tool.name==='get_game_identity')result=getIdentity(args.id);
 if(tool.name==='steam_library')result=steamLibrary({q:args.q,installed:args.installed?args.installed==='true':undefined});
 if(tool.name==='consult_oracle'){
  // The model runs only for callers holding the Oracle key; anyone else gets the studies-only plan.
  const key=process.env.ORACLE_KEY,given=req.headers?.['x-oracle-key'];
  const keyed=!!key&&typeof given==='string'&&given.length===key.length&&timingSafeEqual(Buffer.from(given),Buffer.from(key));
  try{result=await consult({audience:'family',...args},{credential:keyed&&process.env.ORACLE_MODEL_ENABLED!=='false'?gatewayToken(req):null,model:process.env.ORACLE_MODEL||DEFAULT_MODEL});}
  catch(e){return reply({content:[{type:'text',text:JSON.stringify({error:e.status===400?e.message:'The Oracle could not finish that plan.'})}],isError:true});}
 }
 return reply({content:[{type:'text',text:JSON.stringify(result||{error:'Unknown game ID'})}],isError:!result});
}
