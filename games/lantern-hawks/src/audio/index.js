// Lantern Hawks audio: the public hooks.
//   window.LH_SFX(name, delaySec?)  laser missile autocannon hit explode kick vent card click alarm door powerup
//   window.LH_MUSIC(cue)            title town occupied interior sneak battle cave ending victory defeat; null stops
//   window.LH_SCREEN(screen, game)  called by Game.setScreen: picks a cue for the new screen
//   window.LH_BATTLE(b)             called after each battle action: sounds for new log lines
// Nothing plays until the first click or key press (browser autoplay rules).
// M toggles mute; the speaker button bottom right mutes, its slider sets volume.

import { A, settings, unlock, onUnlock, setMuted, setVolume, onLevel } from './engine.js';
import { playSfx, SFX_NAMES } from './sfx.js';
import { Player } from './tracker.js';
import { SONGS } from './songs.js';

// ---- music ----
let player = null;   // the Player now sounding
let wanted = null;   // the cue asked for (kept while audio is still locked)
let pinnedAt = -1e9; // when a caller last chose a cue explicitly

function startCue(cue) {
  if (!A.ctx) return;
  if (player && player.name === cue && !player.done) return;
  if (player) player.stop(cue ? 0.6 : 0.8);
  player = null;
  if (cue && SONGS[cue]) player = new Player(SONGS[cue], cue);
}

function music(cue, explicit = true) {
  if (cue && !SONGS[cue]) { console.debug(`[audio] no music cue "${cue}"`); return; }
  if (explicit) pinnedAt = performance.now();
  if (wanted === cue && player && player.name === cue) return;
  wanted = cue || null;
  startCue(wanted);
}

setInterval(() => {
  if (!A.ctx || A.ctx.state !== 'running' || !player) return;
  player.tick();
  if (player.done && player.song.loop === false && A.ctx.currentTime > (player.endAt || 0) + 1.5) {
    player = null;
    if (SONGS[wanted]?.loop === false) wanted = null;
  }
}, 30);

onUnlock(() => startCue(wanted));

// ---- picking a cue for a screen ----
const OUTDOOR_POI = /\.(street|field|training|citadel|road)\b/;
let lastScreen = '';

function storyCue(screen, game, ruined) {
  const id = `${game?.story?.sceneId || ''} ${screen?.view?.bg || ''}`.toLowerCase();
  if (/ending|finale|epilogue|winscene/.test(id)) return 'ending';
  if (/cave|vault|tunnel|mine|ruins/.test(id)) return 'cave';
  if (/sneak|disguise|infiltrat|escape|prison|jail|raid|ambush/.test(id)) return 'sneak';
  if (/dream/.test(id)) return 'interior';
  if (OUTDOOR_POI.test(id)) return ruined ? 'occupied' : 'town';
  if (/scene\.poi\./.test(id)) return 'interior';
  return wanted || (ruined ? 'occupied' : 'town');
}

function routeScreen(screen, game) {
  const name = screen?.constructor?.name || '';
  const ruined = game?.state?.mapVariant === 'ruined';
  const fresh = performance.now() - pinnedAt < 250; // a caller just chose a cue: respect it
  const prev = lastScreen;
  lastScreen = name;
  if (name === 'StoryScreen') {
    if (pinnedAt > 0) return; // a caller chose this story's music; keep it until we leave the story
    music(storyCue(screen, game, ruined), false);
    return;
  }
  if (name === 'BattleScreen') {
    if (screen.b) watchBattle(screen.b);
    playSfx('powerup');
  }
  if (name === 'CityScreen' && prev === 'MapScreen') playSfx('door');
  if (fresh) return;
  pinnedAt = -1e9;
  const cue = { TitleScreen: 'title', MapScreen: ruined ? 'occupied' : 'town', CityScreen: ruined ? 'occupied' : 'town', BattleScreen: 'battle' }[name];
  if (cue) music(cue, false);
}

// ---- battle sounds from the battle log ----
const seen = new WeakMap();
const finished = new WeakSet();
const nameCache = new WeakMap();

function watchBattle(b) {
  if (!seen.has(b)) seen.set(b, b.log.length);
}

function cardNames(b) {
  if (!nameCache.has(b.cards)) {
    const list = Object.entries(b.cards?.cards || {}).map(([id, c]) => ({ id, ...c })).sort((x, y) => y.name.length - x.name.length);
    nameCache.set(b.cards, list);
  }
  return nameCache.get(b.cards);
}

function weaponSound(c) {
  const e = c?.effect || {};
  if (e.kind === 'melee') return 'kick';
  const w = String(e.weapon || c?.art || '');
  if (/laser|ppc/i.test(w)) return 'laser';
  if (/srm|lrm|missile|inferno|rocket/i.test(w)) return 'missile';
  return 'autocannon';
}

