// Story props for the Fritigern sequence, built only from the grammar in paper.js.
// Era reference: docs/fritigern/EQUIPMENT.md (late Roman and Tervingi Gothic, 376 to 378 AD).
import * as THREE from "three";
import { paper, plate, strip, pleats, prism, block, creases, rng } from "./paper.js";

export const C = {
  card: 0xeee6d4, iron: 0x9aa0a4, gilt: 0xd8b25a, gem: 0x3f7f8a, wood: 0x8a6440, woodDark: 0x5e4430,
  hide: 0xb59a74, wool: 0xd8cdb4, madder: 0xa4473a, woad: 0x4a6383, brown: 0x6e5440, moss: 0x6f7550,
  skin: 0xe2b896, hair: 0x7a5a36, hairDark: 0x3e2d22, stone: 0xc9c0ad, stoneDark: 0xa39a87, mud: 0x7d6b52,
  grass: 0x8d915f, romanTunic: 0xe9e2cf, romanCloak: 0x8f3a2e, blood: 0x7a1f1a, ox: 0xcab79a,
};

// Late Roman ridge helmet. Two faceted bowl halves, a hemmed ridge strip, cheek and neck plates.
// `berkasovo` adds the officer's brow band, nasal and gem dots; the one that becomes the story object.
export function ridgeHelmet({ berkasovo = false, scale = 1, color = C.iron } = {}) {
  const g = new THREE.Group();
  const shell = berkasovo ? C.gilt : color;
  for (const s of [-1, 1]) {
    const half = paper(new THREE.SphereGeometry(0.13, 7, 5, s > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI * 0.55), shell, { crumple: 0.08, seed: s + 3 });
    half.scale.set(1, 1.08, 1.12);
    g.add(creases(half));
  }
  const ridge = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 0.95 - 0.1;
    ridge.push(new THREE.Vector3(0, Math.cos(a) * 0.145 * 1.08, Math.sin(a) * 0.145 * 1.12));
  }
  g.add(strip(ridge, 0.03, berkasovo ? C.gilt : 0x7d8387, { up: new THREE.Vector3(1, 0, 0), thick: 0.012 }));
  // small metal fin along the ridge (allowed; it's not a crest)
  const fin = plate(0.012, 0.16, 0x7d8387, 0); fin.rotation.set(Math.PI / 2, 0, Math.PI / 2); fin.position.set(0, 0.16, -0.01);
  if (!berkasovo) g.add(fin);
  for (const s of [-1, 1]) {
    const cheek = creases(plate(0.075, 0.12, shell, 0.2));
    cheek.position.set(s * 0.125, -0.07, 0.03); cheek.rotation.set(0.1, s * Math.PI / 2, s * 0.12);
    g.add(cheek);
  }
  const neck = creases(plate(0.2, 0.06, shell, 0.12)); neck.position.set(0, -0.03, -0.14); neck.rotation.x = 0.5; g.add(neck);
  if (berkasovo) {
    const brow = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; brow.push(new THREE.Vector3(Math.cos(a) * 0.142, 0.005, Math.sin(a) * 0.155)); }
    g.add(strip(brow, 0.03, C.gilt, { up: new THREE.Vector3(0, 0, 1), thick: 0.01 }));
    const nasal = plate(0.025, 0.07, C.gilt, 0.3); nasal.position.set(0, -0.03, 0.16); g.add(nasal);
    for (let i = 0; i < 5; i++) {
      const gem = paper(new THREE.OctahedronGeometry(0.011, 0), C.gem, { crumple: 0, roughness: 0.4 });
      const a = 0.4 + i * 0.58; gem.position.set(Math.cos(a) * 0.146, 0.01, Math.sin(a) * 0.16); g.add(gem);
    }
  }
  g.scale.setScalar(scale);
  g.userData.role = "story-helmet";
  return g;
}

