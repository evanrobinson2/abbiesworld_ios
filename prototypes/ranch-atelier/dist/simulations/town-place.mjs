// Tiles create the world, in the town (AW-STUDY-0025 Tile pull and print; coordinator and Evan 2026-10-24: the bottom row is
// playable). A Meadow tile card sits in the bottom hand. Pull it off (the card goes blank), drag it over one of the board's
// open slots, which glow, and let go: the laser prints the tile, then it drops onto the slot, rolls like a die and builds
// itself (tile-reveal.mjs). Placed with AbbieTown.placeTile (hex city's hook). Behind ?exp until it has a scene and a test run.
//   mountTownPlace(AbbieTown)      from town-hud-boot.mjs
// Everything drawn here for the player (glow, ghost card, print window) is presentation layer: invisible to every perception.
// The tile itself is the sandbox's Meadow: ranch-composer.js draws it, then it is scaled from the sandbox's 90 m hex to the
// town's 105 m hex, turned a sixth so its corners face east and west like the town's, and its ground is the town's own ground.
import * as T from 'three';
import {blankCard, refillCard, openPrintWindow, installTilePullStyle} from './tile-pull.mjs?v=7';
import {landTile} from './tile-reveal.mjs?v=2';
import {createImpactEffects, sharedImpactSound, IMPACT_DUST} from './tile-drop-impact.mjs?v=2';

const SAND_R = 9, ROT = Math.PI / 6, DRAG_PX = 8;          // the sandbox hex radius in render units; pointy to flat top
const mk = (tag, cls, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; };
const CSS = `#aw-hand .aw-place-card{all:unset;pointer-events:auto;box-sizing:border-box;position:relative;cursor:grab;flex:none;width:var(--tc-w,70px);margin:0 4px;touch-action:none;-webkit-tap-highlight-color:transparent;filter:drop-shadow(0 4px 7px #0004);transition:transform .18s cubic-bezier(.2,1.4,.4,1)}
#aw-hand .aw-place-card:hover,#aw-hand .aw-place-card:focus-visible{transform:translateY(-12px) scale(1.1);outline:none}
#aw-hand .aw-place-card canvas.v2-face{display:block;width:100%;height:auto}
#aw-hand .aw-place-card .tp-blank{position:absolute;inset:0;width:100%;height:100%}
.aw-place-ghost{position:fixed;z-index:10050;left:0;top:0;width:96px;pointer-events:none;will-change:transform;filter:drop-shadow(0 12px 14px #0006)}
.aw-place-ghost canvas{display:block;width:100%;height:auto}
.aw-place-hint{position:fixed;z-index:10049;left:50%;bottom:calc(env(safe-area-inset-bottom) + 130px);transform:translateX(-50%);padding:8px 14px;border-radius:999px;background:#fffdf6e6;color:#3b2a1c;font:700 14px system-ui,sans-serif;pointer-events:none}
@media(max-width:520px){#aw-hand{--tc-w:36px}#aw-hand .aw-place-card{margin:0 2px}}   /* nine cards must fit the phone's narrow hand */
@media(prefers-reduced-motion:reduce){#aw-hand .aw-place-card{transition:none}}`;

