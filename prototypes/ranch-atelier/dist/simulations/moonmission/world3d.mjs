// AW-STUDY-0036 Moon Mission in the 3D world. Hi-fi low-poly scenes for each micro-zone (zones.mjs), driven by the mission
// engine's effects. Everything here is in-fiction (truck, rocket, signs, boards); the HUD lives outside the canvas.
// Heroes are placeholder faceted figures until the Meshy heroes land: drop a GLB at HERO_URL(id) and it replaces the stand-in.
// Coordinates in each scene are local metres (three.js: x east, y up, -z north). Main Street is the coffee shop curb.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const HERO_URL = id => `/studies/moon-mission/heroes/${id}.glb`;
const HEROES = {daddy: {suit: 0xffffff, trim: 0x6f9bff, skin: 0xe0b08c, h: 1.8}, abbie: {suit: 0xffffff, trim: 0xff7eb6, skin: 0xe8c0a0, h: 1.15}, ani: {suit: 0xffffff, trim: 0xb18cff, skin: 0xddb08c, h: 1.2}};
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({color: c, flatShading: true, roughness: .85, metalness: 0, ...o});
const box = (w, h, d, c, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (rt, rb, h, c, seg = 10, o) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c, o)); m.castShadow = true; return m; };
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const add = (g, ...os) => { os.forEach(o => g.add(o)); return g; };

function label(text, w, h, bg, fg, font = 'bold 64px sans-serif') {
 const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
 g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height / 2);
 const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: t}));
}

export function hero(id, suited = true) {
 const s = HEROES[id], g = new THREE.Group(), k = s.h / 1.8;
 const body = at(cyl(.22 * k, .26 * k, .8 * k, suited ? s.suit : 0x7a8aa8, 8), 0, 1.0 * k, 0), belt = at(cyl(.27 * k, .27 * k, .08 * k, s.trim, 8), 0, .8 * k, 0);
 const head = at(new THREE.Mesh(new THREE.IcosahedronGeometry(.2 * k, 1), mat(s.skin)), 0, 1.6 * k, 0);
 const legs = [-.1, .1].map(x => at(cyl(.09 * k, .09 * k, .6 * k, suited ? s.suit : 0x4a5570, 6), x * k, .3 * k, 0));
 const arms = [-.3, .3].map(x => at(cyl(.07 * k, .07 * k, .6 * k, suited ? s.suit : 0x7a8aa8, 6), x * k, 1.05 * k, 0));
 add(g, body, belt, head, ...legs, ...arms);
 if (suited) { const hl = at(new THREE.Mesh(new THREE.SphereGeometry(.26 * k, 12, 10), mat(0xbfe4ff, {transparent: true, opacity: .35, roughness: .1})), 0, 1.6 * k, 0); const patch = at(new THREE.Mesh(new THREE.CircleGeometry(.07 * k, 8), new THREE.MeshBasicMaterial({color: s.trim})), -.13 * k, 1.2 * k, .22 * k); add(g, hl, patch); }
 g.userData = {id, bob: 0}; g.traverse(o => { if (o.isMesh) o.castShadow = true; });
 return g;
}
function swapHeroGLB(group, id) { // quiet: a missing file leaves the placeholder
 new GLTFLoader().load(HERO_URL(id), gl => { const m = gl.scene; const box3 = new THREE.Box3().setFromObject(m), h = box3.max.y - box3.min.y; m.scale.setScalar(HEROES[id].h / h); group.clear(); group.add(m); }, undefined, () => {});
}

