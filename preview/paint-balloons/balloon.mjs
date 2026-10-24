// Water balloons (AW-STUDY-0049, Evan 2026-10-24: "the balls themselves should look like water balloons", and "the corresponding
// balls of these types should carry characteristics of those types"). Every ball in the tray is a thin translucent skin, a
// knotted neck, water sloshing inside, a little wobble at rest, a squash and stretch when held. The skin carries its type:
//   paint       the colour of the paint, flecks floating in the water; it splats and plants grow from it
//   fireball    ember orange with a hot core and flickering flames on top; it lands as the fireball effect
//   waterball   cool blue, bubbles rising; it lands as the water balloon effect and a puddle
//   cats-dogs   fur-tan with two ears and a paw print; it lands as the rain of cats and dogs
//   tie-dye     a swirl of colour that keeps turning; it washes the whole picture in tie-dye
// The types are the world effect cards' own ids (simulations/world-effects.mjs), so a card and its balloon are one thing.
//   balloonHTML({kind, colour, px})        an <svg> string
//   KINDS[kind] = {id, tint, drops[]}      the colours its pop sprays
//   pop(x, y, kind, colour)                droplets of the type's own stuff at a screen point
//   jiggle(node, vx, vy)                   squash and stretch along the motion, for a held balloon
const PAL = {
 pink:   {paint: '#ff3fa4', deep: '#c2186f', stem: '#2fae8b', leaf: '#47d3a1', head: '#ff6ec0', rim: '#ffd1ea', glow: '#fff0a8'},
 teal:   {paint: '#16d6c0', deep: '#0b8f86', stem: '#1b8f7d', leaf: '#38d6bd', head: '#8cf0e0', rim: '#d8fff7', glow: '#b6fff0'},
 lime:   {paint: '#9be22c', deep: '#5a9a10', stem: '#5b9a1d', leaf: '#8fd23a', head: '#e8ff5c', rim: '#f6ffb0', glow: '#fffbb0'},
 violet: {paint: '#8a5cff', deep: '#5530c8', stem: '#d8c6ff', leaf: '#6e48e0', head: '#9a6cff', rim: '#4c2aa8', glow: '#ffe9a8'},
 sun:    {paint: '#ffb824', deep: '#e57d0a', stem: '#c47a14', leaf: '#ffcf55', head: '#ffd84a', rim: '#fff3b0', glow: '#ffffff'}
};
const PAINT_COLOURS = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, {paint: v.paint, deep: v.deep}]));

export const KINDS = {
 paint: {id: 'paint', drops: null},
 fireball: {id: 'fireball', drops: ['#ffd24a', '#ff8a1f', '#ff4a00', '#ffe8a0']},
 waterball: {id: 'waterball', drops: ['#bfe8ff', '#58b8ff', '#1d6fb8', '#ffffff']},
 'cats-dogs': {id: 'cats-dogs', drops: ['#e8a24a', '#f2eee4', '#9aa0ac', '#3a3436']},
 'tie-dye': {id: 'tie-dye', drops: ['#ff3fa4', '#ffb824', '#9be22c', '#16d6c0', '#8a5cff']}
};
export const SPECIAL = ['fireball', 'waterball', 'cats-dogs', 'tie-dye'];

const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
let uid = 0;
const SKIN = 'M20 4C30 4 36 12 36 22 36 32 29 40.5 22.6 42L24 46.2 16 46.2 17.4 42C11 40.5 4 32 4 22 4 12 10 4 20 4Z';

// body colour of each kind: [light, mid, deep]
function palette(kind, colour) {
 if (kind === 'fireball') return ['#ffd36a', '#ff7a1f', '#c8350a'];
 if (kind === 'waterball') return ['#c9eeff', '#58b8ff', '#1d6fb8'];
 if (kind === 'cats-dogs') return ['#f6d2a0', '#e8a24a', '#a8691f'];
 if (kind === 'tie-dye') return ['#ffd0ef', '#ff6fb1', '#8a5cff'];
 const c = PAINT_COLOURS[colour] || PAINT_COLOURS.pink;
 return [mix(c.paint, '#ffffff', .55), c.paint, c.deep];
}

