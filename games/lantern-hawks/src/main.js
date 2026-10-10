// Boot, the main loop, and the Game object that screens talk to.

import * as assets from './gfx/registry.js';
import { generateAll } from './gfx/procedural.js';
import { nameDict, mechName } from './core/names.js';
import { newGame, migrate } from './core/state.js';
import { Story, evalCond } from './core/script.js';
import { saveGame, loadGame, hasSave } from './core/save.js';
import { openBooster as rollBooster } from './core/cards.js';
import { parseWorld, coverAt } from './core/hex.js';
import { TitleScreen } from './screens/title.js';
import { MapScreen } from './screens/map.js';
import { CityScreen } from './screens/city.js';
import { StoryScreen } from './screens/story.js';
import { BattleScreen } from './screens/battle.js';
import { VaultScreen } from './screens/vault.js';
import { EndingScreen, DeathScreen } from './screens/ending.js';
import { renderStatus } from './ui/status.js';
import { openMenu, showHelp, showBattleHelp, openDeck, openBoosterModal, closeModal } from './ui/menu.js';
import './audio/index.js'; // music + sound: window.LH_SFX / LH_MUSIC, mute with M

const W = 320, H = 180;

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

class Game {
  constructor(data) {
    this.data = data;
    this.dict = nameDict(data.names);
    this.world = parseWorld(data.world);
    this.modalQueue = [];
    this.canvas = document.getElementById('screen');
    this.g = this.canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.overlay = document.getElementById('overlay');
    this.modal = document.getElementById('modal');
    this.statusEl = document.getElementById('status');
    this.toastEl = document.getElementById('toast');
    this.state = null;
    this.story = null;
    this.screen = null;
    this.time = 0;
    this.storage = (() => { try { return window.localStorage; } catch { return null; } })();
  }

  mechLabel(id) {
    const def = this.data.mechs.mechs[id];
    return def ? mechName(this.dict, def) : 'no mech';
  }

  hasSave() {
    return this.storage ? hasSave(this.storage) : false;
  }

  setScreen(screen) {
    if (this.screen?.exit) this.screen.exit();
    this.overlay.innerHTML = '';
    this.screen = screen;
    document.getElementById('stage').dataset.screen = screen.constructor.name;
    if (screen.enter) screen.enter();
    window.LH_SCREEN?.(screen, this);
    this.refreshStatus();
  }

  refreshStatus() {
    renderStatus(this.statusEl, this);
    fit();
  }

  toast(text) {
    const d = document.createElement('div');
    d.textContent = text;
    this.toastEl.appendChild(d);
    setTimeout(() => d.remove(), 2500);
  }

  // ---- flow ----
  titleScreen() {
    this.state = null;
    this.sampleMode = false;
    this.setScreen(new TitleScreen(this));
  }

  startStory(state) {
    this.state = state;
    this.boosterActive = false;
    this.sampleMode = false;
    migrate(state);
    this.story = new Story({ scenes: this.data.scenes, state, dict: this.dict, party: this.data.party });
  }

  newGame() {
    this.startStory(newGame(this.data.names, this.data.world));
    this.toLocation();
    this.save(true);
    this.toast('Day 1. Visit the cadet school to start training.');
  }

  continueGame() {
    const s = this.storage && loadGame(this.storage);
    if (!s || !s.location) { this.toast('No save found'); return false; }
    this.startStory(s);
    if (!s.flags.game_won && this.story.restore(s.resume?.story)) {
      this.returnFrom = s.resume.from;
      this.setScreen(new StoryScreen(this));
    } else this.toLocation();
    if (s.pendingBoosters?.length) this.openBooster(0);
    this.toast(`Loaded: day ${s.day}`);
    return true;
  }

