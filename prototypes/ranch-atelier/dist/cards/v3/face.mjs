import { drawIconGlyph, ICON_COLOURS } from '../forge.mjs';
// Cards v3 faces (AW-STUDY-0014, docs/oracle/cards-v3/CARDS_V3.md). Evan, 2026-10-23: today's cards "read as.. chinese
// asset farm. I'd like them to read as bespoke works of art", "they are also out of place with the scene itself", and
// "print ready beautiful artifacts". Three directions, all painted in millimetres like Card Forge (63 x 88 mm, 3 mm
// bleed) so the same face is the hand card, the 4x held card and the 600 ppi print master:
//   slice   the card is cut from the board: the tile's cartoon stands in the scene's own air, over the same orange
//           earth band the diorama shows at its edge; the name is set into the earth.
//   print   an artist's proof: a flat cream sheet, a printed window in the place's colours, a hairline, the name and an
//           edition line (No. 1 of 4 · AW). Precious through restraint.
//   diecut  the card's top edge is cut around the place: the tile's cartoon breaks out of the card (5 to 15 per cent of
//           its height, CARD_ART.md pop-out rules), the body is the place's own colour, the earth band below.
// House rules kept: flat colour only (no wood grain, brass, parchment, bevels, gradients or grain on the face), Roboto,
// "AW", the tile's in-game cartoon as the art, no meaningless icons. Paper, light and gloss belong to the physical card
// and are drawn by paper.mjs, never printed on the face.

export const CARD = {w: 63, h: 88, bleed: 3, radius: 3}; // mm
export const STYLES = ['slice', 'print', 'diecut', 'badge', 'poster'];
// The two Ranch pack looks Evan picked from the Midjourney proofs (2026-10-23): badge ("I do love this style too": a hex
// badge, sky, grass, orange earth, ink lines, the name raised) and poster ("this one too for a different version of the
// game": a mid-century screen print, teal sky, peach ground, flat shadow, fine stipple).
export const PACK_LOOKS = ['badge', 'poster'];

// Colours measured from the live sandbox (tools/card-beauty/capture.mjs): the table the board stands on, the tile's
// grass top and its earth edge, so a card in the hand is made of the same stuff as the world above it.
// Measured 2026-10-23 at 7 am: air #e2cbb0, earth edge #c36704. In the game the air follows the hour (hand.mjs).
export const SCENE = {table: '#e2cbb0', ink: '#2b2a26', cream: '#f3eee2', hair: '#2b2a2633'};
export const PLACES = {
 ranch:  {name: 'Ranch',    air: '#e6d2bb', grass: '#86b84a', earth: '#c4680f', deep: '#9a4e0c', body: '#b9533a', no: 1},
 garden: {name: 'Garden',   air: '#e6d2bb', grass: '#8cbc4c', earth: '#a5683a', deep: '#7a4a27', body: '#6f8f3c', no: 2},
 meadow: {name: 'Meadow',   air: '#e6d2bb', grass: '#94c454', earth: '#c47a2c', deep: '#94561c', body: '#3d8f93', no: 3},
 moon:   {name: 'Moonbase', air: '#1c2647', grass: '#c9c6bf', earth: '#7d7b86', deep: '#5c5a66', body: '#27355f', no: 4, night: true}
};

const FAMILY = 'AWRoboto';
let fonts = null;
export function loadFonts(url = new URL('./fonts/roboto-latin.woff2', import.meta.url).href) {
 return fonts ??= (async () => { const f = new FontFace(FAMILY, `url(${url})`, {weight: '100 900'}); await f.load(); document.fonts.add(f); })();
}
const images = new Map();
export function loadImage(src) {
 if (!images.has(src)) images.set(src, new Promise((ok, no) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => no(new Error('art failed: ' + src)); i.src = src; }));
 return images.get(src);
}

// Transparent bounds of the cartoon, so it can be placed by what is drawn, not by its canvas.
const boundsCache = new WeakMap();
function bounds(img) {
 if (boundsCache.has(img)) return boundsCache.get(img);
 const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = new OffscreenCanvas(w, h), x = c.getContext('2d');
 x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, w, h).data;
 let x0 = w, y0 = h, x1 = 0, y1 = 0;
 for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
 const b = x1 > x0 ? {x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1} : {x: 0, y: 0, w, h};
 boundsCache.set(img, b); return b;
}

