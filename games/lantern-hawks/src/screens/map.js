// Overland hex board. The squad is a figurine that hops hex to hex.

import * as assets from '../gfx/registry.js';
import { HEX_W, FACE_H, ROW_STEP, hexCenter, pixelToHex, terrainAt, specialAt, hexArt, findHexPath, passable } from '../core/hex.js';
import { drawText, textWidth } from '../gfx/font.js';
import { P } from '../gfx/palette.js';
import { el } from '../ui/dom.js';

const HOP_TIME = 0.32;
const PAD = 10;

export class MapScreen {
  constructor(game) {
    this.game = game;
    this.w = game.world;
    this.allowMenu = true;
    this.hover = null;
    this.queue = [];
    this.anim = null; // { from, to, t }
    this.bump = null;
    this.t = 0;
    this.boardW = this.w.colsN * HEX_W + HEX_W / 2 + PAD * 2;
    this.boardH = (this.w.rowsN - 1) * ROW_STEP + FACE_H + 12 + PAD * 2;
    this.cam = { x: 0, y: 0 };
    this.centerCam(true);
  }

  enter() {
    const g = this.game;
    g.overlay.append(
      el('button', { class: 'menu-btn', onclick: () => g.openMenu() }, 'Menu'),
      el('div', { class: 'map-hint' }, 'Click a hex to move your squad. Click the town to go in.'),
    );
  }

  pos() { return this.game.state.pos; }

