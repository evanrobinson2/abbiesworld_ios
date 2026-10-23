// rig2d: the shared 2D cut-out rig (AW-STUDY-0041, with AW-STUDY-0038 and the Character Studio 0037).
// Format: docs/oracle/rigging/RIG2D_FORMAT.md. Spine-style: every bone points along its own +x, angles are degrees
// clockwise on screen (SVG, y down), pieces are SVG drawn in their bone's space, IK is two-bone and analytic, and
// squash and stretch keeps area (stretch s along the bone, 1/sqrt(s) across it, unless a bone sets its own).
// Runs in the browser and in node (renderSVG returns a string), no dependencies.

const RAD = Math.PI / 180;
const rot = (x, y, a) => { const c = Math.cos(a * RAD), s = Math.sin(a * RAD); return [c * x - s * y, s * x + c * y]; };
const angOf = (dx, dy) => Math.atan2(dy, dx) / RAD;
const wrap = a => ((a + 540) % 360) - 180;

// Load a rig: compute each bone's rest length, rest local angle and offset from the joint table.
export function loadRig(src) {
  const rig = JSON.parse(JSON.stringify(src));
  const J = rig.joints, by = {};
  for (const b of rig.bones) {
    by[b.name] = b;
    const h = J[b.head], t = J[b.tail];
    b.length = Math.hypot(t[0] - h[0], t[1] - h[1]);
    b.worldRest = angOf(t[0] - h[0], t[1] - h[1]);
  }
  for (const b of rig.bones) {
    const p = b.parent && by[b.parent];
    const h = J[b.head];
    if (!p) { b.restRot = b.worldRest; b.x = h[0]; b.y = h[1]; continue; }
    b.restRot = wrap(b.worldRest - p.worldRest);
    const ph = J[p.head];
    [b.x, b.y] = rot(h[0] - ph[0], h[1] - ph[1], -p.worldRest);
  }
  // Aliases: the Character Studio's names (upperarm_L, forearm_L, spine...) reach the same bones.
  for (const b of rig.bones) if (b.alias) by[b.alias] = b;
  rig.by = by;
  rig.order = topo(rig.bones);
  rig.ik = rig.ik || [];
  rig.slots = rig.slots || rig.bones.map(b => ({ bone: b.name, piece: b.name }));
  rig.pieces = rig.pieces || {};
  rig.animations = rig.animations || {};
  return rig;
}

function topo(bones) {
  const out = [], seen = new Set(), by = Object.fromEntries(bones.map(b => [b.name, b]));
  const visit = b => { if (seen.has(b.name)) return; if (b.parent) visit(by[b.parent]); seen.add(b.name); out.push(b); };
  bones.forEach(visit);
  return out;
}

