// The town answers every tap (Evan, 2026-10-24 01:09Z, playtest: "the world needs you to be able to interact with it").
// Houses, trees, shops, lamp posts, the places on the board, and the ducks, the dog and the car all react: a squash and
// wiggle, a sound, smoke or falling leaves, a thought bubble. Places that lead somewhere keep their own door (the café,
// the coaster, the quest people, the moon truck own their taps; this layer stays out of their way).
//   mountInteractions(window.AbbieTown)   once the board is built; started from town-hud-boot.mjs
// Interaction grammar (docs/design/INTERACTION_GRAMMAR.md): this is the "FPS / play" way of acting, a character touching
// the world. Nothing here is a tile, a god card or HUD.
// World layer (characters and the simulation can perceive it): the squash and wiggle, smoke, leaves, birds, the ducks,
//   bub and the car, because they are in the fiction.
// Presentation layer (drawn for the player, invisible to every perception): the thought bubbles, the twinkle over
//   whatever is under the finger, the pointer, and the sparkle that marks places that open into something.
// Drafted 2026-10-24.

const LAMP = .3, PROP = 1.4, TREE = 6; // instance scale bands: lamp posts are thin, bushes and flowers small, trees mid, shops wide

// what each place on the board says and does when tapped. door: a gate in entrances.mjs, offered on the bubble, never forced.
const PLACE = {
  highschool: {say: ['🔔', '📚', '✏️'], sound: 'bell'},
  common: {say: ['🐦', '🌳', '🧺'], sound: 'chirp', leaves: true},
  bakery: {say: ['🥐', '🍞', '😋'], sound: 'bell', smoke: true},
  comellas: {say: ['🍕', '😋', '🧀'], sound: 'bell', smoke: true},
  hoagies: {say: ['🥖', '🍦', '😋'], sound: 'bell'},
  noticeboard: {say: ['📌', '📜', '👀'], sound: 'knock'},
  depot: {say: ['🚂', '🎫'], sound: 'whistle'},
  railyard: {say: ['🚂', '💨'], sound: 'whistle', smoke: true},
  mill: {say: ['⚙️', '💧'], sound: 'creak'},
  dock: {say: ['🎣', '🌊'], sound: 'splash'},
  lookout: {say: ['🔭', '⛰️'], sound: 'chirp'},
  trailhead: {say: ['🥾', '🌲'], sound: 'chirp', leaves: true},
  horn: {say: ['🦆', '🌊'], sound: 'splash'},
  ani: {say: ['💜', '🏡'], sound: 'knock', smoke: true},
  aniTree: {say: ['🌳', '🏠'], sound: 'rustle', leaves: true},
  launch: {say: ['🚀', '🌙'], sound: 'rumble'},
  culdesac: {say: ['🛴', '🏀'], sound: 'knock'},
  home: {say: ['💗', '🏡', '🍪'], sound: 'knock', smoke: true},
  abbieTree: {say: ['🌳', '🎀'], sound: 'rustle', leaves: true},
  muraco: {say: ['🔔', '🎒', '✏️'], sound: 'bell', door: 'town:school-door'},
  leonard: {say: ['⚾', '🏃'], sound: 'whistle'},
  gingerbread: {say: ['🍪', '🍬', '😋'], sound: 'chime'},
  bunker: {say: ['🔒', '🤫'], sound: 'knock'},
};
const HOUSE = ['🎵', '☕', '😴', '📻', '🍪', '💤', '🧶'];
const OWNED = ['giver', 'link']; // userData another module reads to handle its own tap: people, the coaster, the moon truck

