import {axial,tileCenter} from '../tile-expansion.mjs';
export function cityCells(layout,rotation=0){let cells=layout==='line'?[[0,0],[1,0],[2,0]]:layout==='triangle'?[[0,0],[1,0],[0,1]]:[[0,0]];for(let i=0;i<rotation;i++)cells=cells.map(([q,r])=>[-r,q+r]);return cells.map(([q,r])=>({q,r}));}
export function cityFootprint(tiles,diameter,anchor,layout){const used=new Set(tiles.map(t=>{const p=axial(t.center,diameter);return p.q+','+p.r;}));for(let rotation=0;rotation<6;rotation++){const cells=cityCells(layout,rotation).map(p=>({q:p.q+anchor.q,r:p.r+anchor.r}));if(cells.every(p=>!used.has(p.q+','+p.r)))return {rotation,cells};}return null;}
export function cityCenters(layout,rotation,diameter){return cityCells(layout,rotation).map(p=>tileCenter(p.q,p.r,diameter));}
