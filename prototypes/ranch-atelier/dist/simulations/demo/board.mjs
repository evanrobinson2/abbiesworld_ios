// The demo board: Winchester as seven hexes (a high school in the middle where three zones meet), a studio set for the
// opening tour, and the tiles a player places beside it. A stand-in built for the demo flow: the hex city thread owns the
// real Winchester, so everything the flow needs from it goes through `provider` (see WINCHESTER below and
// docs/demo/DEMO_FLOW.md). Tiles conform to the Winchester topography: every tile's height is the shared land
// height plus its own relief, and its relief fades to nothing at the rim, so any two tiles meet at the same height.
// Look: tilt-shift diorama (a real render pass, never a CSS blur), so the world is never masked.
import {presentation, playerCamera} from '../presentation-layer.mjs';
import {rocket} from '../moonmission/world3d.mjs';

export const S = 12;                    // hex corner radius, metres
const SQ3 = Math.sqrt(3), APO = S * SQ3 / 2, BASE = -2.6;
export const hexXZ = (q, r) => [S * SQ3 * (q + r / 2), S * 1.5 * r];
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// ----- the land: one height for every tile, continuing smoothly beyond the board -----
export function landHeight(x, z) {
 let h = 1.1 * Math.sin(x * .045 + 1.2) * Math.cos(z * .04) + .6 * Math.sin(x * .09 + z * .07) + .35 * Math.cos(z * .13 - x * .05);
 h += 1.4 * Math.exp(-((x - 24) ** 2 + (z + 20) ** 2) / 260);        // the hill on Abbie and Daddy's side
 h -= 1.6 * Math.exp(-((x + 18) ** 2 + (z + 12) ** 2) / 70);         // the pond on Ani's side
 const c = Math.hypot(x, z); h = h * smooth(4, 14, c) + 1.0 * (1 - smooth(4, 14, c)); // flat ground for the school
 return h;
}
const hexEdgeDist = (x, z, cx, cz) => { let d = -1e9; for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; d = Math.max(d, Math.abs((x - cx) * Math.cos(a) + (z - cz) * Math.sin(a)) - APO); } return d; };
const insideHex = (x, z, cx, cz) => hexEdgeDist(x, z, cx, cz) <= 0;

// ----- Winchester: the contract the hex city thread fills in (WINCHESTER.provider) -----
export const ZONES = {
 school:   {name: 'High School', dir: null, tint: '#c9a98a'},
 downtown: {name: 'Downtown', dirs: [0, 1], tint: '#d9c9a0', logo: 'cup'},
 ani:      {name: "Ani's side", dirs: [2, 3], tint: '#b9d89a', logo: 'bike'},
 abbie:    {name: "Abbie and Daddy's side", dirs: [4, 5], tint: '#a6d6b0', logo: 'tree'}
};
export const WINCHESTER = {provider: null};
const zoneOfDir = d => d <= 1 ? 'downtown' : d <= 3 ? 'ani' : 'abbie';

