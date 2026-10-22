// Scene 1: Alaric in the wagon watches Fritigern return wounded from the gate of Marcianople (376 AD).
// A blocking study: geography, movement, camera and atmosphere first; models are placeholders built from
// the paper grammar. Query params: ?shot=wide|alaric|over|reverse|follow|director|orbit  &t=seconds
// &play=0|1  &ui=0  &rays=1  &layout=a|b
import * as THREE from "three";
import { OrbitControls } from "/vendor/OrbitControls.js";
import { initOverlay, STYLES } from "./overlays.js";
import { GLTFLoader } from "/vendor/loaders/GLTFLoader.js";
import { paper, plate, block, prism, creases, rng } from "./paper.js";
import { C, ridgeHelmet, ovalShield, roundShield, figure, poseWalk, poseSit, poseKneel, wagon, ox, tent, campfire, gatehouse, torch, stake } from "./props.js";

const Q = new URLSearchParams(location.search);
const LAYOUT = Q.get("layout") || "b";
const DUR = 42;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById("stage").appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG = new THREE.Color(0xd2a07a);
scene.fog = new THREE.Fog(FOG, 22, 120);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);

// ---------- sky and light: late afternoon, sun low behind the town, so the gate is backlit ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { sun: { value: new THREE.Vector3(0.08, 0.075, -1).normalize() } },
  vertexShader: "varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `varying vec3 d; uniform vec3 sun;
    void main(){ float h = clamp(d.y, -0.1, 1.0);
      vec3 top = vec3(0.27,0.33,0.52), mid = vec3(0.88,0.58,0.45), low = vec3(1.0,0.7,0.4);
      vec3 c = mix(low, mid, smoothstep(0.0, 0.12, h)); c = mix(c, top, smoothstep(0.12, 0.6, h));
      float s = max(dot(d, sun), 0.0); c += vec3(1.0,0.72,0.4) * pow(s, 24.0) * 0.8 + vec3(1.0,0.85,0.6) * pow(s, 600.0) * 2.0;
      gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);
const hemi = new THREE.HemisphereLight(0x8a9cc4, 0x5a4232, 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffb06a, 3.0);
sun.position.set(14, 13, -90); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 10, far: 200 });
sun.shadow.bias = -0.0008; sun.target.position.set(3, 0, -10); scene.add(sun, sun.target);

// ---------- ground: folded paper terrain, with the muddy track from the gate ----------
const GATE = new THREE.Vector3(0, 0, -37);
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, -35.5), new THREE.Vector3(0.9, 0, -27), new THREE.Vector3(-0.8, 0, -18),
  new THREE.Vector3(1.2, 0, -10), new THREE.Vector3(3.4, 0, -4), new THREE.Vector3(4.6, 0, -0.6),
]);
function trackDist(x, z) {
  let best = 1e9; for (let i = 0; i <= 60; i++) { const p = PATH.getPoint(i / 60); best = Math.min(best, Math.hypot(p.x - x, p.z - z)); }
  return best;
}
function heightAt(x, z) {
  const roll = Math.sin(x * 0.07) * 0.6 + Math.cos(z * 0.05 + x * 0.03) * 0.5 + Math.sin((x + z) * 0.13) * 0.2;
  const flat = Math.min(1, Math.max(0, (Math.hypot(x - 6, z - 12) - 18) / 25)) * Math.min(1, Math.max(0, (z + 28) / 8));
  return roll * flat + (z > 40 ? (z - 40) * 0.12 : 0);
}
{
  const geo = new THREE.PlaneGeometry(260, 260, 90, 90); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  const g = geo.toNonIndexed(), q = g.attributes.position, col = new Float32Array(q.count * 3), r = rng(5);
  const grass = new THREE.Color(C.grass), mud = new THREE.Color(C.mud), trodden = new THREE.Color(0x9a8a62), tmp = new THREE.Color();
  for (let i = 0; i < q.count; i += 3) {
    const cx = (q.getX(i) + q.getX(i + 1) + q.getX(i + 2)) / 3, cz = (q.getZ(i) + q.getZ(i + 1) + q.getZ(i + 2)) / 3;
    const d = trackDist(cx, cz), camp = Math.hypot(cx - 6, cz - 12);
    tmp.copy(grass);
    if (camp < 17) tmp.lerp(trodden, 0.7);
    if (d < 2.6 && cz > -37 && cz < 2) tmp.copy(mud);
    tmp.multiplyScalar(0.9 + r() * 0.18);
    for (let j = 0; j < 3; j++) col.set([tmp.r, tmp.g, tmp.b], (i + j) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  ground.receiveShadow = true; ground.userData.occluder = "ground"; ground.name = "ground";
  scene.add(ground);
}
const place = (o, x, z, ry = 0) => { o.position.set(x, heightAt(x, z), z); o.rotation.y = ry; scene.add(o); return o; };
const label = (o, name) => { o.traverse(m => { if (m.isMesh) m.userData.occluder = name; }); return o; };

// ---------- the town: wall, gate, guards, torches ----------
const town = gatehouse({ length: 110 }); town.position.copy(GATE); scene.add(town);
const anim = [];
for (const s of [-1, 1]) {
  const t = torch(); t.group.position.set(GATE.x + s * 2.6, 0, GATE.z + 3.6); scene.add(t.group);
  anim.push(tt => { t.light.intensity = 5 * (0.85 + 0.15 * Math.sin(tt * 11 + s * 3)); });
}
const guards = [];
for (const [x, dz, ry] of [[-3.4, 4.4, 0.2], [3.6, 4.6, -0.3], [-12, 0.4, 0], [10, 0.4, 0], [16, 0.4, 0]]) {
  const z = GATE.z + dz, onWall = dz < 1;
  const gd = figure({ kind: "roman", tunic: C.romanTunic, cloak: C.romanCloak, trousers: 0x6a5a4a, helmet: ridgeHelmet(), shield: onWall ? null : ovalShield(0xb8463a, 0xeee0bf), spear: true, seed: Math.round(x * 7) });
  gd.position.set(x, onWall ? 8 : heightAt(x, z), z); gd.rotation.y = ry; scene.add(label(gd, "roman guard")); guards.push(gd);
}
// The guards wear the Intercisa ridge helmet from the paper helmet study (tools/paper-helmet, PR #45),
// recoloured as grey card. The procedural helmet stays as the fallback until it loads.
let helmetsReady = Promise.resolve();
helmetsReady = new GLTFLoader().loadAsync("./assets/ridge_helmet.glb").then(gltf => {
  const src = gltf.scene, box = new THREE.Box3().setFromObject(src), c = box.getCenter(new THREE.Vector3());
  src.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshStandardMaterial({ color: 0xa3a8ab, roughness: 0.85, flatShading: true, side: THREE.DoubleSide }); o.castShadow = true; o.userData.occluder = "roman guard"; } });
  for (const gd of guards) gd.traverse(h => {
    if (h.userData.role !== "ridge-helmet" || h.userData.swapped) return;
    h.userData.swapped = true;
    for (const ch of [...h.children]) ch.visible = false;
    const m = src.clone(true); m.position.set(-c.x, 0.165 - box.max.y, -c.z); h.add(m);
  });
}).catch(e => console.warn("ridge helmet GLB not loaded, keeping the procedural helmet", e));