function battleLog(b) {
  if (!b || !Array.isArray(b.log)) return;
  if (!seen.has(b)) { seen.set(b, Math.max(0, b.log.length - 1)); }
  let i = seen.get(b), t = 0.06;
  for (; i < b.log.length; i++) {
    const text = String(b.log[i].text || '');
    if (/: rolled \d/.test(text)) {
      const c = cardNames(b).find(c => text.startsWith(`${c.name}:`) || text.includes(`: ${c.name}:`));
      const s = weaponSound(c);
      playSfx(s, t);
      t += s === 'kick' ? 0.18 : 0.32;
    } else if (/ hits the /.test(text)) { playSfx('hit', t); t += 0.14; }
    else if (/heat down to/.test(text)) { playSfx('vent', t); t += 0.3; }
    else if (/redline|shut down|cockpit is dark/.test(text)) { playSfx('alarm', t); t += 0.5; }
    else if (/armour on the/.test(text)) { playSfx('powerup', t); t += 0.3; }
  }
  seen.set(b, i);
  if (b.over && !finished.has(b)) {
    finished.add(b);
    playSfx('explode', t);
    setTimeout(() => music(b.result === 'win' ? 'victory' : 'defeat', false), (t + 0.7) * 1000);
  }
}

// ---- input: unlock on first gesture, M to mute, button clicks ----
const unlockNow = () => unlock();
window.addEventListener('pointerdown', unlockNow, true);
window.addEventListener('keydown', unlockNow, true);
window.addEventListener('touchend', unlockNow, true);

window.addEventListener('keydown', (e) => {
  if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) {
    setMuted(!settings.muted);
  }
});

document.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button');
  if (!btn || btn.closest('#lh-audio')) return;
  playSfx(btn.closest('.card') ? 'card' : 'click');
}, true);

// ---- the mute button and volume slider ----
function mountControl() {
  if (document.getElementById('lh-audio')) return;
  const style = document.createElement('style');
  style.textContent = `
#lh-audio{position:fixed;right:8px;bottom:8px;z-index:60;display:flex;align-items:center;gap:6px;padding:4px 6px;
  background:rgba(16,12,30,.85);border:1px solid #8a93a3;border-radius:6px;font:12px ui-monospace,Menlo,monospace;color:#f4f0e8}
#lh-audio button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;color:#4fe8ff}
#lh-audio button:focus-visible{outline:1px solid #ffd77a}
#lh-audio input{width:64px;accent-color:#4fe8ff}
#lh-audio.muted button{color:#e0662a}
@media (max-width:520px){#lh-audio input{display:none}}`;
  document.head.append(style);
  const box = document.createElement('div');
  box.id = 'lh-audio';
  box.innerHTML = `<button type="button" aria-label="Mute (M)" title="Mute (M)"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 6h3l4-3v10l-4-3H2z"/><path class="w" d="M11 5.5q2 2.5 0 5M12.8 3.8q3.4 4.2 0 8.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path class="x" d="M11 6l4 4M15 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><input type="range" min="0" max="100" step="1" aria-label="Volume" title="Volume">`;
  const btn = box.querySelector('button'), slider = box.querySelector('input');
  const sync = () => {
    box.classList.toggle('muted', settings.muted);
    box.querySelector('.w').style.display = settings.muted ? 'none' : '';
    box.querySelector('.x').style.display = settings.muted ? '' : 'none';
    slider.value = Math.round(settings.volume * 100);
    btn.setAttribute('aria-pressed', String(settings.muted));
  };
  btn.addEventListener('click', () => { unlock(); setMuted(!settings.muted); btn.blur(); });
  slider.addEventListener('input', () => { unlock(); setVolume(slider.value / 100); });
  slider.addEventListener('keydown', (e) => e.stopPropagation());
  onLevel(sync);
  sync();
  document.body.append(box);
}
if (document.body) mountControl(); else window.addEventListener('DOMContentLoaded', mountControl);

// ---- public hooks ----
window.LH_SFX = (name, delay = 0) => playSfx(name, delay);
window.LH_MUSIC = (cue) => music(cue, true);
window.LH_SCREEN = (screen, game) => { try { routeScreen(screen, game); } catch (e) { console.warn('[audio]', e); } };
window.LH_BATTLE = (b) => { try { battleLog(b); } catch (e) { console.warn('[audio]', e); } };
window.LH_AUDIO = { settings, setMuted, setVolume, sfx: SFX_NAMES, cues: Object.keys(SONGS), get playing() { return player?.name || null; } };
