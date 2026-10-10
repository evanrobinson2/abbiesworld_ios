// Modal dialogs: pause menu, help, deck editor, booster picker.

import { el, artImg } from './dom.js';
import * as assets from '../gfx/registry.js';
import { buildDeck, openBooster as rollBooster, addToCollection, toggleInDeck, partyCards } from '../core/cards.js';

function show(game, box, { closable = true } = {}) {
  game.modal.innerHTML = '';
  game.modal.hidden = false;
  game.modal.dataset.closable = closable ? '1' : '';
  game.modal.append(box);
  box.querySelector('button')?.focus();
}

export function closeModal(game) {
  game.modal.hidden = true;
  game.modal.innerHTML = '';
  const next = game.modalQueue?.shift();
  if (next) next();
}

export function openMenu(game) {
  show(game, el('div', { class: 'menu-box' },
    el('h2', {}, 'Paused'),
    el('button', { onclick: () => { game.save(); closeModal(game); } }, 'Save game'),
    el('button', { onclick: () => { closeModal(game); game.continueGame(); } }, 'Load last save'),
    el('button', { onclick: () => { closeModal(game); game.openDeck(); } }, 'Deck'),
    el('button', { onclick: () => { closeModal(game); game.showHelp(); } }, 'How to play'),
    el('button', { onclick: () => { closeModal(game); game.titleScreen(); } }, 'Quit to title'),
    el('button', { onclick: () => closeModal(game) }, 'Resume (Esc)'),
  ));
}

export function showHelp(game) {
  show(game, el('div', { class: 'menu-box help' },
    el('h2', {}, 'How to play'),
    el('p', {}, 'Map: click a hex to move your squad figurine. Click the town hex (or stand on it and press Enter) to go in.'),
    el('p', {}, 'Town: click any labelled place to visit it. People and places talk in story panels; pick a numbered choice (or press 1-9).'),
    el('p', {}, 'Battles: see "Rules ?" on the battle screen. Esc opens the menu (save, load, deck).'),
    el('button', { onclick: () => closeModal(game) }, 'Close'),
  ));
}

export function showBattleHelp(game) {
  show(game, el('div', { class: 'menu-box help' },
    el('h2', {}, 'Card battle rules'),
    el('p', {}, 'Each round you draw up to 5 cards. Play as many as you like, one at a time, then End turn. Unplayed cards are discarded; your deck reshuffles when it runs out.'),
    el('p', {}, 'Heat is your budget. Every card shows the heat it adds. At the end of each round your heat sinks cool you. Heat 8+ makes shots harder. End a round above the red line (20) and the excess damages your centre torso; reach 30 and you shut down and lose a turn. Vent cards cool you at once.'),
    el('p', {}, 'Hit chance: each attack shows its odds before you play it. It is the 2d6 target number from range, your movement, the target\'s movement, your heat and your Gunnery (Piloting for fists and kicks). Aim makes the next shot easier; Evasive Step makes the enemy\'s shots harder. Every shot rolls two dice on screen.'),
    el('p', {}, 'Move cards (Advance, Withdraw, Charge, Evasive Step) change the range; one per round. Fists and kicks need range 1. The referee calls the bout when a mech is down to half armour, or loses its head or centre-torso armour.'),
    el('p', {}, 'Boosters: win fights or buy packs at the arms dealer. A pack has 3 cards; keep the ones you want and put them in your deck from the Deck screen.'),
    el('button', { onclick: () => closeModal(game) }, 'Back to the fight'),
  ));
}

function cardTile(game, id, extra = {}) {
  const c = game.data.cards.cards[id];
  return el('div', { class: `card-tile ${c.rarity}` },
    artImg(assets.get(c.art), 'card-art'),
    el('div', {}, el('b', {}, c.name), ` +${c.heat} heat, ${c.rarity}`),
    el('div', { class: 'small' }, c.text),
    extra.control || null);
}

export function openDeck(game) {
  const s = game.state;
  const cd = game.data.cards;
  const base = buildDeck(game.data.mechs.mechs[s.mech], s.party[0].skills, cd, { extras: partyCards(s) });
  const counts = {};
  for (const id of base) counts[id] = (counts[id] || 0) + 1;
  const render = () => {
    const inDeck = (s.collection || []).filter(c => c.inDeck).length;
    show(game, el('div', { class: 'menu-box deck' },
      el('h2', {}, `Deck: ${base.length + inDeck} cards`),
      el('p', {}, `Base deck from your ${game.mechLabel(s.mech)}'s weapons, basics, your skills and your party:`),
      el('div', { class: 'deck-base' }, ...Object.entries(counts).map(([id, n]) => el('span', {}, `${n}x ${cd.cards[id].name}`))),
      el('p', {}, `Booster cards (${inDeck}/${cd.maxExtras} in deck). Click to add or remove:`),
      (s.collection || []).length
        ? el('div', { class: 'deck-grid' }, ...s.collection.map((c, i) => cardTile(game, c.id, {
          control: el('button', { onclick: () => { if (!toggleInDeck(s, i, cd.maxExtras)) game.toast('Deck extras are full'); render(); } }, c.inDeck ? 'In deck: remove' : 'Add to deck'),
        })))
        : el('p', {}, 'No booster cards yet. Win a fight or buy a pack at the arms dealer.'),
      el('button', { onclick: () => { closeModal(game); game.refreshStatus(); } }, 'Done'),
    ));
  };
  render();
}

// Open n boosters one after another; each lets you keep 1 to 3 cards.
export function openBoosterModal(game, n = 1, onDone) {
  const cd = game.data.cards;
  const pack = rollBooster(cd, Math.random);
  const keep = new Set([0, 1, 2]);
  const render = () => {
    show(game, el('div', { class: 'menu-box booster' },
      el('h2', {}, 'Booster pack'),
      el('p', {}, 'Three new cards. Keep the ones you want (at least one); kept cards go into your deck while there is room.'),
      el('div', { class: 'deck-grid' }, ...pack.map((id, i) => cardTile(game, id, {
        control: el('button', { class: keep.has(i) ? 'on' : '', onclick: () => { if (keep.has(i) && keep.size > 1) keep.delete(i); else keep.add(i); render(); } }, keep.has(i) ? 'Keep' : 'Leave'),
      }))),
      el('button', {
        onclick: () => {
          if (game.state) addToCollection(game.state, [...keep].map(i => pack[i]), cd.maxExtras);
          game.toast(`${keep.size} card${keep.size > 1 ? 's' : ''} added`);
          closeModal(game);
          game.refreshStatus();
          if (n > 1) openBoosterModal(game, n - 1, onDone);
          else onDone?.();
        },
      }, `Take ${keep.size}`),
    ), { closable: false });
  };
  render();
}

