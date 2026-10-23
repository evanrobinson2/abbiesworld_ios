// World event effects for the god-view cards (event-hand.mjs). Every effect lasts one in-game day and is cartoon-safe:
// nobody and nothing is hurt, and a day later the world is as it was. Each effect is a small Three.js group in the scene
// (so it can be seen from any angle) or, for tie-dye, a colour wash on the whole picture. One rAF loop runs while any is live.
import {sitarStrum, cartoonScream} from './event-sound.mjs';

const DAY = 24, rnd = (a, b) => a + Math.random() * (b - a), ease = t => 1 - Math.pow(1 - t, 3);

// Effects scale with the camera distance to what the player looks at (1 at the ranch's usual view), so they read at any zoom, ranch or town.
export function createWorldEffects({T, scene, orbit, camera, canvas, heightAt = () => 0, clock}) {
  const live = new Set();
  let raf = 0;
  const hoursOf = c => c.day * 24 + c.hour;
  const mat = (color, o = {}) => new T.MeshStandardMaterial({color, roughness: 0.6, ...o});
  // Effects are built in a local frame (metres-ish, ground at 0) placed on what the player is looking at, scaled by view distance.
  function frame() {
    const cx = orbit.target.x, cz = orbit.target.z, gy = heightAt(cx, cz);
    const s = camera ? Math.max(0.3, camera.position.distanceTo(orbit.target) / 12) : 1;
    const g = new T.Group(); g.position.set(cx, gy, cz); g.scale.setScalar(s); scene.add(g);
    return {g, s, H: (x, z) => (heightAt(cx + x * s, cz + z * s) - gy) / s};
  }

  function start(fx) { fx.t0 = hoursOf(clock()); fx.age = 0; live.add(fx); if (!raf) raf = requestAnimationFrame(loop); return fx; }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const h = hoursOf(clock());
    for (const fx of [...live]) {
      fx.age += dt;
      const left = DAY - (h - fx.t0);
      if (left <= 0) { fx.end(); live.delete(fx); continue; }
      fx.update(dt, Math.min(1, left / 1.5)); // fades away in the last hour and a half
    }
    raf = live.size ? requestAnimationFrame(loop) : 0;
  }
  const dispose = g => { scene.remove(g); g.traverse(o => { o.geometry?.dispose(); [o.material].flat().forEach(m => m?.dispose?.()); }); };

  function ball(color, emissive, size, glow) {
    const g = new T.Group(), m = new T.Mesh(new T.SphereGeometry(size, 24, 16), mat(color, {emissive, emissiveIntensity: glow, ...(glow < 0.5 ? {transparent: true, opacity: 0.7, roughness: 0.1} : {})}));
    g.add(m); return g;
  }
  function groundDisc(H, x, z, r, color, opacity) {
    const m = new T.Mesh(new T.CircleGeometry(r, 32), new T.MeshBasicMaterial({color, transparent: true, opacity, depthWrite: false}));
    m.rotation.x = -Math.PI / 2; m.position.set(x, H(x, z) + 0.02, z); m.renderOrder = 2; return m;
  }
  function burst(group, x, y, z, color, n, speed) {
    const parts = Array.from({length: n}, () => { const p = new T.Mesh(new T.SphereGeometry(0.07, 6, 4), new T.MeshBasicMaterial({color, transparent: true})); p.position.set(x, y, z); group.add(p); const a = rnd(0, 6.28), s = rnd(0.4, 1) * speed; return {p, v: new T.Vector3(Math.cos(a) * s, rnd(1.5, 3.5) * speed * 0.6, Math.sin(a) * s)}; });
    return dt => { let alive = 0; for (const q of parts) { q.v.y -= 6 * dt; q.p.position.addScaledVector(q.v, dt); q.p.material.opacity = Math.max(0, q.p.material.opacity - dt * 0.9); if (q.p.material.opacity > 0) alive++; } return alive > 0; };
  }

  // A cartoon fireball bonks the ground: a glow, a scorch mark and a few embers. It cools down by the end of the day.
  function fireball() {
    const {g, s, H} = frame(), x = 0, z = 0, gy = 0, b = ball(0xff6a1f, 0xff4a00, 0.45, 1.6); g.add(b);
    const light = new T.PointLight(0xff8a30, 0, 8 * s); g.add(light);
    let scorch = null, sparks = null, hit = false;
    cartoonScream();
    return start({
      update(dt, fade) {
        const t = this.age / 1.4;
        if (t < 1) { b.position.set(x + (1 - t) * 4, gy + 0.45 + (1 - ease(t)) * 9, z); light.position.copy(b.position); light.intensity = 3 * t * s * s; }
        else if (!hit) { hit = true; b.position.set(x, gy + 0.45, z); scorch = groundDisc(H, x, z, 1.6, 0x2e211a, 0.55); g.add(scorch); sparks = burst(g, x, gy + 0.5, z, 0xffc24a, 28, 2.2); }
        if (hit) { const k = Math.max(0, 1 - (this.age - 1.4) / 2.2); b.scale.setScalar(0.25 + 0.75 * k); light.intensity = 3 * k * s * s; if (sparks && !sparks(dt)) sparks = null; scorch.material.opacity = 0.55 * fade; }
        if (!hit) b.rotation.y += dt * 6;
      },
      end() { dispose(g); },
    });
  }

  // A huge wobbly water balloon splashes down and leaves a puddle that dries up over the day.
  function waterball() {
    const {g, H} = frame(), x = 0, z = 0, gy = 0, b = ball(0x58b8ff, 0x1d6fb8, 0.9, 0.2); g.add(b);
    let puddle = null, splash = null, hit = false;
    cartoonScream(0.35);
    return start({
      update(dt, fade) {
        const t = this.age / 1.6;
        if (t < 1) { b.position.set(x, gy + 0.9 + (1 - ease(t)) * 10, z); b.scale.set(1 + Math.sin(this.age * 14) * 0.06, 1 - Math.sin(this.age * 14) * 0.06, 1); }
        else if (!hit) { hit = true; b.visible = false; puddle = groundDisc(H, x, z, 2.8, 0x58b8ff, 0.6); g.add(puddle); splash = burst(g, x, gy + 0.3, z, 0x9fdcff, 40, 2.6); }
        if (hit) { const k = Math.min(1, (this.age - 1.6) / 0.5); puddle.scale.setScalar(0.3 + 0.7 * ease(k)); puddle.material.opacity = 0.6 * fade; if (splash && !splash(dt)) splash = null; }
      },
      end() { dispose(g); },
    });
  }

  // It rains cats and dogs. They land softly, wander about and live their normal lives; there is enough food and water for all.
  function catsAndDogs() {
    const {g, H} = frame(), cx = 0, cz = 0;
    const furs = [0x9aa0ac, 0xe8a24a, 0x3a3436, 0xf2eee4, 0xb07a4a, 0x6b6e78];
    const pets = Array.from({length: 22}, (_, i) => {
      const cat = i % 2 === 0, fur = furs[(Math.random() * furs.length) | 0], p = new T.Group(), m = mat(fur);
      const body = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), m); body.scale.set(1.3, 0.8, 0.8);
      const head = new T.Mesh(new T.SphereGeometry(0.13, 12, 8), m); head.position.set(0.24, 0.1, 0);
      const ear = (s) => { const e = new T.Mesh(new T.ConeGeometry(0.05, cat ? 0.12 : 0.09, 4), m); e.position.set(0.25, 0.24, s * 0.07); if (!cat) e.rotation.x = s * 0.9; return e; };
      const tail = new T.Mesh(new T.CylinderGeometry(0.02, 0.03, 0.26, 6), m); tail.position.set(-0.27, 0.16, 0); tail.rotation.z = cat ? 0.3 : -0.8;
      p.add(body, head, ear(1), ear(-1), tail);
      const a = rnd(0, 6.28), r = rnd(0.5, 5), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      p.position.set(x, 12, z); p.userData = {x, z, tx: x, tz: z, delay: rnd(0, 1.8), landed: false, rest: rnd(0, 2)}; g.add(p); return p;
    });
    return start({
      update(dt, fade) {
        for (const p of pets) {
          const u = p.userData, t = (this.age - u.delay) / 1.5;
          if (t < 0) continue;
          if (t < 1) { p.position.y = H(u.x, u.z) + 0.08 + (1 - ease(t)) * 11; p.rotation.z = (1 - t) * 3; continue; }
          p.rotation.z = 0; u.rest -= dt;
          if (u.rest <= 0) { u.tx = u.x + rnd(-1.5, 1.5); u.tz = u.z + rnd(-1.5, 1.5); u.rest = rnd(1.5, 4); }
          const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz);
          if (d > 0.05) { u.x += dx / d * 0.35 * dt; u.z += dz / d * 0.35 * dt; p.rotation.y = -Math.atan2(dz, dx); }
          p.position.set(u.x, H(u.x, u.z) + 0.08, u.z);
          p.scale.setScalar(fade);
        }
      },
      end() { dispose(g); },
    });
  }

  // Tie-dye mode: the whole picture swirls through colour for the day, and a sitar strums now and then over the music.
  function tieDye() {
    const prev = canvas.style.filter, wash = document.createElement('div'); wash.dataset.layer = 'presentation';
    wash.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;mix-blend-mode:color;opacity:.55;background:conic-gradient(from 0deg,#ff3fa4,#ffb824,#9be22c,#16d6c0,#8a5cff,#ff3fa4);animation:aw-tiedye 14s linear infinite';
    if (!document.getElementById('aw-tiedye-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'aw-tiedye-css', textContent: '@keyframes aw-tiedye{to{transform:rotate(360deg) scale(1.6)}}@keyframes aw-tiedye-hue{to{filter:hue-rotate(360deg) saturate(1.9)}}@media(prefers-reduced-motion:reduce){[data-aw-tiedye]{animation:none!important}}'}));
    wash.dataset.awTiedye = '1'; document.body.append(wash);
    canvas.style.animation = 'aw-tiedye-hue 9s linear infinite'; canvas.style.filter = 'saturate(1.9)';
    sitarStrum(); let next = 22;
    return start({
      update(dt, fade) { wash.style.opacity = String(0.55 * fade); if (this.age > next) { next += 25; sitarStrum(0.5); } },
      end() { wash.remove(); canvas.style.animation = ''; canvas.style.filter = prev; },
    });
  }

  const effects = {fireball, waterball, 'cats-dogs': catsAndDogs, 'tie-dye': tieDye};
  return {
    play(id) { if (effects[id]) { if (id === 'tie-dye') for (const f of live) if (f.tie) { f.end(); live.delete(f); } const fx = effects[id](); if (id === 'tie-dye') fx.tie = true; return fx; } },
    has: id => id in effects,
    clear() { for (const f of live) f.end(); live.clear(); },
  };
}
