// The tile hand in the town (Evan, 2026-10-23 23:39Z: "put back the cards on the bottom"). One Cards v3 card for each hex of
// the Winchester board, dealt along the bottom in the HUD's hand (town-hud.mjs, #aw-hand), beside the Paint the World card.
// Tiles create the world, so these are the board's tiles as cards. Tap one and the camera flies to that hex. The Tile pull
// thread owns what a tap grows into (the pulled blank, the 3D hex customizer): this file fires a cancelable
// 'aw-tile-card' {id, hex} first; if a listener calls preventDefault() it takes over, else the tap visits the hex.
//   mountTownHand({board: AbbieTown.board, visit: id => AbbieTown.visit('dio-' + id)})
// Presentation layer only: the cards are drawn for the player and are invisible to every perception.
import {renderFace} from '../cards/v3/face.mjs';

export const ZONES = {
  'downtown': {body: '#a8603a', deep: '#7c3f22', earth: '#c4680f', grass: '#86a14f', air: '#ecd9bf'},
  'anis-side': {body: '#3d8f93', deep: '#2b6568', earth: '#5d6b4a', grass: '#8bb86a', air: '#dcebf0'},
  'abbie-daddy-side': {body: '#c0609a', deep: '#8e3d70', earth: '#7a4a3a', grass: '#d98a45', air: '#f6d9c8'}};
const INK = '#2b2a26';
const SHORT = {neighbourhood: 'Neighbourhood', 'abbie-daddy-side': 'Abbie and Daddy', 'depot-river': 'Depot and River'}; // the name must fit the ribbon
const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// A hex of that zone from above: grass, a lane, a few houses and trees. Drawn from the hex's number, so each card is its own.
function art(h, k) {
  const z = ZONES[h.zone] || ZONES.downtown, r = rnd(k * 977 + 13), cx = 200, cy = 232, R = 132;
  const pts = Array.from({length: 6}, (_, i) => [cx + Math.cos(i * Math.PI / 3 + Math.PI / 6) * R, cy + Math.sin(i * Math.PI / 3 + Math.PI / 6) * R * .72]);
  const hex = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';
  let body = `<path d="${hex}" fill="${z.earth}" transform="translate(0 16)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="${hex}" fill="${z.grass}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  body += `<path d="M${cx - 110} ${cy + 30}Q${cx - 30} ${cy - 40} ${cx + 20} ${cy + 6}T${cx + 118} ${cy - 22}" fill="none" stroke="#f3eee2" stroke-width="16" stroke-linecap="round"/><path d="M${cx - 110} ${cy + 30}Q${cx - 30} ${cy - 40} ${cx + 20} ${cy + 6}T${cx + 118} ${cy - 22}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) {
    const x = cx - 80 + r() * 160, y = cy - 40 + r() * 90, w = 26 + r() * 14, roof = ['#b9533a', '#6f8f3c', '#3d8f93', '#e0a63c'][Math.floor(r() * 4)];
    body += i % 2 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(12 + r() * 8).toFixed(0)}" fill="#3f8a4a" stroke="${INK}" stroke-width="5"/>`
      : `<rect x="${x.toFixed(0)}" y="${(y - w * .5).toFixed(0)}" width="${w.toFixed(0)}" height="${(w * .7).toFixed(0)}" fill="#f3eee2" stroke="${INK}" stroke-width="5"/><path d="M${(x - 4).toFixed(0)} ${(y - w * .5).toFixed(0)}l${(w / 2 + 4).toFixed(0)} -${(w * .45).toFixed(0)} ${(w / 2 + 4).toFixed(0)} ${(w * .45).toFixed(0)}z" fill="${roof}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">${body}</svg>`);
}

const CSS = `#aw-hand .aw-tile-card{all:unset;box-sizing:border-box;cursor:pointer;flex:none;width:var(--tc-w,70px);margin:0 calc(var(--tc-w,70px) * -.08);transform:translateY(0) rotate(var(--fan,0deg));transform-origin:50% 120%;transition:transform .18s cubic-bezier(.2,1.4,.4,1);-webkit-tap-highlight-color:transparent;filter:drop-shadow(0 4px 7px #0004)}
#aw-hand .aw-tile-card img{display:block;width:100%;pointer-events:none}
#aw-hand .aw-tile-card:hover,#aw-hand .aw-tile-card:focus-visible{transform:translateY(-14px) rotate(0) scale(1.12);z-index:3;outline:none}
#aw-hand .aw-tile-card:focus-visible{filter:drop-shadow(0 0 0 #fff) drop-shadow(0 0 6px #ffd23f)}
#aw-hand .aw-tile-cards{display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
#aw-hand .aw-tile-cards>*{pointer-events:auto}
@media(max-width:520px){#aw-hand{--tc-w:46px}}
@media(prefers-reduced-motion:reduce){#aw-hand .aw-tile-card{transition:none}}`;

