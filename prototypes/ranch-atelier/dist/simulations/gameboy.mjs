import * as T from 'three';

// Grace's pocket game player (AW-STUDY-0024): a hi-fi low-poly handheld for her desk, with a falling-blocks game on its
// little screen. The game is our own (rules in the public domain; code and art ours). The screen is drawn the way the
// "One-bit dither" card in Inspiring Shaders describes it (Return of the Obra Dinn): the picture is made in greys, then
// every pixel is forced to ink or paper by an ordered-dither pattern. World layer: it is a thing in Grace's basement.
//
//   const gb = createGameBoy();  gb.group is the model; gb.buttons maps part names to {mesh, key};
//   gb.press('left', true) / gb.press('left', false); gb.step(dt) each frame; gb.onSound = name => ...
//   gb.game exposes the playable game for tests (gb.game.score, .lines, .over, .piece, .board).

const W = 160, H = 144, INK = [27, 38, 27], PAPER = [196, 207, 161];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---------- the game ----------
const SHAPES = {
 I: {size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]]}, O: {size: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]], fixed: true},
 T: {size: 3, cells: [[0, 1], [1, 1], [2, 1], [1, 0]]}, S: {size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]]},
 Z: {size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]]}, J: {size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]]}, L: {size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]]},
};
const KINDS = Object.keys(SHAPES), COLS = 10, ROWS = 18, CELL = 8;
const rot = (cells, size, dir) => cells.map(([x, y]) => dir > 0 ? [size - 1 - y, x] : [y, size - 1 - x]);

