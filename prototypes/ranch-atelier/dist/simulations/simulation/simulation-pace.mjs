import {HOURS_PER_SECOND} from '../ranch-clock.mjs';
import {ACTIVITY_RATE} from '../ranch-rhythm.mjs';
export const REALTIME='realtime';
export function normalizeSpeed(value){return value===REALTIME?REALTIME:[.5,1,2].includes(Number(value))?Number(value):1;}
export function speedLabel(value){return normalizeSpeed(value)===REALTIME?'Real time':normalizeSpeed(value)+'×';}
export function simulationPace(seconds,speed=1,yearMinutes=8){
 const dt=Number.isFinite(seconds)?Math.max(0,seconds):0,rate=normalizeSpeed(speed),real=rate===REALTIME;
 const clockSeconds=real?dt/(HOURS_PER_SECOND*3600):dt*rate;
 return {clockSeconds,activitySeconds:dt*(real?1:rate*ACTIVITY_RATE),needsSeconds:clockSeconds*ACTIVITY_RATE,yearDelta:real?dt/(365*86400):clockSeconds/(yearMinutes*60),hoursPerSecond:real?1/3600:HOURS_PER_SECOND*rate,daysPerYear:real?365:yearMinutes*60*HOURS_PER_SECOND/24,animationSpeed:real?1:rate};
}
