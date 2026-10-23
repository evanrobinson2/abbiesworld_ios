import * as T from 'three';
import {noise,ASSUMPTIONS as A} from './basin-land.mjs';
// AW-STUDY-0019 vegetation overhaul for the Basin (?trees=v2). What changes against v1, and why (docs/oracle/vegetation):
// - Stands, not a comb: tree density follows a slow clump field, so forests have clearings, dense cores and glades.
// - Forest edges are an ecotone: density ramps up over ~75 m, edge trees are young and small, shrubs fringe the margin.
// - Aspen grow in clonal groves (one root system): each grove shares a tint, and in autumn a whole grove turns at once.
// - Colour is per tree and per stand: blue-green to olive spruce, bluer and smaller near treeline. Mid values, not black.
// - Every crown is lit top to base (light tips, shaded skirts) and the ground under a stand darkens, so a forest reads as
//   one mass from the rim and as single trees up close.
// - Wind: one vertex sway with slow gust fronts that roll across the valley; aspen quake more than spruce.
// - Phone cost: instanced per 80 m chunk, full trees near the camera, a 5-sided stand-in beyond LOD_NEAR; one material
//   per kind. About 40% fewer triangles than v1 in the default view.
const LOD_NEAR=110,CHUNK=32;
const PALETTE={
 spruce:['#3d6e4b','#4a7a45','#5a8540','#41704f'],
 aspen:{summer:['#86b84c','#93c055','#76aa45','#a2c65e'],autumn:['#f3c330','#f1aa2b','#e9cb4c','#dc8d27','#9fbe4b']},
 willow:{summer:['#82a94d','#7ba146'],autumn:['#cdb54d','#b8a646']},
 shrub:{summer:['#4f7a36','#5d8640','#47703a'],autumn:['#b8662f','#c9973c','#7b9443']},
 rock:['#9b968c','#8a867e','#a7a196']};
