// The diorama: your floating isle, its plots, the battle meadow, the Skygate and the rival isles on the horizon.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { GRID, CELL, PLOT_Z, cellPos } from './sim.js';
import { CARDS, champById } from './data.js';
import { cardModel, championFigure, unitGeometry, charmMarker, mat } from './models.js';

// Models from the Abbie's World model store (Cloudflare R2, served same-origin through /r2).
export const R2 = {
  castles: [
    '/r2/models/blobs/c5/c576f9e5153ba76c3b8e1e6820b78f0d11beb248de74093265f2df695ccb7df4/EH-001.sunward-castle.glb',
    '/r2/models/blobs/61/612789e336c048a8fa39d4aacc418b6bc533aab15dc62a348265c83f4aee8180/EH-002.iron-crown.glb',
  ],
  trees: [
    '/r2/models/blobs/7f/7f349e54c5ed514228c9b99ddd383984f1b9dbe538895726a4a1d5d268d3d54c/tree-soft-toy.glb',
    '/r2/models/blobs/35/3522549fc7f6f44172c70358494b83948d8e2a4753155f91471e7ca8648e8627/tree-faceted.glb',
  ],
  rocks: [
    '/r2/models/blobs/96/96b2e7db10146eee5e7f37cb02db92416c85569c66b5955955a6f878dce314e4/RF-002.glb',
    '/r2/models/blobs/0a/0a4f5f2c7b041d484358656c7eb0b91a37f9d7c03761ec22bd81f13b4c40142f/RF-004.glb',
  ],
};

