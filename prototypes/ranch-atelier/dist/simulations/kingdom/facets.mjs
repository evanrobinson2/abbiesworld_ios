export const FACETS=[['common','Open common'],['woodland','Woodland'],['ridge','Ridge & hillside'],['fields','Cultivated fields'],['orchard','Orchard & croft'],['village','Village'],['castle','Castle precinct'],['market','Market village']];
export const TILE_CHOICES=FACETS;
export const SCENE_GENERATORS=FACETS.map(([id,label])=>({id,label,tiles:[id]}));
export {axial,tileCenter,frontier,multiHexIcon} from '../tile-expansion.mjs';
export const placementSettings=()=>({});
export const placementAxes=()=>[];
