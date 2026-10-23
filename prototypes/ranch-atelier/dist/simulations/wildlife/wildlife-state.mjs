// Bounded spatial visitors, not a population, survival or food-web simulation.
export const SPECIES = Object.freeze({
 deer: {habitats:['woodland-edge','meadow'], nocturnal:false, speed:1.1},
 rabbit: {habitats:['hedgerow','meadow'], nocturnal:false, speed:.8},
 squirrel: {habitats:['woodland','woodland-edge'], nocturnal:false, speed:1},
 raccoon: {habitats:['woodland','wet-margin'], nocturnal:true, speed:.7},
});
const clamp = n => Math.max(0,Math.min(1,n));
function random(seed) { let n=2166136261; for(const c of String(seed)) n=Math.imul(n^c.charCodeAt(0),16777619); return ()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;}; }
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function point(route,travel) {
 for(let i=1;i<route.length;i++){const length=distance(route[i-1],route[i]);if(travel<=length){const t=length?travel/length:0;return {x:route[i-1].x+(route[i].x-route[i-1].x)*t,z:route[i-1].z+(route[i].z-route[i-1].z)*t};}travel-=length;}
 return {...route.at(-1)};
}
export function createWildlife({seed=1,habitats=[],species=Object.keys(SPECIES),maxVisitors=4,validateRoute}={}) {
 if(!Number.isInteger(maxVisitors)||maxVisitors<0||maxVisitors>8)throw new RangeError('maxVisitors must be 0–8');
 if(typeof validateRoute!=='function')throw new TypeError('A terrain/navigation route validator is required');
 const rng=random(seed),ids=new Set();
 const patches=habitats.slice(0,64).map(h=>{
  if(!h.id||ids.has(h.id)||!Array.isArray(h.route)||h.route.length<2||h.route.length>64||h.route.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)))throw new TypeError('Unique habitat ids and finite refuge-to-forage routes required');
  ids.add(h.id);const route=h.route.map(p=>({x:p.x,z:p.z}));
  return {id:h.id,kind:h.kind,route,cover:1,foraged:0,length:route.slice(1).reduce((n,p,i)=>n+distance(route[i],p),0)};
 }).filter(h=>h.length>0&&validateRoute(h.route,h.id)===true);
 const visitors=[];
 for(const name of species){
  if(!SPECIES[name])throw new TypeError('Unknown species: '+name);
  if(visitors.length>=maxVisitors)break;
  const choices=patches.filter(h=>SPECIES[name].habitats.includes(h.kind));if(!choices.length)continue;
  const patch=choices[Math.floor(rng()*choices.length)];
  visitors.push({id:`wildlife-${visitors.length}`,species:name,habitatId:patch.id,state:'hidden',remaining:10+rng()*50,travel:0,comfort:1,boldness:.2+rng()*.6,pace:.8+rng()*.4,sightings:0,foraged:0});
 }
 let elapsed=0,remainder=0;
 function tick(env){
  elapsed+=.25;
  for(const h of patches)h.cover=clamp(h.cover+.0005);
  for(const v of visitors){
   const h=patches.find(h=>h.id===v.habitatId),s=SPECIES[v.species],active=s.nocturnal?(env.hour<6||env.hour>=19):(env.hour>=6&&env.hour<19);
   const disturbed=(env.disturbance[h.id]??0)>v.boldness||env.heavyRain||!active;
   v.comfort=clamp(v.comfort+(disturbed?-.006:.003));v.remaining-=.25;
   if(disturbed&&v.state!=='hidden')v.state='retreat';
   if(v.state==='hidden'){
    if(v.remaining<=0&&!disturbed){v.state='emerge';v.sightings++;}
   }else if(v.state==='emerge'){
    v.travel=Math.min(h.length,v.travel+s.speed*v.pace*.25);
    if(v.travel===h.length){v.state='forage';v.remaining=8+rng()*12;}
   }else if(v.state==='forage'){
    const amount=Math.min(Math.max(0,h.cover-.2),.001*v.pace);h.cover-=amount;h.foraged+=amount;v.foraged+=amount;
    if(v.remaining<=0){v.state='rest';v.remaining=5+rng()*10;}
   }else if(v.state==='rest'){
    if(v.remaining<=0)v.state='retreat';
   }else if(v.state==='retreat'){
    v.travel=Math.max(0,v.travel-s.speed*v.pace*.4);
    if(v.travel===0){v.state='hidden';v.remaining=30+rng()*90;}
   }
  }
 }
 return {
  advance(dt,{hour=12,disturbance={},heavyRain=false}={}){
   if(!Number.isFinite(dt)||dt<0||dt>60||!Number.isFinite(hour)||hour<0||hour>=24||Object.values(disturbance).some(n=>!Number.isFinite(n)||n<0||n>1))throw new RangeError('dt 0–60 seconds; hour 0–24 exclusive; disturbance 0–1');
   remainder+=dt;while(remainder>=.25){tick({hour,disturbance,heavyRain});remainder-=.25;}return this.snapshot();
  },
  snapshot(){return {elapsed,scope:'bounded spatial wildlife activity; no population or survival model',habitats:patches.map(h=>({id:h.id,cover:h.cover,foraged:h.foraged})),visitors:visitors.map(v=>({...v,visible:v.state!=='hidden',position:point(patches.find(h=>h.id===v.habitatId).route,v.travel)}))};},
 };
}
