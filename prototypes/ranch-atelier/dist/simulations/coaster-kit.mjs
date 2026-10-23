// AW-STUDY-0054: the toy-car coaster kit. A track is a recipe (a turtle that goes straight, turns, pitches, rolls), so the loop,
// the corkscrew and the gap jump are numbers you can change, not a model you have to re-make.
//   const trk = buildTrack(T, TRACK_30S);            samples every 0.4 m: position, orientation, banking, speed, time
//   trackMeshes(T, trk)                               orange ribbon, booster pads, string lights, supports (Group, named parts)
//   makeCar(T, opts)                                  the buggy (original design), group with named parts
//   poseAt(trk, t, out)                               where the car is t seconds into the ride (exactly 30.0 s end to end)
//   tiltShift(T, renderer)                            the miniature-photo look: sharp band, blurred above and below
// Orange-style track, but nothing from any toy brand: no names, logos or car designs (CLAUDE.md, the brand rule).

const YAXIS = [0, 1, 0];
const DS = 0.4;                       // metres between samples
export const TRACK_W = 1.7;           // inside width of the bed

// ---- the recipe: the 30-second coaster, in the order you ride it. Angles in degrees, lengths in metres. ----
export const TRACK_30S = {
  start: {pos: [0, 17, 0], yaw: 0}, seconds: 30, lamp: 4,
  segs: [
    {k: 'straight', len: 7, tag: 'gate'},                                   // start gate, the lights count down
    {k: 'pitch', deg: -38, r: 7},                                           // the drop
    {k: 'straight', len: 18},
    {k: 'pitch', deg: 38, r: 9},                                            // the valley
    {k: 'straight', len: 5, boost: 1, tag: 'boost1'},                       // booster pad
    {k: 'pitch', deg: 360, r: 5.6, drift: 3.6, tag: 'loop'},                // the big loop (drifts sideways so it clears itself)
    {k: 'straight', len: 4},
    {k: 'pitch', deg: 15, r: 10},                                           // climb
    {k: 'straight', len: 10},
    {k: 'pitch', deg: -15, r: 10},
    {k: 'turn', deg: 90, r: 12, bank: 34, tag: 'bank1'},                    // banked left
    {k: 'pitch', deg: 14, r: 8},                                            // camelbacks: three little hills for butterflies
    {k: 'pitch', deg: -28, r: 8},
    {k: 'pitch', deg: 28, r: 8},
    {k: 'pitch', deg: -28, r: 8},
    {k: 'pitch', deg: 14, r: 8},
    {k: 'straight', len: 4, boost: 1, tag: 'boost2'},
    {k: 'roll', deg: 360, len: 20, tag: 'corkscrew'},                       // the corkscrew
    {k: 'turn', deg: -180, r: 9, bank: 40, tag: 'hairpin'},                 // hairpin right
    {k: 'pitch', deg: 16, r: 9},                                            // up to the jump
    {k: 'straight', len: 3},
    {k: 'pitch', deg: -30, r: 14, gap: 1, tag: 'jump'},                     // the gap: no track, the car flies
    {k: 'pitch', deg: 14, r: 9, tag: 'land'},
    {k: 'straight', len: 6},
    {k: 'pitch', deg: -7, r: 15},
    {k: 'turn', deg: 270, r: 10, bank: 38, tag: 'spiral'},                  // the spiral down
    {k: 'pitch', deg: 7, r: 15},
    {k: 'straight', len: 12, boost: 1, tag: 'boost3'},
    {k: 'straight', len: 14, tag: 'finish'},                                // finish arch, balloons, the brake
  ],
};

const ease = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

