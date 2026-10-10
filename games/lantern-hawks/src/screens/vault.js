// The vault: a node map of rooms. Rules in core/vault.js; this draws and clicks.

import * as assets from '../gfx/registry.js';
import { vaultRoute, nodeOpen, lockedMessage } from '../core/vault.js';
import { drawText, textWidth } from '../gfx/font.js';
import { P } from '../gfx/palette.js';
import { el } from '../ui/dom.js';

const BOX_W = 58, BOX_H = 16;
const LOCK_COLOURS = { red: P.red, blue: P.blueL, yellow: P.yellow, white: P.white };

export class VaultScreen {
  constructor(game) {
    this.game = game;
    this.v = game.data.vault;
    this.allowMenu = true;
    this.hover = null;
    this.t = 0;
    const st = game.state;
    if (!st.vaultNode || !this.v.nodes[st.vaultNode]) st.vaultNode = this.v.start;
  }

  enter() {
    const g = this.game;
    window.LH_MUSIC?.('cave');
    const layer = el('div', { class: 'hotspots' });
    for (const [id, n] of Object.entries(this.v.nodes)) {
      layer.append(el('button', {
        class: 'hotspot vault-room',
        style: { left: `${(n.x * 320 - BOX_W / 2) / 3.2}%`, top: `${(n.y * 180 - BOX_H / 2) / 1.8}%`, width: `${BOX_W / 3.2}%`, height: `${BOX_H / 1.8}%` },
        title: n.label, 'aria-label': n.label,
        onclick: () => this.go(id),
        onmouseenter: () => { this.hover = id; },
        onmouseleave: () => { this.hover = null; },
      }));
    }
    const atExit = g.state.vaultNode === this.v.exit.node;
    g.overlay.append(
      layer,
      el('div', { class: 'city-name' }, this.v.title),
      el('button', { class: 'leave-city', disabled: !atExit, title: atExit ? '' : 'Walk back to the antechamber first', onclick: () => this.leave() }, atExit ? 'Leave the vault' : 'Exit: antechamber'),
      el('button', { class: 'menu-btn', onclick: () => g.openMenu() }, 'Menu'),
    );
  }

  go(id) {
    const g = this.game, st = g.state;
    const r = vaultRoute(this.v, st, st.vaultNode, id);
    window.LH_SFX?.('click');
    if (r.ok) {
      st.vaultNode = id;
      window.LH_SFX?.('door');
      g.openScene(this.v.nodes[id].scene, { kind: 'vault' });
      return;
    }
    if (r.locked) {
      st.vaultNode = r.at;
      if (r.locked.lockScene) { g.openScene(r.locked.lockScene, { kind: 'vault' }); return; }
      g.toast(lockedMessage(r.locked));
      g.setScreen(new VaultScreen(g)); // redraw at the door
      return;
    }
    g.toast(r.reason);
  }

  leave() {
    const st = this.game.state;
    st.location = 'map';
    st.pos = { q: this.v.exit.q, r: this.v.exit.r };
    this.game.save(true);
    this.game.toLocation();
  }

  update(dt) { this.t += dt; }

  render(g) {
    g.drawImage(assets.get(this.v.bg), 0, 0, 320, 180);
    g.fillStyle = 'rgba(8,6,20,0.72)';
    g.fillRect(0, 0, 320, 180);
    const st = this.game.state;
    const nodes = this.v.nodes;
    const at = (n) => ({ x: Math.round(n.x * 320), y: Math.round(n.y * 180) });
    // Corridors.
    g.lineWidth = 3;
    for (const [id, n] of Object.entries(nodes)) for (const l of n.links) {
      if (l < id) continue;
      const a = at(n), b = at(nodes[l]);
      g.strokeStyle = P.inkSoft;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    g.lineWidth = 1;
    // Rooms.
    for (const [id, n] of Object.entries(nodes)) {
      const { x, y } = at(n);
      const open = nodeOpen(n, st);
      const here = st.vaultNode === id;
      g.fillStyle = P.ink;
      g.fillRect(x - BOX_W / 2 - 1, y - BOX_H / 2 - 1, BOX_W + 2, BOX_H + 2);
      g.fillStyle = here ? P.tealD : open ? P.nightL || P.inkSoft : P.inkSoft;
      g.fillRect(x - BOX_W / 2, y - BOX_H / 2, BOX_W, BOX_H);
      if (n.lock) {
        g.fillStyle = LOCK_COLOURS[n.lock.color] || P.silver;
        g.fillRect(x - BOX_W / 2, y - BOX_H / 2, 3, BOX_H);
        if (!open) drawText(g, 'LOCKED', x - textWidth('LOCKED') / 2, y + 2, LOCK_COLOURS[n.lock.color] || P.silver);
      }
      const label = n.label.toUpperCase();
      drawText(g, label, Math.round(x - textWidth(label) / 2), y - (n.lock && !open ? 5 : 2), here ? P.lit : P.silverL);
      if (this.hover === id) { g.strokeStyle = P.lit; g.strokeRect(x - BOX_W / 2 + 0.5, y - BOX_H / 2 + 0.5, BOX_W - 1, BOX_H - 1); }
    }
    // The squad.
    const h = at(nodes[st.vaultNode]);
    const bob = Math.round(Math.sin(this.t * 4) * 1);
    g.drawImage(assets.get('fig.squad'), h.x - 8, h.y - BOX_H / 2 - 22 + bob);
  }
}
