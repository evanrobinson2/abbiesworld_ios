import * as T from 'three';
import {makeBasin,cover,noise,ASSUMPTIONS as A} from './basin-land.mjs';
import {plantFlora} from './basin-flora.mjs';
// Draws the Basin: the eroded land, its rivers and tarns, the lake running out to a far shore, the forests by cover,
// and the far mountains beyond the map (the same uplift with no erosion). Render units are 0.1 m like the tiles,
// and the land is shifted so the camp site the land chose sits at the origin, where the first tile will go.
const U=.1;
const COVER={water:'#5d7f6a',shore:'#9ba46c',meadow:'#7fae45',willow:'#5d8f36',aspen:'#6c9c3c',spruce:'#2f5a2c',cliff:'#6f6a5f',tundra:'#8e9661',scree:'#9a958a',rock:'#7d7a74',snow:'#eef2f6'};
// trees: 'v1' (the first pass) or 'v2' (the AW-STUDY-0019 overhaul in basin-flora.mjs); season tints v2 groves.
export function createBasinWorld({seed=7,trees='v1',season='summer'}={}){
 const L=makeBasin(seed),{N,cell,half,h}=L,[sx,sz]=L.siteXZ,sy=L.siteHeight;
 const root=new T.Group();root.name='Basin world';
 const toX=x=>(x-sx)*U,toY=y=>(y-sy)*U,toZ=z=>(z-sz)*U,lakeY=toY(A.lake);
 const {fbm}=noise(seed^0x9e37);
 const colours=Object.fromEntries(Object.entries(COVER).map(([k,v])=>[k,new T.Color(v)]));
 // Land: one grid mesh, vertex colours by ground cover with a little mottling so forests and meadows read.
 const geo=new T.PlaneGeometry((N-1)*cell*U,(N-1)*cell*U,N-1,N-1);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,col=new Float32Array(N*N*3),c3=new T.Color(),covers=new Array(N*N);
 for(let i=0;i<N*N;i++){const gx=i%N,gz=(i/N)|0,x=gx*cell-half,z=gz*cell-half;pos.setXYZ(i,toX(x),toY(h[i]),toZ(z));const k=covers[i]=cover(L,i);
  c3.copy(colours[k]);const m=fbm(x/90,z/90,3)-.5;c3.offsetHSL(m*.03,m*.08,m*.1);if(k==='spruce'||k==='aspen')c3.lerp(colours.meadow,Math.max(0,.25-L.slope[i])*.3);c3.toArray(col,i*3);}
 geo.setAttribute('color',new T.BufferAttribute(col,3));geo.computeVertexNormals();
 const restY=Float32Array.from({length:N*N},(_,i)=>pos.getY(i)),restCol=Float32Array.from(col);
 // Materials carry the tiles' shading and season roles, so the land and the tiles share one look and one year.
 const landMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0});landMat.userData.dorfRole='ground';landMat.userData.seasonRole='ground';
 const land=new T.Mesh(geo,landMat);land.name='Basin land';land.receiveShadow=true;root.add(land);
 // Rivers and tarns: a water sheet on the cells that hold water; dry corners tuck under the ground so banks stay clean.
 const wpos=[],widx=[],map=new Int32Array(N*N).fill(-1);
 const vert=i=>{if(map[i]>=0)return map[i];const gx=i%N,gz=(i/N)|0,w=L.water[i]>-1e8?L.water[i]:h[i]-1.5;map[i]=wpos.length/3;wpos.push(toX(gx*cell-half),toY(w),toZ(gz*cell-half));return map[i];};
 for(let gz=0;gz<N-1;gz++)for(let gx=0;gx<N-1;gx++){const a=gz*N+gx,b=a+1,c=a+N,d=c+1,q=[a,b,c,d];if(!q.some(i=>L.water[i]>-1e8&&h[i]>=A.lake))continue;widx.push(vert(a),vert(c),vert(b),vert(b),vert(c),vert(d));}
 const waterMat=new T.MeshStandardMaterial({color:'#2f6f86',roughness:.12,metalness:.05});
 if(widx.length){const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wpos,3));wg.setIndex(widx);wg.computeVertexNormals();const streams=new T.Mesh(wg,waterMat);streams.name='Basin rivers and tarns';streams.userData.noInk=true;streams.receiveShadow=true;root.add(streams);}
 // The lake: one sheet at lake level reaching past the far shore.
 const lake=new T.Mesh(new T.PlaneGeometry(4000,4000),waterMat);lake.rotation.x=-Math.PI/2;lake.position.set(0,lakeY,0);lake.name='Basin lake';lake.userData.noInk=true;root.add(lake);
 // Far mountains: the uplift with no erosion, coarse, on a 24 km grid aligned with the map edge; hidden under the map.
 const F=121,fc=200,fhalf=(F-1)*fc/2,fg=new T.PlaneGeometry((F-1)*fc*U,(F-1)*fc*U,F-1,F-1);fg.rotateX(-Math.PI/2);
 const fp=fg.attributes.position,fcol=new Float32Array(F*F*3);
 for(let i=0;i<F*F;i++){const x=(i%F)*fc-fhalf,z=((i/F)|0)*fc-fhalf,inside=Math.abs(x)<half-1&&Math.abs(z)<half-1;let y=L.uplift(x,z);if(inside)y-=300;fp.setXYZ(i,toX(x),toY(y),toZ(z));
  }
 fg.computeVertexNormals();const fn=fg.attributes.normal;
 for(let i=0;i<F*F;i++){const y=fp.getY(i)/U+sy,steep=1-fn.getY(i),k=y<A.lake+2?'shore':steep>.32?(y>A.treeline?'rock':'cliff'):y>A.snowline+250?'snow':y>A.treeline+120?'scree':y>A.treeline?'tundra':y>90?'spruce':'aspen';colours[k].toArray(fcol,i*3);}
 fg.setAttribute('color',new T.BufferAttribute(fcol,3));
 const farMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1});farMat.userData.dorfRole='ground';farMat.userData.seasonRole='ground';const far=new T.Mesh(fg,farMat);far.name='Basin far mountains';root.add(far);
 const forests=[];let flora=null;
 if(trees==='v2'){flora=plantFlora({L,covers,toX,toY,toZ,seed,season,landGeo:geo,root});restCol.set(col);land.onBeforeRender=(r,sc,camera)=>flora.update(camera);
  flora.group.traverse(m=>{if(!m.isInstancedMesh)return;m.userData.rest=Array.from({length:m.count},(_,j)=>{const x=new T.Matrix4();m.getMatrixAt(j,x);return x;});forests.push(m);});}
 else{
 // Trees by cover: spruce on the slopes, aspen groves lower down, willow along wet ground. Instanced, deterministic.
 const r=(()=>{let s=(seed*2654435761)>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};})();
 const spruceGeo=mergeCones([[0,.5,.34,.55],[.35,.95,.27,.45],[.7,1.25,.18,.35]],'#2c5a2e','#1f3f22'),aspenGeo=blob('#79a845','#5d8a34'),willowGeo=blob('#6e9a3e','#4f7a2c');
 const spots={spruce:[],aspen:[],willow:[]};
 for(let i=0;i<N*N;i++){const k=covers[i];const per=k==='spruce'?1.6:k==='aspen'?1.1:k==='willow'?.8:k==='tundra'?.05:k==='meadow'?.03:0;let n=Math.floor(per+r());
  while(n-->0){const x=(i%N+r()-.5)*cell-half,z=(((i/N)|0)+r()-.5)*cell-half,y=L.h[i];if(L.water[i]>-1e8)break;spots[k==='tundra'?'spruce':k==='meadow'?'aspen':k].push([x,y,z]);}}
 const m4=new T.Matrix4(),q=new T.Quaternion(),s3=new T.Vector3(),p3=new T.Vector3(),up=new T.Vector3(0,1,0);
 const plant=(geo,list,size,name,role)=>{if(!list.length)return;const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9});mat.userData.dorfRole='foliage';mat.userData.seasonRole=role;const mesh=new T.InstancedMesh(geo,mat,list.length);mesh.name=name;
  list.forEach(([x,y,z],j)=>{const t=size[0]+(size[1]-size[0])*r();q.setFromAxisAngle(up,r()*6.28);s3.set(t*(.8+.3*r()),t,t*(.8+.3*r()));p3.set(toX(x),toY(y)-.05,toZ(z));mesh.setMatrixAt(j,m4.compose(p3,q,s3));});
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.rest=list.map((_,j)=>{const m=new T.Matrix4();mesh.getMatrixAt(j,m);return m;});root.add(mesh);forests.push(mesh);};
 plant(spruceGeo,spots.spruce,[1.6,2.8],'Spruce forest','evergreen');plant(aspenGeo,spots.aspen,[1.1,1.8],'Aspen groves','deciduous');plant(willowGeo,spots.willow,[.5,.9],'Willow thickets','deciduous');
 }
 // Facts for readouts and later tiles: where the river meets the lake, the land's own numbers.
 const mouth=L.mouth>=0?new T.Vector3(toX((L.mouth%N)*cell-half),lakeY,toZ(((L.mouth/N)|0)*cell-half)):new T.Vector3(0,lakeY,-80);
 const heightAt=(x,z)=>{const gx=(x/U+sx+half)/cell,gz=(z/U+sz+half)/cell,i=Math.max(0,Math.min(N-2,Math.floor(gx))),j=Math.max(0,Math.min(N-2,Math.floor(gz))),u=Math.min(1,Math.max(0,gx-i)),v=Math.min(1,Math.max(0,gz-j));
  const a=h[j*N+i],b=h[j*N+i+1],c=h[(j+1)*N+i],d=h[(j+1)*N+i+1];return toY(a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v);};
 // Stand on the camp site and look down the valley to the lake.
 function frame(camera,orbit){const dir=new T.Vector3(mouth.x*.3,0,-1).normalize();orbit.target.set(dir.x*45,heightAt(dir.x*45,dir.z*45)+1,dir.z*45);camera.position.set(-dir.x*50,heightAt(-dir.x*50,-dir.z*50)+30,-dir.z*50);camera.far=Math.max(camera.far,3200);camera.updateProjectionMatrix();orbit.update();}
 // The board in the basin: inside the placed tiles and the empty hexes around them the ground follows the tile
 // terrain (the same heightAt the tiles are built from), then blends back into the basin over half a tile, so tiles
 // sit flush in the land and the hexes you can place on are open ground. Trees step out of the way.
 const meadow=colours.meadow;
 function fitBoard({cells=[],radius=5,heightAt:tileHeight}={}){
  const inner=radius*.98,outer=radius*1.9,wOf=(x,z)=>{let d=Infinity;for(const c of cells)d=Math.min(d,Math.hypot(x-c.x,z-c.z));return d<=inner?1:d>=outer?0:1-smoothstep((d-inner)/(outer-inner));};
  for(let i=0;i<N*N;i++){const x=pos.getX(i),z=pos.getZ(i),w=cells.length?wOf(x,z):0,y0=restY[i];
   if(w<=0){pos.setY(i,y0);col[i*3]=restCol[i*3];col[i*3+1]=restCol[i*3+1];col[i*3+2]=restCol[i*3+2];continue;}
   const yt=tileHeight(x/U,z/U)*U-.06;pos.setY(i,y0*(1-w)+yt*w);for(let k=0;k<3;k++)col[i*3+k]=restCol[i*3+k]*(1-w)+[meadow.r,meadow.g,meadow.b][k]*w;}
  pos.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
  const zero=new T.Matrix4().makeScale(0,0,0),p=new T.Vector3();
  for(const mesh of forests){mesh.userData.rest.forEach((m,j)=>{p.setFromMatrixPosition(m);mesh.setMatrixAt(j,cells.length&&wOf(p.x,p.z)>.02?zero:m);});mesh.instanceMatrix.needsUpdate=true;}
 }
 return {root,land:L,facts:L.facts,flora,heightAt,mouth,frame,fitBoard,dispose(){root.traverse(o=>{o.geometry?.dispose();});}};
}
function smoothstep(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function mergeCones(tiers,light,dark){const parts=[];for(const [y0,y1,rad,] of tiers){const g=new T.ConeGeometry(rad,y1-y0,7,1);g.translate(0,(y0+y1)/2,0);parts.push(g);}const trunk=new T.CylinderGeometry(.04,.05,.3,5);trunk.translate(0,.15,0);parts.push(trunk);return merge(parts,(i,y)=>i===parts.length-1?'#5b4330':y>.8?light:dark);}
function blob(light,dark){const crown=new T.IcosahedronGeometry(.38,1);crown.scale(1,1.35,1);crown.translate(0,.75,0);const trunk=new T.CylinderGeometry(.035,.045,.4,5);trunk.translate(0,.2,0);return merge([crown,trunk],(i,y)=>i===1?'#d8d2c4':y>.8?light:dark);}
function merge(parts,tint){const pos=[],col=[],c=new T.Color();parts.forEach((g,i)=>{const n=g.index?g.toNonIndexed():g,p=n.attributes.position;for(let k=0;k<p.count;k++){pos.push(p.getX(k),p.getY(k),p.getZ(k));c.set(tint(i,p.getY(k)));col.push(c.r,c.g,c.b);}});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;}
