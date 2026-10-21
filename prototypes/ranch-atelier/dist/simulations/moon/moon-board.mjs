import {normalizeScienceWorld} from './science-worlds.mjs';
import {createMoonAdapter} from './moon-adapter.mjs';
import {moonTileSeed,moonTileTerrain} from './moon-board-terrain.mjs';
export function createMoonBoardTile(tile,diameter,heightAt,saved){
 const terrain=heightAt.moonTiles?.find(m=>m.tile.id===tile.id)?.heightAt||moonTileTerrain(tile,diameter,heightAt.baseTerrain||heightAt);
 return createMoonAdapter(moonTileSeed(tile),{planet:normalizeScienceWorld(tile.placement?.planet),size:diameter,complexity:tile.placement?.complexity??1,auroraConstruction:tile.placement?.auroraConstruction===true,ground:true,heightAt:terrain},saved);
}
export {joinMoonRuntimes} from './moon-board-runtime.mjs';
