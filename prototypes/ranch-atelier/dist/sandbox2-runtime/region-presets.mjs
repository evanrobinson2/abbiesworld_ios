const art=(path)=>`<svg viewBox="0 0 240 96" aria-hidden="true"><rect width="240" height="96" rx="12" fill="#e8eddb"/><path d="${path} L240 96H0Z" fill="#91a776"/><path d="M0 80 Q60 45 120 78T240 72" fill="none" stroke="#f6f2cf" stroke-width="3"/></svg>`;
export const REGION_PRESETS=Object.freeze({
 meadow:{label:'Meadow',description:'Soft rises and open ground. An easy place to start.',art:art('M0 65Q60 45 120 60T240 62'),relief:.35},
 rolling:{label:'Rolling Country',description:'Broad hills, wooded slopes and sheltered lowlands.',art:art('M0 65Q50 0 110 52T240 35'),relief:1},
 valley:{label:'River Valley',description:'A winding dry riverbed between gentle valley sides.',art:art('M0 25Q50 20 105 80Q145 45 240 20'),relief:.7},
 highlands:{label:'Highlands',description:'Long ridges and elevated ground for a dramatic region.',art:art('M0 60L55 15L95 50L150 8L200 46L240 24'),relief:1}
});
export function regionEdit(board,{name,presetId,seed=41}){
 const clean=String(name||'').trim().slice(0,60)||'My region';
 if(presetId&&!REGION_PRESETS[presetId])throw Error('Choose a supported landscape');
 if(presetId&&(!Number.isInteger(seed)||seed<1||seed>4294967295))throw Error('Invalid landscape seed');
 return {...board,revision:board.revision+1,region:{...board.region,name:clean},...(presetId?{terrain:{seed,relief:REGION_PRESETS[presetId].relief,landform:presetId}}:{})};
}
export function landformHeight(x,z,seed,relief,landform){
 const phase=(seed%1009)/1009*Math.PI*2;
 if(landform==='meadow')return relief*(22+7*Math.sin(x/220+phase)*Math.cos(z/280)+3*Math.sin(z/110+phase));
 if(landform==='valley'){const bed=95*Math.sin(z/280+phase);return relief*(10+42*(1-Math.exp(-(((x-bed)/210)**2)))+5*Math.cos(z/220+phase));}
 if(landform==='highlands')return relief*(35+25*Math.sin((x+z*.4)/230+phase)+15*Math.cos(z/210+phase)+5*Math.sin(x/100));
 throw Error('Unknown landform');
}
