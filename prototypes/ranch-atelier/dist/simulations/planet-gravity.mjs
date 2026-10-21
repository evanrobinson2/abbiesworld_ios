// SI acceleration. Convert once at the boundary into a renderer's distance units.
export const PLANET_GRAVITY=Object.freeze({earth:9.81,moon:1.62,mars:3.71});
export function planetOf(tile={}){
 const planet=tile.placement?.planet??tile.planet??tile.options?.planet;
 if(Object.hasOwn(PLANET_GRAVITY,planet))return planet;
 return tile.type==='moon'||tile.family==='moon'?'moon':'earth';
}
export const gravityMetres=tile=>PLANET_GRAVITY[planetOf(tile)];
/** Hex footprints in the generator's metre-space. Gravity columns have no seam walls.
 * Previous membership breaks exact-edge ties, without modifying position or velocity.
 */
export function createGravityResolver(plans,{tiles=[],radiusMetres=50,renderUnitsPerMetre=.1}={}){
 if(!(radiusMetres>0)||!(renderUnitsPerMetre>0))throw Error('Positive physics scale required');
 const metadata=new Map(tiles.map(t=>[t.id,t]));
 const entries=plans.map(p=>({id:p.id,center:p.center,planet:planetOf({...p,...metadata.get(p.id)})}));
 const normals=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3),Math.sin(i*Math.PI/3)]),apothem=radiusMetres*Math.sqrt(3)/2;
 const inside=(t,x,z)=>normals.every(([nx,nz])=>(x-t.center.x)*nx+(z-t.center.z)*nz<=apothem+1e-7);
 function sample(x,z,previousId){x/=renderUnitsPerMetre;z/=renderUnitsPerMetre;const previous=entries.find(t=>t.id===previousId),tile=previous&&inside(previous,x,z)?previous:entries.find(t=>inside(t,x,z));const planet=tile?.planet??'earth';return {tileId:tile?.id??null,planet,gravity:PLANET_GRAVITY[planet]*renderUnitsPerMetre};}
 return {sample,gravityAt:(x,z,state)=>{const value=sample(x,z,state?.tileId);if(state){state.tileId=value.tileId;state.planet=value.planet;}return value.gravity;}};
}
