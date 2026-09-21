import pack from '../../../data/peg-battle/pack.json';
import enemies from '../../../data/peg-battle/content/enemies.json';
import cards from '../../../data/peg-battle/content/cards.json';
import boards from '../../../data/peg-battle/content/boards.json';
import levels from '../../../data/peg-battle/content/levels.json';
import fx from '../../../data/peg-battle/content/comic-fx.json';
import pixels from '../../../data/peg-battle/content/pixels.json';
import manifest from '../../../data/peg-battle/assets/manifest.json';
import { assembleCatalog } from './session.js';

export function loadBrowserCatalog() {
  return assembleCatalog({ pack, enemies, cards, boards, levels, fx, pixels, manifest });
}
