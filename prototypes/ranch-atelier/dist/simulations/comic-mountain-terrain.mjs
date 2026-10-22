// Complete compact-support mountains: every summit, shoulder and foot belongs
// to the height field used by both the renderer and terrain-aware placement.
import {random} from './tile-board.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export function comicMountainTerrain(seed=214,height=100,parameters={}){
 const scale=(parameters.diameter||100)/100,rng=random(seed);
 const peaks=[{x:-43.301,z:-75,height:height,radius:40,aspect:.94},{x:43.301,z:-75,height:height*.76,radius:40,aspect:.91},{x:-86.602,z:0,height:height*.56,radius:38,aspect:.96}].map((p,i)=>({...p,id:'mountain-'+(i+1),phase:rng()*Math.PI*2}));
 function mountain(p,x,z){const dx=x-p.x,dz=z-p.z,a=Math.atan2(dz,dx),r=Math.hypot(dx/p.aspect,dz),q=r/p.radius;if(q>=1.12)return 0;
  // Broad buttresses, intervening gullies and a pointed summit. The angular
  // terms vanish at the summit and foot, so no artificial pinwheel is exposed.
  const ridges=(.13*Math.cos(2*a+p.phase)+.09*Math.cos(3*a-p.phase)+.035*Math.cos(5*a))*Math.sin(Math.PI*clamp(q));
  const t=clamp(1-q+ridges);let body=p.height*Math.pow(t,1.15);
  for(let k=0;k<3;k++){const direction=p.phase+k*2.094,reach=p.radius*(.47+k*.02),sx=p.x+Math.cos(direction)*reach,sz=p.z+Math.sin(direction)*reach,shoulder=clamp(1-Math.hypot((x-sx)/.85,z-sz)/(p.radius*.48));body=Math.max(body,p.height*(.69-k*.09)*Math.pow(shoulder,1.35));}return body;
 }
 const field=(x,z)=>{const bodies=peaks.map(p=>mountain(p,x,z));const saddle=13*Math.pow(clamp(1-Math.hypot(x/39,(z+73)/31)),2);return Math.max(...bodies,saddle);};
 const h=(x,z)=>{x/=scale;z/=scale;const y=field(x,z);return scale*(3+y+.12*Math.sin(x/16)*Math.sin(z/21));};
 h.version=4;h.biome='comic-mountain-valley';h.seed=seed;h.parameters={diameter:scale*100};h.profile='three-complete-mountains';
 h.peaks=peaks.map(p=>({id:p.id,x:p.x*scale,z:p.z*scale,summitHeight:h(p.x*scale,p.z*scale),footprintRadius:p.radius*1.12*scale}));
 h.slope=(x,z)=>Math.hypot(h(x+.5,z)-h(x-.5,z),h(x,z+.5)-h(x,z-.5));
 h.habitat=(x,z)=>{const y=h(x,z)/scale,slope=h.slope(x,z),u=x/scale,v=z/scale;
 const patch=.5+.24*Math.sin(u/15+.7*Math.sin(v/19))+.2*Math.cos(v/18-u/31),treeline=42+6*Math.sin(u/16+v/23),woodland=clamp(patch+(y>7&&y<32?.28:0))*clamp((treeline-y)/14);
 return {slope,woodland,moisture:.55,floodplain:0,kind:y>treeline||slope>2.8?'rock':woodland>.46?'woodland':'meadow'};};
 h.surfaceColor=(x,z)=>{const y=h(x,z)/scale,slope=h.slope(x,z),local=peaks.reduce((a,b)=>mountain(a,x/scale,z/scale)>mountain(b,x/scale,z/scale)?a:b);if(y>local.height*.64+3+5*Math.sin(x/(7*scale)+z/(11*scale)))return '#f0e6c9';if(y>local.height*.27+3)return slope>2?'#94a298':'#b7bca7';if(y>15)return slope>1.5?'#82977c':'#9dac87';return '#b4bc91';};
 return h;
}
