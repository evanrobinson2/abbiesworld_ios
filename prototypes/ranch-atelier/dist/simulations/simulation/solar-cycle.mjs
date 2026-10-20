// Stylized 42°N solar arc. Phase 0 = spring, .25 = summer, .5 = fall.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
export function solarCycle(hour,seasonPhase=0){
 const latitude=42*Math.PI/180,declination=23.44*Math.PI/180*Math.sin(seasonPhase*Math.PI*2);
 const angle=((hour%24+24)%24-12)*Math.PI/12;
 const x=-Math.cos(declination)*Math.sin(angle);
 const y=Math.sin(latitude)*Math.sin(declination)+Math.cos(latitude)*Math.cos(declination)*Math.cos(angle);
 const z=Math.sin(latitude)*Math.cos(declination)*Math.cos(angle)-Math.cos(latitude)*Math.sin(declination);
 const altitude=Math.asin(clamp(y,-1,1));
 return {direction:[x,y,z],altitude,daylight:smooth(-.12,.16,y),direct:smooth(0,.18,y),warmth:1-smooth(.08,.55,y)};
}
