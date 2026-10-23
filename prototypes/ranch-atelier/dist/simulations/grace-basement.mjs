import * as T from 'three';
import {createGraceComputer, createGraceKeyboard, createGraceFloppy} from './grace-computer.mjs';
import {DISKS, drawCoin} from './grace-dos.mjs';

// Aunt Grace's basement, 1986 (AW-STUDY-0024): the office under the café. A 2.5D side-view set in the manner of the
// 1980s animated adventure games: a cutaway room seen from the side, stairs down from a door on the left, a bare bulb
// over a desk with Grace's computer, shelves, a furnace and a high window. Dark and dingy until the light comes on.
// World units are metres; x runs along the room (stairs at 0..3), y is up, the back wall is at z = -1.5 and the
// cutaway front is open. Everything here is world layer: in the fiction, perceivable.
export const ROOM = {x0: -.3, x1: 8.3, back: -1.5, ceil: 2.6, landing: 1.6, stairs: [.9, 2.9], walkZ: -.42,
 chair: {x: 4.62, z: -.62}, desk: {x0: 4.85, x1: 6.25, z0: -.98, z1: -.3, top: .76}, bulb: {x: 5.25, y: 2.02, z: -.62}, switch: {x: 1.07, y: 2.62},
 lamp1: {x: 3.3, y: 2.2, z: -.75}, outlet: {x: 5.95, y: .32}};

// Walkable floor height under x: the landing, the stairs, then the concrete.
export function floorY(x) {
 const [a, b] = ROOM.stairs;
 return x <= a ? ROOM.landing : x >= b ? 0 : ROOM.landing * (1 - Math.ceil((x - a) / .25 - 1e-6) / 8);
}

// Small pixel textures painted in code, read with nearest filtering so they stay chunky.
function paint(w, h, fn, repeat = [1, 1]) {
 const c = Object.assign(document.createElement('canvas'), {width: w, height: h}), g = c.getContext('2d'); fn(g, w, h);
 const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.colorSpace = T.SRGBColorSpace;
 t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); return t;
}
const noise = (g, w, h, cols, n) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 1); } };