export function buildTrack(T, spec = TRACK_30S) {
  const V = (x, y, z) => new T.Vector3(x, y, z);
  let q = new T.Quaternion().setFromAxisAngle(V(...YAXIS), spec.start.yaw || 0);
  const p = V(...spec.start.pos);
  const S = [];   // samples
  let rlBase = 0, s = 0;
  const marks = {}, boosts = [], gaps = [];
  const qy = new T.Quaternion(), qa = new T.Quaternion();
  const local = (axis, ang) => { qa.setFromAxisAngle(axis, ang); q.multiply(qa); };
  const AX = V(1, 0, 0), AY = V(0, 1, 0);
  const fwd = () => V(0, 0, -1).applyQuaternion(q);
  const emit = (rl, flags = {}) => {
    const qv = q.clone().multiply(new T.Quaternion().setFromAxisAngle(V(0, 0, -1), rl)); // visual roll about forward (positive rl banks right)
    S.push({p: p.clone(), q: qv, qp: q.clone(), s, gap: !!flags.gap, boost: !!flags.boost, rl});
  };
  emit(0);
  for (const g of spec.segs) {
    const len = g.k === 'straight' || g.k === 'roll' ? g.len : Math.abs(g.deg) * Math.PI / 180 * g.r + (g.k === 'turn' ? 0 : 0);
    const n = Math.max(1, Math.round(len / DS)), ds = len / n;
    if (g.tag) marks[g.tag] = {s0: s, s1: s + len};
    if (g.boost) boosts.push({s0: s, s1: s + len});
    if (g.gap) gaps.push({s0: s, s1: s + len});
    const drift0 = V(1, 0, 0).applyQuaternion(q);
    const da = (g.deg || 0) * Math.PI / 180 / n;
    for (let i = 0; i < n; i++) {
      const u = (i + .5) / n;
      if (g.k === 'turn') { qy.setFromAxisAngle(AY, da / 2); q.premultiply(qy); } // turns swing about the world's up, so a slope stays a slope
      if (g.k === 'pitch') local(AX, da / 2);
      p.addScaledVector(fwd(), ds); s += ds;
      if (g.drift) p.addScaledVector(drift0, g.drift / n);
      if (g.k === 'turn') { qy.setFromAxisAngle(AY, da / 2); q.premultiply(qy); } // turns swing about the world's up, so a slope stays a slope
      if (g.k === 'pitch') local(AX, da / 2);
      if (g.k === 'roll') rlBase += g.deg * Math.PI / 180 / n;
      let rl = rlBase;
      if (g.k === 'turn' && g.bank) rl += -Math.sign(g.deg) * g.bank * Math.PI / 180 * ease(u / .22) * (1 - ease((u - .78) / .22)); // bank into the turn
      emit(rl, {gap: !!g.gap, boost: !!g.boost});
    }
    if (g.k === 'roll') rlBase = rlBase % (Math.PI * 2);
  }
  return finishTrack(T, S, spec, marks, boosts, gaps);
}

// speed along the track: roll downhill, boosters kick, the brake at the end; then stretched so the ride is exactly `seconds`
function finishTrack(T, S, spec, marks, boosts, gaps) {
  const n = S.length, v = new Float32Array(n), h0 = S[0].p.y, g = 9.8 * .55;
  const fin = marks.finish ? marks.finish.s0 : S[n - 1].s;
  for (let i = 0; i < n; i++) {
    const sm = S[i].s;
    let e = 36 + 2 * g * (h0 - S[i].p.y);                // v squared from height
    let sp = Math.sqrt(Math.max(e, 0));
    for (const b of boosts) { const a = ease((sm - b.s0 + 2) / 3), z = 1 - ease((sm - b.s1) / 18); if (sm > b.s0 - 2) sp = Math.max(sp, 9 + 14 * a * Math.max(z, 0) * (sm < b.s1 + 18 ? 1 : 0)); }
    sp = Math.min(Math.max(sp, 6.5), 24);
    if (sm > fin) sp = Math.max(3.2, sp * (1 - .8 * ease((sm - fin) / (S[n - 1].s - fin))));
    v[i] = sp;
  }
  // smooth speed so the camera never snaps
  for (let k = 0; k < 6; k++) for (let i = 1; i < n - 1; i++) v[i] = (v[i - 1] + 2 * v[i] + v[i + 1]) / 4;
  const t = new Float32Array(n); let acc = 0;
  for (let i = 1; i < n; i++) { acc += (S[i].s - S[i - 1].s) / ((v[i] + v[i - 1]) / 2); t[i] = acc; }
  const k = acc / spec.seconds;                             // stretch: raw time / wanted time
  for (let i = 0; i < n; i++) { t[i] /= k; v[i] *= k; }
  return {S, n, v, t, length: S[n - 1].s, seconds: spec.seconds, marks, boosts, gaps, spec, tAt: sm => { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= sm) lo = m; else hi = m; } const f = (sm - S[lo].s) / (S[hi].s - S[lo].s || 1); return t[lo] + (t[hi] - t[lo]) * f; } };
}

