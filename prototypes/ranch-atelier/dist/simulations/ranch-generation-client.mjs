import {restoreTerrain} from './board-terrain.mjs';
// A short-lived worker owns each search; no retained caches, timers or workers.
export function planRanchAsync(board,options,diameter){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./ranch-generation-worker.mjs',import.meta.url),{type:'module'});
  let timer;
  const finish=(error,value)=>{clearTimeout(timer);worker.terminate();error?reject(error):resolve(value);};
  worker.onerror=event=>finish(new Error(event.message||'Terrain worker failed. The current ranch is unchanged.'));
  worker.onmessage=({data})=>{
   if(data.error){const error=new Error(data.error);error.rejections=data.rejections;finish(error);return;}
   try{const heightAt=restoreTerrain(data.terrain);heightAt.validation=data.validation;finish(null,{...data,heightAt});}catch(error){finish(error);}
  };
  timer=setTimeout(()=>finish(new Error('Terrain search exceeded its time budget. The current ranch is unchanged.')),60000);
  try{worker.postMessage({board,options,diameter});}catch(error){finish(error);}
 });
}