export function createBasement() {
 const root = new T.Group(); root.name = "Grace's basement";
 const M = (name, o) => Object.assign(new T.MeshStandardMaterial({roughness: .9, flatShading: true, ...o}), {name});
 const add = (name, g, m, x, y, z, p = root) => { const o = new T.Mesh(g, m); o.name = name; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
 const box = (name, w, h, d, m, x, y, z, p) => add(name, new T.BoxGeometry(w, h, d), m, x, y, z, p);

 const block = paint(64, 32, (g, w, h) => { g.fillStyle = '#6f6a5f'; g.fillRect(0, 0, w, h); noise(g, w, h, ['#7a7568', '#625d53', '#6a655a'], 500);
  g.fillStyle = '#4c4840'; for (let y = 0; y < h; y += 16) { g.fillRect(0, y, w, 2); for (let x = (y / 16 % 2) * 16; x < w; x += 32) g.fillRect(x, y, 2, 16); } }, [9, 6]);
 const concrete = paint(64, 64, (g, w, h) => { g.fillStyle = '#4e4a44'; g.fillRect(0, 0, w, h); noise(g, w, h, ['#57524b', '#45413c', '#5c564d', '#3f3b36'], 1400);
  g.fillStyle = '#3b3833'; for (let i = 0; i < 18; i++) g.fillRect(10 + i * 2, 30 + Math.sin(i) * 3 | 0, 2, 1); }, [6, 2]);
 const wood = paint(32, 32, (g, w, h) => { g.fillStyle = '#6b4a2f'; g.fillRect(0, 0, w, h); g.fillStyle = '#5a3d26'; for (let y = 2; y < h; y += 5) g.fillRect(0, y, w, 1); noise(g, w, h, ['#7a5636', '#563a24'], 120); });

 const wall = M('cinder block wall painted', {map: block, color: '#c9c2b4'}), floor = M('concrete floor', {map: concrete}), timber = M('stair timber', {map: wood, color: '#b08a66'});
 const joistM = M('joist timber', {map: wood, color: '#8a6a4e'}), pipe = M('copper pipe', {color: '#8a5a3a', roughness: .5, metalness: .5}), iron = M('black iron', {color: '#2a2a2c', roughness: .6, metalness: .4});

 // Shell: floor, back wall (tall over the stairwell), side walls, the ceiling slab with joists, the dark storey above.
 box('floor', ROOM.x1 - ROOM.x0, .2, 3.2, floor, (ROOM.x0 + ROOM.x1) / 2, -.1, .1);
 box('back wall', ROOM.x1 - 2.3, ROOM.ceil, .2, wall, (2.3 + ROOM.x1) / 2, ROOM.ceil / 2, ROOM.back - .1);
 box('stairwell wall', 2.3 - ROOM.x0, 4.6, .2, wall, (ROOM.x0 + 2.3) / 2, 2.3, ROOM.back - .1);
 box('left wall', .2, 4.6, 3.2, wall, ROOM.x0 - .1, 2.3, .1);
 box('right wall', .2, 2.9, 3.2, wall, ROOM.x1 + .1, 1.45, .1);
 box('ceiling slab', ROOM.x1 - 2.3, .28, 3.2, M('subfloor boards', {map: wood, color: '#5b4632'}), (2.3 + ROOM.x1) / 2, ROOM.ceil + .14, .1);
 for (let x = 2.45; x < ROOM.x1; x += .42) box('joist', .06, .2, 3.1, joistM, x, ROOM.ceil - .1, .1);
 box('stairwell header', .2, .3, 3.2, joistM, 2.3, ROOM.ceil + .05, .1);

 // Landing, door ajar with the hall light behind it, and the light switch.
 box('landing', 1.2, .14, 1.4, timber, .3, ROOM.landing - .07, -.75);
 box('landing post', .09, ROOM.landing, .09, timber, .86, ROOM.landing / 2, -.1);
 box('door frame', .9, .08, .1, timber, .45, ROOM.landing + 2.04, ROOM.back + .02);
 for (const x of [.02, .88]) box('door frame', .07, 2.04, .1, timber, x, ROOM.landing + 1.02, ROOM.back + .02);
 const hall = box('hall light', .78, 1.98, .02, new T.MeshBasicMaterial({color: '#ffd9a0', name: 'hall light warm'}), .45, ROOM.landing + 1, ROOM.back - .03); hall.castShadow = false;
 const door = new T.Group(); door.name = 'door'; door.position.set(.07, ROOM.landing, ROOM.back + .02); root.add(door);
 box('door slab', .74, 1.98, .05, M('painted door', {color: '#7b6a55'}), .37, .99, 0, door).position.z = .03;
 box('door knob', .05, .05, .06, M('brass knob', {color: '#b0903a', metalness: .6, roughness: .4}), .66, .95, .08, door);
 door.rotation.y = -.42;
 // Three switches on one old plate. Only one pattern (up, down, up) lights both lamps; Grace never labelled them.
 const sw = new T.Group(); sw.name = 'light switches'; sw.position.set(ROOM.switch.x, ROOM.switch.y, ROOM.back + .01); root.add(sw);
 box('switch plate', .2, .13, .015, M('switch plate', {color: '#d8d0bd'}), 0, 0, 0, sw);
 const toggleM = M('switch toggle', {color: '#e8e2d2'});
 const toggles = [-1, 0, 1].map((i, n) => { const t = box(`switch toggle ${n + 1}`, .022, .045, .032, toggleM, i * .06, -.016, .016, sw); box('switch slot', .03, .06, .004, M('switch slot', {color: '#3a352c'}), i * .06, 0, .009, sw).castShadow = false; return t; });
 const toggle = toggles[0];
 const glowDot = box('glow-in-the-dark dot', .02, .02, .005, new T.MeshBasicMaterial({color: '#8dffb0', name: 'glow paint'}), 0, .05, .01, sw); glowDot.castShadow = false;

 // Stairs: eight treads with risers and a stringer, and a plain rail.
 for (let i = 0; i < 8; i++) { const x = ROOM.stairs[0] + i * .25 + .125, y = ROOM.landing - (i + 1) * .2;
  box('stair tread', .27, .04, .95, timber, x, y - .02, ROOM.walkZ); box('stair riser', .02, .2, .95, timber, x - .125, y + .1 - .02, ROOM.walkZ); }
 const run = Math.hypot(2, ROOM.landing), ang = Math.atan2(ROOM.landing, 2);
 for (const z of [ROOM.walkZ - .5, ROOM.walkZ + .5]) { const s = box('stair stringer', run, .22, .05, timber, 1.9, ROOM.landing / 2 - .1, z); s.rotation.z = -ang; }
 const rail = box('stair rail', run, .05, .05, timber, 1.9, ROOM.landing / 2 + .85, ROOM.walkZ + .52); rail.rotation.z = -ang;
 for (let i = 0; i <= 4; i++) box('rail post', .04, .9, .04, timber, .9 + i * .5, ROOM.landing - i * .4 + .4, ROOM.walkZ + .52);
 box('under-stair box', .6, .4, .5, M('cardboard', {color: '#8c6b45'}), 1.5, .2, -1.1); box('under-stair box', .45, .32, .4, M('cardboard', {color: '#7d5f3d'}), 1.6, .56, -1.12);

 // Shelves between the stairs and the desk: paint cans, jars, boxes.
 const shelfM = M('grey steel shelving', {color: '#6b6e70', metalness: .3, roughness: .7});
 for (const x of [2.95, 4.25]) box('shelf post', .04, 1.9, .04, shelfM, x, .95, -1.32);
 for (const y of [.1, .6, 1.1, 1.6]) box('shelf', 1.34, .03, .38, shelfM, 3.6, y, -1.25);
 const cans = ['#a33a2a', '#2d5a8a', '#d0c060', '#e0dccc', '#4a7a3a'];
 for (let i = 0; i < 6; i++) { const c = add('paint can', new T.CylinderGeometry(.08, .08, .18, 10), M('paint can', {color: cans[i % 5], metalness: .3}), 3.05 + i * .2, .71, -1.22); }
 for (let i = 0; i < 4; i++) add('preserve jar', new T.CylinderGeometry(.05, .05, .14, 8), M('jar glass amber', {color: '#b07a2a', roughness: .3}), 3.1 + i * .16, 1.19, -1.2);
 box('storage box', .5, .3, .34, M('cardboard', {color: '#9a7a50'}), 3.3, 1.77, -1.24); box('storage box', .4, .4, .34, M('cardboard', {color: '#8c6b45'}), 3.9, .32, -1.22);
 box('labelled box', .44, .26, .34, M('cardboard', {color: '#a08058'}), 3.85, 1.75, -1.24);

 // The desk, the chair, a braided rug, and Grace's computer facing the chair.
 const D = ROOM.desk, dw = D.x1 - D.x0, dd = D.z1 - D.z0, dx = (D.x0 + D.x1) / 2, dz = (D.z0 + D.z1) / 2;
 const deskM = M('desk oak', {map: wood, color: '#c79a6a'});
 box('desk top', dw, .04, dd, deskM, dx, D.top - .02, dz);
 for (const [x, z] of [[D.x0 + .05, D.z0 + .05], [D.x1 - .05, D.z0 + .05], [D.x0 + .05, D.z1 - .05], [D.x1 - .05, D.z1 - .05]]) box('desk leg', .05, D.top - .04, .05, deskM, x, (D.top - .04) / 2, z);
 box('desk drawer', .5, .12, dd - .06, deskM, D.x1 - .3, D.top - .1, dz);
 const rug = add('braided rug', new T.CylinderGeometry(1, 1, .015, 14), M('braided rug', {color: '#7a3d3a'}), 5.1, .008, -.55); rug.scale.set(1.3, 1, .7);
 const chair = new T.Group(); chair.name = 'desk chair'; chair.position.set(ROOM.chair.x, 0, ROOM.chair.z); root.add(chair);
 const chairM = M('chair maple', {map: wood, color: '#b5865a'});
 box('chair seat', .42, .04, .4, chairM, 0, .45, 0, chair);
 for (const [x, z] of [[-.18, -.17], [.18, -.17], [-.18, .17], [.18, .17]]) box('chair leg', .035, .45, .035, chairM, x, .225, z, chair);
 for (const z of [-.17, .17]) box('chair back post', .035, .5, .035, chairM, -.19, .7, z, chair);
 for (const y of [.75, .9]) box('chair back rail', .03, .06, .38, chairM, -.19, y, 0, chair);

 const computer = createGraceComputer(); computer.position.set(5.62, D.top, -.64); computer.rotation.y = -Math.PI / 2; root.add(computer);
 const keyboard = createGraceKeyboard(); keyboard.position.set(5.12, D.top, -.64); keyboard.rotation.y = -Math.PI / 2; root.add(keyboard);
 const manual = createManual(); manual.position.set(5.2, D.top, -.32); manual.rotation.y = -.25; root.add(manual);
 const mug = add('pencil mug', new T.CylinderGeometry(.04, .036, .1, 10), M('mug glaze', {color: '#2f5f6a', roughness: .4}), 6.1, D.top + .05, -.9);
 for (let i = 0; i < 3; i++) { const p = box('pencil', .008, .16, .008, M('pencil yellow', {color: '#d8b030'}), 6.09 + i * .012, D.top + .13, -.9, ); p.rotation.z = (i - 1) * .15; }

 // The disk box: Grace's floppies standing in a smoky box, labels toward the chair, each one higher than the last.
 const diskBox = new T.Group(); diskBox.name = 'disk box'; diskBox.position.set(5.26, D.top, -.94); root.add(diskBox);
 const smoke = M('smoked plastic', {color: '#3a3a40', transparent: true, opacity: .55, roughness: .3});
 box('disk box base', .16, .012, .11, smoke, 0, .006, 0, diskBox); for (const z of [-.055, .055]) box('disk box side', .16, .05, .006, smoke, 0, .025, z, diskBox);
 box('disk box back', .006, .07, .11, smoke, .085, .035, 0, diskBox);
 const disks = DISKS.map((d, i) => {
  const f = createGraceFloppy({label: diskLabel(d)}); f.name = `disk ${d.id}`; f.userData.disk = d;
  f.rotation.y = -Math.PI / 2; f.rotation.z = .08; f.position.set(-.055 + i * .036, .048 + i * .022, 0); diskBox.add(f);
  f.userData.home = {p: f.position.clone(), r: f.rotation.clone()}; return f;
 });

 // The coin jar: every coin you find lands in here.
 const jar = new T.Group(); jar.name = 'coin jar'; jar.position.set(5.92, D.top, -.36); root.add(jar);
 add('jar glass', new T.CylinderGeometry(.055, .05, .14, 12, 1, true), M('jar glass clear', {color: '#cfe0e0', transparent: true, opacity: .3, roughness: .1, side: T.DoubleSide}), 0, .07, 0, jar).castShadow = false;
 add('jar base', new T.CylinderGeometry(.05, .05, .006, 12), M('jar glass clear', {color: '#cfe0e0', transparent: true, opacity: .4}), 0, .003, 0, jar);
 add('jar lid', new T.CylinderGeometry(.058, .058, .012, 12), M('jar lid tin', {color: '#9a9a90', metalness: .7, roughness: .4}), 0, .146, 0, jar);
 const jarCoins = new T.Group(); jarCoins.name = 'coins in the jar'; jar.add(jarCoins);
 const addJarCoin = () => { const n = jarCoins.children.length, c = createCoin(.034); c.rotation.set(Math.PI / 2 - .2 + (n % 3) * .15, 0, n * 1.3); c.position.set(Math.cos(n * 2.4) * .015, .012 + n * .011, Math.sin(n * 2.4) * .015); jarCoins.add(c); };

 // The bare bulb on its cord, with a porcelain socket.
 const B = ROOM.bulb;
 box('bulb cord', .01, ROOM.ceil - B.y - .1, .01, iron, B.x, (ROOM.ceil + B.y + .1) / 2, B.z);
 add('porcelain socket', new T.CylinderGeometry(.03, .035, .07, 8), M('porcelain', {color: '#e8e2d4'}), B.x, B.y + .08, B.z);
 const bulbM = new T.MeshStandardMaterial({color: '#f4ecd8', emissive: '#ffd9a0', emissiveIntensity: 0, roughness: .2, name: 'bulb glass'});
 const bulb = add('light bulb', new T.SphereGeometry(.045, 10, 8), bulbM, B.x, B.y, B.z); bulb.castShadow = false;
 const chain = box('pull chain', .006, .25, .006, M('chain brass', {color: '#a08840', metalness: .7}), B.x + .02, B.y - .08, B.z);
 // The first light: a caged bulb over the shelves, nearer the stairs.
 const L = ROOM.lamp1;
 box('lamp cord', .01, ROOM.ceil - L.y - .1, .01, iron, L.x, (ROOM.ceil + L.y + .1) / 2, L.z);
 add('porcelain socket', new T.CylinderGeometry(.03, .035, .07, 8), M('porcelain', {color: '#e8e2d4'}), L.x, L.y + .08, L.z);
 const lamp1M = new T.MeshStandardMaterial({color: '#f4ecd8', emissive: '#ffd9a0', emissiveIntensity: 0, roughness: .2, name: 'bulb glass'});
 add('first light bulb', new T.SphereGeometry(.045, 10, 8), lamp1M, L.x, L.y, L.z).castShadow = false;
 for (let i = 0; i < 4; i++) { const w = box('bulb cage wire', .004, .12, .004, iron, L.x + Math.cos(i * 1.57) * .06, L.y, L.z + Math.sin(i * 1.57) * .06); w.castShadow = false; }

 // Under the desk: the wall outlet, and the computer's cord with its plug lying on the floor.
 box('outlet plate', .07, .11, .01, M('outlet plate', {color: '#d8d0bd'}), ROOM.outlet.x, ROOM.outlet.y, ROOM.back + .005);
 for (const dy of [.025, -.025]) box('outlet socket', .03, .03, .004, M('outlet socket', {color: '#c8bfa8'}), ROOM.outlet.x, ROOM.outlet.y + dy, ROOM.back + .012);
 const plug = new T.Group(); plug.name = 'power plug'; root.add(plug);
 box('plug body', .04, .05, .03, M('plug black rubber', {color: '#1d1d1d', roughness: .8}), 0, 0, 0, plug);
 for (const dx of [-.008, .008]) box('plug prong', .004, .012, .018, M('prong brass', {color: '#b09040', metalness: .7}), dx, 0, -.022, plug).castShadow = false;
 const cordM = M('cord black', {color: '#161616', roughness: .7});
 const cord = add('power cord', new T.BufferGeometry(), cordM, 0, 0, 0); cord.castShadow = false;
 const plugHome = {p: new T.Vector3(5.75, .02, -.85), r: new T.Euler(-Math.PI / 2, 0, .6)}, plugIn = {p: new T.Vector3(ROOM.outlet.x, ROOM.outlet.y - .025, ROOM.back + .03), r: new T.Euler(0, 0, 0)};
 const setPlug = k => {
  plug.position.lerpVectors(plugHome.p, plugIn.p, k); plug.quaternion.slerpQuaternions(new T.Quaternion().setFromEuler(plugHome.r), new T.Quaternion().setFromEuler(plugIn.r), k);
  const from = new T.Vector3(5.62 + .1, ROOM.desk.top + .04, -.64 - .19), sag = new T.Vector3(5.85, .02, -1.05), end = plug.position.clone().add(new T.Vector3(0, 0, .02).applyQuaternion(plug.quaternion));
  const curve = new T.CatmullRomCurve3([from, from.clone().add(new T.Vector3(.05, -.2, -.1)), sag.clone().lerp(end, .4).setY(.02 + k * .05), end]);
  cord.geometry.dispose(); cord.geometry = new T.TubeGeometry(curve, 24, .006, 5);
 };
 setPlug(0);

 // On the desk: Grace's clipboard with her list, a spray bottle of window cleaner and a folded towel.
 const clip = createClipboard(); clip.position.set(4.98, D.top, -.4); clip.rotation.y = -.35; root.add(clip);
 const spray = new T.Group(); spray.name = 'spray bottle'; spray.position.set(6.12, D.top, -.42); root.add(spray);
 add('spray bottle body', new T.CylinderGeometry(.03, .034, .16, 10), M('bottle plastic blue', {color: '#4f8fc8', roughness: .3, transparent: true, opacity: .85}), 0, .08, 0, spray);
 add('spray bottle neck', new T.CylinderGeometry(.012, .02, .03, 8), M('bottle plastic white', {color: '#eeeeea'}), 0, .175, 0, spray);
 box('spray trigger head', .03, .03, .05, M('bottle plastic white', {color: '#eeeeea'}), 0, .2, .012, spray);
 box('spray trigger', .008, .03, .012, M('trigger red', {color: '#c0392b'}), 0, .17, .03, spray);
 const towel = box('towel', .16, .025, .12, M('towel terry yellow', {color: '#e0c060', roughness: 1}), 6.12, D.top + .0125, -.22);
 for (const z of [-.03, .03]) box('towel stripe', .162, .026, .012, M('towel stripe red', {color: '#b04a3a', roughness: 1}), 0, 0, z, towel);

 // Furnace, water heater and pipes on the right; a high window with moonlight.
 const steel = M('furnace enamel', {color: '#5b5f55', metalness: .2, roughness: .6});
 box('furnace', .9, 1.5, .8, steel, 7.55, .75, -1.0); box('furnace door', .5, .4, .02, iron, 7.55, .5, -.59);
 const flame = box('pilot glow', .12, .04, .01, new T.MeshBasicMaterial({color: '#3a6aff', name: 'pilot flame'}), 7.55, .42, -.575); flame.castShadow = false;
 box('furnace duct', .5, .4, .5, steel, 7.55, 1.75, -1.05); box('duct run', 3.6, .3, .4, M('galvanised duct', {color: '#8a8e90', metalness: .5, roughness: .5}), 5.95, 2.32, -1.1);
 add('water heater', new T.CylinderGeometry(.26, .26, 1.4, 12), M('heater enamel', {color: '#c9c4b2', roughness: .6}), 6.75, .7, -1.15);
 for (const [z, y] of [[-1.35, 2.45], [-1.28, 2.38]]) { const p = add('pipe', new T.CylinderGeometry(.018, .018, ROOM.x1 - 2.4, 6), pipe, (2.4 + ROOM.x1) / 2, y, z); p.rotation.z = Math.PI / 2; }
 add('pipe drop', new T.CylinderGeometry(.018, .018, 1, 6), pipe, 6.75, 1.9, -1.28);
 const win = box('window glass', .8, .36, .02, new T.MeshBasicMaterial({color: '#1d2a48', name: 'night window'}), 4.6, 2.22, ROOM.back + .01); win.castShadow = false;
 box('window sill', .9, .05, .12, timber, 4.6, 2.02, ROOM.back + .06);
 for (const x of [4.2, 4.6, 5.0]) box('window muntin', .03, .36, .03, timber, x, 2.22, ROOM.back + .03);

 // Ten coins hide in the basement. Seven are in things you can tap; three live on the computer (the gold disk,
 // KEYSTORM's fifth night and the word Grace's note hints at).
 const named = n => { let hit = null; root.traverse(o => { if (!hit && o.name === n) hit = o; }); return hit; };
 const coinSpots = [
  {id: 'furnace-door', obj: named('furnace door')}, {id: 'paint-can', obj: root.children.filter(o => o.name === 'paint can')[2]},
  {id: 'rug', obj: rug}, {id: 'manual', obj: manual}, {id: 'stair-box', obj: named('under-stair box')},
  {id: 'window-sill', obj: named('window sill')}, {id: 'pencil-mug', obj: mug},
 ];
 root.userData = {computer, keyboard, disks, jar, addJarCoin, coinSpots, manual, bulb, bulbM, chain, door, toggle, toggles, switches: sw, glowDot, hall, flame, screen: computer.userData.screen, chair,
  lamp1M, plug, setPlug, clipboard: clip, spray, towel, rocker: computer.userData.rocker};
 return root;
}

function diskLabel(d) {
 const c = Object.assign(document.createElement('canvas'), {width: 64, height: 48}), g = c.getContext('2d');
 g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 64, 48); g.fillStyle = d.color; g.fillRect(0, 0, 64, 10);
 if (d.coin) { g.fillStyle = '#e0b030'; g.fillRect(0, 0, 64, 48); drawCoin(g, 32, 6, 34); }
 else if (d.label) { g.fillStyle = '#1d2a5a'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.fillText(d.label, 32, 30); }
 const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
}

