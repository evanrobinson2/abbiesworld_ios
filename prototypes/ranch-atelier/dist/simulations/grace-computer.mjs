import * as T from 'three';

// Aunt Grace's computer, 1986 (AW-STUDY-0024). A beige all-in-one in the PS/2 Model 25 mould, modelled from Evan's
// photo parts-first: one shell profile, a grey bezel with a chamfered screen funnel, a curved CRT face, a forward
// plinth holding the floppy and three blank bays, side vent ribs. Low poly; every part is named for what it is and
// the material names are shading roles. The badge is generic: no maker's logo. Units are metres, origin at the
// middle of the base, front facing +z. Recipe notes and rounds: tools/grace-computer/notes.json.
export const GRACE_SIZE = {w: .295, h: .38, d: .375};

const ROLE = {
 beige: ['beige plastic', '#e4dccb', .62],
 bezel: ['bezel grey plastic', '#a7a49d', .58],
 funnel: ['bezel grey plastic shade', '#8f8c86', .62],
 glass: ['screen glass', '#4b504d', .16],
 slot: ['drive slot black', '#151515', .7],
 lever: ['drive latch black', '#2a2a2a', .45],
 teal: ['eject button teal', '#3fa5a0', .4],
 led: ['drive light green', '#2f6a3a', .4],
 gap: ['panel gap shadow', '#5d584f', .9],
 badge: ['badge grey', '#8d8a84', .45],
 foot: ['rubber foot', '#2b2a28', .9],
};