export function balloonHTML({kind = 'paint', colour = 'pink', px = 40} = {}) {
 const n = ++uid, [lt, mid, dp] = palette(kind, colour), id = s => s + n;
 const water = `<g clip-path="url(#${id('c')})"><g class="bw-slosh"><path d="M-6 21Q0 17.5 6 21T18 21 30 21 42 21 50 21V50H-6Z" fill="${dp}" opacity=".5"/><path d="M-6 24Q0 21 6 24T18 24 30 24 42 24 50 24V50H-6Z" fill="${dp}" opacity=".35"/></g></g>`;
 let inside = '', top = '';
 if (kind === 'paint') inside = `<circle cx="14" cy="27" r="2.2" fill="${lt}" opacity=".8"/><circle cx="25" cy="31" r="1.7" fill="${lt}" opacity=".8"/><circle cx="21" cy="24" r="1.3" fill="${dp}" opacity=".6"/>`;
 if (kind === 'fireball') {
  inside = `<circle cx="20" cy="26" r="9" fill="url(#${id('h')})"/>`;
  top = `<g class="bw-flame"><path d="M13 7C10 2 14 0 14 -3 18 0 18 4 17 7Z" fill="#ffb824"/><path d="M21 6C19 1 23 -1 23.5 -4 27 0 26 4 25 6.5Z" fill="#ffd24a"/><path d="M27 8C26 4 29 3 29.5 0 32.5 3 31 6 30 8.5Z" fill="#ff8a1f"/></g>`;
 }
 if (kind === 'waterball') inside = `<circle class="bw-b1" cx="16" cy="34" r="1.8" fill="#fff" opacity=".8"/><circle class="bw-b2" cx="24" cy="36" r="1.3" fill="#fff" opacity=".8"/><circle class="bw-b3" cx="20" cy="33" r="1" fill="#fff" opacity=".8"/>`;
 if (kind === 'cats-dogs') {
  top = `<path d="M10 10L9 1 17 6Z" fill="${mid}" stroke="${dp}" stroke-width="1.2" stroke-linejoin="round"/><path d="M30 10L31 1 23 6Z" fill="${mid}" stroke="${dp}" stroke-width="1.2" stroke-linejoin="round"/>`;
  inside = `<g fill="${dp}" opacity=".6"><ellipse cx="20" cy="30" rx="4.2" ry="3.4"/><circle cx="13.6" cy="25.4" r="1.9"/><circle cx="18" cy="21.6" r="1.9"/><circle cx="22.4" cy="21.6" r="1.9"/><circle cx="26.6" cy="25.4" r="1.9"/></g>`;
 }
 const fill = kind === 'tie-dye' ? `url(#${id('t')})` : `url(#${id('g')})`;
 const defs = `<defs><radialGradient id="${id('g')}" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="${lt}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dp}"/></radialGradient>
<radialGradient id="${id('h')}"><stop offset="0" stop-color="#fff6c0"/><stop offset=".6" stop-color="#ffb824" stop-opacity=".8"/><stop offset="1" stop-color="#ff7a1f" stop-opacity="0"/></radialGradient>
<linearGradient id="${id('t')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3fa4"/><stop offset=".25" stop-color="#ffb824"/><stop offset=".5" stop-color="#9be22c"/><stop offset=".75" stop-color="#16d6c0"/><stop offset="1" stop-color="#8a5cff"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="5s" repeatCount="indefinite"/></linearGradient>
<clipPath id="${id('c')}"><path d="${SKIN}"/></clipPath></defs>`;
 const glow = kind === 'fireball' ? 'drop-shadow(0 0 5px #ff7a1f)' : kind === 'tie-dye' ? 'drop-shadow(0 0 4px #ff6fb1)' : 'drop-shadow(0 3px 4px rgba(0,0,0,.35))';
 return `<svg class="bw bw-${kind}" viewBox="0 -6 40 54" width="${px}" height="${Math.round(px * 54 / 40)}" aria-hidden="true" style="--bw-d:${(n % 7) * -.43}s;filter:${glow}">${defs}
<g class="bw-body">${top}<path d="${SKIN}" fill="${fill}" fill-opacity=".82" stroke="${dp}" stroke-opacity=".55" stroke-width="1"/>${water}${inside}
<path d="M20 4C30 4 36 12 36 22 36 32 29 40.5 22.6 42" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.6" stroke-linecap="round" transform="translate(-.6 .4)"/>
<ellipse cx="13" cy="12" rx="4.6" ry="2.7" fill="#fff" opacity=".85" transform="rotate(-38 13 12)"/><circle cx="9" cy="19" r="1.2" fill="#fff" opacity=".7"/>
<path d="M17.4 42L16 46.2 24 46.2 22.6 42Z" fill="${dp}" opacity=".85"/><path d="M16 46.2c-2 1.4-4 1.2-5 3M24 46.2c2 1.4 4 1.2 5 3" stroke="${dp}" stroke-width="1.3" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="46.4" rx="4.4" ry="1.4" fill="${dp}"/></g></svg>`;
}

