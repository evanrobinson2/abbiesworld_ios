// Title screen: starfield, ringed planet, chrome-and-neon title.

import { drawText, textWidth } from '../gfx/font.js';
import { P } from '../gfx/palette.js';
import { el } from '../ui/dom.js';

export class TitleScreen {
  constructor(game) {
    this.game = game;
    this.t = 0;
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.stars = Array.from({ length: 140 }, () => ({ x: rnd() * 320, y: rnd() * 180, z: 0.2 + rnd() * 0.8, c: rnd() < 0.15 ? P.neonCyan : rnd() < 0.1 ? P.neonPink : P.white }));
    this.titleArt = this.makeTitle(game.data.names.title);
  }

  makeTitle(text) {
    const scale = 4;
    const w = textWidth(text, scale) + 4, h = 5 * scale + 4;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    // Neon rim first, then chrome bands row by row.
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) drawText(g, text, 2 + dx, 2 + dy, dx === 2 ? P.purpleD : P.neonPink, scale);
    const bands = [P.white, P.silverL, P.silverL, P.silver, P.neonCyan, P.blueL, P.neonViolet, P.violet || P.neonViolet];
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tg = tmp.getContext('2d');
    drawText(tg, text, 2, 2, '#fff', scale);
    tg.globalCompositeOperation = 'source-in';
    for (let y = 0; y < h; y++) { tg.fillStyle = bands[Math.min(bands.length - 1, Math.floor((y / h) * bands.length))]; tg.fillRect(0, y, w, 1); }
    g.drawImage(tmp, 0, 0);
    return c;
  }

  enter() {
    const g = this.game;
    const menu = el('div', { class: 'title-menu' },
      el('button', { onclick: () => g.newGame() }, 'New game'),
      g.hasSave() ? el('button', { onclick: () => g.continueGame() }, 'Continue') : null,
      el('button', { onclick: () => g.sampleBattle() }, 'Sample battle'),
      el('button', { onclick: () => g.showHelp() }, 'How to play'),
    );
    const credit = el('div', { class: 'credit' }, 'An homage to a 1988 classic. Not affiliated with any rights holder.');
    g.overlay.append(menu, credit);
    menu.querySelector('button')?.focus();
  }

  update(dt) { this.t += dt; }

  render(g) {
    g.fillStyle = P.black;
    g.fillRect(0, 0, 320, 180);
    for (const s of this.stars) {
      const x = (s.x - this.t * 6 * s.z + 320) % 320;
      g.fillStyle = s.c;
      g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 2 * s.z + s.x));
      g.fillRect(Math.floor(x), Math.floor(s.y), s.z > 0.85 ? 2 : 1, 1);
    }
    g.globalAlpha = 1;
    // Ringed planet.
    const cx = 248, cy = 118;
    g.strokeStyle = P.neonViolet;
    g.beginPath(); g.ellipse(cx, cy, 62, 12, -0.25, Math.PI, Math.PI * 2); g.stroke();
    for (let y = -36; y <= 36; y++) {
      const w = Math.round(Math.sqrt(36 * 36 - y * y));
      const band = Math.floor((y + 36) / 9);
      g.fillStyle = [P.purpleD, P.purple, P.neonViolet, P.purple, P.purpleD, P.nightL, P.purpleD, P.night, P.night][band];
      g.fillRect(cx - w, cy + y, w * 2, 1);
      g.fillStyle = P.night;
      g.fillRect(cx + Math.round(w * 0.35), cy + y, Math.round(w * 0.65), 1);
    }
    g.strokeStyle = P.neonPink;
    g.beginPath(); g.ellipse(cx, cy, 62, 12, -0.25, 0, Math.PI); g.stroke();
    // Horizon grid.
    g.strokeStyle = 'rgba(255,79,216,0.35)';
    for (let i = 0; i < 6; i++) { const y = 150 + i * i * 1.2; g.beginPath(); g.moveTo(0, y); g.lineTo(320, y); g.stroke(); }
    // Title.
    const tw = this.titleArt.width;
    const bob = Math.round(Math.sin(this.t * 1.5) * 1.5);
    g.drawImage(this.titleArt, Math.round(160 - tw / 2), 34 + bob);
    const sub = this.game.data.names.subtitle.toUpperCase();
    drawText(g, sub, Math.round(160 - textWidth(sub) / 2), 64, P.neonCyan, 1);
  }
}
