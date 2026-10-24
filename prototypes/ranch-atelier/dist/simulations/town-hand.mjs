// The POI browser in the town (Evan, 2026-10-24 00:51Z: the 3D cards along the bottom "represent POIs, not placeable terrain
// tiles ... replace that bottom-card strip with a simple left/right POI browser"). One small pill in the HUD's bottom slot
// (town-hud.mjs, #aw-hand, beside the Paint the World card): previous and next arrows around the current place's picture and
// name. The arrows only change which place is shown; tapping the picture or name goes there and the camera flies to that hex.
// The name is also read out to screen readers as it changes. The tiles of the world-expansion design are not here.
//   mountTownHand({board: AbbieTown.board, visit: id => AbbieTown.visit('dio-' + id), stage: AbbieTown.stage})
// Presentation layer only: drawn for the player and invisible to every perception.
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

const CSS = `#aw-poi{display:flex;align-items:center;gap:4px;padding:4px;border-radius:26px;background:linear-gradient(160deg,#ffffffd2,#ffffff66 60%,#ffffff90);border:1px solid #ffffffd8;box-shadow:inset 0 1.5px 0 #fff,0 10px 22px -10px #0c203080;color:#2b1d0e;font:700 13px/1.1 var(--app-font,system-ui)}
#aw-poi button{all:unset;box-sizing:border-box;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#aw-poi .poi-step{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#ffffffa0;box-shadow:inset 0 1px 0 #fff,0 1px 4px #2a201440}
#aw-poi .poi-step svg{width:20px;height:20px}
#aw-poi .poi-go{display:flex;align-items:center;gap:8px;min-width:0;max-width:200px;height:44px;padding:0 12px 0 4px;border-radius:22px}
#aw-poi .poi-go img{width:40px;height:40px;object-fit:contain;flex:none;border-radius:50%;background:#fff6}
#aw-poi .poi-go span{display:grid;gap:2px;min-width:0}#aw-poi .poi-go b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#aw-poi .poi-go small{font-weight:600;opacity:.65;font-size:10px;letter-spacing:.06em;text-transform:uppercase}
#aw-poi .poi-step:active,#aw-poi .poi-go:active{transform:scale(.95)}
#aw-poi button:focus-visible{outline:2px solid var(--v2-accent,#b64932);outline-offset:2px}
@media(max-width:520px){#aw-poi .poi-go{max-width:150px}}
@media(prefers-reduced-motion:reduce){#aw-poi *{transition:none!important}}`;

// The real tile, from above: the hex's own 3D model rendered once through a small orthographic camera into a corner of the
// town's canvas, on a flat key colour that is cut out afterwards, so the card's art is the tile itself (Evan, 23:59Z: "the
// main hex tiles need to come back"). Runs inside the stage's frame loop so the canvas is still readable.
const KEY = [255, 0, 255];
function captureHex(stage, id, size = 460) {
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

const ARROW = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

export function mountTownHand({board, visit, stage} = {}) {
  const hexes = board?.hexes || [];
  if (!hexes.length || document.getElementById('aw-poi')) return null;
  document.head.append(Object.assign(document.createElement('style'), {textContent: CSS}));
  const el = (tag, props = {}, html = '') => Object.assign(document.createElement(tag), props, html ? {innerHTML: html} : {});
  const row = el('div', {id: 'aw-poi'}); row.dataset.layer = 'presentation'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Places');
  const prev = el('button', {type: 'button', className: 'poi-step', title: 'Previous place'}, ARROW('M14.5 5l-7 7 7 7')), next = el('button', {type: 'button', className: 'poi-step', title: 'Next place'}, ARROW('M9.5 5l7 7-7 7'));
  prev.setAttribute('aria-label', 'Previous place'); next.setAttribute('aria-label', 'Next place');
  const go = el('button', {type: 'button', className: 'poi-go'}, '<img alt="" draggable="false"><span><small>Go to</small><b></b></span>');
  const live = el('span'); live.setAttribute('aria-live', 'polite'); Object.assign(live.style, {position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)'});
  row.append(prev, go, next, live);
  const hand = window.AWHud?.hand || document.body; hand.prepend(row);
  const n = hexes.length, shots = new Map();
  let at = 0;
  const show = () => {
    const h = hexes[at]; go.dataset.hex = h.id; go.title = go.ariaLabel = 'Go to ' + h.name;
    go.querySelector('b').textContent = h.name; go.querySelector('img').src = shots.get(h.id) || art(h, at + 1); live.textContent = h.name;
  };
  const step = d => { at = (at + d + n) % n; show(); };
  prev.onclick = () => step(-1); next.onclick = () => step(1);
  go.onclick = () => visit?.(hexes[at].id);
  // Shift plus the left or right arrow browses too, unless she is typing or a game has the keyboard.
  addEventListener('keydown', e => {
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.metaKey || e.ctrlKey || e.altKey || window.AWKeysTaken || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable) return;
    if (!e.shiftKey) return; step(e.key === 'ArrowLeft' ? -1 : 1);
  });
  show();
  // Then the real tile: once the board is up, each place's picture is swapped for its hex rendered from the 3D model.
  if (stage?.frame) {
    let frames = 0, tries = 0, look = null;
    import('./world-look.mjs').then(m => { look = m; }).catch(() => {});
    const off = stage.frame(() => {
      if (!stage.dioGroup.visible || ++frames < 12) return; frames = 0;
      let ink = null; try { if (look && !window.worldLook) ink = look.worldLook(stage.THREE, {scene: stage.scene, renderer: stage.renderer, initial: 'comic-ink'}); } catch (e) { console.warn('Hex ink', e); }
      for (const h of hexes) if (!shots.has(h.id)) { const url = captureHex(stage, h.id, 220); if (url) shots.set(h.id, url); }
      try { ink?.dispose(); } catch {}
      show();
      if (shots.size >= n || ++tries >= 4) off(); // try again a few times if a hex was not ready
    });
  }
  return {row, get index() { return at; }, step};
}
