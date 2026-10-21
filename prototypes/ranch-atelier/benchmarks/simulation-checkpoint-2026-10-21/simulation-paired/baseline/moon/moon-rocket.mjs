import * as T from 'three';
import {createFlightEffects} from './moon-flight-effects.mjs';
import {flightPhase} from './moon-dispatch.mjs';
export function createMoonRocket(model,plan){
 const group=new T.Group(),ship=new T.Group();group.add(ship);const port=plan.placements.find(p=>p.id==='landing'),ground=plan.heightAt(port.x,port.z)+.62;group.position.set(port.x,ground,port.z);
 ship.add(model('RE-072'));
 const engines=[-1,1].flatMap(x=>[-1,1].map(z=>({x:x*.880263342,y:.596622932,z:z*1.173684456,radius:.273859706})));
 ship.userData.inspect={title:'Earth–Moon ferry',kind:'Monthly transport',description:'Arrives at the month boundary, exchanges supplies and science, then departs. Families remain resident.'};
 const effects=createFlightEffects(group,(x,z)=>Math.max(0,plan.heightAt(port.x+x,port.z+z)-ground),engines);
 return {group,update(seconds,manifest){const f=flightPhase(seconds,manifest);ship.visible=f.phase!=='in-transit';ship.position.y=f.altitude;effects.update(seconds,t=>flightPhase(t,manifest));ship.userData.activity=f.phase;ship.userData.liveReadout=()=>`${f.phase} · ${manifest.visits} exchanges · ${manifest.lastReturn} samples exported · ${manifest.lastSupply} supplies unloaded`;},dispose(){effects.dispose();}};
}