// distant buildings behind the wall: roofs above the parapet so it reads as a town
for (let i = 0; i < 14; i++) {
  const r = rng(40 + i), x = -40 + i * 6 + r() * 3, z = GATE.z - 8 - r() * 20;
  const h = 7 + r() * 5, b = block(4 + r() * 3, h, 5, C.card, { seed: i }); b.position.set(x, h / 2, z); scene.add(b);
  const roof = paper(new THREE.ConeGeometry(3.6, 2.2, 4), C.madder, { crumple: 0.08, seed: i }); roof.rotation.y = Math.PI / 4; roof.position.set(x, h + 1.1, z); roof.scale.set(1, 1, 1.3); scene.add(roof);
}

// ---------- the camp: wagon circle, fires, tents, oxen, people ----------
const CAMP = new THREE.Vector3(6, 0, 14), RING = 12.5;
const fires = [];
const ringWagons = [];
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2 + 0.2;
  const toGate = Math.abs(Math.atan2(Math.sin(a - (-Math.PI / 2 - 0.25)), Math.cos(a - (-Math.PI / 2 - 0.25))));
  if (toGate < 0.32) continue; // the gap where the track enters the circle
  const x = CAMP.x + Math.cos(a) * RING, z = CAMP.z + Math.sin(a) * RING;
  const w = wagon({ cover: [C.hide, C.wool, 0x9c8a6e][i % 3], seed: i + 2, covered: i % 4 !== 1 });
  place(label(w, "wagon in the circle"), x, z, -a); ringWagons.push(w);
}
// Alaric's wagon: just outside the gap, rear turned toward the track and the gate.
const ALARIC_WAGON = LAYOUT === "a" ? { x: 8.6, z: 2.6, ry: Math.PI + 0.55 } : { x: 6.9, z: 1.6, ry: Math.PI + 0.32 };
const aw = wagon({ cover: C.wool, seed: 99 });
place(label(aw, "Alaric's own wagon"), ALARIC_WAGON.x, ALARIC_WAGON.z, ALARIC_WAGON.ry);
const yoke = ox({ seed: 3 }); place(yoke, ALARIC_WAGON.x + 1.8, ALARIC_WAGON.z + 5.4, ALARIC_WAGON.ry + 0.9 + Math.PI);
const ox2 = ox({ seed: 4, color: 0x9c8466 }); place(ox2, ALARIC_WAGON.x + 3.2, ALARIC_WAGON.z + 4.3, ALARIC_WAGON.ry + 0.6 + Math.PI);
for (const [x, z, s] of [[6, 13, 1], [1, 18, 2], [11, 9, 3], [10, 19, 4], [3.6, 3.0, 5]]) { const f = campfire(s); place(f.group, x, z); fires.push(f); anim.push(f.update); }
for (const [x, z, c] of [[2.5, 10, C.wool], [12, 15, 0x9c8a6e], [5, 21, C.hide], [-1, 14, 0xb9ab8f]]) place(label(tent({ color: c, seed: x * 3 }), "tent"), x, z);
const goths = [];
const crowd = [
  // [x, z, ry, kind, tunic, cloak, pose]
  [1.6, -1.4, Math.PI - 0.1, "woman", 0xb7a487, C.woad, "stand"],
  [0.1, -0.4, Math.PI + 0.2, "goth", C.wool, C.madder, "stand"],
  [2.9, -2.6, Math.PI - 0.3, "goth", 0x9c8a6e, C.brown, "stand"],
  [6.4, 12.2, 0.8, "goth", C.wool, C.brown, "kneel"],
  [5.0, 14.2, 2.4, "woman", 0xb7a487, C.madder, "kneel"],
  [11.6, 10.2, -0.6, "goth", 0x9c8a6e, C.woad, "kneel"],
  [1.2, 17.0, 1.9, "child", C.wool, C.brown, "stand"],
];
for (const [x, z, ry, kind, tunic, cloak, pose] of crowd) {
  const g = figure({ kind: kind === "child" ? "child" : kind, height: kind === "child" ? 1.15 : kind === "woman" ? 1.63 : 1.76, tunic, cloak, trousers: C.brown, hair: [C.hair, C.hairDark, 0xa8834a][goths.length % 3], spear: kind === "goth" && pose === "stand", seed: goths.length + 10 });
  if (pose === "kneel") poseKneel(g);
  place(label(g, z < 1 ? "onlookers at the camp edge" : "people at the fires"), x, z, ry); goths.push(g);
}
// a few stakes and a stack of goods along the camp edge
for (let i = 0; i < 6; i++) place(stake(1.4 + (i % 3) * 0.3, i), -3 - i * 1.1, 4 + i * 0.6);
for (let i = 0; i < 3; i++) place(block(0.8, 0.6, 0.6, C.wood, { seed: 70 + i }), 12.5 + i * 0.4, 3.4 + (i % 2) * 0.7, i * 0.4);
// distant hills and trees, faceted and fogged
for (let i = 0; i < 18; i++) {
  const r = rng(200 + i), a = r() * Math.PI * 2, d = 80 + r() * 60;
  const hill = paper(new THREE.ConeGeometry(18 + r() * 20, 8 + r() * 12, 6), C.moss, { crumple: 0.12, seed: i });
  hill.position.set(Math.cos(a) * d, 0, 20 + Math.sin(a) * d * 0.7); if (hill.position.z > -50) scene.add(hill);
}
for (let i = 0; i < 26; i++) {
  const r = rng(300 + i), x = -50 + r() * 100, z = -30 + r() * 75;
  if (trackDist(x, z) < 6 || Math.hypot(x - CAMP.x, z - CAMP.z) < 22) continue;
  const tr = new THREE.Group();
  const trunk = prism(0.15, 0.22, 2, C.woodDark, 5); trunk.position.y = 1; tr.add(trunk);
  for (let k = 0; k < 3; k++) { const c = creases(paper(new THREE.ConeGeometry(1.6 - k * 0.4, 2.2, 6), [0x5f6b43, 0x6c7a4a, 0x7a8452][k], { crumple: 0.12, seed: i * 3 + k })); c.position.y = 2.2 + k * 1.1; tr.add(c); }
  place(label(tr, "tree"), x, z, r() * 3);
}
// smoke: drifting paper discs above each fire
const smoke = [];
const puff = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
for (const f of fires) for (let i = 0; i < 7; i++) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puff, color: 0xd8cfc2, transparent: true, opacity: 0.25, depthWrite: false }));
  m.userData = { base: f.group.position.clone(), k: i / 7 }; scene.add(m); smoke.push(m);
}