export function rocket(scale = 1) {
 const g = new THREE.Group(), pink = 0xff7eb6, white = 0xf6f7fb;
 add(g, at(cyl(1.2, 1.5, 7, white, 14), 0, 4.5, 0), at(new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 14), mat(pink)), 0, 9.3, 0), at(cyl(1.52, 1.52, .5, pink, 14), 0, 1.6, 0), at(cyl(1.3, 1.4, .3, pink, 14), 0, 6.2, 0));
 const win = at(new THREE.Mesh(new THREE.CircleGeometry(.5, 14), new THREE.MeshBasicMaterial({color: 0x7fb4ff})), 0, 6.9, 1.24); g.add(win);
 for (let i = 0; i < 4; i++) { const f = box(.2, 2.4, 1.6, pink); const a = i * Math.PI / 2; f.position.set(Math.sin(a) * 1.7, 1.4, Math.cos(a) * 1.7); f.rotation.y = a; g.add(f); }
 const flame = at(new THREE.Mesh(new THREE.ConeGeometry(.9, 3, 10), new THREE.MeshBasicMaterial({color: 0xffb46b})), 0, -1.1, 0); flame.rotation.x = Math.PI; flame.visible = false; flame.name = 'flame'; g.add(flame);
 g.scale.setScalar(scale); return g;
}
function truck() {
 const g = new THREE.Group(), black = 0x15171c;
 add(g, at(box(5.4, 1.5, 2.2, black), 0, 1.35, 0), at(box(1.9, 1.2, 2.1, black), 1.9, 2.3, 0), at(box(1.0, .5, 2.12, 0x7fb4ff, {roughness: .2}), 2.25, 2.35, 0), at(box(.1, .5, .5, 0xffc94a), 0, 1.6, 1.12), at(box(.1, .5, .5, 0xffc94a), 0, 1.6, -1.12));
 for (const x of [-1.8, 1.8]) for (const z of [-1.1, 1.1]) { const w = cyl(.5, .5, .4, 0x0a0a0c, 12); w.rotation.x = Math.PI / 2; w.position.set(x, .5, z); g.add(w); }
 const star = label('MOON MISSION', 3, .5, '#15171c', '#ffc94a', 'bold 44px sans-serif'); star.position.set(-.4, 1.55, 1.13); g.add(star); const s2 = star.clone(); s2.position.z = -1.13; s2.rotation.y = Math.PI; g.add(s2);
 const light = at(box(.3, .12, 1.2, 0xff4a4a, {emissive: 0xff2020}), 1.9, 2.95, 0); g.add(light); return g;
}
function stars(n = 600, r = 400) { const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1); p.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3); }
 const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({color: 0xffffff, size: 1.6, sizeAttenuation: false})); }
function room(w, d, c, floorC) { const g = new THREE.Group(); add(g, at(box(w, .2, d, floorC), 0, -.1, 0), at(box(w, 3, .2, c), 0, 1.5, -d / 2), at(box(.2, 3, d, c), -w / 2, 1.5, 0), Object.assign(at(box(.2, 3, d, c), w / 2, 1.5, 0), {name: 'cut'}), Object.assign(at(box(w, .2, d, 0xf2eee4), 0, 3.1, 0), {name: 'cut'}), Object.assign(at(box(w, 3, .2, c), 0, 1.5, d / 2 + 4), {name: 'cut'})); return g; }

