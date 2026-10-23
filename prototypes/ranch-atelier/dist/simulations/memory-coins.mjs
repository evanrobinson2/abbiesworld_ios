// The gold coins are Daddy's core memories (Evan, 2026-10-23). One count across every memory place: Grace's basement,
// the school roof, and whatever comes next. Saved in this browser until the shared player inventory lands.
const KEY = 'aw-memory-coins';
const LEGACY = {'aw-basement-coins': "Grace's basement"}; // the basement keeps its own list; count it here too

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || fallback); } catch { return JSON.parse(fallback); } }

export function coins() {
 const all = {...read(KEY, '{}')};
 for (const [key, place] of Object.entries(LEGACY)) for (const id of read(key, '[]')) all[`${place}:${id}`] ??= {place};
 return all;
}
export const count = () => Object.keys(coins()).length;
export const has = id => !!read(KEY, '{}')[id];
export function give(id, place) {
 const mine = read(KEY, '{}');
 if (mine[id]) return false;
 mine[id] = {place, at: new Date().toISOString()};
 try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch {}
 return true;
}