export function mountTownPlace(A) {
  const stage = A?.stage, board = A?.board, hand = window.AWHud?.hand;
  if (!stage || !board?.slots?.length || !hand || document.querySelector('.aw-place-card')) return null;
  document.head.append(Object.assign(mk('style'), {textContent: CSS})); installTilePullStyle();
  const HEX = board.hexSide, K = HEX / SAND_R, KS = K * .1, cos = Math.cos(ROT), sin = Math.sin(ROT);
  const card = mk('button', 'aw-place-card'); card.type = 'button'; card.dataset.generator = 'meadow'; card.dataset.layer = 'presentation';
  card.setAttribute('aria-label', 'Meadow tile: pull it onto a glowing open hex'); card.title = 'Meadow';
  const tiles = document.getElementById('aw-tile-cards'); if (tiles) tiles.after(card); else hand.append(card);
  import('../cards/v3/hand.mjs?v=2').then(m => m.cardFace(card)).catch(e => console.warn('Meadow card', e));

  const isOpen = s => !s.tile && !Object.values(stage.tiles).some(t => t.group && Math.hypot(t.group.position.x - s.x, t.group.position.z + s.y) < 1);
  const ground = (x, y) => board.heightAt(x, y);
  // The glow on each open slot: a hex outline and a faint fill, drawn through the terrain, only while a tile is in hand.
  const glow = new Map(); let glowOn = false, pulse = 0;
  const corners = (s, r) => Array.from({length: 6}, (_, i) => new T.Vector3(s.x + Math.cos(i * Math.PI / 3) * r, ground(s.x, s.y) + 3, -(s.y + Math.sin(i * Math.PI / 3) * r)));
  function showGlow(on) {
    glowOn = on;
    for (const [id, g] of glow) if (!on || !isOpen(board.slots.find(s => s.id === id))) { g.removeFromParent(); glow.delete(id); }
    if (!on) return;
    for (const s of board.slots) if (isOpen(s) && !glow.has(s.id)) {
      const pts = corners(s, HEX), g = new T.Group(); g.userData.presentation = 'slot-glow';
      const line = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({color: '#ffd23f', transparent: true, depthTest: false}));
      const fan = new T.BufferGeometry(), c = new T.Vector3(s.x, pts[0].y, -s.y), v = [];
      for (let i = 0; i < 6; i++) v.push(c.x, c.y, c.z, pts[i].x, pts[i].y, pts[i].z, pts[(i + 1) % 6].x, pts[(i + 1) % 6].y, pts[(i + 1) % 6].z);
      fan.setAttribute('position', new T.Float32BufferAttribute(v, 3));
      const fill = new T.Mesh(fan, new T.MeshBasicMaterial({color: '#ffd23f', transparent: true, opacity: .16, depthTest: false, side: T.DoubleSide}));
      for (const o of [line, fill]) { o.renderOrder = 20; o.raycast = () => {}; o.userData.presentation = 'slot-glow'; g.add(o); }
      g.userData.line = line; g.userData.fill = fill; stage.dioGroup.add(g); glow.set(s.id, g);
    }
  }
  stage.frame((dt) => {
    if (!glowOn) return; pulse += dt;
    for (const [id, g] of glow) { const hot = id === hover?.id, p = .5 + .5 * Math.sin(pulse * 4); g.userData.line.material.opacity = hot ? 1 : .55 + .3 * p; g.userData.fill.material.opacity = hot ? .42 : .12 + .08 * p; }
  });

  // Screen position of a slot's centre and how big its hex looks, for hovering without a raycast.
  const view = new T.Vector3(), edge = new T.Vector3();
  function screenOf(s) {
    const cam = stage.camera, rc = stage.renderer.domElement.getBoundingClientRect(), y = ground(s.x, s.y);
    view.set(s.x, y, -s.y).applyMatrix4(stage.dioGroup.matrixWorld).project(cam); edge.set(s.x + HEX * .8, y, -s.y).applyMatrix4(stage.dioGroup.matrixWorld).project(cam);
    const x = (view.x * .5 + .5) * rc.width + rc.left, yy = (1 - (view.y * .5 + .5)) * rc.height + rc.top;
    return {x, y: yy, r: Math.hypot((edge.x - view.x) * .5 * rc.width, (edge.y - view.y) * .5 * rc.height), front: view.z < 1};
  }
  let hover = null;
  const slotAt = (cx, cy) => { let best = null, bd = 1e9; for (const s of board.slots) { if (!isOpen(s)) continue; const p = screenOf(s), d = Math.hypot(p.x - cx, p.y - cy); if (p.front && d < p.r && d < bd) { best = s; bd = d; } } return best; };

  // Building the Meadow for a slot: the composer's tile, set on the town's own ground.
  let composer = null;
  async function buildMeadow(slot) {
    const [tm, comp, ps] = await Promise.all([import('./tile-metrics.js'), import('./ranch-composer.js?paths=16'), import('./placement-settings.mjs')]);
    tm.setLabHexDiameter(SAND_R * 20); composer ??= await comp.createRanchComposer({variants: false});
    // plan metres to board metres: render units, scaled up, turned the sixth, then north is minus z
    const toBoard = (mx, mz) => { const x0 = mx * KS, z0 = mz * KS; return [slot.x + x0 * cos + z0 * sin, slot.y - (-x0 * sin + z0 * cos)]; };
    const heightAt = (mx, mz) => ground(...toBoard(mx, mz)) / KS, seed = Math.floor(Math.random() * 9000) + 11;
    const tile = {id: 'meadow-' + slot.id, type: 'meadow', center: {x: 0, z: 0}, rotation: 0, seed, placement: ps.placementSettings('meadow')};
    const plan = {id: tile.id, center: {x: 0, z: 0}, seed, rotation: 0, placements: [], paths: [], links: [], dressingCounts: {}, plantedAssets: [], hub: {x: 0, z: 0}};
    const inner = await composer.draw(tile, plan, {landscape: ps.tileLandscape(tile, {height: 0, vegetation: 2, props: 1}), heightAt, managed: false, exposedEdges: []});
    inner.scale.setScalar(K); inner.rotation.y = ROT; inner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const outer = new T.Group(); outer.add(inner);
    return {outer, inner, id: tile.id, floorAt: (x, z) => heightAt(x / .1, z / .1) * .1};
  }
  // A still of the new tile for the print window, drawn on the town's renderer into a target, the world untouched.
  function stillOf(outer, size = 384) {
    const r = stage.renderer, sc = new T.Scene(), cam = new T.PerspectiveCamera(32, 1, 5, 6000), rt = new T.WebGLRenderTarget(size, size, {colorSpace: T.SRGBColorSpace, samples: 4});
    const sun = new T.DirectionalLight('#fff4dc', 2.2); sun.position.set(-300, 500, 250);
    sc.add(new T.HemisphereLight('#ffffff', '#8a7a5a', 1.5), sun, outer);
    const mid = ground(0, 0), d = HEX / Math.tan(16 * Math.PI / 180) * 1.05, el = 48 * Math.PI / 180;
    cam.position.set(Math.sin(.4) * Math.cos(el) * d, mid + Math.sin(el) * d, Math.cos(.4) * Math.cos(el) * d); cam.lookAt(0, mid, 0);
    const prev = r.getRenderTarget(), cc = r.getClearColor(new T.Color()), ca = r.getClearAlpha(), buf = new Uint8Array(size * size * 4);
    r.setClearColor(0x000000, 0); r.setRenderTarget(rt); r.clear(); r.render(sc, cam); r.readRenderTargetPixels(rt, 0, 0, size, size, buf); r.setRenderTarget(prev); r.setClearColor(cc, ca);
    rt.dispose(); outer.removeFromParent();
    const tmp = mk('canvas'); tmp.width = tmp.height = size; tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buf.buffer), size, size), 0, 0);
    const cv = mk('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d'); x.translate(0, size); x.scale(1, -1); x.drawImage(tmp, 0, 0);
    return cv;
  }

  const fx = createImpactEffects(stage.scene, {camera: stage.camera}), sound = sharedImpactSound();
  stage.frame(dt => fx.update(dt));
  let busy = false, drag = null, ghost = null, hint = null;
  const faceCopy = () => { const f = card.querySelector('.v2-face'), c = mk('canvas'); if (f) { c.width = f.width; c.height = f.height; c.getContext('2d').drawImage(f, 0, 0); } return c; };

  async function place(slot, from) {
    busy = true; const win = openPrintWindow({name: 'Meadow', at: from, still: faceCopy()});
    try {
      const built = await buildMeadow(slot), still = stillOf(built.outer);
      await win.reveal({reveal: t => { still.style.clipPath = `inset(${((1 - t) * 100).toFixed(1)}% 0 0 0)`; }}, still, 900);
      await win.stamp();
      const placed = A.placeTile(slot.id, {id: built.id, name: 'Meadow', zone: 'board', group: built.outer});
      if (!placed) { win.fail('That hex is taken'); built.outer.removeFromParent(); return; }
      win.close(card); showGlow(false);
      const where = new T.Vector3(slot.x, ground(slot.x, slot.y), -slot.y).applyMatrix4(stage.dioGroup.matrixWorld);
      const [dust, soil] = IMPACT_DUST.meadow, landing = landTile(built.inner, {floorAt: built.floorAt, onImpact: ({radius}) => { sound.play(0, 1); fx.burst({position: where, radius, groundAt: () => where.y, dust, soil}); }});
      const off = stage.frame(dt => { landing.update(dt); if (landing.done) off(); });
      window.dispatchEvent(new CustomEvent('aw-tile-placed', {detail: {id: built.id, slot: slot.id}}));
    } catch (e) { console.warn('Meadow tile', e); win.fail('Could not print it'); }
    finally { busy = false; refillCard(card); }
  }

  function beginDrag(e) {
    blankCard(card, true); showGlow(true);
    ghost = mk('div', 'aw-place-ghost'); const c = faceCopy(); ghost.append(c); document.body.append(ghost);
    if (![...board.slots].some(s => isOpen(s) && screenOf(s).front && Math.abs(screenOf(s).x) < innerWidth * 2 && screenOf(s).y > -200 && screenOf(s).y < innerHeight)) { try { const cam = stage.camera, fit = 520 / (Math.tan(cam.fov * Math.PI / 360) * Math.min(1.4, cam.aspect)); stage.flyTo?.(new T.Vector3(0, 0, 0).applyMatrix4(stage.dioGroup.matrixWorld), {dist: Math.max(HEX * 7, Math.min(3000, fit)), pitch: 58}); } catch { /* the player keeps their view */ } }
    hint = mk('div', 'aw-place-hint'); hint.textContent = 'Drop it on a glowing hex'; document.body.append(hint);
    moveDrag(e);
  }
  function moveDrag(e) {
    ghost.style.transform = `translate(${e.clientX - 48}px,${e.clientY - 60}px) rotate(${Math.max(-12, Math.min(12, (e.clientX - drag.x) * .06))}deg)`;
    const s = slotAt(e.clientX, e.clientY); if (s?.id !== hover?.id) { hover = s; hint.textContent = s ? 'Let go to print it here' : 'Drop it on a glowing hex'; }
  }
  function endDrag(e, cancel) {
    const s = cancel ? null : slotAt(e.clientX, e.clientY), from = ghost.getBoundingClientRect();
    ghost.remove(); hint.remove(); ghost = hint = null; hover = null; drag = null;
    if (!s) { showGlow(false); blankCard(card, false); refillCard(card); return; }
    place(s, {left: from.left, top: from.top, width: from.width, height: from.height});
  }
  card.addEventListener('pointerdown', e => { if (busy || e.button > 0) return; drag = {x: e.clientX, y: e.clientY, live: false, id: e.pointerId}; card.setPointerCapture(e.pointerId); });
  card.addEventListener('pointermove', e => { if (!drag) return; if (!drag.live) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_PX) return; drag.live = true; beginDrag(e); } else moveDrag(e); });
  card.addEventListener('pointerup', e => { if (!drag) return; if (drag.live) endDrag(e, false); else drag = null; });
  card.addEventListener('pointercancel', e => { if (drag?.live) endDrag(e, true); else drag = null; });
  const api = {card, place, buildMeadow, slotAt, screenOf}; A.tilePlace = api;   // for tests and for the next card types
  return api;
}
