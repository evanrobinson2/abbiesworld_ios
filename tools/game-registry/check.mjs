// Registry gate: nothing enters the live game without a scene and a test run (CLAUDE.md). Static half; run-tests.mjs is the run half.
// Usage (repo root): node tools/game-registry/check.mjs
//  1. game-registry.json is well formed; ids are unique.
//  2. every studies/*/play.html and every town gate in ENTRANCES belongs to a registry entry (no game slips in unregistered).
//  3. a `live` entry has a real scene (gates that exist in ENTRANCES, each with a scene id), pages that exist, a test script that
//     exists and prints its pass marker, and a tour decision. An `experimental` entry says what it still needs.
//  4. an experimental entry is gated in the town page: doors by liveGate(), mounted modules by live('<id>').
//  5. HUD guard: studies/abbietown/index.html (and its template) load simulations/town-hud-boot.mjs by its own tag, once,
//     and never mount the HUD inline. Twice a merge dropped it and the old bottom bar came back (2026-10-24).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ROOT = process.cwd();
const DIST = 'prototypes/ranch-atelier/dist';
const TOWN = `${DIST}/studies/abbietown/index.html`;
const TEMPLATE = 'docs/oracle/abbietown/abbietown.template.html';
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const errors = [], warnings = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

const reg = JSON.parse(read(`${DIST}/simulations/game-registry.json`));
const entries = reg.entries || [];
const ids = new Set();
for (const e of entries) {
  if (!e.id || ids.has(e.id)) fail(e.id || '(no id)', 'missing or duplicate id');
  ids.add(e.id);
  if (!['minigame', 'feature'].includes(e.kind)) fail(e.id, `kind must be minigame or feature, not ${e.kind}`);
  if (!['live', 'experimental'].includes(e.status)) fail(e.id, `status must be live or experimental, not ${e.status}`);
  if (!e.name || !e.owner) fail(e.id, 'needs a name and an owner');
  if (typeof e.tour !== 'boolean') fail(e.id, 'needs "tour": true or false (the tour rule)');
}

// 2. nothing unregistered
const claimedPages = new Set(entries.flatMap(e => e.pages || []));
const playPages = fs.readdirSync(path.join(ROOT, DIST, 'studies')).map(d => `studies/${d}/play.html`).filter(p => exists(`${DIST}/${p}`));
for (const p of playPages) if (!claimedPages.has(p)) fail(p, 'a playable page with no registry entry. Add it to game-registry.json (experimental until it has a scene and a run).');
const {ENTRANCES} = await import(pathToFileURL(path.join(ROOT, DIST, 'simulations/abbietown/entrances.mjs')).href);
const claimedGates = new Map();
for (const e of entries) for (const g of e.scene?.gates || []) claimedGates.set(g, e);
for (const g of Object.keys(ENTRANCES)) if (!claimedGates.has(g)) fail(g, 'a town gate with no registry entry.');

// 3. live and experimental rules
const town = read(TOWN);
for (const e of entries) {
  for (const p of e.pages || []) if (!exists(`${DIST}/${p}`)) fail(e.id, `page ${p} does not exist`);
  if (e.status === 'live') {
    const gates = e.scene?.gates || [];
    if (!gates.length && e.scene?.stage !== 'town') fail(e.id, 'live without a scene: scene.gates must name a town gate (ENTRANCES) the player can stand at, or scene.stage "town" for a feature mounted on the Winchester board.');
    for (const g of gates) { if (!ENTRANCES[g]) fail(e.id, `gate ${g} is not in ENTRANCES`); else if (!ENTRANCES[g].scene) fail(e.id, `gate ${g} has no scene id`); }
    const t = e.test;
    if (!t?.script || !t.marker) fail(e.id, 'live without a test run: test.script and test.marker are required.');
    else if (!exists(t.script)) fail(e.id, `test script ${t.script} does not exist`);
    else { const src = read(t.script); if (!src.includes(t.marker) && !(t.marker.startsWith('GAME-TEST PASS') && src.includes('GAME-TEST PASS'))) fail(e.id, `test script never prints "${t.marker}"`); }
  } else {
    if (!(e.needs || []).length) fail(e.id, 'experimental entries list what they still need ("needs").');
    if ((e.scene?.gates || []).length && !/liveGate\(/.test(town)) fail(e.id, 'the town page does not check liveGate() before opening a gate');
    const mod = e.scene?.module && e.scene.module.replace(/^simulations\//, '');
    if (mod) for (const line of town.split('\n')) if (line.includes(mod) && /\bimport\(/.test(line) && !line.includes(`live('${e.id}')`)) fail(e.id, `the town mounts ${mod} without checking live('${e.id}')`);
  }
}

// 5. HUD guard
for (const [file, label] of [[TOWN, 'live town page'], [TEMPLATE, 'town template']]) {
  const html = read(file);
  const tags = html.match(/<script[^>]+type="module"[^>]+src="\/simulations\/town-hud-boot\.mjs[^"]*"[^>]*><\/script>/g) || [];
  if (tags.length !== 1) fail('town-hud-boot', `${label} (${file}) must load simulations/town-hud-boot.mjs with its own <script type="module" src> tag exactly once; found ${tags.length}. A merge dropped it before and the old bottom bar came back.`);
  if (/mountTownHud\s*\(/.test(html)) fail('town-hud-boot', `${label} (${file}) mounts the HUD inline. It starts only from town-hud-boot.mjs.`);
}
const boot = read(`${DIST}/simulations/town-hud-boot.mjs`);
if (!/mountTownHud\s*\(/.test(boot)) fail('town-hud-boot', 'simulations/town-hud-boot.mjs no longer calls mountTownHud');

// report
const live = entries.filter(e => e.status === 'live'), exp = entries.filter(e => e.status === 'experimental');
console.log(`game registry: ${live.length} live (${live.map(e => e.id).join(', ')}), ${exp.length} experimental (${exp.map(e => e.id).join(', ')})`);
if (errors.length) { console.error('\nFAILED:\n' + errors.map(m => ' - ' + m).join('\n')); process.exit(1); }
console.log('ok');
