// The living suit (AW-STUDY-0044). Evan, 2026-10-23: "use meta to put on a HUD / living suit when you're in FPS - it can
// be biome dependent. I'd expect an astronaut bubble with oxygen etc. when I'm on the moon", then "make it more obvious
// that we're in FPS mode. give me a tool in my hands and an FPS hud", three proposals: Evan's, Abbie's and a third.
// "Meta", both readings: the place's metadata picks what you wear and carry (BIOMES), and the suit lives in the HUD
// study's meta quadrant (your own glass, your own breath), with as little overlay as an FPS can get away with.
// Presentation layer only: the glass and the hands draw on their own canvases above the world canvas, so no
// character, director, Oracle shot or voice `look` ever perceives them, and nothing here writes to the simulation.

// What each place makes you wear. Abbie is the player: Moon Mission canon gives her a white suit with pink trim.
export const BIOMES = {
 moon:     {suit: 'bubble',  tool: 'scoop',   air: true,  dark: true,  glove: '#f4f6fa', trim: '#ff6fb5', ink: '#7fe9ff', dialect: 'lights, radio, holograms'},
 mars:     {suit: 'visor',   tool: 'hammer',  air: true,  dark: false, glove: '#f4efe8', trim: '#ff6fb5', ink: '#ffcf8a', dialect: 'dust, amber lamps, radio', dust: true},
 starship: {suit: 'headset', tool: 'wrench',  air: false, dark: true,  glove: '#3c5f9e', trim: '#ff6fb5', ink: '#8fd8ff', dialect: 'panels, chimes, the ship talking'},
 ranch:    {suit: 'brim',    tool: 'can',     air: false, dark: false, glove: '#b9875a', trim: '#ff6fb5', ink: '#24614a', dialect: 'wood, bells, painted signs'},
 suburban: {suit: 'hood',    tool: 'torch',   air: false, dark: true,  glove: '#7a4fb3', trim: '#ff9a3c', ink: '#ffd27a', dialect: 'porch lights, candy, leaves'},
 cemetery: {suit: 'hood',    tool: 'lantern', air: false, dark: true,  glove: '#41594a', trim: '#ffd27a', ink: '#ffe3a1', dialect: 'lanterns, bells, mist'},
 city:     {suit: 'goggles', tool: 'scanner', air: false, dark: false, glove: '#7b5232', trim: '#ff6fb5', ink: '#0f6f86', dialect: 'neon, brass, parcel chimes'},
};
// The three proposals. Evan's is a Metroid Prime style visor (style only): glass you look through, readouts living
// on its frame. Abbie's is the bubble buddy: a fishbowl, a vial of bubbles for air, a sticker on the glass.
// The third is the glove: Dead Space and Astroneer, nothing on screen but a dot; everything is on your wrist.
export const VARIANTS = ['prime', 'bubble', 'glove'];
export const biomeOf = (family, planet) => family === 'moon' ? (planet === 'mars' ? 'mars' : 'moon') : BIOMES[family] ? family : 'ranch';

