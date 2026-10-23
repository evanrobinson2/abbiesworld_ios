import {solarCycle} from './solar-cycle.mjs';
export const LUNAR_DAYS=29.53059;
// Start at full moon; elongation advances continuously through the lunar month.
export function lunarCycle(day,hour,seasonPhase=0){
 const age=((day-1+hour/24)%LUNAR_DAYS+LUNAR_DAYS)%LUNAR_DAYS;
 const elongation=Math.PI+age/LUNAR_DAYS*Math.PI*2;
 const orbit=solarCycle(hour-elongation*12/Math.PI,seasonPhase);
 return {...orbit,illuminated:(1-Math.cos(elongation))/2,age};
}
