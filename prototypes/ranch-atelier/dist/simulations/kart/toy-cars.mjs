// Kart mode, real toy cars (Evan, 23:20Z: "use the hotwheels STLs and let the user pick which one"). The coaster thread's CC0 / CC BY
// model cars (toy-car-models.mjs, listed in /models/toy-cars.json) replace the Effect Hunt's placeholder toy car. The 'coaster' vehicle
// builds whichever car is picked ('aw-toy-car' in this browser, or the next one each time you climb back in), with Abbie on the roof,
// since a toy car is too small to sit in. Credits ride along in the model list. Inspired-by models: no brand marks.
import * as T from 'three';
import {registerVehicle} from '../effect-hunt/vehicles.mjs';

const KEY = 'aw-toy-car';
const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .7, flatShading: true, ...o});
function abbieOnRoof() { // a small rider: pink jacket, pink helmet, orange backpack with a gold charm
  const g = new T.Group(); g.name = 'rider-abbie';
  const m = (geo, c, x, y, z, name) => { const o = new T.Mesh(geo, mat(c)); o.name = name; o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  m(new T.BoxGeometry(.3, .34, .2), '#ff7eb6', 0, .2, 0, 'jacket pink'); m(new T.IcosahedronGeometry(.14, 1), '#f2c8a8', 0, .5, 0, 'head skin');
  m(new T.SphereGeometry(.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * .58), '#ff4f9c', 0, .52, 0, 'helmet pink'); m(new T.BoxGeometry(.26, .3, .1), '#ffb347', 0, .22, -.17, 'backpack orange');
  m(new T.IcosahedronGeometry(.04, 0), '#ffe066', .1, .06, -.22, 'charm gold');
  for (const s of [-1, 1]) m(new T.CylinderGeometry(.05, .05, .3, 6), '#3d5a9e', s * .08, -.05, .1, 'leg denim').rotation.x = 1.3;
  return g;
}
let cars = [], loaded = false, round = 0;
export async function registerToyCars() {
  try {
    const TM = await import('../toy-car-models.mjs'), list = await TM.modelCarList();
    cars = (await Promise.all(list.map(async def => { try { return {def, car: await TM.loadModelCar(T, def)}; } catch { return null; } }))).filter(Boolean);
  } catch { cars = []; }
  loaded = cars.length > 0; if (!loaded) return false;
  registerVehicle('coaster', {name: 'Toy car', icon: '🏎️', jetpack: false, build() { // the next car each time you climb in, unless one is picked
    let i = Number(localStorage.getItem(KEY)); if (!Number.isInteger(i) || i < 0 || i >= cars.length) i = round++ % cars.length;
    const {def, car} = cars[i], g = new T.Group(); g.name = 'toy-car-' + def.id; g.scale.setScalar(1.9); const turn = new T.Group(); turn.rotation.y = Math.PI; turn.add(car); g.add(turn); // the hunt faces +Z, the model faces -Z
    const roof = (car.userData.eye?.y ?? 1) - .3, rider = abbieOnRoof(); rider.position.set(0, roof, -.05); rider.scale.setScalar(.9); g.add(rider);
    return {group: g, parts: {riders: [rider], wheels: car.userData.wheels || [], flames: [], jet: new T.Group()}, seats: [new T.Vector3(0, roof, -.05)], wheels: car.userData.wheels || [], name: def.name, size: 1.3, credit: def.credit};
  }});
  return true;
}
export const pickToyCar = i => { try { localStorage.setItem(KEY, String(i)); } catch {} };
export const toyCarList = () => cars.map(c => c.def);

// A small round button, only while you are in a toy car: tap for the next one (Racer, Camper bus, Roll-cage buggy, Truck cab...). No words.
export function mountCarPicker({hunt, doc = document, host = doc.body}) {
  const b = doc.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Next toy car'); b.textContent = '🏎️';
  b.style.cssText = 'position:fixed;left:14px;bottom:96px;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.55);background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.55),rgba(255,160,210,.28));box-shadow:0 6px 16px rgba(60,20,80,.28),inset 0 1px 2px rgba(255,255,255,.7);font-size:22px;display:none;z-index:30;cursor:pointer;touch-action:manipulation';
  b.onclick = () => { if (!cars.length) return; let i = Number(localStorage.getItem(KEY)); i = Number.isInteger(i) && i >= 0 ? i : 0; pickToyCar((i + 1) % cars.length); hunt.refreshVehicle(); };
  host.appendChild(b);
  const t = setInterval(() => { b.style.display = cars.length > 1 && hunt.mode !== 'god' && hunt.vehicleRoot.children[0]?.name?.startsWith('toy-car-') ? 'block' : 'none'; }, 400);
  return () => { clearInterval(t); b.remove(); };
}
