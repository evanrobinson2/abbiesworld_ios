// Card battle screen. Rules live in core/battle.js; this only draws and clicks.

import * as assets from '../gfx/registry.js';
import { createBattle, handView, playCard, endTurn, tnBreakdown, describeCard } from '../core/battle.js';
import { LOCATIONS, REDLINE, SHUTDOWN, totalArmor, maxTotalArmor } from '../core/rules.js';
import { deckExtras } from '../core/cards.js';
import { drawText, textWidth } from '../gfx/font.js';
import { P } from '../gfx/palette.js';
import { el, artImg } from '../ui/dom.js';

const pct = (p) => `${Math.round(p * 100)}%`;
// Enemy art faces right like the player's; mirror the ones drawn that way.
const flipEnemy = (def, id) => def.enemy.flip ?? ['hunter', 'bulwark'].includes(id);

export class BattleScreen {
  // opts.cover: { player, enemy } terrain cover from the hex map.
  constructor(game, id, def, hero, { cover = null } = {}) {
    this.game = game;
    this.id = id;
    this.def = def;
    this.allowMenu = false;
    this.t = 0;
    this.rollAt = -10;
    this.shot = null;
    const data = { mechs: game.data.mechs.mechs, weapons: game.data.mechs.weapons, cards: game.data.cards };
    // 'active' = whatever the player is piloting now.
    const playerMech = def.player.mech === 'active' ? (game.state.mech || 'trainer_patched') : def.player.mech;
    this.b = createBattle(def, data, hero, {
      extras: deckExtras(game.state),
      cover,
      playerMech,
      labels: { player: game.mechLabel(playerMech), enemy: def.enemy.label || game.mechLabel(def.enemy.mech) },
    });
    this.focus = 0;
  }

  enter() {
    this.panel = el('div', { class: 'battle-ui' });
    this.game.overlay.append(this.panel);
    this.build();
  }

  build() {
    const b = this.b;
    const g = this.game;
    this.panel.innerHTML = '';
    if (b.over) {
      const win = b.result === 'win';
      this.panel.append(el('div', { class: 'battle-over' },
        el('div', { class: win ? 'win' : 'lose' }, win ? 'Victory: the referee calls it for you.' : 'Defeat: the bout goes to your opponent.'),
        el('div', { class: 'log' }, ...b.log.slice(-3).map(l => el('div', { class: l.who }, l.text))),
        el('button', { onclick: () => g.endBattle(this.id, this.def, b.result) }, 'Continue'),
      ));
      return;
    }
    const hand = handView(b);
    const cards = el('div', { class: 'hand' });
    hand.forEach((c, i) => {
      const odds = c.hit !== null ? `Hit ${pct(c.hit)} (needs ${c.tn}+ on 2d6)` : c.reason || '';
      const btn = el('button', {
        class: `card ${c.kind} ${c.rarity}`, disabled: !c.playable,
        onclick: () => this.play(i),
        onmouseenter: () => { this.focus = i; this.explain(); },
        onfocus: () => { this.focus = i; this.explain(); },
      },
      el('div', { class: 'card-top' }, artImg(assets.get(c.art), 'card-art'), el('span', { class: 'heat' }, c.heat ? `+${c.heat} heat` : 'no heat')),
      el('div', { class: 'card-name' }, `${i + 1}. ${c.name}`),
      el('div', { class: c.hit !== null ? 'odds' : 'reason' }, c.playable ? odds : c.reason),
      c.warning ? el('div', { class: 'warn' }, c.warning) : null);
      cards.append(btn);
    });
    if (!hand.length) cards.append(el('div', { class: 'empty' }, 'Hand empty. End your turn.'));
    this.explainEl = el('div', { class: 'explain' });
    this.panel.append(
      cards,
      el('div', { class: 'bar' },
        this.explainEl,
        el('div', { class: 'btns' },
          el('button', { class: 'end', onclick: () => this.end() }, 'End turn (E)'),
          el('button', { onclick: () => g.showBattleHelp() }, 'Rules ?')),
      ),
      el('div', { class: 'log' }, ...b.log.slice(-3).map(l => el('div', { class: l.who }, l.text))),
    );
    this.explain();
  }

