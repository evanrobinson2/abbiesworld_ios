'use client';

import { useMemo, useState } from 'react';
import { SLOT_ORDER, imagePrompt, missingSlots, sentence, surprise } from './recipe';

// The backgrounds exist to make a bad carve obvious. Magenta shows a halo that
// white hides; the dark and treehouse plates show whether a sprite still reads
// against the surfaces it will actually sit on in the app.
const PLATES = [
  {
    id: 'checker',
    label: 'Checkerboard',
    css: 'repeating-conic-gradient(#e8eaef 0% 25%, #ffffff 0% 50%) 50% / 18px 18px',
  },
  { id: 'magenta', label: 'Halo test', css: '#ff00c8' },
  { id: 'white', label: 'White', css: '#ffffff' },
  { id: 'dark', label: 'Dark', css: '#1b1f2a' },
  { id: 'treehouse', label: 'Treehouse', css: 'linear-gradient(180deg,#cfe8c8,#f2e2c4)' },
];

const SORTS = [
  { id: 'catalogue', label: 'Catalogue order' },
  { id: 'name', label: 'Name' },
  { id: 'coverage', label: 'Coverage' },
];

function titleCase(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

export default function Browser({ families, assets, generatedAt }) {
  const [plate, setPlate] = useState('checker');
  const [stage, setStage] = useState('carved');
  const [family, setFamily] = useState('all');
  const [category, setCategory] = useState('all');
  const [tags, setTags] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('catalogue');
  const [showPrompts, setShowPrompts] = useState(false);
  const [mix, setMix] = useState({});

  const familyLabels = useMemo(
    () => Object.fromEntries(families.map((entry) => [entry.id, entry.label])),
    [families]
  );

  // Categories and tags narrow to whatever family is selected, so the filter
  // rows never offer a combination that returns nothing.
  const inFamily = useMemo(
    () => (family === 'all' ? assets : assets.filter((asset) => asset.family === family)),
    [assets, family]
  );
  const categories = useMemo(
    () => Array.from(new Set(inFamily.map((asset) => asset.category))).sort(),
    [inFamily]
  );
  const availableTags = useMemo(
    () => Array.from(new Set(inFamily.flatMap((asset) => asset.tags))).sort(),
    [inFamily]
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = inFamily.filter((asset) => {
      if (category !== 'all' && asset.category !== category) return false;
      if (tags.length && !tags.every((tag) => asset.tags.includes(tag))) return false;
      if (!needle) return true;
      const haystack = [asset.name, asset.id, asset.category, ...asset.tags, asset.prompt ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    if (sort === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'coverage') {
      result = [...result].sort((a, b) => (a.carve?.coveragePct ?? 0) - (b.carve?.coveragePct ?? 0));
    }
    return result;
  }, [inFamily, category, tags, query, sort]);

  function selectFamily(next) {
    setFamily(next);
    setCategory('all');
    setTags([]);
  }

  function toggleTag(tag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]
    );
  }

  function toggleMix(asset) {
    setMix((current) =>
      current[asset.family]?.id === asset.id
        ? { ...current, [asset.family]: undefined }
        : { ...current, [asset.family]: asset }
    );
  }

  const activePlate = PLATES.find((entry) => entry.id === plate) ?? PLATES[0];
  const picked = SLOT_ORDER.map((slot) => mix[slot]).filter(Boolean);
  const readback = sentence(mix);
  const prompt = imagePrompt(mix);
  const stillNeeded = missingSlots(mix);
  const filtersActive = family !== 'all' || category !== 'all' || tags.length > 0 || query.trim();

  return (
    <>
      <div className="toolbar">
        <div className="group grow">
          <span>Search</span>
          <input
            className="search"
            type="search"
            value={query}
            placeholder="name, id, tag, or anything in the prompt"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="group">
          <span>Stage</span>
          <div className="chips">
            {[
              ['carved', 'Carved'],
              ['raw', 'Raw'],
            ].map(([id, label]) => (
              <button key={id} className="chip" aria-pressed={stage === id} onClick={() => setStage(id)}>
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
          <span>Sort</span>
          <select className="select" value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORTS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <div className="group">
          <span>Prompts</span>
          <div className="chips">
            <button className="chip" aria-pressed={showPrompts} onClick={() => setShowPrompts((v) => !v)}>
              {showPrompts ? 'Shown' : 'Hidden'}
            </button>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="group grow">
          <span>Family — what job the ingredient does</span>
          <div className="chips">
            <button className="chip" aria-pressed={family === 'all'} onClick={() => selectFamily('all')}>
              All <em>{assets.length}</em>
            </button>
            {families.map((entry) => (
              <button
                key={entry.id}
                className="chip"
                aria-pressed={family === entry.id}
                title={entry.question}
                onClick={() => selectFamily(entry.id)}
              >
                {entry.label} <em>{assets.filter((a) => a.family === entry.id).length}</em>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="group">
          <span>Category</span>
          <div className="chips">
            <button className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
              Any
            </button>
            {categories.map((entry) => (
              <button
                key={entry}
                className="chip"
                aria-pressed={category === entry}
                onClick={() => setCategory(entry)}
              >
                {titleCase(entry)}
              </button>
            ))}
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="group grow">
            <span>Tags {tags.length > 1 ? '(must match all)' : ''}</span>
            <div className="chips">
              {availableTags.map((tag) => (
                <button key={tag} className="chip small" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {family !== 'all' && (
        <p className="familyNote">
          <strong>{familyLabels[family]}</strong> — {families.find((e) => e.id === family)?.question}{' '}
          {families.find((e) => e.id === family)?.blurb}
        </p>
      )}

      <p className="count">
        <strong>{shown.length}</strong> of {assets.length} assets · plate: {activePlate.label} · stage:{' '}
        {stage === 'raw' ? 'raw, on the flat plate before carving' : 'carved to transparency'}
        {filtersActive && (
          <>
            {' · '}
            <button
              className="linkish"
              onClick={() => {
                selectFamily('all');
                setQuery('');
              }}
            >
              clear filters
            </button>
          </>
        )}
      </p>

      <div className="grid">
        {shown.map((asset) => {
          const isPicked = mix[asset.family]?.id === asset.id;
          return (
            <article className={`card${isPicked ? ' picked' : ''}`} key={asset.id}>
              <button className="pick" onClick={() => toggleMix(asset)} aria-pressed={isPicked}>
                {asset.hasArt ? (
                  <span className="plate" style={{ background: activePlate.css }}>
                    {/* Plain img, not next/image: these previews are already
                        sized and encoded, so the optimiser would re-encode them. */}
                    <img src={`/assets/${stage}/${asset.preview}`} alt={asset.name} width={384} height={384} loading="lazy" />
                  </span>
                ) : (
                  <span className="missing">no art yet</span>
                )}
                <span className="pickHint">{isPicked ? 'In the mix — click to remove' : 'Click to add to the mix'}</span>
              </button>
              <div className="meta">
                <h2>
                  <span aria-hidden="true">{asset.emoji}</span>
                  {asset.name}
                </h2>
                <code>{asset.id}</code>
                <div className="tags">
                  <span className="tag strong">{familyLabels[asset.family]}</span>
                  <span className="tag">{titleCase(asset.category)}</span>
                  {asset.tags.map((tag) => (
                    <span className="tag soft" key={tag}>
                      {tag}
                    </span>
                  ))}
                  {asset.carve ? (
                    <span className="tag">{asset.carve.coveragePct}% covered</span>
                  ) : (
                    <span className="tag warn">not carved</span>
                  )}
                </div>
                {showPrompts && <p className="prompt">{asset.prompt ?? 'no prompt recorded'}</p>}
              </div>
            </article>
          );
        })}
      </div>

      {shown.length === 0 && (
        <p className="empty">Nothing matches those filters. Try clearing the tags or the search box.</p>
      )}

      <div className="tray" role="region" aria-label="Recipe mix">
        <div className="traySlots">
          {SLOT_ORDER.map((slot) => {
            const asset = mix[slot];
            return (
              <div className={`slot${asset ? ' filled' : ''}`} key={slot}>
                <span className="slotLabel">{familyLabels[slot]}</span>
                {asset ? (
                  <button className="slotChip" onClick={() => toggleMix(asset)} title="Remove">
                    <img src={`/assets/carved/${asset.preview}`} alt="" width={40} height={40} />
                    {asset.name}
                  </button>
                ) : (
                  <span className="slotEmpty">empty</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="trayOut">
          {picked.length === 0 ? (
            <p className="trayHint">
              Pick one ingredient from each family to see what the machine would build. The essences only
              say how a thing feels — without a form and a material there is nothing to build.
            </p>
          ) : (
            <>
              <p className="readback">{readback}</p>
              {stillNeeded.length > 0 ? (
                <p className="trayHint">
                  Still needs a {stillNeeded.map((slot) => familyLabels[slot].toLowerCase()).join(' and a ')} before
                  the machine could run.
                </p>
              ) : (
                <details open>
                  <summary>Prompt the machine would send</summary>
                  <p className="prompt">{prompt}</p>
                </details>
              )}
            </>
          )}
        </div>

        <div className="trayActions">
          <button className="chip" onClick={() => setMix(surprise(assets))}>
            Surprise me
          </button>
          <button className="chip" onClick={() => setMix({})} disabled={picked.length === 0}>
            Clear mix
          </button>
        </div>
      </div>

      <footer>
        Catalogue built {generatedAt}. Full-resolution art lives in{' '}
        <code>AssetSources/IngredientKit</code> — <code>raw/</code> as generated and{' '}
        <code>carved/</code> at 512px RGBA; this page serves 384px WebP previews of both. Essences are
        read from <code>DecoratorModels.swift</code> and every other family from{' '}
        <code>tools/carve-assets/catalog/ingredients.json</code>, which also records the prompt that
        produced each piece. Re-carve with <code>tools/carve-assets/carve.py</code>, then rebuild this
        catalogue with <code>tools/carve-assets/build_viewer_assets.py</code>.
      </footer>
    </>
  );
}
