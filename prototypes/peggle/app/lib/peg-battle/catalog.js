import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const PACK_ROOT_CANDIDATES = [
  resolve(here, '../../../../../AssetSources/World2/minigames/peg-battle'),
  resolve(here, '../../../data/peg-battle'),
];

export function readPackJson(name, root) {
  const bases = root ? [root] : PACK_ROOT_CANDIDATES;
  let lastError;
  for (const base of bases) {
    try {
      return JSON.parse(readFileSync(resolve(base, name), 'utf8'));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function loadCatalog(root) {
  const pack = readPackJson('pack.json', root);
  const enemies = readPackJson(pack.content.enemies, root).enemies;
  const cards = readPackJson(pack.content.cards, root).cards;
  const boards = readPackJson(pack.content.boards, root).boards;
  const levels = readPackJson(pack.content.levels, root).levels;
  const fx = readPackJson(pack.content.fx, root);
  let manifest = { families: {}, records: [] };
  try {
    manifest = readPackJson(pack.assets, root);
  } catch {
    manifest = { families: {}, records: [], missing: true };
  }
  return { pack, enemies, cards, boards, levels, fx, manifest };
}
