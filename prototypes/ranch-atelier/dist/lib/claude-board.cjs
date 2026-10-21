const {createHash,timingSafeEqual}=require('node:crypto');
const PREFIX='sandbox-claude/v1/tiles/';
const TYPES=['ranch','paddock','sugar-shack','crop','meadow','moon','city'];
const URL='https://abbies-ranch-atelier.vercel.app/sandbox/Claude';
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length>0&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
function validate(a){
 if(!a||Object.keys(a).some(k=>!['slug','tileId','type','position','seed','settings'].includes(k)))throw Error('Unknown placement field');
 if(a.slug!==undefined&&a.slug!=='Claude')throw Error('This connection is restricted to Sandbox Claude');
 if(typeof a.tileId!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(a.tileId))throw Error('tileId must be 1–64 letters, numbers or hyphens; reuse it for retries');
 if(!TYPES.includes(a.type))throw Error('Unsupported tile type');
 const position=a.position??0,seed=a.seed??parseInt(createHash('sha256').update(a.tileId).digest('hex').slice(0,7),16);
 if(!Number.isInteger(position)||position<0||position>255)throw Error('position must be an integer from 0 to 255');
 if(!Number.isInteger(seed)||seed<0||seed>2147483647)throw Error('seed must be a nonnegative 31-bit integer');
 const settings=a.settings??{};
 if(!settings||Array.isArray(settings)||typeof settings!=='object')throw Error('Invalid settings');
 const bounds={complexity:[1,a.type==='moon'||a.type==='city'?3:4],vegetation:[0,4],variety:[0,5],variant:[1,5],density:[1,5]};
 for(const [k,v]of Object.entries(settings)){
  if(k==='planet'){if(a.type!=='moon'||!['moon','mars','alien'].includes(v))throw Error('Invalid planet');}
  else if(!bounds[k]||!Number.isInteger(v)||v<bounds[k][0]||v>bounds[k][1])throw Error('Invalid setting '+k);
 }
 return {id:'claude-'+a.tileId,type:a.type,position,seed,settings:Object.fromEntries(Object.entries(settings).sort())};
}
function createStore(blob){
 async function read(path){const r=await blob.get(path,{access:'private',useCache:false});return r?.statusCode===200?JSON.parse(await new Response(r.stream).text()):null;}
 async function board(){let cursor,paths=[];do{const page=await blob.list({prefix:PREFIX,limit:1000,...(cursor?{cursor}:{})});paths.push(...page.blobs.map(x=>x.pathname));cursor=page.hasMore?page.cursor:null;}while(cursor);const tiles=(await Promise.all(paths.map(read))).filter(Boolean).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));return {slug:'Claude',url:URL,tiles,revision:createHash('sha256').update(JSON.stringify(tiles)).digest('hex'),status:'Placements saved in cloud; the open Claude Sandbox renders them. Simulation and manual edits remain on each device.'};}
 async function place(args){const tile=validate(args),path=PREFIX+tile.id+'.json';const matches=old=>JSON.stringify({...old,createdAt:undefined})===JSON.stringify(tile);let old=await read(path);if(old){if(!matches(old))throw Error('tileId already exists with different settings');return {tile:old,status:'persisted',url:URL};}if((await board()).tiles.length>=32)throw Error('Claude board limit reached (32 remote tiles)');const value={...tile,createdAt:Date.now()};try{await blob.put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',cacheControlMaxAge:60});}catch(e){old=await read(path);if(!old||!matches(old))throw e;}return {tile:old||value,status:'persisted',url:URL,note:'Saved, not a rendering receipt. Open the Sandbox to render; it polls every five seconds.'};}
 return {board,place};
}
module.exports={createStore,validate,same,TYPES,URL};
