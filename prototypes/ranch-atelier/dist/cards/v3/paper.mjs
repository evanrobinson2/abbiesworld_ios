// The held card (AW-STUDY-0014). Evan, 2026-10-23: "if you just click the card it opens in large beautiful format: think
// about paper shaders, make it look fucking good". The face (face.mjs) stays flat colour; everything physical lives here:
//   card stock   a 0.4 mm sheet with a visible core edge that follows the die line (stacked alpha-tested layers), matte
//                paper with a fine tooth (procedural normal map, only visible up close) and a soft fibre sheen;
//   spot gloss   a clear varnish over the art only (clearcoat masked by the face's gloss regions), so a light streak
//                slides across the picture and not the paper when you tilt it (the print spec's spot UV);
//   light        a window-shaped key light in the environment, so tilting the card sweeps a real highlight;
//   motion       tilt toward the finger or the phone's attitude, an idle sway when untouched (Balatro), a spring.
// Opening flies the card from its place in the hand to about 4x, centred; nothing dims or blurs the world behind it.
// One obvious button turns the card over: its back holds the tile's settings as card facets (facets.mjs).
import * as T from 'three';
import {renderFace, renderBack, CARD, PLACES} from './face.mjs';

let open = null;
export const isOpen = () => !!open;

export async function openCard({id, name, art, palette = null, style = 'slice', from = null, onSettings = null, onClose = null, facets = null}) {
 closeCard(true);
 const dpr = Math.min(3, devicePixelRatio || 1);
 // Size: the card fills about 78 per cent of the shorter screen side's height budget, capped at 4x a hand card (120 px).
 const H = Math.min(innerHeight * 0.78, (innerWidth * 0.86) * CARD.h / CARD.w, 4 * 120 * CARD.h / CARD.w);
 const W = H * CARD.w / CARD.h;
 // Face texture at the pixels it will be seen at (sharp at 4x), with a floor of 600 ppi for print parity.
 const dpi = Math.max(600, Math.ceil(W * dpr / (CARD.w / 25.4)));
 const [face, back] = await Promise.all([renderFace({id, name, art, palette}, {style, dpi}), renderBack({dpi: Math.min(dpi, 600), colour: PLACES[id]?.body})]);

 const host = document.createElement('div'); host.className = 'cv3-held'; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', (name || PLACES[id]?.name || 'Card'));
 const canvas = document.createElement('canvas'); host.append(canvas);
 const flip = document.createElement('button'); flip.type = 'button'; flip.className = 'cv3-turn'; flip.setAttribute('aria-label', 'Settings');
 flip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
 host.append(flip);
 document.body.append(host);

 const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true, premultipliedAlpha: true});
 renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight, false);
 renderer.toneMapping = T.NoToneMapping; // flat colour faces must keep their colours: light, don't grade renderer.outputColorSpace = T.SRGBColorSpace;
 const scene = new T.Scene(), camera = new T.PerspectiveCamera(22, innerWidth / innerHeight, 1, 5000);
 // World units are millimetres; place the camera so the card is W css px wide on screen.
 const dist = (CARD.h / (H / innerHeight)) / (2 * Math.tan(T.MathUtils.degToRad(22 / 2)));
 camera.position.set(0, 0, dist);
 scene.environment = paperRoom(renderer);

 const card = new T.Group(), faceH = face.canvas.height / face.canvas.width * CARD.w, head = face.head || 0;
 const tex = canvasTexture(face.canvas, renderer), backTex = canvasTexture(back.canvas, renderer);
 const geo = new T.PlaneGeometry(CARD.w, faceH);
 const yOff = head / 2; // diecut faces carry headroom above the trim; keep the trim centred
 const gloss = glossMask(face, faceH);
 const front = new T.Mesh(geo, new T.MeshPhysicalMaterial({
  map: tex, alphaTest: 0.5, transparent: false, roughness: 0.82, metalness: 0,
  bumpMap: toothMap(), bumpScale: 0.6,
  envMapIntensity: 0.3, clearcoat: 1, clearcoatMap: gloss, clearcoatRoughness: 0.06,
  sheen: 0.35, sheenRoughness: 0.9, sheenColor: new T.Color('#fff6e6')
 }));
 front.material.bumpMap.repeat.set(CARD.w / 9, faceH / 9);
 front.position.set(0, yOff, 0.2); card.add(front);
 // Core edge: thin layers that share the face's alpha, so the visible edge follows a die-cut silhouette too.
 const core = new T.MeshStandardMaterial({color: '#efe9dc', alphaMap: tex, alphaTest: 0.5, roughness: 0.95});
 core.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <alphamap_fragment>', 'diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).a;'); };
 for (let i = 1; i < 6; i++) { const m = new T.Mesh(geo, core); m.position.set(0, yOff, 0.2 - i * 0.08); card.add(m); }
 const backMesh = new T.Mesh(geo, new T.MeshPhysicalMaterial({map: backTex, alphaMap: tex, alphaTest: 0.5, roughness: 0.75, bumpMap: front.material.bumpMap, bumpScale: 0.6}));
 backMesh.material.onBeforeCompile = core.onBeforeCompile;
 backMesh.rotation.y = Math.PI; backMesh.position.set(0, yOff, -0.25); card.add(backMesh);
 scene.add(card);
 // A key light from the scene's sun side and a soft fill; the environment carries the window highlight.
 // Balanced so a face seen straight on reads at its printed colours (three's Lambert divides by pi).
 const key = new T.DirectionalLight('#fff4e0', 2.9); key.position.set(-60, 90, 120); scene.add(key);
 scene.add(new T.HemisphereLight('#f6f3ec', '#9a9488', 1.35));

 // Motion state: where the card starts (its place in the hand), where it rests, tilt and flip springs.
 const st = {t: 0, open: 0, tx: 0, ty: 0, rx: 0, ry: 0, vx: 0, vy: 0, flip: 0, flipTo: 0, idle: 0, closing: false, gyro: null};
 const startPos = from ? screenToWorld(from.x + from.width / 2, from.y + from.height / 2, dist, camera) : new T.Vector3(0, -CARD.h, 0);
 const startScale = from ? from.width / W : 0.25;

 const onMove = e => { const r = canvas.getBoundingClientRect(); st.tx = ((e.clientY - r.height / 2) / r.height) * -0.5; st.ty = ((e.clientX - r.width / 2) / r.width) * 0.6; st.idle = 0; };
 const onOrient = e => { if (e.beta == null) return; st.gyro ??= {b: e.beta, g: e.gamma}; st.tx = T.MathUtils.clamp((e.beta - st.gyro.b) / 60, -0.3, 0.3); st.ty = T.MathUtils.clamp((e.gamma - st.gyro.g) / 60, -0.35, 0.35); st.idle = 0; };
 const ray = new T.Raycaster(), ndc = new T.Vector2();
 const onTap = e => {
  if (e.target.closest?.('.cv3-turn, .cv3-facets')) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (!ray.intersectObject(front).length && !ray.intersectObject(backMesh).length) closeCard();
 };
 const onKey = e => { if (e.key === 'Escape') closeCard(); };
 addEventListener('pointermove', onMove, {passive: true}); addEventListener('deviceorientation', onOrient);
 host.addEventListener('pointerdown', onTap); addEventListener('keydown', onKey);
 const onResize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
 addEventListener('resize', onResize);

 let facetHost = null;
 flip.onclick = () => {
  st.flipTo = st.flipTo ? 0 : 1; flip.classList.toggle('on', !!st.flipTo);
  if (st.flipTo && facets) { facetHost = facets({id, width: W, height: H, close: () => flip.click()}); host.append(facetHost); requestAnimationFrame(() => facetHost?.classList.add('in')); }
  else if (facetHost) { const f = facetHost; facetHost = null; f.classList.remove('in'); setTimeout(() => f.remove(), 260); }
  onSettings?.(!!st.flipTo);
 };

 const clock = new T.Clock(); let raf = 0;
 const ease = x => 1 - Math.pow(1 - x, 3);
 function frame() {
  const dt = Math.min(0.05, clock.getDelta()); st.t += dt; st.idle += dt;
  st.open = T.MathUtils.clamp(st.open + (st.closing ? -dt : dt) / 0.42, 0, 1);
  const k = st.closing ? ease(st.open) : spring(st.open);
  card.position.lerpVectors(startPos, new T.Vector3(0, 0, 0), k);
  card.scale.setScalar(T.MathUtils.lerp(startScale, 1, k));
  // Idle sway once the finger has been away a moment, so the card is never dead still.
  const sway = Math.min(1, Math.max(0, st.idle - 1.2)) * 0.06;
  const ax = st.tx + Math.sin(st.t * 0.9) * sway, ay = st.ty + Math.sin(st.t * 0.7 + 1) * sway * 1.4;
  st.vx += ((ax - st.rx) * 90 - st.vx * 14) * dt; st.vy += ((ay - st.ry) * 90 - st.vy * 14) * dt;
  st.rx += st.vx * dt; st.ry += st.vy * dt;
  st.flip += (st.flipTo - st.flip) * Math.min(1, dt * 9);
  card.rotation.set(st.rx, st.ry + st.flip * Math.PI, (1 - k) * -0.12);
  renderer.render(scene, camera);
  if (st.closing && st.open <= 0) return dispose();
  raf = requestAnimationFrame(frame);
 }
 function dispose() {
  cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('deviceorientation', onOrient); removeEventListener('keydown', onKey); removeEventListener('resize', onResize);
  renderer.dispose(); host.remove(); if (open?.host === host) open = null; onClose?.();
 }
 open = {host, close: () => { if (st.closing) return; st.closing = true; facetHost?.remove(); flip.hidden = true; }, dispose};
 requestAnimationFrame(() => host.classList.add('in'));
 frame();
 return open;
}

