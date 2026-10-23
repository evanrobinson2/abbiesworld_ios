// The cast as little jointed toys (AW-STUDY-0013). The worker GLBs (/simulation-assets/workers/<name>-idle.glb) are
// rigid parts with no skeleton, so a character is posed through pivots made at load time: a shoulder pivot per arm,
// a hip pivot per leg and a neck pivot for the head. Shared by the café diorama and the photo booth, so the next
// place that needs the cast to move starts here, not from a copy.
//
//   const w = await loadWorker(T, loader, 'abbie', {height: 1.05});     // faces +Z, feet at y = 0, scaled to `height`
//   w.holder.position.set(x, y, z); w.holder.rotation.y = heading;      // put it in the scene: scene.add(w.holder)
//   setPose(w, {arms: [a, b], head, lean, lift, legs: [a, b]});         // radians; arms swing up and OUT, legs forward
//   tween(w, 'hooray', {ms: 380});  then each frame  stepTweens(now)
//   props: w.shades.visible, w.hat.visible
//
// GLTFLoader turns the part names' spaces into underscores, so every name test goes through normalise().

export const normalise = o => String(o.name || '').replace(/_/g, ' ');

const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Pose goals used by the booth and the dance floor. arms are [left, right] by screen side; see `rig`. */
export const POSES = (() => {
  const up = Math.PI * .68, out = Math.PI * .45;   // short chibi arms: past ~125 degrees the hands hide behind the head
  return {
    rest: {arms: [0, 0], head: 0, lean: 0, lift: 0, legs: [0, 0]},
    blink: {arms: [.1, .1], head: -.25, lean: .04, lift: 0, legs: [0, 0]},
    wave: {arms: [0, up], head: .1, lean: 0, lift: 0, legs: [0, 0]},
    hooray: {arms: [up, up], head: 0, lean: 0, lift: .02, legs: [0, 0]},
    silly: {arms: [out, out], head: .4, lean: .14, lift: 0, legs: [0, 0]},
    jump: {arms: [up * .8, up * .8], head: -.1, lean: 0, lift: .16, legs: [0, 0]},
    shades: {arms: [0, Math.PI * .35], head: -.08, lean: .05, lift: 0, legs: [0, 0], shades: 1},
    hat: {arms: [Math.PI * .25, Math.PI * .25], head: .15, lean: -.06, lift: 0, legs: [0, 0], hat: 1},
    reach: {arms: [0, Math.PI * .62], head: -.1, lean: .08, lift: 0, legs: [0, 0]}
  };
})();

/** Give a loaded worker (`root` holds its rigid meshes) arm, leg and head pivots. */
export function rig(T, root) {
  const parts = []; root.traverse(o => { if (o.isMesh) parts.push(o); });
  const box = o => new T.Box3().setFromObject(o), C = o => box(o).getCenter(new T.Vector3());
  const all = box(root), mid = all.getCenter(new T.Vector3());
  const pick = re => parts.filter(p => re.test(normalise(p)));
  const pivotAt = (p, objs) => { const g = new T.Group(); g.position.copy(root.worldToLocal(p.clone())); root.add(g); root.updateMatrixWorld(true); objs.forEach(o => g.attach(o)); return g; };
  const arms = [], legs = [];
  const sleeves = pick(/^Shirt sleeve/), limbs = pick(/^(Forearm|Mitten hand)/);
  for (const sl of sleeves) {
    const side = Math.sign(C(sl).x - mid.x) || 1;
    const rest = limbs.filter(o => sleeves.reduce((best, s2) => C(o).distanceTo(C(s2)) < C(o).distanceTo(C(best)) ? s2 : best, sleeves[0]) === sl);   // each forearm and hand goes with its nearest sleeve
    const b = box(sl), bc = C(sl), bs = b.getSize(new T.Vector3());
    const g = pivotAt(new T.Vector3(bc.x - side * bs.x * .2, b.max.y - bs.y * .15, bc.z), [sl, ...rest]); g.userData.side = side;
    const outward = a => { g.rotation.z = a; root.updateMatrixWorld(true); return side * (C(g).x - mid.x); };
    g.userData.dir = outward(1.2) > outward(-1.2) ? 1 : -1; g.rotation.z = 0; arms.push(g);   // which way swings this arm up and OUT (not across the face)
  }
  const trousers = pick(/^Trouser leg/), boots = pick(/^Rounded boot/);
  for (const tr of trousers) {
    const side = Math.sign(C(tr).x - mid.x) || 1, b = box(tr);
    const boot = boots.filter(o => Math.sign(C(o).x - mid.x) === side);
    const g = pivotAt(new T.Vector3(C(tr).x, b.max.y - (b.max.y - b.min.y) * .08, C(tr).z), [tr, ...boot]); g.userData.side = side; legs.push(g);
  }
  const headParts = pick(/^(Head|Hair|Ear|Button eye|Eye glint|Small nose|Gentle smile|Side swept fringe|Rounded bob|Soft straw brim|Straw crown|Hat band)/);
  let head = null;
  if (headParts.length) { const nb = box(pick(/^Neck/)[0] || headParts[0]); head = pivotAt(new T.Vector3(mid.x, nb.max.y, nb.getCenter(new T.Vector3()).z), headParts); }
  // props: sunglasses and a party hat, hidden until asked for
  const hb = head ? box(head) : all, hc = hb.getCenter(new T.Vector3()), hs = hb.getSize(new T.Vector3());
  const shades = new T.Group(), dark = new T.MeshStandardMaterial({color: '#1a0b16', roughness: .2, metalness: .3}), rim = new T.MeshStandardMaterial({color: '#ff5aa8', roughness: .4});
  for (const s of [-1, 1]) { const l = new T.Mesh(new T.BoxGeometry(hs.x * .3, hs.y * .16, .01), dark); l.position.set(s * hs.x * .2, 0, 0); shades.add(l); }
  const br = new T.Mesh(new T.BoxGeometry(hs.x * .74, hs.y * .04, .012), rim); br.position.y = hs.y * .07; shades.add(br);
  const hat = new T.Mesh(new T.ConeGeometry(hs.x * .28, hs.y * .62, 10), new T.MeshStandardMaterial({color: '#ff5aa8', roughness: .6, flatShading: true}));
  const pom = new T.Mesh(new T.IcosahedronGeometry(hs.x * .08, 0), new T.MeshStandardMaterial({color: '#ffd24a', flatShading: true})); pom.position.y = hs.y * .33; hat.add(pom);
  const holder = head || root, local = v => holder.worldToLocal(v.clone());
  const front = pick(/^Button eye/)[0] ? C(pick(/^Button eye/)[0]).z : hb.max.z;
  const faceZ = front >= hc.z ? hb.max.z + .006 : hb.min.z - .006;   // the face is the side the eyes are on
  shades.position.copy(local(new T.Vector3(hc.x, hc.y + hs.y * .04, faceZ)));
  if (faceZ < hc.z) shades.rotation.y = Math.PI;
  hat.position.copy(local(new T.Vector3(hc.x, hb.max.y + hs.y * .2, hc.z)));
  hat.rotation.z = .25; shades.visible = hat.visible = false; holder.add(shades, hat);
  return {root, arms, legs, head, shades, hat, base: root.position.clone()};
}