  tokenPixel() {
    const p = this.pos();
    let c = hexCenter(p.q, p.r, PAD, PAD);
    if (this.anim) {
      const a = hexCenter(this.anim.from.q, this.anim.from.r, PAD, PAD);
      const b = hexCenter(this.anim.to.q, this.anim.to.r, PAD, PAD);
      const k = Math.min(1, this.anim.t / HOP_TIME);
      c = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 7 };
    }
    return c;
  }

  centerCam(snap) {
    const c = this.tokenPixel();
    const tx = Math.max(0, Math.min(this.boardW - 320, c.x - 160));
    const ty = Math.max(0, Math.min(this.boardH - 180, c.y - 90));
    if (snap) this.cam = { x: tx, y: ty };
    else { this.cam.x += (tx - this.cam.x) * 0.15; this.cam.y += (ty - this.cam.y) * 0.15; }
  }

  update(dt) {
    this.t += dt;
    if (this.anim) {
      this.anim.t += dt;
      if (this.anim.t >= HOP_TIME) {
        this.game.state.pos = { ...this.anim.to };
        this.anim = null;
        if (this.arrive()) return;
      }
    }
    if (!this.anim && this.queue.length) {
      const to = this.queue.shift();
      this.game.state.prevPos = { ...this.pos() }; // a fight on arrival takes cover from here
      this.anim = { from: { ...this.pos() }, to, t: 0 };
    } else if (!this.anim && this.bump) {
      const b = this.bump;
      this.bump = null;
      this.visit(b);
    }
    this.centerCam(false);
  }

  // Called after each hop. Returns true if a scene took over.
  arrive() {
    const p = this.pos();
    const sp = specialAt(this.w, p.q, p.r, this.game.state);
    const last = !this.queue.length;
    if (sp?.scene && (last || sp.figure)) {
      this.queue = [];
      this.bump = null;
      this.game.openScene(sp.scene, { kind: 'map' });
      return true;
    }
    if (sp?.city && last && !this.bump) {
      this.game.enterCity(sp.city);
      return true;
    }
    return false;
  }

  // Interact with a hex you can't stand on (the port, the ridges) from next door.
  visit(h) {
    const sp = specialAt(this.w, h.q, h.r, this.game.state);
    if (sp?.scene) this.game.openScene(sp.scene, { kind: 'map' });
    else this.game.toast(`${terrainAt(this.w, h.q, h.r).name}: no way through.`);
  }

  pointer(x, y) {
    if (this.anim || this.queue.length) return;
    const h = pixelToHex(this.w, x + this.cam.x, y + this.cam.y, PAD, PAD);
    if (!h) return;
    const p = this.pos();
    if (h.q === p.q && h.r === p.r) {
      const sp = specialAt(this.w, h.q, h.r, this.game.state);
      if (sp?.city) this.game.enterCity(sp.city);
      else if (sp?.scene) this.game.openScene(sp.scene, { kind: 'map' });
      return;
    }
    const path = findHexPath(this.w, p, h);
    if (!path) { this.game.toast('No route from here.'); return; }
    this.queue = path.steps;
    this.bump = path.bump;
  }

  move(x, y) {
    this.hover = pixelToHex(this.w, x + this.cam.x, y + this.cam.y, PAD, PAD);
  }

  key(k, e, down) {
    if (!down) return false;
    if (k === 'Enter' || k === ' ') { const p = this.pos(); this.pointer(...Object.values(this.screenOf(p))); return true; }
    return false;
  }

  screenOf(h) {
    const c = hexCenter(h.q, h.r, PAD, PAD);
    return { x: c.x - this.cam.x, y: c.y - this.cam.y };
  }

  drawHex(g, q, r) {
    const c = hexCenter(q, r, PAD, PAD);
    const art = hexArt(this.w, q, r, this.game.state);
    const real = assets.getOverride(art.real); // manifest art, one image per terrain
    if (art.axis && real && this.drawRoad(g, c, art, real)) return;
    const img = real || assets.get(art.fallback);
    const dw = HEX_W, dh = Math.round(img.height * (HEX_W / img.width));
    g.imageSmoothingEnabled = img.width > dw * 2;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, Math.round(c.x - dw / 2 - this.cam.x), Math.round(c.y - FACE_H / 2 - this.cam.y), dw, dh);
    g.imageSmoothingEnabled = false;
    if (art.burning && real) this.drawFire(g, c.x - this.cam.x, c.y - this.cam.y, q * 13 + r);
  }

  // Road hexes follow the road. A straight variant from the manifest
  // (hex.road.ew / swne / nwse) is used as is; otherwise the base terrain is
  // drawn first (it carries the earth edge) and the diagonal road image's top
  // face is turned onto the right axis and clipped to the face.
  drawRoad(g, c, art, real) {
    const straight = assets.getOverride(art.variant);
    if (straight || !art.rotate) { this.blitHex(g, c, straight || real); return true; }
    const base = assets.getOverride(art.base);
    if (!base) return false;
    this.blitHex(g, c, base);
    const x = c.x - this.cam.x, y = c.y - this.cam.y, rx = HEX_W / 2, ry = FACE_H / 2;
    const sy = FACE_H / (HEX_W * 2 / Math.sqrt(3)); // how squashed the face is
    g.save();
    g.beginPath();
    g.moveTo(x, y - ry); g.lineTo(x + rx, y - ry / 2); g.lineTo(x + rx, y + ry / 2);
    g.lineTo(x, y + ry); g.lineTo(x - rx, y + ry / 2); g.lineTo(x - rx, y - ry / 2); g.closePath();
    g.clip();
    g.translate(x, y);
    g.scale(1, sy);
    g.rotate(art.rotate);
    g.scale(1, 1 / sy);
    g.translate(-x, -y);
    this.blitHex(g, c, real);
    g.restore();
    return true;
  }

  blitHex(g, c, img) {
    const dw = HEX_W, dh = Math.round(img.height * (HEX_W / img.width));
    g.imageSmoothingEnabled = img.width > dw * 2;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, Math.round(c.x - dw / 2 - this.cam.x), Math.round(c.y - FACE_H / 2 - this.cam.y), dw, dh);
    g.imageSmoothingEnabled = false;
  }

  drawFire(g, x, y, seed) {
    for (let i = 0; i < 7; i++) {
      const k = (this.t * 0.6 + i / 7 + seed * 0.13) % 1;
      const sx = x - 10 + ((i * 37 + seed) % 20) + Math.sin(this.t * 2 + i) * 2;
      g.fillStyle = i % 2 ? 'rgba(42,34,54,0.55)' : 'rgba(85,72,63,0.5)';
      const s = 3 + k * 6;
      g.fillRect(Math.round(sx), Math.round(y - 4 - k * 26), Math.round(s), Math.round(s));
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = (Math.floor(this.t * 10) + i) % 3 ? P.fire : P.ember;
      g.fillRect(Math.round(x - 12 + ((i * 53 + seed) % 24)), Math.round(y - 6 + ((i * 29) % 14)), 2, 2);
    }
  }

  drawOutline(g, h, color) {
    const c = hexCenter(h.q, h.r, PAD, PAD);
    const x = c.x - this.cam.x, y = c.y - this.cam.y, rx = HEX_W / 2 - 1, ry = FACE_H / 2 - 1;
    g.strokeStyle = color;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y - ry); g.lineTo(x + rx, y - ry / 2); g.lineTo(x + rx, y + ry / 2);
    g.lineTo(x, y + ry); g.lineTo(x - rx, y + ry / 2); g.lineTo(x - rx, y - ry / 2); g.closePath();
    g.stroke();
  }

  render(g) {
    const grd = g.createLinearGradient(0, 0, 0, 180);
    grd.addColorStop(0, '#0d1a2e'); grd.addColorStop(1, '#1c1446');
    g.fillStyle = grd;
    g.fillRect(0, 0, 320, 180);
    for (let r = 0; r < this.w.rowsN; r++) for (let q = 0; q < this.w.colsN; q++) this.drawHex(g, q, r);
    // Figures on special hexes (patrols after the raid).
    const st = this.game.state;
    for (const sp of this.w.specials) {
      const live = specialAt(this.w, sp.q, sp.r, st);
      if (live !== sp) continue;
      const s = this.screenOf(sp);
      if (sp.figure) g.drawImage(assets.get(sp.figure), Math.round(s.x - 8), Math.round(s.y - 20));
      if (sp.city || (sp.label && !sp.figure && sp.label !== 'Northern ridges')) {
        const label = sp.label.toUpperCase();
        const tw = textWidth(label) + 4;
        g.fillStyle = 'rgba(16,12,30,0.85)';
        g.fillRect(Math.round(s.x - tw / 2), Math.round(s.y + 12), tw, 8);
        drawText(g, label, Math.round(s.x - tw / 2 + 2), Math.round(s.y + 13), sp.city ? P.lit : P.silverL);
      }
    }
    if (this.hover) {
      const ok = passable(this.w, this.hover.q, this.hover.r) || specialAt(this.w, this.hover.q, this.hover.r, st);
      this.drawOutline(g, this.hover, ok ? P.lit : P.ember);
    }
    // Squad figurine.
    const c = this.tokenPixel();
    const tx = Math.round(c.x - this.cam.x), ty = Math.round(c.y - this.cam.y);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(tx - 6, Math.round(hexCenter(this.pos().q, this.pos().r, PAD, PAD).y - this.cam.y) + 2, 12, 3);
    g.drawImage(assets.get('fig.squad'), tx - 8, ty - 20);
    // Hovered terrain name.
    if (this.hover) {
      const t = terrainAt(this.w, this.hover.q, this.hover.r);
      const sp = specialAt(this.w, this.hover.q, this.hover.r, st);
      const label = `${sp?.label || t.name}${t.cover ? '  COVER +' + t.cover : ''}${!t.passable ? '  NO ENTRY' : ''}`.toUpperCase();
      g.fillStyle = 'rgba(16,12,30,0.85)';
      g.fillRect(4, 4, textWidth(label) + 6, 9);
      drawText(g, label, 7, 6, P.silverL);
    }
  }
}
