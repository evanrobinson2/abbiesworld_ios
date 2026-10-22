import * as T from 'three';
import {goatPlaySpec,playHeight} from './ranch-play-spec.mjs';
export {goatPlaySpec,playHeight};
function box(g,x,y,z,w,h,d,color){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function goatPlay(spec){const g=new T.Group(),pts=[];const nx=20,nz=12,w=spec.length,d=spec.width+1.3;for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const p=(a,b)=>{const x=-w/2+w*a/nx,z=-d/2+d*b/nz;return [x,playHeight(spec,x,z),z];};pts.push(...p(i,j),...p(i,j+1),...p(i+1,j),...p(i+1,j),...p(i,j+1),...p(i+1,j+1));}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));geo.computeVertexNormals();const m=new T.Mesh(geo,new T.MeshStandardMaterial({color:'#ad895a',roughness:1}));m.receiveShadow=true;m.castShadow=true;g.add(m);for(let i=-2;i<=2;i++)box(g,i*spec.length/7,spec.height+.012,0,.055,.025,spec.width,'#c5a474');g.userData.inspect={title:'Goat climbing mound',kind:'Playpen',description:'A low climbing platform with sloped approaches.'};return g;}
export function playground(level=1){const g=new T.Group(),scale=.8+level*.15;const wood='#af8256',red='#b9563b',teal='#4f8986';
 box(g,0,.035,0,7,.07,5.5,'#c6b58a');
 // Swing bays, scaled together with their clear space.
 const seats=level;for(const x of [-2.5,.5]){for(const z of [-1.7,-.3]){const post=box(g,x,1.15,z,.13,2.3,.13,wood);post.rotation.x=z<-1?.22:-.22;}}box(g,-1,2.3,-1,3.3,.16,.16,wood);
 for(let i=0;i<seats;i++){const x=-2+(i+.5)*2/seats;for(const dx of [-.22,.22])box(g,x+dx,1.48,-1,.025,1.5,.025,'#646958');box(g,x,.72,-1,.58,.1,.35,teal);}
 // Low slide and ladder.
 for(const x of [1.45,2.35])for(const z of [-1.5,-.6])box(g,x,.65,z,.12,1.3,.12,wood);box(g,1.9,1.32,-1.05,1.1,.12,1.1,teal);
 const slide=box(g,1.9,.72,.35,.9,.09,2.8,red);slide.rotation.x=.46;
 for(let i=0;i<4;i++)box(g,1.9,.25+i*.3,-1.8,.8,.08,.15,wood);
 // Sandpit and a supervising bench.
 box(g,-1,.12,1.45,2.1,.2,1.5,wood);box(g,-1,.23,1.45,1.9,.04,1.3,'#e0c68a');box(g,2.5,.5,2,.95,.12,.4,wood);for(const x of [2.2,2.8])box(g,x,.25,2,.1,.5,.3,wood);
 g.scale.setScalar(scale);g.userData.inspect={title:'Children’s playground',kind:'Play space',description:'Swings, a low slide, sandpit and a nearby bench. Child play behaviour is not simulated yet.'};return g;}
