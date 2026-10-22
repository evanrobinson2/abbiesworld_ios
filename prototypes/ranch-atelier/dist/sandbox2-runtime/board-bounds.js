import {BOARD_CELLS} from './board-terrain.js';
import {HEX_RADIUS} from './playground-model.js';
// 0.1 micrometre tolerance only absorbs floating-point error at shared hex edges.
export const BOUNDS_EPSILON=1e-7;
export function createHexBounds(cells,radius=HEX_RADIUS){
 if(!Number.isFinite(radius)||radius<=0||!Array.isArray(cells)||!cells.every(c=>Number.isInteger(c.q)&&Number.isInteger(c.r)))throw Error('Invalid hex bounds');
 const centers=cells.map(c=>({x:Math.sqrt(3)*radius*(c.q+c.r/2),z:radius*1.5*c.r})),apothem=Math.sqrt(3)*radius/2;
 return (x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&centers.some(c=>{const dx=Math.abs(x-c.x),dz=Math.abs(z-c.z);return dx<=apothem+BOUNDS_EPSILON&&dz<=radius-dx/Math.sqrt(3)+BOUNDS_EPSILON;});
}
export const containsBoardPoint=createHexBounds(BOARD_CELLS);
