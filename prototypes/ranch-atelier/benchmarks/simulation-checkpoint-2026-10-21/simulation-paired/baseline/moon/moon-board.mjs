import {createMoonAdapter} from './moon-adapter.mjs';
export function createMoonBoardTile(tile,diameter,heightAt,saved){
 return createMoonAdapter(tile.seed+((tile.placement?.variant??1)-1)*977,{size:diameter,complexity:tile.placement?.complexity??1,ground:false,heightAt:(x,z)=>heightAt(tile.center.x+x,tile.center.z+z)},saved);
}
export {joinMoonRuntimes} from './moon-board-runtime.mjs';