// Pixels for a card at a given ppi. The diecut style needs headroom above the card for the part that breaks out.
export function facePixels({dpi = 600, bleed = false, style = 'slice'} = {}) {
 const b = bleed ? CARD.bleed : 0, head = style === 'diecut' ? 12 : 0;
 return {w: Math.round((CARD.w + 2 * b) / 25.4 * dpi), h: Math.round((CARD.h + 2 * b + head) / 25.4 * dpi), b, head};
}

// renderFace({id, name, art, edition}, {style, dpi, bleed}) -> {canvas, regions}. regions are trim-mm rectangles the
// paper shader uses: where the spot gloss goes (the art) and where the card is cut (diecut silhouette is in alpha).
export async function renderFace(spec, opts = {}) {
 const style = STYLES.includes(opts.style) ? opts.style : 'slice', dpi = opts.dpi || 300;
 const P = {...(PLACES[spec.id] || PLACES.ranch), ...(spec.palette || {})};
 await loadFonts();
 const art = !spec.art ? null : typeof spec.art === 'string' ? await loadImage(spec.art) : spec.art; // a URL or a ready canvas (pack.mjs model renders)
 const {w, h, b, head} = facePixels({dpi, bleed: opts.bleed, style});
 const canvas = opts.canvas || document.createElement('canvas'); canvas.width = w; canvas.height = h;
 const ctx = canvas.getContext('2d'), px = dpi / 25.4;
 ctx.setTransform(px, 0, 0, px, b * px, (b + head) * px); // trim millimetres from here on; (0,0) = top-left of the cut card
 ctx.clearRect(-b, -b - head, CARD.w + 2 * b, CARD.h + 2 * b + head);
 // Without bleed the face is the cut card: round its corners (the die-cut style rounds its own body).
  if (!b && style !== 'diecut' && style !== 'badge') { round(ctx, 0, 0, CARD.w, CARD.h, CARD.radius); ctx.clip(); }
 const regions = PAINT[style](ctx, {P, art, name: spec.name || P.name, edition: spec.edition, b, set: spec.set || 4, spec});
 return {canvas, style, dpi, regions, head, bleed: b};
}

const round = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const font = (ctx, weight, size, track = 0) => { ctx.font = `${weight} ${size}px ${FAMILY}`; ctx.letterSpacing = track + 'px'; };