// ---------- atmosphere: glows, light through the gate, ground mist, dust ----------
const gradTex = (stops, w = 64, h = 64, linear = false) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  const g = linear ? x.createLinearGradient(0, 0, 0, h) : x.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const glowTex = gradTex([[0, "rgba(255,220,160,1)"], [0.25, "rgba(255,170,90,0.45)"], [1, "rgba(255,140,60,0)"]]);
function glow(pos, size, opacity = 0.8) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity, fog: false }));
  sp.position.copy(pos); sp.scale.setScalar(size); scene.add(sp); return sp;
}
const fireGlows = fires.map(f => glow(f.group.position.clone().add(new THREE.Vector3(0, 0.7, 0)), 3.2, 0.7));
anim.push(tt => fireGlows.forEach((g, i) => { g.material.opacity = 0.6 + 0.15 * Math.sin(tt * 8 + i * 2); }));
for (const sx of [-1, 1]) glow(new THREE.Vector3(GATE.x + sx * 2.6, 1.65, GATE.z + 3.6), 2.4, 0.8);
const gateGlow = glow(new THREE.Vector3(GATE.x, 2.4, GATE.z + 1.2), 7, 0.0);
// shafts of low sun through the open gate, lying along the track toward the camp
const shaftTex = gradTex([[0, "rgba(255,200,130,0.9)"], [1, "rgba(255,200,130,0)"]], 8, 128, true);
const shafts = [];
for (let i = 0; i < 4; i++) {
  const geo = new THREE.CylinderGeometry(1.0 + i * 0.25, 3.5 + i * 1.2, 26, 10, 1, true); geo.translate(0, -13, 0); geo.rotateX(-Math.PI / 2 + 0.06);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: shaftTex, color: 0xffc58a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.set(GATE.x + (i - 1.5) * 0.35, 2.3, GATE.z + 1.5); m.rotation.y = (i - 1.5) * 0.04; scene.add(m); shafts.push(m);
}
// low mist lying in the hollows
const mistTex = gradTex([[0, "rgba(255,240,225,0.9)"], [1, "rgba(255,240,225,0)"]]);
const mist = [];
for (let i = 0; i < 14; i++) {
  const r = rng(500 + i), m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mistTex, color: 0xe6c8ae, transparent: true, opacity: 0.22, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; const sc = 14 + r() * 16; m.scale.set(sc, sc * 0.6, 1);
  m.userData = { x: -20 + r() * 40, z: -32 + r() * 34, y: 0.35 + r() * 0.5, ph: r() * 6 }; scene.add(m); mist.push(m);
}
// dust and pollen catching the light
const dustN = 500, dustPos = new Float32Array(dustN * 3), dustBase = [];
for (let i = 0; i < dustN; i++) { const r = rng(900 + i); dustBase.push([-8 + r() * 18, 0.3 + r() * 3.5, -34 + r() * 38, r() * 6]); }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffd9a0, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(dust);
anim.push(tt => {
  const k = THREE.MathUtils.smoothstep(tt, 8.5, 10.8);
  town.userData.open(k);
  shafts.forEach((m, i) => { m.material.opacity = k * (0.1 - i * 0.015) * (0.9 + 0.1 * Math.sin(tt * 0.7 + i)); });
  gateGlow.material.opacity = 0.15 + k * 0.75;
  mist.forEach(m => { const u = m.userData; m.position.set(u.x + Math.sin(tt * 0.05 + u.ph) * 3 + tt * 0.08, u.y, u.z); });
  for (let i = 0; i < dustN; i++) { const [x, y, z, ph] = dustBase[i]; dustPos.set([x + Math.sin(tt * 0.3 + ph) * 0.6, y + Math.sin(tt * 0.5 + ph * 2) * 0.25, z + Math.cos(tt * 0.25 + ph) * 0.6], i * 3); }
  dustGeo.attributes.position.needsUpdate = true;
});

