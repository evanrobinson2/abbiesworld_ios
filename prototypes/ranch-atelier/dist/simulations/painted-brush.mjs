// Painted Brush, the Arcane-inspired look from AW-STUDY-0045 (docs/oracle/shaders/inspiring-shaders.html, the
// `arcane` preset there). Characters that look painted: a brush-stroke pattern breaks the light-to-shadow edge, the
// surface carries a painted grain, shadows turn purple, a contrasting rim (teal by default) lights the edges, the ink
// line breaks up along its length, and a neon point light flickers at 12 frames a second like Fortiche's hand-drawn
// effects. Style only: nothing from the show itself, just how its kind of picture is made.
//   const B = paintBrush(T, root, {accent: '#3fe6d4'})   swaps the look onto every mesh under root (Mesh, SkinnedMesh,
//                                                        material arrays); each part keeps its own map, colour, alpha
//   B.update(seconds)                                    per frame: the 12 fps flicker on the point light
//   B.restore()                                          puts every original material back and removes the ink
//   paintedBrushMaterial(T, {map, color, accent}, U)     one material on its own (U from paintedBrushUniforms)
// Lighting comes from the look's own uniforms (sun, sky, shadow tint, one point light), not from scene lights, so a
// studio, a Moonbase corridor and a card preview all read the same. Feed it base-colour maps with the light painted
// out: the shader paints the light itself. Parts are matched by material name (skin, suit, visor, boots, hair) in
// ROLES, so a visor stays glassy while a suit gets the full brush.
export const PAINTED_BRUSH = {
 bands: 3, soft: .55, half: .55, tint: '#46307e', sun: '#ffd2a1', sky: '#2b3550', ground: '#3a3550', amb: .3,
 rim: 1.1, accent: '#3fe6d4', paint: 1, brush: 1, fog: 0, fogCol: '#343a5e', lightDir: [.55, .75, .35],
 point: '#ff6fd0', pointPos: [0, -50, 0], pointR: 4.2, flicker: 12,
 ink: .012, inkBreak: 1, inkCol: '#1d1530',
 // used by hand-drawn.mjs, off here: paper grain, line boil (the outline redrawn each drawing), pen pressure along the line
 grain: 0, boil: 0, inkVary: 0,
};
// per part: how much grain and brush, and how strong the rim. Unknown names get the defaults (1, 1, 1).
export const ROLES = {
 skin: {paint: .7, brush: .8, rim: 1}, hair: {paint: 1, brush: 1.2, rim: .8}, suit: {paint: 1, brush: 1, rim: 1},
 boots: {paint: .8, brush: .7, rim: .7}, visor: {paint: .15, brush: .2, rim: 1.6},
};

export function paintedBrushUniforms(T, look = {}) {
 const L = {...PAINTED_BRUSH, ...look};
 return {
  uLightDir: {value: new T.Vector3(...L.lightDir).normalize()}, uSun: {value: new T.Color(L.sun)}, uSky: {value: new T.Color(L.sky)},
  uGround: {value: new T.Color(L.ground)}, uShadowTint: {value: new T.Color(L.tint)}, uAmb: {value: L.amb},
  uBands: {value: L.bands}, uSoft: {value: L.soft}, uHalf: {value: L.half}, uRim: {value: L.rim}, uPaint: {value: L.paint}, uBrush: {value: L.brush},
  uFog: {value: L.fog}, uFogCol: {value: new T.Color(L.fogCol)},
  uPointPos: {value: new T.Vector3(...L.pointPos)}, uPointBase: {value: new T.Color(L.point)}, uPointCol: {value: new T.Color(L.point)}, uPointR: {value: L.pointR},
  uFlicker: {value: L.flicker}, uGrain: {value: L.grain}, uFrame: {value: 0},
 };
}