// pose of the car at ride time `time` (seconds): fills out.p, out.q, out.speed, out.s, out.i
export function poseAt(T, trk, time, out) {
  const tt = Math.min(Math.max(time, 0), trk.seconds - 1e-4), t = trk.t, n = trk.n;
  let lo = out.i || 0; if (t[lo] > tt) lo = 0;
  while (lo < n - 2 && t[lo + 1] <= tt) lo++;
  const hi = lo + 1, f = (tt - t[lo]) / (t[hi] - t[lo] || 1), A = trk.S[lo], B = trk.S[hi];
  out.i = lo; out.p ||= new T.Vector3(); out.q ||= new T.Quaternion(); out.qp ||= new T.Quaternion();
  out.p.lerpVectors(A.p, B.p, f); out.q.slerpQuaternions(A.q, B.q, f); out.qp.slerpQuaternions(A.qp, B.qp, f);
  out.s = A.s + (B.s - A.s) * f; out.speed = trk.v[lo] + (trk.v[hi] - trk.v[lo]) * f; out.gap = A.gap && B.gap; out.boost = A.boost;
  return out;
}

// ---- the track you can see ----
export const PALETTE = {orange: '#ff7a14', orangeDeep: '#e85d04', lip: '#1fb6c9', white: '#fff6e5', pole: ['#ffcf3a', '#1fb6c9', '#ff5d8f', '#7bd24a'], lamp: ['#ff5d8f', '#ffcf3a', '#3ad1e0', '#9be84c', '#c58bff']};

