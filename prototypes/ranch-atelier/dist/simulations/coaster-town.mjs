// AW-STUDY-0054: the toy-car coaster, standing in Winchester. The town calls place(window.AbbieTown) once its stage is up;
// this builds the same coaster (the same recipe as the ride) as a small model on the skate-park pad on Main Street beside the café,
// so anyone in the town can see it. Tap it: the town camera flies down onto the skate park, the light flashes and the
// ride opens already zoomed in on the track (?skip=tile), with ?from= bringing the player back to this spot.
// It only adds to the world layer: the coaster is an in-fiction thing that characters can see too.
import {buildTrack, TRACK_30S, trackMeshes, makeCar} from './coaster-kit.mjs';

const GATE = 'town:skate-park', SCALE = .26;
let placed = null;

export function place(AT) {
  if (placed || !AT?.stage) return placed;
  const {THREE: T, tiles, renderer, camera} = AT.stage, t = tiles.downtown, sp = t?.spots?.skatepark;
  if (!sp) return null;
  const root = new T.Group(); root.name = 'toy-car coaster (town model)';
  const inner = new T.Group(); inner.scale.setScalar(SCALE); inner.rotation.y = Math.PI / 2; root.add(inner);
  const trk = buildTrack(T, TRACK_30S), track = trackMeshes(T, trk), car = makeCar(T);
  inner.add(track);
  const p0 = trk.S[0]; car.position.copy(p0.p); car.quaternion.copy(p0.q); inner.add(car);
  const tower = new T.Mesh(new T.BoxGeometry(5.4, .4, 10.8), new T.MeshStandardMaterial({color: '#ffcf3a', roughness: .5, name: 'tower platform'}));
  tower.position.set(p0.p.x, p0.p.y - .55, p0.p.z - 1.8); inner.add(tower);
  // centre the footprint on the pad (the pad is 32 x 24 m along its own x and z) and stand it on the slab
  const bb = new T.Box3().setFromObject(root), c = bb.getCenter(new T.Vector3());
  inner.position.set(-c.x, -bb.min.y, -c.z);
  root.position.set(sp.x, (sp.y || 0) + .42, sp.z); root.rotation.y = sp.facing || 0;
  // the track is slim from the town camera, so a box around the whole model is what a tap hits
  const sz = bb.getSize(new T.Vector3()), hit = new T.Mesh(new T.BoxGeometry(sz.x, sz.y, sz.z), new T.MeshBasicMaterial({visible: false}));
  hit.name = 'tap area'; hit.position.y = sz.y / 2; root.add(hit);
  root.traverse(o => { if (o.isMesh && o !== hit) { o.castShadow = true; o.receiveShadow = true; o.userData.link = GATE; } });
  t.group.add(root);
  // a gentle life of its own: the booster arrows scroll and the little car rocks on its start line
  const off = AT.stage.frame((dt, time) => { track.userData.padTex.offset.y -= dt * 1.4; car.rotation.z = Math.sin(time * 2) * .02; });
  // tap it: fly down, flash, ride
  const ray = new T.Raycaster(), ndc = new T.Vector2(); let down = null, going = false;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => {
    if (going || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(hit, false)[0]) ride(AT);
  });
  function ride() {
    going = true; const e = AT.entrances?.[GATE]; if (!e) { going = false; return; }
    AT.enterScene?.('skate-park', {dist: 40, pitch: 30, azimuth: 20});
    const flash = document.createElement('div'); flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;transition:opacity .45s ease-in;pointer-events:none;z-index:99';
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = 1; }, 1500);
    setTimeout(() => { location.href = e.url + (e.url.includes('?') ? '&' : '?') + 'skip=tile'; }, 2000);
  }
  placed = {root, car, track, stop: off};
  return placed;
}
