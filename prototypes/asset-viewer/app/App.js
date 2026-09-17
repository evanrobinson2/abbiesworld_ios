'use client';

import { useState } from 'react';

import Browser from './Browser';
import Studio from './Studio';

export default function App({ kinds, families, assets, styles, generatedAt }) {
  const [tab, setTab] = useState('browse');
  const made = assets.filter((asset) => asset.source === 'generated').length;

  return (
    <>
      <nav className="tabs" aria-label="Sections">
        <button className="tab" aria-pressed={tab === 'browse'} onClick={() => setTab('browse')}>
          Browse <em>{assets.length}</em>
        </button>
        <button className="tab" aria-pressed={tab === 'studio'} onClick={() => setTab('studio')}>
          Studio
        </button>
        <span className="tabNote">
          {tab === 'browse'
            ? `${made} generated, ${assets.length - made} already in the repo`
            : 'Suggest a topic and a style, and make something new'}
        </span>
      </nav>

      {tab === 'browse' ? (
        <Browser kinds={kinds} families={families} assets={assets} generatedAt={generatedAt} />
      ) : (
        <Studio families={families} styles={styles} />
      )}
    </>
  );
}
