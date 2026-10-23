// Low poly stand-ins for the vehicles and the tow critter, built from named parts with named materials (the game reads
// the material names as shading roles). The jet cart is original to this study. `buggy` and `coaster` are placeholders
// until the Moon Mission buggy and the toy-car coaster car register their real models with registerVehicle().
// Every builder returns {group, parts:{...}, seats:[Vector3 x3], wheels:[...]} facing +Z (forward), origin on the ground.
import * as T from 'three';

const mat = (name, color, o = {}) => Object.assign(new T.MeshStandardMaterial({color, flatShading: true, roughness: .7, metalness: 0, ...o}), {name});
const M = {
 chrome: mat('cart-chrome', '#cfd8e3', {metalness: .8, roughness: .3}), basket: mat('cart-basket-wire', '#aeb9c7', {metalness: .6, roughness: .4}),
 red: mat('cart-handle-red', '#e8433f'), tyre: mat('tyre-rubber', '#2b2b33', {roughness: .95}), hub: mat('wheel-hub', '#f4f1e8'),
 flame: mat('jet-flame', '#ffb02e', {emissive: '#ff7a1a', emissiveIntensity: 1.6}), jet: mat('jetpack-shell', '#f25f8c'), jetDark: mat('jetpack-nozzle', '#4a4a58'),
 skin: mat('skin', '#e9b48f'), skinDeep: mat('skin-deep', '#a87654'), pink: mat('abbie-shirt', '#ff6fae'), purple: mat('ani-shirt', '#8e5be8'), denim: mat('daddy-shirt', '#4b78c8'),
 hair: mat('abbie-hair', '#7a4a2a'), aniHair: mat('ani-hair', '#3a2418'), pearl: mat('white', '#f6f4f2'), eye: mat('eye', '#2a1f1a')
};
const box = (w, h, d, m, x = 0, y = 0, z = 0, name) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (name) o.name = name; return o; };
const cyl = (r0, r1, h, m, x = 0, y = 0, z = 0, seg = 8, name) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); if (name) o.name = name; return o; };
const ball = (r, m, x = 0, y = 0, z = 0, name) => { const o = new T.Mesh(new T.IcosahedronGeometry(r, 1), m); o.position.set(x, y, z); if (name) o.name = name; return o; };

// A rider is a chunky figure from the neck up with a body, a head, hair and two hands. `kind` picks colours.
function rider(kind) {
 const g = new T.Group(); g.name = 'rider-' + kind;
 const s = {abbie: [M.pink, M.skin, M.hair, .78], ani: [M.purple, M.skinDeep, M.aniHair, .8], daddy: [M.denim, M.skin, null, 1.05]}[kind];
 const body = cyl(.22 * s[3], .26 * s[3], .5 * s[3], s[0], 0, .25 * s[3], 0, 8, 'torso'); g.add(body);
 const head = ball(.2 * s[3], s[1], 0, .62 * s[3], 0, 'head'); g.add(head);
 if (s[2]) { const h = ball(.215 * s[3], s[2], 0, .68 * s[3], -.03, 'hair'); h.scale.set(1, .85, 1); g.add(h); }
 if (kind === 'daddy') { g.add(ball(.13, M.hair.clone(), 0, .52 * s[3], .12, 'beard')); g.children.at(-1).material = mat('beard-grey', '#8d8f94'); }
 if (kind === 'ani') { g.add(ball(.13, M.aniHair, -.18, .62 * s[3], 0, 'ponytail-l'), ball(.13, M.aniHair, .18, .62 * s[3], 0, 'ponytail-r')); }
 for (const side of [-1, 1]) g.add(ball(.07, s[1], side * .28 * s[3], .55 * s[3], .1, 'hand'));
 for (const side of [-1, 1]) g.add(ball(.035, M.eye, side * .07 * s[3], .65 * s[3], .17 * s[3], 'eye'));
 g.userData.head = head; return g;
}

