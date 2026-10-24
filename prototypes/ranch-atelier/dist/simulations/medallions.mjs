// Mission start points: a mission starts at its backpack charm (Evan, 2026-10-24: "missions start at the location of their
// medallion ... not medallions literally, their backpack charms"). The charm itself floats at the door of its place, spinning,
// with a soft gold glow, a breathing shadow on the ground and a laser of light in the game's colour running off into the sky
// (the Effect Hunt beams use the same style). Tap it: the camera dollies in, a smoke puff covers the place only, the mission opens.
// Once the charm is earned it stays as a dim ghost with no beam, so the game can be replayed. Charms found rather than played
// (bub, coffee cup, brass key) have no beam and are not registered here. The noticeboard and the demo's notebook only list
// missions and fly to a charm (fly()); they never start one.
// Look: studies/charms/index.html. Spin about a vertical axis every 2.4 s, hover about 6 px every 2.2 s. It is a world object, so no text on it.
//
//   const M = mountMedallions(window.AbbieTown)      once, after the stage is up; returns the api below (also AbbieTown.medallions)
//   M.register({id, charm, beam, at, start, available})
//        charm: a backpack charm id (its icon is the pickup); at: () => Vector3 (world metres) or an Object3D
//        start(): opens the mission; available(): false greys it out (the basement needs the café key)
//   M.fly(id) -> Promise     camera to the charm          M.enter(id)   the tap: dolly, puff, start
//   M.setVisible(false)      hide them all (a mission is playing)
// Behind a flag until it has been played in the live game: ?medallions, or localStorage aw-medallions=1.

const COLOURS = {basement: '#7fd1ff', moon: '#ffb74a', jump: '#ff7aa8', coaster: '#7dff9b', mining: '#d8dcec'};
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const medallionsOn = () => { try { return /[?&]medallions\b/.test(location.search) || localStorage.getItem('aw-medallions') === '1'; } catch { return false; } };

// The charm's own hero art from the backpack (the same model the keychain shows); an icon sprite if it can't load.
async function charmObject(T, charm) {
 try { const b = await import('/simulations/backpack.mjs'); const m = await b.charmModel(charm); if (m) { m.scale.multiplyScalar(60); return m; } } catch (e) { console.warn('medallions: charm model', charm, e); }
 return null;
}

