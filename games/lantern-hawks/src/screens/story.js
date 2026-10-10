// Story-board panel: painted background + portrait + dialogue + choices,
// all driven by the script runner (core/script.js).

import * as assets from '../gfx/registry.js';
import { P } from '../gfx/palette.js';
import { el } from '../ui/dom.js';

export class StoryScreen {
  constructor(game) {
    this.game = game;
    this.story = game.story;
    this.allowMenu = true;
    this.reveal = 0;
    this.view = this.story.view();
  }

  enter() {
    this.build();
    this.handleEvents();
  }

  build() {
    const g = this.game;
    const v = this.view = this.story.view();
    this.reveal = 0;
    g.overlay.innerHTML = '';
    if (v.title) g.overlay.append(el('div', { class: 'scene-title' }, v.title));
    this.textEl = el('div', { class: 'text' });
    const box = el('div', { class: 'dialog', onclick: (e) => { if (e.target === box || e.target === this.textEl) this.advance(); } },
      v.speaker ? el('div', { class: 'speaker' }, v.speaker) : null,
      this.textEl,
    );
    if (v.more) box.append(el('button', { class: 'more', onclick: () => this.advance() }, 'Next >'));
    else {
      const list = el('div', { class: 'choices' });
      v.choices.forEach((c, n) => {
        list.append(el('button', { disabled: !c.enabled, onclick: () => this.choose(c.index) },
          `${n + 1}. ${c.text}`, c.reason ? el('span', { class: 'why' }, c.reason) : null));
      });
      box.append(list);
    }
    this.box = box;
    g.overlay.append(box);
  }

  advance() {
    if (this.reveal < this.view.text.length) { this.reveal = this.view.text.length; return; }
    if (this.view.more) { this.story.next(); this.build(); }
  }

  choose(i) {
    if (!this.story.choose(i)) return;
    if (this.handleEvents()) return;
    this.build();
    this.game.refreshStatus();
  }

  // Returns true if the screen changed.
  handleEvents() {
    const g = this.game;
    let placed = false, exit = false, battle = null, end = null;
    for (const ev of this.story.takeEvents()) {
      if (ev.type === 'toast') g.toast(ev.text);
      else if (ev.type === 'save') g.save(true);
      else if (ev.type === 'place') placed = true;
      else if (ev.type === 'booster') g.openBooster(ev.n);
      else if (ev.type === 'battle') battle = ev;
      else if (ev.type === 'end') end = ev;
      else if (ev.type === 'mech') g.toast(`${g.mechLabel(ev.id)} joins the unit`);
      else if (ev.type === 'exit') exit = true;
    }
    g.refreshStatus();
    if (end) { g.endGame(end.kind, end.text); return true; }
    if (battle) { g.startBattle(battle.id, { cover: battle.cover }); return true; }
    if (exit) { g.leaveScene(placed); return true; }
    return false;
  }

  key(k, e, down) {
    if (!down) return false;
    if (k === 'Enter' || k === ' ') {
      if (this.view.more || this.reveal < this.view.text.length) this.advance();
      else { const first = this.view.choices.find(c => c.enabled); if (first) this.choose(first.index); }
      return true;
    }
    const n = parseInt(k, 10);
    if (n >= 1 && n <= 9 && !this.view.more) {
      const c = this.view.choices[n - 1];
      if (c?.enabled) this.choose(c.index);
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.reveal < this.view.text.length) {
      this.reveal = Math.min(this.view.text.length, this.reveal + dt * 90);
      this.textEl.textContent = this.view.text.slice(0, Math.floor(this.reveal));
    } else if (this.textEl.textContent !== this.view.text) this.textEl.textContent = this.view.text;
  }

  render(g) {
    const v = this.view;
    if (v.bg) g.drawImage(assets.get(v.bg), 0, 0, 320, 180);
    else { g.fillStyle = P.night; g.fillRect(0, 0, 320, 180); }
    if (v.portrait) {
      g.fillStyle = P.ink;
      g.fillRect(7, 7, 66, 66);
      g.drawImage(assets.get(v.portrait), 8, 8, 64, 64);
    }
  }
}
