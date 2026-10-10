import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
export const load = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
export const ROOT = root;

// Deterministic rng for tests.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function battleData() {
  const mechs = load('data/mechs.json');
  return { mechs: mechs.mechs, weapons: mechs.weapons, cards: load('data/cards.json') };
}

export const hero = (gunnery = 0, piloting = 0) => ({ skills: { gunnery, piloting } });
