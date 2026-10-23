// The viewer's 3D stage: one model on a soft shadow, framed from its reference camera, orbit and zoom by hand.
// Unlike /models/viewer.js it returns a dispose(), because the viewer steps between models and must not pile up WebGL contexts.
import * as THREE from 'three';
import {OrbitControls} from '/simulations/vendor/OrbitControls.js';
import {GLTFLoader} from '/simulations/vendor/loaders/GLTFLoader.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = new GLTFLoader();

export function mountStage(host, {src, orbit = [30, 70]}){
  const canvas = host.querySelector('canvas'), spinner = host.querySelector('.spinner'), hint = host.querySelector('.hint');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: true}); }
  catch { spinner.innerHTML = '<p>3D needs WebGL</p>'; return {dispose(){}}; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.01, 60);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8470, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-1.6, 2.6, 2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfeeff, 0.8); rim.position.set(2, 1, -2); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({opacity: 0.18}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const controls = new OrbitControls(cam, canvas);
  controls.enableDamping = true; controls.enablePan = false; controls.autoRotateSpeed = 1.6; controls.autoRotate = !reduce;
  let home = null, dirty = true, alive = true, mixer = null, model = null, intro = 0;
  const clock = new THREE.Clock();
  const size = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true; };
  const ro = new ResizeObserver(size); ro.observe(host);
  const reset = () => { if (!home) return; cam.position.copy(home.pos); controls.target.copy(home.tgt); controls.update(); dirty = true; };
  loader.load(src, g => {
    if (!alive) return;
    model = g.scene;
    model.traverse(o => { if (o.isMesh){ o.castShadow = o.receiveShadow = true; if (o.material){ o.material.side = THREE.DoubleSide; o.material.flatShading = true; o.material.needsUpdate = true; } } });
    const box = new THREE.Box3().setFromObject(model), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    model.position.sub(new THREE.Vector3(c.x, box.min.y, c.z)); scene.add(model);
    const r = Math.max(s.x, s.y, s.z), th = THREE.MathUtils.degToRad(orbit[0]), ph = THREE.MathUtils.degToRad(orbit[1]), aspect = host.clientWidth / Math.max(1, host.clientHeight), d = r * 2.4 * Math.max(1, 1 / aspect), tgt = new THREE.Vector3(0, s.y * 0.45, 0);
    home = {pos: new THREE.Vector3(d * Math.sin(ph) * Math.sin(th), tgt.y + d * Math.cos(ph), d * Math.sin(ph) * Math.cos(th)), tgt};
    Object.assign(key.shadow.camera, {left: -r, bottom: -r, right: r, top: r}); key.shadow.camera.updateProjectionMatrix();
    controls.minDistance = r * 0.7; controls.maxDistance = r * 6;
    if (g.animations.length){ mixer = new THREE.AnimationMixer(model); g.animations.forEach(a => mixer.clipAction(a).play()); }
    reset(); size(); spinner.hidden = true;
    // The model drops onto its shadow and settles, so the stage reads as a toy being set down.
    intro = reduce ? 1 : 0;
  }, undefined, () => { if (alive) spinner.innerHTML = '<p>The model file did not load</p>'; });
  const stop = () => { controls.autoRotate = false; host.querySelector('.spin')?.setAttribute('aria-pressed', 'false'); if (hint) hint.style.opacity = 0; };
  canvas.addEventListener('pointerdown', stop);
  canvas.addEventListener('wheel', stop, {passive: true});
  host.querySelector('.home')?.addEventListener('click', reset);
  const spin = host.querySelector('.spin');
  spin?.setAttribute('aria-pressed', String(controls.autoRotate));
  spin?.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; spin.setAttribute('aria-pressed', String(controls.autoRotate)); });
  controls.addEventListener('change', () => { dirty = true; });
  (function loop(){
    if (!alive) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (model && intro < 1){
      intro = Math.min(1, intro + dt * 1.8);
      const t = intro, k = 1 - Math.pow(1 - t, 3), bounce = Math.sin(t * Math.PI * 2.2) * (1 - t) * 0.18;
      model.scale.setScalar(0.6 + 0.4 * k + bounce * 0.4); model.rotation.y = (1 - k) * -0.9; dirty = true;
    }
    if (controls.update() || controls.autoRotate) dirty = true;
    if (mixer){ mixer.update(dt); dirty = true; }
    if (dirty){ renderer.render(scene, cam); dirty = false; }
  })();
  return {
    dispose(){
      alive = false; ro.disconnect(); controls.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { for (const k in x) x[k]?.isTexture && x[k].dispose(); x.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
