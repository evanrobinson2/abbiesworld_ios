// The era pass, shared by every memory place (Grace's basement, the school roof): the scene renders small, then is
// posterised and Bayer-dithered like an 80s adventure, and sharpens as the camera reaches something that wants to be
// read (a screen, a note). It also plays the old set's warm-up when a memory opens (black, a faint grey glow, the bright
// line opening into a grey picture, then colour) and its power-down when the memory closes (the picture squeezes to a
// line, then a dot, then dark). Presentation layer: it changes how the world is drawn, never what is in it.
//
//   const era = eraPass(T, renderer);
//   each frame: era.render(scene, camera, {sharp, time, boot, off});
//     sharp  0 chunky pixels in the room .. 1 crisp at a screen      boot  seconds since the memory opened (>= 3.4 done)
//     off    0 .. 1 the power-down, for the memory's last moment     era.pixH is the current render height
export const WARM_UP = 3.4;

export function eraPass(T, renderer) {
 const rt = new T.WebGLRenderTarget(320, 200, {magFilter: T.NearestFilter, minFilter: T.NearestFilter, type: T.HalfFloatType});
 rt.texture.colorSpace = T.LinearSRGBColorSpace;
 const mat = new T.ShaderMaterial({
  name: 'era pass',
  uniforms: {src: {value: rt.texture}, res: {value: new T.Vector2(320, 200)}, dither: {value: 1}, boot: {value: 9}, off: {value: 0}, t: {value: 0}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `uniform sampler2D src; uniform vec2 res; uniform float dither, boot, off, t; varying vec2 vUv;
   float bayer(vec2 p){ int x = int(mod(p.x, 4.)), y = int(mod(p.y, 4.)); int i = x + y * 4;
    float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
    for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16. - .5; return 0.; }
   void main(){
    vec2 uv = vUv, p = uv - .5;
    // Power-down: the picture squeezes towards the middle line, then the line shrinks to a dot.
    float sy = 1. - smoothstep(0., .45, off) * .996, sx = 1. - smoothstep(.45, .85, off) * .995;
    uv = .5 + vec2(p.x / sx, p.y / sy);
    vec3 c = (abs(uv.x - .5) < .5 && abs(uv.y - .5) < .5) ? texture2D(src, uv).rgb : vec3(0.);
    c = pow(max(c, 0.), vec3(1. / 2.2));
    float lv = mix(255., 9., dither); vec3 d = c + bayer(floor(vUv * res)) * dither / lv;
    c = mix(c, floor(d * lv + .5) / lv, dither);
    if (off > 0.) { c = c * (1. + 3. * smoothstep(.3, .6, off)) * (1. - smoothstep(.85, 1., off)); }
    if (boot < ${WARM_UP.toFixed(1)}) {
     float glow = .07 * smoothstep(1.4, 0., boot) * smoothstep(0., .8, boot) * (1. - length(p) * 1.6);
     float open = smoothstep(1.3, 2.2, boot), band = smoothstep(open * .5 + .004, open * .5, abs(p.y));
     float line = smoothstep(.006, 0., abs(p.y)) * smoothstep(1.1, 1.35, boot) * (1. - open) * 1.6;
     float scan = .82 + .18 * sin(vUv.y * res.y * 3.14159) + .03 * sin(t * 50. + vUv.y * 30.);
     vec3 grey = vec3(dot(c, vec3(.3, .59, .11)) * .55 + .03) * scan;
     c = vec3(max(glow, 0.)) * vec3(.85, .9, .9) + mix(grey, c, smoothstep(2.4, ${WARM_UP.toFixed(1)}, boot)) * band + vec3(line);
    }
    gl_FragColor = vec4(c, 1.); }`,
  depthTest: false, depthWrite: false});
 const post = new T.Mesh(new T.PlaneGeometry(2, 2), mat), postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
 postScene.add(post);
 const era = {
  pixH: 210, material: mat,
  render(scene, camera, {sharp = 0, time = 0, boot = 9, off = 0} = {}) {
   const fullH = Math.min(innerHeight * Math.min(devicePixelRatio, 2), 1200), aspect = innerWidth / innerHeight;
   const chunky = aspect < 1 ? Math.min(420, 190 / aspect) : Math.max(200, Math.min(240, innerHeight / 3));
   era.pixH = T.MathUtils.lerp(chunky, fullH, sharp);
   const h = Math.round(era.pixH), w = Math.round(h * aspect);
   if (rt.width !== w || rt.height !== h) { rt.setSize(w, h); mat.uniforms.res.value.set(w, h); }
   mat.uniforms.dither.value = 1 - sharp; mat.uniforms.boot.value = boot; mat.uniforms.off.value = off; mat.uniforms.t.value = time;
   renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  },
 };
 return era;
}
