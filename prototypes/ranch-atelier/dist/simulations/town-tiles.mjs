// The town's tile cards, made real (AW-STUDY-0025 Tile pull and print; Evan 2026-10-23: "a beautiful card designer card
// designed here ... leveraging those beautiful 3d hexes"). Presentation layer only.
// inspectHex(hex): tap a Winchester card and the card flips into the designer with that hex live in 3D, turning slowly
//     and draggable. Inspect only: Winchester's contents belong to the hex city thread, so there is no Accept here.
// Nothing is added to the scene. A separate camera renders into a render target, and the player's view is untouched.
import * as T from 'three';
import {openCustomizer, installTilePullStyle} from './tile-pull.mjs?v=7';
import {ZONES} from './town-hand.mjs?v=4';

const R3 = Math.sqrt(3), EL = 48 * Math.PI / 180, FOV = 32;
const T_ = () => window.AbbieTown;
const centreOf = hex => { const s = T_()?.scenes?.['dio-' + hex.id]; return s?.world || null; };
const corners = (c, R) => Array.from({length: 6}, (_, i) => new T.Vector3(c.x + Math.cos(i * Math.PI / 3) * R, c.y, c.z - Math.sin(i * Math.PI / 3) * R));   // flat-top, corners east and west

// One shared target and camera. render(hex, yaw, size) -> a canvas with the hex cut out and the rest transparent.
let rt = null, cam = null, buf = null;
function shoot(hex, yaw, size, out) {
  const A = T_(), c = centreOf(hex); if (!A?.renderer || !A.scene || !c) return null;
  const R = A.board.hexSide, r = A.renderer;
  if (!rt || rt.width !== size) { rt?.dispose(); rt = new T.WebGLRenderTarget(size, size, {colorSpace: T.SRGBColorSpace, samples: 4}); buf = new Uint8Array(size * size * 4); }
  cam ||= new T.PerspectiveCamera(FOV, 1, 5, 6000);
  const d = R / Math.tan(FOV * Math.PI / 360) * 1.04;
  cam.position.set(c.x + Math.sin(yaw) * Math.cos(EL) * d, c.y + Math.sin(EL) * d, c.z + Math.cos(yaw) * Math.cos(EL) * d); cam.lookAt(c.x, c.y + 4, c.z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const prev = r.getRenderTarget(), hidden = [];
  A.scene.traverse(o => { if (o.userData?.presentation && o.visible) { o.visible = false; hidden.push(o); } });   // the player's overlays stay out of the hex's face
  r.setRenderTarget(rt); r.render(A.scene, cam); r.readRenderTargetPixels(rt, 0, 0, size, size, buf); r.setRenderTarget(prev);
  for (const o of hidden) o.visible = true;
  const img = new ImageData(new Uint8ClampedArray(buf.buffer.slice(0)), size, size), tmp = shoot.tmp ||= document.createElement('canvas'); tmp.width = tmp.height = size; tmp.getContext('2d').putImageData(img, 0, 0);
  const cv = out || document.createElement('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d'); x.clearRect(0, 0, size, size);
  x.save(); x.beginPath(); corners(c, R).forEach((p, i) => { p.project(cam); const px = (p.x * .5 + .5) * size, py = (1 - (p.y * .5 + .5)) * size; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.clip();
  x.translate(0, size); x.scale(1, -1); x.drawImage(tmp, 0, 0); x.restore();
  return cv;
}

// The designer, opened out of the hex's card. hero = the card's button in the hand.
export function inspectHex(hex, hero) {
  installTilePullStyle(); const cv = document.createElement('canvas'), SIZE = 384;
  let yaw = Math.PI * .08, drag = null, alive = true, last = 0;
  const frame = now => {
    if (!alive) return; requestAnimationFrame(frame);
    if (now - last < 40) return; const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!drag && !matchMedia('(prefers-reduced-motion: reduce)').matches) yaw += dt * .22;
    try { shoot(hex, yaw, SIZE, cv); } catch { /* the town is busy; try the next frame */ }
  };
  cv.style.touchAction = 'none';
  cv.onpointerdown = e => { drag = {x: e.clientX, yaw}; cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = e => { if (drag) yaw = drag.yaw - (e.clientX - drag.x) * .012; };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; };
  shoot(hex, yaw, SIZE, cv);
  const card = openCustomizer({hero, place: 'ranch', palette: {...ZONES[hex.zone], no: hex.n}, total: 7, name: hex.name, preview: null, canvas: cv, facets: [], facet: null, axesFor: () => [], values: {}, inspect: true,
    onClose: () => { alive = false; }, onPrint: () => { alive = false; }});
  requestAnimationFrame(frame);
  return card;
}

// Hook the hand: real faces on the cards, and a tap opens the designer. Winchester's own hexes are inspected, not edited.
export function mountTownTiles() {
  addEventListener('aw-tile-card', e => {
    const hero = document.querySelector(`.aw-tile-card[data-hex="${e.detail.id}"]`);
    e.preventDefault(); inspectHex(e.detail.hex, hero);
  });
}