export function createGraceComputer({screenMaterial} = {}) {
 const {w: W, h: H, d: D} = GRACE_SIZE;
 const root = new T.Group(); root.name = "Grace's computer";
 const mats = {};
 const mat = k => mats[k] ||= Object.assign(new T.MeshStandardMaterial({color: ROLE[k][1], roughness: ROLE[k][2], metalness: k === 'glass' ? .1 : 0}), {name: ROLE[k][0]});
 const add = (name, g, k, p = root) => { const m = new T.Mesh(g, typeof k === 'string' ? mat(k) : k); m.name = name; m.castShadow = m.receiveShadow = true; p.add(m); return m; };
 const box = (name, w, h, d, k, x, y, z, p) => { const m = add(name, new T.BoxGeometry(w, h, d), k, p); m.position.set(x, y, z); return m; };

 // Shell: one side profile (tall monitor front, sloped shoulder, lower tube housing behind) extruded across the width.
 const zf = D / 2 - .05, b = .004;
 const prof = [[zf, .006], [zf, H - .007], [zf - .007, H], [.02, H], [-.03, H - .085], [-D / 2 + .006, H - .085], [-D / 2, H - .091], [-D / 2, .006], [-D / 2 + .006, 0], [zf - .006, 0]];
 const s = new T.Shape(prof.map(([z, y]) => new T.Vector2(z, y)));
 const shellG = new T.ExtrudeGeometry(s, {depth: W - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1});
 shellG.rotateY(-Math.PI / 2); shellG.translate((W - 2 * b) / 2, 0, 0);
 add('case shell', shellG, 'beige');

 // Side vents: a dark band with upright ribs, high on the tube housing, both sides.
 for (const sx of [-1, 1]) {
  const x = sx * (W / 2 + .0005), z0 = -D / 2 + .03, z1 = -.045, y0 = H - .15, y1 = H - .1;
  box(`side vent band ${sx < 0 ? 'left' : 'right'}`, .001, y1 - y0, z1 - z0, 'gap', x, (y0 + y1) / 2, (z0 + z1) / 2);
  const ribs = new T.Group(); ribs.name = `side vent ribs ${sx < 0 ? 'left' : 'right'}`; root.add(ribs);
  for (let z = z0 + .004; z < z1 - .002; z += .0075) box('vent rib', .003, y1 - y0, .0035, 'beige', x + sx * .001, (y0 + y1) / 2, z, ribs);
 }

 // Bezel: grey plate with a rounded window, proud of the shell front.
 const bz0 = .112, bz1 = H - .012, bw = W - .02, bt = .036, bzF = zf + b + bt;
 const win = {w: .204, h: .178, r: .013, cx: 0, cy: bz1 - .024 - .088};
 const plate = new T.Shape(rrect(bw, bz1 - bz0, .014, 3).map(([x, y]) => new T.Vector2(x, y + (bz0 + bz1) / 2)));
 plate.holes.push(new T.Path(rrect(win.w, win.h, win.r, 3).reverse().map(([x, y]) => new T.Vector2(x + win.cx, y + win.cy))));
 const plateG = new T.ExtrudeGeometry(plate, {depth: bt, bevelEnabled: true, bevelSize: .002, bevelThickness: .002, bevelSegments: 1});
 plateG.translate(0, 0, zf + b);
 add('bezel', plateG, 'bezel');

 // Screen funnel: the bezel's inner slope from the window back to the tube face.
 const depth = .03, inset = .009;
 const outer = rrect(win.w, win.h, win.r, 3), inner = rrect(win.w - 2 * inset, win.h - 2 * inset, win.r * .7, 3);
 const fp = [], fi = [];
 outer.forEach(([x, y]) => fp.push(x + win.cx, y + win.cy, bzF - .001));
 inner.forEach(([x, y]) => fp.push(x + win.cx, y + win.cy, bzF - depth));
 const n = outer.length;
 for (let i = 0; i < n; i++) { const j = (i + 1) % n; fi.push(i, n + i, j, j, n + i, n + j); }
 const funG = new T.BufferGeometry(); funG.setAttribute('position', new T.Float32BufferAttribute(fp, 3)); funG.setIndex(fi); funG.computeVertexNormals();
 const fun = add('screen funnel', funG, 'funnel'); fun.material.side = T.DoubleSide;

 // CRT face: a slightly bulged rounded rectangle, UVs over the visible window so a terminal texture fits.
 const gw = win.w - 2 * inset + .004, gh = win.h - 2 * inset + .004;
 const glassG = new T.PlaneGeometry(gw, gh, 8, 6), gp = glassG.attributes.position;
 for (let i = 0; i < gp.count; i++) { const u = gp.getX(i) / (gw / 2), v = gp.getY(i) / (gh / 2); gp.setZ(i, .009 * (1 - .55 * u * u - .45 * v * v)); }
 glassG.computeVertexNormals();
 const screen = add('screen', glassG, screenMaterial || 'glass');
 screen.position.set(win.cx, win.cy, bzF - depth - .004);
 screen.userData.window = {w: gw, h: gh};

 // Badge (generic disc, no logo) and the four small controls under the window.
 const badge = add('badge', new T.CylinderGeometry(.011, .011, .003, 12), 'badge');
 badge.rotation.x = Math.PI / 2; badge.position.set(-bw / 2 + .03, bz1 - .022, bzF + .0015);
 const ring = add('badge ring', new T.TorusGeometry(.0085, .0012, 4, 12), 'bezel'); ring.position.set(badge.position.x, badge.position.y, bzF + .003);
 const controls = new T.Group(); controls.name = 'screen controls'; root.add(controls);
 for (const [i, x] of [.048, .066, .084, .1].entries()) {
  const k = add(i === 3 ? 'power light' : `knob ${i + 1}`, new T.CylinderGeometry(.0042, .0046, .004, 8), i === 3 ? 'led' : 'bezel', controls);
  k.rotation.x = Math.PI / 2; k.position.set(x, bz0 + .02, bzF + .002);
 }

 // Plinth: the system unit's front, standing forward of the bezel, with the drive bays.
 const pl = {h: bz0 - .004, d: bt - .012}, pz = zf + b + pl.d / 2;
 box('front plinth', W - .006, pl.h, pl.d, 'beige', 0, pl.h / 2 + .002, pz);
 const bay = {x0: -.072, x1: .1, y0: .014, y1: pl.h - .008}, bf = zf + b + pl.d;
 box('drive bay well', bay.x1 - bay.x0, bay.y1 - bay.y0, .004, 'gap', (bay.x0 + bay.x1) / 2, (bay.y0 + bay.y1) / 2, bf - .0015);
 const xm = .014, ym = (bay.y0 + bay.y1) / 2 + .003, g = .0035;
 const cells = [['floppy drive face', bay.x0, xm, ym, bay.y1], ['blank bay upper', xm, bay.x1, ym, bay.y1], ['bay door left', bay.x0, xm, bay.y0, ym], ['bay door right', xm, bay.x1, bay.y0, ym]];
 for (const [name, x0, x1, y0, y1] of cells) box(name, x1 - x0 - g, y1 - y0 - g, .006, 'beige', (x0 + x1) / 2, (y0 + y1) / 2, bf - .002);
 const fy = (ym + bay.y1) / 2 + .002, fx = (bay.x0 + xm) / 2, ff = bf + .001;
 box('floppy slot', .066, .0045, .002, 'slot', fx - .002, fy, ff);
 box('floppy latch', .016, .007, .005, 'lever', fx + .008, fy + .002, ff + .002);
 box('floppy eject', .006, .009, .004, 'teal', fx + .03, fy - .006, ff + .001);
 box('floppy light', .005, .002, .002, 'led', fx - .03, fy - .011, ff);
 box('bay seam', bay.x1 - bay.x0, .0015, .001, 'gap', (bay.x0 + bay.x1) / 2, bay.y1 + .004, bf);

 for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box('foot', .03, .006, .02, 'foot', x * (W / 2 - .025), -.002, z * (D / 2 - .04));

 // Power: a rocker switch low on the right side (it tips to show on or off), and the cord socket on the back.
 const power = new T.Group(); power.name = 'power switch'; power.position.set(W / 2 + .001, .05, zf - .07); root.add(power);
 box('power switch surround', .004, .03, .022, 'gap', 0, 0, 0, power);
 const rocker = new T.Group(); rocker.name = 'power rocker'; power.add(rocker);
 box('power rocker red', .006, .013, .018, Object.assign(new T.MeshStandardMaterial({color: '#b0302a', roughness: .5}), {name: 'power rocker red'}), .003, .0065, 0, rocker);
 box('power rocker white', .006, .013, .018, 'beige', .003, -.0065, 0, rocker);
 rocker.rotation.z = .18; // off: the red half stands out; on tips it in (rotation.z = -.18)
 const socket = box('power socket', .03, .022, .004, 'gap', W / 2 - .05, .04, -D / 2 - .001);

 root.userData.screen = screen; root.userData.rocker = rocker; root.userData.socket = socket;
 return root;
}

