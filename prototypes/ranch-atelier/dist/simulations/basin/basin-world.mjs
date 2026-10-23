// Sandbox hook for the Basin world: /sandbox?world=basin (remembered on this device; ?world=board goes back).
// The basin replaces the floor and wall around the board, the camera stands in the valley, and no tiles are placed.
import {frontier,tileCenter} from '../tile-expansion.mjs';
const KEY='sandbox-world';
export function basinRequested(){const q=new URLSearchParams(location.search).get('world');try{if(q)localStorage.setItem(KEY,q);return (q||localStorage.getItem(KEY))==='basin';}catch{return q==='basin';}}
export async function createBasinWorld(scene){
 if(!basinRequested())return null;
 const {createBasinWorld:build}=await import('./basin-view.mjs');
 const q=new URLSearchParams(location.search),world=build({seed:Number(q.get('basin-seed'))||7,trees:q.get('trees')||'v1',season:q.get('season')||'summer'});scene.add(world.root);
 document.documentElement.dataset.world='basin';
 let framed=false;
 return {world,
  light({floor,wall,fog,sceneFog,setFog}){floor.visible=false;wall.visible=false;setFog(sceneFog===false?null:fog);},
  // Air, not a mask: distance softens the far mountains the way it does in a real valley.
  haze(fog,reach){fog.near=Math.max(260,reach*2);fog.far=fog.near+2600;},
  // No tiles placed: the starting tiles stay hidden; tiles the player places show, and the land opens around them.
  showBoard({group,tileObjects=[],life,tiles=[],placed=new Set(),diameter,heightAt}){
   for(const t of tileObjects)t.object.visible=placed.has(t.id);
   // Residents and buildings of the hidden starting tiles stay hidden with them; those on placed tiles show.
   const hidden=tiles.filter(t=>!placed.has(t.id)).map(t=>({x:t.center.x*.1,z:t.center.z*.1})),r=diameter/2*.1,p=new (life?.root?.position.constructor)();
   life?.root?.updateMatrixWorld(true);for(const o of life?.root?.children||[]){o.getWorldPosition(p);o.visible=placed.size>0&&!hidden.some(c=>Math.hypot(p.x-c.x,p.z-c.z)<r);}
   const shown=tiles.filter(t=>placed.has(t.id)),cells=[...shown,...frontier(shown.length?shown:tiles,diameter).map(c=>({center:tileCenter(c.q,c.r,diameter)}))];
   if(!shown.length)cells.push(...tiles);
   world.fitBoard({cells:cells.map(t=>({x:t.center.x*.1,z:t.center.z*.1})),radius:diameter/2*.1,heightAt});},
  frame(camera,orbit){if(framed)return false;framed=true;world.frame(camera,orbit);return true;}};
}
