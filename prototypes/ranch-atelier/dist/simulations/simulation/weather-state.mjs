export const WEATHER={
 clear:{cloud:.12,wind:.15,precip:0,kind:0},cloudy:{cloud:.7,wind:.3,precip:0,kind:0},
 rain:{cloud:1,wind:.55,precip:.85,kind:1},wind:{cloud:.5,wind:1,precip:0,kind:0},
 hail:{cloud:1,wind:.75,precip:.7,kind:2},snow:{cloud:.85,wind:.35,precip:.65,kind:3},
 heat:{cloud:.05,wind:.12,precip:0,kind:0}
};
export function weatherFor(day,season,hour=12,seed=0){
 let n=(Math.imul(Math.floor(day)*4+Math.floor(hour/6)+seed,1664525)+1013904223)>>>0;
 n^=n>>>16;n=Math.imul(n,2246822519)>>>0;const r=n%100;
 if(season===3)return r<48?'snow':r<70?'cloudy':r<85?'wind':'clear';
 return r<5?'hail':r<29?'rain':r<49?'cloudy':r<66?'wind':season===1&&r>93?'heat':'clear';
}
export const wetWeather=w=>w==='rain'||w==='hail';
export const shelterWeather=w=>wetWeather(w);
export function easeWeather(current,target,dt){return current+(target-current)*(1-Math.exp(-Math.max(0,Math.min(.05,dt))/2.5));}
