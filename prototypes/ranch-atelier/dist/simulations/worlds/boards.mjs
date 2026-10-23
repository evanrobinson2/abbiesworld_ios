// AW-STUDY-0048 round 2: which overall board is shown, and how people make new ones.
// A board is the whole tile world a player builds (the thing card-library.js saves under its own id). Today the sandbox
// keeps one pointer ('current') to one saved board; boards are already stored by id, so more than one is a library
// plus a pointer. Land is a separate axis: the same tiles can stand on the Ranch floor or in the Basin (?world=basin).
// Pure functions, no drawing. Boards are never overwritten or deleted by one tap: a copy keeps where it came from,
// and "archive" moves a board to the attic where restore brings it back (change requests make a new version).
export const LANDS = {ranch: {name: 'The Ranch'}, basin: {name: 'The Basin'}, town: {name: "Abbie's Town"}, moon: {name: 'Moon base'}};
export const TILE_KINDS = ['meadow', 'trees', 'pond', 'barn', 'field', 'path'];
export const MAX_NAME = 32;

// axial hex spiral: 0 is the centre, then rings of 6, 12, ... in a fixed order, so board slots keep their place
export function spiral(n) {
 const out = [{q: 0, r: 0}], dirs = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
 for (let k = 1; out.length < n; k++) { let q = 0, r = -k; for (const d of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) for (let i = 0; i < k; i++) { out.push({q, r}); q += d[0]; r += d[1]; } }
 return out.slice(0, n);
}
const key = (q, r) => q + ',' + r;
const uid = lib => 'board-' + (lib.seq + 1);

export function newLibrary() {
 const ranch = {id: 'board-1', name: 'Our ranch', land: 'ranch', made: 'seed', from: null, revision: 1, cells: {'0,0': 'barn', '1,0': 'meadow', '0,1': 'trees', '-1,1': 'pond', '-1,0': 'meadow', '0,-1': 'field'}};
 return {seq: 1, current: ranch.id, boards: [ranch], attic: []};
}
const find = (lib, id) => lib.boards.find(b => b.id === id);
const uniqueName = (lib, base) => { const names = new Set([...lib.boards, ...lib.attic].map(b => b.name)); let n = base, i = 2; while (names.has(n)) n = base + ' ' + i++; return n; };
export const cleanName = s => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

// Start a new board: blank (just a clearing), a copy of one you have (never changes the original), or a land with no tiles.
export function newBoard(lib, {name, land = 'ranch', from = null} = {}) {
 if (!LANDS[land]) throw Error('Unknown land');
 const src = from && find(lib, from); if (from && !src) throw Error('Nothing to copy');
 const base = cleanName(name) || (src ? 'Copy of ' + src.name : 'A place of your own');
 const b = {id: uid(lib), name: uniqueName(lib, base), land: src ? src.land : land, made: src ? 'copy' : 'blank', from: src?.id ?? null, revision: 1, cells: src ? {...src.cells} : {}};
 return {...lib, seq: lib.seq + 1, current: b.id, boards: [...lib.boards, b]};
}
export function switchTo(lib, id) { if (!find(lib, id)) throw Error('That board is in the attic or gone'); return {...lib, current: id}; }
export function rename(lib, id, name) {
 const n = cleanName(name); if (!n) throw Error('A board needs a name'); if (lib.boards.some(b => b.id !== id && b.name === n)) throw Error('Another board has that name');
 return {...lib, boards: lib.boards.map(b => b.id === id ? {...b, name: n, revision: b.revision + 1} : b)};
}
export function place(lib, id, q, r, kind) {
 if (kind !== null && !TILE_KINDS.includes(kind)) throw Error('Unknown tile');
 return {...lib, boards: lib.boards.map(b => { if (b.id !== id) return b; const cells = {...b.cells}; kind === null ? delete cells[key(q, r)] : cells[key(q, r)] = kind; return {...b, cells, revision: b.revision + 1}; })};
}
// Never the last board; the next board to show is the one before it in the library.
export function archive(lib, id) {
 const i = lib.boards.findIndex(b => b.id === id); if (i < 0) throw Error('No such board'); if (lib.boards.length === 1) throw Error('Keep at least one board');
 const boards = lib.boards.filter(b => b.id !== id);
 return {...lib, boards, attic: [...lib.attic, lib.boards[i]], current: lib.current === id ? boards[Math.max(0, i - 1)].id : lib.current};
}
export function restore(lib, id) {
 const b = lib.attic.find(x => x.id === id); if (!b) throw Error('Not in the attic');
 return {...lib, attic: lib.attic.filter(x => x.id !== id), boards: [...lib.boards, {...b, name: uniqueName({...lib, attic: []}, b.name)}], current: id};
}
// The zoomed-out view: every board is one hex of a bigger hex board, the current one in the middle, plus one open slot.
export function overview(lib) {
 const order = [lib.boards.find(b => b.id === lib.current), ...lib.boards.filter(b => b.id !== lib.current)], slots = spiral(order.length + 1);
 return {boards: order.map((b, i) => ({id: b.id, ...slots[i]})), openSlot: slots[order.length]};
}
// What the saved pointer needs: the library is a list of ids; the existing 'current' pointer stays the single source of "shown".
export const pointerOf = lib => ({key: 'current', id: lib.current});
export const tileCount = b => Object.keys(b.cells).length;
// The stable map of boards: each board keeps its slot (by order made), so the world does not reshuffle when you switch.
export function layout(lib) { const s = spiral(lib.boards.length + 1); return {boards: lib.boards.map((b, i) => ({id: b.id, ...s[i]})), openSlot: s[lib.boards.length]}; }

// Worlds in orbs (Evan, 2026-10-23, from the Inspiring Shaders study #11: "a fun unlock to a new world"). A new world can
// arrive as a glowing orb: earned or found, carried in the backpack, and opened by stepping into it. Opening an orb makes a
// new board on the orb's land (made: 'orb') and shows it; the orb is used up. Orbs never replace or change a board.
export function earnOrb(lib, {land = 'ranch', name, why = 'found'} = {}) {
 if (!LANDS[land]) throw Error('Unknown land');
 const orbs = lib.orbs || [], id = 'orb-' + (orbs.length + (lib.opened || 0) + 1);
 return {...lib, orbs: [...orbs, {id, land, name: cleanName(name) || LANDS[land].name, why}]};
}
export function openOrb(lib, id) {
 const o = (lib.orbs || []).find(x => x.id === id); if (!o) throw Error('No such orb');
 const next = newBoard({...lib}, {name: o.name, land: o.land}), b = next.boards.at(-1);
 return {...next, orbs: lib.orbs.filter(x => x.id !== id), opened: (lib.opened || 0) + 1, boards: next.boards.map(x => x === b ? {...b, made: 'orb', orb: o.id} : x)};
}