/** Load `<name>-idle.glb`, scale it to `height` metres, stand it on y = 0 and turn it to face +Z. */
export async function loadWorker(T, loader, name, {height = 1} = {}) {
  const g = await new Promise((ok, no) => loader.load(`/simulation-assets/workers/${name}-idle.glb`, x => ok(x.scene), undefined, no));
  const holder = new T.Group(); holder.name = 'worker-' + name; holder.add(g);
  let b = new T.Box3().setFromObject(g); const s = b.getSize(new T.Vector3());
  g.scale.setScalar(height / s.y); g.updateMatrixWorld(true);
  // the eyes are on the front of the head: if they point to -Z, turn the model so its front is +Z
  let eye = null, hd = null; g.traverse(o => { const n = normalise(o); if (!eye && /^Button eye/.test(n)) eye = o; if (!hd && /^Head/.test(n)) hd = o; });
  if (eye && hd) { const e = new T.Box3().setFromObject(eye).getCenter(new T.Vector3()), h = new T.Box3().setFromObject(hd).getCenter(new T.Vector3()); if (e.z < h.z) g.rotation.y = Math.PI; }
  g.updateMatrixWorld(true);
  b = new T.Box3().setFromObject(g); const c = b.getCenter(new T.Vector3());
  g.position.sub(new T.Vector3(c.x, b.min.y, c.z)); holder.updateMatrixWorld(true);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // the rig works on the unrotated meshes: wrap them so the pivots sit inside one group that is the character's own
  const body = new T.Group(); body.name = 'body'; holder.add(body); body.attach(g); holder.updateMatrixWorld(true);
  const w = rig(T, g); w.holder = holder; w.body = body; w.name = name; w.height = height; w.pose = {...POSES.rest, arms: [0, 0], legs: [0, 0]};
  return w;
}

/** Set a pose at once. `p.arms` is [screen-left, screen-right] in the model's own frame. */
export function setPose(w, p) {
  const a = p.arms || [0, 0], l = p.legs || [0, 0];
  w.arms.forEach(arm => { arm.rotation.z = arm.userData.dir * (a[arm.userData.side < 0 ? 0 : 1] ?? 0); });
  w.legs.forEach(leg => { leg.rotation.x = l[leg.userData.side < 0 ? 0 : 1] ?? 0; });
  if (w.head) w.head.rotation.z = p.head || 0;
  w.root.rotation.z = p.lean || 0; w.root.position.y = w.base.y + (p.lift || 0);
  if ('shades' in p || 'hat' in p) { w.shades.visible = !!p.shades; w.hat.visible = !!p.hat; }
  w.pose = {arms: [...a], legs: [...l], head: p.head || 0, lean: p.lean || 0, lift: p.lift || 0};
}

const tweens = [];
/** Ease a worker to a named pose (or a pose object) over `ms`, after `delay` ms. */
export function tween(w, to, {ms = 380, delay = 0} = {}) {
  const g = typeof to === 'string' ? POSES[to] : to; if (!g) return;
  const now = performance.now();
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].w === w) tweens.splice(i, 1);
  tweens.push({w, from: JSON.parse(JSON.stringify(w.pose)), g: {...POSES.rest, ...g}, t0: now + delay, d: ms});
  if ('shades' in g || 'hat' in g) { w.shades.visible = !!g.shades; w.hat.visible = !!g.hat; }
}
export function stepTweens(now = performance.now()) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const a = tweens[i]; if (now < a.t0) continue;
    const t = Math.min(1, (now - a.t0) / a.d), e = ease(t), L = (x, y) => x + (y - x) * e;
    setPose(a.w, {arms: [L(a.from.arms[0], a.g.arms[0]), L(a.from.arms[1], a.g.arms[1])], legs: [L(a.from.legs[0], a.g.legs[0]), L(a.from.legs[1], a.g.legs[1])],
      head: L(a.from.head, a.g.head), lean: L(a.from.lean, a.g.lean), lift: L(a.from.lift, a.g.lift)});
    if (t >= 1) tweens.splice(i, 1);
  }
}
export const busy = w => tweens.some(t => t.w === w);