export function trackMeshes(T, trk) {
  const root = new T.Group(); root.name = 'coaster track';
  const col = c => new T.Color(c);
  // ribbon: cross-section as quads between neighbouring samples, flat-shaded, colour per face
  const W = TRACK_W / 2, LIP = .2;
  const prof = [ // [x0,y0,x1,y1, colourKey]
    [-W - .1, LIP, -W, LIP, 'lipTop'], [-W, LIP, -W, 0, 'lip'], [-W, 0, -.06, 0, 'bed'], [-.06, 0, .06, 0, 'stripe'], [.06, 0, W, 0, 'bed'], [W, 0, W, LIP, 'lip'], [W, LIP, W + .1, LIP, 'lipTop'],
    [W + .1, LIP, W + .1, -.08, 'under'], [W + .1, -.08, -W - .1, -.08, 'under'], [-W - .1, -.08, -W - .1, LIP, 'under'],
  ];
  const pos = [], colr = [];
  const frame = i => { const s = trk.S[i], x = new T.Vector3(1, 0, 0).applyQuaternion(s.q), y = new T.Vector3(0, 1, 0).applyQuaternion(s.q); return {p: s.p, x, y}; };
  const at = (f, x, y) => f.p.clone().addScaledVector(f.x, x).addScaledVector(f.y, y);
  const gapAt = i => trk.S[i].gap || trk.S[i + 1]?.gap;
  for (let i = 0; i < trk.n - 1; i++) {
    if (gapAt(i)) continue;
    const a = frame(i), b = frame(i + 1), dash = Math.floor(trk.S[i].s / 1.0) % 2 === 0;
    for (const [x0, y0, x1, y1, k] of prof) {
      let c = k === 'bed' ? PALETTE.orange : k === 'lip' ? (dash ? PALETTE.lip : PALETTE.white) : k === 'lipTop' ? (dash ? PALETTE.white : PALETTE.lip) : k === 'stripe' ? (Math.floor(trk.S[i].s / .8) % 2 ? PALETTE.white : PALETTE.orange) : PALETTE.orangeDeep;
      if (k === 'bed' && trk.S[i].boost) c = '#ffd23a';
      const A = at(a, x0, y0), B = at(a, x1, y1), C = at(b, x1, y1), D = at(b, x0, y0), cc = col(c);
      for (const P of [A, B, C, A, C, D]) { pos.push(P.x, P.y, P.z); colr.push(cc.r, cc.g, cc.b); }
    }
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(colr, 3)); geo.computeVertexNormals();
  const ribbon = new T.Mesh(geo, new T.MeshStandardMaterial({vertexColors: true, roughness: .45, metalness: 0, flatShading: true, side: T.DoubleSide, name: 'plastic track orange'}));
  ribbon.name = 'track ribbon'; ribbon.castShadow = ribbon.receiveShadow = true; root.add(ribbon);

  // booster pads: glowing arrows that scroll
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#ffe14a'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#ff7a14'; for (let y = 0; y < 128; y += 64) { g.beginPath(); g.moveTo(32, y + 8); g.lineTo(58, y + 44); g.lineTo(42, y + 44); g.lineTo(32, y + 30); g.lineTo(22, y + 44); g.lineTo(6, y + 44); g.closePath(); g.fill(); }
  const tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.colorSpace = T.SRGBColorSpace;
  const padMat = new T.MeshStandardMaterial({map: tex, emissive: '#ffb020', emissiveMap: tex, emissiveIntensity: .9, roughness: .4, name: 'booster pad glow'});
  for (const b of trk.boosts) {
    const ps = [], uv = [], idx = []; let k = 0;
    for (let i = 0; i < trk.n - 1; i++) { if (trk.S[i].s < b.s0 || trk.S[i].s > b.s1) continue; const f = frame(i); const L = at(f, -W * .8, .012), R = at(f, W * .8, .012); ps.push(L.x, L.y, L.z, R.x, R.y, R.z); const vv = trk.S[i].s / 1.2; uv.push(0, vv, 1, vv); if (k) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k); k++; }
    const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(ps, 3)); pg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); pg.setIndex(idx); pg.computeVertexNormals();
    const m = new T.Mesh(pg, padMat); m.name = 'booster pad'; m.userData.noInk = true; root.add(m);
  }
  root.userData.padTex = tex;

  // string lights down both edges: one instanced mesh, five colours
  const lampN = []; for (let i = 0; i < trk.n; i += Math.round((trk.spec.lamp || 4) / DS)) if (!gapAt(i)) lampN.push(i);
  const lamps = new T.InstancedMesh(new T.IcosahedronGeometry(.075, 0), new T.MeshStandardMaterial({color: '#fff', emissive: '#fff', emissiveIntensity: 1.4, name: 'bulb glow'}), lampN.length * 2);
  const M = new T.Matrix4(); let j = 0;
  lampN.forEach((i, n) => { const f = frame(i); for (const sd of [-1, 1]) { const P = at(f, sd * (W + .1), LIP + .1); M.makeTranslation(P.x, P.y, P.z); lamps.setMatrixAt(j, M); lamps.setColorAt(j, col(PALETTE.lamp[(n + (sd > 0 ? 2 : 0)) % PALETTE.lamp.length])); j++; } });
  lamps.name = 'string lights'; lamps.userData.noInk = true; root.add(lamps);

  // supports: slim poles with a foot, down from the track to the ground every 6 m (not where the track is upside down)
  const poles = []; for (let i = 6, c = 0; i < trk.n - 2; i += Math.round(6 / DS), c++) { const s = trk.S[i]; const up = new T.Vector3(0, 1, 0).applyQuaternion(s.q); if (s.p.y > 1 && up.y > .3 && !gapAt(i)) poles.push([s.p, c, up]); }
  const pg = new T.CylinderGeometry(.09, .09, 1, 6), foot = new T.CylinderGeometry(.32, .38, .14, 8);
  const sup = new T.Group(); sup.name = 'supports';
  for (const [P, c] of poles) { const col2 = PALETTE.pole[c % 4]; const m = new T.MeshStandardMaterial({color: col2, roughness: .5, flatShading: true, name: 'support pole'}); const h = P.y - .1; const a = new T.Mesh(pg, m); a.scale.y = h; a.position.set(P.x, h / 2, P.z); a.castShadow = true; sup.add(a); const f = new T.Mesh(foot, m); f.position.set(P.x, .07, P.z); sup.add(f);
    const cb = new T.Mesh(new T.BoxGeometry(.9, .1, .1), m); cb.position.set(P.x, Math.max(.9, P.y - 1), P.z); cb.rotation.y = c; sup.add(cb); }
  root.add(sup);
  return root;
}