export function mountMedallions(AT = window.AbbieTown) {
 if (!AT?.stage) return null;
 if (AT.medallions) return AT.medallions;
 const st = AT.stage, T = st.THREE, scene = st.scene, camera = st.camera, canvas = st.renderer.domElement;
 const list = new Map(), root = new T.Group(); root.name = 'medallions'; scene.add(root);
 let visible = true, busy = false, clock = 0;

 const R = 3.4, LIFT = 20; // the charm is drawn a little over life size so it reads from the board view
 let earned = [];
 const refresh = () => import('/simulations/backpack.mjs').then(b => { earned = b.earnedCharms(); }).catch(() => {});
 refresh(); addEventListener('aw-backpack', refresh); addEventListener('storage', refresh); setInterval(refresh, 5000);

 function build(m) {
  const g = new T.Group(), colour = m.beam || COLOURS[m.id] || '#ffd96a';
  const spin = new T.Group(); spin.name = 'charm ' + m.charm;
  // until the hero art loads (or if it can't), a plain gold stand-in so the start point is never missing
  const fallback = new T.Mesh(new T.CylinderGeometry(R * .7, R * .7, .8, 24), new T.MeshStandardMaterial({color: '#f7c23c', metalness: .5, roughness: .35, emissive: '#6a4600', emissiveIntensity: .4}));
  fallback.rotation.x = Math.PI / 2; spin.add(fallback);
  charmObject(T, m.charm).then(o => { if (o) { spin.remove(fallback); spin.add(o); } });
  // the beam: a soft column in the game's colour tapering up (about 14 px wide at the charm to 6 px at the top), with a thin white core
  const H = 700, mat = (c, o) => new T.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false});
  const col = new T.Mesh(new T.CylinderGeometry(R * .35, R * .8, H, 20, 1, true), mat(colour, .5)), core = new T.Mesh(new T.CylinderGeometry(R * .12, R * .3, H, 10, 1, true), mat('#ffffff', .85));
  col.position.y = core.position.y = -LIFT + H / 2; col.name = 'mission beam';
  const halo = new T.Mesh(new T.SphereGeometry(R * 1.1, 16, 12), mat('#ffd96a', .16)); halo.name = 'charm glow';
  const shadow = new T.Mesh(new T.CircleGeometry(R * 1.3, 28), new T.MeshBasicMaterial({color: '#000000', transparent: true, opacity: .22, depthWrite: false})); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -LIFT + .5;
  const ground = new T.Mesh(new T.CircleGeometry(R * 2.4, 32), mat(colour, .4)); ground.rotation.x = -Math.PI / 2; ground.position.y = -LIFT + .6;
  const tap = new T.Mesh(new T.SphereGeometry(R * 2.1, 10, 8), new T.MeshBasicMaterial({visible: false})); tap.name = 'start tap area'; tap.userData.medallion = m.id;
  g.add(col, core, ground, shadow, halo, spin, tap); root.add(g);
  return {g, spin, col, core, ground, shadow, halo, tap, colour};
 }
 function register(m) {
  const e = list.get(m.id); if (e?.g) root.remove(e.g);
  const rec = {...m, ...build(m)}; list.set(m.id, rec); return rec;
 }
 const pos = (m, out = new T.Vector3()) => { const a = typeof m.at === 'function' ? m.at() : m.at; if (!a) return null; return a.isObject3D ? a.getWorldPosition(out) : out.copy(a); };

 // every frame: hover and spin, breathe the beam. An earned charm is a dim ghost with no beam (replay); a locked one is greyed.
 const off = st.frame(dt => {
  clock += dt;
  for (const m of list.values()) {
   const p = pos(m, m.g.position); m.g.visible = !!(visible && p); if (!m.g.visible) continue;
   const locked = m.available ? m.available() === false : false, done = earned.includes(m.charm) && !m.repeat, lit = !locked && !done;
   const bob = Math.sin(clock * 2 * Math.PI / 2.2) * 1.0; // about 6 px at the board view, every 2.2 s
   m.g.position.y = p.y + LIFT; m.spin.position.y = bob; m.tap.position.y = bob; m.halo.position.y = bob; m.spin.rotation.y = clock * 2 * Math.PI / 2.4;
   m.col.visible = m.core.visible = m.ground.visible = lit; m.col.material.opacity = .5 + Math.sin(clock * 1.7 + m.g.position.x) * .12;
   m.halo.material.opacity = lit ? .16 : .05; m.shadow.scale.setScalar(1 - bob * .08); m.spin.visible = true;
   m.spin.traverse(o => { if (o.material && 'opacity' in o.material && o.material.userData.m0 == null) { o.material.userData.m0 = [o.material.opacity, o.material.transparent]; } if (o.material?.userData?.m0) { o.material.transparent = lit ? o.material.userData.m0[1] : true; o.material.opacity = lit ? o.material.userData.m0[0] : .35; } });
  }
 });

 // ---- the tap: dolly in, a puff on the place only, then the mission opens ----
 function puff(p) {
  for (let i = 0; i < 12; i++) {
   const s = new T.Mesh(new T.SphereGeometry(2.6, 8, 6), new T.MeshBasicMaterial({color: '#f4eadb', transparent: true, opacity: .8, depthWrite: false}));
   s.position.set(p.x, p.y - LIFT + 3, p.z); const v = [(Math.random() - .5) * 30, Math.random() * 14 + 4, (Math.random() - .5) * 30]; let life = 0; scene.add(s);
   const stop = st.frame(dt => { life += dt; s.position.x += v[0] * dt; s.position.y += v[1] * dt; s.position.z += v[2] * dt; s.scale.setScalar(1 + life * 2); s.material.opacity = Math.max(0, .8 - life * 1.1); if (life > .8) { stop(); scene.remove(s); } });
  }
 }
 function target(m) { const p = pos(m); return p && new T.Vector3(p.x, p.y - LIFT + 6, p.z); }
 async function fly(id, dist = 90) { const m = list.get(id), t = m && target(m); if (!t) return false; st.flyTo(t, {dist, pitch: 38, azimuth: 200}); await sleep(1700); return true; }
 async function enter(id) {
  const m = list.get(id); if (!m || busy) return false;
  if (m.available && m.available() === false) { const t0 = clock; const stop = st.frame(() => { const k = clock - t0; m.spin.rotation.z = Math.sin(k * 40) * .25 * Math.max(0, 1 - k * 2.5); if (k > .4) { m.spin.rotation.z = 0; stop(); } }); return false; }
  busy = true;
  try { const t = target(m); if (t) st.flyTo(t, {dist: 55, pitch: 32, azimuth: 200}); await sleep(900); if (t) puff(t.clone().setY(t.y + LIFT)); await sleep(450); await m.start?.(); }
  finally { setTimeout(() => { busy = false; }, 600); }
  return true;
 }

 // ---- pointer: a tap (not a drag) on a medallion enters it ----
 const ray = new T.Raycaster(), ndc = new T.Vector2(); let down = null;
 canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
 canvas.addEventListener('pointerup', e => {
  if (!visible || busy || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects([...list.values()].filter(m => m.g.visible).map(m => m.tap), false)[0];
  if (hit) enter(hit.object.userData.medallion);
 });
 canvas.addEventListener('pointermove', e => {
  if (e.buttons || !visible) return; const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
  const over = ray.intersectObjects([...list.values()].filter(m => m.g.visible).map(m => m.tap), false).length; if (over) canvas.style.cursor = 'pointer'; else if (canvas.style.cursor === 'pointer') canvas.style.cursor = '';
 });
 // a mission that plays inside the town hides them while it runs and brings them back when it ends
 addEventListener('abbietown:enter', () => { visible = false; });
 addEventListener('abbietown:scene-exit', () => { visible = true; });

 const api = {register, fly, enter, list: () => [...list.keys()], has: id => list.has(id), setVisible: v => { visible = v; }, dispose() { off(); scene.remove(root); }, COLOURS};
 AT.medallions = api;
 return api;
}

