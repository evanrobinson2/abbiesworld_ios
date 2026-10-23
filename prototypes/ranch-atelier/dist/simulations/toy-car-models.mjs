// Toy cars made from free models (Evan, 2026-10-23 23:20Z: "why aren't you using the hotwheels stls that we found? and let
// the user pick which one"). CC0 / CC BY toy-car models from Printables, cleaned by tools/stl-pilot/stl_pipeline.py into
// models/stl-car-<name>/model.glb, are listed in /models/toy-cars.json:
//   {"cars": [{"id": "stl-car-x", "name": "…", "glb": "/models/stl-car-x/model.glb", "credit": "Author, CC BY 4.0, link",
//              "yaw": 0, "colour": "#ff3b5c"}]}
// loadModelCar(T, def) returns the same shape as coaster-cars.mjs buildCar (forward -Z, the track at y = 0, wheels that spin,
// an eye, paint(c), inCar(on)), so the coaster garage and Kart mode can use either kind. Inspired-by models: no brand marks.
import {GLTFLoader} from '/vendor/loaders/GLTFLoader.js';

const LEN = 1.6; // every toy car is scaled to the coaster's car length, in metres
let loader = null;
export async function modelCarList(url = '/models/toy-cars.json') { try { const r = await fetch(url); if (!r.ok) return []; return (await r.json()).cars || []; } catch { return []; } }

export async function loadModelCar(T, def) {
  loader ||= new GLTFLoader();
  const gltf = await loader.loadAsync(def.glb), src = gltf.scene;
  const car = new T.Group(); car.name = def.name || def.id; const body = new T.Group(); body.name = 'model'; car.add(body); body.add(src);
  // lay it along -Z: the longest horizontal side is the length; def.yaw (radians) turns it if the nose points backwards
  let bb = new T.Box3().setFromObject(src), s = bb.getSize(new T.Vector3());
  body.rotation.y = (s.x > s.z ? Math.PI / 2 : 0) + (def.yaw || 0); body.updateMatrixWorld(true);
  bb = new T.Box3().setFromObject(body); s = bb.getSize(new T.Vector3());
  const k = LEN / Math.max(s.z, 1e-3); body.scale.setScalar(k); body.updateMatrixWorld(true);
  bb = new T.Box3().setFromObject(body); const c = bb.getCenter(new T.Vector3());
  body.position.set(-c.x, -bb.min.y, -c.z); body.updateMatrixWorld(true);
  // wheels: objects named "wheel…" get a pivot at their own centre so they can roll
  const wheels = [], paints = [], found = []; src.traverse(o => { if (o.isMesh && /wheel|tyre|tire/i.test(o.name + ' ' + (o.parent?.name || ''))) found.push(o); });
  for (const w of found) { const wb = new T.Box3().setFromObject(w), wc = wb.getCenter(new T.Vector3()), pivot = new T.Group(); pivot.name = 'wheel';
    car.worldToLocal(wc); pivot.position.copy(wc); car.add(pivot); pivot.updateMatrixWorld(true); pivot.attach(w); wheels.push(pivot); }
  src.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (!found.includes(o)) { o.material = o.material.clone(); paints.push(o.material); } } });
  const H = bb.max.y - bb.min.y;
  car.userData.def = {...def, wheelR: wheels.length ? Math.max(.08, new T.Box3().setFromObject(wheels[0]).getSize(new T.Vector3()).y / 2) : .2, eye: [H + .45, .15], model: true};
  car.userData.wheels = wheels; car.userData.eye = new T.Vector3(0, H + .45, .15); // a toy car is too small to sit in: ride on its roof
  car.userData.paint = col => { paints.forEach(m => { m.color?.set(col); }); };
  car.userData.inCar = () => {};
  if (def.colour) car.userData.paint(def.colour);
  return car;
}
