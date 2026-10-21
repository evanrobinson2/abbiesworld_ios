import {gravityMetres} from '../planet-gravity.mjs';
import * as T from 'three';
import {createFlightEffects} from './moon-flight-effects.mjs';
import {flightPhase} from './moon-dispatch.mjs';
export function createMoonRocket(model,plan){
 const group=new T.Group(),ship=new T.Group();group.add(ship);const port=plan.placements.find(p=>p.id==='landing'),ground=plan.heightAt(port.x,port.z)+(port.deck??.62);group.position.set(port.x,ground,port.z);
 const exterior=model(port.ship||'RE-072'),cabin=port.ship==='RE-073'?model('RE-076'):null;ship.add(exterior);if(cabin){cabin.visible=false;ship.add(cabin);}let interiorOpen=false,currentPhase='docked';function setInterior(value){interiorOpen=!!value&&!!cabin&&currentPhase==='docked';exterior.visible=!interiorOpen;if(cabin)cabin.visible=interiorOpen;ship.userData.interiorOpen=interiorOpen;} const shipScale=port.ship==='RE-073'?2:1;
 const engines=[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*.880263342*shipScale,y:.596622932*shipScale,z:z*1.173684456*shipScale,radius:.273859706*shipScale})));
 ship.userData.inspect={title:'USS AURORA',kind:'Monthly transport',description:'Arrives at the month boundary, exchanges supplies and science, then departs. Families remain resident.'};
 const exhaustLight=new T.PointLight('#ffd4a0',0,2,2);exhaustLight.castShadow=false;group.add(exhaustLight);
 const effects=createFlightEffects(group,(x,z)=>port.asset==='RE-074'?plan.heightAt(port.x+x,port.z+z)-ground:Math.max(0,plan.heightAt(port.x+x,port.z+z)-ground),engines,{planet:plan.planet,gravity:gravityMetres({type:'moon',planet:plan.planet})});
 return {group,get interiorAvailable(){return !!cabin;},get interiorOpen(){return interiorOpen;},get interiorDocked(){return currentPhase==='docked';},setInterior,update(seconds,manifest){const f=flightPhase(seconds,manifest);currentPhase=f.phase;if(currentPhase!=='docked')setInterior(false);exhaustLight.visible=f.thrust>.01;exhaustLight.intensity=f.thrust*.16;exhaustLight.position.set(0,f.altitude+.4,0);ship.visible=f.phase!=='in-transit';ship.position.y=f.altitude;effects.update(seconds,t=>flightPhase(t,manifest));ship.userData.activity=f.phase;ship.userData.liveReadout=()=>`${interiorOpen?'Cabin: 6 seats · 2 berths · ':''}${f.phase} · ${manifest.visits} exchanges · ${manifest.lastReturn} samples exported · ${manifest.lastSupply} supplies unloaded`;},dispose(){exhaustLight.dispose();effects.dispose();}};
}