// Late Roman oval shield with a cut-paper unit design and a cone boss.
const shieldTex = new Map();
function shieldDesign(base, ring) {
  const k = base + "-" + ring;
  if (shieldTex.has(k)) return shieldTex.get(k);
  const c = document.createElement("canvas"); c.width = 128; c.height = 160;
  const x = c.getContext("2d");
  x.fillStyle = "#" + base.toString(16).padStart(6, "0"); x.fillRect(0, 0, 128, 160);
  x.strokeStyle = "#" + ring.toString(16).padStart(6, "0"); x.lineWidth = 9;
  x.beginPath(); x.ellipse(64, 80, 54, 70, 0, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 6; x.beginPath(); x.ellipse(64, 80, 26, 34, 0, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 4; i++) { x.beginPath(); const a = i * Math.PI / 2 + Math.PI / 4; x.moveTo(64 + Math.cos(a) * 28, 80 + Math.sin(a) * 36); x.lineTo(64 + Math.cos(a) * 50, 80 + Math.sin(a) * 64); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  shieldTex.set(k, t); return t;
}
export function ovalShield(base = 0xb8463a, ring = 0xeee0bf) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.03, 12, 1);
  const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: shieldDesign(base, ring), roughness: 0.9, flatShading: true }));
  face.rotation.x = Math.PI / 2; face.scale.set(0.78, 1, 1); face.castShadow = true;
  g.add(face);
  const boss = paper(new THREE.ConeGeometry(0.08, 0.07, 7), C.iron, { crumple: 0 }); boss.rotation.x = Math.PI / 2; boss.position.z = 0.045; g.add(boss);
  return g;
}
export function roundShield(color = C.woodDark) {
  const g = new THREE.Group();
  g.add(paper(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 9).rotateX(Math.PI / 2), color, { crumple: 0.05 }));
  const boss = paper(new THREE.ConeGeometry(0.06, 0.06, 6), C.iron, { crumple: 0 }); boss.rotation.x = Math.PI / 2; boss.position.z = 0.04; g.add(boss);
  return g;
}