export function buildJetCart() {
 const group = new T.Group(); group.name = 'jet-cart'; const wheels = [], parts = {};
 // the shopping cart: a wire basket on a chrome frame, four fat wheels, a red handle at the back
 const basket = new T.Group(); basket.name = 'basket'; group.add(basket);
 basket.add(box(1.5, .08, 2.1, M.chrome, 0, .55, 0, 'floor'));
 for (const s of [-1, 1]) { basket.add(box(.06, .62, 2.1, M.basket, s * .75, .88, 0, 'side-rail')); }
 basket.add(box(1.5, .62, .06, M.basket, 0, .88, 1.05, 'front-rail'));
 basket.add(box(1.5, .62, .06, M.basket, 0, .88, -1.05, 'back-rail'));
 for (const s of [-1, 1]) for (const z of [-.7, 0, .7]) basket.add(box(.04, .6, .04, M.chrome, s * .75, .88, z, 'wire'));
 basket.add(box(1.56, .07, .07, M.chrome, 0, 1.2, 1.05, 'rim-front')); basket.add(box(1.56, .07, .07, M.chrome, 0, 1.2, -1.05, 'rim-back'));
 for (const s of [-1, 1]) basket.add(box(.07, .07, 2.16, M.chrome, s * .78, 1.2, 0, 'rim-side'));
 const handle = new T.Group(); handle.name = 'handle'; handle.add(box(1.5, .09, .09, M.red, 0, 1.75, -1.35, 'bar'));
 for (const s of [-1, 1]) handle.add(box(.07, .65, .07, M.chrome, s * .72, 1.43, -1.2, 'post')); group.add(handle);
 for (const [x, z] of [[-.62, .85], [.62, .85], [-.62, -.85], [.62, -.85]]) {
  const w = new T.Group(); w.position.set(x, .26, z); const tyre = cyl(.26, .26, .2, M.tyre, 0, 0, 0, 10, 'tyre'); tyre.rotation.z = Math.PI / 2;
  const hub = cyl(.11, .11, .22, M.hub, 0, 0, 0, 6, 'hub'); hub.rotation.z = Math.PI / 2; w.add(tyre, hub); w.userData.spin = true; group.add(w); wheels.push(w);
 }
 // the jetpack: two tanks and nozzles on the back, flame cones underneath that grow with thrust
 const jet = new T.Group(); jet.name = 'jetpack'; jet.position.set(0, 1.05, -1.25);
 for (const s of [-1, 1]) { jet.add(cyl(.22, .22, .95, M.jet, s * .32, .3, 0, 10, 'tank')); jet.add(cyl(.2, .3, .25, M.jetDark, s * .32, -.3, 0, 10, 'nozzle')); }
 jet.add(box(.9, .12, .3, M.chrome, 0, .55, .12, 'strap')); group.add(jet);
 const flames = [-1, 1].map(s => { const f = new T.Mesh(new T.ConeGeometry(.2, 1, 8), M.flame); f.name = 'flame'; f.rotation.x = Math.PI; f.position.set(s * .32, -.9, 0); jet.add(f); return f; });
 // the three of us, Abbie in front (smallest), Ani in the middle, Daddy at the back by the handle
 const seats = [new T.Vector3(0, .62, .55), new T.Vector3(-.3, .62, -.1), new T.Vector3(.3, .62, -.75)];
 const riders = [rider('abbie'), rider('ani'), rider('daddy')];
 riders[0].position.copy(seats[0]); riders[1].position.set(-.28, .62, -.05); riders[2].position.set(.28, .62, -.75); riders[1].position.copy(seats[1]); riders[2].position.copy(seats[2]);
 riders.forEach(r => group.add(r));
 // original little pennant on the handle so it reads from the sky in god mode
 const flag = new T.Mesh(new T.ConeGeometry(.16, .6, 3), mat('pennant', '#ffd95a')); flag.rotation.set(Math.PI / 2, 0, Math.PI / 2); flag.position.set(.7, 2.2, -1.35); group.add(flag);
 Object.assign(parts, {basket, jet, flames, riders, flag, wheels});
 return {group, parts, seats, wheels, name: 'Jet cart', hover: .0, size: 1.4};
}