// The real tile, from above: the hex's own 3D model rendered once through a small orthographic camera into a corner of the
// town's canvas, on a flat key colour that is cut out afterwards, so the card's art is the tile itself (Evan, 23:59Z: "the
// main hex tiles need to come back"). Runs inside the stage's frame loop so the canvas is still readable.
const KEY = [255, 0, 255];
function captureHex(stage, id, size = 320) {
  const {THREE: T, scene, renderer, dioGroup, tiles} = stage, tile = tiles[id]; if (!tile) return null;
  const cam = new T.OrthographicCamera(-122, 122, 122, -122, 1, 3000), az = 205 * Math.PI / 180, pitch = 52 * Math.PI / 180, c = tile.centre;
  cam.position.set(c.x + Math.sin(az) * Math.cos(pitch) * 700, c.y + Math.sin(pitch) * 700, c.z - Math.cos(az) * Math.cos(pitch) * 700); cam.lookAt(c.x, c.y - 6, c.z); cam.updateMatrixWorld();
  const hidden = [];
  const hide = o => { if (o.visible) { o.visible = false; hidden.push(o); } };
  for (const o of scene.children) if (o !== dioGroup && !o.isLight && !o.isCamera && !(o.target)) hide(o);
  for (const t of Object.values(tiles)) if (t !== tile) hide(t.group);
  const bg = scene.background, fog = scene.fog, ex = renderer.toneMappingExposure, cc = renderer.getClearColor(new T.Color()), ca = renderer.getClearAlpha(), vp = renderer.getViewport(new T.Vector4()), st = renderer.getScissorTest(), pr = renderer.getPixelRatio();
  let out = null;
  try {
    scene.background = null; scene.fog = null; renderer.toneMappingExposure = 1.05;
    renderer.setScissorTest(true); renderer.setViewport(0, 0, size, size); renderer.setScissor(0, 0, size, size); renderer.setClearColor(0xff00ff, 1); renderer.clear(); renderer.render(scene, cam);
    const src = renderer.domElement, d = Math.round(size * pr), cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d', {willReadFrequently: true}); x.drawImage(src, 0, src.height - d, d, d, 0, 0, size, size);
    const im = x.getImageData(0, 0, size, size), p = im.data; let solid = 0;
    for (let i = 0; i < p.length; i += 4) {
      const dist = Math.hypot(p[i] - KEY[0], p[i + 1] - KEY[1], p[i + 2] - KEY[2]), a = Math.max(0, Math.min(1, (dist - 40) / 90));
      if (a === 0) { p[i + 3] = 0; continue; }
      if (a < 1) for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, (p[i + k] - KEY[k] * (1 - a)) / a));
      p[i + 3] = Math.round(a * 255); solid++;
    }
    x.putImageData(im, 0, 0); if (solid > size * size * .08) out = cv.toDataURL('image/png');
  } catch (e) { console.warn('Hex capture', e); }
  scene.background = bg; scene.fog = fog; renderer.toneMappingExposure = ex; renderer.setClearColor(cc, ca); renderer.setViewport(vp); renderer.setScissorTest(st);
  for (const o of hidden) o.visible = true;
  return out;
}

function deal(b, h, k, artUrl) {
  renderFace({id: 'town-' + h.id, name: SHORT[h.id] || h.name, art: artUrl, edition: k + 1, set: 7, palette: ZONES[h.zone]}, {style: 'diecut', dpi: 110})
    .then(({canvas}) => { let img = b.querySelector('img'); if (!img) { img = new Image(); img.alt = ''; img.draggable = false; b.append(img); } img.src = canvas.toDataURL('image/png'); }).catch(() => { if (!b.firstChild) b.textContent = h.n; });
}

export function mountTownHand({board, visit, stage} = {}) {
  const hexes = board?.hexes || [];
  if (!hexes.length || document.getElementById('aw-tile-cards')) return null;
  document.head.append(Object.assign(document.createElement('style'), {textContent: CSS}));
  const row = document.createElement('div'); row.id = 'aw-tile-cards'; row.className = 'aw-tile-cards'; row.dataset.layer = 'presentation'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Tiles');
  const hand = window.AWHud?.hand || document.body; hand.prepend(row);
  const n = hexes.length;
  hexes.forEach((h, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'aw-tile-card'; b.dataset.hex = h.id; b.setAttribute('aria-label', 'Tile: ' + h.name);
    b.style.setProperty('--fan', ((k - (n - 1) / 2) * 2).toFixed(1) + 'deg'); b.title = h.name;
    b.onclick = () => { if (dispatchEvent(new CustomEvent('aw-tile-card', {cancelable: true, detail: {id: h.id, hex: h}}))) visit?.(h.id); };
    row.append(b);
    deal(b, h, k, art(h, k + 1));
  });
  // Then the real tiles: once the board is up, each card's art is swapped for its hex rendered from the 3D model.
  if (stage?.frame) {
    let frames = 0, tries = 0, look = null, pending = new Set(hexes.map(h => h.id));
    import('./world-look.mjs').then(m => { look = m; }).catch(() => {});
    const off = stage.frame(() => {
      if (!stage.dioGroup.visible || ++frames < 12) return; frames = 0;
      // Cartoon, like the sandbox's tile cards: flat bands of light and black ink round everything, for the capture only.
      let ink = null; try { if (look && !window.worldLook) ink = look.worldLook(stage.THREE, {scene: stage.scene, renderer: stage.renderer, initial: 'comic-ink'}); } catch (e) { console.warn('Hex ink', e); }
      // One hex a tick, so a slow GPU (or the CI's software renderer) is never held for seven renders in a single frame.
      const k = hexes.findIndex(h => pending.has(h.id)), h = hexes[k];
      if (h) { const url = captureHex(stage, h.id); if (url) { pending.delete(h.id); deal(row.children[k], h, k, url); } else tries++; }
      try { ink?.dispose(); } catch {}
      if (!pending.size || tries >= 6) off(); // try a hex again a few times if it was not ready
    });
  }
  return {row};
}