// A pose: {root:{x,y,sx,sy,rotate}, bones:{name:{rotate, sx, sy, x, y}}, ik:{name:{x,y} | null}}.
// Bone values are offsets from rest (rotate in degrees, sx/sy multiply). IK targets are in character space.
export function solve(rig, pose = {}) {
  const P = pose.bones || {}, W = {};
  const fk = () => {
    for (const b of rig.order) {
      const q = P[b.name] || (b.alias && P[b.alias]) || {};
      const sx = q.sx ?? 1, sy = q.sy ?? (b.keepArea === false ? 1 : 1 / Math.sqrt(sx));
      const local = b.restRot + (q.rotate || 0);
      const ox = b.x + (q.x || 0), oy = b.y + (q.y || 0);
      if (!b.parent) { W[b.name] = { x: ox, y: oy, a: local, sx, sy, len: b.length * sx }; continue; }
      const p = W[b.parent];
      // Children ride the parent's stretched length but never inherit its scale (Spine "noScale").
      const [dx, dy] = rot(ox * p.sx, oy * p.sy, p.a);
      W[b.name] = { x: p.x + dx, y: p.y + dy, a: p.a + local, sx, sy, len: b.length * sx };
    }
  };
  fk();
  for (const k of rig.ik) {
    const tgt = pose.ik && pose.ik[k.name];
    if (!tgt) continue;
    const [n1, n2] = k.bones, b1 = rig.by[n1], b2 = rig.by[n2];
    const w1 = W[n1], w2 = W[n2];
    let l1 = w1.len, l2 = w2.len;
    let dx = tgt.x - w1.x, dy = tgt.y - w1.y, d = Math.hypot(dx, dy);
    // Cartoon stretch: past full reach, both bones stretch (up to k.stretch) instead of the hand stopping short.
    const reach = l1 + l2;
    if (k.stretch && d > reach) {
      const s = Math.min(d / reach, k.stretch);
      P[n1] = { ...(P[n1] || {}), sx: s }; P[n2] = { ...(P[n2] || {}), sx: s };
      l1 *= s; l2 *= s;
    }
    d = Math.min(Math.max(d, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
    const base = angOf(dx, dy);
    const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    const A = Math.acos(Math.max(-1, Math.min(1, cosA))) / RAD;
    const bend = k.bend ?? 1;
    const a1 = base - bend * A;
    const ex = w1.x + l1 * Math.cos(a1 * RAD), ey = w1.y + l1 * Math.sin(a1 * RAD);
    const a2 = angOf(tgt.x - ex, tgt.y - ey);
    const parentA = b1.parent ? W[b1.parent].a : 0;
    P[n1] = { ...(P[n1] || {}), rotate: wrap(a1 - parentA - b1.restRot) };
    P[n2] = { ...(P[n2] || {}), rotate: wrap(a2 - a1 - b2.restRot) };
    fk();
    // Optional: hold the end bone's world angle (a planted foot stays flat while the leg moves).
    if (k.hold && tgt.angle !== undefined) {
      const e = rig.by[k.hold];
      P[k.hold] = { ...(P[k.hold] || {}), rotate: wrap(tgt.angle - W[e.parent].a - e.restRot) };
      fk();
    }
  }
  return W;
}

// Root transform for the whole character: squash and stretch of the body happens here, about the ground point.
export function rootTransform(pose = {}) {
  const r = pose.root || {};
  const sx = r.sx ?? 1, sy = r.sy ?? 1;
  return `translate(${f(r.x || 0)} ${f(r.y || 0)}) rotate(${f(r.rotate || 0)}) scale(${f(sx)} ${f(sy)})`;
}

const f = n => (Math.round(n * 100) / 100).toString();
export const boneTransform = w => `translate(${f(w.x)} ${f(w.y)}) rotate(${f(w.a)}) scale(${f(w.sx)} ${f(w.sy)})`;

// Draw order: rig.slots back to front. A slot may name an outline group: every outline in a group is drawn before
// any fill in that group, so the pieces of one body read as one silhouette with no seams (see the study, rep 4).
export function renderSVG(rig, pose = {}, opt = {}) {
  const W = solve(rig, pose);
  const skin = opt.skin || rig.skin || 'default';
  const piece = s => (rig.pieces[s.piece] || {})[skin] ?? (rig.pieces[s.piece] || {}).default ?? '';
  let out = '', i = 0;
  const slots = rig.slots;
  while (i < slots.length) {
    const g = slots[i].group;
    let j = i;
    while (j < slots.length && g && slots[j].group === g) j++;
    if (j === i) j = i + 1;
    const run = slots.slice(i, j);
    if (g) {
      for (const s of run) out += `<g transform="${boneTransform(W[s.bone])}" class="ol${s.far ? ' far' : ''}">${piece(s)}</g>`;
      for (const s of run) out += `<g transform="${boneTransform(W[s.bone])}" class="fl${s.far ? ' far' : ''}">${piece(s)}</g>`;
    } else for (const s of run) out += `<g transform="${boneTransform(W[s.bone])}" class="pc${s.far ? ' far' : ''}">${piece(s)}</g>`;
    i = j;
  }
  if (opt.bones) out += bonesSVG(rig, W);
  return `<g transform="${rootTransform(pose)}">${out}</g>`;
}

// The developer view: bones as tapered wedges, joints as rings. Never shown to players outside developer mode.
export function bonesSVG(rig, W) {
  let s = '<g class="rig-bones" fill="rgba(255,90,40,.35)" stroke="#ff5a28" stroke-width="1">';
  for (const b of rig.bones) {
    const w = W[b.name], L = w.len, r = Math.min(6, L * 0.12);
    s += `<g transform="translate(${f(w.x)} ${f(w.y)}) rotate(${f(w.a)})"><path d="M0 0L${f(r)} ${f(-r)}L${f(L)} 0L${f(r)} ${f(r)}Z"/><circle r="${f(r * .8)}" fill="none"/></g>`;
  }
  return s + '</g>';
}

// Where a joint is in character space after solving (for handles, contact checks and the scorer).
export function jointPos(rig, W, bone, atTail = false) {
  const w = W[bone];
  return atTail ? [w.x + w.len * Math.cos(w.a * RAD), w.y + w.len * Math.sin(w.a * RAD)] : [w.x, w.y];
}

// Easing for keys: linear, step, in/out cubic, and "ease" (both). Keys are [time, ...values, easeName?].
export const EASE = {
  linear: t => t, step: () => 0,
  in: t => t * t * t, out: t => 1 - (1 - t) ** 3,
  ease: t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};
function keyAt(keys, t, n) {
  if (!keys || !keys.length) return null;
  if (t <= keys[0][0]) return keys[0].slice(1, 1 + n);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const e = EASE[a[1 + n]] || EASE.ease;
      const u = e((t - a[0]) / (b[0] - a[0] || 1));
      return a.slice(1, 1 + n).map((v, k) => v + (b[1 + k] - v) * u);
    }
  }
  return keys[keys.length - 1].slice(1, 1 + n);
}

