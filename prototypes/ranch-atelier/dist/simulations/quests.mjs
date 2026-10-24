// Townsfolk quests (Evan, 2026-10-23 23:39Z): "if you interact with people have them ask for you to help them, take on a
// task and that puts something in your back pack. when you open your back pack, THATS where you see your notebook, and in
// your notebook is a list of quests." This is the data API only. The notebook UI belongs to the Backpack thread
// (AW-STUDY-0046) and reads list(); the town calls offer() when the player talks to someone and report() as she goes.
//
//   import {offer, accept, report, list, open, done, targets, on} from './quests.mjs';
//   const q = offer('baker');      // a random ask from that person (never one she has taken or finished), or null
//   accept(q.id);                  // she takes it on: it joins list() and the notebook
//   report({did: 'visit', at: 'school'});   // the town reports what she does; matching steps tick off
//   // the last step done -> the reward lands in the backpack (inventory) and 'aw-quests-change' fires
//
// Rewards are backpack items only, never coins (Evan, 20:51Z); a few also hang a charm. Asks are small, kind and
// PG, spoken in each giver's own voice (designed voices, never cloned). Presentation: the ask is a speech bubble on the
// person (spatial), the thanks is the same bubble; the list is overlay-only, in the notebook. State is local to the
// device: 'aw-quests' in localStorage, window event 'aw-quests-change'.

const KEY = 'aw-quests', EVENT = 'aw-quests-change';

// Who asks. `at` is one of the town's spots (cafe, school, common, noticeboard, lab, ...) so the town can place them.
export const GIVERS = {
 baker: {name: 'The baker', at: 'cafe', cast: 'city-baker', voice: 'warm and floury'},
 teacher: {name: 'The teacher', at: 'school', cast: 'town-teacher', voice: 'bright and patient'},
 librarian: {name: 'The librarian', at: 'common', cast: 'town-librarian', voice: 'soft, as if in a library'},
 postie: {name: 'The postie', at: 'common', cast: 'town-postie', voice: 'chirpy and in a hurry'},
 gardener: {name: 'The gardener', at: 'common', cast: 'town-gardener', voice: 'slow and sunny'},
 scientist: {name: 'The scientist', at: 'school', cast: 'town-scientist', voice: 'excited, a little breathless'},
 neighbour: {name: 'A neighbour', at: 'noticeboard', cast: 'town-neighbour', voice: 'friendly and chatty'},
 farmer: {name: 'The farmer', at: 'farm', cast: 'town-farmer', voice: 'easy and cheerful, smells of hay'}
};

