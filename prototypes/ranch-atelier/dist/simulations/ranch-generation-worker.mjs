import {planTerrainFirst} from './ranch-terrain-planner.mjs';
import {setLabHexDiameter} from './tile-metrics.js';
import {ranchSiteCost} from './ranch-spaces.mjs';
import {completeDomesticPaths} from './domestic-scenes.js';
import {refineRanchPaths} from './ranch-path-style.mjs';
self.onmessage=({data})=>{
 try{
  setLabHexDiameter(data.diameter);
  const start=performance.now();
  const result=planTerrainFirst(data.board,{...data.options,siteCost:ranchSiteCost,connectionTree:true},a=>refineRanchPaths(completeDomesticPaths(a)));
  self.postMessage({assembly:result.assembly,terrain:result.terrain,validation:result.heightAt.validation,planningMs:performance.now()-start});
 }catch(error){self.postMessage({error:error.message,rejections:error.rejections});}
};
