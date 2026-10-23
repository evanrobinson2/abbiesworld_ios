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
 const heat = el('path', {fill: '#ff4a1c', 'fill-opacity': 0}, g); // damage heats the cell (Brawlhalla: the colour is the gauge)
 const inner = el('g', {}, g);
 const nucleus = el('ellipse', {fill: L.nucleus, 'fill-opacity': .55, stroke: L.deep, 'stroke-opacity': .5}, inner);
 const nucleolus = el('circle', {fill: L.deep, 'fill-opacity': .55}, inner);
 const bitsG = el('g', {}, inner);
 const rim = el('path', {fill: 'none', stroke: `url(#${id}-rim)`, 'stroke-linejoin': 'round'}, g);
 const ink = el('path', {fill: 'none', stroke: L.ink, 'stroke-opacity': .85, 'stroke-linecap': 'round'}, g);
 const shine = el('ellipse', {fill: '#fff', 'fill-opacity': .5}, g);
 const shield = el('circle', {fill: '#bff3ff', 'fill-opacity': 0, stroke: '#e8fbff', 'stroke-opacity': 0}, g);
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
  const st = c.stretch || 0, pts = [], sq = (1 + .08 * sp) * (1 + st), ss = (1 - .18 * st) / (1 + .08 * sp);
  for (let i = 0; i < N; i++) {
   const a = i / N * TAU, br = .025 * Math.sin(a * 3 + t * 1.7 + seed) + (.02 + .05 * weak) * Math.sin(a * 5 - t * 3.1 + seed);
   const k = r * (1 + off[i] + br); let lx = Math.cos(a) * k * sq, ly = Math.sin(a) * k * ss;
   pts.push([c.x + lx * ch - ly * sh, c.y + lx * sh + ly * ch]);
  }
  const d = blobPath(pts);
  body.setAttribute('d', d); rim.setAttribute('d', d); ink.setAttribute('d', d); heat.setAttribute('d', d);
  heat.setAttribute('fill-opacity', f1(Math.min(.6, (c.heat || 0) * .6) * 100) / 100);
  const sh2 = c.shield > 0 ? Math.min(1, c.shield * 2) : 0;
  shield.setAttribute('cx', f1(c.x)); shield.setAttribute('cy', f1(c.y)); shield.setAttribute('r', f1(r * 1.35));
  shield.setAttribute('fill-opacity', f1(sh2 * .18 * 100) / 100); shield.setAttribute('stroke-opacity', f1(sh2 * .9 * 100) / 100); shield.setAttribute('stroke-width', f1(r * .08));
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

