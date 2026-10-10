// The last screens: the ending with credits, and the death screen.

import * as assets from '../gfx/registry.js';
import { fill } from '../core/names.js';
import { P } from '../gfx/palette.js';
import { el } from '../ui/dom.js';

// Credits as plain data so a test can check the homage line is there.
export function creditLines(game) {
  const n = game.data.names, d = game.dict, s = game.state || { flags: {}, day: 1, party: [] };
  const cast = n.cast || {};
  const roles = [
    ['hero', 'the cadet'], ['mentor', 'the old friend'], ['doctor', 'the doctor'], ['tech', 'the tech'],
    ['prisoner', 'the prisoner'], ['tinker', 'the tinker'], ['regent', 'the Regent'], ['father', 'the Marshal'], ['rival', 'the senior cadet'],
  ];
  return [
    { h: 'THE END' },
    { p: `${n.title}` },
    { p: `${n.subtitle}` },
    { gap: 1 },
    { h: 'Featuring' },
    ...roles.filter(([k]) => cast[k]).map(([k, r]) => ({ p: `${cast[k]}, ${r}` })),
    { gap: 1 },
    { h: 'Your campaign' },
    { p: `Days on ${n.planet}: ${s.day}` },
    { p: `Battles won: ${s.flags.battles_won ?? 0}, lost: ${s.flags.battles_lost ?? 0}` },
    { p: `Lanterns gathered: ${Math.max(0, s.party.filter(p => !p.traitor).length - 1)} of 4` },
    { p: s.flags.found_father_mech ? `The Marshal's ${d.slot4} walks with you. He is out there.` : 'The hangar keeps its secret a while longer.' },
    { gap: 1 },
    { h: 'Made with' },
    { p: 'Original writing, original pixel art and original music, made for this homage.' },
    { p: 'Every name in the game comes from one small file and can be changed there.' },
    { gap: 1 },
    { p: fill('A free homage to a 1988 classic. Not affiliated with any rights holder.', d) },
    { p: 'Thank you for playing.' },
  ];
}

export class EndingScreen {
  constructor(game, text = '') {
    this.game = game;
    this.text = fill(text, game.dict);
    this.allowMenu = false;
    this.t = 0;
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.stars = Array.from({ length: 120 }, () => ({ x: rnd() * 320, y: rnd() * 180, z: 0.2 + rnd() * 0.8 }));
  }

  enter() {
    const g = this.game;
    window.LH_MUSIC?.('ending');
    const roll = el('div', { class: 'credits-roll' },
      this.text ? el('p', { class: 'credits-lede' }, this.text) : null,
      ...creditLines(g).map(l => (l.h ? el('h2', {}, l.h) : l.gap ? el('div', { class: 'gap' }) : el('p', {}, l.p))));
    g.overlay.append(
      el('div', { class: 'credits' }, roll),
      el('button', { class: 'leave-city', onclick: () => g.titleScreen() }, 'Back to the title'),
    );
  }

  update(dt) { this.t += dt; }

  render(g) {
    g.drawImage(assets.get('scene.story.ending'), 0, 0, 320, 180);
    g.fillStyle = 'rgba(8,6,24,0.55)';
    g.fillRect(0, 0, 320, 180);
    for (const st of this.stars) {
      const y = (st.y + this.t * 6 * st.z) % 180;
      g.fillStyle = st.z > 0.7 ? P.white : P.silverD;
      g.fillRect(Math.round(st.x), Math.round(y), 1, 1);
    }
  }
}

export class DeathScreen {
  constructor(game, text = '') {
    this.game = game;
    this.text = fill(text || 'The {occupiers} have you.', game.dict);
    this.allowMenu = false;
  }

  enter() {
    const g = this.game;
    window.LH_MUSIC?.('defeat');
    g.overlay.append(el('div', { class: 'menu-box death' },
      el('h2', {}, 'Your story ends here'),
      el('p', {}, this.text),
      el('button', { onclick: () => { if (!g.continueGame()) g.titleScreen(); } }, 'Load last save'),
      el('button', { onclick: () => g.titleScreen() }, 'Quit to title'),
    ));
  }

  render(g) {
    g.drawImage(assets.get('scene.story.ruins'), 0, 0, 320, 180);
    g.fillStyle = 'rgba(40,0,10,0.6)';
    g.fillRect(0, 0, 320, 180);
  }
}
