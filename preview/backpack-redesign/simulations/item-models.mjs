// What the things in Abbie's backpack look like up close (Evan, 2026-10-24 02:01Z: "when abbie picks something out of
// her bag. she should be able to see it close up! it should look like something"). Small low-poly models built from
// named parts, flat shaded, materials named by role like every other asset. The backpack's close-up (backpack.mjs
// inspect) turns one of these slowly in front of the camera instead of a flat picture.
//
//   import {itemModel} from './item-models.mjs';
//   const g = itemModel(THREE, item);   // a Group, centred, about 1 unit across, or a token for things with no model
//
// Add a model: a builder keyed by the item id (or by its fuel kind for the effect pickups). Anything without one gets
// a token: its picture set into a round glass-and-brass charm, so it still reads as an object, not a sticker.

const M = (T, name, color, o = {}) => Object.assign(new T.MeshStandardMaterial({color, flatShading: true, roughness: .55, ...o}), {name});
const part = (T, geo, mat, name, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = []) => {
  const m = new T.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m;
};

const BUILD = {
  // The café's secret key: brass, a heart for a bow.
  'cafe-basement-key'(T, g) {
    const brass = M(T, 'metal brass', '#e0b04a', {metalness: .85, roughness: .3});
    const h = new T.Shape(); h.moveTo(0, -.18); h.bezierCurveTo(-.3, .02, -.14, .24, 0, .1); h.bezierCurveTo(.14, .24, .3, .02, 0, -.18);
    const bow = new T.ExtrudeGeometry(h, {depth: .06, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1, curveSegments: 6});
    g.add(part(T, bow, brass, 'key bow', [0, .42, -.03]));
    g.add(part(T, new T.CylinderGeometry(.035, .035, .62, 6), brass, 'key shaft', [0, .02, 0]));
    g.add(part(T, new T.BoxGeometry(.16, .05, .05), brass, 'key bit', [.08, -.22, 0]));
    g.add(part(T, new T.BoxGeometry(.1, .05, .05), brass, 'key bit', [.05, -.12, 0]));
  },
  // A paper sack of sugar, folded over at the top.
  'quest-sugar'(T, g) {
    const paper = M(T, 'paper kraft', '#d8b98a'), label = M(T, 'paper label', '#ffffff'), ink = M(T, 'ink blue', '#4f7fd0');
    g.add(part(T, new T.BoxGeometry(.55, .7, .34), paper, 'sack'));
    g.add(part(T, new T.BoxGeometry(.57, .1, .2), paper, 'sack fold', [0, .4, 0], [.25, 0, 0]));
    g.add(part(T, new T.BoxGeometry(.38, .26, .01), label, 'sack label', [0, -.02, .175]));
    g.add(part(T, new T.BoxGeometry(.24, .05, .012), ink, 'sack lettering', [0, .02, .18]));
    for (let i = 0; i < 5; i++) g.add(part(T, new T.BoxGeometry(.03, .03, .03), label, 'sugar grain', [-.2 + i * .1, -.4, .1 * Math.sin(i * 2)], [i, i, 0]));
  },
  // A box of chalk, lid off, sticks in every colour.
  'quest-chalk'(T, g) {
    const card = M(T, 'card yellow', '#ffcf4a');
    g.add(part(T, new T.BoxGeometry(.8, .16, .4), card, 'chalk box'));
    ['#ff6f91', '#7fd1ff', '#9be07a', '#ffffff', '#c59bff', '#ffa24c'].forEach((c, i) =>
      g.add(part(T, new T.CylinderGeometry(.045, .045, .36, 6), M(T, 'chalk stick', c, {roughness: .95}), 'chalk stick', [-.3 + i * .12, .14, 0], [Math.PI / 2, 0, .08 * (i % 2 ? 1 : -1)])));
  },
  // A library book, cloth cover, pages showing.
  'quest-book'(T, g) {
    const cover = M(T, 'cloth cover red', '#c8424f'), pages = M(T, 'paper pages', '#fbf3df'), gold = M(T, 'gold foil', '#e9b949', {metalness: .7, roughness: .35});
    g.add(part(T, new T.BoxGeometry(.62, .82, .05), cover, 'book cover back', [0, 0, -.1]));
    g.add(part(T, new T.BoxGeometry(.62, .82, .05), cover, 'book cover front', [0, 0, .1]));
    g.add(part(T, new T.BoxGeometry(.06, .82, .25), cover, 'book spine', [-.3, 0, 0]));
    g.add(part(T, new T.BoxGeometry(.58, .78, .16), pages, 'book pages', [.02, 0, 0]));
    g.add(part(T, new T.BoxGeometry(.3, .05, .01), gold, 'book title', [0, .2, .127]));
    g.add(part(T, new T.BoxGeometry(.05, .26, .01), M(T, 'ribbon bookmark', '#3a7bd5'), 'bookmark', [.12, -.48, .02]));
  },
  // A sealed letter: an envelope with a wax heart.
  'quest-letter'(T, g) {
    const paper = M(T, 'paper envelope', '#fff6ea'), wax = M(T, 'wax seal red', '#d0304a', {roughness: .35});
    g.add(part(T, new T.BoxGeometry(.9, .6, .03), paper, 'envelope'));
    const flap = new T.Shape(); flap.moveTo(-.45, .3); flap.lineTo(.45, .3); flap.lineTo(0, -.05); flap.closePath();
    g.add(part(T, new T.ExtrudeGeometry(flap, {depth: .01, bevelEnabled: false}), M(T, 'paper flap', '#f2e4cf'), 'envelope flap', [0, 0, .016]));
    g.add(part(T, new T.CylinderGeometry(.09, .09, .03, 10), wax, 'wax seal', [0, -.03, .035], [Math.PI / 2, 0, 0]));
  },
  // A glass jar of seeds with a screw lid; it rattles.
  'quest-seed-jar'(T, g) {
    const glass = M(T, 'glass jar', '#cfeeff', {transparent: true, opacity: .45, roughness: .08, metalness: 0}), lid = M(T, 'metal lid', '#5aa36b', {metalness: .6, roughness: .35});
    g.add(part(T, new T.CylinderGeometry(.3, .3, .62, 10), glass, 'jar'));
    g.add(part(T, new T.CylinderGeometry(.27, .27, .12, 10), lid, 'jar lid', [0, .37, 0]));
    const seed = M(T, 'seeds brown', '#8a5a2b');
    for (let i = 0; i < 26; i++) { const a = i * 2.4, r = .08 + (i % 4) * .045; g.add(part(T, new T.SphereGeometry(.035, 5, 4), seed, 'seed', [Math.cos(a) * r, -.25 + Math.floor(i / 6) * .06, Math.sin(a) * r])); }
    g.add(part(T, new T.BoxGeometry(.3, .16, .01), M(T, 'paper label', '#fff3c4'), 'jar label', [0, .05, .3]));
  },
  // The lucky magnifier: brass rim, glass, a wooden handle.
  'quest-lucky-glass'(T, g) {
    const brass = M(T, 'metal brass', '#e0b04a', {metalness: .85, roughness: .3}), wood = M(T, 'wood handle', '#8b5a32');
    g.add(part(T, new T.TorusGeometry(.28, .045, 6, 16), brass, 'magnifier rim', [0, .2, 0]));
    g.add(part(T, new T.CylinderGeometry(.27, .27, .02, 16), M(T, 'glass lens', '#d9f3ff', {transparent: true, opacity: .4, roughness: .05}), 'magnifier lens', [0, .2, 0], [Math.PI / 2, 0, 0]));
    g.add(part(T, new T.CylinderGeometry(.05, .06, .42, 6), wood, 'magnifier handle', [0, -.3, 0]));
    g.add(part(T, new T.CylinderGeometry(.065, .065, .06, 6), brass, 'magnifier collar', [0, -.08, 0]));
  },
  // Bub's lead: a red loop, a clip and a coiled length.
  "quest-lead"(T, g) {
    const strap = M(T, 'fabric lead red', '#d6453d'), metal = M(T, 'metal clip', '#c9ced6', {metalness: .8, roughness: .3});
    for (let i = 0; i < 3; i++) g.add(part(T, new T.TorusGeometry(.26 - i * .03, .035, 5, 14), strap, 'lead coil', [0, -.05 + i * .02, 0], [Math.PI / 2 + i * .15, 0, i * .3]));
    g.add(part(T, new T.TorusGeometry(.14, .035, 5, 10), strap, 'lead handle loop', [0, .38, 0]));
    g.add(part(T, new T.BoxGeometry(.05, .2, .05), strap, 'lead strap', [0, .2, 0]));
    g.add(part(T, new T.TorusGeometry(.05, .015, 4, 8), metal, 'lead clip ring', [.3, -.1, 0]));
    g.add(part(T, new T.BoxGeometry(.04, .14, .03), metal, 'lead clip', [.3, -.22, 0]));
  },
  // The lost cup, with a tiny cat on it.
  'quest-lost-cup'(T, g) {
    const china = M(T, 'china cup', '#f7f1ea', {roughness: .3}), cat = M(T, 'paint cat', '#ff9f43');
    g.add(part(T, new T.CylinderGeometry(.3, .23, .45, 12, 1, true), china, 'cup'));
    g.add(part(T, new T.CylinderGeometry(.23, .23, .02, 12), china, 'cup base', [0, -.22, 0]));
    g.add(part(T, new T.TorusGeometry(.11, .035, 5, 10, Math.PI * 1.2), china, 'cup handle', [.31, 0, 0], [0, 0, -Math.PI * .6]));
    g.add(part(T, new T.CylinderGeometry(.28, .28, .01, 12), M(T, 'tea', '#a8683a'), 'tea', [0, .15, 0]));
    g.add(part(T, new T.SphereGeometry(.07, 6, 5), cat, 'cat head', [0, .02, .27]));
    g.add(part(T, new T.ConeGeometry(.03, .06, 4), cat, 'cat ear', [-.04, .09, .27]));
    g.add(part(T, new T.ConeGeometry(.03, .06, 4), cat, 'cat ear', [.04, .09, .27]));
  },
  // The effect pickups found while driving.
  ember(T, g) {
    g.add(part(T, new T.OctahedronGeometry(.32, 0), M(T, 'ember glow', '#ff7a1a', {emissive: '#ff4a00', emissiveIntensity: .8}), 'ember', [0, 0, 0], [0, .4, 0]));
    g.add(part(T, new T.OctahedronGeometry(.16, 0), M(T, 'ember core', '#ffd44a', {emissive: '#ffb000', emissiveIntensity: 1}), 'ember core', [0, .05, .14]));
  },
  droplet(T, g) {
    const d = new T.SphereGeometry(.3, 10, 8); const p = d.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) { const k = 1 - y / .3; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y * 1.9); } }
    d.computeVertexNormals();
    g.add(part(T, d, M(T, 'water drop', '#5cc6ff', {transparent: true, opacity: .8, roughness: .05}), 'droplet'));
  },
  treat(T, g) {
    const biscuit = M(T, 'biscuit', '#c98d4a', {roughness: .9});
    g.add(part(T, new T.BoxGeometry(.6, .16, .12), biscuit, 'bone shaft'));
    for (const x of [-.32, .32]) for (const y of [-.08, .08]) g.add(part(T, new T.SphereGeometry(.11, 6, 5), biscuit, 'bone knob', [x, y, 0]));
  },
  dye(T, g) {
    const glass = M(T, 'glass bottle', '#ffffff', {transparent: true, opacity: .5, roughness: .05});
    g.add(part(T, new T.CylinderGeometry(.18, .2, .42, 8), glass, 'dye bottle'));
    g.add(part(T, new T.CylinderGeometry(.17, .19, .3, 8), M(T, 'dye rainbow', '#ff5fa2', {emissive: '#7a2bff', emissiveIntensity: .25}), 'dye', [0, -.05, 0]));
    g.add(part(T, new T.CylinderGeometry(.07, .07, .14, 6), glass, 'dye neck', [0, .28, 0]));
    g.add(part(T, new T.CylinderGeometry(.08, .08, .08, 6), M(T, 'cork', '#b48650'), 'cork', [0, .38, 0]));
  },
};

