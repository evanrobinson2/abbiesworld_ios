import {withPortTerrain} from './moon-port-layout.mjs';
import {lunarTerrain} from './moon-terrain.mjs';
import {slopeAt} from '../new-england-terrain.mjs';
export const moonTileSeed=tile=>tile.seed+((tile.placement?.variant??1)-1)*977;
export function moonTileTerrain(tile,diameter,base){
 const lunar=withPortTerrain(lunarTerrain(moonTileSeed(tile),{planet:tile.placement?.planet}),diameter,tile.placement?.auroraConstruction===true),radius=diameter/2,apothem=radius*Math.sqrt(3)/2;
 const center=tile.center,datum=base(center.x,center.z)-lunar(0,0);
 const edgeDistance=(x,z)=>apothem-Math.max(Math.abs(x),Math.abs(x*.5+z*Math.sqrt(3)/2),Math.abs(-x*.5+z*Math.sqrt(3)/2));
 const h=(x,z)=>{const d=edgeDistance(x,z),original=base(center.x+x,center.z+z);if(d<=0)return original;const t=Math.min(1,d/Math.min(5,radius*.15)),blend=t*t*(3-2*t);return original*(1-blend)+(lunar(x,z)+datum)*blend;};
 Object.assign(h,lunar);h.slope=(x,z)=>slopeAt(h,x,z);h.edgeDistance=edgeDistance;h.datum=datum;
 return h;
}
// One sampler for the board, its Moon adapters, placement and item physics.
// The original landscape remains unchanged outside Moon hexes.
export function withMoonTerrain(base,tiles,diameter){
 const original=base.baseTerrain||base,moons=tiles.filter(t=>t.type==='moon').map(tile=>({tile,heightAt:moonTileTerrain(tile,diameter,original)}));
 if(!moons.length)return original;
 const h=(x,z)=>{for(const m of moons){const dx=x-m.tile.center.x,dz=z-m.tile.center.z;if(m.heightAt.edgeDistance(dx,dz)>0)return m.heightAt(dx,dz);}return original(x,z);};
 Object.assign(h,original);h.baseTerrain=original;h.moonTiles=moons;h.slope=(x,z)=>slopeAt(h,x,z);return h;
}
