import {newEnglandTerrain} from './new-england-terrain.mjs';
import {newEnglandTerrain as legacyTerrain} from './new-england-terrain-v1.mjs';
import {newEnglandTerrain as terrainV2} from './new-england-terrain-v2.mjs';
import {landscapeParameters} from './landscape-parameters.mjs';
import {comicMountainTerrain} from './comic-mountain-terrain.mjs';
export const TERRAIN_VERSION=3;
export function terrainRecord(h,height){if(h.version===4)return {version:4,biome:h.biome,seed:h.seed,height,parameters:{...h.parameters}};return {version:h.version||TERRAIN_VERSION,biome:'new-england',seed:h.seed,height,parameters:landscapeParameters(h.parameters)};}
export function restoreTerrain(record){
 if(record?.version===4&&record.biome==='comic-mountain-valley'){
  if(!Number.isInteger(record.seed)||!Number.isFinite(record.height)||record.height<=0||!Number.isFinite(record.parameters?.diameter)||record.parameters.diameter<50||record.parameters.diameter>180)throw new Error('Invalid comic mountain terrain.');
  return comicMountainTerrain(record.seed,record.height,record.parameters);
 }
 if(![1,2,TERRAIN_VERSION].includes(record?.version)||record.biome!=='new-england'||!Number.isInteger(record.seed)||!Number.isFinite(record.height)||record.height<=0)throw new Error('Unsupported saved terrain. The established landscape was not regenerated.');
 const h=(record.version===1?legacyTerrain:record.version===2?terrainV2:newEnglandTerrain)(record.seed,record.height,record.parameters);h.version=record.version;return h;
}