const BUILD = {
 'main-street'(S) {
  const g = new THREE.Group(); add(g, at(box(400, .2, 300, 0xa7a79f), 0, -.15, 0), at(box(400, .05, 12, 0x3a3d45), 0, -.02, 6)); // pavement, asphalt street
  add(g, at(box(400, .3, 4, 0xcfcfc6), 0, .0, -4), at(box(400, .12, .3, 0xffffff), 0, .02, 6)); // sidewalk, centre line
  const cafe = new THREE.Group(); add(cafe, at(box(12, 6, 9, 0xb4553a), 0, 3, 0), at(box(12.4, .5, 9.4, 0xe9e2d0), 0, 6.2, 0), at(box(8, .3, 3, 0x3a8f7f), 0, 3.6, 5.2), at(box(2, 3.2, .2, 0x6a3c24), 3.5, 1.6, 4.55), at(box(3.4, 2.2, .2, 0xffe9b0, {emissive: 0xffc870, emissiveIntensity: .35}), -2.5, 2.2, 4.55)); // coffee shop front toward +z (the street)
  const sign = label('COFFEE', 6, 1.4, '#3a2a1a', '#ffe9b0', 'bold 90px serif'); sign.position.set(0, 4.7, 4.56); cafe.add(sign); cafe.position.set(0, 0, -12); g.add(cafe);
  [[-18, 0xd9a441], [-28, 0x5d8fb0], [18, 0xc27ba0], [28, 0x8aa86a]].forEach(([x, c], i) => { const b = box(10, 5 + (i % 2) * 2, 8, c); b.position.set(x, b.geometry.parameters.height / 2, -12); g.add(b); });
  const church = new THREE.Group(); add(church, at(box(10, 8, 16, 0xf6f4ee), 0, 4, 0), at(box(4, 14, 4, 0xf6f4ee), 0, 7, 8), at(new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 4), mat(0xf6f4ee)), 0, 17.5, 8)); church.position.set(-46, 0, -20); church.rotation.y = .4; g.add(church);
  for (const x of [-36, -10, 14, 36]) { const t = new THREE.Group(); add(t, at(cyl(.3, .4, 3, 0x6b4a2f, 6), 0, 1.5, 0), at(new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), mat(0x5fa05b)), 0, 4.5, 0)); t.position.set(x, 0, -3); g.add(t); }
  S.truck = truck(); S.truck.position.set(-80, 0, 7.5); g.add(S.truck);
  S.port = new THREE.Group(); add(S.port, at(cyl(15, 15, .3, 0x6c7384, 40), 0, .1, 0), at(cyl(11, 11, .35, 0x2c313d, 40), 0, .15, 0)); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; S.port.add(at(box(.5, .08, 1.4, i % 2 ? 0xffc94a : 0x15171c), Math.sin(a) * 13, .3, Math.cos(a) * 13)); } S.port.position.set(22, 0, 4); S.port.scale.set(0, 0, 0); g.add(S.port);
  S.rocket = rocket(1); S.rocket.position.set(22, 160, 4); S.rocket.visible = false; g.add(S.rocket);
  S.heroes = { daddy: at(hero('daddy', false), 1, 0, 3), abbie: at(hero('abbie', false), 3, 0, 3.6), ani: at(hero('ani', false), 5, 0, 3.2) }; for (const h of Object.values(S.heroes)) { h.rotation.y = .3; g.add(h); }
  return g;
 },
 'interior'(S, z) { const [w, d] = z.size, pal = {kitchen: [0xf4e3c0, 0x9a7a54], 'tree-house': [0xc9a46a, 0x7a5a3a], galley: [0xe6efe4, 0x8a9a88]}[z.id] || [0xe8e0d0, 0x9a8a70];
  const g = room(Math.max(w, 6) * 1.6, Math.max(d, 5) * 1.6, pal[0], pal[1]); const tbl = new THREE.Group(); add(tbl, at(box(3, .15, 1.4, 0x8a5a36), 0, .9, 0), ...[[-1.3, -.5], [1.3, -.5], [-1.3, .5], [1.3, .5]].map(([x, zz]) => at(box(.12, .9, .12, 0x6a3c24), x, .45, zz))); g.add(at(tbl, 0, 0, -1));
  add(g, at(box(2.4, 1.6, .1, 0xbfe4ff, {emissive: 0xfff2c0, emissiveIntensity: .7}), 3, 2.1, -d * .8 + .15));
  if (z.id === 'tree-house') add(g, at(box(4, .2, 3, 0x7a5a3a), 0, .5, -1.5), label("ABBIE'S TREE HOUSE", 4, .8, '#7a5a3a', '#ffe9b0', 'bold 52px sans-serif').translateY(2.6).translateZ(-d * .8 + .2));
  S.heroes = {abbie: at(hero('abbie', true), -1.2, 0, 1), ani: at(hero('ani', true), 1.2, 0, 1), daddy: at(hero('daddy', false), 4.4, 0, -.5)}; if (z.id !== 'tree-house' && z.id !== 'galley') S.heroes.abbie = at(hero('abbie', false), -1.2, 0, 1); for (const h of Object.values(S.heroes)) g.add(h); return g; },
 'launch'(S, z) { const g = new THREE.Group(); add(g, at(box(400, .2, 400, 0xc8b79a), 0, -.1, 0), at(cyl(14, 14, .4, 0x555b6a, 40), 0, .1, 0), at(box(3, 26, 3, 0xd04a3a), 8, 13, 0), at(box(10, 1, 1.4, 0xd04a3a), 4, 22, 0));
  S.rocket = at(rocket(1), 0, .3, 0); g.add(S.rocket); S.heroes = {daddy: at(hero('daddy', true), -5, 0, 14), abbie: at(hero('abbie', true), -7.2, 0, 14.6), ani: at(hero('ani', true), -9, 0, 14)}; for (const h of Object.values(S.heroes)) g.add(h); return g; },
 'briefing'(S) { const g = room(18, 12, 0xd7dde8, 0x8a8f9c); S.board = label('', 8, 4.5, '#ffffff', '#111'); S.board.position.set(0, 1.9, -5.8); g.add(S.board); S.boardCtx = null;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 576; S.boardCanvas = c; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1024, 576); S.boardTex = new THREE.CanvasTexture(c); S.boardTex.colorSpace = THREE.SRGBColorSpace; S.board.material.map = S.boardTex; S.board.scale.set(1, 1, 1);
  S.heroes = {daddy: at(hero('daddy', true), -3, 0, 2), abbie: at(hero('abbie', true), 0, 0, 2.2), ani: at(hero('ani', true), 3, 0, 2)}; for (const h of Object.values(S.heroes)) { h.rotation.y = Math.PI; g.add(h); } return g; },
 'bus'(S) { const g = room(5, 14, 0x2f3a52, 0x555b6a); for (let i = 0; i < 4; i++) for (const x of [-1.3, 1.3]) g.add(at(box(1.1, 1, 1.1, 0x3d6fb0), x, .5, -4 + i * 2.6)); S.heroes = {daddy: at(hero('daddy', true), -1.3, .3, -1.4), abbie: at(hero('abbie', true), 1.3, .3, -1.4), ani: at(hero('ani', true), 1.3, .3, 1.2)}; for (const h of Object.values(S.heroes)) g.add(h); return g; },
 'capsule'(S) { const g = new THREE.Group(); add(g, at(cyl(3.2, 3.2, 5, 0xdfe5f0, 16), 0, 0, 0)); g.children[0].rotation.x = Math.PI / 2; g.children[0].material.side = THREE.BackSide; const panel = box(5.2, 1.6, .4, 0x14182a); panel.position.set(0, .2, -2.4); g.add(panel); S.lights = [];
  for (let i = 0; i < 12; i++) { const l = at(box(.28, .28, .1, 0x333a55, {emissive: 0x000000}), -2 + (i % 6) * .8, .6 - Math.floor(i / 6) * .6, -2.18); S.lights.push(l); g.add(l); } at(g, 0, 0, 0);
  S.windowDisc = at(new THREE.Mesh(new THREE.CircleGeometry(.7, 20), new THREE.MeshBasicMaterial({color: 0x7fb4ff})), 0, 1.5, -2.17); g.add(S.windowDisc);
  S.heroes = {daddy: at(hero('daddy', true), -1.7, -1.2, -.4), abbie: at(hero('abbie', true), 0, -1.2, -.4), ani: at(hero('ani', true), 1.7, -1.2, -.4)}; for (const h of Object.values(S.heroes)) { h.rotation.y = Math.PI; g.add(h); } return g; },
 'orbit'(S) { const g = new THREE.Group(); const earth = new THREE.Mesh(new THREE.SphereGeometry(60, 28, 20), mat(0x3d82d6)); earth.position.set(-20, -80, -60); g.add(earth); for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(8 + Math.random() * 6, 0), mat(0x5fa05b)); const a = Math.random() * 6.28, b = Math.random() * 1.2 - .1; c.position.set(-20 + Math.sin(a) * 58 * Math.cos(b), -80 + Math.sin(b) * 58 + 4, -60 + Math.cos(a) * 58 * Math.cos(b)); if (c.position.y > -80) g.add(c); } S.earth = earth;
  S.rocket = at(rocket(.4), 4, 0, -10); S.rocket.rotation.z = -.4; S.rocket.getObjectByName('flame').visible = true; g.add(S.rocket); g.add(stars()); return g; },
 'lunar-descent'(S) { const g = new THREE.Group(); g.add(at(box(600, .5, 600, 0x8a8d96), 0, -.25, 0)); for (let i = 0; i < 40; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 3, 0), mat(0x6e717b)); r.position.set((Math.random() - .5) * 400, 0, -Math.random() * 300 + 40); g.add(r); } g.add(stars());
  const ln = new THREE.Group(); add(ln, at(box(2.4, 1.6, 2.4, 0xf6f7fb), 0, 1.6, 0), at(box(2.4, .4, 2.4, 0xff7eb6), 0, 2.6, 0)); for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) { const l = box(.15, 1.7, .15, 0xcfd6e6); l.position.set(x, .8, z); l.rotation.set(z * .18, 0, -x * .18); ln.add(l); }
  S.lander = ln; g.add(ln); S.glow = new THREE.PointLight(0xffe9b0, 0, 40); ln.add(S.glow); S.flame = at(new THREE.Mesh(new THREE.ConeGeometry(.8, 3, 8), new THREE.MeshBasicMaterial({color: 0xffb46b})), 0, -.4, 0); S.flame.rotation.x = Math.PI; S.flame.visible = false; ln.add(S.flame); return g; },
 'moon-base-pad'(S) { const g = new THREE.Group(); g.add(at(box(600, .5, 600, 0x7d808a), 0, -.25, 0)); g.add(at(cyl(10, 10, .3, 0x3a3f4d, 30), 0, .1, 0)); for (let i = 0; i < 30; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 3, 0), mat(0x666a75)); const a = Math.random() * 6.28, d = 40 + Math.random() * 120; r.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 40); g.add(r); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 12, 0, 6.283, 0, Math.PI / 2), mat(0xdfe5f0, {transparent: true, opacity: .8})); dome.position.set(0, 0, -34); g.add(dome); g.add(at(box(4, 3.2, 3, 0x555b6a), 0, 1.6, -26), at(box(1.6, 2.2, .2, 0x6fe3a5, {emissive: 0x6fe3a5, emissiveIntensity: .9}), 0, 1.2, -24.4)); g.add(at(box(.4, 18, .4, 0xcfd6e6), 20, 9, -40), at(new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), mat(0xff7eb6, {emissive: 0xff7eb6, emissiveIntensity: .7})), 20, 18.5, -40));
  S.rocket = at(rocket(.5), 0, .3, 0); g.add(S.rocket); g.add(stars()); S.heroes = {daddy: at(hero('daddy', true), -4, 0, 12), abbie: at(hero('abbie', true), -6, 0, 12.6), ani: at(hero('ani', true), -8, 0, 12)}; for (const h of Object.values(S.heroes)) g.add(h); return g; },
};
const KIND = {'main-street': 'main-street', 'church-park': 'main-street', kitchen: 'interior', 'tree-house': 'interior', galley: 'interior', 'launch-pad': 'launch', 'briefing-room': 'briefing', 'crew-bus': 'bus', capsule: 'capsule', orbit: 'orbit', 'lunar-descent': 'lunar-descent', 'moon-base-pad': 'moon-base-pad'};
// camera: first person at eye height, slow dolly per zone; the player can drag to look around
const CAMS = {'main-street': {p: [2, 1.8, 20], t: [6, 3.5, -4]}, kitchen: {p: [0, 1.6, 4.5], t: [0, 1.2, 0]}, 'tree-house': {p: [0, 1.5, 4], t: [0, 1.1, -1]}, galley: {p: [0, 1.6, 4.5], t: [0, 1.2, 0]}, 'launch-pad': {p: [-12, 1.7, 26], t: [0, 6, 0]}, 'briefing-room': {p: [0, 1.6, 7], t: [0, 1.9, -5]}, 'crew-bus': {p: [0, 1.4, 6.5], t: [0, 1.1, -1]}, capsule: {p: [0, .1, 2.4], t: [0, .3, -2.4]}, orbit: {p: [0, 2, 12], t: [0, 0, -10]}, 'lunar-descent': {p: [0, 14, 36], t: [0, 12, 0]}, 'moon-base-pad': {p: [-8, 1.7, 22], t: [0, 4, -10]}};
const ISO = {'main-street': {t: [6, 0, 0], h: 12}, kitchen: {t: [0, 0, 0], h: 5}, 'tree-house': {t: [0, 0, 0], h: 5.5}, galley: {t: [0, 0, 0], h: 6}, 'launch-pad': {t: [-2, 3, 6], h: 14}, 'briefing-room': {t: [0, 0, 0], h: 8}, 'crew-bus': {t: [0, 0, 0], h: 6}, capsule: {t: [0, -.6, 0], h: 4}, orbit: {t: [0, 0, -10], h: 12}, 'lunar-descent': {t: [0, 6, 0], h: 14}, 'moon-base-pad': {t: [-4, 2, 6], h: 12}};
const INSIDE = {kitchen: 0x3a3631, 'tree-house': 0x4a3d2c, galley: 0x35403a, 'briefing-room': 0x2d3342, 'crew-bus': 0x232a3c, capsule: 0x151a2c};
const SKY = {light: 0xbfe3ff, dark: 0x03050d};