export function closeCard(now = false) { if (!open) return; if (now) open.dispose(); else open.close(); }

function spring(x) { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); } // ease-out-back: a small settle past the mark
function screenToWorld(x, y, dist, camera) {
 const v = new T.Vector3(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
 return camera.position.clone().add(v.multiplyScalar(dist / -v.z));
}
function canvasTexture(c, renderer) {
 const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t;
}

// White where the face is varnished (its gloss regions: the art), black on the paper.
function glossMask(face, faceH) {
 const c = document.createElement('canvas'), w = 512, h = Math.round(512 * faceH / CARD.w); c.width = w; c.height = h;
 const x = c.getContext('2d'), s = w / CARD.w; x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
 x.fillStyle = '#fff'; for (const r of face.regions.gloss || []) x.fillRect(r.x * s, (r.y + (face.head || 0)) * s, r.w * s, r.h * s);
 const t = new T.CanvasTexture(c); t.colorSpace = T.NoColorSpace; return t;
}

// Paper tooth: a tiling bump map from layered value noise, stretched slightly along the grain like machine-made stock.
let tooth = null;
function toothMap() {
 if (tooth) return tooth;
 const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), img = x.createImageData(n, n);
 const hgt = new Float32Array(n * n); let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
 for (const [cell, amp] of [[32, 0.5], [16, 0.3], [6, 0.2]]) {
  const g = n / cell, grid = Array.from({length: g * g}, rnd);
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
   const fx = i / cell, fy = y / cell * 0.6, x0 = Math.floor(fx) % g, y0 = Math.floor(fy) % g, x1 = (x0 + 1) % g, y1 = (y0 + 1) % g, tx = fx % 1, ty = fy % 1;
   const v = (grid[y0 * g + x0] * (1 - tx) + grid[y0 * g + x1] * tx) * (1 - ty) + (grid[y1 * g + x0] * (1 - tx) + grid[y1 * g + x1] * tx) * ty;
   hgt[y * n + i] += v * amp;
  }
 }
 let lo = Infinity, hi = -Infinity; for (const v of hgt) { if (v < lo) lo = v; if (v > hi) hi = v; }
 for (let p = 0; p < n * n; p++) { const v = (hgt[p] - lo) / (hi - lo) * 255, o = p * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = v; img.data[o + 3] = 255; }
 x.putImageData(img, 0, 0);
 tooth = new T.CanvasTexture(c); tooth.wrapS = tooth.wrapT = T.RepeatWrapping; tooth.colorSpace = T.NoColorSpace;
 return tooth;
}