// The next stage of life (Evan: "redesign the evolution stage from single cell creature to the next stage of life"):
// a tardigrade, the water bear, a real animal small enough to live in a drop on a slide. Eight stubby legs that plant
// and step (the puppet study's gait idea: a foot stays put until its rest spot runs away from it), a body that bends
// along its path, a round snout and two eyespots. Same glass-drop drawing as the cells: translucent, sun rim, teal rim.
//   const v = tardigradeView(layer, LOOKS.abbie)      v.draw(bear, t, dt)  bear: {x, y, r, heading, speed, heat, shield}
export function tardigradeView(layer, L = LOOKS.abbie, {name = 'abbie', shadowLayer = null} = {}) {
 const svg = layer.ownerSVGElement, id = defsFor(svg, name, L);
 const g = el('g', {class: 'bear'}, layer);
 const shadow = el('ellipse', {fill: `url(#${id}-shadow)`}, shadowLayer || g);
 const legsG = el('g', {}, g);
 const body = el('path', {fill: `url(#${id}-fill)`, stroke: L.ink, 'stroke-opacity': .85}, g);
 const heat = el('path', {fill: '#ff4a1c', 'fill-opacity': 0}, g);
 const folds = el('path', {fill: 'none', stroke: L.deep, 'stroke-opacity': .55, 'stroke-linecap': 'round'}, g);
 const rim = el('path', {fill: 'none', stroke: `url(#${id}-rim)`}, g);
 const face = el('g', {}, g);
 const snout = el('circle', {fill: L.nucleus, stroke: L.ink}, face), mouth = el('circle', {fill: L.ink}, face);
 const eyes = [0, 1].map(() => el('circle', {fill: L.eye}, face)), glints = [0, 1].map(() => el('circle', {fill: '#fff'}, face));
 const shine = el('ellipse', {fill: '#fff', 'fill-opacity': .45}, g);
 const shield = el('circle', {fill: '#bff3ff', 'fill-opacity': 0, stroke: '#e8fbff', 'stroke-opacity': 0}, g);
 const legs = Array.from({length: 8}, (_, i) => ({pair: i >> 1, side: i & 1 ? 1 : -1, foot: null, from: null, to: null, t: 1, p: el('path', {fill: L.body, stroke: L.ink, 'stroke-linejoin': 'round'}, legsG), claw: el('path', {fill: 'none', stroke: L.ink, 'stroke-linecap': 'round'}, legsG)}));
 const spine = []; let blink = 3;
 const remove = () => { g.remove(); shadow.remove(); };
 function draw(c, t, dt) {
  const r = c.r, n = 6, seg = r * .52, h = c.heading, ch = Math.cos(h), sh = Math.sin(h);
  if (!spine.length) for (let i = 0; i < n; i++) spine.push([c.x - ch * seg * i, c.y - sh * seg * i]);
  spine[0] = [c.x, c.y];
  for (let i = 1; i < n; i++) { const q = spine[i - 1], p = spine[i]; const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1; p[0] = q[0] + dx / l * seg; p[1] = q[1] + dy / l * seg; }
  const W = [.72, .95, 1.02, 1, .9, .62].map(k => k * r * .82), left = [], right = [], N = [];
  for (let i = 0; i < n; i++) {
   const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)]; let tx = a[0] - b[0], ty = a[1] - b[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
   N.push([-ty, tx, tx, ty]); const breathe = 1 + .03 * Math.sin(t * 2 + i);
   left.push([spine[i][0] - ty * W[i] * breathe, spine[i][1] + tx * W[i] * breathe]); right.push([spine[i][0] + ty * W[i] * breathe, spine[i][1] - tx * W[i] * breathe]);
  }
  const head = [spine[0][0] + ch * r * .55, spine[0][1] + sh * r * .55], tail = [spine[n - 1][0] - N[n - 1][2] * r * .45, spine[n - 1][1] - N[n - 1][3] * r * .45];
  const d = blobPath([head, ...left, tail, ...right.reverse()]);
  body.setAttribute('d', d); heat.setAttribute('d', d); rim.setAttribute('d', d);
  body.setAttribute('stroke-width', f1(r * .05)); rim.setAttribute('stroke-width', f1(r * .08));
  heat.setAttribute('fill-opacity', f1(Math.min(.6, (c.heat || 0) * .6) * 100) / 100);
  let fd = ''; right.reverse(); for (let i = 1; i < n - 1; i++) { const a = left[i], b = right[i], m = spine[i]; fd += `M${f1(a[0] * .8 + m[0] * .2)} ${f1(a[1] * .8 + m[1] * .2)}Q${f1(m[0] - N[i][2] * r * .15)} ${f1(m[1] - N[i][3] * r * .15)} ${f1(b[0] * .8 + m[0] * .2)} ${f1(b[1] * .8 + m[1] * .2)}`; }
  folds.setAttribute('d', fd); folds.setAttribute('stroke-width', f1(r * .05));
  // legs: four pairs along the body, feet planted until their rest spot moves away, alternate legs step together
  const stepLen = r * .7, sp = c.speed || 0;
  for (const L2 of legs) {
   const i = 1 + L2.pair, base = spine[Math.min(n - 1, i)], nx = N[i][0] * L2.side, ny = N[i][1] * L2.side;
   const hip = [base[0] + nx * W[i] * .85, base[1] + ny * W[i] * .85];
   const back = L2.pair === 3 ? -.5 : .15, rest = [hip[0] + nx * r * .45 + N[i][2] * r * back, hip[1] + ny * r * .45 + N[i][3] * r * back];
   if (!L2.foot) L2.foot = [...rest];
   if (L2.t < 1) { L2.t = Math.min(1, L2.t + dt / .16); const k = L2.t; L2.foot = [L2.from[0] + (L2.to[0] - L2.from[0]) * k, L2.from[1] + (L2.to[1] - L2.from[1]) * k]; }
   else if (Math.hypot(L2.foot[0] - rest[0], L2.foot[1] - rest[1]) > stepLen && ((L2.pair + (L2.side > 0 ? 1 : 0)) % 2 === Math.floor(t * 6) % 2 || sp < 20)) {
    L2.from = [...L2.foot]; L2.to = [rest[0] + N[i][2] * stepLen * .45 * Math.min(1, sp / 60), rest[1] + N[i][3] * stepLen * .45 * Math.min(1, sp / 60)]; L2.t = 0;
   }
   const f = L2.foot, lift = L2.t < 1 ? Math.sin(L2.t * Math.PI) * r * .12 : 0, w = r * .2;
   const mx = (hip[0] + f[0]) / 2 + nx * lift, my = (hip[1] + f[1]) / 2 + ny * lift; let lx = f[0] - hip[0], ly = f[1] - hip[1]; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
   L2.p.setAttribute('d', `M${f1(hip[0] - ly * w)} ${f1(hip[1] + lx * w)}Q${f1(mx - ly * w * 1.2)} ${f1(my + lx * w * 1.2)} ${f1(f[0] - ly * w * .6)} ${f1(f[1] + lx * w * .6)}L${f1(f[0] + ly * w * .6)} ${f1(f[1] - lx * w * .6)}Q${f1(mx + ly * w * 1.2)} ${f1(my - lx * w * 1.2)} ${f1(hip[0] + ly * w)} ${f1(hip[1] - lx * w)}Z`);
   L2.p.setAttribute('stroke-width', f1(r * .04));
   let cd = ''; for (const k of [-.5, 0, .5]) { const a = Math.atan2(ly, lx) + k; cd += `M${f1(f[0])} ${f1(f[1])}l${f1(Math.cos(a) * r * .16)} ${f1(Math.sin(a) * r * .16)}`; }
   L2.claw.setAttribute('d', cd); L2.claw.setAttribute('stroke-width', f1(r * .045)); L2.claw.setAttribute('stroke', '#c98a08');
  }
  // the face: a round snout and two eyespots, which blink
  blink -= dt; const shut = blink < 0; if (blink < -.12) blink = 2 + Math.random() * 4;
  snout.setAttribute('cx', f1(head[0] - ch * r * .12)); snout.setAttribute('cy', f1(head[1] - sh * r * .12)); snout.setAttribute('r', f1(r * .26)); snout.setAttribute('stroke-width', f1(r * .04));
  mouth.setAttribute('cx', f1(head[0] - ch * r * .06)); mouth.setAttribute('cy', f1(head[1] - sh * r * .06)); mouth.setAttribute('r', f1(r * .08));
  eyes.forEach((e, i) => { const s = i ? 1 : -1, ex = spine[0][0] + ch * r * .05 - sh * s * r * .42, ey = spine[0][1] + sh * r * .05 + ch * s * r * .42;
   e.setAttribute('cx', f1(ex)); e.setAttribute('cy', f1(ey)); e.setAttribute('r', shut ? f1(r * .02) : f1(r * .11));
   glints[i].setAttribute('cx', f1(ex - r * .03)); glints[i].setAttribute('cy', f1(ey - r * .04)); glints[i].setAttribute('r', shut ? 0 : f1(r * .04)); });
  const mid = spine[2];
  shine.setAttribute('cx', f1(mid[0] - r * .35)); shine.setAttribute('cy', f1(mid[1] - r * .4)); shine.setAttribute('rx', f1(r * .4)); shine.setAttribute('ry', f1(r * .14));
  shine.setAttribute('transform', `rotate(-35 ${f1(mid[0] - r * .35)} ${f1(mid[1] - r * .4)})`);
  shadow.setAttribute('cx', f1(mid[0] + r * .35)); shadow.setAttribute('cy', f1(mid[1] + r * .5)); shadow.setAttribute('rx', f1(r * 1.9)); shadow.setAttribute('ry', f1(r * 1.5));
  const sh2 = c.shield > 0 ? Math.min(1, c.shield * 2) : 0;
  shield.setAttribute('cx', f1(mid[0])); shield.setAttribute('cy', f1(mid[1])); shield.setAttribute('r', f1(r * 2.1));
  shield.setAttribute('fill-opacity', f1(sh2 * .18 * 100) / 100); shield.setAttribute('stroke-opacity', f1(sh2 * .9 * 100) / 100); shield.setAttribute('stroke-width', f1(r * .08));
  g.style.opacity = c.ghost ? .45 : 1;
 }
 return {g, draw, remove, hit() {}};
}

