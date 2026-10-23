// The Effect Hunt as a line in the demo's paper notebook (simulations/demo/missions.mjs). This file runs in the DEMO page and
// imports no three.js: the real work happens in town-mount.mjs, imported inside the town's own frame so it shares the town's
// three. Selecting the line shows a laser beacon over every hidden effect; the kart button drives the jet cart.
import {EFFECTS, found} from './effects.mjs';

const frameOf = stage => stage.canvas.ownerDocument.defaultView;
const loadIn = (win, file) => new win.Function('u', 'return import(u)')(new URL('/simulations/effect-hunt/' + file, win.location.href).href);
let beacons = null, running = null;

export const HUNT_MISSION = {
 id: 'effect-hunt', charmIcon: '🛒', title: 'The Effect Hunt', line: 'Ten effects are hidden around town. Follow the beams in a jet cart.', icon: '🛒', charm: 'effects', tint: '#7fe4ff', at: 'common', beacon: false,
 done: () => found().size >= EFFECTS.length,
 progress: () => [found().size, EFFECTS.length],
 // the notebook line was tapped: beams into the sky over each effect you have not found yet
 async onSelect(stage) { if (beacons || running) return; const w = frameOf(stage), m = await loadIn(w, 'town-mount.mjs'); if (!beacons && !running) beacons = m.showBeacons({stage: w.AbbieTown.stage}); },
 onDeselect() { beacons?.dispose(); beacons = null; },
 // the kart button: close the notebook, drop into the cart; the overhead button starts the same hunt from the sky
 drive(mission, stage) { return start(stage, 'cart'); },
 overhead(mission, stage) { return start(stage, 'god'); }
};

async function start(stage, mode) {
 if (running) return; const w = frameOf(stage); const m = await loadIn(w, 'town-mount.mjs'); beacons?.dispose(); beacons = null;
 stage.lock(true); stage.shift?.(0); for (const id of ['dock', 'chest']) { const el = document.getElementById(id); if (el) el.hidden = true; }
 running = m.mountHunt({stage: w.AbbieTown.stage, doc: w.document, mode, onExit() { running?.dispose(); running = null; stage.lock(false); document.getElementById('pin')?.click(); }});
}