// A step is {do: 'visit' | 'collect' | 'bring', at?: spot, item?: id, say}. report() ticks one off when it matches.
// Favours with an object (Issue #531): `item` is a real backpack item. A 'collect' step puts it in her backpack when she gets to
// that place; a 'bring' step takes it out of the backpack when she gets to the destination, and only ticks if she is still
// carrying it (visit the collect place again and it is handed over again). `given: true` means the giver hands it over the
// moment she says yes, so the quest starts at 'bring'. `reward` goes into the backpack through inventory().add; `charm` (optional) also hangs a charm via earnCharm.
export const TEMPLATES = [
 {id: 'bake-sugar', giver: 'baker', ask: "I'm out of sugar and the buns are waiting. Could you fetch some from the shop on the common?", thanks: 'Sweet! These buns are for you.',
  item: {id: 'quest-sugar', name: 'Bag of sugar', icon: '🍬', thought: 'Careful, it might spill.'},
  steps: [{do: 'collect', at: 'common', item: 'quest-sugar', say: 'Pick up the sugar'}, {do: 'bring', at: 'cafe', item: 'quest-sugar', say: 'Take it to the baker'}], reward: {id: 'quest-bun', name: 'Warm bun', icon: '🥐', thought: 'Mmm, still warm.'}},
 {id: 'teach-chalk', giver: 'teacher', ask: 'We have run out of chalk! Would you carry a box over from the noticeboard?', thanks: 'You saved the lesson. Take a gold star sticker.',
  item: {id: 'quest-chalk', name: 'Box of chalk', icon: '🖍️', thought: 'Lots of colours in here.'},
  steps: [{do: 'collect', at: 'noticeboard', item: 'quest-chalk', say: 'Pick up the chalk'}, {do: 'bring', at: 'school', item: 'quest-chalk', say: 'Bring it to the teacher'}], reward: {id: 'quest-sticker', name: 'Star sticker', icon: '🌟', thought: 'A sticker for the backpack!'}},
 {id: 'read-book', giver: 'librarian', ask: 'Someone left a book on a bench by the school. Could you bring it back before it rains?', thanks: 'Thank you. Here is a bookmark.',
  item: {id: 'quest-book', name: 'Library book', icon: '📖', thought: 'Somebody was halfway through this.'},
  steps: [{do: 'collect', at: 'school', item: 'quest-book', say: 'Find the book'}, {do: 'bring', at: 'common', item: 'quest-book', say: 'Return it to the librarian'}], reward: {id: 'quest-bookmark', name: 'Bookmark', icon: '🔖', thought: 'A tiny ribbon for my notebook.'}},
 {id: 'post-letter', giver: 'postie', ask: "I'm late! Please take this letter to the café for me?", thanks: "You're quick! A stamp for your collection.",
  item: {id: 'quest-letter', name: 'Sealed letter', icon: '💌', thought: 'It has the café on the front.', given: true},
  steps: [{do: 'bring', at: 'cafe', item: 'quest-letter', say: 'Deliver the letter'}], reward: {id: 'quest-stamp', name: 'Postage stamp', icon: '✉️', thought: 'Look, a tiny picture.'}},
 {id: 'garden-seeds', giver: 'gardener', ask: 'The sunflowers need seeds. The school has a jar. Could you ask for it?', thanks: 'They will be tall by summer. Have a seed packet.',
  item: {id: 'quest-seed-jar', name: 'Jar of seeds', icon: '🫙', thought: 'It rattles.'},
  steps: [{do: 'collect', at: 'school', item: 'quest-seed-jar', say: 'Ask for the seed jar'}, {do: 'bring', at: 'common', item: 'quest-seed-jar', say: 'Plant them with the gardener'}], reward: {id: 'quest-seeds', name: 'Sunflower seeds', icon: '🌻', thought: 'I will grow something.'}},
 {id: 'lab-sparkle', giver: 'scientist', ask: 'I lost my lucky magnifier! I think it is by the noticeboard. Can you look?', thanks: 'Found it! You are a real detective.',
  item: {id: 'quest-lucky-glass', name: 'Lucky magnifier', icon: '🔎', thought: 'It is warm from the sun.'},
  steps: [{do: 'collect', at: 'noticeboard', item: 'quest-lucky-glass', say: 'Search by the noticeboard'}, {do: 'bring', at: 'school', item: 'quest-lucky-glass', say: 'Give it back'}], reward: {id: 'quest-magnifier', name: 'Little magnifier', icon: '🔍', thought: 'Now I can spot tiny things.'}, charm: null},
 {id: 'neighbour-bub', giver: 'neighbour', ask: 'Bub has slipped his lead again. It will be on the common. Could you fetch it so I can catch him?', thanks: 'There he is, wagging! Take a biscuit for the road.',
  item: {id: 'quest-lead', name: "Bub's lead", icon: '🦮', thought: 'Bub will come running.'},
  steps: [{do: 'collect', at: 'common', item: 'quest-lead', say: "Find Bub's lead"}, {do: 'bring', at: 'noticeboard', item: 'quest-lead', say: 'Take it to the neighbour'}], reward: {id: 'quest-biscuit', name: 'Dog biscuit', icon: '🦴', thought: 'Bub will like this.'}},
 {id: 'cafe-cup', giver: 'baker', ask: 'A cup went missing from the café window. Could you look by the noticeboard?', thanks: 'My favourite cup! Thank you.',
  item: {id: 'quest-lost-cup', name: 'Lost cup', icon: '🫖', thought: 'It has a tiny cat on it.'},
  steps: [{do: 'collect', at: 'noticeboard', item: 'quest-lost-cup', say: 'Look for the cup'}, {do: 'bring', at: 'cafe', item: 'quest-lost-cup', say: 'Carry it back'}], reward: {id: 'quest-cup', name: 'Painted cup', icon: '☕', thought: 'It has a tiny cat on it.'}},
 {id: 'farm-eggs', giver: 'farmer', ask: 'The hens have been busy and the baker is out of eggs. Could you find a warm one and take it to the café?', thanks: 'Still warm! Have a jar of honey for the trouble.',
  steps: [{do: 'collect', at: 'farm', item: 'egg', say: 'Find an egg on the farm'}, {do: 'bring', at: 'cafe', item: 'egg', say: 'Take it to the baker'}], reward: {id: 'quest-honey', name: 'Jar of honey', icon: '🍯', thought: 'The bees made this.'}},
 {id: 'farm-pumpkin', giver: 'farmer', ask: 'The big orange pumpkins are ripe. Could you bring one to the common for the autumn display?', thanks: 'Lovely and round! A feather from the farm for you.',
  steps: [{do: 'collect', at: 'farm', item: 'pumpkin', say: 'Pick a pumpkin'}, {do: 'bring', at: 'common', item: 'pumpkin', say: 'Put it on display'}], reward: {id: 'quest-feather', name: 'Hen feather', icon: '🪶', thought: 'Soft as a cloud.'}}
];