// the tardigrade as one flat icon (the backpack charm's card and list icon use this path)
export const TARDIGRADE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><g stroke="#43123c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
<path d="M30 52q-6 14 2 18M44 56q-2 14 6 16M62 56q2 14 10 14M80 52q8 12 16 10M30 28q-6-14 2-18M44 24q-2-14 6-16M62 24q2-14 10-14M80 28q8-12 16-10" fill="none" stroke="#ff8fd0" stroke-width="9"/>
<path d="M32 70l-4 4M32 70l1 5M50 72l-2 5M50 72l3 4M72 70l1 5M72 70l4 3M96 62l3 4M96 62l5 1M32 10l-4-4M32 10l1-5M50 8l-2-5M50 8l3-4M72 10l1-5M72 10l4-3M96 18l3-4M96 18l5-1" fill="none" stroke="#c98a08"/>
<path d="M16 40c0-14 14-20 30-20h30c18 0 30 8 30 20s-12 20-30 20H46c-16 0-30-6-30-20z" fill="#ff8fd0"/>
<path d="M44 24q-4 16 0 32M62 24q-4 16 0 32M80 26q-4 14 0 28" fill="none" stroke="#c93c95" stroke-opacity=".6"/>
<circle cx="108" cy="40" r="7" fill="#ffd0ef"/><circle cx="109" cy="40" r="2.5" fill="#43123c" stroke="none"/>
<circle cx="96" cy="32" r="3" fill="#2a0f2a" stroke="none"/><circle cx="96" cy="48" r="3" fill="#2a0f2a" stroke="none"/>
<ellipse cx="40" cy="30" rx="10" ry="4" fill="#fff" fill-opacity=".6" stroke="none" transform="rotate(-15 40 30)"/></g></svg>`;