export function plantFlora({L,covers,toX,toY,toZ,seed=7,season='summer',landGeo,root}){
 const {N,cell,half,h}=L,{fbm}=noise(seed^0x51f1);
 const r=(()=>{let s=(seed*2246822519)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
 const forest=k=>k==='spruce'||k==='aspen'||k==='willow';
 // How much of the neighbourhood (5x5 cells, 125 m) is forest: 1 deep inside a stand, ~.5 on its edge.
 const frac=new Float32Array(N*N);
 for(let i=0;i<N*N;i++){if(!forest(covers[i]))continue;const gx=i%N,gz=(i/N)|0;let n=0,t=0;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const x=gx+dx,z=gz+dz;if(x<0||z<0||x>=N||z>=N)continue;t++;if(forest(covers[z*N+x]))n++;}frac[i]=n/t;}
 const pick=(a,u)=>a[Math.min(a.length-1,Math.floor(u*a.length))],c=new T.Color(),hash=(a,b)=>{let s=(a*73856093^b*19349663^seed)>>>0;s^=s>>>13;s=Math.imul(s,0x5bd1e995)>>>0;return (s>>>8)/16777216;};
 const kinds={spruce:[],aspen:[],shrub:[],rock:[]},density=new Float32Array(N*N);
 const add=(kind,x,z,y,sy,sxz,col)=>{const gx=Math.round((x+half)/cell),gz=Math.round((z+half)/cell);kinds[kind].push({x,y,z,sy,sxz,rot:r()*6.283,col:col.clone(),chunk:(Math.min(N-1,Math.max(0,gz))>>5)*99+(Math.min(N-1,Math.max(0,gx))>>5)});};
 for(let i=0;i<N*N;i++){
  const k=covers[i],gx=i%N,gz=(i/N)|0,x0=gx*cell-half,z0=gz*cell-half,e=h[i]-A.lake;
  if(k==='water')continue;
  const clump=fbm(x0/260,z0/260,3),stand=fbm(x0/700+9,z0/700,2),f=frac[i];
  // Clearings and dense cores: the clump field opens glades where it is low.
  const open=Math.max(0,Math.min(1,(clump-.42)/.14)),edge=Math.max(0,Math.min(1,(f-.25)/.6));
  if(k==='spruce'||k==='tundra'){
   const alp=Math.max(0,Math.min(1,(e-(A.treeline-160))/200)),per=(k==='tundra'?.12:1.9)*(.15+.85*open)*(.35+.65*edge);
   let n=Math.floor(per+r());density[i]=Math.min(1,per/1.6);
   while(n-->0){const x=x0+(r()-.5)*cell,z=z0+(r()-.5)*cell,y=hAt(x,z);
    const t=(1.5+1.5*r())*(.55+.45*edge)*(1-.5*alp);
    c.set(pick(PALETTE.spruce,(stand+r()*.35)%1)).offsetHSL(.03*alp+(r()-.5)*.02,-.08*alp,(r()-.5)*.06);
    add('spruce',x,z,y,t,.75+.45*r(),c);}
   if(k==='spruce'&&f<.7&&r()<.3)shrubAt(x0,z0,e);
  }else if(k==='aspen'){
   // A clonal grove: ~300 m cells share a tint, and in autumn they turn together (some groves still green).
   const g=hash(Math.floor(x0/300),Math.floor(z0/300)),per=2.2*(.2+.8*open)*(.4+.6*edge);
   let n=Math.floor(per+r());density[i]=Math.min(1,per/1.4);
   while(n-->0){const x=x0+(r()-.5)*cell,z=z0+(r()-.5)*cell;c.set(pick(PALETTE.aspen[season]||PALETTE.aspen.summer,g)).offsetHSL((r()-.5)*.02,0,(r()-.5)*.07);
    add('aspen',x,z,hAt(x,z),(1.1+.8*r())*(.6+.4*edge),.8+.35*r(),c);}
   if(f<.75&&r()<.35)shrubAt(x0,z0,e);
  }else if(k==='willow'){
   let n=Math.floor(1.6+r());density[i]=.5;while(n-->0){const x=x0+(r()-.5)*cell,z=z0+(r()-.5)*cell;c.set(pick(PALETTE.willow[season]||PALETTE.willow.summer,r())).offsetHSL(0,0,(r()-.5)*.06);
    add('shrub',x,z,hAt(x,z),.9+.6*r(),1.2+.5*r(),c);}
  }else if(k==='meadow'||k==='shore'){
   // Meadow: a lone specimen tree now and then, and shrubs only where the forest is near (the edge spills out).
   // A small grove (3-7 stems) stands out in the meadow now and then: never a lone lollipop.
   if(k==='meadow'&&r()<.006){const g=r(),n=3+Math.floor(r()*5);for(let j=0;j<n;j++){const a=r()*6.283,d=r()*cell*.7,x=x0+Math.cos(a)*d,z=z0+Math.sin(a)*d;
     c.set(pick(PALETTE.aspen[season]||PALETTE.aspen.summer,g)).offsetHSL(0,0,(r()-.5)*.06);add('aspen',x,z,hAt(x,z),(1.3+.8*r())*(1-d/cell*.6),.85+.3*r(),c);}
    shrubAt(x0,z0,e);}
   if(nearForest(gx,gz,1)&&r()<.12)shrubAt(x0,z0,e);
  }else if(k==='scree'||k==='cliff'||k==='rock'){
   if(r()<.22){const x=x0+(r()-.5)*cell,z=z0+(r()-.5)*cell;c.set(pick(PALETTE.rock,r()));add('rock',x,z,hAt(x,z)-.6,.4+.8*r(),.8+.6*r(),c);}
  }
 }
 function shrubAt(x0,z0,e){const n=1+Math.floor(r()*2);for(let j=0;j<n;j++){const x=x0+(r()-.5)*cell,z=z0+(r()-.5)*cell;c.set(pick(PALETTE.shrub[season]||PALETTE.shrub.summer,r())).offsetHSL(0,0,(r()-.5)*.06);add('shrub',x,z,hAt(x,z),.45+.4*r(),1+.6*r(),c);}}
 function nearForest(gx,gz,R=2){for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++){const x=gx+dx,z=gz+dz;if(x>=0&&z>=0&&x<N&&z<N&&forest(covers[z*N+x]))return true;}return false;}
 function hAt(x,z){const gx=(x+half)/cell,gz=(z+half)/cell,i=Math.max(0,Math.min(N-2,Math.floor(gx))),j=Math.max(0,Math.min(N-2,Math.floor(gz))),u=Math.min(1,Math.max(0,gx-i)),v=Math.min(1,Math.max(0,gz-j));
  return h[j*N+i]*(1-u)*(1-v)+h[j*N+i+1]*u*(1-v)+h[(j+1)*N+i]*(1-u)*v+h[(j+1)*N+i+1]*u*v;}
 // The forest floor: darker and a touch warmer under a stand, so the stand reads as one mass from far away.
 const col=landGeo.attributes.color,floor=new T.Color('#3f5e33'),glade=new T.Color('#a8b85a');
 for(let i=0;i<N*N;i++){c.fromArray(col.array,i*3);const d=density[i];if(d>0)c.lerp(floor,.55*d);
  else if(covers[i]==='meadow'){const fl=fbm((i%N)/7,((i/N)|0)/7,2);if(fl>.62)c.lerp(glade,(fl-.62)*1.4);}
  c.toArray(col.array,i*3);}
 col.needsUpdate=true;
 // Meshes: one shared material per kind, an InstancedMesh pair (near, far) per chunk, swapped by camera distance.
 const wind={value:0},geos={spruce:[spruceHi(),spruceLo()],aspen:[aspenHi(),aspenLo()],shrub:[shrubHi(),shrubLo()],rock:[rockGeo(1),rockGeo(0)]};
 const sway={spruce:.02,aspen:.035,shrub:.03,rock:0},chunks=[],group=new T.Group();group.name='Basin flora';root.add(group);
 const m4=new T.Matrix4(),q=new T.Quaternion(),s3=new T.Vector3(),p3=new T.Vector3(),up=new T.Vector3(0,1,0);
 for(const [kind,list] of Object.entries(kinds)){
  const mat=floraMaterial(sway[kind],wind,{spruce:'evergreen',aspen:'deciduous',shrub:'deciduous'}[kind]),byChunk=new Map();list.forEach(t=>{(byChunk.get(t.chunk)||byChunk.set(t.chunk,[]).get(t.chunk)).push(t);});
  for(const [id,ts] of byChunk){const pair=geos[kind].map((g,lod)=>{const m=new T.InstancedMesh(g,mat,ts.length);m.name=`${kind} ${lod?'far':'near'}`;
    ts.forEach((t,j)=>{q.setFromAxisAngle(up,t.rot);s3.set(t.sy*t.sxz,t.sy,t.sy*t.sxz);p3.set(toX(t.x),toY(t.y)-.04,toZ(t.z));m.setMatrixAt(j,m4.compose(p3,q,s3));m.setColorAt(j,t.col);});
    m.computeBoundingSphere();m.castShadow=lod===0&&kind!=='rock';m.receiveShadow=true;m.visible=lod===1;group.add(m);return m;});
   chunks.push({near:pair[0],far:pair[1],centre:pair[1].boundingSphere.center.clone(),radius:pair[1].boundingSphere.radius});}
 }
 const counts=Object.fromEntries(Object.entries(kinds).map(([k,v])=>[k,v.length])),cam=new T.Vector3();
 return {group,counts,
  // Call once per frame (or from any visible mesh's onBeforeRender): swaps near and far trees and moves the wind.
  update(camera,time=performance.now()/1000){wind.value=time;cam.copy(camera.position);
   for(const ch of chunks){const near=cam.distanceTo(ch.centre)-ch.radius*.6<LOD_NEAR;ch.near.visible=near;ch.far.visible=!near;}},
  triangles(){let n=0;for(const ch of chunks){const m=ch.near.visible?ch.near:ch.far;n+=m.count*(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;}return Math.round(n);}};
}
// Wind and colour: the instance colour tints leaves only (attribute leaf), so aspen bark stays white in any season.
// Sway grows with height squared; a slow gust front rolls across the valley so neighbouring stands move together.
function floraMaterial(amp,wind,role){const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:0});if(role){m.userData.dorfRole='foliage';m.userData.seasonRole=role;}
 m.onBeforeCompile=sh=>{sh.uniforms.uWind=wind;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float leaf;\nuniform float uWind;')
   .replace('#include <color_vertex>','vColor=vec3(1.0);\n#ifdef USE_COLOR\nvColor*=color;\n#endif\n#ifdef USE_INSTANCING_COLOR\nvColor*=mix(vec3(1.0),instanceColor,leaf);\n#endif')
   .replace('#include <begin_vertex>',`#include <begin_vertex>
#ifdef USE_INSTANCING
{vec3 o=instanceMatrix[3].xyz;float ph=o.x*.11+o.z*.07,gust=.55+.45*sin(uWind*.35-o.x*.025-o.z*.018),k=${amp.toFixed(3)}*position.y*position.y*gust;
transformed.x+=sin(uWind*1.6+ph)*k;transformed.z+=cos(uWind*1.3+ph*1.7)*k*.6;}
#endif`);};
 m.customProgramCacheKey=()=>'basin-flora-'+amp;return m;}