// ---------- the characters ----------
const fritigern = figure({ kind: "goth", height: 1.86, tunic: 0xcdbb98, cloak: 0xb23a2c, trousers: 0x5e4a38, hair: 0x8a6a3e, beard: 0x7a5530, wound: true, seed: 7 });
const storyHelmet = ridgeHelmet({ berkasovo: true, scale: 1.15 });
storyHelmet.rotation.set(0.2, 0, Math.PI); storyHelmet.position.set(0, -0.36, 0.06);
fritigern.userData.rig.arms[0].elbow.add(storyHelmet);
scene.add(label(fritigern, "fritigern"));
const companion = figure({ kind: "goth", height: 1.8, tunic: C.wool, cloak: C.woad, trousers: C.brown, hair: C.hairDark, beard: C.hairDark, shield: roundShield(), spear: true, seed: 21 });
scene.add(label(companion, "companion"));
const alaric = figure({ kind: "child", height: 1.1, tunic: 0xe9dcc0, cloak: 0x3f5d86, trousers: 0x7a5c44, hair: 0xd0a35a, seed: 33 });
poseSit(alaric, { lean: 0.25 });
// sits on the wagon's rear edge, inside the cover, legs over the tailboard
const awM = new THREE.Matrix4().makeRotationY(ALARIC_WAGON.ry).setPosition(ALARIC_WAGON.x, heightAt(ALARIC_WAGON.x, ALARIC_WAGON.z), ALARIC_WAGON.z);
const seat = new THREE.Vector3(0.15, 1.12, 1.45).applyMatrix4(awM);
alaric.position.copy(seat); alaric.rotation.y = ALARIC_WAGON.ry;
scene.add(label(alaric, "alaric"));

function alaricEye() {
  alaric.updateMatrixWorld(true);
  return alaric.userData.rig.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.02, 0));
}