// ---- sound: a few tiny synthesised cues (diegetic: a bell, a knock; no files, nothing to load)
let ac = null;
function tone(freq, dur, {type = 'sine', gain = .12, slide = 0, at = 0} = {}) {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + .05);
  } catch {}
}
function noise(dur, {gain = .08, at = 0, lp = 2400} = {}) {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = ac.currentTime + at;
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = gain; s.connect(f).connect(g).connect(ac.destination); s.start(t0);
  } catch {}
}
const SOUND = {
  bell: () => { tone(988, .9, {gain: .1}); tone(1319, .8, {gain: .06, at: .12}); },
  chime: () => { [784, 988, 1175].forEach((f, i) => tone(f, .5, {gain: .07, at: i * .1})); },
  knock: () => { [0, .16].forEach(a => tone(150, .09, {type: 'triangle', gain: .2, slide: -60, at: a})); },
  chirp: () => { [0, .12, .26].forEach((a, i) => tone(2400 + i * 300, .09, {gain: .05, slide: 500, at: a})); },
  rustle: () => noise(.5, {gain: .09, lp: 3200}),
  whistle: () => { tone(660, .5, {gain: .08, slide: 220}); tone(990, .7, {gain: .05, at: .35, slide: -200}); },
  creak: () => tone(110, .6, {type: 'sawtooth', gain: .05, slide: 40}),
  splash: () => { noise(.35, {gain: .1, lp: 1400}); tone(320, .2, {gain: .05, slide: -150}); },
  rumble: () => { tone(60, 1.1, {type: 'sawtooth', gain: .12, slide: 25}); noise(1, {gain: .06, lp: 500}); },
  quack: () => { [0, .15].forEach(a => tone(520, .12, {type: 'square', gain: .05, slide: -140, at: a})); },
  bark: () => { [0, .2].forEach(a => tone(300, .13, {type: 'sawtooth', gain: .09, slide: -120, at: a})); },
  honk: () => { tone(330, .28, {type: 'square', gain: .07}); tone(415, .28, {type: 'square', gain: .05}); },
  ding: () => tone(1568, .45, {gain: .08}),
  pop: () => tone(520, .12, {gain: .08, slide: 380}),
};

