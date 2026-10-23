// Remaster R1 (docs/oracle/remaster/REMASTER_STUDY.md): the meadow's grass from the ground-cover kit
// (tools/ranch-rebuild/models/ground-cover, copied to /ranch-kits/ground-cover/ by to_game.py) instead of cone clumps.
// Six tuft shapes, clover patches and wildflower clumps are scattered as InstancedMeshes (one per kit part), thinner
// near paths and buildings, with path-edge berms along the paths. Wind is a vertex offset scaled by each blade's
// `_sway` attribute (0 at the root, 1 at the tip), driven by the weather's wind through ranch-seasons.mjs.
import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {ranchMaterial} from './tile-materials.js';
import {windUniforms} from './ranch-seasons.mjs?v=7';
import {segmentDistance} from './tile-adapter.js';

const TUFTS=['tuft-a','tuft-b','tuft-c','tuft-d','tuft-e','tuft-f'],PIECES=[...TUFTS,'clover-patch','wildflower-clump','path-edge'];
// Shared with the season shader: windTime is the presentation clock, windStrength the weather's wind
// (lab.mjs updateSeason: .12 + .45 x weather.signal.wind). Exported so the weather code can drive it directly.
export const groundWind=windUniforms;
const loader=new GLTFLoader(),materials=new Map();let kit;

