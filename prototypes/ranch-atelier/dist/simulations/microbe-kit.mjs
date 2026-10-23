// Microbe kit: soft, rigged 2D cells in SVG for top-down pond games (AW-STUDY-0047, Abbie's science adventure).
// Technique borrowed from the 2D puppet and rigging studies (AW-STUDY-0038 and 0041): named parts on bones, chains that
// follow their root with overlap, and a look that is drawn, not textured.
// - The body is a soft blob: 24 rim points on springs. Hits dent it where they land, swimming squashes it, and it
//   breathes. It reads as a drop of liquid glass: a translucent fill (the shader behind it refracts the water), a
//   bright sunward rim, a teal shade rim and a broken ink line (Painted Brush, AW-STUDY-0045).
// - Light is world-fixed (sun top left), so the membrane is drawn unrotated and only the parts turn with the cell.
// - Parts (any mix): filter (leaf mouth: eats green), jaw (bites, eats meat), spike (rams), flagellum (a tail chain
//   that lags and whips, faster swimming), cilia (a ring of hairs beating in a wave, nimble turns), poison (a sac
//   that puffs a cloud), spikes (a burr of spines all round). Two eyes look at what matters and blink.
// - What the cell has eaten floats inside it as glowing bits, so progress lives on the body, not in a bar.
//   const v = cellView(layer, LOOKS.abbie)        layer: an SVG <g>; v.g is the cell's group
//   v.draw(cell, t, dt)                           cell: {x, y, r, heading, speed, parts:Set, hp, maxHp, look:[x,y],
//                                                  jaw (0..1 open), hurt (seconds left), bits:[colour...], ghost}
//   v.hit(angle, amount)   dents the membrane where something struck it     v.remove()
//   partIcon(part, look) -> an SVG string of one part on a small cell, for the part picker
export const NS = 'http://www.w3.org/2000/svg';
export const LOOKS = {
 abbie: {body: '#ff8fd0', deep: '#c93c95', ink: '#43123c', rim: '#8ff7e8', eye: '#2a0f2a', nucleus: '#ffd0ef'},
 drifter: {body: '#9fd8ff', deep: '#3f8fd0', ink: '#13304a', rim: '#ffe7a8', eye: '#10243a', nucleus: '#e2f4ff'},
 nipper: {body: '#ffad5c', deep: '#d0601c', ink: '#4a2008', rim: '#7ff0ff', eye: '#2a1206', nucleus: '#ffe1bd'},
 burr: {body: '#b89cff', deep: '#6a3fd6', ink: '#24104f', rim: '#a8fff0', eye: '#1c0c3a', nucleus: '#ece2ff'},
 puffer: {body: '#d8f06a', deep: '#86a81c', ink: '#2c3608', rim: '#ff9ae0', eye: '#222a06', nucleus: '#f7ffd2'},
 gulp: {body: '#7a86ff', deep: '#3036b8', ink: '#0e1150', rim: '#ffd27a', eye: '#0b0d33', nucleus: '#dfe2ff'},
};
const N = 24, TAU = Math.PI * 2;
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.append(e); return e; };
const f1 = v => Math.round(v * 10) / 10;

// smooth closed path through points (Catmull-Rom as cubic Béziers)
export function blobPath(pts) {
 const n = pts.length; let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
 for (let i = 0; i < n; i++) {
  const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
  d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
 }
 return d + 'Z';
}

// one gradient set per look, shared by every cell wearing it
function defsFor(svg, name, L) {
 const id = 'mk-' + name; if (svg.querySelector('#' + id + '-fill')) return id;
 let defs = svg.querySelector('defs'); if (!defs) defs = el('defs', {}, svg);
 defs.insertAdjacentHTML('beforeend', `
 <radialGradient id="${id}-fill" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".28" stop-color="${L.body}" stop-opacity=".5"/><stop offset=".85" stop-color="${L.deep}" stop-opacity=".62"/><stop offset="1" stop-color="${L.deep}" stop-opacity=".8"/></radialGradient>
 <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="${L.body}" stop-opacity=".5"/><stop offset="1" stop-color="${L.rim}" stop-opacity="1"/></linearGradient>
 <radialGradient id="${id}-shadow"><stop offset="0" stop-color="#06120f" stop-opacity=".38"/><stop offset="1" stop-color="#06120f" stop-opacity="0"/></radialGradient>`);
 return id;
}

