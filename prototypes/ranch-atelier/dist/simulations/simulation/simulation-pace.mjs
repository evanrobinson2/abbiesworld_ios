import {HOURS_PER_SECOND} from '../ranch-clock.mjs';
import {ACTIVITY_RATE} from '../ranch-rhythm.mjs';
export const REALTIME='realtime';
// Five steps: real time (one second is one second), then three play speeds and a top speed.
export const SPEEDS=[[REALTIME,'Realtime','RT'],[1,'›','›'],[2,'››','››'],[4,'›››','›››'],[8,'Top speed','Max']];
export function normalizeSpeed(value){if(value===REALTIME)return REALTIME;const n=Number(value);return SPEEDS.some(([v])=>v===n)?n:n>1?Math.min(8,2**Math.round(Math.log2(n))):1;}
export function speedLabel(value){const v=normalizeSpeed(value);return SPEEDS.find(([s])=>s===v)[1];}
export function speedBadge(value){const v=normalizeSpeed(value);return SPEEDS.find(([s])=>s===v)[2];}
export function simulationPace(seconds,speed=1,yearMinutes=8){
 const dt=Number.isFinite(seconds)?Math.max(0,seconds):0,rate=normalizeSpeed(speed),real=rate===REALTIME;
 const clockSeconds=real?dt/(HOURS_PER_SECOND*3600):dt*rate;
 return {clockSeconds,activitySeconds:dt*(real?1:rate*ACTIVITY_RATE),needsSeconds:clockSeconds*ACTIVITY_RATE,yearDelta:real?dt/(365*86400):clockSeconds/(yearMinutes*60),hoursPerSecond:real?1/3600:HOURS_PER_SECOND*rate,daysPerYear:real?365:yearMinutes*60*HOURS_PER_SECOND/24,animationSpeed:real?1:rate};
}
