// Banana split day: the practice mannequin in the Abbie's World toon set.
// Shader, presets and apply() are copied unchanged from docs/oracle/rendering/shaders-article.html (the toon set).
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
/* ---------- the one shader ---------- */
const C=h=>new THREE.Color(h);
function sharedUniforms(){return{
 uLightDir:{value:new THREE.Vector3(.55,.75,.35).normalize()},uSun:{value:C('#fff4e0')},uSky:{value:C('#a8d4f0')},uGround:{value:C('#7fae5a')},
 uShadowTint:{value:C('#6a78c8')},uRimCol:{value:C('#fff1d6')},uFogCol:{value:C('#bfe0f2')},
 uMode:{value:0},uBands:{value:3},uSoft:{value:.3},uHalf:{value:0},uHue:{value:0},uRim:{value:0},uFog:{value:0},
 uPaper:{value:0},uHalftone:{value:0},uWater:{value:0},uDither:{value:0},uTerm:{value:0},uSphereN:{value:0},uPx:{value:1},uAmb:{value:.35}};}
const VERT=`attribute vec3 aSphereN;uniform float uSphereN;varying vec3 vN;varying vec3 vW;
void main(){vec3 n=normalize(mix(normal,aSphereN,uSphereN));vN=normalize(mat3(modelMatrix)*n);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAG=`uniform vec3 uColor,uLightDir,uSun,uSky,uGround,uShadowTint,uRimCol,uFogCol;
uniform float uMode,uBands,uSoft,uHalf,uHue,uRim,uFog,uPaper,uHalftone,uWater,uDither,uTerm,uPx,uAmb;
varying vec3 vN;varying vec3 vW;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float bayer(vec2 p){p=mod(floor(p),4.);int x=int(p.x),y=int(p.y);int i=x+y*4;
 float m[16];m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
 float r=0.;for(int k=0;k<16;k++){if(k==i)r=m[k];}return r/16.;}
