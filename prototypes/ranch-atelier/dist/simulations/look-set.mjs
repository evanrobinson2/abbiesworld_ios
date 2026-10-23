// The loved looks from AW-STUDY-0045 (Evan's picks, 2026-10-23), built so we have them. One shared material, one signal each:
//   inkpaper   Okami's ink wash, paper grain and broken brush line, red accents kept. Signal `telling`: Daddy's stories,
//              flashbacks and memory places. The world turns to a page as the signal rises.
//   lineart    Sable's flat colour fields and thick ink lines, for one themed place (a comic page, Abbie's sketchbook).
//   dusk       Dredge's green mist, painted grain and one warm lantern. Signal `dusk`: fog, lantern and mood together, for
//              the ship adventure. Playful-tense, never scary (curious things in the mist, a bell that answers).
//   onebit     Obra Dinn's one-bit dither: the Game Boy and old-screen flashback in Grace's basement. Diegetic, no UI.
// (Painted Brush, the Arcane-inspired look, is painted-brush.mjs; the orb that unlocks a new world is orb-kit.mjs.)
//   const L = applyLook(T, root, 'inkpaper', {scene});   swaps the look onto every mesh under root (Mesh, SkinnedMesh,
//                                                        material arrays); each part keeps its map, colour and alpha
//   L.set(k)        the look's signal, 0 to 1: scales wash, paper, fog and ink; at 0 the original materials come back
//   L.update(secs)  per frame, for the lantern flicker and anything time-driven
//   L.restore()     puts everything back
// Style only: no game art. Skinned meshes get an ink shell bound to the same skeleton.
import {inkHull, weldNormals} from './painted-brush.mjs';


const NOISE=`float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}`;
const VERT=`#include <common>
#include <skinning_pars_vertex>
attribute vec3 aSmoothN;uniform float uSphereN;varying vec3 vN;varying vec3 vW;varying vec2 vUv;
void main(){vec3 objectNormal=normalize(mix(normal,aSmoothN,uSphereN));
#include <skinbase_vertex>
#include <skinnormal_vertex>
vec3 transformed=position;
#include <skinning_vertex>
vUv=uv;vN=normalize(mat3(modelMatrix)*objectNormal);vec4 w=modelMatrix*vec4(transformed,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAG=`uniform vec3 uColor,uLightDir,uSun,uSky,uGround,uShadowTint,uRimCol,uFogCol,uBitA,uBitB,uPointPos,uPointCol;
uniform float uMode,uBands,uSoft,uHalf,uHue,uRim,uFog,uPaper,uHalftone,uDither,uPx,uAmb,uPaint,uBrush,uFarPaint,uOneBit,uWash,uPointR,uUseMap;
uniform sampler2D uMap;
varying vec3 vN;varying vec3 vW;varying vec2 vUv;
${NOISE}
float bayer(vec2 p){p=mod(floor(p),4.);int i=int(p.x)+int(p.y)*4;
 float m[16];m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
 float r=0.;for(int k=0;k<16;k++){if(k==i)r=m[k];}return r/16.;}
