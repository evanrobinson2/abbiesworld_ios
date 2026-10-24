// Charging the world effects (Evan, 2026-10-24 00:16Z): each effect icon starts greyed out. Spend one backpack item on it and
// it charges up, goes full colour and can be dropped; dropping it uses the charge. The items are picked up while driving the
// buggy around town (the kart thread calls addFuel when one is collected).
//   addFuel('ember')        a pickup went into the backpack      fuel('ember')   how many are in the backpack
//   charge('fireball')      spend one ember, true if it charged  isCharged(id)   spend(id) uses the charge up
//   onCharge(fn)            fn() whenever anything changes
export const FUEL = {fireball: 'ember', waterball: 'droplet', 'cats-dogs': 'treat', 'tie-dye': 'dye'};
export const FUEL_NAME = {ember: 'an ember', droplet: 'a droplet', treat: 'a pet treat', dye: 'a dye drop'};
const KEY = 'aw-effect-charge', EVT = 'aw-effect-charge';
const read = () => { try { return {fuel: {}, charged: {}, ...JSON.parse(localStorage.getItem(KEY) || '{}')}; } catch { return {fuel: {}, charged: {}}; } };
const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} dispatchEvent(new CustomEvent(EVT)); };

export const fuel = kind => read().fuel[kind] || 0;
export const isCharged = id => !!read().charged[id];
export function addFuel(kind, n = 1) { const s = read(); s.fuel[kind] = (s.fuel[kind] || 0) + n; write(s); return s.fuel[kind]; }
export function charge(id) { const kind = FUEL[id], s = read(); if (!kind || s.charged[id] || !(s.fuel[kind] > 0)) return false; s.fuel[kind]--; s.charged[id] = true; write(s); return true; }
export function spend(id) { const s = read(); if (!s.charged[id]) return false; delete s.charged[id]; write(s); return true; }
export const onCharge = fn => { addEventListener(EVT, fn); return () => removeEventListener(EVT, fn); };
// Practice and previews: ?fuel=1 puts one of each item in the backpack.
try { const q = new URLSearchParams(location.search).get('fuel'); if (q) for (const k of Object.values(FUEL)) if (!fuel(k)) addFuel(k, Math.max(1, +q || 1)); } catch {}
window.AWFuel = {addFuel, fuel};