  explain() {
    if (!this.explainEl) return;
    const b = this.b;
    const id = b.player.pile.hand[this.focus];
    if (!id) { this.explainEl.textContent = 'Play cards from your hand. Each one adds heat; sinks cool you at the end of the round.'; return; }
    const c = describeCard(b, b.player, id);
    let s = `${c.name}: ${c.text}`;
    if (c.hit !== null) s += ` Odds: ${tnBreakdown(b, b.player, id).map(p => `${p.label} ${p.value > 0 ? '+' : ''}${p.value}`).join(', ')} = ${c.tn}+ (${pct(c.hit)}).`;
    this.explainEl.textContent = s;
  }

  play(i) {
    const before = this.b.log.length;
    const out = playCard(this.b, i, Math.random);
    if (!out.ok) { if (out.reason) this.game.toast(out.reason); return; }
    if (out.dice) { this.rollAt = this.t; this.shot = { who: 'player', hit: out.hit }; }
    this.focus = Math.min(this.focus, this.b.player.pile.hand.length - 1);
    this.build();
    window.LH_BATTLE?.(this.b);
    if (this.b.log.length === before) return;
  }

  end() {
    if (this.b.over) return;
    endTurn(this.b, Math.random);
    if (this.b.lastRoll?.who === 'enemy') { this.rollAt = this.t; this.shot = { who: 'enemy', hit: this.b.lastRoll.hit }; }
    this.focus = 0;
    this.build();
    window.LH_BATTLE?.(this.b);
  }

  key(k, e, down) {
    if (!down) return false;
    if (this.b.over) { if (k === 'Enter' || k === ' ') this.game.endBattle(this.id, this.def, this.b.result); return true; }
    const n = parseInt(k, 10);
    if (n >= 1 && n <= 9) { this.play(n - 1); return true; }
    if (k === 'e' || k === 'E') { this.end(); return true; }
    return false;
  }

  update(dt) { this.t += dt; }

  // ---- drawing (top ~95px of the canvas; the card panel covers the rest) ----
  doll(g, x, y, mech, flip) {
    // Head, torsos, arms, legs laid out like a figure; colour = armour left.
    const layout = { H: [6, 0], LA: [0, 5], LT: [3, 5], CT: [6, 5], RT: [9, 5], RA: [12, 5], LL: [3, 11], RL: [9, 11] };
    for (const l of LOCATIONS) {
      let [cx, cy] = layout[l];
      if (flip) cx = 12 - cx;
      const a = mech.armor[l], m = mech.maxArmor[l];
      const f = m ? a / m : 0;
      const col = mech.structure[l] <= 0 ? P.ink : f > 0.66 ? P.grassL : f > 0.33 ? P.yellow : f > 0 ? P.orange : P.red;
      g.fillStyle = P.ink; g.fillRect(x + cx * 2 - 1, y + cy * 2 - 1, l === 'LL' || l === 'RL' ? 6 : 6, l === 'CT' ? 12 : 10);
      g.fillStyle = col; g.fillRect(x + cx * 2, y + cy * 2, 4, l === 'CT' ? 10 : 8);
    }
  }

  heatBar(g, x, y, w, side, label) {
    g.fillStyle = P.ink; g.fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle = P.inkSoft; g.fillRect(x, y, w, 4);
    const f = Math.min(1, side.heat / SHUTDOWN);
    g.fillStyle = side.heat > REDLINE ? P.red : side.heat >= 8 ? P.orange : P.neonCyan;
    g.fillRect(x, y, Math.round(w * f), 4);
    g.fillStyle = P.red; g.fillRect(x + Math.round(w * REDLINE / SHUTDOWN), y - 2, 1, 8);
    drawText(g, `${label} HEAT ${side.heat}  SINKS -${side.sinks}`, x, y + 6, P.silverL);
  }

