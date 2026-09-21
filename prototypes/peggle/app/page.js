'use client';

import { useMemo } from 'react';
import BattleView from './components/peg-battle/BattleView';
import { loadBrowserCatalog } from './lib/peg-battle/catalog-browser.js';

export default function Page() {
  const catalog = useMemo(() => loadBrowserCatalog(), []);
  return <BattleView catalog={catalog} seed={1234} />;
}
