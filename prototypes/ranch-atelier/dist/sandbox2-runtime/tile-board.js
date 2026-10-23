import {TILE_RADIUS_METRES} from './tile-metrics.js';
export const RADIUS_METRES=TILE_RADIUS_METRES;
export const CELLS=[{q:0,r:0},...[ [1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1] ].map(([q,r])=>({q,r}))];
export function cellCenter(index){const {q,r}=CELLS[index];return {x:Math.sqrt(3)*RADIUS_METRES*(q+r/2),z:1.5*RADIUS_METRES*r};}
export function initialBoard(){return {version:1,radiusMetres:RADIUS_METRES,tiles:[{id:'ranch',cell:0,rotation:0,seed:43},{id:'paddock',cell:1,rotation:0,seed:81},{id:'crop',cell:2,rotation:0,seed:127}]};}
export function moveTile(board,id,cell){if(!Number.isInteger(cell)||!CELLS[cell])throw Error('Choose a cell on the board.');const tile=board.tiles.find(t=>t.id===id);if(!tile)throw Error('Choose a tile.');const occupant=board.tiles.find(t=>t.cell===cell&&t!==tile);if(occupant)occupant.cell=tile.cell;tile.cell=cell;return board;}
export function rotateTile(board,id){const t=board.tiles.find(t=>t.id===id);t.rotation=(t.rotation+1)%6;}
export function validateBoard(v){return v?.version===1&&v.radiusMetres===RADIUS_METRES&&v.tiles?.length===3&&new Set(v.tiles.map(t=>t.id)).size===3&&new Set(v.tiles.map(t=>t.cell)).size===3&&v.tiles.every(t=>['ranch','paddock','crop'].includes(t.id)&&(t.type===undefined||['ranch','paddock','crop','woodland','pond','meadow'].includes(t.type))&&Number.isInteger(t.cell)&&CELLS[t.cell]&&Number.isInteger(t.rotation)&&t.rotation>=0&&t.rotation<6&&Number.isInteger(t.seed)&&t.seed>=1&&t.seed<=4294967295);}
export function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
