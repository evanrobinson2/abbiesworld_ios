// Save/load against any Storage-like object (localStorage in the browser,
// a plain stub in tests). Every call is wrapped: private windows and blocked
// storage throw, and the game must keep running without saves.

import { serialize, deserialize } from './state.js';

export const SAVE_KEY = 'lantern-hawks.save.v1';

export function saveGame(storage, state) {
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave(storage) {
  try {
    return !!storage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function savedAt(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw).savedAt : null;
  } catch {
    return null;
  }
}
