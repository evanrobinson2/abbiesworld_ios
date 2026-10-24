// The toy box (Evan, 2026-10-24 16:58Z: "Toy box idea for cars"): a painted wooden toy chest that holds the cars. Tap it, the lid
// swings up and the toys pop out in a fan for you to pick; pick one and the rest tumble back in. Shared by the coaster and Kart mode.
//   const box = buildToyBox(T);  scene.add(box);  box.userData.setOpen(0..1) each frame;  box.userData.fan(i, n) -> local slot
// Low poly, named by what things are (the game reads material names as shading roles). It stands on y = 0, front facing +z.
export function buildToyBox(T, {w = 5, d = 3, h = 2.2} = {}) {
  const box = new T.Group(); box.name = 'toy box';
  const M = (name, c, o = {}) => new T.MeshStandardMaterial({name, color: c, roughness: .6, flatShading: true, ...o});
  const wood = M('painted wood', '#e8423f'), trim = M('painted trim', '#ffcf3a'), inside = M('box inside felt', '#5a2a6a', {roughness: .95}), brass = M('brass hinge', '#e0b048', {metalness: .7, roughness: .3});
  const add = (g, m, x, y, z, parent = box, name = '') => { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; o.name = name || m.name; parent.add(o); return o; };
  const t = .18; // plank thickness
  add(new T.BoxGeometry(w, t, d), wood, 0, t / 2, 0, box, 'box floor');
  add(new T.BoxGeometry(w, h, t), wood, 0, h / 2, d / 2 - t / 2, box, 'box front');
  add(new T.BoxGeometry(w, h, t), wood, 0, h / 2, -d / 2 + t / 2, box, 'box back');
  for (const s of [-1, 1]) add(new T.BoxGeometry(t, h, d), wood, s * (w / 2 - t / 2), h / 2, 0, box, 'box side');
  add(new T.BoxGeometry(w - 2 * t, .05, d - 2 * t), inside, 0, t + .03, 0, box, 'box felt');
  // painted bands, corner caps and feet: a toy chest, not a crate
  for (const y of [.35, h - .25]) { add(new T.BoxGeometry(w + .04, .16, d + .04), trim, 0, y, 0, box, 'painted band'); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(new T.BoxGeometry(.3, h + .06, .3), trim, sx * (w / 2 - .1), h / 2, sz * (d / 2 - .1), box, 'corner cap'); add(new T.SphereGeometry(.2, 8, 6), trim, sx * (w / 2 - .25), .02, sz * (d / 2 - .25), box, 'bun foot'); }
  // stars painted on the front (a canvas decal), and a big brass handle each side
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 224; const g = cv.getContext('2d');
  const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); };
  [[90, 110, 54, '#ffcf3a'], [256, 96, 70, '#ffffff'], [420, 116, 50, '#3ad1e0'], [170, 180, 24, '#9be84c'], [350, 182, 26, '#ff9ad0'], [40, 40, 18, '#ffffff'], [480, 44, 20, '#ffcf3a']].forEach(a => star(...a));
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  const decal = new T.Mesh(new T.PlaneGeometry(w * .82, h * .58), new T.MeshStandardMaterial({name: 'painted stars decal', map: tex, transparent: true, roughness: .6}));
  decal.position.set(0, h * .52, d / 2 + .01); box.add(decal);
  for (const s of [-1, 1]) { const hd = add(new T.TorusGeometry(.32, .06, 6, 14, Math.PI), brass, s * (w / 2 + .05), h * .6, 0, box, 'box handle'); hd.rotation.y = Math.PI / 2; }
  // the lid swings about its back edge
  const hinge = new T.Group(); hinge.name = 'lid hinge'; hinge.position.set(0, h, -d / 2); box.add(hinge);
  const lid = new T.Group(); lid.name = 'lid'; hinge.add(lid);
  add(new T.BoxGeometry(w + .1, .22, d + .1), wood, 0, .11, d / 2, lid, 'box lid');
  add(new T.BoxGeometry(w + .14, .1, d + .14), trim, 0, .26, d / 2, lid, 'lid trim');
  add(new T.BoxGeometry(w - .4, .06, d - .4), inside, 0, -.02, d / 2, lid, 'lid felt');
  const knob = add(new T.SphereGeometry(.22, 10, 8), brass, 0, .2, d + .02, lid, 'lid knob'); knob.scale.set(1.4, .7, 1);
  for (const s of [-1, 1]) add(new T.CylinderGeometry(.08, .08, .5, 8), brass, s * (w / 3), 0, 0, hinge, 'brass hinge').rotation.z = Math.PI / 2;
  let open = 0;
  box.userData = {
    lid: hinge, w, d, h,
    get open() { return open; },
    setOpen(k) { open = Math.max(0, Math.min(1, k)); const e = open < .5 ? 2 * open * open : 1 - Math.pow(-2 * open + 2, 2) / 2; hinge.rotation.x = -e * 1.95 - Math.sin(open * Math.PI) * .08; },
    mouth: () => box.localToWorld(new T.Vector3(0, h * .7, 0)),
    // the fan the toys pop into: up to 7 a row on an arc in front of the box, a second row higher and wider behind
    fan(i, n) { const row = i < 7 ? 0 : 1, inRow = row ? n - 7 : Math.min(n, 7), k = row ? i - 7 : i, span = Math.min(2.4, .42 * (inRow - 1)), a = inRow > 1 ? -span / 2 + span * k / (inRow - 1) : 0;
      const r = row ? 7.6 : 5.2; return new T.Vector3(Math.sin(a) * r * 1.15, row ? 3.3 : 1.2, d / 2 + Math.cos(a) * r * .55 - (row ? 2.4 : 0)); },
  };
  return box;
}