  render(g) {
    const b = this.b;
    g.drawImage(assets.get(this.def.bg || 'scene.poi.field'), 0, 0, 320, 180);
    g.fillStyle = 'rgba(10,8,32,0.45)';
    g.fillRect(0, 0, 320, 94);
    // Mechs: the enemy slides closer as range drops.
    const ex = 214 - Math.round((1 - Math.min(b.range, 40) / 40) * 90);
    const recoil = (who) => (this.shot?.who === who && this.t - this.rollAt < 0.3 ? 2 : 0);
    g.drawImage(assets.get(`mech.${b.player.id}`), 44 - recoil('player'), 18, 60, 60);
    const em = assets.get(`mech.${b.enemy.id}`);
    g.save();
    if (flipEnemy(this.def, b.enemy.id)) { g.translate(ex + 60, 0); g.scale(-1, 1); g.drawImage(em, 0, 18, 60, 60); }
    else g.drawImage(em, ex, 18, 60, 60);
    g.restore();
    // Shot flash.
    if (this.shot && this.t - this.rollAt < 0.35) {
      const fromP = this.shot.who === 'player';
      g.strokeStyle = this.shot.hit ? P.fire : P.silverD;
      g.beginPath();
      g.moveTo(fromP ? 104 : ex + 8, 42);
      g.lineTo(fromP ? ex + 30 + (this.shot.hit ? 0 : 30) : 60, fromP ? 48 : (this.shot.hit ? 46 : 20));
      g.stroke();
    }
    // Range bar.
    const label = `RANGE ${b.range}   ROUND ${b.round}`;
    g.fillStyle = 'rgba(16,12,30,0.85)'; g.fillRect(160 - textWidth(label) / 2 - 3, 3, textWidth(label) + 6, 9);
    drawText(g, label, Math.round(160 - textWidth(label) / 2), 5, P.lit);
    // Names, armour, heat.
    drawText(g, b.player.label.toUpperCase(), 6, 4, P.neonCyan);
    drawText(g, `ARMOUR ${totalArmor(b.player.mech)}/${maxTotalArmor(b.player.mech)}`, 6, 11, P.silverL);
    this.doll(g, 6, 22, b.player.mech, false);
    if (b.player.cover) drawText(g, `IN COVER +${b.player.cover}`, 6, 54, P.grassL);
    if (b.enemy.cover) drawText(g, `IN COVER +${b.enemy.cover}`, 314 - textWidth(`IN COVER +${b.enemy.cover}`), 54, P.grassL);
    const en = b.enemy.label.toUpperCase();
    drawText(g, en, 314 - textWidth(en), 4, '#ff8a8a');
    const ea = `ARMOUR ${totalArmor(b.enemy.mech)}/${maxTotalArmor(b.enemy.mech)}`;
    drawText(g, ea, 314 - textWidth(ea), 11, P.silverL);
    this.doll(g, 286, 22, b.enemy.mech, true);
    this.heatBar(g, 6, 80, 110, b.player, 'YOUR');
    this.heatBar(g, 204, 80, 110, b.enemy, 'FOE');
    // The last roll, big and visible.
    const lr = b.lastRoll;
    if (lr && this.t - this.rollAt < 2.2) {
      const x = 132, y = 24;
      g.fillStyle = 'rgba(16,12,30,0.9)'; g.fillRect(x - 6, y - 4, 60, 38);
      lr.dice.forEach((d, i) => this.die(g, x + i * 16, y, d));
      drawText(g, `${lr.total} VS ${lr.tn}+`, x, y + 16, P.silverL);
      drawText(g, lr.hit ? 'HIT' : 'MISS', x, y + 24, lr.hit ? P.grassL : P.ember, 1);
    }
  }

  die(g, x, y, n) {
    g.fillStyle = P.ink; g.fillRect(x - 1, y - 1, 14, 14);
    g.fillStyle = P.white; g.fillRect(x, y, 12, 12);
    const pips = { 1: [[6, 6]], 2: [[3, 3], [9, 9]], 3: [[3, 3], [6, 6], [9, 9]], 4: [[3, 3], [9, 3], [3, 9], [9, 9]], 5: [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]], 6: [[3, 3], [9, 3], [3, 6], [9, 6], [3, 9], [9, 9]] }[n];
    g.fillStyle = P.ink;
    for (const [px, py] of pips) g.fillRect(x + px - 1, y + py - 1, 2, 2);
  }
}