// An 8-bit Abbie's World coin: a thin gold disc with the pixel coin on both faces.
let coinFace = null;
export function createCoin(r = .03) {
 if (!coinFace) { const c = Object.assign(document.createElement('canvas'), {width: 32, height: 32}); const g = c.getContext('2d'); g.fillStyle = '#ffcc33'; g.fillRect(0, 0, 32, 32); drawCoin(g, 16, 2, 28); coinFace = new T.CanvasTexture(c); coinFace.colorSpace = T.SRGBColorSpace; coinFace.magFilter = T.NearestFilter; }
 const edge = new T.MeshStandardMaterial({color: '#d8a020', metalness: .8, roughness: .35, name: 'coin gold'}), face = new T.MeshStandardMaterial({map: coinFace, metalness: .5, roughness: .4, name: 'coin face'});
 const m = new T.Mesh(new T.CylinderGeometry(r, r, r * .18, 14), [edge, face, face]); m.name = 'coin'; m.rotation.x = Math.PI / 2; m.castShadow = true;
 return m;
}

// Grace's clipboard: her list for waking the computer, in her hand. setTicks([...]) pencils a tick beside each job done.
export const CHORES = ['Plug it in', 'Wash the screen', 'Dry the screen', 'Turn on the power', 'Put in a disk'];
function createClipboard() {
 const g = new T.Group(); g.name = 'clipboard';
 const c = Object.assign(document.createElement('canvas'), {width: 256, height: 320}), x = c.getContext('2d');
 const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
 const draw = (ticks = []) => {
  x.fillStyle = '#f3ecd8'; x.fillRect(0, 0, 256, 320); x.fillStyle = '#c9d6e6'; for (let y = 64; y < 320; y += 28) x.fillRect(0, y, 256, 2);
  x.fillStyle = '#d9a0a0'; x.fillRect(30, 0, 2, 320);
  x.fillStyle = '#2b3a6a'; x.font = 'italic 22px "Comic Sans MS", "Bradley Hand", cursive'; x.fillText('To wake my computer:', 38, 48);
  x.font = 'italic 21px "Comic Sans MS", "Bradley Hand", cursive';
  CHORES.forEach((t, i) => { const y = 90 + i * 42; x.strokeStyle = '#2b3a6a'; x.lineWidth = 2; x.strokeRect(38, y - 16, 16, 16); x.fillText(t, 64, y);
   if (ticks[i]) { x.strokeStyle = '#3a3a3a'; x.lineWidth = 4; x.beginPath(); x.moveTo(36, y - 10); x.lineTo(46, y + 2); x.lineTo(62, y - 24); x.stroke(); } });
  x.fillText('Then type  A:  and  GO', 38, 312 - 26); x.fillText('- G.', 196, 312); tex.needsUpdate = true;
 };
 draw();
 const board = new T.Mesh(new T.BoxGeometry(.2, .008, .27), new T.MeshStandardMaterial({color: '#8a6a44', roughness: .8, name: 'clipboard hardboard'})); board.name = 'clipboard board'; board.position.y = .004; board.castShadow = board.receiveShadow = true; g.add(board);
 const paper = new T.Mesh(new T.PlaneGeometry(.18, .225), new T.MeshStandardMaterial({map: tex, roughness: .95, name: 'clipboard paper'})); paper.name = 'clipboard paper'; paper.rotation.x = -Math.PI / 2; paper.position.set(0, .0085, .015); g.add(paper);
 const clamp = new T.Mesh(new T.BoxGeometry(.09, .012, .03), new T.MeshStandardMaterial({color: '#b8b8b0', metalness: .8, roughness: .3, name: 'clip steel'})); clamp.name = 'clipboard clip'; clamp.position.set(0, .012, -.12); g.add(clamp);
 g.userData = {setTicks: draw, paper};
 return g;
}