// ---------- timeline ----------
// 0-5 establishing; 5 Fritigern appears in the gate light; 5-35 the limp home; 35-40 he lifts the helmet to Alaric.
const WALK0 = 11, WALK1 = 34;
function fritAt(t) {
  const u = THREE.MathUtils.clamp((t - WALK0) / (WALK1 - WALK0), 0, 1);
  const e = u < 0.08 ? u * u / 0.16 : u > 0.92 ? 1 - (1 - u) * (1 - u) / 0.16 - 0.04 : u - 0.04;
  return Math.min(1, Math.max(0, e / 0.92));
}
function setTime(t) {
  const u = fritAt(t), p = PATH.getPointAt(u), tan = PATH.getTangentAt(Math.min(0.999, u));
  const walking = t > WALK0 && t < WALK1;
  fritigern.position.set(p.x, heightAt(p.x, p.z), p.z);
  fritigern.visible = t >= WALK0 - 0.5;
  const phase = (u * PATH.getLength()) / 1.25;
  if (walking) {
    fritigern.rotation.y = Math.atan2(tan.x, tan.z);
    poseWalk(fritigern, phase % 1, { limp: 0.7, stride: 0.35, clutch: true });
  } else if (t >= WALK1) {
    const toW = alaric.position.clone().sub(fritigern.position);
    fritigern.rotation.y = Math.atan2(toW.x, toW.z);
    poseWalk(fritigern, 0, { limp: 0.7, stride: 0, clutch: true });
    const k = THREE.MathUtils.smoothstep(t, WALK1 + 0.5, WALK1 + 3);
    const arm = fritigern.userData.rig.arms[0];
    arm.sh.rotation.set(-0.3 - k * 1.6, 0, -0.1); arm.elbow.rotation.x = -0.3 - k * 0.4;
    fritigern.userData.rig.chest.rotation.x = 0.25 - k * 0.15;
  }
  // companion: half a step behind, on Fritigern's right, supporting him
  const uc = Math.max(0, u - 0.025), pc = PATH.getPointAt(uc), side = new THREE.Vector3(tan.z, 0, -tan.x).multiplyScalar(-0.75);
  companion.position.set(pc.x + side.x, heightAt(pc.x + side.x, pc.z + side.z), pc.z + side.z);
  companion.rotation.y = fritigern.rotation.y; companion.visible = fritigern.visible;
  poseWalk(companion, walking ? (phase + 0.1) % 1 : 0, { stride: walking ? 0.35 : 0 });
  if (walking) { const a = companion.userData.rig.arms[0]; a.sh.rotation.set(-0.4, 0, -1.0); }
  // Alaric leans out as his father gets close, and his head follows him
  const rig = alaric.userData.rig, eye = alaricEye(), d = eye.distanceTo(fritigern.position);
  const lean = THREE.MathUtils.clamp((40 - d) / 30, 0, 1);
  rig.chest.rotation.x = 0.25 + lean * 0.35;
  const local = alaric.worldToLocal(fritigern.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
  rig.neck.rotation.y = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -0.9, 0.9);
  if (t > WALK1 + 1) { const k = THREE.MathUtils.smoothstep(t, WALK1 + 1, WALK1 + 3); for (const a of rig.arms) { a.sh.rotation.x = -0.9 - k * 0.9; a.elbow.rotation.x = -0.6 + k * 0.3; } }
  for (const f of anim) f(t);
  for (const m of smoke) {
    const k = (m.userData.k + t * 0.05) % 1;
    m.position.set(m.userData.base.x + k * 3 + Math.sin(t + m.userData.k * 9) * 0.3, m.userData.base.y + 1 + k * 9, m.userData.base.z + k * 1.5);
    m.scale.setScalar(0.8 + k * 3.2); m.material.opacity = 0.32 * (1 - k) * Math.min(1, k * 6); m.quaternion.copy(camera.quaternion);
  }
  scene.updateMatrixWorld(true);
}