// A papercraft person. Joints are groups so the scene can animate them.
// kind: "goth" | "roman" | "child" | "woman"
export function figure({ kind = "goth", height = 1.78, tunic = C.wool, cloak = C.brown, trousers = C.brown, hair = C.hair,
  helmet = null, shield = null, spear = false, wound = false, seed = 1 } = {}) {
  const s = height / 1.78, child = kind === "child", r = rng(seed);
  const root = new THREE.Group(), hips = new THREE.Group(); root.add(hips);
  const legLen = 0.86 * s, torso = 0.6 * s;
  hips.position.y = legLen;
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.x = side * 0.1 * s; hips.add(hip);
    const thigh = prism(0.07 * s, 0.055 * s, legLen * 0.5, trousers, 5, { seed: seed + side }); thigh.position.y = -legLen * 0.25; hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -legLen * 0.5; hip.add(knee);
    const shin = prism(0.055 * s, 0.045 * s, legLen * 0.46, trousers, 5); shin.position.y = -legLen * 0.23; knee.add(shin);
    const boot = block(0.1 * s, 0.07 * s, 0.2 * s, C.woodDark); boot.position.set(0, -legLen * 0.47, 0.04 * s); knee.add(boot);
    legs.push({ hip, knee });
  }
  const chest = new THREE.Group(); hips.add(chest);
  const body = creases(paper(new THREE.CylinderGeometry(0.17 * s, 0.15 * s, torso, 6, 2), tunic, { crumple: 0.06, seed }), 35, 0x2a2420, 0.2);
  body.position.y = torso / 2; chest.add(body);
  const skirt = pleats(0.42 * s, (kind === "woman" ? 0.75 : 0.32) * s, tunic, 10, 0.03 * s, 0.25);
  const skirtB = skirt.clone(); skirt.position.set(0, 0.04 * s, 0.13 * s); skirtB.position.set(0, 0.04 * s, -0.13 * s);
  const skirtL = skirt.clone(); skirtL.rotation.y = Math.PI / 2; skirtL.position.set(0.15 * s, 0.04 * s, 0); skirtL.scale.x = 0.62;
  const skirtR = skirtL.clone(); skirtR.position.x = -0.15 * s;
  chest.add(skirt, skirtB, skirtL, skirtR);
  const belt = prism(0.165 * s, 0.165 * s, 0.05 * s, kind === "roman" ? C.gilt : C.woodDark, 6); belt.position.y = 0.06 * s; chest.add(belt);
  if (kind === "roman") {
    // mail shirt over the tunic: a shingled grey band
    const mail = paper(new THREE.CylinderGeometry(0.18 * s, 0.17 * s, torso * 0.75, 7, 3), 0x8a8f92, { crumple: 0.12, seed: seed + 3 });
    mail.position.y = torso * 0.55; chest.add(mail);
  }
  // cloak: a pleated sheet hung from the shoulders
  const cl = pleats(0.5 * s, (child ? 0.6 : 1.05) * s, cloak, 9, 0.04 * s, 0.35);
  cl.position.set(0, torso + 0.02, -0.16 * s); cl.rotation.x = 0.08; chest.add(cl);
  const brooch = paper(new THREE.OctahedronGeometry(0.025 * s, 0), kind === "roman" ? C.gilt : 0xb7b0a0, { crumple: 0 });
  brooch.position.set(0.12 * s, torso - 0.02, 0.12 * s); chest.add(brooch);
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.22 * s, torso - 0.06 * s, 0); chest.add(sh);
    const upper = prism(0.055 * s, 0.045 * s, 0.3 * s, tunic, 5); upper.position.y = -0.15 * s; sh.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -0.3 * s; sh.add(elbow);
    const fore = prism(0.045 * s, 0.04 * s, 0.27 * s, tunic, 5); fore.position.y = -0.13 * s; elbow.add(fore);
    const hand = paper(new THREE.IcosahedronGeometry(0.045 * s, 0), C.skin, { crumple: 0 }); hand.position.y = -0.29 * s; elbow.add(hand);
    arms.push({ sh, elbow, hand });
  }
  const neck = new THREE.Group(); neck.position.y = torso; chest.add(neck);
  const headSize = (child ? 0.13 : 0.115) * s * (child ? 1.25 : 1);
  const head = creases(paper(new THREE.IcosahedronGeometry(headSize, 1), C.skin, { crumple: 0.1, seed: seed + 9 }), 30, 0x3a2a20, 0.25);
  head.scale.set(0.92, 1.1, 1); head.position.y = headSize * 1.25; neck.add(head);
  const hairCap = paper(new THREE.SphereGeometry(headSize * 1.06, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, { crumple: 0.15, seed: seed + 5 });
  hairCap.position.copy(head.position); hairCap.position.y += headSize * 0.08; hairCap.rotation.x = -0.35; neck.add(hairCap);
  if (kind !== "roman") {
    const long = pleats(headSize * 1.7, headSize * (kind === "woman" ? 2.6 : 1.6), hair, 6, 0.02, 0.2);
    long.position.set(0, head.position.y + headSize * 0.4, -headSize * 0.75); neck.add(long);
  }
  if (helmet) { helmet.position.set(0, head.position.y + headSize * 0.25, 0); helmet.scale.multiplyScalar(s * headSize / 0.13); neck.add(helmet); hairCap.visible = false; }
  if (shield) { shield.position.set(-0.08 * s, -0.05 * s, 0.12 * s); shield.rotation.y = 0.2; arms[0].elbow.add(shield); }
  if (spear) {
    const sp = prism(0.015, 0.015, 2.4 * s, C.wood, 4); const tip = paper(new THREE.ConeGeometry(0.03, 0.2, 4), C.iron, { crumple: 0 });
    tip.position.y = 1.25 * s; sp.add(tip); sp.position.set(0, 0.35 * s, 0.05); arms[1].hand.add(sp);
  }
  if (wound) {
    const stain = plate(0.12 * s, 0.16 * s, C.blood, 0.1); stain.position.set(-0.08 * s, torso * 0.35, 0.16 * s); chest.add(stain);
  }
  root.userData.rig = { hips, chest, legs, arms, neck, head, s, legLen };
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// Pose helpers: walk cycle phase in [0,1), limp > 0 shortens the right stride and drops the hip.
export function poseWalk(fig, phase, { limp = 0, stride = 0.45, clutch = false } = {}) {
  const { hips, chest, legs, arms, legLen } = fig.userData.rig;
  const a = phase * Math.PI * 2;
  const sw = Math.sin(a) * stride;
  legs[0].hip.rotation.x = sw; legs[1].hip.rotation.x = -sw * (1 - limp * 0.6);
  legs[0].knee.rotation.x = Math.max(0, -Math.sin(a + 0.6)) * 0.7;
  legs[1].knee.rotation.x = Math.max(0, Math.sin(a + 0.6)) * 0.7 * (1 - limp * 0.5);
  hips.position.y = legLen + Math.abs(Math.cos(a)) * 0.03 - (limp ? Math.max(0, Math.sin(a)) * 0.05 * limp : 0);
  chest.rotation.z = limp * 0.12 * Math.sin(a); chest.rotation.x = 0.05 + limp * 0.18;
  arms[0].sh.rotation.x = -sw * 0.7;
  if (clutch) { arms[1].sh.rotation.set(-0.5, 0, 0.35); arms[1].elbow.rotation.x = -1.6; }
  else arms[1].sh.rotation.x = sw * 0.7;
}
export function poseSit(fig, { lean = 0.15, look = 0 } = {}) {
  const { hips, chest, legs, arms, neck, legLen, s } = fig.userData.rig;
  hips.position.y = 0.12 * s;
  for (const l of legs) { l.hip.rotation.x = -1.45; l.knee.rotation.x = 1.3; }
  chest.rotation.x = lean;
  for (const a of arms) { a.sh.rotation.x = -0.9; a.elbow.rotation.x = -0.6; }
  neck.rotation.y = look;
}
export function poseKneel(fig) {
  const { hips, legs, chest, arms, legLen } = fig.userData.rig;
  hips.position.y = legLen * 0.55;
  legs[0].hip.rotation.x = -1.4; legs[0].knee.rotation.x = 1.5;
  legs[1].hip.rotation.x = 0.1; legs[1].knee.rotation.x = 1.55;
  chest.rotation.x = 0.35; arms[0].sh.rotation.x = -0.9; arms[1].sh.rotation.x = -0.9;
}

function wheel(radius, color) {
  const g = new THREE.Group();
  const rimPts = []; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; rimPts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)); }
  g.add(strip(rimPts, 0.08, color, { up: new THREE.Vector3(0, 0, 1), thick: 0.07 }));
  for (let i = 0; i < 8; i++) { const sp = block(0.035, radius * 1.9, 0.035, color); sp.rotation.z = (i / 8) * Math.PI; g.add(sp); }
  const hub = prism(0.09, 0.09, 0.16, C.woodDark, 7); hub.rotation.x = Math.PI / 2; g.add(hub);
  return g;
}