// The spiral manual beside the keyboard, "Grace's" on the cover in pen (the café study's manual).
function createManual() {
 const g = new T.Group(); g.name = "Grace's manual";
 const cover = paint(64, 80, (c, w, h) => { c.fillStyle = '#2c4a7a'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e0c8'; c.fillRect(6, 10, w - 12, 16);
  c.fillStyle = '#2c4a7a'; c.font = 'bold 9px monospace'; c.fillText('GRACE-DOS', 10, 21); c.fillStyle = '#f2f0ea'; c.font = 'italic 11px cursive'; c.fillText("Grace's", 14, 60); });
 cover.repeat.set(1, 1);
 const m = [new T.MeshStandardMaterial({color: '#f2ede0', name: 'manual pages'}), new T.MeshStandardMaterial({map: cover, name: 'manual cover'})];
 const book = new T.Mesh(new T.BoxGeometry(.17, .022, .22), [m[0], m[0], m[1], m[0], m[0], m[0]]); book.name = 'manual'; book.position.y = .011; book.castShadow = book.receiveShadow = true; g.add(book);
 for (let i = 0; i < 9; i++) { const r = new T.Mesh(new T.TorusGeometry(.008, .0015, 4, 6), new T.MeshStandardMaterial({color: '#bbb', metalness: .8, name: 'spiral wire'})); r.name = 'spiral'; r.rotation.y = Math.PI / 2; r.position.set(-.085, .012, -.095 + i * .024); g.add(r); }
 return g;
}