// Anything without a model: its picture, set into a round glass-and-brass token.
function token(T, g, item, picture) {
  const brass = M(T, 'metal brass', '#e0b04a', {metalness: .85, roughness: .3});
  g.add(part(T, new T.CylinderGeometry(.5, .5, .1, 24), brass, 'token rim', [0, 0, 0], [Math.PI / 2, 0, 0]));
  g.add(part(T, new T.CylinderGeometry(.44, .44, .12, 24), M(T, 'token face', '#fffaf0', {roughness: .6}), 'token face', [0, 0, 0], [Math.PI / 2, 0, 0]));
  if (picture) {
    const face = new T.Mesh(new T.CircleGeometry(.42, 24), new T.MeshBasicMaterial({map: picture, transparent: true, toneMapped: false}));
    face.name = 'token picture'; face.position.z = .065; g.add(face);
    const back = face.clone(); back.name = 'token picture'; back.position.z = -.065; back.rotation.y = Math.PI; g.add(back);
  }
}

export function itemModel(T, item, picture = null) {
  const g = new T.Group(); g.name = `item ${item?.id || ''}`;
  const build = BUILD[item?.id] || BUILD[item?.fuel];
  if (build) build(T, g); else token(T, g, item, picture);
  // Centre it and make it about one unit across, so the close-up sizes every thing the same way.
  const box = new T.Box3().setFromObject(g), size = box.getSize(new T.Vector3()), mid = box.getCenter(new T.Vector3());
  const k = 1 / Math.max(size.x, size.y, size.z, .001);
  const holder = new T.Group(); holder.name = g.name; g.name = 'item parts'; g.position.copy(mid).multiplyScalar(-k); g.scale.setScalar(k); holder.add(g);
  holder.userData.modelled = !!build;
  return holder;
}

export const hasItemModel = item => !!(BUILD[item?.id] || BUILD[item?.fuel]);