// A rounded rectangle loop centred on the origin, counter-clockwise, `n` segments per corner.
function rrect(w, h, r, n) {
 const out = [], a = w / 2 - r, c = h / 2 - r;
 for (const [cx, cy, s] of [[a, -c, -Math.PI / 2], [a, c, 0], [-a, c, Math.PI / 2], [-a, -c, Math.PI]])
  for (let i = 0; i <= n; i++) { const t = s + i / n * Math.PI / 2; out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
 return out;
}

// The matching keyboard: a low slab with a stepped key field, not modelled in the photo, so it follows the period
// look rather than any one board.
export function createGraceKeyboard() {
 const root = new T.Group(); root.name = "Grace's keyboard";
 const beige = Object.assign(new T.MeshStandardMaterial({color: '#ddd5c4', roughness: .62}), {name: 'beige plastic'});
 const cap = Object.assign(new T.MeshStandardMaterial({color: '#cfc7b6', roughness: .55}), {name: 'key cap'});
 const dark = Object.assign(new T.MeshStandardMaterial({color: '#7b766d', roughness: .55}), {name: 'key cap grey'});
 const base = new T.Mesh(new T.BoxGeometry(.46, .03, .18), beige); base.name = 'keyboard case'; base.position.y = .015; base.castShadow = base.receiveShadow = true; root.add(base);
 const keys = new T.Group(); keys.name = 'keys'; keys.rotation.x = .1; keys.position.set(0, .033, .005); root.add(keys);
 const rows = [[15, 1], [14, 1.5], [13, 1.75], [12, 2.25], [1, 7]];
 rows.forEach(([count, wide], r) => {
  const u = .0185, z = -.06 + r * u * 1.05; let x = -.2;
  for (let i = 0; i < count; i++) {
   const kw = (i === 0 && r < 4) ? u * wide : (r === 4 ? u * wide : u);
   const k = new T.Mesh(new T.BoxGeometry(kw - .003, .01, u - .003), (i === 0 || r === 4) ? dark : cap);
   k.name = r === 4 ? 'space bar' : 'key'; k.position.set(r === 4 ? -.03 : x + kw / 2, 0, z); keys.add(k); x += kw;
  }
 });
 const pad = new T.Group(); pad.name = 'number pad'; keys.add(pad);
 for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const k = new T.Mesh(new T.BoxGeometry(.0155, .01, .0155), cap); k.name = 'key'; k.position.set(.135 + c * .0185, 0, -.06 + r * .0194); pad.add(k); }
 return root;
}

