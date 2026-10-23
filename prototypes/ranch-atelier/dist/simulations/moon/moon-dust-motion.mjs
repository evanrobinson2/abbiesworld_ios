import {PLANET_GRAVITY} from '../planet-gravity.mjs';
// Dust follows a launch-space ballistic arc, not the height of passing terrain.
export const LUNAR_GRAVITY=PLANET_GRAVITY.moon;
export const dustHeight=(height,up,age,gravity=LUNAR_GRAVITY)=>height+up*age-gravity*age*age*.5;
export function dustClear(heightAt,x,z,y,vx,vz,up,age,gravity=LUNAR_GRAVITY){
 for(let i=1;i<=8;i++){const t=age*i/8;if(dustHeight(y,up,t,gravity)<=heightAt(x+vx*t,z+vz*t)+.015)return false;}return true;
}
