'use client';

import { useMemo, useState } from 'react';
import BattleView from '../../components/peg-battle/BattleView';
import { loadBrowserCatalog } from '../../lib/peg-battle/catalog-browser.js';

export default function PegBattleHarnessPage() {
  const catalog = useMemo(() => loadBrowserCatalog(), []);
  const [seed, setSeed] = useState(1234);
  const [seedDraft, setSeedDraft] = useState('1234');
  const [enemy, setEnemy] = useState(catalog.enemies[0]?.id ?? 'bad-doggo');
  const [board, setBoard] = useState(catalog.boards[0]?.id ?? 'pavilion-duel');

  return (
    <main>
      <form
        className="harness-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSeed(Number(seedDraft) || 1234);
        }}
      >
        <strong>Peg Battle harness</strong>
        <label>
          Enemy
          <select value={enemy} onChange={(event) => setEnemy(event.target.value)}>
            {catalog.enemies.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Board
          <select value={board} onChange={(event) => setBoard(event.target.value)}>
            {catalog.boards.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seed
          <input value={seedDraft} onChange={(event) => setSeedDraft(event.target.value)} />
        </label>
        <button type="submit">Replay same seed</button>
        <button
          type="button"
          onClick={() => {
            const next = (Math.random() * 0xffffffff) >>> 0;
            setSeedDraft(String(next));
            setSeed(next);
          }}
        >
          New random battle
        </button>
        <button type="button" onClick={() => window.location.reload()}>
          Reload asset manifest
        </button>
        <a href="/">Kid battle</a>
        <a href="/plink">Legacy marble drop</a>
      </form>
      <BattleView
        key={`${seed}-${enemy}-${board}`}
        catalog={catalog}
        seed={seed}
        enemyId={enemy}
        boardId={board}
        debug
        harness
      />
    </main>
  );
}