export class PocketBlocks {
 constructor({sound = () => {}} = {}) { this.sound = sound; this.state = 'title'; this.t = 0; this.held = {}; this.reset(); }
 reset() {
  this.board = Array.from({length: ROWS}, () => Array(COLS).fill(0)); this.score = 0; this.lines = 0; this.level = 0; this.over = false;
  this.bag = []; this.next = this.draw(); this.piece = null; this.drop = 0; this.flash = 0; this.clearing = []; this.repeat = 0; this.fill = 0;
 }
 draw() { if (!this.bag.length) { this.bag = KINDS.slice(); for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; } } return this.bag.pop(); }
 spawn() {
  const kind = this.next; this.next = this.draw(); const s = SHAPES[kind];
  this.piece = {kind, cells: s.cells.map(c => c.slice()), size: s.size, x: 3, y: kind === 'I' ? -1 : 0};
  if (this.hits(this.piece, 0, 0)) { this.state = 'over'; this.over = true; this.fill = 0; this.sound('over'); }
 }
 hits(p, dx, dy, cells = p.cells) { return cells.some(([cx, cy]) => { const x = p.x + cx + dx, y = p.y + cy + dy; return x < 0 || x >= COLS || y >= ROWS || (y >= 0 && this.board[y][x]); }); }
 interval() { return Math.max(.07, .78 - this.level * .07); }
 start() { this.reset(); this.state = 'play'; this.spawn(); this.sound('start'); }
 press(k, down) {
  const was = this.held[k]; this.held[k] = down; if (!down || was) return;
  if (this.state === 'title' || this.state === 'over' && this.fill > 1.2) { if (k === 'start' || k === 'a' || k === 'b') this.start(); return; }
  if (k === 'start' && (this.state === 'play' || this.state === 'pause')) { this.state = this.state === 'play' ? 'pause' : 'play'; this.sound('click'); return; }
  if (this.state !== 'play' || !this.piece) return;
  if (k === 'left' || k === 'right') this.shift(k === 'left' ? -1 : 1);
  if (k === 'a' || k === 'b' || k === 'up') this.turn(k === 'b' ? -1 : 1);
  if (k === 'down') this.repeat = 0;
 }
 shift(d) { if (!this.hits(this.piece, d, 0)) { this.piece.x += d; this.sound('move'); this.repeat = -.18; } }
 turn(dir) {
  const p = this.piece, s = SHAPES[p.kind]; if (s.fixed) return; const cells = rot(p.cells, p.size, dir);
  for (const dx of [0, -1, 1, -2, 2]) if (!this.hits(p, dx, 0, cells)) { p.cells = cells; p.x += dx; this.sound('turn'); return; }
 }
 lock() {
  const p = this.piece; for (const [cx, cy] of p.cells) { const y = p.y + cy; if (y >= 0) this.board[y][p.x + cx] = KINDS.indexOf(p.kind) + 1; }
  this.piece = null; this.sound('lock');
  const full = []; this.board.forEach((r, y) => { if (r.every(v => v)) full.push(y); });
  if (full.length) { this.clearing = full; this.flash = .34; this.sound(full.length >= 4 ? 'big' : 'clear'); } else this.spawn();
 }
 step(dt) {
  this.t += dt;
  if (this.state === 'over') { this.fill = Math.min(2, this.fill + dt); return; }
  if (this.state !== 'play') return;
  if (this.flash > 0) {
   this.flash -= dt;
   if (this.flash <= 0) {
    const n = this.clearing.length; this.board = this.board.filter((_, y) => !this.clearing.includes(y)); while (this.board.length < ROWS) this.board.unshift(Array(COLS).fill(0));
    this.lines += n; this.score += [0, 40, 100, 300, 1200][n] * (this.level + 1); this.level = Math.floor(this.lines / 10); this.clearing = []; this.spawn();
   }
   return;
  }
  const p = this.piece; if (!p) return;
  const dir = (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0);
  if (dir) { this.repeat += dt; if (this.repeat > .09) { this.repeat = 0; if (!this.hits(p, dir, 0)) { p.x += dir; this.sound('move'); } } } else this.repeat = 0;
  this.drop += dt; const gap = this.held.down ? .035 : this.interval();
  if (this.drop >= gap) { this.drop = 0; if (!this.hits(p, 0, 1)) { p.y++; if (this.held.down) this.score += 1; } else this.lock(); }
 }
 ghostY() { const p = this.piece; let d = 0; while (!this.hits(p, 0, d + 1)) d++; return p.y + d; }

 // ---------- the picture: grey shades first, then every pixel is made ink or paper ----------
 paint(g) {
  const gray = (v) => `rgb(${v},${v},${v})`, px = (x, y, w, h, v) => { g.fillStyle = gray(v); g.fillRect(x, y, w, h); };
  px(0, 0, W, H, 232);
  const block = (x, y, kind) => {
   px(x, y, CELL, CELL, 0); px(x + 1, y + 1, CELL - 2, CELL - 2, kind % 2 ? 120 : 40); px(x + 3, y + 3, 2, 2, 255);
  };
  if (this.state === 'title') {
   for (let y = 0; y < H; y++) px(0, y, W, 1, 30 + y * 1.4);
   px(14, 28, 132, 40, 18); g.fillStyle = gray(240); g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.fillText('POCKET', 80, 50); g.fillText('BLOCKS', 80, 66);
   px(0, 92, W, 1, 240); g.font = 'bold 10px monospace'; if ((this.t * 2 | 0) % 2 === 0) g.fillText('PRESS START', 80, 112);
   g.font = '8px monospace'; g.fillStyle = gray(200); g.fillText('GRACE 1986', 80, 134);
   return;
  }
  px(0, 0, W, H, 96); px(7, 0, COLS * CELL + 2, H, 0); px(8, 0, COLS * CELL, ROWS * CELL, 245);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if ((x + y) % 2 === 0) px(8 + x * CELL + 3, y * CELL + 3, 2, 2, 205); const v = this.board[y][x]; if (v && !this.clearing.includes(y)) block(8 + x * CELL, y * CELL, v); }
  if (this.clearing.length) for (const y of this.clearing) px(8, y * CELL, COLS * CELL, CELL, (this.t * 18 | 0) % 2 ? 250 : 40);
  if (this.piece && this.state !== 'over') {
   const p = this.piece, gy = this.ghostY(); for (const [cx, cy] of p.cells) { const x = 8 + (p.x + cx) * CELL; if (gy + cy >= 0) { px(x, (gy + cy) * CELL, CELL, CELL, 70); px(x + 1, (gy + cy) * CELL + 1, CELL - 2, CELL - 2, 245); } }
   for (const [cx, cy] of p.cells) if (p.y + cy >= 0) block(8 + (p.x + cx) * CELL, (p.y + cy) * CELL, KINDS.indexOf(p.kind) + 1);
  }
  g.fillStyle = gray(0); g.font = 'bold 8px monospace'; g.textAlign = 'left';
  g.fillText('NEXT', 98, 12); px(98, 16, 52, 36, 255); px(98, 16, 52, 1, 20); px(98, 51, 52, 1, 20);
  const nx = SHAPES[this.next]; for (const [cx, cy] of nx.cells) block(106 + cx * 8 - (nx.size === 3 ? 0 : 4) + 4, 22 + cy * 8 - (this.next === 'I' ? 4 : 0), KINDS.indexOf(this.next) + 1);
  g.fillStyle = gray(15); g.fillText('SCORE', 98, 70); g.fillText(String(this.score).padStart(6, '0'), 98, 80);
  g.fillText('LINES', 98, 96); g.fillText(String(this.lines).padStart(4, '0'), 98, 106); g.fillText('LEVEL ' + (this.level + 1), 98, 124);
  if (this.state === 'pause') { px(20, 60, 56, 24, 20); g.fillStyle = gray(245); g.fillText('PAUSE', 34, 76); }
  if (this.state === 'over') {
   const rows = Math.min(ROWS, Math.floor(this.fill * 14)); for (let y = ROWS - rows; y < ROWS; y++) px(8, y * CELL, COLS * CELL, CELL, (y + (this.t * 6 | 0)) % 2 ? 40 : 90);
   if (this.fill > 1.2) { px(10, 56, 76, 30, 245); px(10, 56, 76, 1, 20); px(10, 85, 76, 1, 20); g.fillStyle = gray(15); g.fillText('GAME OVER', 17, 70); g.fillText('PRESS START', 14, 81); }
  }
 }
}