  save(quiet = false) {
    if (!this.state || this.sampleMode) return;
    const snapshot = this.screen instanceof StoryScreen ? this.story.snapshot() : null;
    const state = { ...this.state, resume: snapshot ? { story: snapshot, from: this.returnFrom } : null };
    const ok = this.storage && saveGame(this.storage, state);
    if (!quiet || !ok) this.toast(ok ? 'Game saved' : 'Saving is not available in this browser');
  }

  // Go wherever state.location says: the hex map or a city.
  toLocation() {
    if (this.state.flags.game_won) { this.setScreen(new EndingScreen(this)); return; }
    const loc = this.state.location || 'map';
    if (loc.startsWith('city:') && this.data.cities[loc.slice(5)]) this.setScreen(new CityScreen(this, loc.slice(5)));
    else if (loc === 'vault') this.setScreen(new VaultScreen(this));
    else this.setScreen(new MapScreen(this));
  }

  toMap() {
    this.state.location = 'map';
    this.save(true);
    this.toLocation();
  }

  // Walking into a city from the map. A city can play an arrival scene first
  // (cities.json `arrive`: the port's gate check, the stockade's first look).
  enterCity(id) {
    this.state.location = `city:${id}`;
    const arrival = (this.data.cities[id]?.arrive || []).find(a => evalCond(a.if, this.state));
    if (arrival) { this.openScene(arrival.scene, { kind: 'city', city: id }); return; }
    this.toLocation();
  }

  // `from`: { kind: 'city', city } or { kind: 'map' }.
  openScene(sceneId, from = null) {
    this.returnFrom = from;
    this.story.enter(sceneId);
    this.setScreen(new StoryScreen(this));
  }

  // placed: a scene effect already moved the squad (into the vault, say).
  leaveScene(placed = false) {
    if (placed) { /* keep the location the effect set */ }
    else if (this.returnFrom?.kind === 'city') this.state.location = `city:${this.returnFrom.city}`;
    else if (this.returnFrom?.kind === 'map') this.state.location = 'map';
    else if (this.returnFrom?.kind === 'vault') this.state.location = 'vault';
    this.returnFrom = null;
    this.toLocation();
    this.save(true);
  }

  // cover 'map': a fight on the hex board. The enemy has the cover of the
  // hex it stands on; you have the cover of the hex you came from.
  startBattle(id, { cover = null } = {}) {
    const def = this.data.battles[id];
    if (!def) throw new Error(`no battle "${id}"`);
    let cv = null;
    if (cover === 'map' && this.state.pos) {
      const from = this.state.prevPos || this.state.pos;
      cv = { player: coverAt(this.world, from.q, from.r), enemy: coverAt(this.world, this.state.pos.q, this.state.pos.r) };
    }
    this.setScreen(new BattleScreen(this, id, def, this.state.party[0], { cover: cv }));
  }

  // The story's last word: 'victory' rolls the ending and credits, 'death'
  // offers the last save.
  endGame(kind, text = '') {
    if (kind === 'victory') this.save(true); // a death is never saved over the last good save
    if (kind === 'victory') this.setScreen(new EndingScreen(this, text));
    else this.setScreen(new DeathScreen(this, text));
  }

  // Straight from the title: a throwaway state, the hero vs a hunter.
  sampleBattle() {
    const def = this.data.battles.sample;
    this.state = newGame(this.data.names, this.data.world);
    Object.assign(this.state.party[0].skills, def.hero || {});
    this.sampleMode = true;
    this.story = null;
    this.setScreen(new BattleScreen(this, 'sample', def, this.state.party[0]));
  }

  endBattle(id, def, result) {
    if (def.sample) {
      const won = result === 'win';
      if (won) this.openBooster(1, () => this.titleScreen());
      else this.titleScreen();
      return;
    }
    this.story.resolveBattle(def, result);
    this.setScreen(new StoryScreen(this));
  }