function tileTexture(T, kind, cx, cz, zone) {
 const R = 512, c = Object.assign(document.createElement('canvas'), {width: R, height: R}), g = c.getContext('2d'), rand = rnd(cx * 31 + cz * 17 + 7);
 const px = x => (x - cx + S) / (2 * S) * R, pz = z => (z - cz + S) / (2 * S) * R, sc = R / (2 * S);
 const base = kind === 'moon' ? '#9a9aa6' : kind === 'ranch' ? '#8cc55a' : '#86c26a';
 g.fillStyle = base; g.fillRect(0, 0, R, R);
 for (let i = 0; i < 1400; i++) { const x = rand() * R, y = rand() * R, v = rand(); g.fillStyle = kind === 'moon' ? (v < .5 ? '#8a8a96' : '#aaaab6') : (v < .5 ? '#79b45c' : '#9bd278'); g.globalAlpha = .45; g.beginPath(); g.arc(x, y, 3 + rand() * 7, 0, 7); g.fill(); }
 g.globalAlpha = 1;
 if (kind === 'winchester') {
  if (zone) { g.fillStyle = ZONES[zone].tint + '66'; g.fillRect(0, 0, R, R); }
  const roads = (pts, w, col) => { g.strokeStyle = col; g.lineWidth = w * sc; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(px(p[0]), pz(p[1])) : g.moveTo(px(p[0]), pz(p[1]))); g.stroke(); };
  for (const d of DIRS.keys()) { const [nx, nz] = hexXZ(...DIRS[d]), ex = nx / 2, ez = nz / 2; roads([[cx, cz], [cx + ex * .5, cz + ez * .5], [cx + ex, cz + ez]], 2.6, '#6b6d74'); } // a road out of every hex toward its neighbours
  for (const d of DIRS.keys()) { const [nx, nz] = hexXZ(...DIRS[d]); roads([[cx, cz], [cx + nx / 2, cz + nz / 2]], .25, '#f1e7b0'); }
 }
 if (kind === 'moon') { for (let i = 0; i < 18; i++) { const x = rand() * R, y = rand() * R, r = 6 + rand() * 20; g.fillStyle = '#7d7d8a'; g.globalAlpha = .6; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#c4c4cf'; g.lineWidth = 2; g.stroke(); } g.globalAlpha = 1; }
 const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

// relief that a tile brings of its own: nothing at the rim, full strength inside
const RELIEF = {
 winchester: () => 0,
 ranch: (x, z, cx, cz) => 1.6 * Math.sin((x - cx) * .22 + 1) * Math.cos((z - cz) * .19) + .9 * Math.sin((x - cx) * .4 + (z - cz) * .3),
 moon: (x, z, cx, cz) => { let h = .25 * Math.sin((x - cx) * .5); for (const [dx, dz, r, d] of [[-3, 2, 3.2, 1.6], [4, -3, 2.2, 1.1], [1, 5, 1.6, .8], [-5, -4, 1.4, .6]]) { const q = Math.hypot(x - cx - dx, z - cz - dz); h -= d * Math.exp(-(q * q) / (r * r)) - .35 * d * Math.exp(-((q - r) ** 2) / 1.2); } return h; }
};
export function tileHeight(kind, x, z, cx, cz) {
 const rim = smooth(0, S * .55, -hexEdgeDist(x, z, cx, cz));
 return landHeight(x, z) + RELIEF[kind](x, z, cx, cz) * rim;
}

function hexMesh(T, kind, q, r, zone) {
 const [cx, cz] = hexXZ(q, r), N = 20, pos = [], uv = [], idx = [], ring = [];
 const corner = k => [cx + S * Math.cos(Math.PI / 6 + k * Math.PI / 3), cz + S * Math.sin(Math.PI / 6 + k * Math.PI / 3)];
 const add = (x, z) => { pos.push(x, tileHeight(kind, x, z, cx, cz), z); uv.push((x - cx + S) / (2 * S), 1 - (z - cz + S) / (2 * S)); return pos.length / 3 - 1; };
 const rings = [[add(cx, cz)]];
 for (let n = 1; n <= N; n++) { const row = []; for (let s = 0; s < 6; s++) { const a = corner(s), b = corner(s + 1); for (let t = 0; t < n; t++) { const f = t / n; row.push(add(cx + ((a[0] + (b[0] - a[0]) * f) - cx) * n / N, cz + ((a[1] + (b[1] - a[1]) * f) - cz) * n / N)); } } rings.push(row); }
 for (let n = 1; n <= N; n++) for (let s = 0; s < 6; s++) for (let t = 0; t < n; t++) {
  const o = rings[n], i = rings[n - 1], a = o[s * n + t], b = o[(s * n + t + 1) % (6 * n)], ci = n === 1 ? i[0] : i[(s * (n - 1) + t) % (6 * (n - 1))];
  idx.push(a, ci, b);
  if (n > 1 && t < n - 1) idx.push(ci, i[(s * (n - 1) + t + 1) % (6 * (n - 1))], b);
 }
 const top = new T.BufferGeometry(); top.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); top.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); top.setIndex(idx); top.computeVertexNormals();
 const tex = tileTexture(T, kind, cx, cz, zone), mat = new T.MeshStandardMaterial({map: tex, roughness: .95, name: kind === 'moon' ? 'regolith' : 'grass'});
 const mesh = new T.Mesh(top, mat); mesh.receiveShadow = true; mesh.name = `${kind} tile top`;
 // the soil skirt: from every rim vertex down to the base, like the cut edge of a diorama
 const rimIdx = rings[N], sk = [], si = [];
 rimIdx.forEach((v, i) => { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]; sk.push(x, y, z, x, BASE, z); if (i) { const k = (i - 1) * 2; si.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
 { const k = (rimIdx.length - 1) * 2; si.push(k, k + 1, 0, k + 1, 1, 0); }
 const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sk, 3)); sg.setIndex(si); sg.computeVertexNormals();
 const skirt = new T.Mesh(sg, new T.MeshStandardMaterial({color: kind === 'moon' ? '#5d5d68' : '#6b4a32', roughness: 1, side: T.DoubleSide, name: 'soil'})); skirt.name = `${kind} tile soil`;
 const g = new T.Group(); g.add(mesh, skirt); g.userData = {kind, q, r, cx, cz}; return g;
}

const M = (T, color, o = {}) => new T.MeshStandardMaterial({color, roughness: .8, ...o});
function house(T, w, d, h, wall, roof) {
 const g = new T.Group(), b = new T.Mesh(new T.BoxGeometry(w, h, d), M(T, wall)), r = new T.Mesh(new T.ConeGeometry(Math.max(w, d) * .78, h * .6, 4), M(T, roof));
 b.position.y = h / 2 - .3; r.position.y = h + h * .3 - .3; r.rotation.y = Math.PI / 4; if (w > d) r.scale.set(1, 1, d / w); else r.scale.set(w / d, 1, 1);
 b.castShadow = r.castShadow = true; g.add(b, r); return g;
}
function tree(T, s = 1, c = '#4f9a4a') { const g = new T.Group(); const t = new T.Mesh(new T.CylinderGeometry(.12 * s, .17 * s, .9 * s, 6), M(T, '#6b4a32')); t.position.y = .45 * s; const k = new T.Mesh(new T.IcosahedronGeometry(.8 * s, 0), M(T, c)); k.position.y = 1.4 * s; t.castShadow = k.castShadow = true; g.add(t, k); return g; }
function signBoard(T, text, kind) {
 const c = Object.assign(document.createElement('canvas'), {width: 256, height: 160}), x = c.getContext('2d');
 x.fillStyle = '#c98f55'; x.fillRect(0, 0, 256, 160); x.strokeStyle = '#7a4a22'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 150);
 x.fillStyle = '#fff6df'; x.font = '84px serif'; x.textAlign = 'center'; x.fillText({cup: '☕', bike: '🚲', tree: '🌳', school: '🏫'}[kind], 128, 98);
 x.font = 'bold 22px system-ui'; x.fillStyle = '#3b2412'; x.fillText(text, 128, 140);
 const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
 const g = new T.Group(), p = new T.Mesh(new T.CylinderGeometry(.09, .09, 2.4, 6), M(T, '#5b3a1f')); p.position.y = 1.2;
 const b = new T.Mesh(new T.BoxGeometry(2.2, 1.4, .12), new T.MeshStandardMaterial({map: tex, roughness: .8})); b.position.y = 2.6; b.castShadow = true; g.add(p, b); return g;
}

export function createStage(canvas) {
 return import('three').then(T => build(T, canvas));
}

