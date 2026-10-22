// Shared market implementation for /market and Scene Generator's marketplace mode.
import {buildMarketArt} from './market-art.js';
import {dressingPlan} from './market-dressing.js';
export {DEFAULTS,MARKET_STYLES,normalize,simulateMarket} from './market-engine.js';
export {DRESSING_DEFAULTS} from './market-dressing.js';
export const MARKET_SCENE_VERSION='1.0.0';
export function createMarketScene(T,run){const dressing=dressingPlan(run.world),art=buildMarketArt(T,run.world,run.frames[0].people,dressing),journey=new T.Group(),nodes=run.world.nodes,home=nodes.find(n=>n.id==='home'),gate=nodes.find(n=>n.id==='gate');journey.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(home.x,.1,home.z),new T.Vector3(gate.x,.1,gate.z)]),new T.LineBasicMaterial({color:'#b9a578'})));const marker=new T.Mesh(new T.BoxGeometry(5,3,4),new T.MeshStandardMaterial({color:'#b58e6a'}));marker.position.set(home.x,1.5,home.z);journey.add(marker);journey.visible=false;art.world.add(journey);return {...art,dressing,journey};}
export function marketUrl(path,config){const url=new URL(path,location.origin);if(path==='/scene-generator')url.searchParams.set('scene','market');for(const key of ['style','seed','bays','spacing','setting'])url.searchParams.set(key,config[key]);return url.pathname+url.search;}