float stroke(vec3 p){vec2 q=vec2(dot(p,vec3(.82,.42,.38))*2.2,dot(p,vec3(-.35,.88,.3))*11.);return nz(q)*.65+nz(q*2.1+vec2(7.,3.))*.35;}
void main(){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 V=normalize(cameraPosition-vW);float dist=length(cameraPosition-vW);
 vec3 base=uColor;if(uUseMap>.5)base*=texture2D(uMap,vUv).rgb;
 float st=stroke(vW*1.6);float paintAmt=clamp(uPaint+uFarPaint*smoothstep(7.,16.,dist),0.,1.);
 base*=mix(1.,.9+.2*st,paintAmt);
 float ndl=dot(n,uLightDir);float l=mix(max(ndl,0.),ndl*.5+.5,uHalf);
 l+=(st-.5)*uBrush*.3;
 vec2 sp=gl_FragCoord.xy/uPx;float lb=clamp(l,0.,1.);
 if(uMode>.5){float b=max(uBands,2.);float x=clamp(l,0.,1.)*b+(bayer(sp)-.5)*uDither;float f=fract(x),i=floor(x);float s=uSoft*.5+.002;lb=clamp((i+smoothstep(1.-2.*s,1.,f))/max(b-1.,1.),0.,1.);}
 vec3 col=mix(base*mix(vec3(.16),mix(vec3(1.),uShadowTint*2.2,.6)*.62,uHue),base*uSun*1.08,lb);
 col+=base*mix(uGround,uSky,n.y*.5+.5)*uAmb*(1.-lb*.6)*.5;
 vec3 L=uPointPos-vW;float pd=length(L);float pl=max(dot(n,L/max(pd,1e-3)),0.)*pow(clamp(1.-pd/uPointR,0.,1.),2.);
 col+=base*uPointCol*(uMode>.5?smoothstep(.04,.3,pl):pl)*.9;
 float fr=pow(1.-max(dot(n,V),0.),3.);
 col+=uRimCol*fr*uRim*(.35+.65*(ndl*.5+.5))*(1.-smoothstep(.35,.9,n.y));
 float cs=7.;vec2 q=mat2(.7071,-.7071,.7071,.7071)*sp;vec2 cell=fract(q/cs)-.5;float rad=sqrt(clamp(1.-lb,0.,1.))*.62;
 col*=mix(1.,length(cell)<rad?.55:1.,uHalftone);
 float lum=dot(col,vec3(.3,.59,.11));
 float red=smoothstep(.12,.35,base.r-max(base.g,base.b));
 col=mix(col,mix(vec3(.07,.06,.09),vec3(.95,.91,.83),smoothstep(.04,.55,lum)),uWash*(1.-red*.85));
 col*=1.-uPaper*(nz(sp*.9)*.14+nz(sp*.045)*.1);
 float ff=1.-exp(-pow(dist*uFog,2.));col=mix(col,uFogCol,ff);
 lum=dot(col,vec3(.3,.59,.11));col=mix(col,lum>bayer(sp)*.9+.05?uBitA:uBitB,uOneBit);
 gl_FragColor=vec4(col,1.);
 #include <colorspace_fragment>
}`;

const BASE = {mode: 0, bands: 3, soft: .3, half: 0, hue: 0, rim: 0, fog: 0, paper: 0, halftone: 0, dither: 0, sphereN: 1, amb: .35, paint: 0, brush: 0,
 farPaint: 0, oneBit: 0, wash: 0, ink: 0, inkScreen: 0, inkBreak: 0, inkCol: '#2a2238', px: 1, point: 0, pointCol: '#ffb35a', flicker: 0,
 sun: '#fff4e0', sky: '#a8d4f0', ground: '#7fae5a', tint: '#6a78c8', rimCol: '#fff1d6', fogCol: '#bfe0f2', bg: '#a8d4f0', bitA: '#e8e4c9', bitB: '#2b2a24', lightDir: [.55, .75, .35]};
export const LOOKS = {
 inkpaper: {...BASE, mode: 1, bands: 2, soft: .4, half: .5, wash: 1, paper: 1, ink: .04, inkBreak: .8, inkCol: '#141018', sky: '#efe6d2', bg: '#efe6d2'},
 lineart: {...BASE, mode: 1, bands: 2, soft: 0, half: .3, hue: .5, ink: .05, tint: '#e0a070', sky: '#f2d7a6', bg: '#f2d7a6', rim: 0},
 dusk: {...BASE, mode: 1, bands: 3, soft: .5, half: .6, hue: 1, paint: .4, fog: .075, fogCol: '#4f6b5a', sky: '#3d5a4f', bg: '#3d5a4f', sun: '#c8d6a0',
  tint: '#1f3a3a', point: 1, pointCol: '#ffd27a', flicker: 12, amb: .25, ground: '#2f4a3a'},
 onebit: {...BASE, oneBit: 1, px: .5, ink: .02, inkCol: '#2b2a24', half: .4, bg: '#e8e4c9'},
 // the Game Boy palette, same look
 gameboy: {...BASE, oneBit: 1, px: .5, ink: 0, half: .4, bitA: '#9bbc0f', bitB: '#0f380f', bg: '#9bbc0f'},
};

export function lookUniforms(T, L) {
 const c = h => new T.Color(h);
 return {
  uLightDir: {value: new T.Vector3(...L.lightDir).normalize()}, uSun: {value: c(L.sun)}, uSky: {value: c(L.sky)}, uGround: {value: c(L.ground)}, uShadowTint: {value: c(L.tint)},
  uRimCol: {value: c(L.rimCol)}, uFogCol: {value: c(L.fogCol)}, uMode: {value: L.mode}, uBands: {value: L.bands}, uSoft: {value: L.soft}, uHalf: {value: L.half}, uHue: {value: L.hue},
  uRim: {value: L.rim}, uFog: {value: L.fog}, uPaper: {value: L.paper}, uHalftone: {value: L.halftone}, uDither: {value: L.dither}, uSphereN: {value: L.sphereN}, uPx: {value: L.px},
  uAmb: {value: L.amb}, uPaint: {value: L.paint}, uBrush: {value: L.brush}, uFarPaint: {value: L.farPaint}, uOneBit: {value: L.oneBit}, uBitA: {value: c(L.bitA)}, uBitB: {value: c(L.bitB)},
  uWash: {value: L.wash}, uPointPos: {value: new T.Vector3(0, -50, 0)}, uPointCol: {value: c('#000000')}, uPointR: {value: 4.2},
 };
}
export function lookMaterial(T, opts, U) {
 return new T.ShaderMaterial({
  uniforms: {...U, uColor: {value: new T.Color(opts.color ?? '#ffffff')}, uMap: {value: opts.map || null}, uUseMap: {value: opts.map ? 1 : 0}},
  vertexShader: VERT, fragmentShader: FRAG, transparent: !!opts.transparent, side: opts.side ?? T.FrontSide, name: opts.name || 'look',
 });
}

// scene: optional; its background follows the look as the signal rises. lantern: a world position for the dusk point light.
export function applyLook(T, root, name, {scene, lantern, signal = 1, look} = {}) {
 const L = {...(typeof name === 'string' ? LOOKS[name] : name), ...(look || {})};
 if (!L || L.mode === undefined) throw new Error(`unknown look: ${name}`);
 const U = lookUniforms(T, L), swapped = [], hulls = [], added = [], made = new Map();
 root.updateWorldMatrix(true, true);
 const H = new T.Box3().setFromObject(root).getSize(new T.Vector3()).y || 1;
 const inkU = {uW: {value: 0}, uBreak: {value: L.inkBreak}, uInk: {value: new T.Color(L.inkCol)}};
 root.traverse(o => {
  if (!o.isMesh || o.userData.ink || o.userData.noPaint || [].concat(o.material).every(m => m?.userData?.look)) return;
  if (weldNormals(T, o.geometry)) added.push(o.geometry);
  const one = src => {
   if (!src || src.userData?.look) return src;
   if (!made.has(src.uuid)) { const m = lookMaterial(T, {map: src.map, color: src.color, opacity: src.opacity, transparent: src.transparent, side: src.side, name: (src.name || 'part') + ' (' + (typeof name === 'string' ? name : 'look') + ')'}, U); m.userData.look = true; made.set(src.uuid, m); }
   return made.get(src.uuid);
  };
  swapped.push([o, o.material]);
  o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  if (L.ink > 0 && o.geometry?.attributes.normal && ![].concat(swapped.at(-1)[1]).every(m => m?.transparent)) {
   const h = inkHull(T, o, {...inkU, uStroke: {value: 1.8 / H}}); hulls.push([o, h]); o.add(h);
  }
 });
 const prevBg = scene?.background, bgFrom = prevBg?.isColor ? prevBg.clone() : null, bgTo = new T.Color(L.bg), lant = new T.Vector3();
 if (lantern) lant.copy(lantern);
 let k = signal;
 const api = {
  U, hulls: hulls.map(x => x[1]), get signal() { return k; },
  set(v) {
   k = Math.max(0, Math.min(1, v));
   U.uWash.value = L.wash * k; U.uPaper.value = L.paper * k; U.uFog.value = L.fog * k; U.uOneBit.value = L.oneBit && k > .5 ? 1 : 0;
   inkU.uW.value = L.ink * k * H / 1.8; for (const [, h] of hulls) h.visible = k > .001;
   if (scene && bgFrom) scene.background = bgFrom.clone().lerp(bgTo, k);
   const on = k > .001;
   for (const [o, m] of swapped) o.material = on ? (Array.isArray(m) ? m.map(x => made.get(x?.uuid) || x) : made.get(m?.uuid) || m) : m;
   return api;
  },
  update(seconds) {
   const ft = L.flicker ? Math.floor(seconds * L.flicker) / L.flicker : seconds, f = L.flicker ? .82 + .36 * ((((Math.sin(ft * 37.1) * 43758.5) % 1) + 1) % 1) : 1;
   if (L.point && lantern) { U.uPointPos.value.copy(lant); U.uPointCol.value.set(L.pointCol).multiplyScalar(f * k); } else U.uPointCol.value.set('#000000');
   return f;
  },
  restore() {
   for (const [o, m] of swapped) o.material = m;
   for (const [o, h] of hulls) { o.remove(h); h.geometry.dispose(); h.material.dispose(); }
   for (const g of added) g.deleteAttribute('aSmoothN');
   for (const m of made.values()) m.dispose();
   if (scene && bgFrom) scene.background = prevBg;
  },
 };
 return api.set(signal);
}