// Geometry: low poly with smooth normals (faceting reads as cheap), lit by vertex colour from shaded base to light tips.
function rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function cone(r0,y0,y1,sides,jit,rr){const g=new T.ConeGeometry(r0,y1-y0,sides,1,true);g.translate(0,(y0+y1)/2,0);const p=g.attributes.position;
 for(let i=0;i<p.count;i++)if(p.getY(i)<(y0+y1)/2){const k=1+(rr()-.5)*jit;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);p.setY(i,p.getY(i)-rr()*.05);}g.computeVertexNormals();return g;}
function blobAt(rad,x,y,z,sy,detail){const g=new T.IcosahedronGeometry(rad,detail);g.scale(1,sy,1);g.translate(x,y,z);return g;}
function bake(parts,shade){const pos=[],nor=[],col=[],leaf=[],c=new T.Color();parts.forEach(([g,isLeaf,base,top,y0,y1])=>{const n=g.index?g.toNonIndexed():g,p=n.attributes.position,nn=n.attributes.normal;
  for(let k=0;k<p.count;k++){pos.push(p.getX(k),p.getY(k),p.getZ(k));nor.push(nn.getX(k),nn.getY(k),nn.getZ(k));const t=Math.max(0,Math.min(1,(p.getY(k)-y0)/(y1-y0)));c.set(base).lerp(new T.Color(top),t).multiplyScalar(shade?(.62+.5*t):1);col.push(c.r,c.g,c.b);leaf.push(isLeaf?1:0);}});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setAttribute('leaf',new T.Float32BufferAttribute(leaf,1));return g;}
