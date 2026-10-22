// Grown-up workbench only (GAME_FEEL Law 12): look switches and a "Copy view" link that lets
// Evan and an agent open the same build, scene, camera and settings.
const LOOK_KEY='sandbox-look',DEV_KEYS={enabled:'sandbox-developer',cartoon:'sandbox-cartoon',followZoom:'sandbox-zoom-compensated-detail'};
export const LOOK_LABELS={tiltShift:'Tilt-shift focus',glow:'Glow',grade:'Colour grade and vignette',haze:'Horizon haze'};

export function loadLook(){let saved={};try{saved=JSON.parse(localStorage.getItem(LOOK_KEY)||'{}')||{};}catch{}return Object.fromEntries(Object.keys(LOOK_LABELS).map(k=>[k,saved[k]!==false]));}
function saveLook(look){try{localStorage.setItem(LOOK_KEY,JSON.stringify(look));}catch{}}

const toBase64Url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromBase64Url=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function pipe(bytes,stream){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());}
export async function encodeView(view){return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(view)),new CompressionStream('deflate-raw')));}
async function decodeView(text){return JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(text),new DecompressionStream('deflate-raw'))));}

// A shared link carries #view=…; settings it names are written before the scene and overlays read them.
export async function readSharedView(){
 const match=/[#&]view=([\w-]+)/.exec(location.hash);if(!match)return null;
 try{const view=await decodeView(match[1]);if(view?.app!=='ranch-atelier')return null;
  if(view.look)saveLook({...loadLook(),...view.look});
  try{if(view.developer)for(const [key,storage]of Object.entries(DEV_KEYS))if(typeof view.developer[key]==='boolean')localStorage.setItem(storage,String(view.developer[key]));}catch{}
  history.replaceState(null,'',location.pathname+location.search);return view;
 }catch(error){console.warn('Shared view could not be read',error);return null;}
}

function developerSettings(){const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};return {enabled:read(DEV_KEYS.enabled)==='true',cartoon:read(DEV_KEYS.cartoon)==='true',followZoom:read(DEV_KEYS.followZoom)!=='false'};}

function describe(view,link){
 const c=view.config,clock=c.farmClock||{},hour=Math.floor(clock.hour??0),minute=Math.round(((clock.hour??0)%1)*60);
 const on=Object.entries(view.look).map(([k,v])=>`${LOOK_LABELS[k]} ${v?'on':'off'}`).join(', ');
 const round=a=>a.map(n=>Math.round(n*100)/100).join(', ');
 return [`Ranch Atelier view · build ${view.build||'unknown'} · ${new Date(view.captured).toLocaleString()}`,
  `Scene: ${view.name} (${view.family}, ${c.preset}, seed ${c.seed}, ${c.size} m, ${(c.extraTiles?.length||0)+1} tiles)`,
  `Time: day ${clock.day??1}, ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} (${c.timeMode}) · season ${c.seasonMode} · weather ${c.weatherMode} · ${view.running?'running':'paused'} at ${c.simulationSpeed}×`,
  `Camera: position ${round(view.camera.position)} · target ${round(view.camera.target)}`,
  `Style: ${view.styleName} (#${view.style})`,
  `Look: ${on}`,
  `Developer: ${view.developer.enabled?'on':'off'}, comic ${view.developer.cartoon?'on':'off'}, zoom-compensated ${view.developer.followZoom?'on':'off'}`,
  `Viewport: ${view.viewport.width}×${view.viewport.height} at ${view.viewport.pixelRatio}x`,
  `Open the same view: ${link}`].join('\n');
}

export function installShareControls({panel,getView,look,onLook}){
 const section=document.createElement('section');section.className='developer-look';section.setAttribute('aria-label','Look and sharing');
 section.innerHTML='<h3>Look</h3>'+Object.entries(LOOK_LABELS).map(([k,label])=>`<label class="developer-switch"><span>${label}</span><input id="look-${k}" type="checkbox"></label>`).join('')+'<button id="copy-view" type="button">Copy view</button><textarea id="copy-view-text" readonly hidden aria-label="Shareable view"></textarea>';
 panel.querySelector('#developer-mode-status')?.before(section)??panel.append(section);
 for(const k of Object.keys(LOOK_LABELS)){const input=section.querySelector('#look-'+k);input.checked=look[k];input.onchange=()=>{look[k]=input.checked;saveLook(look);onLook(look);};}
 const button=section.querySelector('#copy-view'),fallback=section.querySelector('#copy-view-text');let reset=0;
 button.onclick=async()=>{
  let build='unknown';try{build=(await (await fetch('/view-build.json',{cache:'no-store'})).json()).buildId||build;}catch{}
  const view={app:'ranch-atelier',version:1,build,captured:Date.now(),...getView(),look:{...look},developer:developerSettings(),viewport:{width:innerWidth,height:innerHeight,pixelRatio:Math.round(devicePixelRatio*100)/100}};
  const link=`${location.origin}${location.pathname}?style=${view.style}#view=${await encodeView(view)}`,text=describe(view,link);
  let copied=false;try{await navigator.clipboard.writeText(text);copied=true;}catch{}
  fallback.value=text;fallback.hidden=copied;if(!copied){fallback.focus();fallback.select();}
  button.textContent=copied?'Copied':'Select and copy below';clearTimeout(reset);reset=setTimeout(()=>{button.textContent='Copy view';},2200);
 };
 return section;
}
