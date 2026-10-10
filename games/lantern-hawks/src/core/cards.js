// Decks, boosters and the player's card collection. Pure.

// Base deck from a mech's loadout, plus basics, plus cards the pilot's
// skills unlock, plus any booster cards the player has put in the deck.
export function buildDeck(mechDef, skills, cardsData, { basics, extras = [] } = {}) {
  const deck = [];
  for (const w of mechDef.weapons) {
    const l = cardsData.loadout[w.w];
    if (l) for (let i = 0; i < l.perWeapon; i++) deck.push(l.card);
  }
  deck.push(...(basics ?? cardsData.basics));
  for (const sc of cardsData.skillCards) if ((skills[sc.skill] ?? 0) >= sc.gte) deck.push(sc.card);
  deck.push(...extras);
  for (const id of deck) if (!cardsData.cards[id]) throw new Error(`deck: unknown card "${id}"`);
  return deck;
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draw up to n into hand, reshuffling the discard pile when the deck runs out.
export function draw(pile, n, rng) {
  while (pile.hand.length < n) {
    if (!pile.deck.length) {
      if (!pile.discard.length) break;
      pile.deck = shuffle(pile.discard, rng);
      pile.discard = [];
    }
    pile.hand.push(pile.deck.pop());
  }
}

export function boosterPool(cardsData) {
  return Object.entries(cardsData.cards).filter(([, c]) => c.rarity !== 'base' && c.rarity !== 'party').map(([id]) => id);
}

// A booster is `size` cards, each rolled by rarity weight, then uniformly within the rarity.
export function openBooster(cardsData, rng) {
  const { size, weights } = cardsData.booster;
  const byRarity = {};
  for (const id of boosterPool(cardsData)) (byRarity[cardsData.cards[id].rarity] ??= []).push(id);
  const rarities = Object.keys(weights).filter(r => byRarity[r]?.length);
  const total = rarities.reduce((n, r) => n + weights[r], 0);
  const pack = [];
  for (let i = 0; i < size; i++) {
    let roll = rng() * total;
    let rarity = rarities[rarities.length - 1];
    for (const r of rarities) { if (roll < weights[r]) { rarity = r; break; } roll -= weights[r]; }
    const list = byRarity[rarity];
    pack.push(list[Math.floor(rng() * list.length)]);
  }
  return pack;
}

// Collection: [{ id, inDeck }]. New cards go into the deck while there is room.
export function addToCollection(state, ids, maxExtras) {
  state.collection ??= [];
  for (const id of ids) {
    const inDeck = state.collection.filter(c => c.inDeck).length < maxExtras;
    state.collection.push({ id, inDeck });
  }
}

export function toggleInDeck(state, index, maxExtras) {
  const c = state.collection?.[index];
  if (!c) return false;
  if (!c.inDeck && state.collection.filter(x => x.inDeck).length >= maxExtras) return false;
  c.inDeck = !c.inDeck;
  return true;
}

// Booster cards the player put in the deck, plus one card from each party
// member (the doctor's field repair, the tech's coolant flush, ...).
export function deckExtras(state) {
  return [...(state.collection ?? []).filter(c => c.inDeck).map(c => c.id), ...partyCards(state)];
}

export function partyCards(state) {
  return (state.party ?? []).slice(1).flatMap(p => p.cards ?? []);
}