// Four-wheeled ox wagon with a hide cover on hoops. Rear opening faces +z local... the front pole points -z.
export function wagon({ cover = C.hide, seed = 1, covered = true } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  const L = 3.4, W = 1.5, bedY = 1.0;
  const bed = block(W, 0.12, L, C.wood, { seed }); bed.position.y = bedY; g.add(bed);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) { const pl = creases(block(0.05, 0.12, L, i % 2 ? C.wood : C.woodDark, { seed: seed + i })); pl.position.set(sx * W / 2, bedY + 0.12 + i * 0.13, 0); g.add(pl); }
  }
  const front = block(W, 0.4, 0.05, C.woodDark); front.position.set(0, bedY + 0.25, -L / 2); g.add(front);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = wheel(0.55, C.woodDark); w.position.set(x * (W / 2 + 0.12), 0.55, z * L * 0.32); w.rotation.y = Math.PI / 2; w.rotation.x = r() * 3; g.add(w);
  }
  const pole = prism(0.05, 0.05, 2.6, C.wood, 5); pole.rotation.x = Math.PI / 2; pole.position.set(0, 0.7, -L / 2 - 1.2); g.add(pole);
  if (covered) {
    const hoops = 4;
    for (let i = 0; i < hoops; i++) {
      const pts = []; for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * W * 0.55, bedY + 0.45 + Math.sin(a) * 1.05, -L / 2 + 0.2 + (i / (hoops - 1)) * (L - 0.5))); }
      g.add(strip(pts, 0.05, C.woodDark, { up: new THREE.Vector3(0, 0, 1), thick: 0.04 }));
    }
    // pleated cover over the hoops: a half-cylinder with ridge folds along the length
    const cov = new THREE.CylinderGeometry(0.86, 0.86, L - 0.4, 10, 3, true, Math.PI / 2, Math.PI);
    cov.rotateX(Math.PI / 2); cov.scale(1, 1.1 / 0.86, 1);
    const cm = creases(paper(cov, cover, { crumple: 0.12, seed: seed + 11 }), 20, 0x3a2a20, 0.25);
    cm.position.set(0, bedY + 0.45, 0.05); g.add(cm);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.occluder = "wagon"; } });
  return g;
}