function swayMaterial(source){
 const key=source.name+(source.vertexColors?'+vc':'');if(materials.has(key))return materials.get(key);
 const n=source.name.toLowerCase(),green=/grass|leaf|stem|clover|moss|tuft/.test(n),role=/stone|pebble/.test(n)?'stone':/flower/.test(n)?'plain':green?'groundcover':'plain';
 const base=ranchMaterial(source.color,role),m=base.clone();m.onBeforeCompile=base.onBeforeCompile;m.customProgramCacheKey=base.customProgramCacheKey;
 m.vertexColors=!!source.vertexColors;m.side=source.side;
 // Leaves and stems take the meadow's season tint; this module owns their wind, so the season shader adds none.
 m.userData={...base.userData,shared:true,seasonRole:green?'meadow':null,ownWind:true};
 const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey();
 m.onBeforeCompile=function(s,r){previous.call(this,s,r);s.uniforms.groundWindTime=groundWind.windTime;s.uniforms.groundWindStrength=groundWind.windStrength;
  s.vertexShader='attribute float _sway;uniform float groundWindTime;uniform float groundWindStrength;\n'+s.vertexShader;
  // Phase from the instance's position, so neighbouring tufts do not move in lockstep; tips move most.
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec2 groundCell=instanceMatrix[3].xz;
  #else
  vec2 groundCell=vec2(0.);
  #endif
  float groundPhase=groundCell.x*23.+groundCell.y*17.;
  float groundBend=_sway*_sway*groundWindStrength;
  transformed.x+=groundBend*(.07*sin(groundWindTime*1.6+groundPhase)+.03*sin(groundWindTime*3.7+groundPhase*1.3));
  transformed.z+=groundBend*.04*sin(groundWindTime*1.2+groundPhase*.7);`);};
 m.customProgramCacheKey=()=>previousKey+'-ground-wind-v1';
 materials.set(key,m);return m;
}
export function groundCoverKit(){
 return kit??=Promise.all(PIECES.map(n=>loader.loadAsync('/ranch-kits/ground-cover/'+n+'.glb').then(({scene})=>{
  scene.updateMatrixWorld(true);const parts=[];
  scene.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);
   for(const name of Object.keys(g.attributes))if(!['position','normal','color','_sway'].includes(name))g.deleteAttribute(name);
   if(!g.getAttribute('_sway'))g.setAttribute('_sway',new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count),1));
   g.setAttribute('paintPosition',g.getAttribute('position').clone());
   parts.push({geometry:g,material:swayMaterial(o.material)});});
  return parts;}))).then(list=>Object.fromEntries(PIECES.map((n,i)=>[n,list[i]])));
}

const rand=seed=>{let s=seed>>>0||1;return ()=>{s=Math.imul(s^s>>>15,1|s)+0x6d2b79f5|0;let t=Math.imul(s^s>>>7,61|s);t^=t+Math.imul(t^t>>>11,t);return ((t^t>>>14)>>>0)/4294967296;};};

// grass: the tile's grass dressing spots (metres, tile-local); plan: its paths and placements; ground(x,z): height in
// render units; S: render units per metre. Returns a Group of InstancedMeshes in tile render units.
// About 1.3 tufts per grass spot: each tuft is ~290 triangles against the old clump's 30, so density is spent where
// it reads (one tuft per spot, a second on some), not on a carpet. Tufts are drawn at 1.8x the kit's size, in line
// with the tile's other stylised plants (the cones they replace stood about 1 m tall).
export async function groundCover(grass,plan,ground,{S=.1,seed=1,secondTuft=.3,tuftScale=1.8}={}){
 const pieces=await groundCoverKit(),r=rand(seed*2654435761),group=new T.Group();group.name='Ground cover';
 const lists=Object.fromEntries(PIECES.map(n=>[n,[]])),q=new T.Quaternion(),up=new T.Vector3(0,1,0);
 const add=(name,x,z,yaw,scale)=>lists[name].push(new T.Matrix4().compose(new T.Vector3(x*S,ground(x,z),z*S),q.clone().setFromAxisAngle(up,yaw),new T.Vector3(scale*S,scale*S,scale*S)));
 const paths=plan.paths||[],places=plan.placements||[];
 const pathDistance=p=>Math.min(Infinity,...paths.flatMap(path=>path.points.slice(1).map((b,i)=>segmentDistance(p,path.points[i],b)-path.width/2)));
 const buildingDistance=p=>Math.min(Infinity,...places.filter(o=>!['field','playground'].includes(o.role)).map(o=>Math.hypot(p.x-o.x,p.z-o.z)-o.radius));
 for(const d of grass){
  // Thin out towards paths and buildings: full density 3 m away, about a third right at the clearance.
  const near=Math.min(pathDistance(d),buildingDistance(d)),keep=.35+.65*Math.min(1,Math.max(0,(near-.8)/2.2));
  const pick=r();if(pick<.06){add('clover-patch',d.x,d.z,r()*Math.PI*2,1.5*(.8+r()*.4));continue;}if(pick<.1){add('wildflower-clump',d.x,d.z,r()*Math.PI*2,1.5*(.8+r()*.4));continue;}
  for(let k=0;k<2;k++){if(k?r()>secondTuft*keep:r()>Math.max(.6,keep))continue;const a=r()*Math.PI*2,rad=k?.3+r()*.35:0;add(TUFTS[Math.floor(r()*TUFTS.length)],d.x+Math.cos(a)*rad,d.z+Math.sin(a)*rad,r()*Math.PI*2,tuftScale*(.8+r()*.4));}
 }
 // Path edges: a berm every ~1.4 m on both sides, front (+Z) towards the path, skipped inside building clearances.
 for(const path of paths)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<.5)continue;
  const nx=-dz/length,nz=dx/length,offset=path.width/2+.18;for(let t=.7;t<length-.3;t+=1.3+r()*.3)for(const side of [-1,1]){const p={x:a.x+dx*t/length+nx*offset*side,z:a.z+dz*t/length+nz*offset*side};
   if(buildingDistance(p)<.6||r()<.15)continue;if(paths.some(o=>o!==path&&o.points.slice(1).some((c,j)=>segmentDistance(p,o.points[j],c)<o.width/2+.1)))continue;
   add('path-edge',p.x,p.z,Math.atan2(-nx*side,-nz*side)+(r()-.5)*.2,.85+r()*.3);}}
 let triangles=0;
 for(const name of PIECES){const matrices=lists[name];if(!matrices.length)continue;for(const part of pieces[name]){const mesh=new T.InstancedMesh(part.geometry,part.material,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;mesh.computeBoundingSphere();group.add(mesh);triangles+=matrices.length*(part.geometry.index?part.geometry.index.count:part.geometry.getAttribute('position').count)/3;}}
 group.userData.keepInstanced=true;group.userData.groundCover={instances:Object.fromEntries(PIECES.map(n=>[n,lists[n].length])),drawCalls:group.children.length,triangles:Math.round(triangles)};
 return group;
}