// Sample an animation at time t (seconds) into a pose. Timelines: bones.<name>.rotate [t,deg],
// .scale [t,sx,sy], .translate [t,x,y]; root.translate/.scale/.rotate; ik.<name> [t,x,y] (or [t,x,y,angle]).
export function sample(anim, t) {
  const T = anim.loop ? ((t % anim.duration) + anim.duration) % anim.duration : Math.min(t, anim.duration);
  const pose = { bones: {}, ik: {}, root: {} };
  for (const [name, tl] of Object.entries(anim.bones || {})) {
    const q = {};
    const r = keyAt(tl.rotate, T, 1); if (r) q.rotate = r[0];
    const s = keyAt(tl.scale, T, 2); if (s) { q.sx = s[0]; q.sy = s[1]; }
    const m = keyAt(tl.translate, T, 2); if (m) { q.x = m[0]; q.y = m[1]; }
    pose.bones[name] = q;
  }
  const R = anim.root || {};
  const rt = keyAt(R.translate, T, 2); if (rt) { pose.root.x = rt[0]; pose.root.y = rt[1]; }
  const rs = keyAt(R.scale, T, 2); if (rs) { pose.root.sx = rs[0]; pose.root.sy = rs[1]; }
  const rr = keyAt(R.rotate, T, 1); if (rr) pose.root.rotate = rr[0];
  for (const [name, keys] of Object.entries(anim.ik || {})) {
    const n = keys[0].length - 1 - (typeof keys[0][keys[0].length - 1] === 'string' ? 1 : 0);
    const v = keyAt(keys, T, n);
    if (v) pose.ik[name] = n > 2 ? { x: v[0], y: v[1], angle: v[2] } : { x: v[0], y: v[1] };
  }
  return pose;
}

// Mount a rig into an <svg> element and play it. Returns {set(pose), play(name), stop(), rig}.
export function mount(rig, svg, opt = {}) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  let raf = 0, cur = null, t0 = 0, last = {}, showBones = !!opt.bones;
  const draw = pose => { last = pose; g.innerHTML = renderSVG(rig, pose, { bones: showBones, skin: opt.skin }); opt.onDraw && opt.onDraw(pose); };
  const tick = now => {
    if (!cur) return;
    const a = rig.animations[cur];
    const pose = sample(a, (now - t0) / 1000 * (opt.speed || 1));
    opt.adjust && opt.adjust(pose);
    draw(pose);
    raf = requestAnimationFrame(tick);
  };
  draw({});
  return {
    rig,
    set(pose) { cur = null; cancelAnimationFrame(raf); draw(pose); },
    play(name) { cur = name; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); },
    stop() { cur = null; cancelAnimationFrame(raf); },
    bones(on) { showBones = on; draw(last); },
    skin(s) { opt.skin = s; draw(last); },
    get playing() { return cur; },
    get pose() { return last; },
  };
}

// The cut-out look: flat fill, one ink line. Grouped slots draw a wide outline pass under a fill-only pass, so a
// body's joints show no seam (Toon Boom's auto-patch). Far limbs are a value darker. Override the variables per place.
export const RIG_CSS = `
.rig2d{--rig-fill:#a9bccf;--rig-far:#8296ad;--rig-ink:#24303d;--rig-line:3px}
.rig2d .pc path,.rig2d .pc ellipse{fill:var(--rig-fill);stroke:var(--rig-ink);stroke-width:var(--rig-line);stroke-linejoin:round}
.rig2d .ol path,.rig2d .ol ellipse{fill:var(--rig-ink);stroke:var(--rig-ink);stroke-width:calc(var(--rig-line) * 2);stroke-linejoin:round}
.rig2d .fl path,.rig2d .fl ellipse{fill:var(--rig-fill);stroke:none}
.rig2d .far.pc path,.rig2d .far.pc ellipse,.rig2d .far.fl path,.rig2d .far.fl ellipse{fill:var(--rig-far)}
`;