const tpl = id => TEMPLATES.find(t => t.id === id);

// ---------- the backpack the objects live in ----------
// The favour's object is a real inventory item. Pages get the shared backpack lazily; tests hand one in with useInventory.
let inv = null;
export const useInventory = i => { inv = i; };
const pack = () => inv || (typeof window !== 'undefined' && window.AbbieInventory) || null;
if (typeof window !== 'undefined') import('./inventory.mjs').then(m => { inv ||= m.inventory(); }).catch(() => {});
const itemOf = t => t.item && {...t.item, from: GIVERS[t.giver].name};
const hand = t => { const i = itemOf(t), p = pack(); return i && p ? p.add(i) : false; };
// still carrying it? If there is no backpack on this page, the quest's own record of the pick-up stands in
const carrying = (t, s) => { const p = pack(); return p ? p.has(t.item.id) : !!s.carrying; };

// ---------- state ----------
// state = {taken: {questId: {at, step, stepsDone: n, doneAt?}}, offered: {giverId: questId}}
let store = typeof localStorage !== 'undefined' ? localStorage : null;
export const useStore = s => { store = s; }; // tests, or a page without localStorage
const read = () => { try { const v = JSON.parse(store?.getItem(KEY) || '{}'); return v && typeof v === 'object' ? {taken: v.taken || {}, offered: v.offered || {}} : {taken: {}, offered: {}}; } catch { return {taken: {}, offered: {}}; } };
const write = v => { try { store?.setItem(KEY, JSON.stringify(v)); } catch {} if (typeof dispatchEvent === 'function' && typeof CustomEvent === 'function') dispatchEvent(new CustomEvent(EVENT, {detail: list()})); };

const view = (t, s) => ({id: t.id, giver: t.giver, giverName: GIVERS[t.giver].name, at: GIVERS[t.giver].at, ask: t.ask, thanks: t.thanks, reward: t.reward,
 item: t.item && {id: t.item.id, name: t.item.name, icon: t.item.icon, carrying: !!s && !s.doneAt && !!s.carrying},
 steps: t.steps.map((st, i) => ({...st, done: i < (s?.stepsDone || 0)})), status: s?.doneAt ? 'done' : s ? 'open' : 'offered', takenAt: s?.at, doneAt: s?.doneAt});

