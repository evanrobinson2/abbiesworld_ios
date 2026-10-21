// Bounded, opt-in CPU diagnostics. Nested scopes overlap; totals are not additive.
export function createProfiler(enabled=false,clock=()=>performance.now()){
 const stats=new Map();
 const start=()=>enabled?clock():null;
 const end=(name,t)=>{if(t===null)return;const ms=clock()-t,s=stats.get(name)||{calls:0,totalMs:0,maxMs:0};s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);stats.set(name,s);};
 return {start,end,measure(name,fn){if(!enabled)return fn();const t=start();try{return fn();}finally{end(name,t);}},reset(){stats.clear();},report(){return Object.fromEntries([...stats].map(([k,s])=>[k,{...s,meanMs:s.totalMs/s.calls}]));},setEnabled(value){enabled=!!value;stats.clear();}};
}
export const profiler=createProfiler(typeof location!=='undefined'&&new URLSearchParams(location.search).has('profile'));
if(typeof window!=='undefined')window.simulationProfiler=profiler;