// Stand the cartoon in a box: fill is the share of the box's height, ground is where its base sits (0..1 of the box).
function stand(ctx, art, box, {fill = 0.9, ground = 1, shadow = null} = {}) {
 if (!art) return null;
 const B = bounds(art), s = Math.min(box.h * fill / B.h, box.w * 0.94 / B.w), w = B.w * s, h = B.h * s;
 const x = box.x + (box.w - w) / 2, y = box.y + box.h * ground - h;
 if (shadow) { ctx.save(); ctx.fillStyle = shadow; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - h * 0.02, w * 0.44, h * 0.06, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
 ctx.imageSmoothingQuality = 'high';
 ctx.drawImage(art, B.x, B.y, B.w, B.h, x, y, w, h);
 return {x, y, w, h};
}

// The earth band: the same cut the diorama shows at its edge. A grass lip, the earth, one deeper stratum, a few
// flat stones. Flat colour only.
function earth(ctx, P, y, hgt, b) {
 const x0 = -b, w = CARD.w + 2 * b, bottom = CARD.h + b;
 ctx.fillStyle = P.grass; ctx.fillRect(x0, y, w, 1.6);
 ctx.fillStyle = P.earth; ctx.fillRect(x0, y + 1.6, w, bottom - y - 1.6);
 ctx.fillStyle = P.deep; ctx.beginPath(); ctx.moveTo(x0, y + hgt * 0.72);
 for (let i = 0; i <= 12; i++) { const xx = x0 + w * i / 12; ctx.lineTo(xx, y + hgt * (0.7 + 0.05 * Math.sin(i * 1.7))); }
 ctx.lineTo(x0 + w, bottom); ctx.lineTo(x0, bottom); ctx.closePath(); ctx.fill();
 ctx.fillStyle = P.deep;
 for (const [sx, sy, r] of [[8, 0.38, 0.9], [52, 0.3, 0.7], [44, 0.52, 0.5], [18, 0.6, 0.55]]) { ctx.beginPath(); ctx.ellipse(sx, y + hgt * sy, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill(); }
}

const PAINT = {
 slice(ctx, {P, art, name, edition, b, set}) {
  const band = 66;
  ctx.fillStyle = P.air; ctx.fillRect(-b, -b, CARD.w + 2 * b, band + b);
  if (P.night) starfield(ctx, P, band);
  const box = {x: 3, y: 6, w: 57, h: band - 6};
  const at = stand(ctx, art, box, {fill: 0.9, ground: 1.04, shadow: '#0000001f'});
  earth(ctx, P, band, CARD.h - band, b);
  ctx.fillStyle = SCENE.cream; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  font(ctx, 800, 6.4, 0.1); ctx.fillText(name, 5, band + 10.6);
  font(ctx, 500, 2.1, 0.35); ctx.globalAlpha = 0.78; ctx.fillText(`${String(edition ?? P.no).padStart(2, '0')} / ${String(set).padStart(2, '0')}`, 5.2, CARD.h - 4.6);
  ctx.textAlign = 'right'; font(ctx, 900, 2.4, 0.4); ctx.fillText('AW', CARD.w - 5, CARD.h - 4.6); ctx.globalAlpha = 1;
  return {gloss: at ? [at] : [], art: box};
 },
 print(ctx, {P, art, name, edition, b, set}) {
  ctx.fillStyle = SCENE.cream; ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
  const win = {x: 5, y: 5, w: 53, h: 58};
  ctx.fillStyle = P.night ? P.air : mix(P.air, P.grass, 0.18); ctx.fillRect(win.x, win.y, win.w, win.h);
  if (P.night) starfield(ctx, P, win.y + win.h, win);
  ctx.save(); ctx.beginPath(); ctx.rect(win.x, win.y, win.w, win.h); ctx.clip();
  // Ground plane in the place's earth, a flat stripe the tile stands on.
  ctx.fillStyle = mix(P.earth, SCENE.cream, 0.55); ctx.fillRect(win.x, win.y + win.h * 0.8, win.w, win.h * 0.2);
  stand(ctx, art, {x: win.x + 3, y: win.y + 4, w: win.w - 6, h: win.h * 0.86}, {fill: 0.88, ground: 1, shadow: '#00000022'});
  ctx.restore();
  ctx.strokeStyle = SCENE.ink; ctx.lineWidth = 0.12; ctx.strokeRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = SCENE.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  font(ctx, 700, 5.2, 0); ctx.fillText(name, 5, 72.4);
  ctx.fillRect(5, 75, 53, 0.12);
  font(ctx, 400, 2.15, 0.3); ctx.globalAlpha = 0.72; ctx.fillText(`No. ${edition ?? P.no} of ${set}  ·  First Light`, 5, 79.2);
  ctx.textAlign = 'right'; font(ctx, 900, 2.4, 0.4); ctx.globalAlpha = 1; ctx.fillStyle = P.body; ctx.fillText('AW', 58, 79.2);
  return {gloss: [win], art: win};
 },
 diecut(ctx, {P, art, name, edition, b, set}) {
  const band = 68, box = {x: 2.5, y: -11, w: 58, h: band + 11};
  // Place the cartoon first: the die line runs round its upper half, so the card's silhouette is the place itself.
  const B = art && bounds(art), s = art ? Math.min(box.h * 0.92 / B.h, box.w / B.w) : 1;
  const ah = art ? B.h * s : 0, ay = band + 1.5 - ah, top = Math.max(4, ay + ah * 0.5);
  ctx.save(); round(ctx, -b, top, CARD.w + 2 * b, CARD.h + b - top, CARD.radius); ctx.clip();
  ctx.fillStyle = P.body; ctx.fillRect(-b, top, CARD.w + 2 * b, band - top);
  if (P.night) starfield(ctx, P, band, {x: -b, y: top, w: CARD.w + 2 * b, h: band - top});
  earth(ctx, P, band, CARD.h - band, b);
  ctx.restore();
  const at = stand(ctx, art, {x: box.x, y: ay, w: box.w, h: ah}, {fill: 1, ground: 1, shadow: '#00000026'});
  ctx.fillStyle = SCENE.cream; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  font(ctx, 800, 6.4, 0.1); ctx.fillText(name, 5, band + 10.6);
  font(ctx, 500, 2.1, 0.35); ctx.globalAlpha = 0.78; ctx.fillText(`${String(edition ?? P.no).padStart(2, '0')} / ${String(set).padStart(2, '0')}`, 5.2, CARD.h - 4.6);
  ctx.textAlign = 'right'; font(ctx, 900, 2.4, 0.4); ctx.fillText('AW', CARD.w - 5, CARD.h - 4.6); ctx.globalAlpha = 1;
  return {gloss: at ? [at] : [], art: box, cut: 'alpha'};
 },
 // Badge: the card is a hex, like the tiles it places (Evan: "if it's a hex, it automatically wins"). A cream rim and
 // an ink line, sky over a wavy grass band, orange earth with the name in it, and small faceted hex chips for the
 // card's stats ("it can have a faceted other mini icons too").
 badge(ctx, {P, art, name, edition, set, spec}) {
  const B = BADGE, inner = hexPoints(2.6), poly = q => { ctx.beginPath(); q.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
  ctx.lineJoin = 'round';
  poly(hexPoints(0)); ctx.fillStyle = B.rim; ctx.fill();
  poly(inner); ctx.save(); ctx.clip();
  const pal = {...B, ...(spec.badge || {}), ...(P.badge || {})}, night = P.night, ground = 50, earthTop = 56;
  ctx.fillStyle = pal.sky; ctx.fillRect(0, 0, CARD.w, CARD.h);
  if (night) starfield(ctx, P, ground);
  for (const [tx, r] of pal.trees ?? [[8.5, 3.4], [55, 3.0], [49.8, 2.2]]) {
   ctx.fillStyle = pal.trunk; ctx.fillRect(tx - 0.35, ground - 4, 0.7, 4.2);
   ctx.beginPath(); ctx.arc(tx, ground - 4 - r * 0.7, r, 0, Math.PI * 2); ctx.fillStyle = pal.tree; ctx.fill(); ctx.lineWidth = 0.4; ctx.strokeStyle = pal.ink; ctx.stroke();
  }
  ctx.fillStyle = pal.grass; ctx.fillRect(0, ground, CARD.w, earthTop - ground + 2);
  ctx.beginPath(); ctx.moveTo(0, CARD.h); ctx.lineTo(0, earthTop);
  for (let i = 0; i <= 24; i++) { const x = i * CARD.w / 24; ctx.lineTo(x, earthTop + Math.sin(i * 1.9) * 0.8 + (i % 2) * 0.5); }
  ctx.lineTo(CARD.w, CARD.h); ctx.closePath(); ctx.fillStyle = pal.earth; ctx.fill(); ctx.lineWidth = 0.45; ctx.strokeStyle = pal.ink; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(CARD.w, ground); ctx.lineWidth = 0.4; ctx.stroke();
  let seed = 3 + (edition ?? 1); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  ctx.lineWidth = 0.32; ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const x = 4 + rnd() * 55, y = ground + 1.6 + rnd() * 3.6; ctx.beginPath(); ctx.moveTo(x - 0.7, y - 0.8); ctx.lineTo(x, y); ctx.lineTo(x + 0.8, y - 1); ctx.stroke(); }
  for (let i = 0; i < 12; i++) { const x = 10 + rnd() * 43, y = earthTop + 13 + rnd() * 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.9 + rnd(), y); ctx.stroke(); }
  stand(ctx, art, {x: 7, y: 9, w: 49, h: ground + 3 - 9}, {fill: 0.94, ground: 1, shadow: '#00000024'});
  // The name, set into the earth in sky blue with an ink edge.
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const label = name.toUpperCase(); let size = 7.4; font(ctx, 900, size, 0.2); while (ctx.measureText(label).width > 50 && size > 3.6) { size -= 0.2; font(ctx, 900, size, 0.15); }
  ctx.lineWidth = 0.7; ctx.strokeStyle = pal.ink; ctx.strokeText(label, CARD.w / 2, 64.6); ctx.fillStyle = pal.title; ctx.fillText(label, CARD.w / 2, 64.6);
  // Faceted hex chips: one per stat, its glyph on top, the value pressed beside it.
  const stats = spec.stats || [], gap = 9.6, x0 = CARD.w / 2 - (stats.length - 1) * gap / 2;
  stats.forEach((st, i) => chip(ctx, x0 + i * gap, 73.2, 3.3, st, pal));
  font(ctx, 600, 1.8, 0.3); ctx.fillStyle = pal.ink; ctx.globalAlpha = 0.72; ctx.fillText(`${String(edition ?? 1).padStart(2, '0')} / ${String(set).padStart(2, '0')} · AW`, CARD.w / 2, 81.4); ctx.globalAlpha = 1;
  ctx.restore();
  poly(inner); ctx.lineWidth = 0.6; ctx.strokeStyle = pal.ink; ctx.stroke();
  return {gloss: [], art: {x: 7, y: 9, w: 49, h: ground - 6}, texture: 'felt'};
 },
 // Poster: a mid-century screen print. Cream sheet, a window of flat teal sky over peach ground, the subject in flat
 // colour with a long flat shadow, fine stipple where the inks thin out, a pencilled edition line under the print.
 poster(ctx, {P, art, name, edition, set, b, spec}) {
  const S = POSTER, night = P.night, win = {x: 4, y: 4, w: 55, h: 72}, groundY = win.y + win.h * 0.78;
  ctx.fillStyle = S.paper; ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
  ctx.save(); ctx.beginPath(); ctx.rect(win.x, win.y, win.w, win.h); ctx.clip();
  ctx.fillStyle = night ? '#24365e' : S.sky; ctx.fillRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = night ? '#8f8ba0' : S.ground; ctx.fillRect(win.x, groundY, win.w, win.y + win.h - groundY);
  let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Stipple: pale dots thinning up the sky's lower third, dark dots in the ground.
  ctx.fillStyle = S.paper;
  for (let i = 0; i < 900; i++) { const y = groundY - Math.pow(rnd(), 1.8) * win.h * 0.35, x = win.x + rnd() * win.w; ctx.globalAlpha = 0.35; ctx.fillRect(x, y, 0.16, 0.16); }
  ctx.fillStyle = S.dot;
  for (let i = 0; i < 700; i++) { const x = win.x + rnd() * win.w, y = groundY + rnd() * (win.y + win.h - groundY); ctx.globalAlpha = 0.22; ctx.fillRect(x, y, 0.16, 0.16); }
  ctx.globalAlpha = 1;
  if (art) {
   const B = bounds(art), box = {x: win.x + 6, y: win.y + 8, w: win.w - 12, h: groundY + 1.5 - (win.y + 8)};
   const s = Math.min(box.h * 0.9 / B.h, box.w * 0.94 / B.w), w = B.w * s, h = B.h * s, x = box.x + (box.w - w) / 2, y = groundY + 1.5 - h;
   // The long flat shadow: the silhouette laid down on the ground, away from a low sun on the left.
   const sil = silhouette(art, B, night ? '#4f4a63' : S.shadow);
   ctx.save(); ctx.translate(x, y + h); ctx.transform(1, 0, 0.95, -0.22, 0, 0); ctx.globalAlpha = 0.85; ctx.drawImage(sil, 0, 0, B.w, B.h, 0, -h * 0, w, -h); ctx.restore();
   ctx.drawImage(art, B.x, B.y, B.w, B.h, x, y, w, h);
  }
  ctx.restore();
  ctx.fillStyle = S.pencil; ctx.textBaseline = 'alphabetic';
  font(ctx, 400, 2.1, 0.15); ctx.textAlign = 'left'; ctx.fillText(name, win.x, 80.6);
  ctx.textAlign = 'right'; ctx.fillText(`${edition ?? 1}/${set}  AW`, win.x + win.w, 80.6);
  return {gloss: [], art: win, texture: 'print'};
 }
};

const BADGE = {rim: '#efe6d4', ink: '#3a2a20', sky: '#8fcbea', grass: '#7cc35d', tree: '#8fc66a', trunk: '#8a5a2b', earth: '#ef8f2f', title: '#8fcbea'};
// A pointy-top hex filling the card (63 x 88 mm), inset by k mm for the rim.
export function hexPoints(k = 0) {
 const t = 17, s = Math.hypot(CARD.w / 2, t) / (CARD.w / 2); // corner and side insets along the slanted edges
 return [[CARD.w / 2, k * s], [CARD.w - k, t + k * (s - 1) * 0.5 + k * 0.5], [CARD.w - k, CARD.h - t - k * 0.5], [CARD.w / 2, CARD.h - k * s], [k, CARD.h - t - k * 0.5], [k, t + k * 0.5]];
}
// A small faceted hex: three tones of the stat's colour (lit, mid, shade), an ink line, its glyph and value.
function chip(ctx, cx, cy, r, st, pal) {
 const col = ICON_COLOURS[st.icon] || '#666', v = [...Array(6)].map((_, i) => [cx + r * Math.cos(Math.PI / 6 + i * Math.PI / 3), cy + r * Math.sin(Math.PI / 6 + i * Math.PI / 3)]);
 const tri = (a, b, f) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...v[a]); ctx.lineTo(...v[b]); ctx.closePath(); ctx.fillStyle = f; ctx.fill(); };
 for (let i = 0; i < 6; i++) tri(i, (i + 1) % 6, i >= 3 && i <= 4 ? mix(col, '#ffffff', 0.28) : i === 0 || i === 5 ? col : mix(col, '#000000', 0.22));
 ctx.beginPath(); v.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.lineWidth = 0.45; ctx.strokeStyle = pal.ink; ctx.stroke();
 drawIconGlyph(ctx, st.icon, cx, cy, r * 1.15, '#fffaf0');
 if (st.value > 1) { font(ctx, 900, 2.6, 0); ctx.textAlign = 'left'; ctx.lineWidth = 0.5; ctx.strokeStyle = pal.ink; ctx.strokeText(String(st.value), cx + r * 0.95, cy + r * 0.9); ctx.fillStyle = '#fffaf0'; ctx.fillText(String(st.value), cx + r * 0.95, cy + r * 0.9); ctx.textAlign = 'center'; }
}
const POSTER = {paper: '#f1ebdd', sky: '#5aa294', ground: '#f3a982', dot: '#7a4a36', shadow: '#3f6f70', pencil: '#4a4038'};
// A one-colour copy of the art's silhouette (for flat cast shadows).
const silCache = new WeakMap();
function silhouette(art, B, colour) {
 const key = colour; let m = silCache.get(art); if (!m) silCache.set(art, m = {}); if (m[key]) return m[key];
 const c = document.createElement('canvas'); c.width = B.w; c.height = B.h; const x = c.getContext('2d');
 x.drawImage(art, B.x, B.y, B.w, B.h, 0, 0, B.w, B.h); x.globalCompositeOperation = 'source-in'; x.fillStyle = colour; x.fillRect(0, 0, B.w, B.h);
 return m[key] = c;
}

