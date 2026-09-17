'use client';

import { useEffect, useMemo, useState } from 'react';
import { PLATES, plateById } from './plates';
import { imagePrompt, missingSlots, sentence, slotsFrom, surprise } from './recipe';

const SORTS = [
  { id: 'catalogue', label: 'Catalogue order' },
  { id: 'name', label: 'Name' },
  { id: 'coverage', label: 'Carve coverage' },
  { id: 'largest', label: 'Largest file' },
];

// 1192 assets is too many to paint at once, and an art review is done a screen
// at a time anyway.
const PAGE = 120;

function titleCase(text) {
  return text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function fileSize(bytes) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

export default function Browser({ kinds, families, assets, generatedAt }) {
  const [plate, setPlate] = useState('checker');
  const [stage, setStage] = useState('carved');
  const [kind, setKind] = useState('all');
  const [family, setFamily] = useState('all');
  const [category, setCategory] = useState('all');
  const [source, setSource] = useState('all');
  const [tags, setTags] = useState([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('catalogue');
  const [showPrompts, setShowPrompts] = useState(false);
  const [mix, setMix] = useState({});
  const [limit, setLimit] = useState(PAGE);

  const familyById = useMemo(
    () => Object.fromEntries(families.map((entry) => [entry.id, entry])),
    [families]
  );
  const assetById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);
  const slots = useMemo(() => slotsFrom(families), [families]);

  // Each filter row narrows the next, so no combination can return nothing.
  const inKind = useMemo(
    () => (kind === 'all' ? assets : assets.filter((asset) => asset.kind === kind)),
    [assets, kind]
  );
  const kindFamilies = useMemo(
    () => families.filter((entry) => inKind.some((asset) => asset.family === entry.id)),
    [families, inKind]
  );
  const inFamily = useMemo(
    () => (family === 'all' ? inKind : inKind.filter((asset) => asset.family === family)),
    [inKind, family]
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
      if (source !== 'all' && asset.source !== source) return false;
      if (tags.length && !tags.every((tag) => asset.tags.includes(tag))) return false;
      if (!needle) return true;
      const haystack = [asset.name, asset.id, asset.category, asset.path ?? '', ...asset.tags, asset.prompt ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
    if (sort === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'coverage') {
      result = [...result].sort((a, b) => (a.carve?.coveragePct ?? 999) - (b.carve?.coveragePct ?? 999));
    } else if (sort === 'largest') {
      result = [...result].sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    }
    return result;
  }, [inFamily, category, source, tags, query, sort]);

  useEffect(() => setLimit(PAGE), [kind, family, category, source, tags, query, sort]);

  function selectKind(next) {
    setKind(next);
    setFamily('all');
    setCategory('all');
    setTags([]);
  }

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
    if (!slots.includes(asset.family)) return;
    setMix((current) =>
      current[asset.family]?.id === asset.id
        ? { ...current, [asset.family]: undefined }
        : { ...current, [asset.family]: asset }
    );
  }

  const activePlate = plateById(plate);
  const picked = slots.map((slot) => mix[slot]).filter(Boolean);
  const stillNeeded = missingSlots(mix);
  const filtersActive =
    kind !== 'all' || family !== 'all' || category !== 'all' || source !== 'all' || tags.length > 0 || query.trim();
  const activeKind = kinds.find((entry) => entry.id === kind);
  const activeFamily = familyById[family];
  const visible = shown.slice(0, limit);

  return (
    <>
      <div className="toolbar">
        <div className="group grow">
          <span>Search</span>
          <input
            className="search"
            type="search"
            value={query}
            placeholder="name, id, file path, tag, or anything in the prompt"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="group">
          <span>Source</span>
          <div className="chips">
            {[
              ['all', 'All'],
              ['generated', 'Generated'],
              ['bundled', 'Already in repo'],
            ].map(([id, label]) => (
              <button key={id} className="chip" aria-pressed={source === id} onClick={() => setSource(id)}>
                {label}
              </button>
            ))}
          </div>
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
          <span>Kind — which bucket the asset lives in</span>
          <div className="chips">
            <button className="chip" aria-pressed={kind === 'all'} onClick={() => selectKind('all')}>
              All <em>{assets.length}</em>
            </button>
            {kinds.map((entry) => (
              <button
                key={entry.id}
                className="chip"
                aria-pressed={kind === entry.id}
                title={entry.blurb}
                onClick={() => selectKind(entry.id)}
              >
                {entry.label} <em>{assets.filter((a) => a.kind === entry.id).length}</em>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="group grow">
          <span>Family — what job it does</span>
          <div className="chips">
            <button className="chip" aria-pressed={family === 'all'} onClick={() => selectFamily('all')}>
              Any <em>{inKind.length}</em>
            </button>
            {kindFamilies.map((entry) => (
              <button
                key={entry.id}
                className="chip"
                aria-pressed={family === entry.id}
                title={entry.blurb ?? undefined}
                onClick={() => selectFamily(entry.id)}
              >
                {entry.label} <em>{inKind.filter((a) => a.family === entry.id).length}</em>
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
              <button key={entry} className="chip small" aria-pressed={category === entry} onClick={() => setCategory(entry)}>
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

      {(activeKind || activeFamily) && (
        <p className="familyNote">
          {activeKind && (
            <>
              <strong>{activeKind.label}</strong> — {activeKind.blurb}{' '}
            </>
          )}
          {activeFamily && (
            <>
              <strong>{activeFamily.label}</strong>
              {activeFamily.question ? ` — ${activeFamily.question}` : ' —'} {activeFamily.blurb}
            </>
          )}
        </p>
      )}

      <p className="count">
        <strong>{shown.length}</strong> of {assets.length} assets
        {shown.length > visible.length && <> · showing first {visible.length}</>} · plate:{' '}
        {activePlate.label} · stage: {stage === 'raw' ? 'raw where available' : 'carved where available'}
        {filtersActive && (
          <>
            {' · '}
            <button
              className="linkish"
              onClick={() => {
                selectKind('all');
                setSource('all');
                setQuery('');
              }}
            >
              clear filters
            </button>
          </>
        )}
      </p>

      <div className="grid">
        {visible.map((asset) => {
          const mixable = slots.includes(asset.family);
          const isPicked = mix[asset.family]?.id === asset.id;
          const src = stage === 'raw' ? asset.rawPreview ?? asset.preview : asset.preview;
          return (
            <article className={`card${isPicked ? ' picked' : ''}`} key={asset.id}>
              <button
                className="pick"
                onClick={() => toggleMix(asset)}
                aria-pressed={isPicked}
                disabled={!mixable}
              >
                <span className="plate" style={{ background: activePlate.css }}>
                  <img src={`/assets/${src}`} alt={asset.name} loading="lazy" />
                </span>
                {mixable && (
                  <span className="pickHint">{isPicked ? 'In the mix — click to remove' : 'Click to add to the mix'}</span>
                )}
              </button>
              <div className="meta">
                <h2>
                  {asset.emoji && <span aria-hidden="true">{asset.emoji}</span>}
                  {asset.name}
                </h2>
                <code>{asset.path ?? asset.id}</code>
                {asset.readback && <p className="readbackSmall">{asset.readback}</p>}
                <div className="tags">
                  <span className="tag strong">{familyById[asset.family]?.label ?? asset.family}</span>
                  {asset.source === 'bundled' && <span className="tag soft">in repo</span>}
                  {asset.carve && <span className="tag">{asset.carve.coveragePct}% covered</span>}
                  {asset.dimensions && (
                    <span className="tag">
                      {asset.dimensions[0]}×{asset.dimensions[1]}
                    </span>
                  )}
                  {fileSize(asset.bytes) && <span className="tag">{fileSize(asset.bytes)}</span>}
                  {asset.tags.map((tag) => (
                    <span className="tag soft" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                {asset.recipe && (
                  <p className="madeFrom">
                    Made from:{' '}
                    {asset.recipe.map((id, index) => (
                      <span key={id}>
                        {index > 0 && ' + '}
                        <button className="linkish" onClick={() => setQuery(id)}>
                          {assetById[id]?.name ?? id}
                        </button>
                      </span>
                    ))}
                  </p>
                )}
                {showPrompts && <p className="prompt">{asset.prompt ?? 'no prompt — this art predates the pipeline'}</p>}
              </div>
            </article>
          );
        })}
      </div>

      {shown.length === 0 && (
        <p className="empty">Nothing matches those filters. Try clearing the tags or the search box.</p>
      )}

      {shown.length > visible.length && (
        <p className="more">
          <button className="chip" onClick={() => setLimit((current) => current + PAGE)}>
            Show {Math.min(PAGE, shown.length - visible.length)} more
          </button>
        </p>
      )}

      <div className="tray" role="region" aria-label="Recipe mix">
        <div className="traySlots">
          {slots.map((slot) => {
            const asset = mix[slot];
            return (
              <div className={`slot${asset ? ' filled' : ''}`} key={slot}>
                <span className="slotLabel">{familyById[slot]?.label ?? slot}</span>
                {asset ? (
                  <button className="slotChip" onClick={() => toggleMix(asset)} title="Remove">
                    <img src={`/assets/${asset.preview}`} alt="" />
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
              Pick one ingredient from each recipe family to see what the machine would build. Only those
              five families are consumed by a recipe — tools gate what the workshop can do, and decorations
              are what comes out the other end.
            </p>
          ) : (
            <>
              <p className="readback">{sentence(mix)}</p>
              {stillNeeded.length > 0 ? (
                <p className="trayHint">
                  Still needs a{' '}
                  {stillNeeded.map((slot) => (familyById[slot]?.label ?? slot).toLowerCase()).join(' and a ')} before
                  the machine could run.
                </p>
              ) : (
                <details open>
                  <summary>Prompt the machine would send</summary>
                  <p className="prompt">{imagePrompt(mix)}</p>
                </details>
              )}
            </>
          )}
        </div>

        <div className="trayActions">
          <button className="chip" onClick={() => setMix(surprise(assets, families))}>
            Surprise me
          </button>
          <button className="chip" onClick={() => setMix({})} disabled={picked.length === 0}>
            Clear mix
          </button>
        </div>
      </div>

      <footer>
        Catalogue built {generatedAt}. Generated art lives full-resolution in{' '}
        <code>AssetSources/IngredientKit</code>; this page serves 384px WebP previews of its raw and
        carved stages, and 144px thumbnails of everything already in the repo. Essences are read from{' '}
        <code>DecoratorModels.swift</code>, other generated families from{' '}
        <code>tools/carve-assets/catalog/ingredients.json</code> which also records each prompt, and the
        rest is classified from its path by{' '}
        <code>tools/carve-assets/index_repo_assets.py</code>. Rebuild with{' '}
        <code>carve.py</code>, then <code>index_repo_assets.py</code>, then{' '}
        <code>build_viewer_assets.py</code>.
      </footer>
    </>
  );
}
