// Townsfolk quests (Evan, 2026-10-23 23:39Z): "if you interact with people have them ask for you to help them, take on a
// task and that puts something in your back pack. when you open your back pack, THATS where you see your notebook, and in
// your notebook is a list of quests." This is the data API only. The notebook UI belongs to the Backpack thread
// (AW-STUDY-0046) and reads list(); the town calls offer() when the player talks to someone and report() as she goes.
//
//   import {offer, accept, report, list, open, done, on} from './quests.mjs';
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
 baker: {name: 'The baker', at: 'cafe', voice: 'warm and floury'},
 teacher: {name: 'The teacher', at: 'school', voice: 'bright and patient'},
 librarian: {name: 'The librarian', at: 'common', voice: 'soft, as if in a library'},
 postie: {name: 'The postie', at: 'common', voice: 'chirpy and in a hurry'},
 gardener: {name: 'The gardener', at: 'common', voice: 'slow and sunny'},
 scientist: {name: 'The scientist', at: 'school', voice: 'excited, a little breathless'},
 neighbour: {name: 'A neighbour', at: 'noticeboard', voice: 'friendly and chatty'}
};

// A step is {do: 'visit' | 'collect' | 'bring', at?: spot, item?: id, to?: giver}. report() ticks one off when it matches.
// `reward` goes into the backpack through inventory().add; `charm` (optional) also hangs a charm via earnCharm.
export const TEMPLATES = [
 {id: 'bake-sugar', giver: 'baker', ask: "I'm out of sugar and the buns are waiting. Could you fetch some from the shop on the common?", thanks: 'Sweet! These buns are for you.',
  steps: [{do: 'visit', at: 'common', say: 'Find the sugar'}, {do: 'visit', at: 'cafe', say: 'Take it to the baker'}], reward: {id: 'quest-bun', name: 'Warm bun', icon: '🥐', thought: 'Mmm, still warm.'}},
 {id: 'teach-chalk', giver: 'teacher', ask: 'We have run out of chalk! Would you carry a box over from the noticeboard?', thanks: 'You saved the lesson. Take a gold star sticker.',
  steps: [{do: 'visit', at: 'noticeboard', say: 'Pick up the chalk'}, {do: 'visit', at: 'school', say: 'Bring it to the teacher'}], reward: {id: 'quest-sticker', name: 'Star sticker', icon: '🌟', thought: 'A sticker for the backpack!'}},
 {id: 'read-book', giver: 'librarian', ask: 'Someone left a book on a bench by the school. Could you bring it back before it rains?', thanks: 'Thank you. Here is a bookmark.',
  steps: [{do: 'visit', at: 'school', say: 'Find the book'}, {do: 'visit', at: 'common', say: 'Return it to the librarian'}], reward: {id: 'quest-bookmark', name: 'Bookmark', icon: '🔖', thought: 'A tiny ribbon for my notebook.'}},
 {id: 'post-letter', giver: 'postie', ask: "I'm late! Please take this letter to the café for me?", thanks: "You're quick! A stamp for your collection.",
  steps: [{do: 'visit', at: 'cafe', say: 'Deliver the letter'}], reward: {id: 'quest-stamp', name: 'Postage stamp', icon: '✉️', thought: 'Look, a tiny picture.'}},
 {id: 'garden-seeds', giver: 'gardener', ask: 'The sunflowers need seeds. The school has a jar. Could you ask for it?', thanks: 'They will be tall by summer. Have a seed packet.',
  steps: [{do: 'visit', at: 'school', say: 'Ask for the seed jar'}, {do: 'visit', at: 'common', say: 'Plant them with the gardener'}], reward: {id: 'quest-seeds', name: 'Sunflower seeds', icon: '🌻', thought: 'I will grow something.'}},
 {id: 'lab-sparkle', giver: 'scientist', ask: 'I lost my lucky magnifier! I think it is by the noticeboard. Can you look?', thanks: 'Found it! You are a real detective.',
  steps: [{do: 'visit', at: 'noticeboard', say: 'Search by the noticeboard'}, {do: 'visit', at: 'school', say: 'Give it back'}], reward: {id: 'quest-magnifier', name: 'Little magnifier', icon: '🔍', thought: 'Now I can spot tiny things.'}, charm: null},
 {id: 'neighbour-bub', giver: 'neighbour', ask: 'Have you seen a big black dog wander past? Bub does love the common.', thanks: 'There he is, wagging! Take a biscuit for the road.',
  steps: [{do: 'visit', at: 'common', say: 'Look for bub'}, {do: 'visit', at: 'noticeboard', say: 'Tell the neighbour'}], reward: {id: 'quest-biscuit', name: 'Dog biscuit', icon: '🦴', thought: 'Bub will like this.'}},
 {id: 'cafe-cup', giver: 'baker', ask: 'A cup went missing from the café window. Could you look by the noticeboard?', thanks: 'My favourite cup! Thank you.',
  steps: [{do: 'visit', at: 'noticeboard', say: 'Look for the cup'}, {do: 'visit', at: 'cafe', say: 'Carry it back'}], reward: {id: 'quest-cup', name: 'Painted cup', icon: '☕', thought: 'It has a tiny cat on it.'}}
];

const tpl = id => TEMPLATES.find(t => t.id === id);

// ---------- state ----------
// state = {taken: {questId: {at, step, stepsDone: n, doneAt?}}, offered: {giverId: questId}}
let store = typeof localStorage !== 'undefined' ? localStorage : null;
export const useStore = s => { store = s; }; // tests, or a page without localStorage
const read = () => { try { const v = JSON.parse(store?.getItem(KEY) || '{}'); return v && typeof v === 'object' ? {taken: v.taken || {}, offered: v.offered || {}} : {taken: {}, offered: {}}; } catch { return {taken: {}, offered: {}}; } };
const write = v => { try { store?.setItem(KEY, JSON.stringify(v)); } catch {} if (typeof dispatchEvent === 'function' && typeof CustomEvent === 'function') dispatchEvent(new CustomEvent(EVENT, {detail: list()})); };

const view = (t, s) => ({id: t.id, giver: t.giver, giverName: GIVERS[t.giver].name, at: GIVERS[t.giver].at, ask: t.ask, thanks: t.thanks, reward: t.reward,
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
 v.taken[id] = {at: now(), stepsDone: 0}; delete v.offered[t.giver]; write(v); return view(t, v.taken[id]);
}
// She turns a request down; the giver will ask something else next time.
export function decline(giverId) { const v = read(); if (!v.offered[giverId]) return false; delete v.offered[giverId]; write(v); return true; }
// The town reports what she did: {did: 'visit', at: 'school'}. Each open quest whose next step matches moves along.
// Returns the quests it finished, with their rewards already in the backpack.
export function report(ev, now = Date.now) {
 const v = read(), finished = []; let changed = false;
 for (const [id, s] of Object.entries(v.taken)) {
  const t = tpl(id); if (!t || s.doneAt) continue;
  const st = t.steps[s.stepsDone]; if (!st || st.do !== ev.did || (st.at && st.at !== ev.at) || (st.item && st.item !== ev.item)) continue;
  s.stepsDone++; changed = true;
  if (s.stepsDone >= t.steps.length) { s.doneAt = now(); finished.push(view(t, s)); }
 }
 if (!changed) return finished;
 write(v);
 for (const q of finished) reward(q);
 return finished;
}
async function reward(q) {
 try {
  const {inventory} = await import('./inventory.mjs');
  inventory().add({...q.reward, from: q.giverName, thought: q.reward.thought});
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