// The town's own missions, placed through the registry (scene ids from AbbieTown.scenes; the hex city thread owns where the places stand).
// charm: the backpack charm that starts it (Charms thread, 2026-10-24). The carwash has no charm yet, so it has no start point here.
export function registerTownMedallions(AT = window.AbbieTown, M = AT?.medallions) {
 if (!M) return;
 const sw = id => () => AT.scenes?.[id]?.world, items = () => { try { return JSON.parse(localStorage.getItem('aw-inventory') || '[]'); } catch { return []; } };
 const unlocked = () => { try { return localStorage.getItem('aw-basement-unlocked') === '1' || items().some(i => i.id === 'cafe-basement-key'); } catch { return false; } };
 M.register({id: 'basement', charm: 'basement', at: sw('cafe-curb'), available: unlocked, start: () => AT.go('town:cafe-cellar', {items: ['cafe-key']})});
 M.register({id: 'moon', charm: 'rocket', at: sw('bakery-curb'), start: () => AT.go('town:truck', {crew: true})});
 M.register({id: 'jump', charm: 'school-roof', at: sw('school-door'), start: () => AT.go('town:school-door')});
 M.register({id: 'coaster', charm: 'toy-car', at: sw('skate-park'), start: () => { const e = AT.entrances?.['town:skate-park']; if (!e) return; AT.enterScene?.('skate-park', {dist: 40, pitch: 30, azimuth: 20}); setTimeout(() => { location.href = e.url + (e.url.includes('?') ? '&' : '?') + 'skip=tile'; }, 1400); }});
}
