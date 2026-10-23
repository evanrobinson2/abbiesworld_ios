// The toon set from the Shaders article (docs/oracle/rendering/shaders-article.html), as a patch on three's own
// MeshStandard/MeshPhysical materials, so every texture, normal map, shadow and fog a scene already has keeps working.
//   toonify(T, scene, look)   patches every lit material under scene (call again after adding meshes; it skips done ones)
//   inkHulls(T, root, look)    adds the ink shell (a back-face copy pushed out along normals) to every mesh under root
//   TOON_LOOKS                 sunday (the Ranch default), ink (the school, comic moments), plain (three as it was)
// What the patch does, per light: wraps the light round the back (half), quantises it into soft bands, and fills the
// unlit side with a sky tint instead of black. Then a warm rim on edges turning away from the camera. Cost: a few lines
// in the one material, no post-processing.
export const TOON_LOOKS = {
 plain: null,
 sunday: {bands: 3, soft: .45, half: .6, tint: '#6a5fb0', tintK: .55, rim: .35, rimCol: '#ffd9a8', ink: 0},
 ink: {bands: 2, soft: .06, half: .35, tint: '#5a4f9a', tintK: .5, rim: .2, rimCol: '#ffd9a8', ink: .03, inkCol: '#2a1f30'},
};

export function toonUniforms(T, look) {
 const L = look || TOON_LOOKS.sunday;
 return {uToonBands: {value: L.bands}, uToonSoft: {value: L.soft}, uToonHalf: {value: L.half}, uToonTint: {value: new T.Color(L.tint)},
  uToonTintK: {value: L.tintK}, uToonRim: {value: L.rim}, uToonRimCol: {value: new T.Color(L.rimCol)}};
}

const PARS = `uniform float uToonBands, uToonSoft, uToonHalf, uToonTintK, uToonRim; uniform vec3 uToonTint, uToonRimCol;
float toonRamp(float ndl) {
 float l = mix(max(ndl, 0.), ndl * .5 + .5, uToonHalf), b = max(uToonBands, 1.), x = l * b, f = fract(x), i = floor(x), s = uToonSoft * .5 + .002;
 return clamp((i + smoothstep(1. - 2. * s, 1., f)) / max(b - 1., 1.), 0., 1.);
}`;
// three r170: RE_Direct_Physical starts with the Lambert term; swap it for the ramp, and give the unlit side a tint
const DIRECT_FROM = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\tvec3 irradiance = dotNL * directLight.color;';
const DIRECT_TO = `float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
\tfloat toonL = toonRamp( dot( geometryNormal, directLight.direction ) );
\tvec3 irradiance = toonL * directLight.color + ( 1. - toonL ) * uToonTint * uToonTintK * max( directLight.color.r, max( directLight.color.g, directLight.color.b ) ) * .25;`;

export function toonMaterial(T, mat, U) {
 if (!mat || mat.userData.toon || !(mat.isMeshStandardMaterial)) return;
 mat.userData.toon = true;
 const prev = mat.onBeforeCompile;
 mat.onBeforeCompile = (sh, r) => {
  prev?.call(mat, sh, r);
  Object.assign(sh.uniforms, U);
  sh.fragmentShader = sh.fragmentShader
   .replace('#include <lights_physical_pars_fragment>', PARS + '\n#include <lights_physical_pars_fragment>')
   .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n\t{ float toonFr = pow( 1. - saturate( dot( geometryNormal, geometryViewDir ) ), 3. ); reflectedLight.directDiffuse += uToonRimCol * toonFr * uToonRim * diffuseColor.rgb * ( 1. - smoothstep( .35, .9, geometryNormal.y ) ); }')
   .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n\treflectedLight.indirectDiffuse *= mix( vec3( 1. ), uToonTint * 1.7, uToonTintK * .45 );');
  // the Lambert line lives inside an included chunk, so resolve that chunk here and patch it
  sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_pars_fragment>', T.ShaderChunk.lights_physical_pars_fragment.replace(DIRECT_FROM, DIRECT_TO));
 };
 const key = mat.customProgramCacheKey?.bind(mat);
 mat.customProgramCacheKey = () => (key ? key() : '') + '|toon';
 mat.needsUpdate = true;
}

// returns the shared uniforms; change look later with setToonLook(T, U, look)
export function toonify(T, scene, look = TOON_LOOKS.sunday, U = toonUniforms(T, look)) {
 if (!look) return U;
 scene.traverse(o => { if (!o.isMesh || o.userData.ink) return; for (const m of [].concat(o.material)) toonMaterial(T, m, U); });
 return U;
}
export function setToonLook(T, U, L) {
 U.uToonBands.value = L.bands; U.uToonSoft.value = L.soft; U.uToonHalf.value = L.half; U.uToonTint.value.set(L.tint); U.uToonTintK.value = L.tintK;
 U.uToonRim.value = L.rim; U.uToonRimCol.value.set(L.rimCol);
}

// the ink shell: thins with distance like a pen line in perspective. Characters and cars only; buildings read by light.
export function inkHulls(T, root, look = TOON_LOOKS.ink) {
 if (!look?.ink) return [];
 const mat = new T.ShaderMaterial({
  uniforms: {uW: {value: look.ink}, uInk: {value: new T.Color(look.inkCol || '#2a1f30')}},
  vertexShader: `uniform float uW;
   #include <common>
   void main(){ vec4 w = modelMatrix * vec4(position, 1.); vec3 n = normalize(mat3(modelMatrix) * normal); float d = length(cameraPosition - w.xyz);
   w.xyz += n * uW * clamp(1.6 - d * .06, .35, 1.4); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk, 1.);
   #include <colorspace_fragment>
   }`,
  side: T.BackSide,
 });
 const hulls = [];
 root.traverse(o => {
  if (!o.isMesh || o.userData.ink || o.userData.noInk || !o.geometry?.attributes.normal || !o.material.isMeshStandardMaterial || o.material.transparent) return;
  const h = new T.Mesh(o.geometry, mat); h.userData.ink = true; h.castShadow = h.receiveShadow = false; h.raycast = () => {}; hulls.push([o, h]);
 });
 for (const [o, h] of hulls) o.add(h);
 return hulls.map(x => x[1]);
}