// A 3.5-inch floppy for the drive: shell with the cut corner, sliding metal shutter over the head window, the steel
// hub on the back, a paper label with our own ruled lines, and the write-protect slide. 90 x 94 x 3.3 mm.
export function createGraceFloppy({shell = '#2b2d33', label = null} = {}) {
 const root = new T.Group(); root.name = 'floppy disk';
 const m = (name, color, rough = .5, metal = 0) => Object.assign(new T.MeshStandardMaterial({color, roughness: rough, metalness: metal}), {name});
 const plastic = m('floppy shell plastic', shell, .55), steel = m('shutter metal', '#c9ccd0', .3, .85), hubM = m('hub metal', '#a9adb3', .35, .8);
 const paper = Object.assign(m('label paper', '#f4f1e8', .85), label ? {map: label} : {}), ink = m('label ink blue', '#5a78b8', .8), dark = m('opening shadow', '#0d0d0f', .9);
 const W = .09, H = .094, t = .0033, c = .004;
 const add = (name, g, mt, x, y, z) => { const o = new T.Mesh(g, mt); o.name = name; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; root.add(o); return o; };
 const s = new T.Shape([[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2 - c], [W / 2 - c, H / 2], [-W / 2, H / 2]].map(([x, y]) => new T.Vector2(x, y)));
 const sg = new T.ExtrudeGeometry(s, {depth: t, bevelEnabled: true, bevelSize: .0004, bevelThickness: .0004, bevelSegments: 1}); sg.translate(0, 0, -t / 2);
 add('shell', sg, plastic, 0, 0, 0);
 // Shutter: wraps the top edge on both faces, with the head window cut as a dark inset on each side.
 const sw = .05, sh = .032, sx = -.006, sy = H / 2 - sh / 2;
 for (const z of [1, -1]) {
  add(z > 0 ? 'shutter front' : 'shutter back', new T.BoxGeometry(sw, sh, .0004), steel, sx, sy, z * (t / 2 + .0006));
  add('head window', new T.BoxGeometry(.012, .021, .0003), dark, sx + .006, sy - .002, z * (t / 2 + .0009));
 }
 add('shutter edge', new T.BoxGeometry(sw, .0006, t + .0016), steel, sx, H / 2 + .0002, 0);
 // Label on the front, below the shutter: paper with our own ruled lines.
 const lw = .07, lh = .052, ly = -H / 2 + .006 + lh / 2;
 add('label', new T.BoxGeometry(lw, lh, .0003), paper, 0, ly, t / 2 + .0006);
 if (!label) for (let i = 0; i < 4; i++) add('label rule', new T.BoxGeometry(lw - .01, .0006, .0002), ink, 0, ly + lh / 2 - .016 - i * .009, t / 2 + .0008);
 // Back: steel hub with its drive slots, and the write-protect slide in its square window.
 const hub = add('hub', new T.CylinderGeometry(.0125, .0125, .0005, 16), hubM, 0, -.004, -t / 2 - .0004); hub.rotation.x = Math.PI / 2;
 add('hub spindle hole', new T.BoxGeometry(.004, .004, .0003), dark, 0, -.004, -t / 2 - .0008);
 add('hub drive slot', new T.BoxGeometry(.003, .006, .0003), dark, .006, -.0055, -t / 2 - .0008);
 add('write-protect window', new T.BoxGeometry(.0045, .006, .0003), dark, W / 2 - .006, -H / 2 + .007, -t / 2 - .0003);
 add('write-protect slide', new T.BoxGeometry(.0042, .003, .0006), plastic, W / 2 - .006, -H / 2 + .0085, -t / 2 - .0004);
 return root;
}
