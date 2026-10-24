// Asset packs for the project chat (AW-STUDY-0061): semantic groups of library models Evan can include or exclude, so a diorama
// is built from a chosen vocabulary rather than a random mash. Pure functions; the panel draws them, the game's generators can read allowed().
const words = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map(w => w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const ALIAS = {zombie: ['zombie', 'survival', 'wasteland', 'undead'], space: ['space', 'moon', 'starship', 'spaceship', 'lunar', 'alien'], farm: ['ranch', 'farm', 'barn', 'horse', 'cow', 'goat', 'chicken'], cozy: ['home', 'kitchen', 'furniture', 'cafe', 'coffee'], sea: ['coast', 'estuary', 'boat', 'sea', 'beach'], town: ['town', 'city', 'street', 'shop', 'market'], spooky: ['night', 'halloween', 'zombie', 'pumpkin']};
const roleOf = t => t === 'Machine and tech' ? 'Machine' : t;
// Packs: one per collection (what the model was made for), one per kind of thing, one per place.
export function buildPacks(items) {
  const packs = new Map(), add = (id, title, kind, it) => { if (!packs.has(id)) packs.set(id, {id, title, kind, keys: []}); packs.get(id).keys.push(it.key); };
  for (const it of items) { add('c:' + it.collection, it.collection, 'made for', it); add('t:' + roleOf(it.type), roleOf(it.type) === 'People' ? 'People' : roleOf(it.type) + 's', 'kind of thing', it); add('p:' + it.place, it.place, 'place', it); }
  const by = new Map(items.map(i => [i.key, i]));
  return [...packs.values()].filter(p => p.keys.length >= 3).sort((a, b) => a.kind.localeCompare(b.kind) || b.keys.length - a.keys.length).map(p => ({...p, thumbs: p.keys.slice(0, 4).map(k => by.get(k).thumb).filter(Boolean)}));
}
// "cozy kitchen", "zombies", "space": any words, matched against names, collections, places and the aliases above.
export function search(items, text, limit = 60) {
  const q = words(text); if (!q.length) return {title: '', keys: []};
  const terms = q.flatMap(w => ALIAS[w] || [w]), scored = [];
  for (const it of items) { const hay = words(`${it.name} ${it.collection} ${it.place} ${it.type}`); const s = terms.filter(t => hay.includes(t)).length; if (s) scored.push([s, it.key]); }
  scored.sort((a, b) => b[0] - a[0]); return {title: text.trim().slice(0, 40), keys: scored.slice(0, limit).map(x => x[1])};
}
// state: {include: Set(packId), exclude: Set(packId)}. Nothing included means everything; excluded always wins.
export function allowed(items, packs, state) {
  const by = new Map(packs.map(p => [p.id, new Set(p.keys)])), inc = [...state.include].filter(id => by.has(id)), exc = [...state.exclude].filter(id => by.has(id));
  const ok = new Set(inc.length ? inc.flatMap(id => [...by.get(id)]) : items.map(i => i.key)); for (const id of exc) for (const k of by.get(id)) ok.delete(k); return ok;
}
export function summary(packs, state, n, total) {
  const t = id => packs.find(p => p.id === id)?.title; return {include: [...state.include].map(t).filter(Boolean), exclude: [...state.exclude].map(t).filter(Boolean), allowed: n, of: total};
}