// Placeholder kart bodies. Real ones replace them via registerVehicle(id, builder).
function kart(name, body, accent, round) {
 const group = new T.Group(); group.name = name; const wheels = [];
 const bm = mat(name + '-body', body), am = mat(name + '-accent', accent);
 group.add(box(1.5, .5, 2.6, bm, 0, .55, 0, 'chassis'), box(1.1, .35, .9, am, 0, .95, -.3, 'seat-back'), box(1.3, .12, .5, am, 0, .5, 1.45, 'nose'));
 if (round) { group.add(ball(.55, am, 0, 1.0, 0, 'canopy')); }
 for (const [x, z] of [[-.85, .95], [.85, .95], [-.85, -.95], [.85, -.95]]) { const w = new T.Group(); w.position.set(x, .32, z); const t = cyl(.32, .32, .3, M.tyre, 0, 0, 0, 10, 'tyre'); t.rotation.z = Math.PI / 2; w.add(t); w.userData.spin = true; group.add(w); wheels.push(w); }
 const riders = [rider('abbie'), rider('ani'), rider('daddy')], seats = [new T.Vector3(0, .85, .3), new T.Vector3(-.3, .85, -.4), new T.Vector3(.3, .85, -.4)];
 riders.forEach((r, i) => { r.position.copy(seats[i]); r.scale.setScalar(.8); group.add(r); });
 const flames = [], jet = new T.Group();
 return {group, parts: {riders, wheels, flames, jet}, seats, wheels, name, size: 1.3};
}
export const VEHICLES = {
 cart: {id: 'cart', name: 'Jet cart', icon: '🛒', build: buildJetCart, jetpack: true},
 buggy: {id: 'buggy', name: 'Moon buggy', icon: '🚙', build: () => kart('Moon buggy', '#c9ccd6', '#3e8ee8', false), jetpack: false},
 coaster: {id: 'coaster', name: 'Toy-car coaster car', icon: '🏎️', build: () => kart('Toy-car', '#ff5a3c', '#ffd95a', true), jetpack: false}
};
export const registerVehicle = (id, v) => { VEHICLES[id] = {...(VEHICLES[id] || {}), ...v, id}; };

// ---- the tow critter. Original: Nubbin, a round teal bumble-badger in an orange scarf with a tow harness. Not a turtle,
// not a plumber's pal, nothing from anyone else's games.
export function buildNubbin() {
 const group = new T.Group(); group.name = 'nubbin';
 const fur = mat('nubbin-fur', '#2fb8a6'), belly = mat('nubbin-belly', '#f7efd8'), scarf = mat('nubbin-scarf', '#ff8a2a'), dark = mat('nubbin-dark', '#1e3f44');
 const body = ball(.8, fur, 0, .95, 0, 'body'); body.scale.set(1, .95, 1.15); group.add(body);
 group.add(ball(.55, belly, 0, .85, .38, 'belly'));
 const head = new T.Group(); head.position.set(0, 1.45, .65);
 head.add(ball(.5, fur, 0, 0, 0, 'head'), ball(.22, belly, 0, -.12, .38, 'muzzle'), ball(.09, dark, 0, -.02, .58, 'nose'));
 for (const s of [-1, 1]) { head.add(ball(.14, dark, s * .2, .12, .4, 'eye'), ball(.06, M.pearl, s * .2, .16, .5, 'eye-glint')); const ear = ball(.2, fur, s * .38, .42, -.05, 'ear'); ear.scale.set(1, 1.2, .5); head.add(ear); }
 group.add(head);
 const sc = new T.Mesh(new T.TorusGeometry(.5, .13, 5, 10), scarf); sc.name = 'scarf'; sc.position.set(0, 1.25, .5); sc.rotation.x = Math.PI / 2.3; group.add(sc);
 group.add(box(.18, .5, .06, scarf, .45, 1.0, -.45, 'scarf-tail'));
 const legs = [];
 for (const [x, z] of [[-.4, .5], [.4, .5], [-.4, -.4], [.4, -.4]]) { const l = new T.Group(); l.position.set(x, .45, z); l.add(cyl(.17, .2, .55, fur, 0, -.15, 0, 6, 'leg'), ball(.2, dark, 0, -.42, .05, 'paw')); group.add(l); legs.push(l); }
 const tail = ball(.28, belly, 0, 1.05, -1.0, 'tail'); group.add(tail);
 group.add(box(.12, .12, 1.3, mat('harness-rope', '#d9b36a'), 0, .8, .3, 'harness'));
 group.userData = {legs, head, tail}; return {group, legs, head, tail};
}
