export const HOURS_PER_SECOND=24/180;
export function advanceClock(clock,seconds){const total=clock.hour+Math.max(0,seconds)*HOURS_PER_SECOND;return {hour:total%24,day:clock.day+Math.floor(total/24)};}
export function timeOfDay(hour){return hour<6||hour>=20?'night':hour<10?'morning':hour<17?'day':'evening';}
export const TIME_HOURS={morning:7,day:12,evening:18,night:20};
export function nightProgress(hour){return ((hour-20+24)%24)*18;}