export function createWorld(canvas, ZONES) {
 const renderer = new THREE.WebGLRenderer({canvas, antialias: true}); renderer.shadowMap.enabled = true; renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
 const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(62, 1, .1, 900), ocam = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400); scene.background = new THREE.Color(SKY.light);
 const sun = new THREE.DirectionalLight(0xffffff, 2.4), hemi = new THREE.HemisphereLight(0xdff0ff, 0x8a8470, 1.1); sun.position.set(30, 50, 30); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, {left: -50, right: 50, top: 50, bottom: -50}); scene.add(sun, hemi);
 let iso = new URLSearchParams(location.search).get('view') !== 'fp', S = {}, cur = null, curId = null, mood = 'light', shake = 0, look = {yaw: 0, pitch: 0}, t = 0, camT = {p: new THREE.Vector3(), t: new THREE.Vector3()}, liftoff = 0, drop = null, truckT = -1, driving = false;
 const heroIds = ['daddy', 'abbie', 'ani'];
 function setMood(m) { mood = m; }
 function setZone(id, m) {
  if (cur) scene.remove(cur); S = {}; const z = {...ZONES[id], id}; cur = BUILD[KIND[id]](S, z); scene.add(cur); curId = id; mood = m || z.mood; look = {yaw: 0, pitch: 0}; liftoff = 0; drop = null;
  cur.traverse(o => { if (o.name === 'cut') o.visible = !iso; });
  if (S.heroes) for (const hid of heroIds) if (S.heroes[hid]) swapHeroGLB(S.heroes[hid], hid);
  const c = CAMS[id] || CAMS['main-street']; camT.p.set(...c.p); camT.t.set(...c.t); cam.position.copy(camT.p).add(new THREE.Vector3(0, 0, 3));
  if (id === 'main-street' && !S.launched) { truckT = 0; driving = true; }
 }
 function board(draw, color) { if (!S.boardCanvas) return; const g = S.boardCanvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 576); g.strokeStyle = color; g.lineWidth = 8; g.lineCap = 'round'; S.stroke = {draw, color, n: 0, t0: t}; }
 const STROKES = {rocket: [[[512, 90], [440, 250], [440, 440], [584, 440], [584, 250], [512, 90]], [[440, 440], [390, 500]], [[584, 440], [634, 500]], [[512, 330], [512, 330]]], hose: [[[300, 200], [300, 400], [500, 460], [700, 340], [760, 200]]], bulb: [[[512, 130], [440, 220], [470, 320], [554, 320], [584, 220], [512, 130]], [[480, 360], [544, 360]], [[480, 400], [544, 400]]], lever: [[[400, 440], [620, 440]], [[510, 440], [610, 180]], [[610, 180], [610, 180]]], count: [[[400, 160], [400, 420]], [[500, 160], [580, 160], [580, 420], [500, 420], [500, 160]], [[680, 160], [680, 420]]]};
 function drawBoard() { if (!S.stroke || !S.boardTex) return; const {draw, color, t0} = S.stroke, p = Math.min(1, (t - t0) / 1.8), g = S.boardCanvas.getContext('2d'); const paths = STROKES[draw] || []; g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 576); g.strokeStyle = color; g.lineWidth = 9; g.lineCap = g.lineJoin = 'round';
  let total = paths.reduce((a, s) => a + s.length - 1, 0) || 1, left = p * total; for (const s of paths) { g.beginPath(); g.moveTo(...s[0]); for (let i = 1; i < s.length && left > 0; i++) { const f = Math.min(1, left); g.lineTo(s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f); left -= 1; } g.stroke(); } S.boardTex.needsUpdate = true; }
 function onFx(e) {
  if (e.fx === 'zone') setZone(e.id, e.mood);
  else if (e.fx === 'mood') setMood(e.to);
  else if (e.fx === 'kaboom' && S.rocket && S.port) { S.rocket.visible = true; S.rocket.position.y = 160; drop = {t: 0}; S.port.scale.set(.01, .01, .01); }
  else if (e.fx === 'liftoff' && S.rocket) { liftoff = 1; shake = 1.2; if (S.rocket.getObjectByName('flame')) S.rocket.getObjectByName('flame').visible = true; }
  else if (e.fx === 'board') board(e.draw, e.color);
  else if (e.fx === 'stamp') shake = Math.max(shake, .3);
  else if (e.fx === 'job-done' && S.lights) { const n = S.lights.findIndex(l => l.material.emissive.getHex() === 0); if (n >= 0) { S.lights[n].material.emissive.setHex(0x6fe3a5); S.lights[n].material.color.setHex(0x6fe3a5); } }
  else if (e.fx === 'speak' && S.heroes && S.heroes[e.who]) S.heroes[e.who].userData.bob = 1;
 }
 function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); } const iz = (ISO[curId] || ISO['main-street']).h, a = w / h; Object.assign(ocam, {left: -iz * a, right: iz * a, top: iz, bottom: -iz}); ocam.updateProjectionMatrix(); }
 function tick(dt, view, thrust) {
  t += dt; resize(); const k = 1 - Math.pow(.02, dt);
  const sky = new THREE.Color(INSIDE[curId] || SKY[mood]); scene.background.lerp(sky, k); sun.intensity += ((mood === 'light' ? 2.4 : .9) - sun.intensity) * k; hemi.intensity += ((mood === 'light' ? 1.1 : .35) - hemi.intensity) * k; sun.color.set(mood === 'light' ? 0xffffff : 0xaec6ff);
  if (driving && S.truck) { truckT += dt; const f = Math.min(1, truckT / 5), e = 1 - Math.pow(1 - f, 3); S.truck.position.x = -80 + (-9 + 80) * e; if (f >= 1) driving = false; }
  if (drop && S.rocket && S.port) { drop.t += dt; const f = Math.min(1, drop.t / .9); S.port.scale.setScalar(Math.max(.01, f)); // the rocket port lands, then the ship falls right after
   if (drop.t > .9) { const g = Math.min(1, (drop.t - .9) / 0.7); S.rocket.position.y = 160 * (1 - g * g); if (g >= 1) { drop = null; shake = 1.4; S.launched = true; } } }
  if (liftoff && S.rocket) { liftoff += dt; S.rocket.position.y += Math.pow(liftoff, 2) * 3 * dt * 6; shake = Math.max(shake, .5); }
  if (S.rocket && curId === 'orbit') { S.rocket.position.y = Math.sin(t) * .3; }
  if (S.earth) S.earth.rotation.y += dt * .05;
  if (S.lander && view && view.step && view.step.k === 'lander' && view.step.lander) { const L = view.step.lander; S.lander.position.set(L.x * .15, Math.max(0, L.alt) * .07, 0); S.lander.rotation.z = -L.tilt * .5; S.flame.visible = !!thrust; S.glow.intensity = L.lights ? 60 : 0; }
  if (S.heroes) for (const h of Object.values(S.heroes)) { if (h.userData.bob > 0) { h.userData.bob -= dt * 2.5; h.position.y = Math.max(0, Math.sin(h.userData.bob * 6) * .08); } }
  if (S.stroke) drawBoard();
  const c = CAMS[curId] || CAMS['main-street']; const dolly = Math.sin(t * .25) * .35;
  cam.position.lerp(camT.p.clone().add(new THREE.Vector3(dolly, Math.sin(t * .9) * .03, 0)), k);
  const tgt = camT.t.clone(); const dir = tgt.clone().sub(camT.p); const base = Math.atan2(dir.x, -dir.z); const yaw = base + look.yaw; const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z)) + look.pitch;
  const far = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)); cam.lookAt(cam.position.clone().add(far));
  if (shake > 0) { cam.position.x += (Math.random() - .5) * shake * .3; cam.position.y += (Math.random() - .5) * shake * .3; shake = Math.max(0, shake - dt * 1.6); }
  if (iso) { const z = ISO[curId] || ISO['main-street'], t3 = new THREE.Vector3(...z.t); if (view && view.step && view.step.k === 'lander' && S.lander) t3.y = S.lander.position.y; ocam.position.copy(t3).add(new THREE.Vector3(26, 26, 26)).add(new THREE.Vector3(look.yaw * -12, look.pitch * 12, 0)); ocam.lookAt(t3); if (shake > 0) ocam.position.x += (Math.random() - .5) * shake * .3; }
  renderer.render(scene, iso ? ocam : cam);
 }
 let drag = null; canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, look.yaw, look.pitch]; canvas.setPointerCapture(e.pointerId); });
 canvas.addEventListener('pointermove', e => { if (drag) { look.yaw = Math.max(-1.2, Math.min(1.2, drag[2] - (e.clientX - drag[0]) * .004)); look.pitch = Math.max(-.5, Math.min(.5, drag[3] - (e.clientY - drag[1]) * .003)); } });
 canvas.addEventListener('pointerup', () => { drag = null; });
 return {setZone, onFx, tick, get iso() { return iso; }, setIso(v) { iso = v; if (cur) cur.traverse(o => { if (o.name === 'cut') o.visible = !iso; }); }, scene, cam, get zone() { return curId; }, get state() { return S; }};
}