const CSS = `.bw{display:block;overflow:visible;transform-origin:50% 88%;animation:bw-wobble 2.4s ease-in-out var(--bw-d,0s) infinite}
@keyframes bw-wobble{0%,100%{transform:rotate(-3deg) scale(1.02,.98)}50%{transform:rotate(3deg) scale(.98,1.03)}}
.bw-slosh{animation:bw-slosh 1.7s ease-in-out var(--bw-d,0s) infinite alternate}@keyframes bw-slosh{from{transform:translate(-5px,1px)}to{transform:translate(5px,-1px)}}
.bw-flame{transform-origin:50% 100%;animation:bw-flame .45s ease-in-out infinite alternate}@keyframes bw-flame{from{transform:scale(1,.82) skewX(-5deg);opacity:.85}to{transform:scale(1.08,1.12) skewX(5deg);opacity:1}}
.bw-b1,.bw-b2,.bw-b3{animation:bw-rise 2.2s linear infinite}.bw-b2{animation-delay:-.8s}.bw-b3{animation-delay:-1.5s}@keyframes bw-rise{from{transform:translateY(0);opacity:.9}to{transform:translateY(-16px);opacity:0}}
.bw-held{transition:transform .09s ease-out;animation:none}
@media (prefers-reduced-motion:reduce){.bw,.bw-slosh,.bw-flame,.bw-b1,.bw-b2,.bw-b3{animation:none}}`;

export function injectBalloonCSS() {
 if (!document.getElementById('bw-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'bw-css', textContent: CSS}));
}

// Squash and stretch along the motion: faster is longer and thinner; at rest it settles back with a wobble.
export function jiggle(svg, vx, vy) {
 const sp = Math.min(1, Math.hypot(vx, vy) / 2200), a = Math.atan2(vy, vx) * 180 / Math.PI;
 svg.style.transform = sp < .04 ? '' : `rotate(${a}deg) scale(${1 + sp * .38},${1 - sp * .26}) rotate(${-a}deg)`;
}

// The pop where a balloon lets go: droplets of the type's own stuff (paint colour, embers, water, fur, tie-dye), a short spray.
export function pop(x, y, kind, colour) {
 const cols = KINDS[kind]?.drops || palette('paint', colour);
 for (let i = 0; i < 9; i++) {
  const d = document.createElement('div'), a = Math.random() * 6.28, r = 26 + Math.random() * 34, s = 5 + Math.random() * 6;
  d.dataset.layer = 'presentation';
  d.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;background:${cols[i % cols.length]};z-index:31;pointer-events:none;opacity:1;transition:transform .45s cubic-bezier(.2,.8,.3,1),opacity .45s;transform:translate(-50%,-50%)`;
  document.body.append(d);
  requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = `translate(${Math.cos(a) * r - s / 2}px,${Math.sin(a) * r - s / 2 + 12}px) scale(.4)`; d.style.opacity = '0'; }));
  setTimeout(() => d.remove(), 520);
 }
}