const NOISE = `float pbH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float pbN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(pbH(i),pbH(i+vec2(1,0)),f.x),mix(pbH(i+vec2(0,1)),pbH(i+vec2(1,1)),f.x),f.y);}`;
// strokes live in the part's own space (vP), so they stay painted on a body that walks, turns and bends
const VERT = `#include <common>
#include <skinning_pars_vertex>
attribute vec3 aSmoothN;uniform float uStroke,uSmooth;varying vec3 vN;varying vec3 vW;varying vec3 vP;varying vec2 vUv;
void main(){vec3 objectNormal=normalize(mix(normal,aSmoothN,uSmooth));
#include <skinbase_vertex>
#include <skinnormal_vertex>
vec3 transformed=position;
#include <skinning_vertex>
vUv=uv;vP=position*uStroke;vN=normalize(mat3(modelMatrix)*objectNormal);vec4 w=modelMatrix*vec4(transformed,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAG = `uniform vec3 uColor,uAccent,uLightDir,uSun,uSky,uGround,uShadowTint,uFogCol,uPointPos,uPointCol;
uniform float uBands,uSoft,uHalf,uRim,uPaint,uBrush,uAmb,uFog,uPointR,uUseMap,uOpacity,uPaintK,uBrushK,uRimK,uGrain,uFrame;
uniform sampler2D uMap;varying vec3 vN;varying vec3 vW;varying vec3 vP;varying vec2 vUv;
${NOISE}
float pbStroke(vec3 p){vec2 q=vec2(dot(p,vec3(.82,.42,.38))*2.2,dot(p,vec3(-.35,.88,.3))*11.);return pbN(q)*.65+pbN(q*2.1+vec2(7.,3.))*.35;}
void main(){
 vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 V=normalize(cameraPosition-vW);float dist=length(cameraPosition-vW);
 vec4 tx=uUseMap>.5?texture2D(uMap,vUv):vec4(1.);vec3 base=uColor*tx.rgb;
 float st=pbStroke(vP*1.6);base*=mix(1.,.9+.2*st,clamp(uPaint*uPaintK,0.,1.));
 float ndl=dot(n,uLightDir);float l=mix(max(ndl,0.),ndl*.5+.5,uHalf)+(st-.5)*uBrush*uBrushK*.3;
 float b=max(uBands,2.),x=clamp(l,0.,1.)*b,f=fract(x),i=floor(x),s=uSoft*.5+.002;
 float lb=clamp((i+smoothstep(1.-2.*s,1.,f))/max(b-1.,1.),0.,1.);
 vec3 col=mix(base*mix(vec3(1.),uShadowTint*2.2,.6)*.62,base*uSun*1.08,lb);
 col+=base*mix(uGround,uSky,n.y*.5+.5)*uAmb*(1.-lb*.6)*.5;
 vec3 L=uPointPos-vW;float pd=length(L);float pl=max(dot(n,L/max(pd,1e-3)),0.)*pow(clamp(1.-pd/uPointR,0.,1.),2.);
 col+=base*uPointCol*smoothstep(.04,.3,pl)*.9;
 float fr=pow(1.-max(dot(n,V),0.),3.);
 col+=uAccent*fr*uRim*uRimK*(.35+.65*(ndl*.5+.5))*(1.-smoothstep(.35,.9,n.y));
 col=mix(col,uFogCol,1.-exp(-pow(dist*uFog,2.)));
 col*=1.+(pbH(floor(gl_FragCoord.xy*.5)+uFrame*vec2(17.3,9.1))-.5)*uGrain;
 gl_FragColor=vec4(col,tx.a*uOpacity);
 #include <colorspace_fragment>
}`;

// one material. opts: map, color, opacity, transparent, accent (rim colour), role ({paint, brush, rim} multipliers),
// stroke (strokes per unit of the part's own space: 1.6 per metre suits a figure modelled in metres)
export function paintedBrushMaterial(T, opts = {}, U = paintedBrushUniforms(T)) {
 const role = {paint: 1, brush: 1, rim: 1, ...(opts.role || {})};
 const m = new T.ShaderMaterial({
  uniforms: {...U, uColor: {value: new T.Color(opts.color ?? '#ffffff')}, uAccent: {value: new T.Color(opts.accent ?? PAINTED_BRUSH.accent)},
   uMap: {value: opts.map || null}, uUseMap: {value: opts.map ? 1 : 0}, uOpacity: {value: opts.opacity ?? 1}, uStroke: {value: opts.stroke ?? 1}, uSmooth: {value: opts.smooth ?? .75},
   uPaintK: {value: role.paint}, uBrushK: {value: role.brush}, uRimK: {value: role.rim}},
  vertexShader: VERT, fragmentShader: FRAG, transparent: !!opts.transparent, side: opts.side ?? T.FrontSide,
 });
 m.name = opts.name || 'painted-brush';
 m.userData.paintedBrush = true;
 return m;
}

// the 12 fps flicker: the light holds each value for a twelfth of a second, like a hand-drawn effect
export function updatePaintedBrush(U, seconds) {
 const fps = U.uFlicker.value;
 if (!fps) { U.uPointCol.value.copy(U.uPointBase.value); return 1; }
 const ft = Math.floor(seconds * fps) / fps, r = (((Math.sin(ft * 37.1) * 43758.5) % 1) + 1) % 1, k = .82 + .36 * r;
 U.uPointCol.value.copy(U.uPointBase.value).multiplyScalar(k);
 return k;
}

// facets read as noise once light is painted in strokes, so lean the shading normal toward the welded one
const weld = new WeakSet();
function weldNormals(T, g) {
 if (g.attributes.aSmoothN || !g.attributes.normal) return false;
 const P = g.attributes.position, N = g.attributes.normal, acc = new Map(), key = i => `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`, out = new Float32Array(P.count * 3);
 for (let i = 0; i < P.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); acc.set(k, a); }
 for (let i = 0; i < P.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; out.set([a[0] / l, a[1] / l, a[2] / l], i * 3); }
 g.setAttribute('aSmoothN', new T.BufferAttribute(out, 3)); weld.add(g);
 return true;
}
const roleFor = name => { const n = (name || '').toLowerCase(); return Object.keys(ROLES).find(k => n.includes(k)); };

// the ink shell, bent by the same skeleton on a SkinnedMesh, broken along its length like a dry brush
function inkHull(T, o, inkU) {
 const g = new T.BufferGeometry(), src = o.geometry;
 for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) if (src.attributes[k]) g.setAttribute(k, src.attributes[k].clone());
 if (src.index) g.setIndex(src.index.clone());
 // split normals at hard edges would crack the shell: average normals by position first
 const P = g.attributes.position, N = g.attributes.normal, acc = new Map(), key = i => `${P.getX(i).toFixed(4)},${P.getY(i).toFixed(4)},${P.getZ(i).toFixed(4)}`;
 for (let i = 0; i < P.count; i++) { const a = acc.get(key(i)) || [0, 0, 0]; a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); acc.set(key(i), a); }
 for (let i = 0; i < P.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; N.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
 const mat = new T.ShaderMaterial({uniforms: inkU, side: T.BackSide,
  vertexShader: `#include <common>
