export const TILE_RADIUS_METRES=10/Math.sqrt(3);
export const RENDER_UNITS_PER_METRE=.1;
export const TILE_METRICS=Object.freeze({shape:'hex',units:'metres',radius:TILE_RADIUS_METRES,pointToPoint:TILE_RADIUS_METRES*2,acrossFlats:10,areaSquareMetres:3*Math.sqrt(3)*TILE_RADIUS_METRES**2/2});
