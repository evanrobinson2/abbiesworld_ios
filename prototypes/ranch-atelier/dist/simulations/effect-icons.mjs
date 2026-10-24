// The world-effect icons as little 3D things that hover like the backpack (Evan, 2026-10-24 00:16Z): a fireball, a waterball, a
// pet, a tie-dye swirl and a fire wheel, greyed out until charged, full colour when ready. One small shared WebGL renderer draws
// them all into plain 2D canvases, so five icons cost one context.
//   const icons = createEffectIcons(THREE);  icons.mount(buttonEl, 'fireball');  icons.setCharged('fireball', true);
const SIZE = 64;

export function createEffectIcons(T) {
  let renderer;
  try { renderer = new T.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true}); } catch { return null; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(1); renderer.setSize(SIZE * dpr, SIZE * dpr, false); renderer.setClearColor(0, 0);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;
  const entries = new Map();
  const mat = (color, o = {}) => new T.MeshStandardMaterial({color, roughness: 0.55, ...o});
  const cone = (m, r, h, x, y, z, rz) => { const c = new T.Mesh(new T.ConeGeometry(r, h, 10), m); c.position.set(x, y, z); c.rotation.z = rz; return c; };

  function swirlTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), cols = ['#ff3fa4', '#ffb824', '#9be22c', '#16d6c0', '#8a5cff'];
    for (let r = 64; r > 0; r -= 6) { g.fillStyle = cols[((64 - r) / 6 | 0) % 5]; g.beginPath(); g.ellipse(64 + Math.sin(r) * 6, 64 + Math.cos(r) * 6, r, r * 0.9, r * 0.1, 0, 6.3); g.fill(); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  const builders = {
    fireball() {
      const g = new T.Group(); g.add(new T.Mesh(new T.SphereGeometry(0.5, 20, 14), mat(0xff6a1f, {emissive: 0xff4a00, emissiveIntensity: 0.9})));
      g.add(cone(mat(0xffb824, {emissive: 0xff8a00, emissiveIntensity: 0.9}), 0.28, 0.7, 0.18, 0.62, 0, -0.25), cone(mat(0xffd24a, {emissive: 0xffc000, emissiveIntensity: 0.9}), 0.2, 0.55, -0.22, 0.58, 0.1, 0.3)); return g;
    },
    waterball() {
      const g = new T.Group(); g.add(new T.Mesh(new T.SphereGeometry(0.55, 24, 16), mat(0x58b8ff, {transparent: true, opacity: 0.8, roughness: 0.1, emissive: 0x1d6fb8, emissiveIntensity: 0.35})));
      const h = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), new T.MeshBasicMaterial({color: 0xffffff})); h.position.set(-0.22, 0.24, 0.42); g.add(h); return g;
    },
    'cats-dogs'() {
      const g = new T.Group(), m = mat(0xe8a24a), body = new T.Mesh(new T.SphereGeometry(0.36, 14, 10), m); body.scale.set(1.3, 0.85, 0.85);
      const head = new T.Mesh(new T.SphereGeometry(0.26, 14, 10), m); head.position.set(0.42, 0.2, 0);
      const ear = s => cone(m, 0.09, 0.22, 0.46, 0.47, s * 0.14, 0), tail = new T.Mesh(new T.CylinderGeometry(0.04, 0.06, 0.5, 8), m);
      tail.position.set(-0.5, 0.3, 0); tail.rotation.z = 0.5; g.add(body, head, ear(1), ear(-1), tail);
      for (const s of [1, -1]) { const e = new T.Mesh(new T.SphereGeometry(0.035, 6, 6), new T.MeshBasicMaterial({color: 0x2a1c12})); e.position.set(0.64, 0.26, s * 0.1); g.add(e); } g.scale.setScalar(1.05); return g;
    },
    'tie-dye'() {
      const g = new T.Group(); g.add(new T.Mesh(new T.SphereGeometry(0.55, 24, 16), new T.MeshStandardMaterial({map: swirlTexture(), roughness: 0.5}))); return g;
    },
    'fire-wheels'() {
      const g = new T.Group(), tyre = new T.Mesh(new T.TorusGeometry(0.38, 0.17, 12, 24), mat(0x2e2e38));
      const hub = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.2, 14), mat(0xc9ccd6)); hub.rotation.x = Math.PI / 2; g.add(tyre, hub);
      for (let i = 0; i < 3; i++) g.add(cone(mat([0xff5a1f, 0xffa31f, 0xffe04a][i], {emissive: [0xff3a00, 0xff7a00, 0xffc000][i], emissiveIntensity: 0.9}), 0.16 - i * 0.03, 0.55 - i * 0.1, -0.55 - i * 0.2, -0.08 + i * 0.08, 0, Math.PI / 2)); return g;
    },
  };
  // greyed: every material loses its colour and glow; charged: back to what it was
  function paint(model, charged) {
    model.traverse(o => { if (!o.material) return; const m = o.material, d = (m.userData ||= {});
      d.orig ||= {color: m.color?.clone(), emissive: m.emissive?.clone(), map: m.map, opacity: m.opacity, ei: m.emissiveIntensity};
      if (charged) { m.color?.copy(d.orig.color); m.emissive?.copy(d.orig.emissive || new T.Color(0)); m.emissiveIntensity = d.orig.ei; m.map = d.orig.map; m.opacity = d.orig.opacity; }
      else { const l = d.orig.color ? (d.orig.color.r * .3 + d.orig.color.g * .59 + d.orig.color.b * .11) * 0.55 + 0.25 : 0.5; m.color?.setRGB(l, l, l); m.emissive?.setRGB(0, 0, 0); m.emissiveIntensity = 0; m.map = null; m.opacity = Math.min(d.orig.opacity, 0.85); m.transparent = true; }
      m.needsUpdate = true; });
  }
  let raf = 0, t0 = performance.now();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - t0) / 1000;
    for (const [id, e] of entries) {
      if (!e.canvas.isConnected) continue;
      const lift = e.charged ? 1 : 0.55;
      e.model.rotation.y = reduce ? 0.5 : t * (e.charged ? 0.9 : 0.5) + e.phase; e.model.position.y = reduce ? 0 : Math.sin(t * 1.6 + e.phase) * 0.06 * lift;
      renderer.render(e.scene, e.camera);
      e.ctx.clearRect(0, 0, e.canvas.width, e.canvas.height); e.ctx.drawImage(renderer.domElement, 0, 0, e.canvas.width, e.canvas.height);
    }
  }
  return {
    mount(button, id) {
      if (!builders[id]) return false;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE * dpr; canvas.style.cssText = 'width:42px;height:42px;pointer-events:none;display:block';
      const scene = new T.Scene(), camera = new T.PerspectiveCamera(32, 1, 0.1, 20); camera.position.set(0, 0.3, 2.8); camera.lookAt(0, 0, 0);
      scene.add(new T.AmbientLight(0xffffff, 1.1)); const key = new T.DirectionalLight(0xffffff, 2.2); key.position.set(2, 3, 3); scene.add(key);
      const model = builders[id](); scene.add(model); paint(model, false);
      entries.set(id, {canvas, ctx: canvas.getContext('2d'), scene, camera, model, charged: false, phase: entries.size * 1.3});
      button.replaceChildren(canvas); if (!raf) raf = requestAnimationFrame(frame); return true;
    },
    setCharged(id, on) { const e = entries.get(id); if (e && e.charged !== !!on) { e.charged = !!on; paint(e.model, e.charged); } },
    dispose() { cancelAnimationFrame(raf); raf = 0; entries.clear(); renderer.dispose(); },
  };
}