// ---------- sightline test: can Alaric see his father? ----------
const occluders = [];
scene.traverse(o => { if (o.isMesh && o.userData.occluder && !["fritigern", "alaric"].includes(o.userData.occluder)) occluders.push(o); });
const ray = new THREE.Raycaster();
function sightAt(t) {
  setTime(t);
  const eye = alaricEye(), pts = [1.68, 1.35, 0.95].map(h => fritigern.position.clone().add(new THREE.Vector3(0, h * 1.84 / 1.78, 0)));
  let seen = 0; const blockers = new Set();
  for (const p of pts) {
    const dir = p.clone().sub(eye), dist = dir.length(); ray.set(eye, dir.normalize()); ray.far = dist - 0.25;
    const hit = ray.intersectObjects(occluders, false)[0];
    if (!hit) seen++; else blockers.add(hit.object.userData.occluder);
  }
  const d = eye.distanceTo(pts[0]);
  return { t, vis: seen / pts.length, blockers: [...blockers], dist: d, angDeg: THREE.MathUtils.radToDeg(2 * Math.atan(0.92 / d)) };
}
function analyse() {
  const rows = [];
  for (let t = WALK0; t <= DUR; t += 0.25) rows.push(sightAt(+t.toFixed(2)));
  const gate = (() => { setTime(0); const eye = alaricEye(), p = GATE.clone().add(new THREE.Vector3(0, 2, 3));
    const dir = p.clone().sub(eye); ray.set(eye, dir.clone().normalize()); ray.far = dir.length() - 1; const h = ray.intersectObjects(occluders, false)[0];
    return { visible: !h, blocker: h?.object.userData.occluder || null, dist: dir.length() }; })();
  const visible = rows.filter(r => r.vis > 0.5);
  const blocked = {}; for (const r of rows) if (r.vis <= 0.5) for (const b of r.blockers) blocked[b] = (blocked[b] || 0) + 0.25;
  const firstSeen = visible[0]?.t ?? null, firstFace = rows.find(r => r.vis > 0.5 && r.dist < 25)?.t ?? null;
  return { layout: LAYOUT, rows, gate, firstSeen, firstFace, visibleFrac: visible.length / rows.length, blockedSeconds: blocked };
}
const report = analyse();
window.__sightline = report;

// ---------- cameras ----------
let shot = Q.get("shot") || "director";
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(3, 1, -10); controls.enableDamping = true; controls.enabled = false;
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
// The cut: [shot, start, end]. Each shot gets its local progress u (0..1) so the camera can move inside it.
const CUT = [["establish", 0, 5.5], ["face", 5.5, 11], ["push", 11, 16.5], ["face", 16.5, 19.5], ["track", 19.5, 25.5],
  ["over", 25.5, 31], ["two", 31, 37], ["helmet", 37, DUR + 1]];
let shotU = 0;
function directorShot(t) {
  const c = CUT.find(([, a, b]) => t >= a && t < b) || CUT[CUT.length - 1];
  shotU = THREE.MathUtils.clamp((t - c[1]) / (c[2] - c[1]), 0, 1);
  return c[0];
}
function frame(t) {
  if (shot !== "director") shotU = 0.5;
  const s = shot === "director" ? directorShot(t) : shot;
  controls.enabled = s === "orbit";
  alaric.visible = s !== "alaric" && s !== "push";
  const u = shotU, ease = u * u * (3 - 2 * u);
  const F = new THREE.Vector3(Math.sin(ALARIC_WAGON.ry), 0, Math.cos(ALARIC_WAGON.ry)), Rv = new THREE.Vector3(Math.cos(ALARIC_WAGON.ry), 0, -Math.sin(ALARIC_WAGON.ry)), UP = new THREE.Vector3(0, 1, 0);
  scene.fog.far = s === "plan" ? 2000 : 120; scene.fog.near = s === "plan" ? 1000 : 22;
  if (s === "orbit") return s;
  const eye = alaricEye(), fr = fritigern.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  const awPos = aw.position;
  if (s === "establish") {
    // crane down over the camp to the boy in the wagon, the town waiting beyond
    const from = seat.clone().addScaledVector(F, -17).addScaledVector(Rv, 7).addScaledVector(UP, 11);
    const to = seat.clone().addScaledVector(F, -4.2).addScaledVector(Rv, 2.2).addScaledVector(UP, 1.3);
    camera.fov = 40; camera.position.lerpVectors(from, to, ease);
    camera.lookAt(seat.clone().lerp(GATE.clone().setY(3), 0.35 + 0.4 * ease));
  } else if (s === "face") {
    // in front of the boy, low sun on his face
    camera.fov = 30 - 3 * ease; camera.position.copy(eye).addScaledVector(F, 1.75 - 0.35 * ease).addScaledVector(Rv, 0.45).addScaledVector(UP, -0.12);
    camera.lookAt(eye.clone().addScaledVector(UP, -0.08));
  } else if (s === "push") {
    // his eyes: a slow telephoto push into the gate as the red cloak comes out
    camera.fov = 42 - 28 * ease; camera.position.copy(eye);
    camera.lookAt(fritigern.visible ? fr.clone().lerp(GATE.clone().setY(2.2), 0.3 * (1 - ease)) : GATE.clone().setY(2.6));
  } else if (s === "track") {
    const tan = PATH.getTangentAt(Math.min(0.999, fritAt(t))), side = new THREE.Vector3(tan.z, 0, -tan.x);
    camera.fov = 38; camera.position.copy(fr).addScaledVector(side, 3.4).addScaledVector(tan, 0.6 - 1.4 * ease).addScaledVector(UP, -0.3);
    camera.lookAt(fr.clone().addScaledVector(tan, 0.8).addScaledVector(UP, -0.1));
  } else if (s === "two") {
    // profile two-shot: father and son, the wagon between them and the fire
    const mid = fr.clone().lerp(eye, 0.5), across = eye.clone().sub(fr).setY(0).normalize(), perp = new THREE.Vector3(across.z, 0, -across.x);
    if (perp.x < 0) perp.negate();
    camera.fov = 34; camera.position.copy(mid).addScaledVector(perp, 4.6 - 0.6 * ease).addScaledVector(UP, -0.15);
    camera.lookAt(mid);
  } else if (s === "wide") {
    camera.fov = 42; camera.position.set(13, 6.5, 11); camera.lookAt(1, 0.5, -26);
  } else if (s === "alaric") {
    // true POV from the child's eyes, a little wide, framed by the wagon hoop
    camera.fov = 50; camera.position.copy(eye).add(new THREE.Vector3(0, 0, 0));
    const look = fritigern.visible ? fr : GATE.clone().add(new THREE.Vector3(0, 3, 0));
    camera.lookAt(look);
  } else if (s === "over") {
    const back = new THREE.Vector3(0.42, 0.22, -1.05).applyAxisAngle(new THREE.Vector3(0, 1, 0), ALARIC_WAGON.ry);
    camera.fov = 38; camera.position.copy(eye).add(back);
    camera.lookAt(fritigern.visible ? fr.clone().lerp(eye, 0.15) : GATE);
  } else if (s === "reverse") {
    // from Fritigern's side, low, looking up at the boy in the wagon
    const toward = eye.clone().sub(fr).setY(0).normalize();
    const pos = fritigern.visible && fr.distanceTo(eye) < 30 ? fr.clone().add(toward.clone().multiplyScalar(-2.6)).add(new THREE.Vector3(toward.z, 0, -toward.x).multiplyScalar(-1.1)).add(new THREE.Vector3(0, 0.35, 0)) : eye.clone().add(new THREE.Vector3(-2, -0.4, -6).applyAxisAngle(new THREE.Vector3(0, 1, 0), ALARIC_WAGON.ry - Math.PI));
    camera.fov = 34; camera.position.copy(pos); camera.lookAt(eye);
  } else if (s === "plan") {
    camera.fov = 45; camera.position.set(4, 105, -21); camera.up.set(0, 0, -1); camera.lookAt(4, 0, -21); camera.up.set(0, 1, 0);
  } else if (s === "helmet") {
    // close two-shot on the hand-over: the helmet between father and son, firelight under it
    const h = storyHelmet.getWorldPosition(new THREE.Vector3()), across = eye.clone().sub(fr).setY(0).normalize(), perp = new THREE.Vector3(across.z, 0, -across.x);
    if (perp.x < 0) perp.negate();
    const k = 1 - 0.3 * ease, target = h.clone().lerp(eye, 0.35);
    camera.fov = 32; camera.position.copy(target).addScaledVector(perp, 2.6 * k).addScaledVector(across, -0.4).addScaledVector(UP, -0.25); camera.lookAt(target);
  } else if (s === "follow") {
    const tan = PATH.getTangentAt(Math.min(0.999, fritAt(t)));
    camera.fov = 45; camera.position.copy(fr).add(new THREE.Vector3(-tan.x * 4.5 + tan.z * 2.2, 0.7, -tan.z * 4.5 - tan.x * 2.2)); camera.lookAt(fr.clone().add(tan.multiplyScalar(6)));
  }
  camera.updateProjectionMatrix();
  return s;
}