#include <skinning_pars_vertex>
uniform float uW,uBreak,uStroke,uBoil,uVary,uFrame;
float bh(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec3 objectNormal=normal;
#include <skinbase_vertex>
#include <skinnormal_vertex>
vec3 transformed=position;
#include <skinning_vertex>
vec4 w=modelMatrix*vec4(transformed,1.);vec3 n=normalize(mat3(modelMatrix)*objectNormal);float d=length(cameraPosition-w.xyz);
vec3 p=position*uStroke;float br=mix(1.,smoothstep(.15,.85,.5+.5*sin(p.x*9.+sin(p.y*7.)*2.3+p.z*6.)),uBreak);
float press=1.+uVary*sin(p.y*5.+p.x*3.1+p.z*2.3);
float jit=1.+uBoil*(bh(floor(p*5.)+uFrame*vec3(1.7,2.3,3.1))-.5)*2.;
vec3 sh=vec3(bh(vec3(uFrame,1.,2.)),bh(vec3(uFrame,3.,4.)),bh(vec3(uFrame,5.,6.)))-.5;
w.xyz+=n*uW*clamp(1.6-d*.06,.35,1.4)*br*press*jit+sh*uW*uBoil*.6;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader: `uniform vec3 uInk;void main(){gl_FragColor=vec4(uInk,1.);
#include <colorspace_fragment>
}`});
 const h = o.isSkinnedMesh ? new T.SkinnedMesh(g, mat) : new T.Mesh(g, mat);
 if (o.isSkinnedMesh) h.bind(o.skeleton, o.bindMatrix);
 h.frustumCulled = false; h.raycast = () => {}; h.castShadow = h.receiveShadow = false; h.userData.ink = true;
 return h;
}

