// Ranch model style (Evan, 2026-10-22): "normal" or "charming" (the storybook-toy set from tools/ranch-rebuild).
// Charming files mirror the normal ones in a parallel tree whose top folder ends in -charming
// (/simulation-assets-charming/..., /simulations/regional-assets-charming/..., /garden-assets-charming/...).
// With charming on, every loader of the 35 rebuilt Ranch assets tries that file first and falls back to the
// normal one when it is missing, so a partly modelled charming set still builds a whole tile.
// Import this module without a query string so every loader shares one style.
const MESH=new Set(['family-home','feed-store','water-point','cattle-shelter','goat-shelter','chicken-coop','shelter','horse','cow','goat','chicken','tree','hay','ration','water-bucket','water-trough']);
const GLB=new Set(['WW-139','WW-151','GF-153','GF-158','GF-159','GF-010','GF-249','GF-250','GF-567','GF-634','GF-679','UP-051','WW-046','WW-273','WW-347','GF-019','GF-020','GF-074','GF-194']);
export const MODEL_STYLES=['normal','charming'];
let style='normal',listing;const missing=new Set();
// tools/ranch-rebuild/to_game.py lists the installed charming files here; without the list every twin is tried.
const installed=()=>listing??=fetch('/simulation-assets-charming/manifest.json').then(r=>r.ok?r.json():null).then(a=>Array.isArray(a)?new Set(a):null).catch(()=>null);
export function modelStyle(){return style;}
export function setModelStyle(next){style=next==='charming'?'charming':'normal';return style;}

// The charming twin of one of the 35 assets' URLs, or null for anything else.
export function charmingUrl(url){
 const m=/^(.*?)(simulation-assets|regional-assets|garden-assets)\/((?:[\w-]+\/)*)([\w-]+)(\.json|\.glb)$/.exec(url);if(!m)return null;
 const [,head,folder,dirs,name,ext]=m;
 if(folder==='simulation-assets'?!MESH.has(name.replace(/-[a-z]+$/,'')):!GLB.has(name))return null;
 return head+folder+'-charming/'+dirs+name+ext;
}

// load(url) -> promise. Charming first when it is on and the twin is installed; any failure there (a 404 while
// the set is being modelled) falls back to the normal file, and the miss is remembered for this visit.
export async function styledLoad(url,load){
 const twin=style==='charming'&&charmingUrl(url);
 if(twin&&!missing.has(twin)){const have=await installed();
  if(have&&!have.has(new URL(twin,document.baseURI).pathname))missing.add(twin);
  else try{return await load(twin);}catch{missing.add(twin);}}
 return load(url);
}
export const styledJSON=url=>styledLoad(url,u=>fetch(u).then(r=>{if(!r.ok)throw Error('Cannot load '+u);return r.json();}));
// Cache key for template maps: assets that have a charming twin get a separate entry while charming is on.
export const styleKey=(id,url)=>style==='charming'&&charmingUrl(url)?'charming:'+id:id;