export function cellView(layer, L = LOOKS.abbie, {name = 'abbie', shadowLayer = null} = {}) {
 const svg = layer.ownerSVGElement, id = defsFor(svg, name, L);
 const g = el('g', {class: 'cell'}, layer);
 const shadow = el('ellipse', {fill: `url(#${id}-shadow)`}, shadowLayer || g);
 const tail = el('path', {fill: L.deep, stroke: L.ink, 'stroke-width': .8, 'fill-opacity': .9, 'vector-effect': 'non-scaling-stroke'}, g);
 const turn = el('g', {}, g); // parts that turn with the cell, drawn under the membrane
 const cilia = el('path', {fill: 'none', stroke: L.ink, 'stroke-opacity': .7, 'stroke-linecap': 'round'}, turn);
 const spikes = el('path', {fill: L.rim, stroke: L.ink, 'stroke-width': .06, 'stroke-linejoin': 'round'}, turn);
 const sac = el('g', {}, turn);
 const body = el('path', {fill: `url(#${id}-fill)`}, g);
 const inner = el('g', {}, g);
 const nucleus = el('ellipse', {fill: L.nucleus, 'fill-opacity': .55, stroke: L.deep, 'stroke-opacity': .5}, inner);
 const nucleolus = el('circle', {fill: L.deep, 'fill-opacity': .55}, inner);
 const bitsG = el('g', {}, inner);
 const rim = el('path', {fill: 'none', stroke: `url(#${id}-rim)`, 'stroke-linejoin': 'round'}, g);
 const ink = el('path', {fill: 'none', stroke: L.ink, 'stroke-opacity': .85, 'stroke-linecap': 'round'}, g);
 const shine = el('ellipse', {fill: '#fff', 'fill-opacity': .5}, g);
 const front = el('g', {}, g); // mouths and eyes, over the membrane
 const filter = el('g', {}, front);
 const jaw = el('g', {}, front);
 const eyes = el('g', {}, front);
 const eye = [0, 1].map(() => { const e = el('g', {}, eyes); return {g: e, white: el('ellipse', {fill: '#fff', stroke: L.ink, 'stroke-width': .05}, e), pupil: el('circle', {fill: L.eye}, e), glint: el('circle', {fill: '#fff'}, e)}; });
 const off = new Float32Array(N), vel = new Float32Array(N), seed = Math.random() * 100;
 const chain = []; let lastParts = '', blink = 2 + Math.random() * 3, blinkT = 0, bitPos = [];
 const S = {g, hit, remove, draw};
 function hit(a, amount = .25) { for (let i = 0; i < N; i++) { const c = Math.cos(i / N * TAU - a); if (c > 0) vel[i] -= amount * 9 * c ** 4; } }
 function remove() { g.remove(); shadow.remove(); }
 function rebuildParts(c) {
  const P = c.parts, r = 1; let d = '';
  if (P.has('spike')) d += `M${.9 * r} ${-.2}L${1.62} 0L${.9} ${.2}Z`;
  if (P.has('spikes')) for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + .3, b = .17; d += `M${Math.cos(a - b) * .92} ${Math.sin(a - b) * .92}L${Math.cos(a) * 1.42} ${Math.sin(a) * 1.42}L${Math.cos(a + b) * .92} ${Math.sin(a + b) * .92}Z`; }
  spikes.setAttribute('d', d);
  sac.innerHTML = P.has('poison') ? `<circle cx="-.62" cy=".62" r=".34" fill="#c6ff5a" fill-opacity=".8" stroke="${L.ink}" stroke-width=".05"/><circle cx="-.7" cy=".55" r=".08" fill="#fff" fill-opacity=".7"/><circle cx="-.5" cy=".72" r=".05" fill="#6a9a10"/>` : '';
  filter.innerHTML = P.has('filter') ? `<path d="M.78 -.3Q1.08 0 .78 .3" fill="none" stroke="#5fd35a" stroke-width=".12" stroke-linecap="round"/>` +
   [-.24, -.08, .08, .24].map(y => `<path d="M${.86 + .02 * Math.abs(y)} ${y}l.2 ${y * .35}" stroke="#2f8a2b" stroke-width=".05" stroke-linecap="round"/>`).join('') +
   `<path d="M.92 -.26q.24 -.06 .3 .06q-.22 .06 -.3 -.06Z" fill="#7be86a"/>` : '';
  jaw.innerHTML = P.has('jaw') ? [1, -1].map(s => `<path data-s="${s}" d="M.8 ${.12 * s}Q1.25 ${.38 * s} 1.42 ${.06 * s}Q1.2 ${.16 * s} 1.05 ${.09 * s}Z" fill="#fff6e8" stroke="${L.ink}" stroke-width=".06" stroke-linejoin="round"/>`).join('') : '';
  chain.length = 0;
  lastParts = [...P].sort().join();
 }
 function draw(c, t, dt) {
  const key = [...c.parts].sort().join(); if (key !== lastParts) rebuildParts(c);
  const r = c.r, h = c.heading, ch = Math.cos(h), sh = Math.sin(h), sp = Math.min(1, (c.speed || 0) / 160);
  const hurt = c.hurt > 0 ? c.hurt : 0, weak = 1 - Math.max(0, Math.min(1, (c.hp ?? 1) / (c.maxHp ?? 1)));
  // springs: dents spring back, weak cells wobble more
  for (let i = 0; i < N; i++) { vel[i] += (-off[i] * 70 - vel[i] * (7 - 3 * weak)) * dt; off[i] += vel[i] * dt; }
  // membrane, in world rotation (world-fixed light), squashed along the swim direction
  const pts = [], sq = 1 + .08 * sp, ss = 1 / sq;
  for (let i = 0; i < N; i++) {
   const a = i / N * TAU, br = .025 * Math.sin(a * 3 + t * 1.7 + seed) + (.02 + .05 * weak) * Math.sin(a * 5 - t * 3.1 + seed);
   const k = r * (1 + off[i] + br); let lx = Math.cos(a) * k * sq, ly = Math.sin(a) * k * ss;
   pts.push([c.x + lx * ch - ly * sh, c.y + lx * sh + ly * ch]);
  }
  const d = blobPath(pts);
  body.setAttribute('d', d); rim.setAttribute('d', d); ink.setAttribute('d', d);
  rim.setAttribute('stroke-width', f1(Math.max(1.2, r * .09)));
  ink.setAttribute('stroke-width', f1(Math.max(.8, r * .035)));
  const dash = r * .5; ink.setAttribute('stroke-dasharray', `${f1(dash * 1.6)} ${f1(dash * .18)} ${f1(dash * .7)} ${f1(dash * .12)}`);
  g.style.opacity = c.ghost ? .45 : 1;
  body.style.filter = hurt ? `brightness(${1 + hurt * 3})` : weak > .55 ? 'saturate(.55)' : '';
  shadow.setAttribute('cx', f1(c.x + r * .35)); shadow.setAttribute('cy', f1(c.y + r * .5)); shadow.setAttribute('rx', f1(r * 1.25)); shadow.setAttribute('ry', f1(r * 1.1));
  shine.setAttribute('cx', f1(c.x - r * .38)); shine.setAttribute('cy', f1(c.y - r * .42)); shine.setAttribute('rx', f1(r * .26)); shine.setAttribute('ry', f1(r * .13));
  shine.setAttribute('transform', `rotate(-35 ${f1(c.x - r * .38)} ${f1(c.y - r * .42)})`);
  // the turning parts: one transform, unit space (r = 1)
  const tf = `translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(h * 180 / Math.PI)}) scale(${f1(r * 100) / 100})`;
  turn.setAttribute('transform', tf); front.setAttribute('transform', tf);
  // cilia: a ring of hairs beating in a travelling wave, faster when turning or swimming
  if (c.parts.has('cilia')) {
   let cd = ''; const n = 16, beat = t * (9 + 8 * sp);
   for (let j = 0; j < n; j++) {
    const a = Math.PI * .28 + j / (n - 1) * Math.PI * 1.44, w = Math.sin(beat - j * .7) * .55;
    const b = .97, x0 = Math.cos(a) * b, y0 = Math.sin(a) * b, ta = a + w * .6, L2 = .3;
    cd += `M${f1(x0 * 100) / 100} ${f1(y0 * 100) / 100}Q${f1((x0 + Math.cos(a) * L2 * .6) * 100) / 100} ${f1((y0 + Math.sin(a) * L2 * .6) * 100) / 100} ${f1((x0 + Math.cos(ta) * L2) * 100) / 100} ${f1((y0 + Math.sin(ta) * L2) * 100) / 100}`;
   }
   cilia.setAttribute('d', cd); cilia.setAttribute('stroke-width', .06);
  } else cilia.setAttribute('d', '');
  // jaw: opens as prey comes near, snaps on a bite
  if (c.parts.has('jaw')) for (const m of jaw.children) { const s = +m.dataset.s; m.setAttribute('transform', `rotate(${f1(s * (4 + 34 * (c.jaw || 0)))} .8 0)`); }
  // flagellum: a chain that follows its root with lag (overlap, as in the puppet's follow-through), and whips
  if (c.parts.has('flagellum')) {
   const n = 11, seg = r * .2, bx = c.x - ch * r * .95, by = c.y - sh * r * .95;
   if (!chain.length) for (let i = 0; i < n; i++) chain.push([bx - ch * seg * i, by - sh * seg * i]);
   chain[0][0] = bx; chain[0][1] = by;
   for (let i = 1; i < n; i++) {
    const p = chain[i], q = chain[i - 1]; const ax = q[0] - ch * seg, ay = q[1] - sh * seg; // rest: straight behind
    p[0] += (ax - p[0]) * Math.min(1, dt * 7); p[1] += (ay - p[1]) * Math.min(1, dt * 7);
    const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1; p[0] = q[0] + dx / l * seg; p[1] = q[1] + dy / l * seg;
   }
   const L1 = [], R1 = [], amp = r * (.1 + .22 * sp), ph = t * (8 + 14 * sp);
   for (let i = 0; i < n; i++) {
    const q = chain[Math.max(0, i - 1)], p = chain[Math.min(n - 1, i + (i ? 0 : 1))];
    let tx = p[0] - q[0], ty = p[1] - q[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const wv = Math.sin(ph - i * .9) * amp * (i / n), w = r * .13 * (1 - i / n) + r * .02;
    const x = chain[i][0] - ty * wv, y = chain[i][1] + tx * wv;
    L1.push([x - ty * w, y + tx * w]); R1.push([x + ty * w, y - tx * w]);
   }
   tail.setAttribute('d', 'M' + L1.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'L' + R1.reverse().map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z');
  } else tail.setAttribute('d', '');
  // eyes: look at what matters (prey, danger, the finger), blink now and then
  blink -= dt; if (blink < 0) { blinkT = .12; blink = 2 + Math.random() * 4; } blinkT = Math.max(0, blinkT - dt);
  const la = c.look ? Math.atan2(c.look[1] - c.y, c.look[0] - c.x) - h : 0;
  const narrow = c.hunting ? .6 : 1;
  eye.forEach((e, i) => {
   const a = (i ? -.55 : .55), ex = Math.cos(a) * .55, ey = Math.sin(a) * .55, s = .2;
   e.white.setAttribute('cx', ex); e.white.setAttribute('cy', ey); e.white.setAttribute('rx', s); e.white.setAttribute('ry', f1(s * (blinkT ? .12 : narrow) * 100) / 100);
   const px = ex + Math.cos(la) * s * .45, py = ey + Math.sin(la) * s * .45 * (blinkT ? 0 : 1);
   e.pupil.setAttribute('cx', f1(px * 100) / 100); e.pupil.setAttribute('cy', f1(py * 100) / 100); e.pupil.setAttribute('r', blinkT ? 0 : s * .55);
   e.glint.setAttribute('cx', f1((px - s * .18) * 100) / 100); e.glint.setAttribute('cy', f1((py - s * .2) * 100) / 100); e.glint.setAttribute('r', blinkT ? 0 : s * .18);
  });
  // inside: the nucleus drifts, and what the cell has eaten floats as glowing bits
  nucleus.setAttribute('cx', f1(c.x - r * .12 + Math.sin(t * .7 + seed) * r * .06)); nucleus.setAttribute('cy', f1(c.y + r * .1 + Math.cos(t * .6 + seed) * r * .05));
  nucleus.setAttribute('rx', f1(r * .3)); nucleus.setAttribute('ry', f1(r * .26));
  nucleolus.setAttribute('cx', nucleus.getAttribute('cx')); nucleolus.setAttribute('cy', nucleus.getAttribute('cy')); nucleolus.setAttribute('r', f1(r * .09));
  const bits = c.bits || [];
  while (bitPos.length < bits.length) bitPos.push({a: Math.random() * TAU, d: .3 + Math.random() * .35, s: (Math.random() - .5) * 1.2, e: el('circle', {}, bitsG)});
  while (bitPos.length > bits.length) bitPos.pop().e.remove();
  bitPos.forEach((b, i) => {
   b.a += b.s * dt; const x = c.x + Math.cos(b.a) * b.d * r, y = c.y + Math.sin(b.a) * b.d * r;
   b.e.setAttribute('cx', f1(x)); b.e.setAttribute('cy', f1(y)); b.e.setAttribute('r', f1(r * (.075 + .02 * Math.sin(t * 4 + i))));
   b.e.setAttribute('fill', bits[i]); b.e.setAttribute('fill-opacity', .9);
  });
 }
 return S;
}

// one part on a small pink cell, for the part picker cards (animated by CSS on the page)
export function partIcon(part, L = LOOKS.abbie) {
 const art = {
  filter: `<path d="M.78 -.3Q1.08 0 .78 .3" fill="none" stroke="#5fd35a" stroke-width=".12" stroke-linecap="round"/><path d="M.92 -.26q.24 -.06 .3 .06q-.22 .06 -.3 -.06Z" fill="#7be86a"/>`,
  jaw: [1, -1].map(s => `<path class="pi-jaw${s > 0 ? 'a' : 'b'}" d="M.8 ${.12 * s}Q1.25 ${.38 * s} 1.42 ${.06 * s}Q1.2 ${.16 * s} 1.05 ${.09 * s}Z" fill="#fff6e8" stroke="${L.ink}" stroke-width=".06"/>`).join(''),
  spike: `<path d="M.9 -.2L1.62 0L.9 .2Z" fill="${L.rim}" stroke="${L.ink}" stroke-width=".06" stroke-linejoin="round"/>`,
  flagellum: `<path class="pi-tail" d="M-.95 0C-1.3 -.25 -1.5 .25 -1.9 0" fill="none" stroke="${L.deep}" stroke-width=".16" stroke-linecap="round"/>`,
  cilia: Array.from({length: 12}, (_, j) => { const a = Math.PI * .3 + j / 11 * Math.PI * 1.4; return `<path class="pi-hair" style="--j:${j}" d="M${Math.cos(a) * .97} ${Math.sin(a) * .97}l${Math.cos(a) * .3} ${Math.sin(a) * .3}" stroke="${L.ink}" stroke-width=".06" stroke-linecap="round"/>`; }).join(''),
  poison: `<circle cx="-.62" cy=".62" r=".34" fill="#c6ff5a" stroke="${L.ink}" stroke-width=".05"/><circle class="pi-puff" cx="-1.1" cy=".9" r=".16" fill="#c6ff5a" fill-opacity=".6"/>`,
 }[part] || '';
 return `<svg viewBox="-2.1 -1.5 4 3" aria-hidden="true"><g>${part === 'cilia' || part === 'flagellum' || part === 'poison' ? art : ''}<circle r="1" fill="${L.body}" fill-opacity=".75" stroke="${L.ink}" stroke-width=".06"/><ellipse cx="-.38" cy="-.42" rx=".26" ry=".13" fill="#fff" fill-opacity=".6" transform="rotate(-35 -.38 -.42)"/>${part === 'cilia' || part === 'flagellum' || part === 'poison' ? '' : art}<circle cx=".3" cy=".3" r=".1" fill="${L.eye}"/><circle cx=".3" cy="-.3" r=".1" fill="${L.eye}"/></g></svg>`;
}
