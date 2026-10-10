// Status panel under the game screen: money, party, skills, mech, deck, goal.

import { SKILLS, SKILL_LABELS } from '../core/state.js';
import { currentBeat, objective } from '../core/progress.js';
import { buildDeck, deckExtras } from '../core/cards.js';
import { el } from './dom.js';

export function renderStatus(root, game) {
  root.innerHTML = '';
  const s = game.state;
  if (!s || game.sampleMode) return;
  const h = s.party[0];
  const deckSize = buildDeck(game.data.mechs.mechs[s.mech], h.skills, game.data.cards, { extras: deckExtras(s) }).length;
  root.append(
    el('div', {},
      el('div', {}, el('b', {}, h.name), ` Health ${h.health}/${h.maxHealth}`),
      el('div', {}, el('span', { class: 'money' }, `${s.money} C-bills`), ` Day ${s.day}`),
    ),
    el('div', {},
      el('div', { class: 'skills' }, ...SKILLS.map(k => el('span', {}, `${SKILL_LABELS[k]} `, el('b', {}, h.skills[k])))),
      el('div', { class: 'items' }, `Mech: ${game.mechLabel(s.mech)}. Weapon: ${h.weapon}${h.armor ? `, ${h.armor}` : ''}. Party: ${s.party.map(p => p.name).join(', ')}.${s.items.length ? ` Carrying: ${s.items.map(i => i.replace(/_/g, ' ')).join(', ')}.` : ''}`),
    ),
    el('div', {}, el('button', { onclick: () => game.openDeck() }, `Deck (${deckSize})`)),
    el('div', { class: 'obj' }, el('em', {}, currentBeat(s)), ` - ${objective(s)}`),
  );
}
