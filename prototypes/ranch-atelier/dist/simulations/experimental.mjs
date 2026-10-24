// The experimental switch (CLAUDE.md, "Nothing goes live without a scene and a test run"). A game entry in
// game-registry.json is `live` (a real scene in the world, plus a passing headless-Chrome run in CI) or `experimental`.
// Experimental entries stay out of the live town: they open only with ?exp=<id> (or ?exp=all), or in developer mode.
// Everything that mounts a game on abbies.world asks live('<registry id>') first; unknown ids are NOT live.
// If the registry can't be read nothing counts as live: an unregistered game never mounts.
const REGISTRY = await fetch(new URL('./game-registry.json', import.meta.url)).then(r => r.json()).catch(() => ({entries: []}));

const params = () => { try { return new URLSearchParams(location.search); } catch { return new URLSearchParams(); } };
const developer = () => { try { return /[?&]dev\b/.test(location.search) || localStorage.getItem('aw-developer') === '1'; } catch { return false; } };

export const entries = REGISTRY.entries;
export const entry = id => entries.find(e => e.id === id) || null;
export const entryForGate = gate => entries.find(e => (e.scene?.gates || []).includes(gate)) || null;
// ?exp=moon-mission,carwash  or  ?exp=all
export const requested = id => { const v = (params().get('exp') || '').split(',').map(s => s.trim()); return v.includes(id) || v.includes('all'); };
export const isExperimental = id => entry(id)?.status !== 'live';
// true when the entry may show in this session: live, or experimental and asked for by name / developer mode
export const live = id => { const e = entry(id); return !!e && (e.status === 'live' || requested(id) || developer()); };
export const liveGate = gate => { const e = entryForGate(gate); return !!e && live(e.id); };