// ---------- the object ----------
const rounded = (w, h, r, rBR = r) => { const s = new T.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - rBR, y); s.quadraticCurveTo(x + w, y, x + w, y + rBR); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
const mat = (name, color, o = {}) => new T.MeshStandardMaterial({name, color, roughness: .55, ...o});

// The group lies flat (screen up, top of the unit toward -z) with its underside on y = 0. Units are metres: about 9 x 15 cm.
export function createGameBoy({sound = () => {}} = {}) {
 const g = new T.Group(); g.name = "Grace's Game Boy";
 const shell = mat('handheld shell grey', '#b8b5aa', {roughness: .5}), dark = mat('handheld bezel grey', '#4c4c5a', {roughness: .35}), pad = mat('handheld pad black', '#2a2a32', {roughness: .45}),
  mag = mat('handheld button magenta', '#8c2452', {roughness: .4}), slit = mat('handheld speaker slot', '#6a685f'), led = new T.MeshBasicMaterial({color: '#e04040', name: 'handheld LED'});
 const body = new T.Mesh(new T.ExtrudeGeometry(rounded(.09, .148, .006, .022), {depth: .024, bevelEnabled: true, bevelSize: .0025, bevelThickness: .0025, bevelSegments: 2, curveSegments: 5}), shell);
 body.rotation.x = -Math.PI / 2; body.position.y = .0025; body.name = 'handheld body'; body.castShadow = body.receiveShadow = true; g.add(body);
 const top = .03, flat = new T.Group(); g.add(flat);   // flat sits on the front face
 const bezel = new T.Mesh(new T.ExtrudeGeometry(rounded(.078, .058, .006, .006), {depth: .0014, bevelEnabled: false}), dark); bezel.rotation.x = -Math.PI / 2; bezel.position.set(0, top, -.03); bezel.name = 'handheld bezel'; g.add(bezel);
 const cvs = Object.assign(document.createElement('canvas'), {width: W, height: H}), cx = cvs.getContext('2d'), grey = Object.assign(document.createElement('canvas'), {width: W, height: H}), gg = grey.getContext('2d', {willReadFrequently: true});
 const tex = new T.CanvasTexture(cvs); tex.colorSpace = T.SRGBColorSpace; tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
 const screen = new T.Mesh(new T.PlaneGeometry(.0535, .048), new T.MeshBasicMaterial({map: tex, toneMapped: false, name: 'handheld screen'})); screen.rotation.x = -Math.PI / 2; screen.position.set(0, top + .0016, -.03); screen.name = 'handheld screen'; g.add(screen);
 const glass = new T.Mesh(new T.PlaneGeometry(.0535, .048), new T.MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: .07, roughness: .05, name: 'handheld glass'})); glass.rotation.x = -Math.PI / 2; glass.position.set(0, top + .0019, -.03); g.add(glass);
 const ledM = new T.Mesh(new T.CylinderGeometry(.0017, .0017, .001, 8), led); ledM.position.set(-.032, top + .0012, -.0605); ledM.name = 'handheld LED'; g.add(ledM);
 // The printed marks: the maker's line above the screen, the button names below, in a small canvas.
 const lab = Object.assign(document.createElement('canvas'), {width: 256, height: 400}), lg = lab.getContext('2d');
 lg.fillStyle = '#2d2d5a'; lg.font = 'italic bold 17px sans-serif'; lg.fillText('POCKET ARCADE', 52, 28);
 lg.font = 'bold 15px sans-serif'; lg.fillText('B', 146, 338); lg.fillText('A', 209, 308); lg.font = 'bold 11px sans-serif'; lg.fillText('SELECT', 78, 388); lg.fillText('START', 148, 388);
 const labT = new T.CanvasTexture(lab); labT.colorSpace = T.SRGBColorSpace; labT.anisotropy = 4;
 const label = new T.Mesh(new T.PlaneGeometry(.09, .14), new T.MeshBasicMaterial({map: labT, transparent: true, toneMapped: false, name: 'handheld print'})); label.rotation.x = -Math.PI / 2; label.position.set(0, top + .0011, 0); g.add(label);
 const buttons = {}, add = (part, key, mesh) => { mesh.name = 'handheld ' + part; mesh.userData.key = key; mesh.userData.rest = mesh.position.y; mesh.castShadow = true; g.add(mesh); buttons[part] = {mesh, key}; return mesh; };
 // d-pad: a cross on a shallow dish
 const dish = new T.Mesh(new T.CylinderGeometry(.0165, .0165, .0012, 14), mat('handheld dish', '#9c998e')); dish.position.set(-.025, top + .0007, .03); g.add(dish);
 const cross = new T.Group(); cross.name = 'handheld d-pad'; cross.position.set(-.025, top + .004, .03); cross.add(new T.Mesh(new T.BoxGeometry(.0225, .005, .0075), pad), new T.Mesh(new T.BoxGeometry(.0075, .005, .0225), pad)); cross.children.forEach(c => { c.castShadow = true; }); g.add(cross); buttons['d-pad'] = {mesh: cross, key: 'dpad'};
 for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const tri = new T.Mesh(new T.ConeGeometry(.0017, .0012, 3), mat('handheld d-pad mark', '#555560')); tri.position.set(dx * .0085, .0027, dz * .0085); tri.rotation.y = Math.atan2(dx, dz); cross.add(tri); }
 // A and B on a slant, magenta
 for (const [p, k, x, z] of [['button A', 'a', .031, .0225], ['button B', 'b', .008, .0325]]) { const b = new T.Mesh(new T.CylinderGeometry(.0085, .0085, .006, 14), mag); b.position.set(x, top + .003, z); add(p, k, b); }
 const slant = new T.Mesh(new T.BoxGeometry(.05, .0006, .02), mat('handheld slant', '#8f8c82')); slant.position.set(.0195, top + .0003, .0275); slant.rotation.y = -.42; g.add(slant);
 // start and select: two little pills
 for (const [p, k, x] of [['button SELECT', 'select', -.009], ['button START', 'start', .015]]) { const b = new T.Mesh(new T.CapsuleGeometry(.0027, .011, 3, 8), pad); b.rotation.z = Math.PI / 2; b.rotation.y = .5; b.position.set(x, top + .0022, .055); b.rotation.set(0, 0, 0); b.rotateZ(Math.PI / 2); b.rotateOnWorldAxis(new T.Vector3(0, 1, 0), -.45); add(p, k, b); }
 // speaker slits, a volume wheel on the edge, a link port on the top
 for (let i = 0; i < 6; i++) { const s = new T.Mesh(new T.BoxGeometry(.0012, .0008, .0165), slit); s.position.set(.018 + i * .0042, top + .0004, .064); s.rotation.y = -.5; g.add(s); }
 const wheel = new T.Mesh(new T.CylinderGeometry(.007, .007, .004, 10), mat('handheld wheel', '#8e8b81')); wheel.rotation.z = Math.PI / 2; wheel.position.set(-.0455, .017, -.056); g.add(wheel);
 const port = new T.Mesh(new T.BoxGeometry(.03, .006, .002), mat('handheld port', '#3a3a40')); port.position.set(0, .016, -.0745); g.add(port);
 for (const m of g.children) if (m.isMesh) m.castShadow = true;

 const game = new PocketBlocks({sound: n => out.onSound(n)}); let acc = 0, dirty = true;
 const draw = () => {
  game.paint(gg); const im = gg.getImageData(0, 0, W, H), d = im.data, o = cx.createImageData(W, H), od = o.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, v = d[i] / 255 * 16, on = v > BAYER[(y & 3) * 4 + (x & 3)] + .5, c = on ? PAPER : INK; od[i] = c[0]; od[i + 1] = c[1]; od[i + 2] = c[2]; od[i + 3] = 255; }
  cx.putImageData(o, 0, 0); tex.needsUpdate = true;
 };
 const out = {
  group: g, buttons, game, onSound: sound, screen, canvas: cvs,
  // Which control a ray hit: the d-pad splits by where on the cross it landed (point in the unit's local space).
  keyAt(object, point) {
   for (let o = object; o; o = o.parent) { if (o.userData?.key && o.userData.key !== 'dpad' && o.parent === g) return o.userData.key; if (o === cross) { const p = g.worldToLocal(point.clone()), dx = p.x - cross.position.x, dz = p.z - cross.position.z; return Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'left' : 'right') : (dz < 0 ? 'up' : 'down'); } }
   return null;
  },
  press(k, down) {
   game.press(k, down); const m = k === 'left' || k === 'right' || k === 'up' || k === 'down' ? cross : Object.values(buttons).find(b => b.key === k)?.mesh;
   if (m === cross) { cross.rotation.z = down ? (k === 'left' ? .09 : k === 'right' ? -.09 : 0) : 0; cross.rotation.x = down ? (k === 'up' ? -.09 : k === 'down' ? .09 : 0) : 0; }
   else if (m) m.position.y = m.userData.rest - (down ? .0022 : 0);
   dirty = true;
  },
  releaseAll() { for (const k of Object.keys(game.held)) if (game.held[k]) out.press(k, false); },
  step(dt, visible = true) { acc += dt; game.step(dt); if (visible && (acc > 1 / 30 || dirty)) { acc = 0; dirty = false; draw(); } },
  redraw() { draw(); },
 };
 draw();
 return out;
}