const trunk=(r,y1,colr)=>{const g=new T.CylinderGeometry(r*.7,r,y1,5,1,true);g.translate(0,y1/2,0);return [g,0,colr,colr,0,y1];};
function spruceHi(){const rr=rnd(11),tiers=[[.42,.16,.62],[.34,.4,.86],[.25,.64,1.1],[.15,.88,1.34]];
 return bake([...tiers.map(([rad,y0,y1])=>[cone(rad,y0,y1,8,.28,rr),1,'#7d8a7a','#ffffff',0,1.34]),trunk(.045,.3,'#5b4330')],true);}
function spruceLo(){const g=new T.ConeGeometry(.36,1.2,5,1,true);g.translate(0,.74,0);return bake([[g,1,'#8a968a','#ffffff',.14,1.34]],true);}
function aspenHi(){const b=(r,x,y,z)=>[blobAt(r,x,y,z,1.25,1),1,'#9aa58f','#ffffff',.5,1.4];return bake([trunk(.032,.95,'#ece8dc'),b(.22,0,.78,0),b(.2,.13,.95,-.06),b(.19,-.12,1.0,.08),b(.17,.04,1.16,.02),b(.12,-.03,1.32,-.02)],true);}
function aspenLo(){return bake([[blobAt(.27,0,.95,0,1.45,0),1,'#a3ad98','#ffffff',.55,1.35]],true);}
function shrubHi(){const b=(r,x,y,z)=>[blobAt(r,x,y,z,.85,1),1,'#7f8a76','#ffffff',-.05,.5];return bake([b(.26,0,.2,0),b(.19,.2,.14,.08),b(.17,-.15,.13,-.1)],true);}
function shrubLo(){return bake([[blobAt(.3,0,.18,0,.8,0),1,'#8a947f','#ffffff',-.05,.5]],true);}
function rockGeo(d){const g=new T.DodecahedronGeometry(.4,d?0:0);g.scale(1,.55,.9);g.translate(0,.12,0);return bake([[g,1,'#c9c9c9','#ffffff',-.2,.35]],false);}
