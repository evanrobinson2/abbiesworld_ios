// Nominal tile diameter as a fraction of viewport height. Detail becomes useful
// around 44% (294px on a 668px viewport); comic landmarks return below 32%.
// The dead band preserves the current view while hovering around the boundary.
export function representationForZoom(coverage,currentCartoon){
 if(!Number.isFinite(coverage)||coverage<=0)return currentCartoon;
 if(coverage>=.44)return false;
 if(coverage<=.32)return true;
 return currentCartoon;
}
