import {gardenSettings,gardenRequirements} from './garden-facets.mjs';
import {spaceRequirements} from './ranch-spaces.mjs?habitat=4';
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Math.round(Number(v)))):fallback;
export function placementSettings(type,value={}){
 if(type==='crop')return gardenSettings(value);
 if(type==='moon')return {complexity:clamp(value.complexity,1,3,1),variant:clamp(value.variant,1,5,1)};
 return {complexity:clamp(value.complexity,1,4,1),vegetation:clamp(value.vegetation,0,4,3),variety:clamp(value.variety,0,4,3)};
}
export function placementAxes(type){
 if(type==='crop')return [{key:'density',label:'Planting density',min:1,max:5,icons:['smallHex','largeHex']},{key:'variety',label:'Planting variety',min:1,max:5,icons:['cube','cubes']}];
 if(type==='moon')return [{key:'complexity',label:'Cargo pallets',min:1,max:3,icons:['cube','cubes']},{key:'variant',label:'Layout variation',min:1,max:5,icons:['smallHex','largeHex']}];
 if(type==='ranch'||type==='paddock')return [{key:'complexity',label:type==='ranch'?'Households':'Livestock',min:1,max:4,icons:['cube','cubes']},{key:'vegetation',label:'Vegetation density',min:0,max:4,icons:['smallHex','largeHex']}];
 return [{key:'vegetation',label:'Vegetation density',min:0,max:4,icons:['smallHex','largeHex']},{key:'variety',label:'Planting variety',min:0,max:4,icons:['cube','cubes']}];
}
export function tileLandscape(tile,landscape){
 if(tile.type==='moon')return {...landscape,vegetation:0,props:0};
 if(!tile.placement||tile.type==='crop')return landscape;
 const p=placementSettings(tile.type,tile.placement);return {...landscape,vegetation:[.04,.6,1.8,4,8][p.vegetation],biodiversity:p.variety};
}
export function tileRequirements(board,requirements,dimensions,diameter,counts){
 const result=gardenRequirements(board,requirements);
 for(const tile of board.tiles){if(!tile.placement||!['ranch','paddock'].includes(tile.type))continue;const p=placementSettings(tile.type,tile.placement),c={...counts};if(tile.type==='paddock')for(const key of ['horses','cows','goats','chickens'])c[key]=Math.min(24,Math.round((counts[key]||0)*p.complexity));result[tile.id]=spaceRequirements(dimensions,p.complexity,diameter,c,'homestead')[tile.type];}
 return result;
}