function build(T, canvas) {
 const renderer = new T.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: false});
 renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
 renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
 const scene = new T.Scene(), camera = playerCamera(new T.PerspectiveCamera(32, 1, .5, 2000));
 scene.background = new T.Color('#cfe6f5'); scene.fog = new T.Fog('#cfe6f5', 220, 520);
 const sun = new T.DirectionalLight('#fff0d0', 2.6); sun.position.set(60, 90, 40); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
 Object.assign(sun.shadow.camera, {left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 300}); sun.shadow.bias = -.0006;
 scene.add(sun, new T.HemisphereLight('#bfe2ff', '#6b8a50', 1.1));

 // tilt-shift: the picture is rendered to a target and sharpened in a band, softened above and below it
 const rt = new T.WebGLRenderTarget(4, 4, {samples: 4});
 const quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({
  uniforms: {tex: {value: rt.texture}, focus: {value: .55}, band: {value: .24}, amount: {value: 0}, px: {value: new T.Vector2(1, 1)}},
  vertexShader: 'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: `uniform sampler2D tex;uniform float focus,band,amount;uniform vec2 px;varying vec2 v;
   void main(){float d=smoothstep(band,band+.35,abs(v.y-focus));float r=amount*d*5.;vec4 c=vec4(0.);float w=0.;
   for(int i=-4;i<=4;i++){float k=exp(-float(i*i)/8.);c+=texture2D(tex,v+vec2(0.,float(i))*px*r)*k;w+=k;}
   gl_FragColor=c/w;
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   }`, depthTest: false}));
 quad.frustumCulled = false; const post = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); post.add(quad);
 const state = {tilt: 0, fx: [], time: 0};
 let shift = 0, shiftTo = 0; // fraction of the width the picture slides left so a phone on the right never covers the town
 function applyShift() { const w = canvas.clientWidth, h = canvas.clientHeight; if (Math.abs(shift) > .001) camera.setViewOffset(w, h, shift * w, 0, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix(); }
 function resize() { const w = canvas.clientWidth, h = canvas.clientHeight, pr = renderer.getPixelRatio(); renderer.setSize(w, h, false); camera.aspect = w / h; applyShift(); rt.setSize(w * pr, h * pr); quad.material.uniforms.px.value.set(1 / (w * pr), 1 / (h * pr)); }
 addEventListener('resize', resize); resize();

 // ---- the world: Winchester ----
 const world = new T.Group(); scene.add(world);
 const tiles = new Map(), put = (kind, q, r, zone) => { const m = hexMesh(T, kind, q, r, zone); world.add(m); tiles.set(q + ',' + r, m); return m; };
 const groundAt = (x, z) => { for (const t of tiles.values()) { const u = t.userData; if (insideHex(x, z, u.cx, u.cz)) return tileHeight(u.kind, x, z, u.cx, u.cz); } return landHeight(x, z); };
 const spots = {}; // named places other code can fly to or hang things on
 const rand = rnd(5);

 // true when a spot is on one of the roads that leave a hex centre toward its neighbours
 function offRoad(x, z, hx, hz) { for (const [q, r] of DIRS) { const [nx, nz] = hexXZ(q, r), l = Math.hypot(nx, nz), ux = nx / l, uz = nz / l, al = (x - hx) * ux + (z - hz) * uz, pe = Math.abs((x - hx) * uz - (z - hz) * ux); if (al > -2 && pe < 3) return true; } return false; }
 function winchester() {
  put('winchester', 0, 0, 'school');
  DIRS.forEach(([q, r], d) => put('winchester', q, r, zoneOfDir(d)));
  // the high school, in the middle where the three zones meet
  const sch = new T.Group(), bri = '#b4553a';
  const main = new T.Mesh(new T.BoxGeometry(11, 3.4, 4.4), M(T, bri)); main.position.y = 1.4; main.castShadow = true;
  const wing1 = new T.Mesh(new T.BoxGeometry(3.4, 2.8, 6.4), M(T, bri)); wing1.position.set(-5.4, 1.1, 2.4); wing1.castShadow = true;
  const wing2 = wing1.clone(); wing2.position.x = 5.4;
  const tower = new T.Mesh(new T.BoxGeometry(1.6, 3.2, 1.6), M(T, '#c9684a')); tower.position.set(0, 4.5, 0); tower.castShadow = true;
  const cap = new T.Mesh(new T.ConeGeometry(1.4, 1.5, 4), M(T, '#33414c')); cap.position.set(0, 7.0, 0); cap.rotation.y = Math.PI / 4;
  const clock = new T.Mesh(new T.CircleGeometry(.5, 20), M(T, '#fff6df')); clock.position.set(0, 4.6, .82);
  const door = new T.Mesh(new T.BoxGeometry(1.4, 1.6, .2), M(T, '#33414c')); door.position.set(0, .6, 2.25);
  sch.add(main, wing1, wing2, tower, cap, clock, door); sch.position.set(0, landHeight(0, 0) - .3, -1); world.add(sch); sch.name = 'high school'; spots.school = sch;
  // zone signs: painted wood, one for each of the three zones (no sign for the school)
  for (const [id, z] of Object.entries(ZONES)) {
   if (!z.dirs) continue; const d = z.dirs[0], [qx, qz] = hexXZ(...DIRS[d]);
   const sg = signBoard(T, z.name.replace(' and Daddy\'s side', ' + Daddy').replace("'s side", '’s'), z.logo); const x = qx * .5 + 3, zz = qz * .5 - 3; sg.position.set(x, groundAt(x, zz), zz); sg.rotation.y = -.5 + d; world.add(sg);
  }
  // downtown: the coffee shop (flat roof for the launch pad), the pizza place, the science lab
  const [dx, dz] = hexXZ(...DIRS[0]);
  const cafe = new T.Group(), cm = new T.Mesh(new T.BoxGeometry(5, 3.4, 4), M(T, '#d6a35f')); cm.position.y = 1.7; cm.castShadow = true;
  const awn = new T.Mesh(new T.BoxGeometry(5.2, .2, 1.6), M(T, '#d6475a')); awn.position.set(0, 2.6, 2.4); awn.rotation.x = .25;
  const roof = new T.Mesh(new T.BoxGeometry(5.3, .3, 4.3), M(T, '#7b5a3a')); roof.position.y = 3.55; roof.name = 'cafe roof';
  const cupSign = signBoard(T, 'COFFEE', 'cup'); cupSign.scale.setScalar(.6); cupSign.position.set(-2.8, 0, 2.6);
  cafe.add(cm, awn, roof, cupSign); const cx0 = dx - 3.5, cz0 = dz + 1; cafe.position.set(cx0, groundAt(cx0, cz0) - .25, cz0); cafe.rotation.y = .3; world.add(cafe); spots.cafe = cafe; cafe.name = 'coffee shop';
  const roofTop = new T.Object3D(); roofTop.position.set(0, 3.7, 0); cafe.add(roofTop); spots.cafeRoof = roofTop;
  const pizza = house(T, 4, 3, 2.6, '#e8d2a6', '#8a3b2d'); pizza.position.set(dx + 4, groundAt(dx + 4, dz - 2) , dz - 2); pizza.rotation.y = -.4; world.add(pizza);
  const lab = house(T, 3.6, 3.2, 2.8, '#cfe9ef', '#2f6f7a'); lab.position.set(dx - 1, groundAt(dx - 1, dz + 7), dz + 7); lab.name = 'science lab'; world.add(lab); spots.lab = lab;
  const beaker = new T.Mesh(new T.CylinderGeometry(.3, .3, .8, 12), M(T, '#7dff9a', {emissive: '#2fa84f', emissiveIntensity: .6, transparent: true, opacity: .85})); beaker.position.set(dx - 2.6, groundAt(dx - 2.6, dz + 8.5) + .5, dz + 8.5); world.add(beaker);
  // Ani's side: her house, her treehouse and the cul-de-sac
  const [ax, az] = hexXZ(...DIRS[3]);
  const ah = house(T, 5, 4, 3, '#d8c2f0', '#5d4b8a'); ah.position.set(ax + 2, groundAt(ax + 2, az), az); world.add(ah); spots.ani = ah;
  const at = tree(T, 1.7, '#5aa05a'); at.position.set(ax - 3, groundAt(ax - 3, az + 2), az + 2); world.add(at);
  // Abbie and Daddy's side: the house, the treehouse and the round steel door in the grass
  const [bx, bz] = hexXZ(...DIRS[5]);
  const bh = house(T, 5.2, 4, 3.2, '#f6c6da', '#a8446e'); bh.position.set(bx - 2, groundAt(bx - 2, bz), bz - 1); world.add(bh); spots.abbie = bh;
  const bt = tree(T, 2, '#4f9a4a'); bt.position.set(bx + 3, groundAt(bx + 3, bz + 1), bz + 1); world.add(bt);
  const th = new T.Mesh(new T.BoxGeometry(1.8, 1.2, 1.8), M(T, '#c98f55')); th.position.set(bx + 3, groundAt(bx + 3, bz + 1) + 2.5, bz + 1); th.castShadow = true; world.add(th);
  const hatch = new T.Mesh(new T.CylinderGeometry(.7, .7, .1, 20), M(T, '#8d949c', {metalness: .8, roughness: .35})); hatch.position.set(bx + 3, groundAt(bx + 3, bz + 3) + .05, bz + 3); world.add(hatch);
  // street homes and trees fill the rest, fewer where the land is steep
  for (const [q, r] of [[0, 0], ...DIRS]) { const [hx, hz] = hexXZ(q, r);
   for (let i = 0; i < 7; i++) { const a = rand() * 6.283, rr = 3 + rand() * 7.5, x = hx + Math.cos(a) * rr, z = hz + Math.sin(a) * rr; if (!insideHex(x, z, hx, hz)) continue; if (Math.hypot(x, z) < 9 || Math.hypot(x - cx0, z - cz0) < 9 || offRoad(x, z, hx, hz)) continue;
    const pal = ['#f4f1e8', '#c9d6dc', '#f0e2b0', '#d9cdb6'], hs = house(T, 3 + rand() * 1.6, 2.6 + rand() * 1.2, 2.2 + rand() * 1, pal[(rand() * 4) | 0], ['#4a4744', '#5a4a40', '#5a3f3a'][(rand() * 3) | 0]); hs.position.set(x, groundAt(x, z), z); hs.rotation.y = rand() * 6.283; world.add(hs); }
   for (let i = 0; i < 6; i++) { const a = rand() * 6.283, rr = 2 + rand() * 9, x = hx + Math.cos(a) * rr, z = hz + Math.sin(a) * rr; if (!insideHex(x, z, hx, hz) || Math.hypot(x, z) < 9 || Math.hypot(x - cx0, z - cz0) < 6 || offRoad(x, z, hx, hz)) continue; const t = tree(T, .8 + rand() * .8, ['#4f9a4a', '#c8782a', '#d9a03a'][(rand() * 3) | 0]); t.position.set(x, groundAt(x, z), z); world.add(t); }
  }
  // the town noticeboard in the square by the school: cork, painted wood, a brass plate
  const nb = new T.Group(), frame = new T.Mesh(new T.BoxGeometry(3.4, 2.2, .24), M(T, '#3f7ea6')), cork = new T.Mesh(new T.BoxGeometry(3.0, 1.8, .26), M(T, '#c8955a'));
  const plate = new T.Mesh(new T.BoxGeometry(1.5, .26, .3), M(T, '#d9b24a', {metalness: .8, roughness: .3})); plate.position.set(0, 1.25, 0); frame.position.y = 2.2; cork.position.y = 2.2; plate.position.y = 3.5;
  for (const x of [-1.5, 1.5]) { const post = new T.Mesh(new T.BoxGeometry(.18, 2.2, .18), M(T, '#5b3a1f')); post.position.set(x, 1.1, 0); nb.add(post); }
  for (const [px, py, c] of [[-.9, 2.6, '#fff'], [-.1, 2.0, '#ffe9b8'], [.8, 2.5, '#ffd0e4'], [.5, 1.7, '#cfe8ff']]) { const n = new T.Mesh(new T.BoxGeometry(.6, .7, .02), M(T, c)); n.position.set(px, py, .15); nb.add(n); }
  nb.add(frame, cork, plate); nb.position.set(-6, groundAt(-6, 7), 7); nb.rotation.y = .75; nb.name = 'town noticeboard'; world.add(nb); spots.noticeboard = nb;
  // the pond on Ani's side
  const pond = new T.Mesh(new T.CircleGeometry(5.4, 28), new T.MeshStandardMaterial({color: '#6bb7e6', roughness: .1, metalness: .1, transparent: true, opacity: .85})); pond.rotation.x = -Math.PI / 2; pond.position.set(-18, landHeight(-18, -12) + 1.15, -12); world.add(pond);
 }
 if (WINCHESTER.provider) WINCHESTER.provider({T, world, put, groundAt, spots}); else winchester();

 // ---- ranch and moon tiles ----
 function ranchProps(g) {
  const {cx, cz} = g.userData, barn = house(T, 4.4, 3.4, 3, '#b8402f', '#5b2a22'); barn.position.set(cx - 2, groundAt(cx - 2, cz - 1), cz - 1); g.add(barn);
  for (let i = 0; i < 5; i++) { const x = cx + 2 + rand() * 5, z = cz + 1 + rand() * 4, s = new T.Mesh(new T.SphereGeometry(.45, 10, 8), M(T, '#f4f1e8')); s.scale.y = .8; s.position.set(x, groundAt(x, z) + .45, z); s.castShadow = true; g.add(s); }
  for (let i = 0; i < 8; i++) { const a = rand() * 6.283, rr = 3 + rand() * 6, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (!insideHex(x, z, cx, cz)) continue; const t = tree(T, .9 + rand() * .7); t.position.set(x, groundAt(x, z), z); g.add(t); }
 }
 function moonProps(g) {
  const {cx, cz} = g.userData;
  const dome = new T.Mesh(new T.SphereGeometry(2.2, 20, 12, 0, 7, 0, Math.PI / 2), M(T, '#dfe9f2', {transparent: true, opacity: .65, roughness: .1})); dome.position.set(cx - 2, groundAt(cx - 2, cz) , cz); g.add(dome);
  const kiosk = new T.Mesh(new T.BoxGeometry(1.4, 1.2, 1.2), M(T, '#ffc94a')); kiosk.position.set(cx + 3.5, groundAt(cx + 3.5, cz + 2) + .6, cz + 2); kiosk.castShadow = true; g.add(kiosk);
  const cheese = new T.Mesh(new T.ConeGeometry(.5, .4, 3), M(T, '#ffd95a')); cheese.position.set(cx + 3.5, groundAt(cx + 3.5, cz + 2) + 1.4, cz + 2); g.add(cheese);
  const flag = new T.Mesh(new T.BoxGeometry(.8, .5, .04), M(T, '#ff7eb6')); flag.position.set(cx + .6, groundAt(cx, cz - 4) + 2.7, cz - 4); const pole = new T.Mesh(new T.CylinderGeometry(.03, .03, 2.6, 6), M(T, '#ddd')); pole.position.set(cx + .2, groundAt(cx, cz - 4) + 1.3, cz - 4); g.add(pole, flag);
  for (let i = 0; i < 6; i++) { const x = cx - 7 + rand() * 14, z = cz - 7 + rand() * 14; if (!insideHex(x, z, cx, cz)) continue; const r = new T.Mesh(new T.DodecahedronGeometry(.3 + rand() * .5, 0), M(T, '#7d7d8a')); r.position.set(x, groundAt(x, z) + .2, z); r.castShadow = true; g.add(r); }
 }

 // a little flag over a place with an open mission (a spatial cue: the player's layer)
 const flags = {};
 function flag(name, on, colour = '#ffd95a') {
  flags[name]?.parent?.remove(flags[name]); delete flags[name]; if (!on || !spots[name]) return;
  const g = new T.Group(), pole = new T.Mesh(new T.CylinderGeometry(.04, .04, 1.6, 6), new T.MeshBasicMaterial({color: '#f4f1e8'})), cl = new T.Mesh(new T.PlaneGeometry(.9, .55), new T.MeshBasicMaterial({color: colour, side: T.DoubleSide}));
  pole.position.y = .8; cl.position.set(.45, 1.35, 0); g.add(pole, cl); g.position.y = name === 'cafe' ? 4.6 : 3.8; presentation(g, {purpose: 'open mission flag'}); spots[name].add(g); flags[name] = g;
 }
 // open slots: the twelve places beside the seven hexes
 const fr = []; for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { if (Math.abs(q + r) > 2) continue; if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === 2) fr.push([q, r]); }
 const slotGroup = new T.Group(); scene.add(slotGroup);
 const dust = [];
 function puff(x, y, z) { for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.SphereGeometry(.4, 8, 6), new T.MeshBasicMaterial({color: '#f4eadb', transparent: true, opacity: .8})); m.position.set(x, y + .3, z); m.userData = {v: [(Math.random() - .5) * 8, Math.random() * 3 + 1, (Math.random() - .5) * 8], life: 0}; presentation(m, {purpose: 'dust puff'}); scene.add(m); dust.push(m); } }
 function showSlots(on, hover = null) {
  slotGroup.clear(); if (!on) return;
  for (const [q, r] of fr) { if (tiles.has(q + ',' + r)) continue; const [x, z] = hexXZ(q, r);
   const on = hover === q + ',' + r, m = new T.Mesh(on ? new T.CircleGeometry(S * .93, 6) : new T.RingGeometry(S * .8, S * .93, 6), new T.MeshBasicMaterial({color: on ? '#fff1c4' : '#ffffff', transparent: true, opacity: on ? .6 : .85, depthWrite: false, side: T.DoubleSide}));
   m.rotation.set(-Math.PI / 2, 0, Math.PI / 6); m.position.set(x, landHeight(x, z) + .4, z); m.userData.slot = [q, r]; presentation(m, {purpose: 'open tile slot'}); slotGroup.add(m); }
 }
 const placing = {kind: null};
 function place(kind, q, r) {
  padlock?.parent?.remove(padlock); padlock = null;
  const g = put(kind, q, r), t0 = state.time; g.userData.drop = t0; g.position.y = 18; (kind === 'ranch' ? ranchProps : moonProps)(g);
  state.fx.push(dt => { const t = state.time - t0; const k = Math.min(1, t / .9); g.position.y = k >= 1 ? 0 : 18 * (1 - k * k) * Math.abs(Math.cos(k * 5)) * (1 - k); if (k >= 1) { g.position.y = 0; const [x, z] = hexXZ(q, r); puff(x, 1, z); puff(x + 3, 1, z + 3); return false; } return true; });
  return g;
 }

 // ---- the café roof: a launch pad that unfolds like a satellite, and a toy rocket ----
 let pad = null, padlockModel = null, padlock = null;
 function buildPad() {
  if (pad) return pad;
  const g = new T.Group(), core = new T.Mesh(new T.CylinderGeometry(.7, .9, .5, 20), M(T, '#8d949c', {metalness: .6, roughness: .35}));
  const panels = []; for (let i = 0; i < 4; i++) { const hinge = new T.Group(), p = new T.Mesh(new T.BoxGeometry(2.4, .12, 1.9), M(T, i % 2 ? '#e8edf3' : '#ff7eb6', {metalness: .3})); p.position.set(1.2, 0, 0); p.castShadow = true; hinge.add(p); hinge.rotation.y = i * Math.PI / 2; hinge.position.y = .25; g.add(hinge); panels.push(hinge); }
  const arms = []; panels.forEach(h => { const l = new T.Mesh(new T.SphereGeometry(.14, 8, 6), new T.MeshBasicMaterial({color: '#ffe36b'})); l.position.set(2.3, .12, 0); h.children[0].add(l); });
  const toy = rocket(.1); toy.position.y = .5; toy.visible = false; g.add(core, toy); g.userData = {panels, arms, toy, core};
  g.scale.setScalar(.01); g.visible = false; spots.cafeRoof.add(g); return (pad = g);
 }
 const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3), bounce = t => t >= 1 ? 1 : 1 + Math.sin(t * 9) * Math.exp(-t * 5) * (1 - t) * 1.2;
 function padUnfold(dur = 3.6) {
  const g = buildPad(), {panels, arms} = g.userData; g.visible = true; const t0 = state.time;
  return new Promise(res => state.fx.push(() => {
   const t = (state.time - t0) / dur, up = ease(t / .35), open = ease((t - .3) / .6);
   g.scale.setScalar(.01 + up * .99);
   panels.forEach((h, i) => { h.children[0].position.x = 1.2 * open + .15; h.rotation.z = (1 - open) * 1.5 * (i % 2 ? 1 : -1) * (1 - open); h.rotation.x = 0; h.children[0].scale.x = .3 + open * .7; h.position.y = .25 + (1 - open) * .6; });
   if (t >= 1) { res(); return false; } return true;
  }));
 }
 function toyRocket(dur = 1.4) { const g = buildPad(), toy = g.userData.toy; toy.visible = true; const t0 = state.time; return new Promise(res => state.fx.push(() => { const t = (state.time - t0) / dur; toy.scale.setScalar(.1 * bounce(Math.min(1, t)) * Math.min(1, t * 3)); if (t >= 1) { res(); return false; } return true; })); }
 function growSpray(dur = 3) {
  const g = buildPad(), toy = g.userData.toy, t0 = state.time, mist = [];
  const top = new T.Vector3(); toy.getWorldPosition(top);
  for (let i = 0; i < 40; i++) { const m = new T.Mesh(new T.SphereGeometry(.18, 6, 5), new T.MeshBasicMaterial({color: '#8dff9f', transparent: true, opacity: .8})); presentation(m, {purpose: 'grow spray'}); m.userData = {a: Math.random() * 6.283, h: Math.random(), s: .6 + Math.random()}; scene.add(m); mist.push(m); }
  return new Promise(res => state.fx.push(() => {
   const t = (state.time - t0) / dur, grow = ease((t - .35) / .5);
   toy.scale.setScalar(.1 + grow * .4 * (1 + Math.sin(grow * 9) * .06 * (1 - grow)));
   toy.getWorldPosition(top);
   mist.forEach(m => { const u = m.userData, ph = (t * 1.5 + u.h) % 1; m.position.set(top.x + Math.cos(u.a + t * 3) * (.4 + ph * 1.4), top.y + 1.6 - ph * 1.6, top.z + Math.sin(u.a + t * 3) * (.4 + ph * 1.4)); m.material.opacity = t < 1 ? (1 - ph) * .8 * (t < .85 ? 1 : (1 - t) / .15) : 0; });
   if (t >= 1) { mist.forEach(m => { scene.remove(m); }); res(); return false; } return true;
  }));
 }

 // ---- stand-in hero figures and the studio ----
 const studio = new T.Group(); studio.position.set(-400, 0, 0); scene.add(studio);
 (function () {
  const floor = new T.Mesh(new T.CylinderGeometry(16, 16, .6, 48), M(T, '#f1e8d8')); floor.position.y = -.3; floor.receiveShadow = true;
  const back = new T.Mesh(new T.CylinderGeometry(17, 17, 12, 48, 1, true, 3.6, 3.0), new T.MeshStandardMaterial({color: '#7c6cd8', side: T.BackSide, roughness: 1})); back.position.y = 5.7;
  const stripe = new T.Mesh(new T.CylinderGeometry(16.9, 16.9, 1.2, 48, 1, true, 3.6, 3.0), new T.MeshStandardMaterial({color: '#ff9ac6', side: T.BackSide, roughness: 1})); stripe.position.y = 3;
  const key = new T.SpotLight('#fff3dc', 900, 60, .6, .6); key.position.set(0, 18, 18); key.target.position.set(0, 1.5, 0); studio.add(key, key.target);
  studio.add(floor, back, stripe);
  // a lamp and a sofa so it reads as a studio, not a void
  const sofa = new T.Mesh(new T.BoxGeometry(5, 1.2, 1.8), M(T, '#ff9ac6')); sofa.position.set(-9, .6, -9); sofa.rotation.y = .5; sofa.castShadow = true; studio.add(sofa);
  const lamp = new T.Mesh(new T.CylinderGeometry(.1, .1, 4, 8), M(T, '#333')); lamp.position.set(9, 2, -8); const shade = new T.Mesh(new T.ConeGeometry(.9, 1.1, 14, 1, true), M(T, '#ffe6a0', {emissive: '#ffcf70', emissiveIntensity: .8, side: T.DoubleSide})); shade.position.set(9, 4.2, -8); studio.add(lamp, shade);
 })();
 // Cartoon stand-ins for the Meshy heroes: a rounded body, a big head, hair and a bob. Never drawn from photos.
 function kid(colour, hair, skin, hairStyle) {
  const g = new T.Group(), body = new T.Mesh(new T.CapsuleGeometry(.7, 1.1, 6, 14), M(T, colour)), head = new T.Mesh(new T.SphereGeometry(.85, 20, 16), M(T, skin));
  body.position.y = 1.5; head.position.y = 3.15; body.castShadow = head.castShadow = true;
  const hr = new T.Mesh(new T.SphereGeometry(.92, 20, 14, 0, 6.3, 0, hairStyle === 'long' ? 1.9 : 1.35), M(T, hair)); hr.position.y = 3.2; hr.rotation.x = -.15;
  const eyes = [-.3, .3].map(x => { const e = new T.Mesh(new T.SphereGeometry(.09, 8, 6), M(T, '#2a1d17')); e.position.set(x, 3.2, .78); return e; });
  const legs = [-.3, .3].map(x => { const l = new T.Mesh(new T.CapsuleGeometry(.2, .7, 4, 8), M(T, '#3a3f7a')); l.position.set(x, .55, 0); l.castShadow = true; return l; });
  const arms = [-.95, .95].map(x => { const a = new T.Mesh(new T.CapsuleGeometry(.17, .8, 4, 8), M(T, colour)); a.position.set(x, 1.7, 0); a.castShadow = true; return a; });
  g.add(body, head, hr, ...eyes, ...legs, ...arms); g.userData = {legs, arms, head}; g.name = 'stand-in hero'; return g;
 }
 const heroes = {abbie: kid('#ff7eb6', '#7a4a2a', '#f2c9a5', 'long'), ani: kid('#b18cff', '#4a2c20', '#b07a52', 'long')};
 heroes.abbie.scale.setScalar(.82); heroes.ani.scale.setScalar(.95);
 for (const h of Object.values(heroes)) { h.visible = false; studio.add(h); }
 function walkIn() {
  const t0 = state.time; heroes.abbie.visible = heroes.ani.visible = true;
  const from = [[-22, 20], [-14, 24]], to = [[-3.2, 4], [3, 3.6]];
  return new Promise(res => state.fx.push(() => {
   const t = (state.time - t0) / 2.4, k = ease(t);
   [heroes.abbie, heroes.ani].forEach((h, i) => { const [fx, fz] = from[i], [tx, tz] = to[i]; h.position.set(fx + (tx - fx) * k, 0, fz + (tz - fz) * k); h.rotation.y = Math.atan2(tx - fx, tz - fz) * (1 - k) + k * (i ? -.35 : .35);
    const sw = Math.sin(state.time * 12 + i) * (1 - k) * .8; h.userData.legs[0].rotation.x = sw; h.userData.legs[1].rotation.x = -sw; h.userData.arms[0].rotation.x = -sw; h.userData.arms[1].rotation.x = sw; h.position.y = Math.abs(Math.sin(state.time * 12 + i)) * .12 * (1 - k); });
   if (t >= 1) { res(); return false; } return true;
  }));
 }
 // keep them alive while they talk: a small sway and a head tilt
 state.fx.push(() => { const t = state.time; if (heroes.abbie.visible) { heroes.abbie.rotation.z = Math.sin(t * 2) * .03; heroes.ani.rotation.z = Math.sin(t * 2 + 1) * .03; heroes.abbie.userData.head.rotation.z = Math.sin(t * 1.3) * .06; } return true; });

 // ---- camera ----
 const cam = {target: new T.Vector3(), dist: 120, yaw: .6, pitch: .62}, cur = {...cam, target: cam.target.clone()};
 let flight = null;
 function applyCam() { const p = cur.pitch, d = cur.dist; camera.position.set(cur.target.x + Math.sin(cur.yaw) * Math.cos(p) * d, cur.target.y + Math.sin(p) * d, cur.target.z + Math.cos(cur.yaw) * Math.cos(p) * d); camera.lookAt(cur.target); }
 function flyTo(v, dur = 1.6) {
  const a = {t: cur.target.clone(), d: cur.dist, y: cur.yaw, p: cur.pitch}, t0 = state.time, to = {t: v.target ? new T.Vector3(...v.target) : a.t, d: v.dist ?? a.d, y: v.yaw ?? a.y, p: v.pitch ?? a.p};
  if (dur <= 0) { cur.target.copy(to.t); cur.dist = to.d; cur.yaw = to.y; cur.pitch = to.p; applyCam(); return Promise.resolve(); }
  return new Promise(res => { flight = () => { const k = Math.min(1, (state.time - t0) / dur), e = k * k * (3 - 2 * k); cur.target.lerpVectors(a.t, to.t, e); cur.dist = a.d + (to.d - a.d) * e; cur.yaw = a.y + (to.y - a.y) * e; cur.pitch = a.p + (to.p - a.p) * e; applyCam(); if (k >= 1) { flight = null; res(); } }; });
 }
 const VIEWS = {
  studio: {target: [-400, 2.4, 3], dist: 30, yaw: 0, pitch: .12},
  board: {target: [0, 0, 0], dist: 118, yaw: .6, pitch: .62},
  school: {target: [0, 1, 0], dist: 38, yaw: .3, pitch: .5}
 };
 function zoneView(id, dur) { const z = ZONES[id]; if (!z.dirs) return flyTo({target: [0, 2, 0], dist: 46, yaw: .35, pitch: .48}, dur); const a = hexXZ(...DIRS[z.dirs[0]]), b = hexXZ(...DIRS[z.dirs[1]]), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2; return flyTo({target: [cx, 1, cz], dist: 58, yaw: Math.atan2(cx, cz) * .5 + .4, pitch: .5}, dur); }
 function cafeView(dur) { const w = new T.Vector3(); spots.cafe.getWorldPosition(w); return flyTo({target: [w.x, 3, w.z], dist: 24, yaw: -.15, pitch: .38}, dur); }
 function roofView(dur) { const w = new T.Vector3(); spots.cafeRoof.getWorldPosition(w); return flyTo({target: [w.x, w.y, w.z], dist: 17, yaw: -.25, pitch: .5}, dur); }
 function tileView(q, r, dur) { const [x, z] = hexXZ(q, r); return flyTo({target: [x, 1, z], dist: 44, yaw: .5, pitch: .55}, dur); }
 flyTo(VIEWS.studio, 0);

 // ---- picking ----
 const ray = new T.Raycaster(), ndc = new T.Vector2();
 function pick(ev, objects) { const b = canvas.getBoundingClientRect(); ndc.set((ev.clientX - b.left) / b.width * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ndc, camera); ray.layers.enable(31); return ray.intersectObjects(objects, false)[0]; }
 function slotAt(ev) { const h = pick(ev, slotGroup.children); return h ? h.object.userData.slot : null; }

 // ---- the loop ----
 const clock = new T.Clock(); let running = true, last = 0;
 function frame() {
  if (!running) return; const dt = Math.min(.05, clock.getDelta()); state.time += dt;
  state.fx = state.fx.filter(f => f(dt) !== false); if (flight) flight();
  for (let i = dust.length - 1; i >= 0; i--) { const m = dust[i], u = m.userData; u.life += dt; m.position.x += u.v[0] * dt; m.position.y += u.v[1] * dt; m.position.z += u.v[2] * dt; m.scale.setScalar(1 + u.life * 2); m.material.opacity = Math.max(0, .8 - u.life * 1.1); if (u.life > .8) { scene.remove(m); dust.splice(i, 1); } }
  if (shift !== shiftTo) { shift += (shiftTo - shift) * Math.min(1, dt * 3); if (Math.abs(shift - shiftTo) < .001) shift = shiftTo; applyShift(); }
  quad.material.uniforms.amount.value += (state.tilt - quad.material.uniforms.amount.value) * Math.min(1, dt * 4);
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(post, postCam);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);

 return {
  T, scene, camera, renderer, world, tiles, spots, heroes, state, VIEWS,
  groundAt, flyTo, zoneView, cafeView, roofView, tileView, walkIn, padUnfold, toyRocket, growSpray, place, showSlots, slotAt, puff,
  nudge(dyaw, dpitch, zoom) { if (flight) return; cur.yaw += dyaw; cur.pitch = Math.min(1.2, Math.max(.2, cur.pitch + dpitch)); cur.dist = Math.min(220, Math.max(18, cur.dist * zoom)); applyCam(); },
  tiltShift: (on = true) => { state.tilt = on ? .8 : 0; },
  setSky(c) { scene.background = new T.Color(c); scene.fog.color.set(c); },
  shift: f => { shiftTo = f; },
  flag, project(obj) { const v = new T.Vector3(); obj.getWorldPosition(v); v.project(camera); return [(v.x + 1) / 2 * canvas.clientWidth, (1 - v.y) / 2 * canvas.clientHeight]; },
  async padlock(q, r) { // "Show me where": the game-ready padlock sets down on the open spot
   if (!padlockModel) { const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js'); padlockModel = (await new GLTFLoader().loadAsync('/models/padlock/padlock.glb')).scene; }
   padlock?.parent?.remove(padlock); const [x, z] = hexXZ(q, r); padlock = presentation(padlockModel.clone(), {purpose: 'locked place'}); padlock.scale.setScalar(3); padlock.position.set(x, landHeight(x, z) + 9, z); scene.add(padlock);
   const pl = padlock, t0 = state.time; state.fx.push(() => { if (!pl.parent) return false; const k = Math.min(1, (state.time - t0) / .7); pl.position.y = landHeight(x, z) + 1 + 8 * (1 - k * k) + Math.abs(Math.sin(k * 6)) * (1 - k) * 1.2; pl.rotation.y += .01; return true; }); return pl;
  },
  clearPadlock() { padlock?.parent?.remove(padlock); padlock = null; },
  stop() { running = false; removeEventListener('resize', resize); },
  resize, hexXZ, free: () => fr.filter(([q, r]) => !tiles.has(q + ',' + r)), has: kind => [...tiles.values()].some(t => t.userData.kind === kind)
 };
}
