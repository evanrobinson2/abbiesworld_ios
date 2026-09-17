'use client';

import { useMemo, useState } from 'react';

// The backgrounds exist to make a bad carve obvious. Magenta shows a halo that
// white hides; the dark and treehouse plates show whether a sprite still reads
// against the surfaces it will actually sit on in the app.
const PLATES = [
  { id: 'checker', label: 'Checkerboard', css: 'repeating-conic-gradient(#e8eaef 0% 25%, #ffffff 0% 50%) 50% / 18px 18px' },
  { id: 'magenta', label: 'Halo test', css: '#ff00c8' },
  { id: 'white', label: 'White', css: '#ffffff' },
  { id: 'dark', label: 'Dark', css: '#1b1f2a' },
  { id: 'treehouse', label: 'Treehouse', css: 'linear-gradient(180deg,#cfe8c8,#f2e2c4)' },
];

const CATEGORY_LABELS = {
  feelings: 'Feelings',
  critters: 'Critters',
  weather: 'Weather',
  flavors: 'Flavors',
  wildCards: 'Wild cards',
};

export default function Gallery({ essences }) {
  const [plate, setPlate] = useState('checker');
  const [stage, setStage] = useState('carved');
  const [category, setCategory] = useState('all');

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(essences.map((entry) => entry.category)))],
    [essences]
  );

  const shown = useMemo(
    () => (category === 'all' ? essences : essences.filter((e) => e.category === category)),
    [essences, category]
  );

  const activePlate = PLATES.find((entry) => entry.id === plate) ?? PLATES[0];
  const withArt = shown.filter((entry) => entry.hasArt).length;

  return (
    <>
      <div className="toolbar">
        <div className="group">
          <span>Stage</span>
          <div className="chips">
            {[
              ['carved', 'Carved (alpha)'],
              ['raw', 'Raw (generated)'],
            ].map(([id, label]) => (
              <button
                key={id}
                className="chip"
                aria-pressed={stage === id}
                onClick={() => setStage(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="group">
          <span>Background</span>
          <div className="chips">
            {PLATES.map((entry) => (
              <button
                key={entry.id}
                className="swatch"
                aria-pressed={plate === entry.id}
                style={{ background: entry.css }}
                title={entry.label}
                aria-label={entry.label}
                onClick={() => setPlate(entry.id)}
              />
            ))}
          </div>
        </div>

        <div className="group">
          <span>Category</span>
          <div className="chips">
            {categories.map((entry) => (
              <button
                key={entry}
                className="chip"
                aria-pressed={category === entry}
                onClick={() => setCategory(entry)}
              >
                {entry === 'all' ? 'All' : (CATEGORY_LABELS[entry] ?? entry)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="count">
        Showing <strong>{shown.length}</strong> essence{shown.length === 1 ? '' : 's'} · {withArt}{' '}
        with art · plate: {activePlate.label} · stage: {stage}
        {stage === 'raw' ? ' (flat plate as generated, before carving)' : ''}
      </p>

      <div className="grid">
        {shown.map((entry) => (
          <article className="card" key={entry.id}>
            {entry.hasArt ? (
              <div className="plate" style={{ background: activePlate.css }}>
                {/* Plain img, not next/image: these previews are already sized
                    and encoded, so the optimiser would only re-encode them. */}
                <img
                  src={`/essences/${stage}/${entry.preview}`}
                  alt={entry.name}
                  width={384}
                  height={384}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="missing">no art yet</div>
            )}
            <div className="meta">
              <h2>
                <span aria-hidden="true">{entry.emoji}</span>
                {entry.name}
              </h2>
              <code>{entry.id}</code>
              <div className="tags">
                <span className="tag">{CATEGORY_LABELS[entry.category] ?? entry.category}</span>
                {entry.carve ? (
                  <>
                    <span className="tag">{entry.carve.coveragePct}% covered</span>
                    <span className="tag">
                      {entry.carve.output[0]}×{entry.carve.output[1]}
                    </span>
                  </>
                ) : (
                  <span className="tag warn">not carved</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
