// Exact samples only. Two bounded generations avoid per-miss FIFO eviction churn.
// Each wrapper belongs to one immutable terrain function, never an access proof.
export function memoizeHeight(heightAt,maxEntries=65536){
 if(typeof heightAt!=='function'||!Number.isInteger(maxEntries)||maxEntries<2)throw Error('Invalid height cache');
 const capacity=Math.floor(maxEntries/2);let current=new Map(),previous=new Map(),hits=0,misses=0;
 const sample=(x,z)=>{
  if(!Number.isFinite(x)||!Number.isFinite(z))return heightAt(x,z);
  const key=(Object.is(x,-0)?'-0':x)+','+(Object.is(z,-0)?'-0':z);
  if(current.has(key)){hits++;return current.get(key);}if(previous.has(key)){hits++;return previous.get(key);}
  misses++;const value=heightAt(x,z);if(!Number.isFinite(value))return value;
  if(current.size===capacity){previous=current;current=new Map();}current.set(key,value);return value;
 };
 sample.cacheInfo=()=>({size:current.size+previous.size,maxEntries:capacity*2,hits,misses});
 return sample;
}