void main(){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 V=normalize(cameraPosition-vW);
 float ndl=dot(n,uLightDir);float l=mix(max(ndl,0.),ndl*.5+.5,uHalf);
 vec2 sp=gl_FragCoord.xy/uPx;
 float lb=l;
 if(uMode>.5){float b=max(uBands,1.);float x=l*b+(bayer(sp)-.5)*uDither;float f=fract(x),i=floor(x);float s=uSoft*.5+.002;lb=clamp((i+smoothstep(1.-2.*s,1.,f))/max(b-1.,1.),0.,1.);}
 vec3 shadow=uColor*mix(vec3(.16),uShadowTint*.55,uHue);
 vec3 lit=uColor*uSun*1.08;
 vec3 col=mix(shadow,lit,lb);
 col+=uColor*mix(uGround,uSky,n.y*.5+.5)*uAmb*(1.-lb*.6)*.5;
 col+=uColor*vec3(1.,.28,.18)*uTerm*smoothstep(.12,.3,l)*smoothstep(.55,.3,l)*.9;
 float fr=pow(1.-max(dot(n,V),0.),3.);
 col+=uRimCol*fr*uRim*(.35+.65*(ndl*.5+.5))*(1.-smoothstep(.35,.9,n.y));
 float g=nz(sp*.07)*.6+nz(sp*.31)*.4;
 col*=mix(1.,(1.-fr*.5)*(.86+.28*g),uWater);col=mix(col,mix(col,vec3(1.),.22),uWater*.6);
 float cs=7.;vec2 q=mat2(.7071,-.7071,.7071,.7071)*sp;vec2 cell=fract(q/cs)-.5;float rad=sqrt(clamp(1.-lb,0.,1.))*.62;
 col*=mix(1.,length(cell)<rad?.6:1.,uHalftone);
 col*=1.-uPaper*(nz(sp*.9)*.14+nz(sp*.045)*.1);
 float d=length(cameraPosition-vW);float ff=1.-exp(-pow(d*uFog,2.));col=mix(col,uFogCol,ff);
 gl_FragColor=vec4(col,1.);
 #include <colorspace_fragment>
}`;
const HULLV=`uniform float uW,uScreen;void main(){vec4 w=modelMatrix*vec4(position,1.);vec3 n=normalize(mat3(modelMatrix)*normal);float d=length(cameraPosition-w.xyz);
 float k=uW*mix(clamp(1.6-d*.06,.35,1.4),d*.09,uScreen);w.xyz+=n*k;gl_Position=projectionMatrix*viewMatrix*w;}`;
const HULLF=`uniform vec3 uInk;void main(){gl_FragColor=vec4(uInk,1.);
 #include <colorspace_fragment>
}`;

/* ---------- presets: the proposed toon set ---------- */
const BASE={mode:0,bands:3,soft:.3,half:0,hue:0,rim:0,fog:0,paper:0,halftone:0,water:0,dither:0,term:0,sphereN:0,amb:.35,
 ink:0,inkScreen:0,contact:0,px:1,sun:'#fff4e0',sky:'#a8d4f0',ground:'#7fae5a',tint:'#6a78c8',rimCol:'#fff1d6',fogCol:'#bfe0f2',inkCol:'#2a2238',bg:'#a8d4f0'};
const SET=[
 {id:'sunday',name:'Sunday Toon',cost:'light',use:'Ranch default, free building, the café',
  say:"Three soft bands, sky-tinted shadows, a warm rim and painted normals. No outlines, matching Evan's five favourites.",
  p:{mode:1,bands:3,soft:.45,half:.6,hue:1,rim:.45,fog:.008,sphereN:1,contact:1}},
 {id:'ink',name:'Ink Toon',cost:'medium',use:'The school, the brute fight, comic moments',
  say:'Two crisp bands and an ink shell that thins with distance. Bold and readable from far away.',
  p:{mode:1,bands:2,soft:.06,half:.35,hue:.85,rim:.2,fog:.02,sphereN:1,contact:1,ink:.03}},
 {id:'clay',name:'Clay',cost:'light',use:'Characters, the family cast, close-ups',
  say:'Soft wrapped light with a warm glow at the shadow edge, like skin and clay. The cheap half of the Storybook study.',
  p:{mode:0,half:1,hue:.9,term:1,rim:.6,fog:.05,sphereN:1,contact:1,sun:'#ffe9c4',fogCol:'#cfe6c9',tint:'#5f7fb0',bg:'#cfe6c9',sky:'#bfe3d0'}},
 {id:'paper',name:'Paper Toon',cost:'medium',use:'Papercraft figures, storybook pages',
  say:'Two flat tones, paper grain over everything and printed dots in the shadows, with a thin ink line.',
  p:{mode:1,bands:2,soft:.08,half:.3,hue:.6,paper:1,halftone:1,ink:.018,contact:1,bg:'#f1e9da',sky:'#f1e9da',fogCol:'#f1e9da',fog:.02}},
 {id:'water',name:'Watercolour',cost:'medium',use:'Maps, tile boards, memories',
  say:'Washed colour, darker pigment at the edges and paper granulation. Dorfromantik and Gris are the reference.',
  p:{mode:1,bands:3,soft:.9,half:.8,hue:1,water:1,paper:.6,fog:.045,contact:.6,bg:'#e8eef0',sky:'#dbe8ee',fogCol:'#e8eef0'}},
 {id:'moon',name:'Moon Toon',cost:'light',use:'Moonbase, space, night',
  say:'Cool key light, two hard bands, deep blue shadows and a cyan rim, like a hologram lit by radio glow.',
  p:{mode:1,bands:2,soft:.05,half:.2,hue:1,rim:1.1,fog:.04,sphereN:1,contact:1,amb:.2,sun:'#e8f0ff',sky:'#1b2547',ground:'#2a2f45',tint:'#2b3a8c',rimCol:'#5ff0ff',fogCol:'#141c36',bg:'#141c36'}},
 {id:'pixel',name:'Pixel Toon',cost:'light',use:"Grace's basement, the 8-bit coins, memory places",
  say:'Rendered at a quarter size, three bands with dithering and a chunky line. Instant memory.',
  p:{mode:1,bands:3,soft:0,half:.5,hue:.8,dither:.8,rim:.2,ink:.025,contact:1,px:.25}},
];
const PLAIN={...BASE};
const preset=p=>({...BASE,...p});

function blobTex(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const r=g.createRadialGradient(64,64,4,64,64,62);
 r.addColorStop(0,'rgba(20,25,40,.75)');r.addColorStop(.55,'rgba(20,25,40,.35)');r.addColorStop(1,'rgba(20,25,40,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const BLOB=blobTex();
function withSphereN(geo,center){const p=geo.attributes.position,n=geo.attributes.normal,a=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){let x,y,z;if(center){x=p.getX(i)-center.x;y=p.getY(i)-center.y;z=p.getZ(i)-center.z;const L=Math.hypot(x,y,z)||1;x/=L;y/=L;z/=L;}else{x=n.getX(i);y=n.getY(i);z=n.getZ(i);}a.set([x,y,z],i*3);}
 geo.setAttribute('aSphereN',new THREE.BufferAttribute(a,3));return geo;}
function hullGeo(geo){const g=geo.clone();for(const k of Object.keys(g.attributes))if(k!=='position')g.deleteAttribute(k);const m=mergeVertices(g,1e-3);m.computeVertexNormals();return m;}


async function loadMannequin(url){
 const b64=(await (await fetch(url)).text()).trim();
 const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 return new Promise((res,rej)=>new GLTFLoader().parse(bin.buffer,'',res,rej));
}
export async function buildScene(U,glbUrl){
 const scene=new THREE.Scene(),hulls=[],blobs=[],spin=new THREE.Group();scene.add(spin);
 const hullU={uW:{value:0},uScreen:{value:0},uInk:{value:C('#2a2238')}};
 const hullMat=new THREE.ShaderMaterial({uniforms:hullU,vertexShader:HULLV,fragmentShader:HULLF,side:THREE.BackSide});
 const mats={};const mat=hex=>mats[hex]||(mats[hex]=new THREE.ShaderMaterial({uniforms:{...U,uColor:{value:C(hex)}},vertexShader:VERT,fragmentShader:FRAG}));
 const addTo=(parent,geo,hex,pos,{rot,scale,center,outline=true}={})=>{withSphereN(geo,center);const m=new THREE.Mesh(geo,mat(hex));m.position.copy(pos);if(rot)m.rotation.set(...rot);if(scale)m.scale.set(...scale);parent.add(m);
  if(outline){const hm=new THREE.Mesh(hullGeo(geo),hullMat);hm.position.copy(m.position);hm.rotation.copy(m.rotation);hm.scale.copy(m.scale);parent.add(hm);hulls.push(hm);}return m;};
 const add=(...a)=>addTo(spin,...a);
 const blob=(x,z,s)=>{const b=new THREE.Mesh(new THREE.PlaneGeometry(s,s),new THREE.MeshBasicMaterial({map:BLOB,transparent:true,depthWrite:false}));b.rotation.x=-Math.PI/2;b.position.set(x,.205,z);spin.add(b);blobs.push(b);};
 const V=(x,y,z)=>new THREE.Vector3(x,y,z);
 // the picnic: a strawberry-milk tabletop
 add(new THREE.CylinderGeometry(6,6.3,.4,48),'#f6c9d4',V(0,0,0),{outline:false});
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;add(new THREE.CylinderGeometry(.9,.9,.02,24),'#fbe6ec',V(Math.cos(a)*4.3,.21,Math.sin(a)*4.3),{outline:false});}
 // the boat dish
 const dish=new THREE.SphereGeometry(1,32,12,0,Math.PI*2,Math.PI/2,Math.PI/2);
 add(dish,'#cfe9f2',V(.6,.95,0),{scale:[2.3,.6,1.05],center:V(0,0,0)});
 add(new THREE.CylinderGeometry(.35,.55,.5,20),'#cfe9f2',V(.6,.45,0));
 blob(.6,0,4.4);
 // banana halves along both sides, ends curling up like a boat
 [-1,1].forEach(z=>{const g=new THREE.TorusGeometry(3,.22,10,24,.85);g.rotateZ(-Math.PI/2-.425);g.translate(0,3,0);g.scale(1,1,.8);
  add(g,'#f5d64e',V(.6,1.0,z*.66));});
 // three scoops: vanilla, chocolate, strawberry
 [['#fbf1d9',-.75],['#7a4a2e',.6],['#f39ab1',1.95]].forEach(([c,x])=>{add(new THREE.IcosahedronGeometry(.62,2),c,V(x,1.55,0),{center:V(0,0,0)});
  // whipped cream swirl and a cherry
  add(new THREE.ConeGeometry(.34,.5,10,1),'#ffffff',V(x,2.25,0));
  add(new THREE.SphereGeometry(.16,16,12),'#d8203c',V(x,2.6,0),{center:V(0,0,0)});
  const stem=new THREE.CylinderGeometry(.018,.018,.32,5);stem.rotateZ(.4);add(stem,'#4d7a2a',V(x-.06,2.82,0),{outline:false});});
 // sprinkles on the table
 const SPR=['#ff6fa3','#7bd3f7','#ffe066','#9be37a','#c08cff'];
 for(let i=0;i<40;i++){const a=Math.random()*Math.PI*2,r=2.6+Math.random()*2.8,g=new THREE.CapsuleGeometry(.04,.16,2,6);g.rotateZ(Math.PI/2);
  add(g,SPR[i%5],V(Math.cos(a)*r,.25,Math.sin(a)*r),{rot:[0,Math.random()*3,0],outline:false});}
 // a giant spoon
 const spoon=new THREE.Group();spin.add(spoon);
 addTo(spoon,new THREE.BoxGeometry(2.6,.08,.24),'#d9dde4',V(0,0,0));
 addTo(spoon,new THREE.SphereGeometry(.45,20,10),'#d9dde4',V(1.55,.02,0),{scale:[1,.25,.75],center:V(0,0,0)});
 spoon.position.set(1.2,.3,2.6);spoon.rotation.y=.5;blob(1.6,2.5,2.4);
 // the mannequin, leaping over the dish
 const gltf=await loadMannequin(glbUrl);const man=gltf.scene;man.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(man),sz=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),k=3.6/sz.y;
 const holder=new THREE.Group();spin.add(holder);
 man.traverse(o=>{if(o.isMesh){const name=(o.material&&o.material.name)||'';const hex=name.includes('joint')?'#6e4524':'#9a6436';
   const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);geo.translate(-c.x,-box.min.y,-c.z);addTo(holder,geo,hex,V(0,0,0));}});
 holder.scale.setScalar(k);holder.position.set(-2.6,1.5,.9);holder.rotation.y=.3;
 blob(-2.3,.9,1.6);
 return {scene,spin,hulls,hullU,blobs};
}
function apply(ctx,p){const U=ctx.U;
 U.uMode.value=p.mode;U.uBands.value=p.bands;U.uSoft.value=p.soft;U.uHalf.value=p.half;U.uHue.value=p.hue;U.uRim.value=p.rim;U.uFog.value=p.fog;
 U.uPaper.value=p.paper;U.uHalftone.value=p.halftone;U.uWater.value=p.water;U.uDither.value=p.dither;U.uTerm.value=p.term;U.uSphereN.value=p.sphereN;U.uAmb.value=p.amb;
 U.uSun.value.set(p.sun);U.uSky.value.set(p.sky);U.uGround.value.set(p.ground);U.uShadowTint.value.set(p.tint);U.uRimCol.value.set(p.rimCol);U.uFogCol.value.set(p.fogCol);
 if(p.lightDir)U.uLightDir.value.copy(p.lightDir);else U.uLightDir.value.set(.55,.75,.35).normalize();
 ctx.S.hullU.uW.value=p.ink;ctx.S.hullU.uScreen.value=p.inkScreen;ctx.S.hullU.uInk.value.set(p.inkCol);
 ctx.S.hulls.forEach(h=>h.visible=p.ink>0);ctx.S.blobs.forEach(b=>{b.visible=p.contact>0;b.material.opacity=p.contact;});
 ctx.S.scene.background=ctx.bg.set(p.bg);ctx.px=p.px;}


export {SET,PLAIN,preset,sharedUniforms,apply};
export async function mountPlate(el,{glbUrl,look=0,still=false,onReady}={}){
 const canvas=el.querySelector('canvas');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:still});renderer.outputColorSpace=THREE.SRGBColorSpace;
 const U=sharedUniforms(),S=await buildScene(U,glbUrl),cam=new THREE.PerspectiveCamera(36,16/9,.1,100);
 const ctx={U,S,bg:new THREE.Color(),px:1,az:.25,look};
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;let drag=null;
 const size=()=>{const r=canvas.getBoundingClientRect();ctx.w=r.width;ctx.h=r.height;cam.aspect=r.width/r.height;cam.updateProjectionMatrix();ctx.key=null;};
 size();new ResizeObserver(size).observe(canvas);
 canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,az:ctx.az};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(drag)ctx.az=drag.az+(e.clientX-drag.x)*.008;});
 canvas.addEventListener('pointerup',()=>drag=null);
 const draw=()=>{if(!still&&!reduce&&!drag)ctx.az+=.0022;
  const R=13;cam.position.set(Math.sin(ctx.az)*R,4.4,Math.cos(ctx.az)*R);cam.lookAt(-.3,1.9,0);
  const p=ctx.look<0?PLAIN:preset(SET[ctx.look].p);const pr=Math.min(devicePixelRatio,2);
  const key=pr*p.px+'|'+ctx.w+'|'+ctx.h;if(key!==ctx.key){ctx.key=key;renderer.setPixelRatio(pr*p.px);renderer.setSize(ctx.w,ctx.h,false);}U.uPx.value=Math.max(1,pr*p.px);
  apply(ctx,p);renderer.render(S.scene,cam);if(!still)requestAnimationFrame(draw);};
 draw();if(still){draw();onReady&&onReady();}
 return {setLook(i){ctx.look=i;}};
}
