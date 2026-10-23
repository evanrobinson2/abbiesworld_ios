// The paint on the ground (AW-STUDY-0049 "Paint the world"). One draped mesh per splat, ONE shared shader program, and a
// small pool made at start, so playing a card never compiles a shader or builds a scene (the tile-placement standard).
//   createSplatPool({size, segs}) -> {root, spawn(o), update(nowHours, real, cam, day), live(), hideAll()}
// All time is in-game hours (the day clock): a splat lives one day, dries and shrinks over its last quarter.
// Look: ink coverage with a wobbly outline plus splash arms and droplets, a deeper pooled edge, a wet glint for the first
// hours, a chalky dry look after, a soft glow at night, and a watercolour wash with distance (Watercolour distance,
// AW-STUDY-0045 #6): the far paint softens its edge and turns pastel, so the two looks compose.
import * as T from 'three';
import {PAINT_COLOURS} from './alien-plants.mjs';

const VERT = `varying vec2 vP;varying vec3 vW;
void main(){vP=uv*2.-1.;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;

const FRAG = `precision highp float;
varying vec2 vP;varying vec3 vW;
uniform float uNow,uBirth,uSeed,uGrow,uDay,uWash;uniform vec3 uCol,uDeep,uCam;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.)),f.x),f.y);}
// signed field: > 0 inside the ink. A wobbly blob, five tapered splash arms and seven flung droplets, all from the seed.
float ink(vec2 p,float s){
 float r=length(p),a=atan(p.y,p.x);
 float e=.5+.1*sin(a*3.+s*6.28)+.07*sin(a*5.+s*11.)+.045*sin(a*8.+s*17.)+.06*(vn(vec2(a*1.6,s*9.))-.5);
 float f=e-r;
 for(int i=0;i<5;i++){float fi=float(i);float aa=h21(vec2(fi,s))*6.283;float da=abs(atan(sin(a-aa),cos(a-aa)));
  float len=.2+.22*h21(vec2(fi+7.,s));float arm=min(e+len-r,.2*(1.-fi*.08)-da*r*1.25);f=max(f,arm*.8);}
 for(int i=0;i<7;i++){float fi=float(i);float aa=h21(vec2(fi+3.,s+1.))*6.283;float dd=.72+.24*h21(vec2(fi,s+5.));
  float rad=.03+.045*h21(vec2(fi+11.,s));f=max(f,rad-length(p-vec2(cos(aa),sin(aa))*dd));}
 return f;
}
void main(){
 float age=(uNow-uBirth)/24.;
 float g=clamp(uGrow/.5,0.,1.);float gs=1.-pow(1.-g,3.)+.07*sin(g*10.)*(1.-g);gs=max(gs,.02);
 float f=ink(vP/gs,uSeed)*gs;
 float n=vn(vP*6.+uSeed*17.);
 float fade=smoothstep(.72,1.,age);
 float f2=f-fade*(.2+.32*n);
 float far=uWash*smoothstep(9.,34.,distance(vW,uCam));
 float soft=mix(.012,.06,far);
 float cov=smoothstep(0.,soft,f2);
 if(cov<.01)discard;
 float wet=1.-smoothstep(.0,.16,age);
 float rimBand=1.-smoothstep(0.,.07,f2);
 vec3 base=mix(uDeep,uCol,smoothstep(0.,.3,f2));
 base=mix(base,uCol*1.12,smoothstep(.45,.85,vn(vP*3.2+uSeed*5.))*.55);
 base=mix(base,uDeep,rimBand*.35);
 float glint=wet*(1.-smoothstep(.0,.05,length((vP-vec2(-.16,.17))*vec2(1.,1.9))-.1));
 float rimLight=wet*smoothstep(.0,.03,f2)*(1.-smoothstep(.03,.08,f2));
 base+=vec3(.55)*(glint*.9+rimLight*.35);
 float dry=1.-wet;
 base=mix(base,base*.82+vec3(.1,.09,.08),dry*.5*(.5+.5*n));
 base=mix(base,base*.7+vec3(.15,.12,.1),fade*.8);
 base*=mix(.6,1.,uDay);
 base+=uCol*.38*(1.-uDay)*(1.-fade);
 float lum=dot(base,vec3(.3,.59,.11));
 base=mix(base,mix(vec3(lum),vec3(1.),.4)*mix(vec3(1.),uCol,.5),far*.8);
 gl_FragColor=vec4(base,cov*(.97-fade*.35));
}`;

export function createSplatPool({size = 14, segs = 26} = {}) {
 const root = new T.Group(); root.name = 'paint-splats';
 const slots = [];
 const index = []; { const n = segs + 1; for (let j = 0; j < segs; j++) for (let i = 0; i < segs; i++) { const a = j * n + i; index.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); } }
 const uv = new Float32Array((segs + 1) ** 2 * 2); for (let j = 0, k = 0; j <= segs; j++) for (let i = 0; i <= segs; i++, k += 2) { uv[k] = i / segs; uv[k + 1] = j / segs; }
 for (let n = 0; n < size; n++) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array((segs + 1) ** 2 * 3), 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(index);
  const m = new T.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
   uniforms: {uNow: {value: 0}, uBirth: {value: 0}, uSeed: {value: 0}, uGrow: {value: 9}, uDay: {value: 1}, uWash: {value: .6}, uCol: {value: new T.Color()}, uDeep: {value: new T.Color()}, uCam: {value: new T.Vector3()}}});
  m.name = 'paint-ink';
  const mesh = new T.Mesh(g, m); mesh.name = 'paint-splat'; mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.visible = false; mesh.raycast = () => {};
  root.add(mesh); slots.push({mesh, rec: null});
 }
 return {root, slots,
  // o: {x,z,R,colour,seed,birth,landed(real seconds), heightAt(x,z) in render units}
  spawn(o) {
   const slot = slots.find(s => !s.rec) || slots.reduce((a, b) => (a.rec.birth <= b.rec.birth ? a : b));
   const P = slot.mesh.geometry.attributes.position, n = segs + 1;
   for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = o.x + (i / segs * 2 - 1) * o.R, z = o.z + (j / segs * 2 - 1) * o.R, h = o.heightAt(x, z);
    P.setXYZ(j * n + i, x, (Number.isFinite(h) ? h : 0) + .006, z);
   }
   P.needsUpdate = true; slot.mesh.geometry.computeBoundingSphere();
   const u = slot.mesh.material.uniforms, c = PAINT_COLOURS[o.colour] || PAINT_COLOURS.pink;
   u.uCol.value.setStyle(c.paint, T.LinearSRGBColorSpace); u.uDeep.value.setStyle(c.deep, T.LinearSRGBColorSpace); u.uSeed.value = o.seed; u.uBirth.value = o.birth;
   slot.rec = {...o, mesh: slot.mesh}; slot.mesh.visible = true; return slot.rec;
  },
  update(nowHours, real, cam, day, wash) {
   for (const s of slots) {
    if (!s.rec) continue;
    const age = (nowHours - s.rec.birth) / 24;
    if (age >= 1.02 || age < -0.02) { s.mesh.visible = false; if (age >= 1.02) s.rec = null; continue; }
    const u = s.mesh.material.uniforms; s.mesh.visible = true;
    u.uNow.value = nowHours; u.uGrow.value = Math.max(0, real - s.rec.landed); u.uDay.value = day; u.uWash.value = wash; u.uCam.value.copy(cam.position);
   }
  },
  live: () => slots.filter(s => s.rec).map(s => s.rec),
  hideAll() { for (const s of slots) { s.mesh.visible = false; s.rec = null; } },
  dispose() { for (const s of slots) { s.mesh.geometry.dispose(); s.mesh.material.dispose(); } root.removeFromParent(); }};
}