export function ox({ color = C.ox, seed = 1 } = {}) {
  const g = new THREE.Group();
  const body = creases(paper(new THREE.BoxGeometry(0.75, 0.75, 1.7, 2, 2, 3), color, { crumple: 0.14, seed }), 30, 0x3a2a20, 0.25);
  body.position.y = 1.0; g.add(body);
  const head = paper(new THREE.BoxGeometry(0.35, 0.4, 0.55, 1, 1, 2), color, { crumple: 0.12, seed: seed + 1 }); head.position.set(0, 1.05, 1.05); head.rotation.x = 0.5; g.add(head);
  for (const s of [-1, 1]) { const horn = paper(new THREE.ConeGeometry(0.04, 0.32, 4), C.card, { crumple: 0 }); horn.position.set(s * 0.22, 1.3, 1.0); horn.rotation.z = -s * 1.1; g.add(horn); }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = prism(0.07, 0.06, 0.7, color, 5); l.position.set(x * 0.25, 0.35, z * 0.6); g.add(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function tent({ color = C.wool, seed = 1 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(1.4, 2.0, 7, 2, true);
  const t = creases(paper(geo, color, { crumple: 0.14, seed }), 25, 0x3a2a20, 0.3); t.position.y = 1.0; g.add(t);
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.occluder = "tent"; } });
  return g;
}

// Campfire: folded flame cards + a flickering point light. Returns {group, update(t)}.
export function campfire(seed = 1) {
  const g = new THREE.Group(), r = rng(seed);
  for (let i = 0; i < 6; i++) { const log = prism(0.05, 0.05, 0.7, C.woodDark, 5); log.rotation.set(Math.PI / 2 - 0.3, (i / 6) * Math.PI * 2, 0); log.position.y = 0.12; g.add(log); }
  for (let i = 0; i < 8; i++) { const st = block(0.18, 0.12, 0.16, C.stoneDark); const a = (i / 8) * Math.PI * 2; st.position.set(Math.cos(a) * 0.5, 0.05, Math.sin(a) * 0.5); g.add(st); }
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = plate(0.25 - i * 0.03, 0.55 - i * 0.08, [0xf3a64a, 0xf6c560, 0xe8743a, 0xfbe08a][i], 0.3, { emissive: [0xf08a2a, 0xf6b040, 0xd85a20, 0xfbd060][i], emissiveIntensity: 1.4 });
    f.castShadow = false; f.rotation.y = (i / 4) * Math.PI; f.position.y = 0.32; g.add(f); flames.push(f);
  }
  const light = new THREE.PointLight(0xffa252, 6, 14, 1.6); light.position.y = 0.9; g.add(light);
  const ph = r() * 10;
  return { group: g, light, update(t) {
    const k = 0.8 + 0.2 * Math.sin(t * 9 + ph) * Math.sin(t * 5.3 + ph * 2);
    light.intensity = 6 * k; flames.forEach((f, i) => { f.scale.y = 0.85 + 0.25 * Math.sin(t * (7 + i) + ph + i); });
  } };
}