export function installSuitHud({T, camera, getBiome = () => 'ranch', variant, host = document.body} = {}) {
 const store = {get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }};
 const asked = new URLSearchParams(location.search).get('hud');
 let style = VARIANTS.includes(variant) ? variant : VARIANTS.includes(asked) ? asked : VARIANTS.includes(store.get('suit-hud')) ? store.get('suit-hud') : 'prime';
 let on = false, biome = 'ranch', raf = 0, last = 0, t = 0, seal = 0, air = 1, refill = 0, charge = 1, use = 0, phase = 0, speed = 0, fog = 0, yawVel = 0;
 const reach = {x: .2, y: -.17}; // where the right hand sits, from the screen's shape
 let prev = null, prevYaw = 0, W = 0, H = 0, dpr = 1, tool = null, cuffTex = null;
 const bubbles = [], specks = Array.from({length: 26}, (_, i) => ({x: (i * 0.618) % 1, y: (i * 0.377) % 1, r: .6 + (i % 4) * .5, a: .1 + (i % 5) * .05}));

 if (!document.querySelector('link[data-suit-hud]')) document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: new URL('suit-hud.css?v=1', import.meta.url).href}));
 document.querySelector('link[href*="suit-hud.css"]')?.setAttribute('data-suit-hud', '');
 // Two canvases over the world: the glass (2D) and the hands (their own tiny WebGL scene).
 const glass = Object.assign(document.createElement('canvas'), {className: 'suit-hud suit-glass'});
 const hands = Object.assign(document.createElement('canvas'), {className: 'suit-hud suit-hands'});
 for (const c of [glass, hands]) { c.setAttribute('aria-hidden', 'true'); if (host !== document.body) c.classList.add('in-host'); host.append(c); }
 const size = () => host === document.body ? [innerWidth, innerHeight] : [host.clientWidth, host.clientHeight];
 const g = glass.getContext('2d');
 const gl = new T.WebGLRenderer({canvas: hands, alpha: true, antialias: true});
 gl.setClearColor(0, 0);
 const view = new T.Scene(), eye = new T.PerspectiveCamera(52, 1, .01, 10);
 const hemi = new T.HemisphereLight(0xffffff, 0x445566, 1.2), key = new T.DirectionalLight(0xffffff, 2.2);
 key.position.set(-.6, 1, .8); view.add(hemi, key);
 const rig = new T.Group(), arm = new T.Group(), wrist = new T.Group(); view.add(rig, wrist);

 const flat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .62, metalness: 0, flatShading: true, ...o});
 const glow = c => new T.MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: 1.4, flatShading: true});
 const box = (w, h, d, m) => new T.Mesh(new T.BoxGeometry(w, h, d), m);
 const cyl = (r1, r2, h, m, s = 8) => new T.Mesh(new T.CylinderGeometry(r1, r2, h, s), m);
 const at = (o, x, y, z, rx = 0, ry = 0, rz = 0) => (o.position.set(x, y, z), o.rotation.set(rx, ry, rz), o);

 // A gloved fist around a vertical handle at its origin, with a cuff. Low poly, named by what it is.
 function glove(b) {
  const hand = new T.Group(), skin = flat(b.glove), trim = flat(b.trim);
  hand.add(at(box(.07, .085, .06, skin), .012, 0, .005));
  for (let i = 0; i < 4; i++) hand.add(at(box(.022, .018, .03, skin), -.024, .03 - i * .021, -.022, 0, 0, .15));
  hand.add(at(box(.02, .045, .02, skin), -.02, .035, .03, 0, 0, -.6));
  hand.add(at(cyl(.042, .046, .05, trim, 10), .03, -.06, .005, 0, 0, .25));
  return hand;
 }
 function makeTool(b) {
  const grp = new T.Group(), metal = flat('#c9d0da', {metalness: .5, roughness: .4}), wood = flat('#9a6a3e'), pink = flat(b.trim), lamp = glow(b.ink);
  const handle = (m = wood, h = .2) => at(cyl(.012, .013, h, m), 0, 0, 0);
  const kinds = {
   scoop() { grp.add(handle(metal, .22)); grp.add(at(cyl(.016, .016, .05, pink), 0, -.04, 0));
    const blade = new T.Group(), shell = flat('#e8edf3', {metalness: .3, roughness: .45}); blade.add(at(box(.075, .006, .1, shell), 0, 0, -.05));
    blade.add(at(box(.006, .02, .1, shell), -.037, .01, -.05), at(box(.006, .02, .1, shell), .037, .01, -.05), at(box(.075, .02, .006, shell), 0, .01, 0)); grp.add(at(blade, 0, .11, 0, -.35, 0, 0)); grp.add(at(box(.012, .012, .012, lamp), .016, .06, 0)); },
   hammer() { grp.add(handle(wood, .24)); grp.add(at(box(.1, .035, .035, metal), .015, .12, 0)); grp.add(at(cyl(.004, .016, .05, metal, 6), .085, .12, 0, 0, 0, Math.PI / 2)); grp.add(at(cyl(.015, .015, .04, pink), 0, -.06, 0)); },
   wrench() { grp.add(at(box(.025, .22, .012, metal), 0, .02, 0)); const jaw = new T.Mesh(new T.TorusGeometry(.03, .011, 5, 8, Math.PI * 1.4), metal);
    grp.add(at(jaw, 0, .145, 0, 0, 0, -Math.PI * .2)); grp.add(at(box(.03, .07, .02, pink), 0, -.05, 0)); grp.add(at(box(.008, .02, .014, lamp), 0, .06, .004)); },
   can() { const body = flat('#6aa38a'); grp.add(at(cyl(.05, .055, .09, body, 10), .055, .08, -.02)); grp.add(at(cyl(.006, .011, .13, body, 6), .14, .12, -.02, 0, 0, -1.05));
    grp.add(at(cyl(.02, .012, .02, body, 8), .2, .155, -.02, 0, 0, -1.05)); const bar = new T.Mesh(new T.TorusGeometry(.045, .008, 5, 10, Math.PI), flat('#4d7d68'));
    grp.add(at(bar, .055, .125, -.02, 0, 0, 0)); grp.add(at(box(.012, .03, .012, flat('#4d7d68')), 0, .01, 0)); grp.add(at(cyl(.051, .051, .006, flat('#a8dcff', {transparent: true, opacity: .8}), 10), .055, .1, -.02)); },
   torch() { grp.add(at(cyl(.02, .02, .17, flat('#3a3f4a')), 0, .03, 0)); grp.add(at(cyl(.03, .022, .04, flat('#3a3f4a')), 0, .135, 0)); grp.add(at(cyl(.026, .026, .005, lamp, 10), 0, .157, 0));
    const beam = new T.Mesh(new T.ConeGeometry(.22, 1.4, 16, 1, true), new T.MeshBasicMaterial({color: b.ink, transparent: true, opacity: .07, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide}));
    beam.name = 'beam'; grp.add(at(beam, 0, .86, 0, Math.PI, 0, 0)); grp.add(at(cyl(.022, .022, .03, flat(b.trim)), 0, -.03, 0)); },
   lantern() { grp.add(at(box(.012, .06, .012, flat('#2b2b2b')), 0, .02, 0)); const cage = flat('#2f3b33', {metalness: .3});
    for (const [x, z] of [[-.03, -.03], [.03, -.03], [-.03, .03], [.03, .03]]) grp.add(at(box(.006, .09, .006, cage), x, .1, z));
    grp.add(at(box(.07, .01, .07, cage), 0, .15, 0)); grp.add(at(box(.07, .01, .07, cage), 0, .055, 0)); grp.add(at(new T.Mesh(new T.IcosahedronGeometry(.022, 0), lamp), 0, .1, 0)); },
   scanner() { grp.add(at(box(.035, .1, .03, flat('#b88a4a', {metalness: .4})), 0, 0, 0)); grp.add(at(box(.07, .05, .02, flat('#7b5232')), 0, .075, 0)); grp.add(at(box(.055, .035, .004, lamp), 0, .077, .011));
    grp.add(at(cyl(.003, .003, .06, metal, 4), .025, .125, 0)); grp.add(at(new T.Mesh(new T.SphereGeometry(.007, 6, 4), flat(b.trim)), .025, .155, 0)); },
  };
  (kinds[b.tool] || kinds.scoop)();
  return grp;
 }
 // The glove variant's left wrist: a cuff with lights you read by looking down at your own arm.
 function makeWrist(b) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; cuffTex = new T.CanvasTexture(c); cuffTex.colorSpace = T.SRGBColorSpace;
  const skin = flat(b.glove), grp = new T.Group();
  grp.add(at(cyl(.04, .046, .26, skin, 8), 0, -.1, 0));
  grp.add(at(cyl(.05, .05, .07, flat(b.trim), 10), 0, .04, 0));
  grp.add(at(box(.07, .05, .012, new T.MeshBasicMaterial({map: cuffTex})), 0, .045, .047));
  grp.add(at(glove(b), 0, .12, 0, 0, Math.PI, 0));
  return grp;
 }
 function drawCuff() {
  const c = cuffTex.image, x = c.getContext('2d'), b = BIOMES[biome];
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, 128, 64);
  const value = b.air ? air : charge, lit = Math.round(value * 6);
  for (let i = 0; i < 6; i++) { x.fillStyle = i < lit ? (value < .25 ? '#ffb547' : b.ink) : '#1e2a3c'; x.fillRect(10 + i * 18, 10, 13, 22); }
  const bearing = home(); x.strokeStyle = b.trim; x.lineWidth = 4; x.beginPath(); x.arc(64, 48, 10, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(64, 48); x.lineTo(64 + Math.sin(bearing) * 12, 48 - Math.cos(bearing) * 12); x.stroke();
  cuffTex.needsUpdate = true;
 }
 function dress() {
  const b = BIOMES[biome];
  for (const grp of [rig, wrist]) for (const child of [...grp.children]) { grp.remove(child); child.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); }
  arm.clear(); tool = makeTool(b); arm.add(glove(b), tool); rig.add(arm);
  at(rig, reach.x, reach.y, -.42, .1, -.35, -.18);
  if (style === 'glove') { const w = makeWrist(b); wrist.add(w); at(wrist, -reach.x * .8, reach.y - .03, -.38, -.9, .5, .55); } else cuffTex = null;
  hemi.intensity = b.dark ? .55 : 1.3; key.intensity = b.dark ? 2.6 : 2.0; key.color.set(b.dark ? '#dfe8ff' : '#fff2dc');
  glass.dataset.suit = b.suit; glass.dataset.variant = style;
 }

 // Where home is (the middle of the place: the barn, the habitat, the bridge), relative to where you face.
 const dir = new T.Vector3();
 function facing() { camera.getWorldDirection(dir); return Math.atan2(dir.x, -dir.z); }
 function home() { const p = camera.position, to = Math.atan2(-p.x, p.z); let d = to - facing(); while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

 function resize() {
  dpr = Math.min(2, devicePixelRatio || 1); [W, H] = size();
  glass.width = W * dpr; glass.height = H * dpr; gl.setPixelRatio(dpr); gl.setSize(W, H, false);
  eye.aspect = W / H; eye.fov = W < H ? 64 : 52; eye.updateProjectionMatrix();
  // On a phone held upright the hands sit lower and smaller so they never cover the path ahead.
  rig.scale.setScalar(W < H ? .82 : 1); wrist.scale.setScalar(W < H ? .82 : 1);
  const half = .42 * Math.tan(eye.fov * Math.PI / 360); reach.x = Math.min(.24, half * eye.aspect * .62); reach.y = -half * .78;
  rig.position.x = reach.x; rig.position.y = reach.y; wrist.position.x = -reach.x * .8;
 }

 // ---- the glass: one frame per suit, then the variant's readouts ----
 const ease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
 function frame(b, tint) {
  const s = Math.min(W, H);
  g.save(); g.translate(0, -(1 - ease(seal)) * H * .25); g.globalAlpha = ease(seal);
  if (b.suit === 'bubble') {
   const cx = W / 2, cy = H * .5, rx = W * .6, ry = H * .66;
   g.beginPath(); g.rect(0, 0, W, H); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(214,236,255,.07)'; g.fill('evenodd');
   g.lineWidth = s * .03; g.strokeStyle = tint; g.beginPath(); g.ellipse(cx, cy, rx + s * .018, ry + s * .018, 0, 0, Math.PI * 2); g.stroke();
   g.lineWidth = s * .006; g.strokeStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(cx, cy, rx + s * .01, ry + s * .01, 0, 0, Math.PI * 2); g.stroke();
   g.lineWidth = Math.max(1.5, s * .003); g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.stroke();
   // A soft reflection of the sun on the curve of the glass: this is what makes it a bubble you are inside.
   g.lineCap = 'round'; g.lineWidth = s * .012; g.strokeStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(cx, cy, rx * .9, ry * .86, 0, Math.PI * 1.16, Math.PI * 1.3); g.stroke();
   g.lineWidth = s * .005; g.strokeStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(cx, cy, rx * .86, ry * .82, 0, Math.PI * 1.17, Math.PI * 1.22); g.stroke();
  } else if (b.suit === 'visor') {
   const grd = g.createLinearGradient(0, 0, 0, H * .08); grd.addColorStop(0, '#8a4a1f'); grd.addColorStop(1, '#c97a3a');
   g.beginPath(); g.moveTo(0, 0); g.lineTo(0, H * .085); g.quadraticCurveTo(W / 2, -H * .02, W, H * .085); g.lineTo(W, 0); g.closePath(); g.fillStyle = grd; g.fill();
   g.strokeStyle = tint; g.lineWidth = s * .008; g.beginPath(); g.moveTo(0, H * .085); g.quadraticCurveTo(W / 2, -H * .02, W, H * .085); g.stroke();
   for (const p of specks) { g.fillStyle = `rgba(214,150,96,${p.a})`; g.beginPath(); g.arc(((p.x + t * .004) % 1) * W, (.12 + p.y * .8) * H, p.r * dpr * .8, 0, Math.PI * 2); g.fill(); }
  } else if (b.suit === 'goggles') {
   const r = s * .22; g.beginPath(); g.rect(0, 0, W, H); g.roundRect(s * .01, s * .01, W - s * .02, H - s * .02, r); g.fillStyle = '#6b4a2a'; g.fill('evenodd');
   g.strokeStyle = '#d9a75a'; g.lineWidth = s * .01; g.beginPath(); g.roundRect(s * .01, s * .01, W - s * .02, H - s * .02, r); g.stroke();
   g.fillStyle = '#d9a75a'; for (const [x, y] of [[.045, .045], [.955, .045], [.045, .955], [.955, .955]]) { g.beginPath(); g.arc(x * W, y * H, s * .008, 0, Math.PI * 2); g.fill(); }
  } else if (b.suit === 'headset') {
   g.lineCap = 'round'; g.strokeStyle = '#1b2333'; g.lineWidth = s * .018; g.beginPath(); g.moveTo(-s * .02, H * .78); g.quadraticCurveTo(W * .05, H * .9, W * .13, H * .94); g.stroke();
   g.fillStyle = '#273247'; g.beginPath(); g.ellipse(W * .14, H * .945, s * .032, s * .024, -.4, 0, Math.PI * 2); g.fill();
   g.fillStyle = tint; g.globalAlpha *= .6 + .4 * Math.sin(t * 2.4) ** 2; g.beginPath(); g.arc(W * .06, H * .86, s * .006, 0, Math.PI * 2); g.fill();
  } else if (b.suit === 'brim') {
   const grd = g.createLinearGradient(0, 0, 0, H * .06); grd.addColorStop(0, '#6b4e2a'); grd.addColorStop(1, '#c9a265');
   g.beginPath(); g.moveTo(0, 0); g.lineTo(0, H * .03); g.quadraticCurveTo(W / 2, H * .085, W, H * .03); g.lineTo(W, 0); g.closePath(); g.fillStyle = grd; g.fill();
   g.strokeStyle = 'rgba(255,236,190,.35)'; g.lineWidth = 1;
   for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, H * .03 * i / 4); g.quadraticCurveTo(W / 2, H * .085 * i / 4, W, H * .03 * i / 4); g.stroke(); }
   g.strokeStyle = b.trim; g.lineWidth = s * .006; g.beginPath(); g.moveTo(0, H * .03); g.quadraticCurveTo(W / 2, H * .085, W, H * .03); g.stroke();
  } else if (b.suit === 'hood') {
   for (const side of [0, 1]) { const x = side ? W : 0; g.fillStyle = b.glove; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H * .2); g.quadraticCurveTo(side ? W - s * .03 : s * .03, s * .03, side ? W - s * .2 : s * .2, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = s * .004; g.beginPath(); g.moveTo(x, H * .2); g.quadraticCurveTo(side ? W - s * .03 : s * .03, s * .03, side ? W - s * .2 : s * .2, 0); g.stroke(); }
  }
  g.restore();
 }
 function crosshair(kind, ink) {
  const cx = W / 2, cy = H / 2, s = Math.min(W, H);
  g.save(); g.globalAlpha = ease(seal);
  if (kind === 'prime') {
   g.fillStyle = ink; g.beginPath(); g.arc(cx, cy, 2.2, 0, Math.PI * 2); g.fill();
   const open = s * (.022 + Math.min(1, speed / .5) * .014 + use * .02); g.strokeStyle = ink; g.lineWidth = 1.6; g.globalAlpha *= .8;
   for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(cx, cy, open, a - .22, a + .22); g.stroke(); }
  } else if (kind === 'bubble') {
   const r = s * (.012 + .003 * Math.sin(t * 3)); g.fillStyle = ink; g.translate(cx, cy); g.rotate(t * .4);
   g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .32 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
  } else { g.fillStyle = 'rgba(255,255,255,.9)'; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 2.4, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
 }
 // Evan's: readouts are holograms on the inside of the visor frame; they tuck away while nothing changes.
 let tuck = 1, lastAir = 1;
 function prime(b, ink) {
  const s = Math.min(W, H), low = air < .25, value = b.air ? air : charge;
  if (Math.abs(value - lastAir) > .02 || low || refill) { tuck = 1; lastAir = value; } else tuck = Math.max(.35, tuck - .0025);
  g.save(); g.globalAlpha = ease(seal) * tuck; g.lineCap = 'round'; g.shadowColor = ink; g.shadowBlur = 10;
  // Air (or the tool's charge where there is air to breathe): ten cells on an arc hugging the top-left of the frame.
  const ax = W * .1 + s * .02, ay = H * .2, r = s * .085, cells = 10, lit = Math.round(value * cells);
  for (let i = 0; i < cells; i++) { const a0 = Math.PI * 1.02 + i * (Math.PI * .46 / cells); g.strokeStyle = i < lit ? (low ? `rgba(255,181,71,${.6 + .4 * Math.sin(t * 5) ** 2})` : ink) : 'rgba(255,255,255,.14)';
   g.lineWidth = s * .016; g.beginPath(); g.arc(ax, ay, r, a0, a0 + Math.PI * .46 / cells * .7); g.stroke(); }
  g.fillStyle = ink; g.beginPath(); g.arc(ax - r * .02, ay - r * 1.04, s * .008, 0, Math.PI * 2); g.globalAlpha *= .8; g.fill();
  // Heading: a thin tape of ticks along the brow; the pink diamond is home.
  const tw = Math.min(W * .34, 320), tx = W / 2 - tw / 2, ty = H * (b.suit === 'brim' || b.suit === 'visor' ? .1 : .055), face = facing();
  g.strokeStyle = ink; g.lineWidth = 2;
  for (let deg = -60; deg <= 60; deg += 5) { const a = Math.round((face * 180 / Math.PI + deg) / 5) * 5, x = W / 2 + (a - face * 180 / Math.PI) / 60 * tw / 2;
   if (x < tx || x > tx + tw) continue; const big = a % 45 === 0; g.globalAlpha = ease(seal) * Math.max(tuck, .55) * (1 - Math.abs(x - W / 2) / (tw / 2)) ; g.beginPath(); g.moveTo(x, ty); g.lineTo(x, ty + (big ? 12 : 6)); g.stroke(); }
  g.globalAlpha = ease(seal) * .9; g.fillStyle = ink; g.beginPath(); g.moveTo(W / 2 - 4, ty - 6); g.lineTo(W / 2 + 4, ty - 6); g.lineTo(W / 2, ty - 1); g.fill();
  const hb = home(); if (Math.abs(hb) < Math.PI / 3) { const x = W / 2 + hb / (Math.PI / 3) * tw / 2; g.globalAlpha = ease(seal); g.fillStyle = b.trim; g.beginPath(); g.moveTo(x, ty + 12); g.lineTo(x + 5, ty + 17); g.lineTo(x, ty + 22); g.lineTo(x - 5, ty + 17); g.fill(); }
  g.restore();
 }
 // Abbie's: a vial of bubbles is her air; a heart on the rim leans toward home; a star sticker because it's hers.
 function bubbleBuddy(b, ink) {
  const s = Math.min(W, H), value = b.air ? air : charge, vx = W * .06 + s * .02, vh = s * .2, vw = s * .05, vy = H * .62;
  g.save(); g.globalAlpha = ease(seal);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(vx, vy, vw, vh, vw / 2); g.fill();
  const level = vh * value; g.save(); g.beginPath(); g.roundRect(vx, vy, vw, vh, vw / 2); g.clip();
  const liquid = g.createLinearGradient(0, vy + vh - level, 0, vy + vh); liquid.addColorStop(0, b.air ? '#a8f0ff' : '#9fd7ff'); liquid.addColorStop(1, b.air ? '#5ac8ff' : '#4a9bff');
  g.fillStyle = liquid; g.fillRect(vx, vy + vh - level + Math.sin(t * 3) * 1.5, vw, level + 4);
  if (Math.random() < (.06 + value * .25) * (refill ? 4 : 1)) bubbles.push({x: vx + vw * (.2 + Math.random() * .6), y: vy + vh, top: vy + vh * (1 - value), r: (1.5 + Math.random() * 3) * Math.min(2, dpr), v: 20 + Math.random() * 30});
  g.fillStyle = 'rgba(255,255,255,.85)'; for (const p of bubbles) { g.beginPath(); g.arc(p.x + Math.sin(t * 4 + p.y) * 1.2, p.y, p.r, 0, Math.PI * 2); g.fill(); }
  g.restore();
  g.lineWidth = s * .006; g.strokeStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.roundRect(vx, vy, vw, vh, vw / 2); g.stroke();
  g.fillStyle = ink; g.beginPath(); g.roundRect(vx - s * .006, vy - s * .022, vw + s * .012, s * .028, s * .01); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = s * .006; g.beginPath(); g.moveTo(vx + vw * .28, vy + vw * .5); g.lineTo(vx + vw * .28, vy + vh * .55); g.stroke();
  // The heart leans toward home along the top of the glass.
  const hb = Math.max(-1, Math.min(1, home() / (Math.PI / 2))), hx = W / 2 + hb * W * .3, hy = H * (b.suit === 'brim' || b.suit === 'visor' ? .12 : .07), hr = s * .016 * (1 + .08 * Math.sin(t * 4));
  g.fillStyle = ink; g.beginPath(); g.moveTo(hx, hy + hr * 1.1); g.bezierCurveTo(hx - hr * 2, hy - hr * .2, hx - hr * .8, hy - hr * 1.6, hx, hy - hr * .5); g.bezierCurveTo(hx + hr * .8, hy - hr * 1.6, hx + hr * 2, hy - hr * .2, hx, hy + hr * 1.1); g.fill();
  if (b.suit === 'bubble') { // a star sticker stuck on the outside of her helmet glass
   const sx = W * .9 - s * .02, sy = H * .18, sr = s * .03; g.translate(sx, sy); g.rotate(.25); g.lineJoin = 'round';
   g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? sr * .45 : sr; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath();
   g.lineWidth = s * .008; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = b.trim; g.fill(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  g.restore();
 }
 // Breath on the glass: a meta feeling. It blooms when you hurry or the air runs thin, never over the middle.
 function breath(b) {
  if (b.suit !== 'bubble' && b.suit !== 'visor') return;
  const want = Math.min(1, speed / .55) * .5 + (b.air && air < .3 ? .5 : 0), puff = .55 + .45 * Math.sin(t * 2.6);
  fog += (want * puff - fog) * .05; if (fog < .01) return;
  const s = Math.min(W, H), grd = g.createRadialGradient(W / 2, H * 1.02, 0, W / 2, H * 1.02, s * .34);
  grd.addColorStop(0, `rgba(240,248,255,${.2 * fog})`); grd.addColorStop(1, 'rgba(240,248,255,0)'); g.fillStyle = grd; g.fillRect(0, H * .66, W, H * .34);
 }

 // ---- the loop ----
 let audio = null;
 const tone = (f, d, type = 'sine', v = .05) => { try { audio ||= new AudioContext(); const o = audio.createOscillator(), a = audio.createGain(); o.type = type; o.frequency.value = f; a.gain.setValueAtTime(v, audio.currentTime); a.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + d); o.connect(a).connect(audio.destination); o.start(); o.stop(audio.currentTime + d); } catch {} };
 const USE_SOUND = {scoop: [180, .18, 'triangle'], hammer: [120, .12, 'square'], wrench: [420, .08, 'square'], can: [600, .3, 'sine'], torch: [900, .05, 'square'], lantern: [520, .4, 'sine'], scanner: [1200, .12, 'sine']};
 function act() { if (!on || use > .2 || charge < .08) return; use = 1; charge = Math.max(0, charge - .12); const [f, d, w] = USE_SOUND[BIOMES[biome].tool] || USE_SOUND.scoop; tone(f, d, w, .04); }
 function tick(now) {
  if (!on) return;
  now = performance.now(); const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; t += dt; seal = Math.min(1, seal + dt / .55);
  const want = getBiome(); if (want !== biome && BIOMES[want]) { biome = want; dress(); }
  const b = BIOMES[biome], p = camera.position, yaw = facing();
  if (prev) { speed += (Math.hypot(p.x - prev.x, p.z - prev.z) / Math.max(dt, 1e-3) - speed) * .2; let dy = yaw - prevYaw; if (dy > Math.PI) dy -= Math.PI * 2; if (dy < -Math.PI) dy += Math.PI * 2; yawVel += (dy / Math.max(dt, 1e-3) - yawVel) * .2; }
  prev = p.clone(); prevYaw = yaw;
  // Air: it runs down as you walk, and before it ever runs out the base tops you up (a chime and a fizz). Nobody fails.
  if (b.air) { if (refill) { air = Math.min(1, air + dt / 2.4); if (air >= 1) refill = 0; } else { air -= dt * (.003 + Math.min(1, speed / .55) * .006); if (air < .12) { refill = 1; tone(784, .35); setTimeout(() => tone(1175, .5), 160); } } }
  charge = Math.min(1, charge + dt * .025); use = Math.max(0, use - dt * 2.6);
  for (let i = bubbles.length - 1; i >= 0; i--) { bubbles[i].y -= bubbles[i].v * dt; if (bubbles[i].y < bubbles[i].top) bubbles.splice(i, 1); }
  // Hands: rise in, bob with each step, lag a little behind a turn, and swing when used.
  phase += dt * (2 + speed * 14); const amp = Math.min(1, speed / .5), rise = (1 - ease(seal)) * -.35;
  arm.position.set(Math.sin(phase) * .01 * amp - yawVel * .012, Math.abs(Math.cos(phase)) * .012 * amp + rise, 0);
  const swing = Math.sin(use * Math.PI); arm.rotation.set(-swing * .9, 0, swing * (b.tool === 'wrench' ? 1.2 : .2));
  wrist.position.y = reach.y - .03 + rise + Math.abs(Math.sin(phase)) * .006 * amp;
  const beam = tool?.getObjectByName('beam'); if (beam) beam.material.opacity = .05 + .05 * charge;
  if (cuffTex) drawCuff();
  gl.render(view, eye);
  const [w, h] = size(); if (w !== W || h !== H) resize(); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const tint = style === 'bubble' ? b.trim : style === 'prime' ? 'rgba(200,228,255,.85)' : 'rgba(240,240,240,.7)', ink = style === 'bubble' ? b.trim : b.ink;
  breath(b); frame(b, tint);
  if (style === 'prime') prime(b, ink); else if (style === 'bubble') bubbleBuddy(b, ink);
  crosshair(style, ink);
  raf = requestAnimationFrame(tick);
 }

 addEventListener('keydown', e => { if (!on || e.target.closest?.('input,textarea,[contenteditable=true]')) return; const k = e.key.toLowerCase(); if (k === 'e' || k === 'f') act(); if (k === 'v') setVariant(VARIANTS[(VARIANTS.indexOf(style) + 1) % VARIANTS.length]); });
 // A quick tap (no drag) uses the tool. Window capture runs before first-person's own canvas handlers, which it leaves alone.
 let tap = null;
 addEventListener('pointerdown', e => { tap = on && host.contains(e.target) ? {x: e.clientX, y: e.clientY, at: performance.now()} : null; }, true);
 addEventListener('pointerup', e => { if (tap && performance.now() - tap.at < 220 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 8) act(); tap = null; }, true);

 function enter() { if (on) return; on = true; biome = getBiome(); if (!BIOMES[biome]) biome = 'ranch'; seal = 0; prev = null; speed = 0; resize(); dress(); document.documentElement.classList.add('suit-on'); last = performance.now(); raf = requestAnimationFrame(tick); tone(220, .25, 'triangle', .035); }
 function exit() { if (!on) return; on = false; cancelAnimationFrame(raf); document.documentElement.classList.remove('suit-on'); g.clearRect(0, 0, glass.width, glass.height); gl.clear(); }
 function setVariant(v) { if (!VARIANTS.includes(v)) return; style = v; store.set('suit-hud', v); if (on) dress(); }
 return {enter, exit, use: act, setVariant, get variant() { return style; }, get biome() { return biome; }, get air() { return air; }, get active() { return on; }, get state() { return {t, seal, speed, air, charge, W, H}; }};
}
