// The film look: the post chain from AW-STUDY-0028 Storybook Light (studies/storybook/index.html), lifted into one
// module so any scene can be shot like an animated film. Plain three r170, no EffectComposer.
//   const film = filmLook(T, renderer, scene, camera, {fog, dof, ...})
//   film.setSize(w, h, pixelRatio)   call from resize
//   film.render()                    instead of renderer.render(scene, camera)
//   film.on                          {ao, fog, dof, bloom, grade} toggles; film.U for the numbers (focus, fog colours...)
// Parts: depth-only ambient occlusion (soft contact shadows), height haze with sun scatter (in-world air), lens blur
// with round bokeh (a camera look), glow, and a warm/teal colour grade. The sky should write alpha 0 (or be the
// clear colour with alpha 0) so haze and AO skip it. With {keepAlpha: true} a CSS sky behind the canvas shows through.
export function filmLook(T, renderer, scene, camera, o = {}) {
 const HF = {type: T.HalfFloatType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false};
 const rtScene = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType});
 rtScene.depthTexture = new T.DepthTexture(1, 1);
 const rtAO = new T.WebGLRenderTarget(1, 1, {depthBuffer: false});
 const rtLit = new T.WebGLRenderTarget(1, 1, HF), rtDof = new T.WebGLRenderTarget(1, 1, HF);
 const rtB = [0, 1, 2, 3].map(() => new T.WebGLRenderTarget(1, 1, HF));
 const postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), postScene = new T.Scene();
 const quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quad.frustumCulled = false; postScene.add(quad);
 const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
 const post = (fs, uniforms, toneMapped = false) => new T.ShaderMaterial({vertexShader: VS, fragmentShader: fs, uniforms, toneMapped, depthTest: false, depthWrite: false, transparent: false});
 const VPOS = 'vec3 vpos(vec2 uv){ float z = texture2D(tDepth, uv).x; vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0); return v.xyz / v.w; }';
 const CAM = {uProjInv: {value: new T.Matrix4()}, uProj: {value: new T.Matrix4()}, uNear: {value: camera.near}, uFar: {value: camera.far}};
 const col = c => new T.Color(c);
 const U = {
  aoRadius: {value: o.aoRadius ?? .45}, aoPower: {value: o.aoPower ?? 1.5},
  fogLow: {value: col(o.fogLow || '#e8b98a')}, fogHigh: {value: col(o.fogHigh || '#cfd9e6')}, fogDensity: {value: o.fogDensity ?? .03}, fogStart: {value: o.fogStart ?? 10},
  sunDir: {value: (o.sunDir || new T.Vector3(.5, .4, .3)).clone().normalize()}, sunCol: {value: col(o.sunCol || '#ffbd7a')},
  focus: {value: o.focus ?? 10}, aperture: {value: o.aperture ?? 1.2}, maxBlur: {value: 8},
  bloom: {value: o.bloom ?? .16}, threshold: {value: o.threshold ?? 1}, exposure: {value: o.exposure ?? 1},
 };
 const on = {ao: true, fog: true, dof: true, bloom: true, grade: true, ...(o.on || {})};

 const aoMat = post(`
  uniform sampler2D tDepth; uniform mat4 uProjInv, uProj; uniform vec2 uTexel; uniform float uRadius, uPower;
  varying vec2 vUv;
  ${VPOS}
  void main(){
   float z = texture2D(tDepth, vUv).x;
   if (z >= 0.99999){ gl_FragColor = vec4(1.0); return; }
   vec3 P = vpos(vUv);
   vec3 Pr = vpos(vUv + vec2(uTexel.x, 0.0)), Pl = vpos(vUv - vec2(uTexel.x, 0.0));
   vec3 Pu = vpos(vUv + vec2(0.0, uTexel.y)), Pd = vpos(vUv - vec2(0.0, uTexel.y));
   vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
   vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
   vec3 N = normalize(cross(dx, dy));
   vec2 rad = vec2(uProj[0][0], uProj[1][1]) * 0.5 * uRadius / -P.z;
   float ang = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
   float ao = 0.0;
   for (int i = 0; i < 14; i++){
    float fi = (float(i) + 0.5) / 14.0, a = ang + float(i) * 2.39996;
    vec3 Q = vpos(vUv + vec2(cos(a), sin(a)) * rad * fi);
    vec3 v = Q - P; float d2 = dot(v, v);
    float range = 1.0 - smoothstep(uRadius * 0.6, uRadius * 1.6, sqrt(d2));
    ao += max(dot(v, N) - 0.015 * -P.z, 0.0) / (d2 + 0.03) * range;
   }
   ao = clamp(1.0 - ao * 1.7 / 14.0, 0.0, 1.0);
   gl_FragColor = vec4(vec3(pow(ao, uPower)), 1.0);
  }`, {tDepth: {value: rtScene.depthTexture}, uTexel: {value: new T.Vector2()}, uRadius: U.aoRadius, uPower: U.aoPower, ...CAM});

 const litMat = post(`
  uniform sampler2D tColor, tDepth, tAO; uniform mat4 uProjInv, uCamWorld; uniform vec3 uCamPos, uFogLow, uFogHigh, uSunDir, uSunCol;
  uniform vec2 uAOTexel; uniform float uAOOn, uFogOn, uFogDensity, uFogStart;
  varying vec2 vUv;
  ${VPOS}
  void main(){
   vec4 c = texture2D(tColor, vUv);
   vec3 vp = vpos(vUv), wp = (uCamWorld * vec4(vp, 1.0)).xyz, ray = normalize(wp - uCamPos);
   vec3 col = c.rgb;
   if (uAOOn > 0.5){
    float ao = texture2D(tAO, vUv).r * 2.0;
    ao += texture2D(tAO, vUv + vec2(uAOTexel.x, 0.0)).r + texture2D(tAO, vUv - vec2(uAOTexel.x, 0.0)).r;
    ao += texture2D(tAO, vUv + vec2(0.0, uAOTexel.y)).r + texture2D(tAO, vUv - vec2(0.0, uAOTexel.y)).r;
    col *= mix(1.0, ao / 6.0, c.a);
   }
   if (uFogOn > 0.5 && c.a > 0.5){
    float f = 1.0 - exp(-max(length(vp) - uFogStart, 0.0) * uFogDensity);
    f *= exp(-max(wp.y - 1.0, 0.0) * 0.05);
    vec3 fc = mix(uFogLow, uFogHigh, smoothstep(-0.05, 0.4, ray.y));
    fc += uSunCol * 0.12 * pow(max(dot(ray, uSunDir), 0.0), 5.0);
    col = mix(col, fc, f);
   }
   gl_FragColor = vec4(col, c.a);
  }`, {tColor: {value: rtScene.texture}, tDepth: {value: rtScene.depthTexture}, tAO: {value: rtAO.texture}, uCamWorld: {value: camera.matrixWorld},
  uCamPos: {value: camera.position}, uFogLow: U.fogLow, uFogHigh: U.fogHigh, uSunDir: U.sunDir, uSunCol: U.sunCol,
  uAOTexel: {value: new T.Vector2()}, uAOOn: {value: 1}, uFogOn: {value: 1}, uFogDensity: U.fogDensity, uFogStart: U.fogStart, ...CAM});

 const COC = `
  uniform float uFocus, uAperture, uMaxBlur, uNear, uFar;
  float viewZ(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
  float coc(float d){ float c = (d - uFocus) / d * uAperture; return sign(c) * max(abs(c) - 0.08, 0.0) * uMaxBlur; }`;
 const DOFU = {uFocus: U.focus, uAperture: U.aperture, uMaxBlur: U.maxBlur};
 const dofMat = post(`
  #include <packing>
  uniform sampler2D tLit, tDepth; uniform vec2 uTexel;
  varying vec2 vUv;
  ${COC}
  void main(){
   float cd = viewZ(vUv), cs = abs(coc(cd));
   vec3 acc = texture2D(tLit, vUv).rgb; float tot = 1.0, radius = 0.6, ang = 0.0;
   for (int i = 0; i < 110; i++){
    if (radius >= uMaxBlur) break;
    ang += 2.39996323;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * uTexel * radius;
    vec3 sc = texture2D(tLit, tc).rgb; float sd = viewZ(tc), ss = abs(coc(sd));
    if (sd > cd) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    acc += mix(acc / tot, sc, m); tot += 1.0; radius += 0.6 / radius;
   }
   gl_FragColor = vec4(acc / tot, 1.0);
  }`, {tLit: {value: rtLit.texture}, tDepth: {value: rtScene.depthTexture}, uTexel: {value: new T.Vector2()}, ...DOFU, ...CAM});

 const brightMat = post(`
  uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; varying vec2 vUv;
  void main(){
   vec3 c = (texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25;
   float l = max(c.r, max(c.g, c.b));
   gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.6, l), 1.0);
  }`, {tSrc: {value: null}, uTexel: {value: new T.Vector2()}, uThreshold: U.threshold});
 const blurMat = post(`
  uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
  void main(){
   vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
   c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
   c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.070;
   gl_FragColor = vec4(c, 1.0);
  }`, {tSrc: {value: null}, uDir: {value: new T.Vector2()}});
 const copyMat = post('uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0); }', {tSrc: {value: null}});

 const finalMat = post(`
  #include <packing>
  uniform sampler2D tLit, tDof, tDepth, tB1, tB2;
  uniform float uDofOn, uBloomOn, uGradeOn, uBloom, uExposure, uKeepAlpha;
  varying vec2 vUv;
  ${COC}
  void main(){
   vec4 L = texture2D(tLit, vUv); vec3 c = L.rgb;
   float d = viewZ(vUv), k = coc(d);
   if (uDofOn > 0.5) c = mix(c, texture2D(tDof, vUv).rgb, smoothstep(0.25, 1.4, abs(k)));
   vec3 glow = texture2D(tB1, vUv).rgb * 0.55 + texture2D(tB2, vUv).rgb * 0.9;
   if (uBloomOn > 0.5) c += glow * uBloom;
   c *= uExposure;
   if (uGradeOn > 0.5){
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = max(mix(vec3(l), c, 1.14), 0.0);
    c *= mix(vec3(0.88, 1.0, 1.04), vec3(1.07, 1.0, 0.9), smoothstep(0.02, 0.9, l));
    c += vec3(0.004, 0.006, 0.008);
   }
   gl_FragColor = vec4(c, 1.0);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   gl_FragColor.a = uKeepAlpha > 0.5 ? L.a : 1.0; // keepAlpha: a CSS sky behind the canvas shows where nothing was drawn
  }`, {tLit: {value: rtLit.texture}, tDof: {value: rtDof.texture}, tDepth: {value: rtScene.depthTexture}, tB1: {value: rtB[1].texture}, tB2: {value: rtB[3].texture},
  uDofOn: {value: 1}, uBloomOn: {value: 1}, uGradeOn: {value: 1}, uKeepAlpha: {value: o.keepAlpha ? 1 : 0}, uBloom: U.bloom, uExposure: U.exposure, ...DOFU, ...CAM}, true);
 finalMat.transparent = true; finalMat.blending = T.NoBlending;

 const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, postCam); };
 let W = 2, H = 2;
 function setSize(w, h, q = 1) {
  W = Math.max(2, Math.round(w * q)); H = Math.max(2, Math.round(h * q));
  rtScene.setSize(W, H); rtLit.setSize(W, H);
  const hw = W >> 1, hh = H >> 1;
  rtAO.setSize(hw, hh); rtDof.setSize(hw, hh);
  rtB[0].setSize(W >> 2, H >> 2); rtB[1].setSize(W >> 2, H >> 2); rtB[2].setSize(W >> 3, H >> 3); rtB[3].setSize(W >> 3, H >> 3);
  aoMat.uniforms.uTexel.value.set(1 / hw, 1 / hh); litMat.uniforms.uAOTexel.value.set(1 / hw, 1 / hh); dofMat.uniforms.uTexel.value.set(1 / hw, 1 / hh);
  U.maxBlur.value = Math.max(3, hh * .022);
 }
 function render() {
  camera.updateMatrixWorld();
  CAM.uProjInv.value.copy(camera.projectionMatrixInverse); CAM.uProj.value.copy(camera.projectionMatrix);
  CAM.uNear.value = camera.near; CAM.uFar.value = camera.far;
  const clearA = renderer.getClearAlpha(); renderer.setClearAlpha(0);
  renderer.setRenderTarget(rtScene); renderer.clear(); renderer.render(scene, camera);
  renderer.setClearAlpha(clearA);
  if (on.ao) pass(aoMat, rtAO);
  litMat.uniforms.uAOOn.value = on.ao ? 1 : 0; litMat.uniforms.uFogOn.value = on.fog ? 1 : 0;
  pass(litMat, rtLit);
  if (on.dof) pass(dofMat, rtDof);
  if (on.bloom) {
   brightMat.uniforms.tSrc.value = rtLit.texture; brightMat.uniforms.uTexel.value.set(1 / W, 1 / H); pass(brightMat, rtB[0]);
   blurMat.uniforms.tSrc.value = rtB[0].texture; blurMat.uniforms.uDir.value.set(4 / W, 0); pass(blurMat, rtB[1]);
   blurMat.uniforms.tSrc.value = rtB[1].texture; blurMat.uniforms.uDir.value.set(0, 4 / H); pass(blurMat, rtB[0]);
   copyMat.uniforms.tSrc.value = rtB[0].texture; pass(copyMat, rtB[1]);
   copyMat.uniforms.tSrc.value = rtB[1].texture; pass(copyMat, rtB[2]);
   blurMat.uniforms.tSrc.value = rtB[2].texture; blurMat.uniforms.uDir.value.set(8 / W, 0); pass(blurMat, rtB[3]);
   blurMat.uniforms.tSrc.value = rtB[3].texture; blurMat.uniforms.uDir.value.set(0, 8 / H); pass(blurMat, rtB[2]);
   copyMat.uniforms.tSrc.value = rtB[2].texture; pass(copyMat, rtB[3]);
  }
  finalMat.uniforms.uDofOn.value = on.dof ? 1 : 0; finalMat.uniforms.uBloomOn.value = on.bloom ? 1 : 0; finalMat.uniforms.uGradeOn.value = on.grade ? 1 : 0;
  pass(finalMat, null);
 }
 return {render, setSize, on, U};
}
