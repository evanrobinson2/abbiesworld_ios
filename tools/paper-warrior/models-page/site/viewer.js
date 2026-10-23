// The model page's 3D view (mountViewer(figure)): the model on a soft shadow, framed from the reference camera, turned with the mouse or a finger.
import * as THREE from 'three';
import {OrbitControls} from '/simulations/vendor/OrbitControls.js';
import {GLTFLoader} from '/simulations/vendor/loaders/GLTFLoader.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail(v, why){
  const m = v.querySelector('.msg');
  m.hidden = false; m.className = 'msg err';
  m.textContent = 'The 3D model could not load (' + why + '). The render beside the overlay shows it from your camera.';
}

export function mountViewer(v){
  const canvas = v.querySelector('canvas'), stage = v.querySelector('.stage'), msg = v.querySelector('.msg');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); } catch(e){ fail(v, 'WebGL is unavailable'); return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8470, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-1.6, 2.6, 2.0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfeeff, 0.8); rim.position.set(2, 1, -2); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({opacity:0.18}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const controls = new OrbitControls(cam, canvas); controls.enableDamping = true; controls.enablePan = false; controls.autoRotateSpeed = 2.2;
  let home = null, dirty = true;
  const size = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true; };
  new ResizeObserver(size).observe(stage);
  const reset = () => { if (!home) return; cam.position.copy(home.pos); controls.target.copy(home.tgt); controls.update(); dirty = true; };
  new GLTFLoader().load(v.dataset.src, g => {
    const obj = g.scene;
    obj.traverse(o => { if (o.isMesh){ o.castShadow = o.receiveShadow = true; if (o.material){ o.material.side = THREE.DoubleSide; o.material.flatShading = true; o.material.needsUpdate = true; } } });
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    obj.position.sub(new THREE.Vector3(c.x, box.min.y, c.z)); scene.add(obj);
    const r = Math.max(s.x, s.y, s.z), th = THREE.MathUtils.degToRad(+v.dataset.theta), ph = THREE.MathUtils.degToRad(+v.dataset.phi), d = r * 2.4;
    const tgt = new THREE.Vector3(0, s.y * 0.45, 0);
    home = {pos:new THREE.Vector3(d * Math.sin(ph) * Math.sin(th), tgt.y + d * Math.cos(ph), d * Math.sin(ph) * Math.cos(th)), tgt};
    Object.assign(key.shadow.camera, {left:-r, bottom:-r, right:r, top:r}); key.shadow.camera.updateProjectionMatrix();
    controls.minDistance = r * 0.8; controls.maxDistance = r * 6;
    reset(); msg.hidden = true; size();
  }, undefined, () => fail(v, 'the model file did not load'));
  v.querySelector('.reset').addEventListener('click', reset);
  const spin = v.querySelector('.spin');
  if (reduce) spin.hidden = true;
  spin.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; spin.setAttribute('aria-pressed', String(controls.autoRotate)); });
  controls.addEventListener('change', () => { dirty = true; });
  let visible = true; new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
  (function loop(){ requestAnimationFrame(loop); if (!visible) return; if (controls.update() || controls.autoRotate) dirty = true; if (dirty){ renderer.render(scene, cam); dirty = false; } })();
}
