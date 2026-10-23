// cloud, wind and precip are presentation targets; dark is how much a sky full of this weather dims the world.
export const WEATHER={
 clear:{cloud:.3,wind:.15,precip:0,kind:0,dark:0},cloudy:{cloud:.72,wind:.3,precip:0,kind:0,dark:.18},
 rain:{cloud:1,wind:.55,precip:.85,kind:1,dark:.55},wind:{cloud:.45,wind:1,precip:0,kind:0,dark:.08},
 hail:{cloud:1,wind:.75,precip:.7,kind:2,dark:.8},snow:{cloud:.88,wind:.35,precip:.65,kind:3,dark:.25},
 heat:{cloud:.08,wind:.12,precip:0,kind:0,dark:0}
};
// Fronts, not dice: the sky moves through 8-hour spells, each chosen from the one before (a seeded Markov chain), so
// clouds gather before rain, storms pass and clear, and a hot spell can break in a storm. Inside a spell a wet front
// builds up as cloud and clears as cloud. Everything is a pure function of (day, hour, season, seed): no timers, no
// stored state, and the same ranch always has the same weather.
export const SPELL_HOURS=8;
const CHAIN=24,NEXT={
 clear:[['clear',5],['cloudy',2.6],['wind',1.2],['heat',1]],
 cloudy:[['rain',3.6],['clear',3],['cloudy',.7],['wind',.8],['hail',.5]],
 rain:[['cloudy',2.2],['rain',2],['clear',1.4],['wind',.8],['hail',.4]],
 hail:[['cloudy',2.5],['rain',2]],
 wind:[['clear',2.4],['cloudy',2.2],['rain',1]],
 heat:[['heat',2],['clear',2.5],['hail',1]],
 snow:[['snow',2],['cloudy',3],['clear',1.5]]
};
const winter={rain:'snow',hail:'snow',heat:'clear'},mild={heat:'clear'},thaw={snow:'rain'};
const forSeason=(kind,season)=>(season===3?winter:season===1?thaw:{...mild,...thaw})[kind]||kind;
const wetKind=k=>k==='rain'||k==='hail'||k==='snow';
function rand(spell,seed,salt){let n=(Math.imul(spell+salt*7919+seed*104729,1664525)+1013904223)>>>0;n=(n^n>>>16)>>>0;n=Math.imul(n,2246822519)>>>0;n=(n^n>>>13)>>>0;return n/4294967296;}
function pick(list,r){const total=list.reduce((n,[,w])=>n+w,0);r*=total;for(const [k,w]of list)if((r-=w)<=0)return k;return list[list.length-1][0];}
const chains=new Map();
// Spell kinds walk forward from an anchor every CHAIN spells (8 days), so one lookup costs at most one cached walk.
export function spellKind(spell,season,seed=0){
 const anchor=Math.floor(spell/CHAIN)*CHAIN,key=anchor+':'+season+':'+seed;let chain=chains.get(key);
 if(!chain){chain=[];let k=forSeason(pick(NEXT.clear,rand(anchor,seed,1)),season);for(let i=0;i<CHAIN;i++){if(i)k=forSeason(pick(NEXT[k],rand(anchor+i,seed,2)),season);chain.push(k);}if(chains.size>64)chains.clear();chains.set(key,chain);}
 return chain[spell-anchor];
}
export function weatherFor(day,season,hour=12,seed=0){
 const t=(Math.floor(day)-1)*24+hour,spell=Math.floor(t/SPELL_HOURS),into=t-spell*SPELL_HOURS,kind=spellKind(spell,season,seed);
 if(!wetKind(kind))return kind;
 // A wet front arrives as gathering cloud and leaves as breaking cloud; a thunderstorm's hail is its middle hours.
 if(!wetKind(spellKind(spell-1,season,seed))&&into<2)return 'cloudy';
 if(!wetKind(spellKind(spell+1,season,seed))&&into>=SPELL_HOURS-1.5)return 'cloudy';
 if(kind==='hail')return into>=2.5&&into<5.5?'hail':'rain';
 return kind;
}
// What is coming: the next change within `horizon` hours. The world shows it (wind rises, clouds darken, animals
// settle, birds hush); the chronograph and directors may read it, but it is never a forecast panel.
export function weatherOutlook(day,season,hour=12,seed=0,horizon=4){
 const now=weatherFor(day,season,hour,seed);
 for(let h=.25;h<=horizon;h+=.25){const at=hour+h,next=weatherFor(day+Math.floor(at/24),season,at%24,seed);if(next!==now){const front=WEATHER[next].dark>WEATHER[now].dark+.15?'arriving':WEATHER[next].dark<WEATHER[now].dark-.15?'clearing':'changing';return {now,next,inHours:h,front};}}
 return {now,next:now,inHours:Infinity,front:null};
}
// 0..1: how close an arriving front is (1 = on top of us). Drives gathering wind and darkening sky before the rain.
export const frontApproach=o=>o?.front==='arriving'?Math.max(0,1-o.inHours/2):0;
export const wetWeather=w=>w==='rain'||w==='hail';
// Rain, hail or snow less than 45 minutes away: animals settle, pollinators go, birds hush, before a drop falls.
export const stormNear=f=>f?.front==='arriving'&&f.inHours<=.75&&['rain','hail','snow'].includes(f.next);
export const shelterWeather=w=>wetWeather(w);
export function easeWeather(current,target,dt){return current+(target-current)*(1-Math.exp(-Math.max(0,Math.min(.05,dt))/2.5));}
