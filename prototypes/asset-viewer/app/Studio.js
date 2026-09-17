'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { PLATES, plateById } from './plates';
import { FAMILY_INTENT, QUALITIES, catalogueEntry, promptProblems, studioPrompt } from './studioPrompt';

const SUGGESTIONS = [
  'a dragon egg beanbag chair',
  'a jellyfish ceiling lamp',
  'a snail bookshelf',
  'a cloud that rains sprinkles',
  'a teacup swing seat',
  'a mushroom bedside table',
  'a rainbow noodle rug',
  'a hedgehog laundry basket',
];

const STORAGE_KEY = 'abbie-studio-custom-styles';

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function Studio({ families, styles }) {
  const [topic, setTopic] = useState('');
  const [family, setFamily] = useState('decoration');
  const [styleId, setStyleId] = useState('house');
  const [customLook, setCustomLook] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState('low');
  const [plate, setPlate] = useState('checker');

  const [savedStyles, setSavedStyles] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  // Styles the user wrote are theirs, so they persist locally. Committing one
  // for everybody means adding it to data/styles.json, which the panel says.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (Array.isArray(stored)) setSavedStyles(stored);
    } catch {
      /* corrupt or unavailable storage is not worth failing over */
    }
  }, []);

  useEffect(() => {
    fetch('/api/generate')
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setStatus({ routes: [], preferred: null, unreachable: true }));
  }, []);

  useEffect(() => {
    if (!busy) {
      clearInterval(timer.current);
      return undefined;
    }
    const startedAt = Date.now();
    setElapsed(0);
    timer.current = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(timer.current);
  }, [busy]);

  const allStyles = useMemo(() => [...styles, ...savedStyles], [styles, savedStyles]);
  const usingCustom = styleId === 'custom';
  const style = usingCustom
    ? { id: 'custom', label: customLabel.trim() || 'Custom', look: customLook }
    : allStyles.find((entry) => entry.id === styleId);

  const request = { topic, family, style, notes };
  const prompt = studioPrompt(request);
  const problems = promptProblems(request);
  const activePlate = plateById(plate);

  function saveCustomStyle() {
    const look = customLook.trim();
    if (!look) return;
    const label = customLabel.trim() || 'My style';
    const entry = {
      id: `mine_${Date.now().toString(36)}`,
      label,
      blurb: 'Yours, saved in this browser only.',
      look,
      mine: true,
    };
    const next = [...savedStyles, entry];
    setSavedStyles(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStyleId(entry.id);
    setCustomLook('');
    setCustomLabel('');
  }

  function forgetStyle(id) {
    const next = savedStyles.filter((entry) => entry.id !== id);
    setSavedStyles(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (styleId === id) setStyleId('house');
  }

  async function generate() {
    if (problems.length > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          family,
          styleId: usingCustom ? 'house' : styleId,
          customLook: usingCustom ? customLook : style?.mine ? style.look : '',
          notes,
          quality,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json);
        return;
      }
      setResults((current) => [
        { ...json, styleLabel: style?.label ?? json.styleLabel, topic, at: Date.now() },
        ...current,
      ]);
    } catch (failure) {
      setError({ error: failure.message, type: 'network' });
    } finally {
      setBusy(false);
    }
  }

  async function copyEntry(result) {
    const entry = catalogueEntry({ topic: result.topic, family: result.family, prompt: result.prompt });
    await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    setCopied(result.at);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section className="studio">
      <div className="studioIntro">
        <h2>Studio</h2>
        <p>
          Say what you want, choose whose job it is and what it should look like, and the machine
          generates it. The prompt is composed on the server and handed back with the image, so what
          you read below is exactly what was sent — no hidden preamble.
        </p>
        {status && (
          <p className="routeStatus">
            {status.routes?.length ? (
              <>
                Route: <strong>{status.preferred === 'gateway' ? 'AI Gateway' : 'OpenAI direct'}</strong>
                {status.routes.includes('gateway') && status.routes.includes('direct') && (
                  <>, falling back to OpenAI direct if it refuses</>
                )}
                {' · '}model <code>{status.model}</code>
                {!status.hasGatewayKey && <> · no gateway key set, so calls go straight to OpenAI</>}
              </>
            ) : (
              <>
                No image provider is configured. Set <code>OPENAI_API_KEY</code> (and
                <code>AI_GATEWAY_API_KEY</code> to route through the gateway).
              </>
            )}
          </p>
        )}
      </div>

      <div className="studioGrid">
        <div className="studioControls">
          <label className="field">
            <span>What should it make?</span>
            <input
              className="topic"
              value={topic}
              placeholder="a dragon egg beanbag chair"
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') generate();
              }}
            />
          </label>

          <div className="field">
            <span>Or try one of these</span>
            <div className="chips">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} className="chip small" onClick={() => setTopic(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Whose job is it?</span>
            <div className="chips">
              {Object.keys(FAMILY_INTENT).map((id) => {
                const known = families.find((entry) => entry.id === id);
                return (
                  <button
                    key={id}
                    className="chip"
                    aria-pressed={family === id}
                    title={known?.question ?? undefined}
                    onClick={() => setFamily(id)}
                  >
                    {known?.label ?? id}
                  </button>
                );
              })}
            </div>
            <p className="fieldNote">{FAMILY_INTENT[family]}</p>
          </div>

          <div className="field">
            <span>What should it look like?</span>
            <div className="chips">
              {allStyles.map((entry) => (
                <button
                  key={entry.id}
                  className="chip"
                  aria-pressed={styleId === entry.id}
                  title={entry.blurb}
                  onClick={() => setStyleId(entry.id)}
                >
                  {entry.label}
                  {entry.mine && <em>yours</em>}
                </button>
              ))}
              <button className="chip" aria-pressed={usingCustom} onClick={() => setStyleId('custom')}>
                Write my own…
              </button>
            </div>
            {!usingCustom && style?.blurb && <p className="fieldNote">{style.blurb}</p>}
            {savedStyles.some((entry) => entry.id === styleId) && (
              <p className="fieldNote">
                Saved in this browser only.{' '}
                <button className="linkish" onClick={() => forgetStyle(styleId)}>
                  forget it
                </button>{' '}
                — or add it to <code>data/styles.json</code> to keep it for good.
              </p>
            )}
          </div>

          {usingCustom && (
            <div className="field customStyle">
              <span>Your style</span>
              <input
                className="search"
                value={customLabel}
                placeholder="name it, e.g. Neon jelly"
                onChange={(event) => setCustomLabel(event.target.value)}
              />
              <textarea
                value={customLook}
                rows={3}
                placeholder="how it should be drawn, e.g. Glowing translucent jelly, neon rim light, thick dark outlines."
                onChange={(event) => setCustomLook(event.target.value)}
              />
              <p className="fieldNote">
                Describe only the <em>look</em>. Framing and the flat grey background are added for you
                and cannot be overridden, because the carve depends on them.
              </p>
              <button className="chip" onClick={saveCustomStyle} disabled={!customLook.trim()}>
                Save this style
              </button>
            </div>
          )}

          <label className="field">
            <span>Anything else? (optional)</span>
            <input
              className="search"
              value={notes}
              placeholder="e.g. with tiny gold flecks, and a little door"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className="field">
            <span>How good?</span>
            <div className="chips">
              {QUALITIES.map((entry) => (
                <button
                  key={entry.id}
                  className="chip"
                  aria-pressed={quality === entry.id}
                  title={entry.blurb}
                  onClick={() => setQuality(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <p className="fieldNote">{QUALITIES.find((entry) => entry.id === quality)?.blurb}</p>
          </div>

          <div className="field">
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
        </div>

        <div className="studioPreview">
          <div className="field">
            <span>Exactly what will be sent</span>
            {prompt ? (
              <p className="prompt sendable">{prompt}</p>
            ) : (
              <p className="fieldNote">Say what you want above and the prompt appears here.</p>
            )}
          </div>

          <div className="studioGo">
            <button className="go" onClick={generate} disabled={problems.length > 0 || busy}>
              {busy ? `Making it… ${seconds(elapsed)}` : 'Make it'}
            </button>
            {problems.length > 0 && <p className="fieldNote">{problems.join(' ')}</p>}
            {busy && (
              <p className="fieldNote">
                {quality === 'low' ? 'Quick takes about 10 seconds.' : 'Good takes about 30 seconds.'}
              </p>
            )}
          </div>

          {error && (
            <div className="failure">
              <strong>That did not work.</strong>
              <p>{error.error}</p>
              {error.type && (
                <p className="fieldNote">
                  Reported as <code>{error.type}</code>.
                  {error.type === 'customer_verification_required' &&
                    ' AI Gateway needs a card on file for the team before it will serve requests, even in BYOK mode.'}
                </p>
              )}
              {error.attempts?.length > 0 && (
                <ul className="attempts">
                  {error.attempts.map((attempt, index) => (
                    <li key={index}>
                      <code>{attempt.route}</code> — http {attempt.status}
                      {attempt.type ? ` ${attempt.type}` : ''} in {seconds(attempt.elapsedMs)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <>
          <h3 className="resultsHead">
            Made this session <span className="n">{results.length}</span>
          </h3>
          <div className="grid">
            {results.map((result) => (
              <article className="card" key={result.at}>
                <span className="plate" style={{ background: activePlate.css }}>
                  <img src={result.image} alt={result.topic} />
                </span>
                <div className="meta">
                  <h2>{result.topic}</h2>
                  <div className="tags">
                    <span className="tag strong">{result.family}</span>
                    <span className="tag">{result.styleLabel}</span>
                    <span className="tag">{result.quality === 'low' ? 'quick' : 'good'}</span>
                    <span className="tag soft">via {result.route === 'gateway' ? 'gateway' : 'openai direct'}</span>
                    <span className="tag soft">{seconds(result.elapsedMs)}</span>
                    {result.usage?.total_tokens && (
                      <span className="tag soft">{result.usage.total_tokens} tokens</span>
                    )}
                  </div>
                  <p className="prompt">{result.prompt}</p>
                  <div className="chips">
                    <a
                      className="chip small"
                      href={result.image}
                      download={`${result.family}_${result.topic.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.webp`}
                    >
                      Download
                    </a>
                    <button className="chip small" onClick={() => copyEntry(result)}>
                      {copied === result.at ? 'Copied' : 'Copy catalogue entry'}
                    </button>
                    <button
                      className="chip small"
                      onClick={() => {
                        setTopic(result.topic);
                        setFamily(result.family);
                      }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="fieldNote keeping">
            Keeping one means committing it: download the WebP, put the full-resolution PNG in{' '}
            <code>AssetSources/IngredientKit/raw/</code>, paste the copied catalogue entry into{' '}
            <code>tools/carve-assets/catalog/ingredients.json</code>, then run <code>carve.py</code> and{' '}
            <code>build_viewer_assets.py</code>. The deployment is read-only, so the studio hands you the
            exact text to commit rather than pretending it saved.
          </p>
        </>
      )}
    </section>
  );
}