const ROLE_PAINT = { green: '#5d9a3c', light: '#8fc45a', trunk: '#8a5a32' };
const ISLE = { minX: -11.5, maxX: 11.5, minZ: -21, maxZ: 17.5 };
const WELL_POS = { x: -8.4, z: 12.6 };
const SHAPES = ['pawn', 'ranged', 'brute', 'tiny'];
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.75)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1200);
    this.cam = { target: new THREE.Vector3(0, 0, -3), dist: 50, pitch: 0.98, yaw: 0, shake: 0 };
    this.camGoal = { ...this.cam, target: this.cam.target.clone() };
    this.mode = 'title';
    this.tweens = [];
    this.plots = [];
    this.time = 0;
    this.loader = new GLTFLoader();
    this.glbCache = new Map();
    this.buildSky(); this.buildLights(); this.buildIsle(); this.buildPlots(); this.buildWell(); this.buildGate(); this.buildFx(); this.buildUnits();
    this.rivalGroup = new THREE.Group(); this.scene.add(this.rivalGroup);
    this.rivalIsles = new Map();
    this.dressIsle();
    this.raycaster = new THREE.Raycaster();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.clock = new THREE.Clock();
    this.onFrame = null;
    const loop = () => { requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  // ---- scene ------------------------------------------------------------------------------------------------------
  buildSky() {
    const geo = new THREE.SphereGeometry(300, 32, 16);
    const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: {
      top: { value: new THREE.Color('#5d9ee0') }, mid: { value: new THREE.Color('#bfe0f4') }, low: { value: new THREE.Color('#9cc6e6') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, low, smoothstep(0.0, 0.35, -h)); gl_FragColor = vec4(c, 1.0); }' });
    this.sky = new THREE.Mesh(geo, m); this.scene.add(this.sky);
    this.scene.fog = new THREE.Fog('#c6dff0', 90, 230);
    // a sea of cloud below and a few drifting puffs
    const tex = puffTexture();
    this.puffs = [];
    for (let k = 0; k < 70; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: k % 5 ? '#ffffff' : '#ffeedd', transparent: true, opacity: 0.9, depthWrite: false, fog: true }));
      const a = Math.random() * Math.PI * 2, rr = 14 + Math.random() * 70;
      sp.position.set(Math.cos(a) * rr, -12 - Math.random() * 10, Math.sin(a) * rr - 10);
      const s = 14 + Math.random() * 18; sp.scale.set(s, s * 0.6, 1);
      sp.userData.v = 0.2 + Math.random() * 0.5;
      this.scene.add(sp); this.puffs.push(sp);
    }
    for (let k = 0; k < 10; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false }));
      sp.position.set(-60 + k * 13 + Math.random() * 6, 8 + Math.random() * 10, -80 - Math.random() * 30);
      const s = 10 + Math.random() * 10; sp.scale.set(s, s * 0.45, 1); sp.userData.v = 0.4;
      this.scene.add(sp); this.puffs.push(sp);
    }
  }
  buildLights() {
    this.scene.add(new THREE.HemisphereLight('#dff0ff', '#8c7a5a', 1.25));
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    sun.position.set(-14, 28, 18); sun.target.position.set(0, 0, -3);
    sun.castShadow = true;
    const sc = sun.shadow.camera; sc.left = -20; sc.right = 20; sc.top = 26; sc.bottom = -26; sc.near = 5; sc.far = 80;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
  }
  buildIsle() {
    const w = ISLE.maxX - ISLE.minX, h = ISLE.maxZ - ISLE.minZ, cz = (ISLE.maxZ + ISLE.minZ) / 2;
    const isle = this.isle = new THREE.Group();
    const grass = new THREE.ExtrudeGeometry(roundedRect(w, h, 3.2), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.35, bevelSegments: 2, curveSegments: 10 });
    grass.rotateX(-Math.PI / 2); grass.translate(0, -0.85, cz);
    const gm = new THREE.Mesh(grass, mat('#7dbb4f', { rough: 0.95 })); gm.receiveShadow = true; gm.name = 'meadow';
    gm.position.z = 0; isle.add(gm);
    const soil = new THREE.ExtrudeGeometry(roundedRect(w - 0.3, h - 0.3, 3), { depth: 2.2, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 1, curveSegments: 10 });
    soil.rotateX(-Math.PI / 2); soil.translate(0, -3.0, cz);
    isle.add(new THREE.Mesh(soil, mat('#9b6b43')));
    const rock = new THREE.CylinderGeometry(1, 0.08, 1, 9, 3, true);
    const pos = rock.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 0.49 && y > -0.49) { pos.setX(i, pos.getX(i) * (0.85 + Math.random() * 0.3)); pos.setZ(i, pos.getZ(i) * (0.85 + Math.random() * 0.3)); } }
    rock.computeVertexNormals();
    const rm = new THREE.Mesh(rock, mat('#6d5a4b')); rm.scale.set(w * 0.44, 13, h * 0.44); rm.position.set(0, -9.4, cz); rm.name = 'isle-underside';
    isle.add(rm);
    for (let k = 0; k < 7; k++) {
      const hr = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random() * 1.5, 4 + Math.random() * 5, 6), mat('#5e4c40'));
      hr.rotation.x = Math.PI; hr.position.set((Math.random() - 0.5) * w * 0.7, -5 - Math.random() * 3, cz + (Math.random() - 0.5) * h * 0.7); isle.add(hr);
    }
    // the trodden path from the Skygate to your plots
    for (let k = 0; k < 7; k++) {
      const z = -16.5 + k * 3.0, p = new THREE.Mesh(new THREE.CircleGeometry(1, 18), mat('#b9a77c', { rough: 1 }));
      p.rotation.x = -Math.PI / 2; p.scale.set(2.2 + Math.sin(k) * 0.6, 1.9, 1); p.position.set(Math.sin(k * 0.8) * 0.8, 0.012, z); p.receiveShadow = true; isle.add(p);
    }
    // grass tufts and flowers
    const tuft = new THREE.ConeGeometry(0.09, 0.36, 4); tuft.translate(0, 0.18, 0);
    const tufts = new THREE.InstancedMesh(tuft, mat('#5f9c3c'), 900); const m4 = new THREE.Matrix4();
    let n = 0;
    for (let k = 0; k < 2400 && n < 900; k++) {
      const x = ISLE.minX + 0.6 + Math.random() * (w - 1.2), z = ISLE.minZ + 0.6 + Math.random() * (h - 1.2);
      if (Math.abs(x) < 7 && z > PLOT_Z - 7 && z < PLOT_Z + 7) continue;
      if (Math.abs(x) < 2.5 && z < 3) continue;
      m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * 3, (Math.random() - 0.5) * 0.4)), new THREE.Vector3(1, 0.7 + Math.random() * 0.8, 1));
      tufts.setMatrixAt(n++, m4);
    }
    tufts.count = n; isle.add(tufts);
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 6, 4), mat('#ffffff'), 160);
    const cols = ['#ffd45a', '#ffffff', '#e2577a', '#b9a4ff'];
    for (let k = 0; k < 160; k++) {
      const x = ISLE.minX + 1 + Math.random() * (w - 2), z = ISLE.minZ + 1 + Math.random() * (h - 2);
      m4.makeTranslation(x, 0.1, z); fl.setMatrixAt(k, m4); fl.setColorAt(k, new THREE.Color(cols[k % 4]));
    }
    isle.add(fl);
    this.scene.add(isle);
  }
  buildPlots() {
    const tileGeo = new THREE.BoxGeometry(CELL - 0.3, 0.3, CELL - 0.3);
    const topGeo = new THREE.BoxGeometry(CELL - 0.55, 0.06, CELL - 0.55);
    const ringGeo = new THREE.RingGeometry(CELL * 0.5, CELL * 0.66, 4, 1); ringGeo.rotateZ(Math.PI / 4); ringGeo.rotateX(-Math.PI / 2);
    const pickGeo = new THREE.BoxGeometry(CELL, 2.5, CELL);
    this.pickMeshes = [];
    for (let i = 0; i < GRID * GRID; i++) {
      const p = cellPos(i), g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      const tile = new THREE.Mesh(tileGeo, mat('#c9bfae')); tile.position.y = 0.05; tile.castShadow = false; tile.receiveShadow = true; tile.name = 'plot-stone';
      const top = new THREE.Mesh(topGeo, mat('#8a6a48', { rough: 1 })); top.position.y = 0.22; top.receiveShadow = true; top.name = 'plot-soil';
      const glow = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      glow.position.y = 0.3; glow.renderOrder = 2; glow.name = 'plot-glow';
      const pick = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 1; pick.userData.plot = i;
      const holder = new THREE.Group(); holder.position.y = 0.25; holder.scale.setScalar(1.35);
      const pips = new THREE.Group(); pips.position.set(0, 0.28, CELL / 2 - 0.3);
      const charms = new THREE.Group(); charms.position.set(-CELL / 2 + 0.35, 1.6, -CELL / 2 + 0.35);
      g.add(tile, top, glow, pick, holder, pips, charms);
      this.scene.add(g);
      this.pickMeshes.push(pick);
      this.plots.push({ i, g, tile, top, glow, holder, pips, charms, card: null, level: 0, charmKey: '', open: false, ghost: null, glowTarget: 0, glowColor: new THREE.Color('#fff3b0') });
    }
  }
  buildWell() {
    const g = this.well = new THREE.Group();
    g.position.set(WELL_POS.x, 0, WELL_POS.z);
    const add = (geo, color, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat(color, o)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.CylinderGeometry(0.85, 0.95, 0.8, 12), '#b9b2a6', 0, 0.4, 0);
    add(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 12), '#2f5e86', 0, 0.78, 0, { rough: 0.2 });
    add(new THREE.BoxGeometry(0.12, 1.4, 0.12), '#7a5230', -0.75, 1.1, 0);
    add(new THREE.BoxGeometry(0.12, 1.4, 0.12), '#7a5230', 0.75, 1.1, 0);
    const roof = add(new THREE.ConeGeometry(1.15, 0.6, 4), '#c4553f', 0, 2.05, 0); roof.rotation.y = Math.PI / 4;
    add(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), '#7a5230', 0, 1.5, 0).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.15, 0.13, 0.22, 8), '#a8743f', 0.1, 1.15, 0);
    for (const [x, z] of [[0.9, 0.7], [1.1, 0.4]]) add(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), '#f2c14e', x, 0.03, z, { metal: 0.4 });
    const pick = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3, 2.4), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = 1.2; pick.userData.well = true; g.add(pick);
    this.wellPick = pick;
    const ring = this.wellGlow = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 24), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    this.scene.add(g);
  }
  buildGate() {
    const g = this.gate = new THREE.Group(); g.position.set(0, 0, -18.6);
    const stone = mat('#a39b8e');
    for (const x of [-3.2, 3.2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.2, 1.1), stone); p.position.set(x, 2.6, 0); p.castShadow = true; g.add(p);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.9, 4), mat('#6c6458')); cap.position.set(x, 5.65, 0); cap.rotation.y = Math.PI / 4; g.add(cap);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.45, 6, 16, Math.PI), stone); arch.position.set(0, 5.0, 0); arch.castShadow = true; g.add(arch);
    const swirl = this.gateSwirl = new THREE.Mesh(new THREE.CircleGeometry(2.7, 32), new THREE.MeshBasicMaterial({ color: '#b9a4ff', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    swirl.position.set(0, 3.4, 0); swirl.scale.set(1, 1.25, 1); g.add(swirl);
    this.scene.add(g);
  }
  dressIsle() {
    const spots = [];
    for (let k = 0; k < 14; k++) spots.push([k % 2 ? ISLE.maxX - 0.9 - Math.random() * 0.8 : ISLE.minX + 0.9 + Math.random() * 0.8, ISLE.minZ + 3 + k * 2.5 + Math.random()]);
    for (let k = 0; k < 6; k++) spots.push([-8 + k * 3.2 + Math.random(), ISLE.maxZ - 1.4 - Math.random() * 0.6]);
    spots.forEach(([x, z], k) => {
      const tree = k % 3 !== 2;
      const url = tree ? R2.trees[k % R2.trees.length] : R2.rocks[k % R2.rocks.length];
      this.placeGlb(url, x, z, tree ? 2.4 + Math.random() * 1.6 : 0.9 + Math.random() * 0.6, Math.random() * 6, this.isle, () => this.fallbackTree(tree));
    });
  }
  fallbackTree(tree) {
    const g = new THREE.Group();
    if (tree) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6), mat('#7a5230')); t.position.y = 0.6; const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), mat('#4f8f3a')); c.position.y = 1.7; g.add(t, c); }
    else { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), mat('#a39b8e')); r.position.y = 0.3; g.add(r); }
    g.traverse((o) => { o.castShadow = true; });
    return g;
  }
  loadGlb(url) {
    if (!this.glbCache.has(url)) this.glbCache.set(url, new Promise((res, rej) => this.loader.load(url, (gl) => res(gl.scene), undefined, rej)));
    return this.glbCache.get(url);
  }
  placeGlb(url, x, z, height, ry, parent, fallback) {
    const holder = new THREE.Group(); holder.position.set(x, 0, z); holder.rotation.y = ry; parent.add(holder);
    this.loadGlb(url).then((src) => {
      const m = src.clone(true);
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      const s = height / Math.max(0.001, size.y);
      m.scale.setScalar(s);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x * s, -box.min.y * s, -c.z * s);
      m.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true; o.receiveShadow = true;
        // The model store names materials by shading role; paint the roles in this world's palette.
        const role = ROLE_PAINT[(o.material && o.material.name || '').toLowerCase()];
        if (role) { o.material = o.material.clone(); o.material.color.set(role); }
      });
      holder.add(m);
    }).catch(() => holder.add(fallback ? fallback() : new THREE.Group()));
    return holder;
  }

  // ---- rival isles ------------------------------------------------------------------------------------------------
  setRivals(rivals, attacker) {
    const xs = [-30, -11, 11, 30];
    rivals.forEach((rv, k) => {
      let isle = this.rivalIsles.get(rv.champ);
      if (!isle) {
        const ch = champById(rv.champ), g = new THREE.Group();
        const base = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 0.5, 9, 9), mat('#6d5a4b')); base.position.y = -4.6; g.add(base);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.5, 0.8, 18), mat('#7dbb4f')); top.position.y = -0.3; top.receiveShadow = true; g.add(top);
        const castle = new THREE.Group(); g.add(castle);
        this.placeGlb(R2.castles[k % 2], 0.6, -0.8, 7, 0.4 * (k % 2 ? -1 : 1), castle, () => { const f = cardModel(ch.seat); f.scale.setScalar(2.6); return f; });
        const fig = championFigure(rv.champ, 2.0); fig.position.set(-3.6, 0, 2.6); fig.rotation.y = 0.5; g.add(fig);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), mat('#7a5230')); pole.position.set(3.8, 4.5, 2); g.add(pole);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.08), mat(ch.color)); flag.position.set(5.1, 8.0, 2); g.add(flag);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 6.5, 60, 20, 1, true), new THREE.MeshBasicMaterial({ color: ch.color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        beam.position.y = 30; g.add(beam);
        g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
        isle = { g, flag, beam, fig, bob: Math.random() * 6 };
        this.rivalIsles.set(rv.champ, isle);
        this.rivalGroup.add(g);
      }
      isle.g.position.set(xs[k % 4], 2, -62 - (k % 2) * 6);
      isle.attacking = rv.champ === attacker;
      isle.peace = rv.peace;
      isle.flag.material = mat(rv.peace ? '#f3eee2' : champById(rv.champ).color);
    });
    for (const [id, isle] of this.rivalIsles) if (!rivals.find((r) => r.champ === id)) { this.rivalGroup.remove(isle.g); this.rivalIsles.delete(id); }
  }
  rivalScreen(champId) {
    const isle = this.rivalIsles.get(champId);
    if (!isle) return null;
    return this.toScreen(isle.g.position.x, isle.g.position.y + 6, isle.g.position.z);
  }

  // ---- plots ------------------------------------------------------------------------------------------------------
  syncBoard(board, anim = {}) {
    for (const p of board.plots) {
      const v = this.plots[p.i];
      v.open = p.open;
      v.g.visible = !!(p.open || v.expandable);
      if (v.card !== p.card) {
        v.holder.clear();
        v.card = p.card;
        if (p.card) {
          const m = cardModel(p.card);
          m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          v.model = m; v.holder.add(m);
          if (anim.plot === p.i) this.pop(m);
        } else v.model = null;
      }
      if (v.level !== p.level) {
        const up = p.level > v.level && v.level > 0;
        v.level = p.level;
        v.pips.clear();
        const n = p.level, w = Math.min(n, 9) * 0.22;
        for (let k = 0; k < n; k++) {
          const pip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.07, 8), mat('#f2c14e', { metal: 0.5, rough: 0.35 }));
          pip.position.set(-w / 2 + 0.11 + k * 0.22, 0, 0); pip.castShadow = true; v.pips.add(pip);
        }
        if (v.model) v.model.scale.setScalar(1 + (p.level - 1) * 0.045);
        if (up && anim.plot === p.i) this.bump(v.model, p.i);
      }
      const ck = JSON.stringify(p.charms);
      if (v.charmKey !== ck) {
        v.charmKey = ck; v.charms.clear();
        let k = 0;
        for (const key in p.charms) {
          const m = charmMarker(key); m.position.x = k * 0.4; m.userData.spin = true; v.charms.add(m); k++;
        }
        if (anim.plot === p.i && anim.kind === 'charm') this.sparkle(p.i, '#f2c14e');
      }
    }
  }
  pop(obj) {
    const s = obj.scale.x;
    obj.scale.setScalar(0.01);
    this.tween(380, (t) => obj.scale.setScalar(Math.max(0.01, s * easeOutBack(t))));
  }
  bump(obj, i) {
    if (!obj) return;
    const s = obj.scale.x;
    this.tween(420, (t) => { const k = Math.sin(t * Math.PI); obj.scale.set(s * (1 + 0.18 * k), s * (1 - 0.12 * k + 0.25 * Math.sin(t * Math.PI * 2) * (1 - t)), s * (1 + 0.18 * k)); }, () => obj.scale.setScalar(s));
    this.sparkle(i, '#ffe28a');
  }
  sparkle(i, color) {
    const p = cellPos(i);
    for (let k = 0; k < 24; k++) this.particle(p.x + (Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 1.5, p.z + (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 2, 2 + Math.random() * 3, (Math.random() - 0.5) * 2, color, 0.7 + Math.random() * 0.5, 0.9);
  }
  // valid: plot indices that glow, hover: the one under the finger, preview: {card, kind} for the ghost.
  highlight(valid, hover, preview) {
    const set = new Set(valid || []);
    for (const v of this.plots) {
      v.glowTarget = v.i === hover ? 0.95 : set.has(v.i) ? 0.45 : 0;
      if (v.ghost && (v.i !== hover || !preview || preview.kind !== 'place')) { v.holder.remove(v.ghost); v.ghost = null; }
    }
    if (hover != null && preview && preview.kind === 'place' && !this.plots[hover].ghost) {
      const gm = cardModel(preview.card);
      gm.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.castShadow = false; } });
      this.plots[hover].ghost = gm; this.plots[hover].holder.add(gm);
    }
    this.hoverPlot = hover; this.hoverKind = preview && preview.kind;
  }
  setWellGlow(on, hot) { this.wellGlowTarget = hot ? 0.95 : on ? 0.4 : 0; }
  setExpandable(cells) {
    const set = new Set(cells || []);
    for (const v of this.plots) {
      v.expandable = set.has(v.i);
      v.g.visible = !!(v.open || v.expandable);
      v.tile.material = v.expandable && !v.open ? mat('#fff3b0', { opacity: 0.45 }) : mat('#c9bfae');
      v.top.visible = v.open;
    }
  }
  openPlot(i) {
    const v = this.plots[i];
    v.open = true; v.expandable = false; v.g.visible = true; v.top.visible = true; v.tile.material = mat('#c9bfae');
    v.g.position.y = -3;
    this.tween(600, (t) => { v.g.position.y = -3 * (1 - easeOutBack(t)); });
    this.sparkle(i, '#fff3b0');
  }

  // ---- picking ----------------------------------------------------------------------------------------------------
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // The ground point decides: the plot whose square contains it, then a forgiving snap, then the well.
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.25), pt = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, pt)) {
      let best = null, bd = (CELL * 0.75) ** 2;
      for (const v of this.plots) {
        if (!v.open && !v.expandable) continue;
        const c = cellPos(v.i), d = (c.x - pt.x) ** 2 + (c.z - pt.z) ** 2;
        if (Math.abs(c.x - pt.x) < CELL / 2 && Math.abs(c.z - pt.z) < CELL / 2) return v.i;
        if (d < bd) { bd = d; best = v.i; }
      }
      if ((pt.x - WELL_POS.x) ** 2 + (pt.z - WELL_POS.z) ** 2 < 1.8 * 1.8) return 'well';
      if (best != null) return best;
    }
    const hits = this.raycaster.intersectObjects([this.wellPick], false);
    return hits.length ? 'well' : null;
  }
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera), rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height, behind: v.z > 1 };
  }
  plotScreen(i, y = 1.2) { const p = cellPos(i); return this.toScreen(p.x, y, p.z); }
  wellScreen() { return this.toScreen(WELL_POS.x, 2.2, WELL_POS.z); }

  // ---- camera -----------------------------------------------------------------------------------------------------
  setMode(mode) { this.mode = mode; this.fit(); }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.fit(true);
  }
  // Find the closest camera that shows the region, leaving the bottom band free for the hand.
  fit(snap) {
    const portrait = window.innerHeight > window.innerWidth;
    const region = this.mode === 'battle' ? { x0: -10, x1: 10, z0: -19.5, z1: 14.5 } : this.mode === 'title' ? { x0: -12, x1: 12, z0: -21, z1: 17.5 } : { x0: -9.2, x1: 9.2, z0: -19.5, z1: 15 };
    const bottomBand = this.mode === 'plan' ? (portrait ? 0.26 : 0.3) : this.mode === 'battle' ? 0.04 : 0.0;
    const topBand = this.mode === 'title' ? 0.0 : 0.08;
    const pitch = this.mode === 'battle' ? 0.95 : portrait ? 1.0 : 0.92;
    const cam = this.camera, tmp = new THREE.Vector3();
    const corners = [[region.x0, region.z0], [region.x1, region.z0], [region.x0, region.z1], [region.x1, region.z1]];
    const place = (dist, tz) => {
      cam.position.set(0, Math.sin(pitch) * dist, tz + Math.cos(pitch) * dist);
      cam.lookAt(0, 0, tz); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let minY = 9, maxY = -9, maxX = 0;
      for (const [x, z] of corners) { tmp.set(x, 0, z).project(cam); minY = Math.min(minY, tmp.y); maxY = Math.max(maxY, tmp.y); maxX = Math.max(maxX, Math.abs(tmp.x)); }
      return { minY, maxY, maxX };
    };
    const lo = -1 + 2 * bottomBand, hi = 1 - 2 * topBand;
    let best = null;
    for (let dist = 25; dist < 140; dist += 0.5) {
      // slide the target so the region sits between the bands
      let tz = (region.z0 + region.z1) / 2, r;
      for (let k = 0; k < 12; k++) { r = place(dist, tz); const mid = (r.minY + r.maxY) / 2, want = (lo + hi) / 2; tz -= (mid - want) * dist * 0.15; }
      r = place(dist, tz);
      if (r.minY >= lo - 0.01 && r.maxY <= hi + 0.01 && r.maxX <= 0.98) { best = { dist, tz }; break; }
    }
    if (!best) best = { dist: 80, tz: -4 };
    this.camGoal.dist = best.dist; this.camGoal.target.set(0, 0, best.tz); this.camGoal.pitch = pitch;
    if (snap) { this.cam.dist = best.dist; this.cam.target.copy(this.camGoal.target); this.cam.pitch = pitch; }
  }
  shake(a) { this.cam.shake = Math.max(this.cam.shake, a); }
  applyCamera(dt) {
    const k = 1 - Math.exp(-dt * 3.2), c = this.cam, g = this.camGoal;
    c.dist += (g.dist - c.dist) * k; c.pitch += (g.pitch - c.pitch) * k; c.target.lerp(g.target, k);
    let yaw = 0;
    if (this.mode === 'title') yaw = Math.sin(this.time * 0.08) * 0.35;
    c.shake *= Math.exp(-dt * 7);
    const sx = (Math.random() - 0.5) * c.shake, sy = (Math.random() - 0.5) * c.shake;
    this.camera.position.set(c.target.x + Math.sin(yaw) * Math.cos(c.pitch) * c.dist + sx, Math.sin(c.pitch) * c.dist + sy, c.target.z + Math.cos(yaw) * Math.cos(c.pitch) * c.dist);
    this.camera.lookAt(c.target.x + sx * 0.5, 0, c.target.z);
  }

  // ---- battle rendering -------------------------------------------------------------------------------------------
  buildUnits() {
    this.unitMeshes = {};
    const cap = 1400;
    for (const s of SHAPES) {
      const { body, detail } = unitGeometry(s);
      const b = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 }), cap);
      const d = new THREE.InstancedMesh(detail, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 }), cap);
      for (const m of [b, d]) { m.castShadow = true; m.count = 0; m.frustumCulled = false; this.scene.add(m); }
      b.setColorAt(0, new THREE.Color('#fff'));
      this.unitMeshes[s] = { b, d };
    }
    this.shadowBlobs = null;
  }
  startBattle(battle, playerColor, enemyColor, bossChamp) {
    this.battle = battle;
    this.teamColor = { P: new THREE.Color(playerColor), E: new THREE.Color(enemyColor) };
    if (this.boss) { this.scene.remove(this.boss); this.boss = null; }
    if (bossChamp) { this.boss = championFigure(bossChamp, 1.6); this.boss.visible = false; this.scene.add(this.boss); }
    this.plotFlash = new Map();
  }
  endBattle() {
    this.battle = null;
    for (const s of SHAPES) { this.unitMeshes[s].b.count = 0; this.unitMeshes[s].d.count = 0; }
    this.projMesh.count = 0;
    if (this.boss) { this.scene.remove(this.boss); this.boss = null; }
  }
  renderBattle(dt) {
    const b = this.battle; if (!b) return;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), white = new THREE.Color('#ffffff');
    const counts = {}; for (const s of SHAPES) counts[s] = 0;
    for (const u of b.units) {
      if (!u.alive) continue;
      if (u.shape === 'boss') {
        if (this.boss) { this.boss.visible = true; this.boss.position.set(u.x, Math.abs(Math.sin(b.t * 6)) * 0.15, u.z); this.boss.rotation.y = u.face; }
        continue;
      }
      const meshes = this.unitMeshes[u.shape]; if (!meshes) continue;
      const k = counts[u.shape]++;
      if (k >= 1400) continue;
      const age = b.t - u.born, grow = age < 0.3 ? Math.max(0.05, easeOutBack(age / 0.3)) : 1;
      const bob = u.moving ? Math.abs(Math.sin(b.t * 11 + u.id)) * 0.12 : 0;
      const lean = u.flash > 0 ? -0.3 : u.moving ? 0.12 : 0;
      e.set(lean, u.face, 0); q.setFromEuler(e);
      pos.set(u.x, bob, u.z); sc.setScalar(grow * 1.35);
      m4.compose(pos, q, sc);
      meshes.b.setMatrixAt(k, m4); meshes.d.setMatrixAt(k, m4);
      col.copy(this.teamColor[u.side]);
      if (u.side === 'E') col.multiplyScalar(0.85);
      if (u.flash > 0) col.lerp(white, 0.75);
      meshes.b.setColorAt(k, col);
    }
    for (const s of SHAPES) {
      const m = this.unitMeshes[s];
      m.b.count = m.d.count = Math.min(1400, counts[s]);
      m.b.instanceMatrix.needsUpdate = m.d.instanceMatrix.needsUpdate = true;
      if (m.b.instanceColor) m.b.instanceColor.needsUpdate = true;
    }
    // missiles
    let n = 0;
    const PC = { stone: '#bdb5a8', bolt: '#6a5038', coin: '#f2c14e', fireball: '#ff8a2a', boulder: '#8d877d', shell: '#3a3a3a', spear: '#c9b48a', arrow: '#6a5038' };
    for (const p of b.projectiles) {
      if (n >= 700) break;
      const big = p.kind === 'boulder' || p.kind === 'shell' || p.kind === 'fireball';
      const long = p.kind === 'spear' || p.kind === 'bolt' || p.kind === 'arrow';
      pos.set(p.x, p.y, p.z);
      if (long) { e.set(0, Math.atan2(p.tx - p.x0, p.tz - p.z0), 0); q.setFromEuler(e); sc.set(0.5, 0.5, p.kind === 'spear' ? 9 : 3.5); }
      else { q.identity(); sc.setScalar(big ? 2.4 : 1); }
      m4.compose(pos, q, sc);
      this.projMesh.setMatrixAt(n, m4); this.projMesh.setColorAt(n, col.set(PC[p.kind] || '#ffffff'));
      n++;
      if (p.kind === 'fireball' && Math.random() < 0.5) this.particle(p.x, p.y, p.z, 0, 0.5, 0, '#ffb347', 0.3, 0.5);
    }
    this.projMesh.count = n; this.projMesh.instanceMatrix.needsUpdate = true; if (this.projMesh.instanceColor) this.projMesh.instanceColor.needsUpdate = true;
  }

  // ---- effects ----------------------------------------------------------------------------------------------------
  buildFx() {
    this.projMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), 700);
    this.projMesh.count = 0; this.projMesh.frustumCulled = false; this.projMesh.setColorAt(0, new THREE.Color('#fff'));
    this.scene.add(this.projMesh);
    this.partMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true }), 2000);
    this.partMesh.count = 0; this.partMesh.frustumCulled = false; this.partMesh.setColorAt(0, new THREE.Color('#fff'));
    this.scene.add(this.partMesh);
    this.parts = [];
    this.zaps = [];
    const zgeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); zgeo.translate(0, 0.5, 0); zgeo.rotateX(Math.PI / 2);
    for (let k = 0; k < 48; k++) {
      const m = new THREE.Mesh(zgeo, new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      m.visible = false; this.scene.add(m); this.zaps.push({ m, life: 0 });
    }
    this.rings = [];
    const rgeo = new THREE.RingGeometry(0.7, 1, 28); rgeo.rotateX(-Math.PI / 2);
    for (let k = 0; k < 24; k++) {
      const m = new THREE.Mesh(rgeo, new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      m.visible = false; m.position.y = 0.08; this.scene.add(m); this.rings.push({ m, life: 0, r: 1 });
    }
  }
  particle(x, y, z, vx, vy, vz, color, life = 0.6, size = 1) {
    if (this.parts.length > 1900) this.parts.shift();
    this.parts.push({ x, y, z, vx, vy, vz, c: new THREE.Color(color), life, max: life, size });
  }
  puff(x, z, color, n = 10, up = 2.5) {
    for (let k = 0; k < n; k++) this.particle(x, 0.4, z, (Math.random() - 0.5) * 3, Math.random() * up + 0.5, (Math.random() - 0.5) * 3, k % 3 ? color : '#ffffff', 0.35 + Math.random() * 0.3, 1.2);
  }
  zap(x0, y0, z0, x1, y1, z1, color, width = 0.08) {
    const z = this.zaps.find((q) => q.life <= 0) || this.zaps[0];
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b);
    z.m.position.copy(a); z.m.lookAt(b); z.m.scale.set(width, width, len);
    z.m.material.color.set(color); z.m.material.opacity = 1; z.m.visible = true; z.life = 0.14; z.max = 0.14;
  }
  ring(x, z, r, color) {
    const q = this.rings.find((o) => o.life <= 0) || this.rings[0];
    q.m.position.x = x; q.m.position.z = z; q.r = r; q.life = q.max = 0.4; q.m.material.color.set(color); q.m.visible = true;
  }
  // Translate the battle's event stream into motion, sparks and shake. Returns events for the sound layer.
  playEvents(events, colors) {
    for (const ev of events) {
      if (ev.t === 'death') this.puff(ev.x, ev.z, ev.side === 'E' ? colors.E : colors.P, ev.boss ? 60 : 6, ev.boss ? 6 : 2.5), ev.boss && this.shake(1.2);
      else if (ev.t === 'boom') { this.ring(ev.x, ev.z, ev.r, ev.kind === 'fireball' ? '#ff8a2a' : '#e8dcc0'); this.puff(ev.x, ev.z, ev.kind === 'fireball' ? '#ff8a2a' : '#bdb5a8', 10, 3); this.shake(0.12); }
      else if (ev.t === 'zap') {
        const c = { beam: '#fff1a8', bee: '#f2c14e', flame: '#ff8a2a', chain: '#9fe3ff' }[ev.kind] || '#ffffff';
        this.zap(ev.x0, ev.y0, ev.z0, ev.x1, 0.5, ev.z1, c, ev.kind === 'beam' ? 0.16 : ev.kind === 'flame' ? 0.3 : 0.05);
        if (ev.kind === 'flame') for (let k = 0; k < 6; k++) this.particle(ev.x1, 0.4, ev.z1, (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, k % 2 ? '#ff8a2a' : '#ffd45a', 0.35, 1.3);
      } else if (ev.t === 'pop') this.particle(ev.x, 0.3, ev.z, 0, 1.5, 0, colors.P, 0.25, 1.5);
      else if (ev.t === 'coin') for (let k = 0; k < 5; k++) this.particle(ev.x, 0.5, ev.z, (Math.random() - 0.5), 4 + Math.random() * 2, (Math.random() - 0.5), '#f2c14e', 0.8, 1.4);
      else if (ev.t === 'burst') { this.ring(ev.x, ev.z, 1.6, '#ff8a2a'); this.puff(ev.x, ev.z, '#ff8a2a', 8, 3); }
      else if (ev.t === 'slam') { this.ring(ev.x, ev.z, 1.4, '#e8dcc0'); this.shake(0.25); }
      else if (ev.t === 'shoot') { const v = this.plots[ev.plot]; if (v && v.model) { const m = v.model, s0 = m.scale.x; this.tween(160, (t) => { m.scale.y = s0 * (1 - 0.08 * Math.sin(t * Math.PI)); }, () => { m.scale.y = s0; }); } }
      else if (ev.t === 'breach') { this.shake(1.6); this.puff(ev.x, ev.z, '#d6453a', 40, 5); }
    }
  }
  updateFx(dt) {
    const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let n = 0;
    for (const p of this.parts) {
      p.life -= dt; if (p.life <= 0) continue;
      p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
      const k = p.life / p.max;
      pos.set(p.x, p.y, p.z); sc.setScalar(p.size * (0.4 + 0.6 * k));
      m4.compose(pos, q, sc); this.partMesh.setMatrixAt(n, m4); this.partMesh.setColorAt(n, p.c); n++;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.partMesh.count = n; this.partMesh.instanceMatrix.needsUpdate = true; if (this.partMesh.instanceColor) this.partMesh.instanceColor.needsUpdate = true;
    for (const z of this.zaps) if (z.life > 0) { z.life -= dt; z.m.material.opacity = Math.max(0, z.life / z.max); if (z.life <= 0) z.m.visible = false; }
    for (const r of this.rings) if (r.life > 0) { r.life -= dt; const k = 1 - r.life / r.max; r.m.scale.setScalar(r.r * (0.3 + 0.9 * k)); r.m.material.opacity = 1 - k; if (r.life <= 0) r.m.visible = false; }
  }
  tween(ms, fn, done) { this.tweens.push({ t: 0, dur: ms / 1000, fn, done }); }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    for (const tw of this.tweens) { tw.t += dt; const k = Math.min(1, tw.t / tw.dur); tw.fn(k); if (k >= 1 && tw.done) tw.done(); }
    this.tweens = this.tweens.filter((tw) => tw.t < tw.dur);
    if (this.onFrame) this.onFrame(dt);
    // glows and idle life
    for (const v of this.plots) {
      const m = v.glow.material; m.opacity += ((v.glowTarget * (0.75 + 0.25 * Math.sin(this.time * 6))) - m.opacity) * Math.min(1, dt * 12);
      if (v.ghost) { v.ghost.position.y = 0.15 + Math.sin(this.time * 5) * 0.08; }
      for (const c of v.charms.children) { c.rotation.y += dt * 1.6; c.position.y = Math.sin(this.time * 2 + v.i) * 0.08; }
      if (v.i === this.hoverPlot && this.hoverKind === 'level' && v.pips.children.length) v.pips.position.y = 0.28 + Math.abs(Math.sin(this.time * 8)) * 0.12; else v.pips.position.y = 0.28;
    }
    if (this.wellGlow) { const m = this.wellGlow.material; m.opacity += (((this.wellGlowTarget || 0) * (0.75 + 0.25 * Math.sin(this.time * 6))) - m.opacity) * Math.min(1, dt * 12); }
    this.gateSwirl.rotation.z += dt * 0.8; this.gateSwirl.material.opacity = 0.3 + 0.1 * Math.sin(this.time * 2) + (this.battle ? 0.25 : 0);
    for (const sp of this.puffs) { sp.position.x += sp.userData.v * dt; if (sp.position.x > 90) sp.position.x = -90; }
    for (const [, isle] of this.rivalIsles) {
      isle.g.position.y = 2 + Math.sin(this.time * 0.6 + isle.bob) * 0.6;
      isle.beam.material.opacity += ((isle.attacking ? 0.16 + 0.06 * Math.sin(this.time * 3) : 0) - isle.beam.material.opacity) * Math.min(1, dt * 4);
      isle.flag.rotation.y = Math.sin(this.time * 2 + isle.bob) * 0.15;
    }
    this.renderBattle(dt);
    this.updateFx(dt);
    this.applyCamera(dt);
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
  }

  // ---- card art: render each card's own model ----------------------------------------------------------------------
  artFor(key, build) {
    this.artCache = this.artCache || new Map();
    if (this.artCache.has(key)) return this.artCache.get(key);
    if (!this.artRenderer) {
      const c = document.createElement('canvas'); c.width = 320; c.height = 320;
      this.artRenderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.artRenderer.toneMapping = THREE.ACESFilmicToneMapping; this.artRenderer.outputColorSpace = THREE.SRGBColorSpace;
      this.artRenderer.setPixelRatio(1); this.artRenderer.setSize(320, 320, false);
      this.artScene = new THREE.Scene();
      this.artScene.add(new THREE.HemisphereLight('#ffffff', '#8c7a5a', 1.6));
      const d = new THREE.DirectionalLight('#fff1d6', 2.4); d.position.set(-3, 6, 5); this.artScene.add(d);
      this.artCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    }
    const obj = build();
    this.artScene.add(obj);
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y * 1.05, size.z) * 0.62;
    const dist = r / Math.tan((30 * Math.PI) / 360) * 1.05;
    this.artCam.position.set(c.x + dist * 0.45, c.y + dist * 0.42, c.z + dist * 0.79);
    this.artCam.lookAt(c.x, c.y - size.y * 0.04, c.z);
    this.artRenderer.render(this.artScene, this.artCam);
    const url = this.artRenderer.domElement.toDataURL('image/png');
    this.artScene.remove(obj);
    this.artCache.set(key, url);
    return url;
  }
  cardArt(id) { return this.artFor('card:' + id, () => cardModel(id)); }
  champArt(id) { return this.artFor('champ:' + id, () => championFigure(id)); }
}