// Night places get a few flat stars (never a gradient).
function starfield(ctx, P, bottom, r = {x: -3, y: -3, w: CARD.w + 6, h: bottom + 3}) {
 let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
 ctx.fillStyle = '#f3eee2';
 for (let i = 0; i < 46; i++) { const x = r.x + rnd() * r.w, y = r.y + rnd() * r.h * 0.7, q = 0.12 + rnd() * 0.28; ctx.globalAlpha = 0.5 + rnd() * 0.5; ctx.beginPath(); ctx.arc(x, y, q, 0, Math.PI * 2); ctx.fill(); }
 ctx.globalAlpha = 1;
}
function mix(a, c, t) {
 const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), C = p(c);
 return '#' + A.map((v, i) => Math.round(v + (C[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Card back: the place's colour and the AW mark. One back per set.
export async function renderBack(opts = {}) {
 await loadFonts();
 const dpi = opts.dpi || 300, {w, h, b} = facePixels({dpi, bleed: opts.bleed}), px = dpi / 25.4;
 const canvas = opts.canvas || document.createElement('canvas'); canvas.width = w; canvas.height = h;
 const ctx = canvas.getContext('2d'); ctx.setTransform(px, 0, 0, px, b * px, b * px);
 ctx.fillStyle = opts.colour || '#2b2a26'; ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
 ctx.strokeStyle = '#f3eee233'; ctx.lineWidth = 0.15; ctx.strokeRect(5, 5, CARD.w - 10, CARD.h - 10);
 ctx.fillStyle = SCENE.cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; font(ctx, 900, 14, 1); ctx.fillText('AW', CARD.w / 2, CARD.h / 2);
 return {canvas};
}
