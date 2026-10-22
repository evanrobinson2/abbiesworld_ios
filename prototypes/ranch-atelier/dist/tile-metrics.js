// Physical grid dimensions are independent of scene bounds and model calibration.
export const TILE_RADIUS_METRES=50;
export const RENDER_UNITS_PER_METRE=.1;
export const TILE_METRICS=Object.freeze({shape:'hex',units:'metres',radius:TILE_RADIUS_METRES,pointToPoint:TILE_RADIUS_METRES*2,acrossFlats:Math.sqrt(3)*TILE_RADIUS_METRES,areaSquareMetres:3*Math.sqrt(3)*TILE_RADIUS_METRES**2/2});