// The player: a low-poly kid in a striped shirt, jointed at hips, knees and shoulders so the scene can walk and sit them.
export function createKid() {
 const kid = new T.Group(); kid.name = 'kid';
 const M = (name, color) => Object.assign(new T.MeshStandardMaterial({color, roughness: .8, flatShading: true}), {name});
 const add = (name, g, m, x, y, z, p) => { const o = new T.Mesh(g, m); o.name = name; o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
 const skin = M('skin', '#e0b08a'), shirt = M('striped shirt red', '#b0393a'), stripe = M('shirt stripe cream', '#ead9b0'), jeans = M('jeans', '#34507a'), shoe = M('sneaker', '#e8e4dc'), hair = M('hair brown', '#4a2e1c');
 const body = new T.Group(); body.name = 'body'; body.position.y = .62; kid.add(body);
 add('torso', new T.BoxGeometry(.26, .34, .16), shirt, 0, .18, 0, body);
 for (const y of [.1, .2]) add('stripe', new T.BoxGeometry(.265, .03, .165), stripe, 0, y, 0, body);
 const head = new T.Group(); head.name = 'head'; head.position.y = .44; body.add(head);
 add('face', new T.BoxGeometry(.2, .22, .2), skin, 0, .02, 0, head);
 add('hair', new T.BoxGeometry(.22, .1, .22), hair, 0, .12, -.01, head); add('fringe', new T.BoxGeometry(.04, .07, .22), hair, -.09, .06, -.01, head);
 for (const z of [-.05, .05]) add('eye', new T.BoxGeometry(.012, .03, .025), M('eye', '#1a1410'), .1, .03, z, head);
 const limb = (name, len, w, m, x, y, z, p) => { const j = new T.Group(); j.name = name; j.position.set(x, y, z); p.add(j); add(name + ' part', new T.BoxGeometry(w, len, w), m, 0, -len / 2, 0, j); return j; };
 const legs = [-1, 1].map(s => { const hip = limb(s < 0 ? 'left thigh' : 'right thigh', .3, .1, jeans, 0, 0, s * .065, body); const knee = limb('shin', .3, .09, jeans, 0, -.3, 0, hip);
  add('sneaker', new T.BoxGeometry(.16, .06, .1), shoe, .03, -.32, 0, knee); return {hip, knee}; });
 const arms = [-1, 1].map(s => { const sh = limb(s < 0 ? 'left arm' : 'right arm', .3, .07, shirt, 0, .33, s * .17, body); add('hand', new T.BoxGeometry(.07, .07, .07), skin, 0, -.33, 0, sh); return sh; });
 kid.userData = {body, head, legs, arms};
 return kid;
}
