// Presentation layer: the two layers that never mix (CLAUDE.md, "How Abbie's World shows information").
// World layer: in-fiction things. Characters, the simulation, AI directors and the voice `look` perceive only these.
// Presentation layer: HUD, spatial cues, labels, selection, debug, tools. Drawn for the player, invisible to perception.
// Also holds the scene information manifest: each scene volunteers what it knows and how it could be shown.

export const PRESENTATION_CHANNEL = 31; // THREE.Layers channel; world objects stay on channel 0
export const MODES = ['none', 'diegetic', 'spatial', 'meta', 'overlay'];
// Who the information is for. 'player' is the child playing; 'grown-up' is the parent or owner view (the workbench,
// a ledger), never drawn over play. Example: the coffee shop's income statement is for grown-ups; Abbie never sees
// it, but Evan sees she spent $5K on a new espresso machine. The child feels the same fact in the world.
export const AUDIENCES = ['player', 'grown-up', 'director'];

// Put a three.js object (and its children) on the presentation layer. Returns the object, so
// `scene.add(presentation(new T.BoxHelper(root)))` reads naturally. `purpose` says why it exists.
export function presentation(object, {purpose = 'cue', developer = false} = {}) {
  object.traverse(o => {
    o.layers.set(PRESENTATION_CHANNEL);
    o.userData.layer = 'presentation';
    o.userData.presentationPurpose = purpose;
    if (developer) o.userData.developerOnly = true;
  });
  return object;
}

// Engine helpers (axes, grids, boxes, gizmos) are developer-only: hidden unless developer mode is on.
export function developerHelper(object, isDeveloper) {
  presentation(object, {purpose: 'developer', developer: true});
  object.visible = !!isDeveloper();
  return object;
}

export const isPresentation = o => o?.userData?.layer === 'presentation' || o?.layers?.isEnabled?.(PRESENTATION_CHANNEL) && !o.layers.isEnabled(0);
export const isWorld = o => !!o && !isPresentation(o);

// The player's camera sees both layers; call once per player camera.
export function playerCamera(camera) { camera.layers.enable(0); camera.layers.enable(PRESENTATION_CHANNEL); return camera; }

// Render what a character would see: world layer only. Use for every AI capture (`look`, director snapshots).
export function renderWorldOnly(renderer, scene, camera) {
  const mask = camera.layers.mask;
  camera.layers.set(0);
  renderer.render(scene, camera);
  camera.layers.mask = mask;
  return renderer.domElement;
}

// Filter plain entity records before they reach any perception summary (voice controller, directors, Oracle).
// Drops presentation entities, hidden things and marker shapes that only exist to point at something.
const MARKERS = new Set(['ring', 'empty', 'marker', 'gizmo', 'helper', 'label']);
export function perceivable(entities = []) {
  return entities.filter(e => e && e.layer !== 'presentation' && e.visible !== false && !MARKERS.has(e.type) && !e.developerOnly);
}

// ---- Scene information manifest -------------------------------------------------------------
// A scene volunteers the information it has, so any UI, bot or the voice controller can choose how
// to show it. Spec: docs/design/INFO_MANIFEST.md. Shape of one item:
// {id, says, kind: 'level'|'count'|'state'|'event'|'list'|'timer'|'place'|'ledger', who: 'characters'|'player',
//  for: ['player'|'grown-up'|'director'],
//  read(): value, prefer: [mode...], ways: {diegetic, spatial, meta, overlay, none}, glyph: '<svg…>' | vector}
const manifests = new Map();
const listeners = new Set();

export function validateItem(item) {
  const problems = [];
  if (!item?.id) problems.push('missing id');
  if (!item?.says) problems.push(`${item?.id}: missing says (what a player would call it)`);
  if (!['characters', 'player'].includes(item?.who)) problems.push(`${item?.id}: who must be characters or player (how would the character know?)`);
  const audience = item?.for || ['player'];
  for (const a of audience) if (!AUDIENCES.includes(a)) problems.push(`${item?.id}: unknown audience ${a}`);
  const prefer = item?.prefer || [];
  if (!prefer.length) problems.push(`${item?.id}: prefer at least one mode`);
  for (const m of prefer) if (!MODES.includes(m)) problems.push(`${item?.id}: unknown mode ${m}`);
  for (const m of prefer) if (m !== 'none' && !item?.ways?.[m]) problems.push(`${item?.id}: prefers ${m} but has no ways.${m}`);
  if (item?.who === 'characters' && prefer[0] === 'overlay') problems.push(`${item?.id}: characters know it, so lead with diegetic or none, not overlay`);
  if (audience.length === 1 && audience[0] === 'grown-up' && prefer.some(m => m !== 'overlay' && m !== 'none')) problems.push(`${item?.id}: grown-up only, so it lives in the grown-up view (overlay), not in the world`);
  return problems;
}

export function volunteer(sceneId, {place, dialect, items = []}) {
  const problems = items.flatMap(validateItem);
  if (problems.length && typeof console !== 'undefined') console.warn(`[info manifest] ${sceneId}:`, problems.join('; '));
  manifests.set(sceneId, {sceneId, place, dialect, items});
  for (const fn of listeners) fn(sceneId);
  return {problems, withdraw: () => { manifests.delete(sceneId); for (const fn of listeners) fn(sceneId); }};
}

// What a consumer reads: every item with its current value, ready to pick a mode.
export function readManifest(sceneId, {audience} = {}) {
  const list = sceneId ? [manifests.get(sceneId)].filter(Boolean) : [...manifests.values()];
  return list.map(m => ({...m, items: m.items.filter(i => !audience || (i.for || ['player']).includes(audience)).map(({read, ...item}) => {
    let value; try { value = read?.(); } catch (e) { value = {error: String(e.message || e)}; }
    return {...item, value};
  })}));
}

export const onManifestChange = fn => (listeners.add(fn), () => listeners.delete(fn));

if (typeof window !== 'undefined') window.RanchInfo = {volunteer, read: readManifest, onChange: onManifestChange, modes: MODES, audiences: AUDIENCES};