// ---------- the API ----------
// A random ask from this giver that she hasn't taken. The same one is offered until she answers, so asking twice is not a reroll.
export function offer(giverId, rng = Math.random) {
 const v = read(), pending = v.offered[giverId];
 if (pending && !v.taken[pending] && tpl(pending)) return view(tpl(pending));
 const pool = TEMPLATES.filter(t => t.giver === giverId && !v.taken[t.id]);
 if (!pool.length) return null;
 const t = pool[Math.floor(rng() * pool.length) % pool.length];
 v.offered[giverId] = t.id; write(v); return view(t);
}
export function accept(id, now = Date.now) {
 const t = tpl(id), v = read(); if (!t || v.taken[id]) return null;
 v.taken[id] = {at: now(), stepsDone: 0}; delete v.offered[t.giver];
 if (t.item?.given) { hand(t); v.taken[id].carrying = true; } // the giver puts it in her hands as she says yes
 write(v); return view(t, v.taken[id]);
}
// She turns a request down; the giver will ask something else next time.
export function decline(giverId) { const v = read(); if (!v.offered[giverId]) return false; delete v.offered[giverId]; write(v); return true; }
// The town reports what she did: {did: 'visit', at: 'school'}. Each open quest whose next step matches moves along.
// Returns the quests it finished, with their rewards already in the backpack.
export function report(ev, now = Date.now) {
 const v = read(), finished = []; let changed = false;
 for (const [id, s] of Object.entries(v.taken)) {
  const t = tpl(id); if (!t || s.doneAt) continue;
  const st = t.steps[s.stepsDone]; if (!st) continue;
  const here = ev.did === 'visit' || ev.did === st.do; // arriving at a place is how she picks up and hands over
  if (st.item && st.do === 'bring' && !carrying(t, s)) { // she lost it: the place it came from hands it over again
   const first = t.steps.find(x => x.do === 'collect' && x.item === st.item);
   if (first && here && first.at === ev.at && hand(t)) { s.carrying = true; changed = true; }
   continue;
  }
  if (!here || (st.at && st.at !== ev.at) || (st.item && ev.item && st.item !== ev.item)) continue;
  if (st.do === 'collect') { if (!hand(t) && !pack()?.has(st.item) && pack()) continue; s.carrying = true; }
  else if (st.do === 'bring') { pack()?.remove(st.item); s.carrying = false; }
  else if (st.do !== 'visit') continue;
  s.stepsDone++; changed = true;
  if (s.stepsDone >= t.steps.length) { s.doneAt = now(); finished.push(view(t, s)); }
 }
 if (!changed) return finished;
 write(v);
 for (const q of finished) reward(q);
 return finished;
}
// Where each open favour wants her next: the place to pick the object up, or the place it belongs. For the town to light up.
export function targets() {
 const v = read(), out = [];
 for (const [id, s] of Object.entries(v.taken)) {
  const t = tpl(id); if (!t || s.doneAt) continue;
  const st = t.steps[s.stepsDone]; if (!st) continue;
  out.push({quest: id, at: st.at, do: st.do, item: st.item && t.item ? {id: t.item.id, name: t.item.name, icon: t.item.icon} : null, say: st.say, giver: t.giver, step: s.stepsDone, of: t.steps.length});
 }
 return out;
}
// The favour a backpack item belongs to: the object she is carrying for an open favour (with where she must go next), or the
// reward of a finished one (no next place). Null for anything else. For the "help me" close-up: show it, say it again, point the way.
export function forItem(itemId) {
 const v = read();
 for (const [id, s] of Object.entries(v.taken)) {
  const t = tpl(id); if (!t) continue;
  if (t.item?.id === itemId && !s.doneAt) { const st = t.steps[s.stepsDone]; return {quest: view(t, s), next: st ? {at: st.at, do: st.do, say: st.say} : null}; }
  if (t.reward.id === itemId && s.doneAt) return {quest: view(t, s), next: null};
 }
 return null;
}
async function reward(q) {
 try {
  const p = pack() || (await import('./inventory.mjs')).inventory();
  p.add({...q.reward, from: q.giverName, thought: q.reward.thought});
  const t = tpl(q.id); if (t.charm) (await import('./backpack.mjs')).earnCharm(t.charm);
 } catch {}
 if (typeof dispatchEvent === 'function' && typeof CustomEvent === 'function') dispatchEvent(new CustomEvent('aw-quest-done', {detail: q}));
}
// For the notebook: every quest she has taken, open ones first, then finished ones, newest first.
export function list() {
 const v = read();
 return Object.entries(v.taken).map(([id, s]) => tpl(id) && view(tpl(id), s)).filter(Boolean).sort((a, b) => (a.status === 'done') - (b.status === 'done') || (b.takenAt || 0) - (a.takenAt || 0));
}
export const open = () => list().filter(q => q.status === 'open');
export const done = () => list().filter(q => q.status === 'done');
export function on(fn) { const h = () => fn(list()); addEventListener(EVENT, h); return () => removeEventListener(EVENT, h); }

// The scene information manifest (docs/design/INFO_MANIFEST.md): who it is for, and how it shows.
export const MANIFEST = {id: 'quests', says: 'the favours townsfolk have asked of her', kind: 'list', who: 'player', for: ['player', 'director'],
 read: () => open().map(q => q.ask), relevant: () => open().length > 0, prefer: ['spatial', 'overlay'],
 ways: {spatial: 'a speech bubble on the person asking, and a little mark over their head while they wait', overlay: 'the notebook in the backpack: pencil on yellow ruled paper'}};