// ---------- debug rays: the sightline drawn in the world ----------
const rayLines = new THREE.Group(); scene.add(rayLines); rayLines.visible = Q.get("rays") === "1";
const rayMat = [new THREE.LineBasicMaterial({ color: 0x3fbf6a }), new THREE.LineBasicMaterial({ color: 0xd2453a })];
const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const rayLine = new THREE.Line(rayGeo, rayMat[0]); rayLines.add(rayLine);
rayLines.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(PATH.getSpacedPoints(80).map(p => p.clone().setY(heightAt(p.x, p.z) + 0.15))), new THREE.LineDashedMaterial({ color: 0xfff1c8 })));
// every sampled sightline, coloured by whether it was clear
{ const ok = [], bad = []; const eye0 = alaricEye();
  for (const r of report.rows.filter((_, i) => i % 6 === 0)) { const p = PATH.getPointAt(fritAt(r.t)); const end = new THREE.Vector3(p.x, heightAt(p.x, p.z) + 1.5, p.z); (r.vis > 0.5 ? ok : bad).push(eye0, end); }
  if (ok.length) rayLines.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ok), new THREE.LineBasicMaterial({ color: 0x5fd07f, transparent: true, opacity: 0.6 })));
  if (bad.length) rayLines.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(bad), new THREE.LineBasicMaterial({ color: 0xe0503e, transparent: true, opacity: 0.8 }))); }

