// Editor presentation belongs to each scene type. Controls bind to implemented
// recipe fields; unsupported simulation parameters are deliberately absent.
const definitions={
 ranch:['Shape your ranch','Land use','Choose the household and working parcels that belong together.','Pasture greenery'],
 home:['Shape a household','Household arrangement','Arrange homes around shared access, water and daily activity.','Garden greenery'],
 market:['Shape a market','Trading arrangement','Choose the scale of exchange, then explore a different arrangement.','Market-edge greenery'],
 garden:['Shape a farm','Growing plan','Choose growing rooms and rows. Crop production is not simulated here.','Surrounding greenery'],
 woodland:['Shape a woodland','Working purpose','Choose a working clearing, timber site or protected reserve.','Woodland density'],
 pottery:['Shape a pottery yard','Workshop purpose','Choose clay preparation, firing or vessel work. Firing production is not simulated here.','Yard greenery'],
 preservation:['Shape a food store','Preservation method','Choose root storage, drying or a shared pantry.','Store-yard greenery'],
 gathering:['Shape a gathering place','Shared activity','Arrange a meal, exchange or a village common.','Shade and greenery'],
 animals:['Shape an animal refuge','Care setting','Choose a care yard, quiet refuge or garden setting.','Garden greenery'],
 castle:['Shape a stronghold','Architecture','Choose a reviewed castle assembly. Its architecture stays intact.','Surrounding greenery'],
 neighborhood:['Shape a neighborhood','Street character','Grow homes around shared lanes and courts.','Neighborhood greenery'],
 town:['Shape a town','Town character','Choose a street grammar and growth stage. Existing households remain when the town grows.','Town greenery'],
 seaside:['Shape a shoreline','Shore activity','Choose fishing, salt work or boat repair along the shore.','Coastal greenery']
};
export const SCENE_EDITORS=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([type,[title,layoutLabel,description,vegetationLabel]])=>[type,Object.freeze({type,title,description,drawer:{controls:['preset'],action:'Edit closely'},closeup:{layoutLabel,controls:['preset','variation','vegetation','props',...(type==='town'?['growth']:[])],vegetationLabel},scope:'draft'})])));
export function sceneEditor(type){const contract=SCENE_EDITORS[type];if(!contract)throw Error('Missing scene editor contract: '+type);return contract;}
export function pullPose(dx,dy,scale=1,reduced=false){const distance=Math.hypot(dx,dy),resistance=1/(1+distance/380);return {x:dx*scale*resistance,y:-dy*scale*resistance,tilt:reduced?0:Math.max(-.12,Math.min(.12,dx*.00055)),stretch:reduced?1:1+Math.min(.08,Math.max(0,-dy)*.0003)};}
