// Shared mini-game pause and exit contract (AW-113). Every mini game can be paused and exited by default.
// A game may switch either control off only through a deliberate override: a named situation, a written rationale, and an
// explicit begin and end. Nothing else (a missing handler, a forgotten flag) removes a control; the contract says so.
//
//   const mg = createMiniGameContract({id: 'grace-basement', onPause, onResume, onExit});
//   mg.pause() / mg.resume() / mg.togglePause() / mg.exit()         -> {ok, reason?}
//   mg.beginOverride({situation: 'opening-cutscene', rationale: '...', controls: ['pause', 'exit']});
//   mg.endOverride('opening-cutscene');                              // normal availability returns
//   mg.available() -> {pause, exit}; mg.overrides() -> active overrides; mg.log -> every override begin and end.

export const CONTROLS = ['pause', 'exit'];

export function createMiniGameContract({id, onPause = () => {}, onResume = () => {}, onExit = () => {}, now = () => Date.now()} = {}) {
 if (!id) throw new Error('mini game contract needs an id');
 const active = new Map(), log = [];
 let paused = false, exited = false;
 const blockedBy = control => [...active.values()].find(o => o.controls.includes(control));
 const available = () => ({pause: !exited && !blockedBy('pause'), exit: !exited && !blockedBy('exit')});
 const refuse = control => { const o = blockedBy(control); return {ok: false, reason: o ? `${control} is off during "${o.situation}": ${o.rationale}` : 'game has exited'}; };
 const api = {
  id, log,
  get paused() { return paused; }, get exited() { return exited; },
  available, overrides: () => [...active.values()],
  beginOverride({situation, rationale, controls = CONTROLS} = {}) {
   if (!situation || typeof situation !== 'string') throw new Error('an override must name its situation');
   if (!rationale || String(rationale).trim().length < 12) throw new Error(`override "${situation}" needs a design rationale`);
   if (!Array.isArray(controls) || !controls.length || controls.some(c => !CONTROLS.includes(c))) throw new Error(`override "${situation}" must list controls from ${CONTROLS.join(', ')}`);
   if (active.has(situation)) throw new Error(`override "${situation}" is already active`);
   active.set(situation, {situation, rationale, controls: [...controls], at: now()}); log.push({event: 'begin', situation, controls: [...controls], at: now()});
   return api;
  },
  endOverride(situation) {
   if (!active.delete(situation)) throw new Error(`no active override "${situation}"`);
   log.push({event: 'end', situation, at: now()}); return api;
  },
  pause() { if (!available().pause) return refuse('pause'); if (!paused) { paused = true; onPause(); } return {ok: true}; },
  resume() { if (exited) return refuse('pause'); if (paused) { paused = false; onResume(); } return {ok: true}; },
  togglePause() { return paused ? api.resume() : api.pause(); },
  exit() { if (!available().exit) return refuse('exit'); exited = true; paused = false; active.clear(); onExit(); return {ok: true}; },
 };
 return api;
}