// ---------- UI and loop ----------
const overlay = initOverlay(document.getElementById("overlay"), Q.get("style") || ((Q.get("shot") || "director") === "director" ? "cinema" : "clean"));
document.querySelectorAll("[data-style]").forEach(b => {
  b.setAttribute("aria-pressed", b.dataset.style === overlay.style);
  b.addEventListener("click", () => { overlay.set(b.dataset.style); document.querySelectorAll("[data-style]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
});
const ui = Q.get("ui") !== "0";
document.body.classList.toggle("noui", !ui);
let t = Q.has("t") ? +Q.get("t") : 0, playing = Q.get("play") !== "0" && !Q.has("t"), last = performance.now();
const scrub = document.getElementById("scrub"), readout = document.getElementById("readout"), shotLabel = document.getElementById("shot-label");
scrub.max = DUR; scrub.step = 0.05;
scrub.addEventListener("input", () => { t = +scrub.value; playing = false; syncPlay(); });
const playBtn = document.getElementById("play");
function syncPlay() { playBtn.textContent = playing ? "❚❚" : "▶"; }
playBtn.addEventListener("click", () => { if (t >= DUR) t = 0; playing = !playing; syncPlay(); });
document.querySelectorAll("[data-shot]").forEach(b => b.addEventListener("click", () => {
  shot = b.dataset.shot; document.querySelectorAll("[data-shot]").forEach(x => x.setAttribute("aria-pressed", x === b));
  if (shot === "orbit") { controls.target.copy(fritigern.position); }
}));
document.querySelector(`[data-shot="${shot}"]`)?.setAttribute("aria-pressed", "true");
document.getElementById("rays").addEventListener("click", e => { rayLines.visible = !rayLines.visible; e.currentTarget.setAttribute("aria-pressed", rayLines.visible); });
syncPlay();

// sightline strip: one bar per quarter second, green = Alaric can see him, red = blocked
const strip = document.getElementById("strip"), sx = strip.getContext("2d");
function drawStrip(now) {
  const W = strip.width = strip.clientWidth * devicePixelRatio, H = strip.height = strip.clientHeight * devicePixelRatio;
  sx.clearRect(0, 0, W, H);
  for (const r of report.rows) {
    const x = (r.t / DUR) * W, w = Math.ceil((0.25 / DUR) * W) + 1;
    sx.fillStyle = r.vis > 0.5 ? (r.dist < 25 ? "#3f9a5a" : "#8fc39a") : r.vis > 0 ? "#e2a64a" : "#cf4a3a"; sx.fillRect(x, H * 0.25, w, H * 0.5);
  }
  sx.fillStyle = "#fff"; sx.fillRect((now / DUR) * W - 1, 0, 2 * devicePixelRatio, H);
}
const resize = () => {
  const el = document.getElementById("stage"); renderer.setSize(el.clientWidth, el.clientHeight, false);
  renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%";
  camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
};
addEventListener("resize", resize); resize();

function tick(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  if (playing) { t += dt; if (t > DUR) { t = DUR; playing = false; syncPlay(); } }
  draw();
  if (!MANUAL) requestAnimationFrame(tick);
}
function draw() {
  setTime(t);
  const s = frame(t);
  if (controls.enabled) controls.update();
  const r = sightAt(t); setTime(t);
  const eye = alaricEye();
  rayGeo.setFromPoints([eye, fritigern.position.clone().add(new THREE.Vector3(0, 1.4, 0))]);
  rayLine.material = rayMat[r.vis > 0.5 ? 0 : 1];
  scrub.value = t; shotLabel.textContent = s;
  readout.innerHTML = !fritigern.visible ? `Alaric watches the gate <b>${report.gate.visible ? "(he can see it)" : "(blocked by " + report.gate.blocker + ")"}</b>`
    : `${r.vis > 0.5 ? "Alaric <b>can</b> see his father" : `Alaric <b>can't</b> see him: ${r.blockers.join(", ")}`} · ${r.dist.toFixed(0)} m · ${r.dist < 25 ? "face readable" : r.dist < 60 ? "walk readable" : "a figure"}`;
  drawStrip(t);
  renderer.render(scene, camera);
  const proj = v => v.clone().project(camera);
  const look = alaric.userData.rig.neck.getWorldDirection(new THREE.Vector3());
  overlay.update(t, {
    fHead: proj(fritigern.userData.rig.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0))), fVisible: fritigern.visible && s !== "helmet",
    aHead: proj(alaric.userData.rig.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0))), aVisible: alaric.visible && s !== "helmet",
    aPos: alaric.position, fPos: fritigern.position, gate: GATE, gateOpen: THREE.MathUtils.smoothstep(t, 8.5, 10.8),
    path: PATH.getSpacedPoints(30).map(p => [p.x, p.z]), sees: r.vis > 0.5 || !fritigern.visible, look: Math.atan2(look.z, look.x),
  });
  window.__frameT = t;
}
const MANUAL = Q.get("manual") === "1";
requestAnimationFrame(tick);
// manual=1 is for frame capture: nothing renders until renderAt(t) is called
helmetsReady.then(() => { window.__scene.ready = true; });
window.__scene = { setT(v) { t = v; playing = false; }, renderAt(v) { t = v; playing = false; draw(); }, setShot(v) { shot = v; }, report, ready: false };