  openBooster(n, onDone) {
    if (!this.sampleMode) {
      this.state.pendingBoosters ??= [];
      for (let i = 0; i < n; i++) this.state.pendingBoosters.push(rollBooster(this.data.cards, Math.random));
      this.save(true);
    }
    if (this.boosterActive) return;
    this.boosterActive = true;
    const run = () => openBoosterModal(this, n, onDone);
    if (this.modal.hidden) run(); else this.modalQueue.push(run);
  }

  openMenu() { openMenu(this); }
  showHelp() { showHelp(this); }
  showBattleHelp() { showBattleHelp(this); }
  openDeck() { if (this.state && !this.sampleMode) openDeck(this); }
  closeModal() { closeModal(this); }

  // ---- loop ----
  frame(t) {
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000);
    this.last = t;
    this.time += dt;
    if (this.screen) {
      if (this.modal.hidden && !document.hidden) this.screen.update?.(dt);
      this.g.setTransform(1, 0, 0, 1, 0, 0);
      this.g.imageSmoothingEnabled = false;
      this.screen.render?.(this.g);
    }
    requestAnimationFrame(x => this.frame(x));
  }
}

function fit() {
  const statusH = document.getElementById('status').offsetHeight || 0;
  const avail = Math.min(window.innerWidth / W, (window.innerHeight - statusH - 16) / H);
  const s = window.innerWidth <= 700 ? window.innerWidth / W : (avail >= 2 ? Math.floor(avail) : Math.max(0.5, Math.floor(avail * 4) / 4));
  document.documentElement.style.setProperty('--s', s);
}

function wireInput(game) {
  window.addEventListener('keydown', (e) => {
    if (!game.modal.hidden) {
      if (e.key === 'Escape' && game.modal.dataset.closable) game.closeModal();
      return;
    }
    if (e.key === 'Escape' && game.state && game.screen?.allowMenu) { game.openMenu(); e.preventDefault(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('button, input, select, textarea')) return;
    if (game.screen?.key?.(e.key, e, true)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => game.screen?.key?.(e.key, e, false));
  const toCanvas = (e) => {
    const r = game.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  game.canvas.addEventListener('pointerdown', (e) => {
    if (!game.modal.hidden) return;
    const p = toCanvas(e);
    game.screen?.pointer?.(p.x, p.y, e);
  });
  game.canvas.addEventListener('pointermove', (e) => {
    if (!game.modal.hidden) return;
    const p = toCanvas(e);
    game.screen?.move?.(p.x, p.y, e);
  });
}

async function boot() {
  const [names, scenes, battles, mechs, world, cities, cards, party, vault, art] = await Promise.all([
    fetchJSON('names.json'), fetchJSON('data/scenes.json'), fetchJSON('data/battles.json'),
    fetchJSON('data/mechs.json'), fetchJSON('data/world.json'), fetchJSON('data/cities.json'),
    fetchJSON('data/cards.json'), fetchJSON('data/party.json'), fetchJSON('data/vault.json'), fetchJSON('data/art.json'),
  ]);
  for (const d of [scenes, battles, cities, party, vault]) delete d._note;
  document.title = names.title;
  generateAll(assets.register, { cities });
  // Story art the painter doesn't draw yet borrows a stand-in (data/art.json);
  // real art in the manifest still wins, because overrides beat the store.
  for (const [key, stand] of Object.entries(art.fallbacks || {})) if (!assets.has(key)) assets.register(key, assets.get(stand));
  const overridden = await assets.loadManifest('assets/manifest.json');
  if (overridden) console.info(`[assets] ${overridden} placeholder(s) replaced from manifest`);
  const game = new Game({ names, scenes, battles, mechs, world, cities, cards, party, vault });
  window.lanternHawks = game; // handy in the console
  wireInput(game);
  window.addEventListener('resize', fit);
  game.titleScreen();
  fit();
  requestAnimationFrame(t => game.frame(t));
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('overlay').innerHTML = `<div class="dialog"><div class="speaker">Could not start</div><div class="text"></div></div>`;
  document.querySelector('#overlay .text').textContent = String(err.message || err);
});