// A small room for reflections: warm walls, a bright window to one side (the highlight that sweeps the varnish), a
// darker floor. Prefiltered for each held card's renderer.
function paperRoom(renderer) {
 const s = new T.Scene();
 const walls = new T.Mesh(new T.SphereGeometry(500, 32, 16), new T.MeshBasicMaterial({side: T.BackSide, vertexColors: true}));
 const col = [], pos = walls.geometry.attributes.position;
 for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 500, c = new T.Color('#6f6a60').lerp(new T.Color('#e9e3d6'), (y + 1) / 2); col.push(c.r, c.g, c.b); }
 walls.geometry.setAttribute('color', new T.Float32BufferAttribute(col, 3)); s.add(walls);
 const win = new T.Mesh(new T.PlaneGeometry(260, 160), new T.MeshBasicMaterial({color: new T.Color(6, 5.8, 5.4)}));
 win.position.set(-220, 160, 260); win.lookAt(0, 0, 0); s.add(win);
 const strip = new T.Mesh(new T.PlaneGeometry(40, 300), new T.MeshBasicMaterial({color: new T.Color(2.4, 2.4, 2.5)}));
 strip.position.set(300, 40, 180); strip.lookAt(0, 0, 0); s.add(strip);
 const pm = new T.PMREMGenerator(renderer), room = pm.fromScene(s, 0.02).texture; pm.dispose();
 return room;
}
