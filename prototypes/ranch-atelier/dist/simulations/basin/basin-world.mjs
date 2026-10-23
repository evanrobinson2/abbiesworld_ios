// Sandbox hook for the Basin world: /sandbox?world=basin (remembered on this device; ?world=board goes back).
// The basin replaces the floor and wall around the board, the camera stands in the valley, and no tiles are placed.
const KEY='sandbox-world';
export function basinRequested(){const q=new URLSearchParams(location.search).get('world');try{if(q)localStorage.setItem(KEY,q);return (q||localStorage.getItem(KEY))==='basin';}catch{return q==='basin';}}
export async function createBasinWorld(scene){
 if(!basinRequested())return null;
 const {createBasinWorld:build}=await import('./basin-view.mjs');
 const world=build({seed:Number(new URLSearchParams(location.search).get('basin-seed'))||7});scene.add(world.root);
 document.documentElement.dataset.world='basin';
 let framed=false;
 return {world,
  light({floor,wall,fog,sceneFog,setFog}){floor.visible=false;wall.visible=false;setFog(sceneFog===false?null:fog);},
  // Air, not a mask: distance softens the far mountains the way it does in a real valley.
  haze(fog,reach){fog.near=Math.max(260,reach*2);fog.far=fog.near+2600;},
  hideTiles(group){group.visible=false;},
  frame(camera,orbit){if(framed)return false;framed=true;world.frame(camera,orbit);return true;}};
}
