// AW-STUDY-0013: the café's secret. A brass key lies in the cash register's coin tray (model cafe-cash-register, part
// `basement_key`, tag pickup=cafe-basement-key). Abbie picks it up, her inner voice says the line below, and it goes in
// her inventory. The old door behind the bar (model cafe-basement-door, tag lock=cafe-basement-key) then opens onto
// Grace's basement. The basement thread reads localStorage 'aw-basement-unlocked' and ?from=cafe.
//
// The inventory itself (the pocket under the top bubble, the thought bubble and the voice) belongs to
// /simulations/inventory.mjs. Until that ships, a tiny shim with the same calls keeps the key in the same storage key.

export const KEY = {id: 'cafe-basement-key', name: 'Brass key', icon: '🗝️', from: 'cafe',
 thought: 'Interesting... this key will come in handy.'};
export const BASEMENT = {url: '/studies/basement/play.html?from=cafe', storage: 'aw-basement-unlocked'};

function shim() {
 const K = 'aw-inventory';
 const read = () => { try { return JSON.parse(localStorage.getItem(K) || '[]'); } catch { return []; } };
 const write = list => { try { localStorage.setItem(K, JSON.stringify(list)); } catch {} window.dispatchEvent(new CustomEvent('aw-inventory-change', {detail: list})); };
 return {
  add(item) { const l = read(); if (l.some(i => i.id === item.id)) return false; const it = {...item, at: Date.now()}; write([...l, it]); return it; },
  has: id => read().some(i => i.id === id),
  remove(id) { write(read().filter(i => i.id !== id)); },
  list: read,
  on(fn) { const h = () => fn(read()); window.addEventListener('aw-inventory-change', h); return () => window.removeEventListener('aw-inventory-change', h); }
 };
}

let inv = null;
export async function inventory() {
 if (inv) return inv;
 try { const m = await import('/simulations/inventory.mjs'); inv = m.inventory(); } catch { inv = shim(); }
 return inv;
}

// Abbie opens the register drawer and takes the key. Returns the item, or false if she already has it.
export async function takeKey() { return (await inventory()).add({...KEY}); }

// Abbie tries the old door. Without the key it stays shut (the caller rattles the handle); with it, the door opens.
export async function tryBasementDoor({go = true} = {}) {
 if (!(await inventory()).has(KEY.id)) return false;
 try { localStorage.setItem(BASEMENT.storage, '1'); } catch {}
 if (go) location.href = BASEMENT.url;
 return true;
}