// Late Roman town wall with two projecting towers and an arched gate. Gate opening centred at x=0, facing +z.
export function gatehouse({ length = 70 } = {}) {
  const g = new THREE.Group();
  const H = 8, T = 3, gateW = 3.6, gateH = 5.2, towerW = 6.5;
  // wall runs along x, made of courses so the stone reads as stacked card
  const segs = [[-length / 2, -towerW / 2 - 2.0], [towerW / 2 + 2.0, length / 2]];
  for (const [a, b] of segs) {
    const w = block(b - a, H, T, C.stone, { seed: Math.round(a) }); w.position.set((a + b) / 2, H / 2, 0); g.add(creases(w, 20, 0x3a3228, 0.25));
    for (let x = a + 0.6; x < b - 0.3; x += 1.6) { const m = block(0.9, 0.9, T * 0.4, C.stoneDark); m.position.set(x, H + 0.45, T * 0.3); g.add(m); }
  }
  // the gate block between the towers, with an arched opening cut out
  const span = towerW + 4, shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0); shape.lineTo(span / 2, 0); shape.lineTo(span / 2, H + 1); shape.lineTo(-span / 2, H + 1); shape.lineTo(-span / 2, 0);
  const hole = new THREE.Path(); hole.moveTo(-gateW / 2, 0); hole.lineTo(-gateW / 2, gateH - gateW / 2);
  hole.absarc(0, gateH - gateW / 2, gateW / 2, Math.PI, 0, true); hole.lineTo(gateW / 2, 0); hole.lineTo(-gateW / 2, 0); shape.holes.push(hole);
  const gb = paper(new THREE.ExtrudeGeometry(shape, { depth: T + 0.6, bevelEnabled: false, curveSegments: 5 }), C.stone, { crumple: 0.05, seed: 3 });
  gb.position.set(0, 0, -T / 2 - 0.3); g.add(creases(gb, 20, 0x3a3228, 0.3));
  // projecting towers either side of the gate
  for (const s of [-1, 1]) {
    const tw = block(towerW / 2, H + 3.5, 5.5, C.stone, { seed: 10 + s }); tw.position.set(s * (gateW / 2 + towerW / 4 + 0.6), (H + 3.5) / 2, 1.6); g.add(creases(tw, 20, 0x3a3228, 0.3));
    for (let i = 0; i < 3; i++) { const m = block(0.8, 0.9, 0.8, C.stoneDark); m.position.set(s * (gateW / 2 + 0.9 + i * 1.1), H + 3.95, 4.1); g.add(m); }
    const roof = paper(new THREE.ConeGeometry(2.6, 2.0, 4), C.madder, { crumple: 0.1, seed: 20 + s }); roof.rotation.y = Math.PI / 4; roof.position.set(s * (gateW / 2 + towerW / 4 + 0.6), H + 4.6, 1.6); roof.scale.z = 1.6; g.add(roof);
    const win = block(0.5, 0.9, 0.1, 0x2a221c); win.position.set(s * (gateW / 2 + towerW / 4 + 0.6), H + 1.2, 4.36); g.add(win);
  }
  // timber doors, one half open
  for (const s of [-1, 1]) {
    const d = creases(block(gateW / 2 - 0.05, gateH - 0.6, 0.12, C.woodDark, { seed: 30 + s }));
    const hinge = new THREE.Group(); hinge.position.set(s * gateW / 2, 0, T / 2 + 0.2); g.add(hinge);
    d.position.set(-s * (gateW / 4), (gateH - 0.6) / 2, 0); hinge.add(d); hinge.rotation.y = s > 0 ? -1.2 : 0.15;
  }
  // inner glow so the opening reads as a lit town behind
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(gateW, gateH), new THREE.MeshBasicMaterial({ color: 0xffb46a }));
  glow.position.set(0, gateH / 2, -T / 2 - 0.4); g.add(glow);
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.occluder = o.userData.occluder || "wall"; } });
  return g;
}

export function torch() {
  const g = new THREE.Group();
  const pole = prism(0.04, 0.05, 1.4, C.woodDark, 5); pole.position.y = 0.7; g.add(pole);
  const f = plate(0.16, 0.34, 0xf6b040, 0.3, { emissive: 0xf09030, emissiveIntensity: 1.6 }); f.position.y = 1.55; g.add(f);
  const l = new THREE.PointLight(0xffa04a, 5, 12, 1.7); l.position.y = 1.7; g.add(l);
  return { group: g, light: l, flame: f };
}

export function stake(h = 2.2, seed = 1) {
  const p = prism(0.08, 0.1, h, C.woodDark, 5, { seed }); p.position.y = h / 2; return p;
}