// swap the look onto every mesh under root. look: any PAINTED_BRUSH key (accent, ink: 0 for no line, ...), plus
// roles (overrides ROLES by material name). Returns {U, update(seconds), restore(), hulls}.
export function paintBrush(T, root, look = {}) {
 const L = {...PAINTED_BRUSH, ...look}, roles = {...ROLES, ...(look.roles || {})}, U = paintedBrushUniforms(T, L);
 // strokes sized to the figure, whatever units it was modelled in: 1.6 strokes per metre on a 1.8 m figure
 root.updateWorldMatrix(true, true);
 const H = new T.Box3().setFromObject(root).getSize(new T.Vector3()).y || 1, per = 1.8 / H;
 const swapped = [], hulls = [], added = [], made = new Map(), ws = new T.Vector3();
 const inkU = {uW: {value: L.ink * H / 1.8}, uBreak: {value: L.inkBreak}, uInk: {value: new T.Color(L.inkCol)},
  uBoil: {value: L.boil}, uVary: {value: L.inkVary}, uFrame: U.uFrame};
 root.traverse(o => {
  if (!o.isMesh || o.userData.ink || o.userData.noPaint || [].concat(o.material).every(m => m?.userData?.paintedBrush)) return;
  o.getWorldScale(ws);
  if (weldNormals(T, o.geometry)) added.push(o.geometry);
  const stroke = per * ws.y, one = src => {
   if (!src || src.userData?.paintedBrush) return src;
   const k = src.uuid + '|' + stroke.toFixed(4);
   if (!made.has(k)) {
    const r = roleFor(src.name);
    made.set(k, paintedBrushMaterial(T, {map: src.map, color: src.color, opacity: src.opacity, transparent: src.transparent,
     side: src.side, accent: L.accent, stroke, role: r && roles[r], name: (src.name || 'part') + ' (painted brush)'}, U));
   }
   return made.get(k);
  };
  swapped.push([o, o.material]);
  o.material = Array.isArray(o.material) ? o.material.map(one) : one(o.material);
  if (L.ink > 0 && o.geometry?.attributes.normal && ![].concat(swapped.at(-1)[1]).every(m => m?.transparent)) hulls.push([o, inkHull(T, o, {...inkU, uStroke: {value: stroke}})]);
 });
 for (const [o, h] of hulls) o.add(h);
 return {
  U, ink: inkU, hulls: hulls.map(x => x[1]),
  update: seconds => updatePaintedBrush(U, seconds),
  setFrame: n => { U.uFrame.value = n % 1000; },
  restore() {
   for (const [o, m] of swapped) o.material = m;
   for (const [o, h] of hulls) { o.remove(h); h.geometry.dispose(); h.material.dispose(); }
   for (const g of added) { g.deleteAttribute('aSmoothN'); weld.delete(g); }
   for (const m of made.values()) m.dispose();
  },
 };
}