export function mountInteractions(town) {
  const stage = town?.stage, T = stage?.THREE, camera = stage?.camera, canvas = stage?.renderer?.domElement || town?.renderer?.domElement;
  if (!stage || !T || !camera || !canvas || town.interact) return town?.interact || null;
  const tiles = stage.tiles, tileList = Object.values(tiles);
  const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const log = [], listeners = {};

  // ---- life: ducks at Horn Pond, bub in Abbie's yard, a car on Main Street. In the fiction, so the town's own people can see them.
  const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .8, flatShading: true, ...o});
  const creatures = [];
  const straightDown = new T.Vector3(0, -1, 0), rc = new T.Raycaster();
  // somewhere near the spot where the ground is the first thing under the sky: not inside a house, not under a crown
  const clearGround = (t, s, tries = [[0, 0]]) => {
    for (let r = 8; r <= 44; r += 6) for (let a = 0; a < 6.28; a += .9) tries.push([Math.cos(a) * r, Math.sin(a) * r]);
    const groundAt = (x, z) => { const w = t.group.localToWorld(new T.Vector3(x, 400, z)); rc.set(w, straightDown); rc.far = 800;
      const h = rc.intersectObject(t.group, true)[0]; if (!h) return null; let top = h.object; while (top.parent && top.parent !== t.group) top = top.parent;
      return top === h.object && !h.object.isInstancedMesh ? t.group.worldToLocal(h.point.clone()) : null; };
    for (const [dx, dz] of tries) { // open sky over it and around it, so no crown or roof is in front of it from any side
      const p = groundAt(s.x + dx, s.z + dz); if (p && [[5, 0], [-5, 0], [0, 5], [0, -5], [3.5, 3.5], [-3.5, 3.5], [3.5, -3.5], [-3.5, -3.5], [2, 0], [0, 2], [-2, 0], [0, -2]].every(([ax, az]) => groundAt(s.x + dx + ax, s.z + dz + az))) return {x: p.x, y: p.y, z: p.z};
    }
    return null;
  };
  const place = (tileId, spotId, make, dx = 0, dz = 0, name, taken = []) => {
    const t = tiles[tileId], s = t?.spots?.[spotId]; if (!s) return null;
    const g = make(); g.name = name; g.userData.interact = {kind: 'creature', id: name};
    const c = clearGround(t, s, [[dx, dz]]); if (!c) return null;
    g.position.set(c.x, c.y, c.z); g.userData.home = g.position.clone(); t.group.add(g); creatures.push(g); return g;
  };
  const duck = () => { const g = new T.Group(), b = new T.Mesh(new T.SphereGeometry(.55, 8, 6), mat('#f6f1e4')), h = new T.Mesh(new T.SphereGeometry(.3, 8, 6), mat('#2f7a4a')), k = new T.Mesh(new T.ConeGeometry(.14, .3, 5), mat('#f2a33a'));
    b.scale.set(1, .8, 1.3); b.position.y = .6; h.position.set(0, 1.1, .5); k.rotation.x = Math.PI / 2; k.position.set(0, 1.05, .85); g.add(b, h, k); g.scale.setScalar(1.6); return g; };
  const dog = () => { const g = new T.Group(), c = mat('#1d1d22'), b = new T.Mesh(new T.BoxGeometry(.9, .8, 1.8), c), h = new T.Mesh(new T.BoxGeometry(.7, .7, .75), c), tail = new T.Mesh(new T.BoxGeometry(.18, .18, .9), c);
    b.position.y = 1.1; h.position.set(0, 1.7, 1.15); tail.position.set(0, 1.5, -1.1); tail.rotation.x = .6; tail.name = 'tail'; g.add(b, h, tail);
    for (const [x, z] of [[-.3, .6], [.3, .6], [-.3, -.6], [.3, -.6]]) { const l = new T.Mesh(new T.BoxGeometry(.22, .8, .22), c); l.position.set(x, .4, z); g.add(l); }
    g.scale.setScalar(1.7); return g; };
  const car = () => { const g = new T.Group(), body = new T.Mesh(new T.BoxGeometry(3.4, 1.1, 6.2), mat('#d9578d')), cab = new T.Mesh(new T.BoxGeometry(3, 1, 3), mat('#f7e9ef'));
    body.position.y = 1.2; cab.position.set(0, 2.2, -.3); g.add(body, cab);
    for (const [x, z] of [[-1.8, 2], [1.8, 2], [-1.8, -2], [1.8, -2]]) { const w = new T.Mesh(new T.CylinderGeometry(.7, .7, .5, 10), mat('#222')); w.rotation.z = Math.PI / 2; w.position.set(x, .7, z); g.add(w); }
    for (const x of [-1, 1]) { const l = new T.Mesh(new T.SphereGeometry(.3, 6, 5), mat('#fff3b0', {emissive: '#ffe58a', emissiveIntensity: .2})); l.position.set(x, 1.3, 3.15); l.name = 'headlight'; g.add(l); }
    return g; };
  [[-4, 6, 0], [-1, 9, 1.2], [3, 7, 2.1]].forEach(([dx, dz, r], i) => { const d = place('anis-side', 'horn', duck, dx - 6, dz + 4, 'duck'); if (d) { d.rotation.y = r; d.userData.phase = i * 1.7; if (i) d.position.add(new T.Vector3(i * 4, 0, i * 3)), d.userData.home.copy(d.position); } });
  place('abbie-daddy-side', 'home', dog, 12, 12, 'bub');
  { const c = tiles.downtown?.spots?.cafe; if (c) { const o = c.out || {dirX: 0, dirZ: 1}; const k = place('downtown', 'cafe', car, o.dirX * 26 + (c.street?.dirX || 0) * 14, o.dirZ * 26 + (c.street?.dirZ || 0) * 14, 'town car'); if (k) k.rotation.y = Math.atan2(c.street?.dirX || 1, c.street?.dirZ || 0); } }

  // ---- what a hit means
  const spotOwner = new Map(); // spot.g -> {id, tile}
  for (const [tid, t] of Object.entries(tiles)) for (const [sid, s] of Object.entries(t.spots || {})) if (s?.g && !spotOwner.has(s.g)) spotOwner.set(s.g, {id: sid, tile: tid});
  const houseTops = new Map(); // the one group per hex that holds the kit houses: the one with the most child groups
  const houseTop = tile => { if (!houseTops.has(tile)) { let best = null, n = 7; for (const c of tile.group.children) { const k = c.isGroup ? c.children.filter(x => x.isGroup).length : 0; if (k > n) { best = c; n = k; } } houseTops.set(tile, best); } return houseTops.get(tile); };
  const ancestors = o => { const a = []; for (; o; o = o.parent) a.push(o); return a; };
  const tmp = {p: new T.Vector3(), q: new T.Quaternion(), s: new T.Vector3(), m: new T.Matrix4()};
  function classify(hit) {
    const chain = ancestors(hit.object);
    for (const o of chain) { if (OWNED.some(k => o.userData?.[k])) return null; if (o.userData?.interact === false) return null; }
    const tagged = chain.find(o => o.userData?.interact && typeof o.userData.interact === 'object');
    if (tagged) return {kind: tagged.userData.interact.kind, id: tagged.userData.interact.id, obj: tagged};
    for (const o of chain) { const sp = spotOwner.get(o); if (sp) { if (sp.id === 'cafe' || sp.id === 'cafeRoof' || sp.id === 'skatepark') return null; return {kind: 'place', id: sp.id, tile: sp.tile, obj: o}; } }
    const tile = tileList.find(t => chain.includes(t.group)); if (!tile) return null;
    const top = chain[chain.indexOf(tile.group) - 1]; if (!top || top === hit.object && !hit.object.isInstancedMesh) return null; // the ground itself
    if (hit.object.isInstancedMesh && hit.instanceId != null) {
      hit.object.getMatrixAt(hit.instanceId, tmp.m); tmp.m.decompose(tmp.p, tmp.q, tmp.s);
      const sx = Math.max(tmp.s.x, tmp.s.z), kind = sx < LAMP ? 'lamp' : sx < PROP ? 'prop' : sx < TREE ? 'tree' : 'shop';
      return {kind, id: kind, im: hit.object, instance: hit.instanceId};
    }
    if (top === houseTop(tile) && chain.length > 2) { const house = chain[chain.indexOf(top) - 1]; if (house && house.isGroup) return {kind: 'house', id: 'house', obj: house}; }
    const bb = new T.Box3().setFromObject(top), sz = bb.getSize(new T.Vector3());
    if (Math.max(sz.x, sz.z) < 40 && top.isGroup) return {kind: 'prop', id: 'prop', obj: top};
    return null;
  }
  const hitAt = (cx, cy) => {
    const r = canvas.getBoundingClientRect(), nd = new T.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), ray = new T.Raycaster();
    ray.setFromCamera(nd, camera);
    let first = null; for (const h of ray.intersectObject(stage.dioGroup, true)) { if (!h.object.isMesh || !shown(h.object)) continue; first = h; break; }
    // small animals are forgiving: a tap that lands on one wins over what stands just in front of it
    const pet = ray.intersectObjects(creatures.filter(shown), true)[0];
    if (pet && (!first || pet.distance <= first.distance + 18)) return {hit: pet, what: classify(pet)};
    return first ? {hit: first, what: classify(first)} : null;
  };

  // ---- presentation: thought bubble + twinkle layer (DOM, never in the world)
  const css = document.createElement('style'); css.textContent = `
.ix-bubble{position:fixed;z-index:31;transform:translate(-50%,calc(-100% - 10px));padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.92);
 box-shadow:0 8px 24px rgba(40,30,20,.2),inset 0 1px 0 #fff;font:500 22px/1.2 system-ui,sans-serif;display:flex;gap:8px;align-items:center;pointer-events:none;animation:ixpop .25s ease-out}
.ix-bubble.door{pointer-events:auto}.ix-bubble button{all:unset;cursor:pointer;padding:6px 12px;border-radius:999px;font:600 13px system-ui,sans-serif;background:#2a2622;color:#fff}
@keyframes ixpop{from{transform:translate(-50%,calc(-100% - 2px)) scale(.6);opacity:0}}
.ix-twinkle{position:fixed;inset:0;z-index:20;pointer-events:none}`;
  document.head.append(css);
  const bubble = document.createElement('div'); bubble.className = 'ix-bubble'; bubble.hidden = true; document.body.append(bubble);
  const tw = document.createElement('canvas'); tw.className = 'ix-twinkle'; document.body.append(tw); const tctx = tw.getContext('2d');
  let bubbleAt = null, bubbleUntil = 0;
  const v = new T.Vector3(), screen = p => { v.copy(p).project(camera); const r = canvas.getBoundingClientRect(); return v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 ? [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] : null; };
  const say = (html, at, ms = 2400, door) => { bubble.innerHTML = html; bubble.className = 'ix-bubble' + (door ? ' door' : ''); bubble.hidden = false; bubbleAt = at.clone(); bubbleUntil = ms ? performance.now() + ms : 0; };
  const hush = () => { bubble.hidden = true; bubbleAt = null; };

  // ---- world effects: transient things in the fiction (smoke, leaves, birds) and the squash on whatever was tapped
  const fx = []; // {mesh, vel, life, age, kind}
  const fxGroup = new T.Group(); fxGroup.name = 'tap effects'; stage.scene.add(fxGroup);
  const puff = (p, color, n, {up = 4, spread = 1.5, size = .5, life = 1.6, grav = 0} = {}) => {
    for (let i = 0; i < n && fx.length < 60; i++) {
      const m = new T.Mesh(new T.IcosahedronGeometry(size * (.7 + Math.random() * .6), 0), new T.MeshBasicMaterial({color, transparent: true, opacity: .9}));
      m.position.copy(p).add(new T.Vector3((Math.random() - .5) * spread, Math.random() * .5, (Math.random() - .5) * spread)); fxGroup.add(m);
      fx.push({mesh: m, vel: new T.Vector3((Math.random() - .5) * spread, up * (.6 + Math.random() * .8), (Math.random() - .5) * spread), life, age: 0, grav});
    }
  };
  const anim = []; // {t, dur, step(k), done()}
  const shake = (obj, dur = .6, amp = .09) => {
    if (obj.userData.shaking) return; obj.userData.shaking = true; const s0 = obj.scale.clone(), r0 = obj.rotation.z;
    anim.push({t: 0, dur, step: k => { const d = (1 - k), w = Math.sin(k * 22); obj.scale.set(s0.x * (1 + w * amp * d * .5), s0.y * (1 - w * amp * d), s0.z * (1 + w * amp * d * .5)); obj.rotation.z = r0 + w * amp * d * .6; },
      done: () => { obj.scale.copy(s0); obj.rotation.z = r0; obj.userData.shaking = false; }});
  };
  const hop = (obj, dur = .55, h = 1.6) => {
    if (obj.userData.hopping) return; obj.userData.hopping = true; const y0 = obj.position.y;
    anim.push({t: 0, dur, step: k => { obj.position.y = y0 + Math.sin(k * Math.PI) * h; }, done: () => { obj.position.y = y0; obj.userData.hopping = false; }});
  };
  const busy = new Set(); // instanced things currently standing in as a proxy
  function proxy(im, id) { // pull one instance out as its own mesh so it can wiggle alone, then put it back
    const key = im.uuid + id; if (busy.has(key)) return null; busy.add(key);
    const m0 = new T.Matrix4(); im.getMatrixAt(id, m0); const wm = new T.Matrix4().multiplyMatrices(im.matrixWorld, m0);
    const mesh = new T.Mesh(im.geometry, Array.isArray(im.material) ? im.material[0] : im.material); wm.decompose(mesh.position, mesh.quaternion, mesh.scale);
    if (im.instanceColor) { const c = new T.Color(); im.getColorAt(id, c); mesh.material = mesh.material.clone(); mesh.material.color.copy(c); }
    fxGroup.add(mesh); const zero = new T.Matrix4().makeScale(0, 0, 0); im.setMatrixAt(id, zero); im.instanceMatrix.needsUpdate = true;
    return {mesh, restore: () => { im.setMatrixAt(id, m0); im.instanceMatrix.needsUpdate = true; fxGroup.remove(mesh); busy.delete(key); }};
  }
  const centreOf = o => new T.Box3().setFromObject(o).getCenter(new T.Vector3());
  const topOf = o => { const b = new T.Box3().setFromObject(o); return new T.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); };

  // ---- the reactions
  function react(what, hit) {
    const kind = what.kind; let at, sound = null, lines = null;
    if (what.im) {
      const p = proxy(what.im, what.instance); if (!p) return false; const o = p.mesh; at = o.position.clone().add(new T.Vector3(0, 2 + o.scale.y * 2, 0));
      const s0 = o.scale.clone(), amp = kind === 'tree' ? .1 : .22;
      anim.push({t: 0, dur: kind === 'shop' ? .7 : .8, step: k => { const d = 1 - k, w = Math.sin(k * 24); o.scale.set(s0.x * (1 + w * amp * d * .5), s0.y * (1 - w * amp * d), s0.z * (1 + w * amp * d * .5)); o.rotation.z = w * amp * d * .7; }, done: p.restore});
      if (kind === 'tree') { puff(at, '#8fbf5a', 7, {up: -1.5, spread: 6, size: .35, life: 1.8, grav: 2}); sound = 'rustle'; lines = Math.random() < .35 ? ['🐦'] : null; if (lines) bird(at); }
      else if (kind === 'lamp') { sound = 'ding'; lines = ['💡']; }
      else if (kind === 'shop') { sound = 'bell'; lines = ['🛎️', '🙂']; }
      else { sound = 'pop'; puff(at, '#ffd36a', 6, {up: 3, spread: 3, size: .25, life: 1}); lines = Math.random() < .3 ? ['✨'] : null; }
    } else if (kind === 'house') {
      const o = what.obj; at = topOf(o); shake(o, .7, .07); sound = 'knock'; lines = [HOUSE[Math.floor(Math.random() * HOUSE.length)]];
      puff(at.clone().add(new T.Vector3(.8, 0, 0)), '#e7e4de', 4, {up: 3, spread: .8, size: .7, life: 2.2});
      setTimeout(() => SOUND.chime?.(), 260);
    } else if (kind === 'place') {
      const def = PLACE[what.id] || {say: ['✨'], sound: 'chime'}, o = what.obj; at = topOf(o); at.y += 1; shake(o, .8, .05); sound = def.sound; lines = [def.say[Math.floor(Math.random() * def.say.length)]];
      if (def.smoke) puff(at, '#e7e4de', 5, {up: 3, spread: 1, size: .8, life: 2.4}); if (def.leaves) puff(at, '#8fbf5a', 6, {up: -1.5, spread: 6, size: .35, life: 1.8, grav: 2});
      if (def.door) { const gate = def.door; lines = [lines[0] + ' <button>Go in</button>']; what.door = gate; }
    } else if (kind === 'creature') {
      const o = what.obj; at = topOf(o); at.y += .5;
      if (what.id === 'duck') { hop(o); sound = 'quack'; lines = ['🦆', '💦']; puff(o.position, '#bfe3f2', 5, {up: 2.5, spread: 1.5, size: .2, life: .8}); }
      else if (what.id === 'bub') { hop(o, .6, 2.4); sound = 'bark'; lines = ['💗', '🐾']; const tail = o.getObjectByName('tail'); if (tail) anim.push({t: 0, dur: 1.4, step: k => { tail.rotation.y = Math.sin(k * 50) * .9 * (1 - k); }, done: () => { tail.rotation.y = 0; }}); }
      else if (what.id === 'town car') { shake(o, .6, .05); sound = 'honk'; lines = ['📣']; for (const l of o.children.filter(c => c.name === 'headlight')) { l.material.emissiveIntensity = 3; setTimeout(() => { l.material.emissiveIntensity = .2; }, 600); } }
    }
    if (sound) SOUND[sound]?.();
    if (lines) say(`<span>${lines[Math.floor(Math.random() * lines.length)]}</span>`, at, what.door ? 0 : 2200, !!what.door);
    if (what.door) { const b = bubble.querySelector('button'); if (b) b.onclick = () => { hush(); town.go?.(what.door); }; }
    const rec = {kind, id: what.id, at: Date.now()}; log.push(rec); if (log.length > 200) log.shift();
    window.dispatchEvent(new CustomEvent('aw-interact', {detail: rec}));
    return true;
  }
  function bird(from) {
    const b = new T.Mesh(new T.ConeGeometry(.35, .9, 4), new T.MeshBasicMaterial({color: '#4a4a52'})); b.position.copy(from); b.rotation.z = Math.PI / 2; fxGroup.add(b);
    const dir = new T.Vector3(Math.random() - .5, .5, Math.random() - .5).normalize().multiplyScalar(18);
    anim.push({t: 0, dur: 1.6, step: k => { b.position.copy(from).addScaledVector(dir, k * k * 3).add(new T.Vector3(0, Math.sin(k * 14) * .4, 0)); b.material.opacity = 1 - k; b.material.transparent = true; }, done: () => fxGroup.remove(b)});
  }

  // ---- taps and hovering
  let down = null, hover = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; down = null;
    if (!document.body.classList.contains('play')) return;
    const h = hitAt(e.clientX, e.clientY); if (!h?.what) { if (bubble.classList.contains('door') ) hush(); return; }
    react(h.what, h.hit);
  });
  let lastMove = 0;
  canvas.addEventListener('pointermove', e => {
    if (e.buttons || performance.now() - lastMove < 70) return; lastMove = performance.now();
    const h = hitAt(e.clientX, e.clientY); const w = h?.what;
    hover = w ? {p: w.im ? (() => { const m = new T.Matrix4(); w.im.getMatrixAt(w.instance, m); m.premultiply(w.im.matrixWorld); return new T.Vector3().setFromMatrixPosition(m).add(new T.Vector3(0, 3, 0)); })() : topOf(w.obj)} : null;
    if (w) canvas.style.cursor = 'pointer'; else if (canvas.style.cursor === 'pointer') canvas.style.cursor = '';
  });

  // places that open into something twinkle softly, so a touch player can tell (presentation only)
  const beacons = ['cafe', 'skatepark', 'muraco'].map(id => { for (const t of tileList) { const s = t.spots?.[id]; if (s?.g) return {id, s}; } return null; }).filter(Boolean);
  let time = 0;
  function star(x, y, r, a) { tctx.save(); tctx.translate(x, y); tctx.rotate(time * .8); tctx.globalAlpha = a; tctx.fillStyle = '#fff6c8'; tctx.shadowColor = '#f2b63a'; tctx.shadowBlur = 8; tctx.beginPath();
    for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .35 : r; tctx.lineTo(Math.cos(i * Math.PI / 4) * rr, Math.sin(i * Math.PI / 4) * rr); } tctx.closePath(); tctx.fill(); tctx.restore(); }

  const off = stage.frame((dt, t) => {
    time = t ?? time + dt;
    for (let i = anim.length - 1; i >= 0; i--) { const a = anim[i]; a.t += dt; const k = Math.min(1, a.t / a.dur); a.step(k); if (k >= 1) { a.done?.(); anim.splice(i, 1); } }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.age += dt; f.vel.y -= f.grav * dt; f.mesh.position.addScaledVector(f.vel, dt); f.mesh.material.opacity = Math.max(0, .9 * (1 - f.age / f.life)); f.mesh.scale.setScalar(1 + f.age * .4);
      if (f.age >= f.life) { fxGroup.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); fx.splice(i, 1); } }
    for (const c of creatures) { if (c.userData.hopping || !shown(c)) continue; const ph = c.userData.phase || 0;
      if (c.name === 'duck') c.position.y = c.userData.home.y + Math.abs(Math.sin(time * 2 + ph)) * .12; else if (c.name === 'bub') { const tail = c.getObjectByName('tail'); if (tail && !c.userData.hopping) tail.rotation.y = Math.sin(time * 4) * .25; } }
    // presentation: the bubble follows what spoke, the twinkle sits over what is under the finger
    if (bubbleAt) { const s = screen(bubbleAt); if (!s || (bubbleUntil && performance.now() > bubbleUntil)) hush(); else { bubble.style.left = s[0] + 'px'; bubble.style.top = s[1] + 'px'; } }
    const w = innerWidth, hgt = innerHeight; if (tw.width !== w || tw.height !== hgt) { tw.width = w; tw.height = hgt; } tctx.clearRect(0, 0, w, hgt);
    if (document.body.classList.contains('play')) {
      if (hover) { const s = screen(hover.p); if (s) star(s[0], s[1], 9, .85 + Math.sin(time * 6) * .15); }
      for (const b of beacons) if (shown(b.s.g) && camera.position.distanceTo(b.s.g.getWorldPosition(v)) < 700) { const p = topOf(b.s.g).add(new T.Vector3(0, 3, 0)), s = screen(p); if (s) star(s[0], s[1], 6, .35 + .35 * Math.sin(time * 2.2 + b.id.length)); }
    }
  });

  // test hooks: where a thing of each kind is, so a headless run can fly there and tap it (tools/minigame-test/interactions.cjs)
  const sample = (kind, max = 1) => { // up to max places a thing of this kind stands, world positions
    const out = [], all = [];
    for (const t of tileList) {
      if (kind === 'house') { const top = houseTop(t); if (top) for (const hse of top.children.filter(c => c.isGroup)) { out.push({id: 'house', p: centreOf(hse).toArray()}); if (out.length >= max) return out; } continue; }
      if (kind === 'place') { for (const [id, s] of Object.entries(t.spots || {})) if (s.g && !['cafe', 'cafeRoof', 'skatepark', 'highschool', 'school'].includes(id) && spotOwner.get(s.g)?.id === id) { out.push({id, p: centreOf(s.g).toArray()}); if (out.length >= max) return out; } continue; }
      for (const top of t.group.children) for (const im of top.isInstancedMesh ? [top] : (top.children || []).filter(c => c.isInstancedMesh)) for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, tmp.m); tmp.m.decompose(tmp.p, tmp.q, tmp.s); const sx = Math.max(tmp.s.x, tmp.s.z), k = sx < LAMP ? 'lamp' : sx < PROP ? 'prop' : sx < TREE ? 'tree' : 'shop';
        if (k === kind && tmp.s.y > 0) { const p = tmp.p.clone().applyMatrix4(im.matrixWorld); p.y += kind === 'tree' ? 3 : 1; all.push({id: kind, p: p.toArray()}); }
      }
    }
    if (all.length) { const step = Math.max(1, Math.floor(all.length / max)); for (let i = 0; i < all.length && out.length < max; i += step) out.push(all[i]); }
    return out;
  };
  town.interact = {log, creatures, react: (kind, id) => { const t = creatures.find(c => c.name === id); return t && react({kind, id, obj: t}); }, hitAt, sample, last: () => log[log.length - 1] || null, off,
    stats: () => ({fx: fx.length, anim: anim.length, bubble: !bubble.hidden}), bubbleText: () => bubble.hidden ? null : bubble.textContent};
  return town.interact;
}