// ---- the car: an original open-wheel buggy (not any toy brand's), sunny yellow with a teal stripe; named parts ----
export function makeCar(T, {body = '#ffcf3a', stripe = '#1fb6c9'} = {}) {
  const car = new T.Group(); car.name = 'toy buggy';
  const M = (name, c, o = {}) => Object.assign(new T.MeshStandardMaterial({color: c, roughness: .4, flatShading: true, ...o}), {name});
  const mb = M('paint body yellow', body), ms = M('paint stripe teal', stripe), mk = M('rubber tyre', '#262a30', {roughness: .8}), mh = M('metal hub chrome', '#e8edf2', {metalness: .7, roughness: .25}),
    mg = M('glass windshield', '#bfeaff', {transparent: true, opacity: .35, roughness: .1}), ml = M('light headlamp', '#fff6c8', {emissive: '#fff0a0', emissiveIntensity: 1.2});
  const add = (geo, mat, name, x, y, z, parent = car) => { const m = new T.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  // forward is -Z. wheelbase 1.2, track 0.95, wheel radius 0.2
  add(new T.BoxGeometry(.7, .22, 1.5), mb, 'chassis', 0, .3, 0);
  const hood = add(new T.BoxGeometry(.6, .1, .7), mb, 'hood', 0, .4, -.52); hood.rotation.x = .1;
  add(new T.BoxGeometry(.18, .02, .9), ms, 'racing stripe', 0, .46, -.5).rotation.x = .1;
  add(new T.BoxGeometry(.62, .3, .45), mb, 'rear body', 0, .5, .45);
  add(new T.BoxGeometry(.9, .06, .16), ms, 'spoiler wing', 0, .86, .78); add(new T.BoxGeometry(.06, .3, .06), mh, 'spoiler post', -.25, .7, .75); add(new T.BoxGeometry(.06, .3, .06), mh, 'spoiler post', .25, .7, .75);
  add(new T.BoxGeometry(.56, .2, .06), mg, 'windshield', 0, .66, -.18).rotation.x = -.5;
  add(new T.BoxGeometry(.54, .05, .05), ms, 'windshield frame', 0, .76, -.08);
  add(new T.SphereGeometry(.07, 6, 4), ml, 'headlamp', -.22, .43, -.86); add(new T.SphereGeometry(.07, 6, 4), ml, 'headlamp', .22, .43, -.86);
  car.userData.wheels = [];
  for (const [x, z] of [[-.5, -.58], [.5, -.58], [-.5, .58], [.5, .58]]) {
    const w = new T.Group(); w.name = 'wheel'; w.position.set(x, .2, z); car.add(w);
    const tyre = add(new T.CylinderGeometry(.2, .2, .2, 10), mk, 'tyre', 0, 0, 0, w); tyre.rotation.z = Math.PI / 2;
    const hub = add(new T.CylinderGeometry(.11, .11, .22, 8), mh, 'hub', 0, 0, 0, w); hub.rotation.z = Math.PI / 2; car.userData.wheels.push(w);
  }
  return car;
}

// ---- the cinematic pass: tilt-shift, bloom, a warm grade, vignette, letterbox bars and a shutter flash, in one chain ----
//   const fx = postFX(T, renderer); fx.size(w, h, dpr); fx.set({shift, bloom, bars, vignette, flash}); fx.render(scene, camera)
// shift: 0 sharp .. 1 full miniature. bars: 0 none .. 1 cinema bars (11% each, only for cinematic moments). flash: 0..1 white.
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
export function postFX(T, renderer) {
  const opt = {type: T.HalfFloatType}, main = new T.WebGLRenderTarget(4, 4, {...opt, samples: 4}), bA = new T.WebGLRenderTarget(4, 4, opt), bB = new T.WebGLRenderTarget(4, 4, opt);
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2)); quad.frustumCulled = false; const sc = new T.Scene(); sc.add(quad); const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bright = new T.ShaderMaterial({uniforms: {t: {value: null}, px: {value: new T.Vector2()}, thr: {value: .82}}, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D t; uniform vec2 px; uniform float thr; varying vec2 vUv;
      void main(){ vec3 c = (texture2D(t, vUv + px * vec2(-.5, -.5)).rgb + texture2D(t, vUv + px * vec2(.5, -.5)).rgb + texture2D(t, vUv + px * vec2(-.5, .5)).rgb + texture2D(t, vUv + px * vec2(.5, .5)).rgb) * .25;
        float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(thr, thr + .5, l), 1.); }`});
  const blur = new T.ShaderMaterial({uniforms: {t: {value: null}, dir: {value: new T.Vector2()}}, vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec3 c = texture2D(t, vUv).rgb * .227; c += (texture2D(t, vUv + dir * 1.385).rgb + texture2D(t, vUv - dir * 1.385).rgb) * .316; c += (texture2D(t, vUv + dir * 3.23).rgb + texture2D(t, vUv - dir * 3.23).rgb) * .07; gl_FragColor = vec4(c, 1.); }`});
  const comp = new T.ShaderMaterial({
    uniforms: {tMain: {value: main.texture}, tBloom: {value: bA.texture}, px: {value: new T.Vector2()}, uShift: {value: 1}, uBand: {value: .5}, uWidth: {value: .16}, uBloom: {value: .7},
      uBars: {value: 0}, uVig: {value: .35}, uFlash: {value: 0}, uSat: {value: 1.12}, uWarm: {value: .06}, uAspect: {value: 1}},
    vertexShader: VS, depthTest: false, depthWrite: false,
    fragmentShader: `uniform sampler2D tMain, tBloom; uniform vec2 px; uniform float uShift, uBand, uWidth, uBloom, uBars, uVig, uFlash, uSat, uWarm, uAspect; varying vec2 vUv;
      void main(){
        float d = smoothstep(uWidth, uWidth + .32, abs(vUv.y - uBand)) * uShift, r = d * 9.;
        vec3 c = texture2D(tMain, vUv).rgb;
        if (r > .05) { vec3 s = c; for (int i = 0; i < 12; i++) { float a = float(i) * 2.399963, rr = sqrt((float(i) + .5) / 12.) * r; s += texture2D(tMain, vUv + vec2(cos(a), sin(a)) * rr * px).rgb; } c = s / 13.; }
        c += texture2D(tBloom, vUv).rgb * uBloom;
        float l = dot(c, vec3(.299, .587, .114)); c = mix(vec3(l), c, uSat + d * .12);
        c *= vec3(1. + uWarm, 1. + uWarm * .35, 1. - uWarm * .6);
        vec2 q = (vUv - .5) * vec2(uAspect, 1.); c *= 1. - uVig * smoothstep(.35, 1.05, length(q));
        c = mix(c, vec3(1.), uFlash);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float bar = uBars * .11; if (vUv.y < bar || vUv.y > 1. - bar) gl_FragColor = vec4(0., 0., 0., 1.);
      }`});
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(sc, cam); };
  let W = 2, H = 2;
  return {
    s: {shift: 1, bloom: .7, bars: 0, vignette: .35, flash: 0, warm: .06, sat: 1.12},
    set(o) { Object.assign(this.s, o); return this; },
    size(w, h, dpr) { W = Math.max(2, w * dpr); H = Math.max(2, h * dpr); main.setSize(W, H); bA.setSize(W / 2, H / 2); bB.setSize(W / 2, H / 2); comp.uniforms.px.value.set(1 / W, 1 / H); comp.uniforms.uAspect.value = w / h; bright.uniforms.px.value.set(1 / W, 1 / H); },
    render(scene, camera) {
      const s = this.s, u = comp.uniforms;
      renderer.setRenderTarget(main); renderer.render(scene, camera);
      bright.uniforms.t.value = main.texture; pass(bright, bA);
      for (const k of [1, 2]) { blur.uniforms.t.value = bA.texture; blur.uniforms.dir.value.set(k / (W / 2), 0); pass(blur, bB); blur.uniforms.t.value = bB.texture; blur.uniforms.dir.value.set(0, k / (H / 2)); pass(blur, bA); }
      u.uShift.value = s.shift; u.uBloom.value = s.bloom; u.uBars.value = s.bars; u.uVig.value = s.vignette; u.uFlash.value = s.flash; u.uWarm.value = s.warm; u.uSat.value = s.sat;
      pass(comp, null);
    },
  };
}
// kept for round-1 callers: the tilt-shift alone is the cinematic pass with no bloom, bars or grade
export function tiltShift(T, renderer) { const fx = postFX(T, renderer).set({bloom: 0, vignette: 0, warm: 0, sat: 1.18}); return {get amount() { return fx.s.shift; }, set amount(v) { fx.s.shift = v; }, size: (w, h, d) => fx.size(w, h, d), render: (a, b) => fx.render(a, b)}; }
