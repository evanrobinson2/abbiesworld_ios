'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function kindEmoji(kind, family) {
  if (kind === 'audio' || family === 'suno') return '🎵';
  if (family === 'midjourney') return '🖼️';
  if (kind === 'video') return '🎬';
  if (kind === 'image' || family === 'image') return '🖼️';
  return '📦';
}

function extractFirstUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0].replace(/[),.;]+$/g, '') : '';
}

function clipboardFingerprint(kind, value) {
  return `${kind}:${String(value || '').slice(0, 240)}`;
}

function guessFamily(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('suno') || u.includes('cdn.suno')) return 'suno';
  if (u.includes('midjourney') || u.includes('cdn.mj') || u.includes('discord')) {
    return 'midjourney';
  }
  return 'link';
}

const SWIPE_COMMIT = 110;

export default function DropClient({ email }) {
  const [panel, setPanel] = useState('drop'); // drop | history
  const [phase, setPhase] = useState('boot'); // boot | waiting | review | sending | done
  const [toast, setToast] = useState('Opening…');
  const [headline, setHeadline] = useState('Ready for clipboard');
  const [subline, setSubline] = useState(
    'Copy a photo or link, then tap Recheck — or long-press and Paste below.'
  );
  const [candidate, setCandidate] = useState(null);
  const [records, setRecords] = useState([]);
  const [serverConfigured, setServerConfigured] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flash, setFlash] = useState(null);
  const [pasteArmed, setPasteArmed] = useState(false);
  const [debugNote, setDebugNote] = useState('');

  const busyRef = useRef(false);
  const accepted = useRef(new Set());
  const previewUrlRef = useRef(null);
  const pointerStart = useRef(null);
  const fileRef = useRef(null);
  const pasteTrapRef = useRef(null);
  const dragXRef = useRef(0);

  const clearPreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/inbox');
    const data = await res.json();
    setServerConfigured(data.serverConfigured !== false);
    setRecords(data.records || []);
  }, []);

  const armPasteTrap = useCallback((reason) => {
    setPasteArmed(true);
    setPhase('waiting');
    setToast(reason || 'Paste now');
    // Focus after paint so iOS paste menu works.
    requestAnimationFrame(() => {
      pasteTrapRef.current?.focus({ preventScroll: false });
    });
  }, []);

  const presentCandidate = useCallback(
    (next) => {
      if (!next?.fingerprint) return;
      if (accepted.current.has(next.fingerprint)) {
        setPhase('done');
        setToast('Already sent');
        setHeadline('Already in your history');
        setSubline('That clipboard item was sent earlier.');
        setCandidate(null);
        setPasteArmed(false);
        return;
      }
      clearPreviewUrl();
      if (next.previewUrl) previewUrlRef.current = next.previewUrl;
      setCandidate(next);
      setPhase('review');
      setPanel('drop');
      setPasteArmed(false);
      setToast('Verify to send');
      setHeadline('Is this what you meant?');
      setSubline('Swipe right to send · swipe left to dismiss');
      setDragX(0);
      dragXRef.current = 0;
      setFlash(null);
      setDebugNote('');
    },
    [clearPreviewUrl]
  );

  async function uploadFiles(fileList, { fingerprint } = {}) {
    const files = [...(fileList || [])].filter(Boolean);
    if (!files.length) return false;
    busyRef.current = true;
    setPhase('sending');
    setToast('Sending…');
    setHeadline('Sending to Abbie…');
    setSubline(files[0].name || 'Uploading');
    try {
      const body = new FormData();
      for (const file of files) body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.hint || data.detail || data.error || `upload_${res.status}`);
      }
      if (fingerprint) accepted.current.add(fingerprint);
      setPhase('done');
      setToast('Sent ✓');
      setHeadline('Saved to history');
      setSubline(
        data.record?.filename
          ? `Saved ${data.record.filename}`
          : `Saved ${data.records?.length || files.length} item(s)`
      );
      setCandidate(null);
      clearPreviewUrl();
      await refresh();
      return true;
    } catch (err) {
      setPhase('waiting');
      setToast('Send failed');
      setHeadline('Could not send');
      setSubline(err.message);
      armPasteTrap('Try paste again');
      return false;
    } finally {
      busyRef.current = false;
    }
  }

  async function importUrl(raw, { fingerprint } = {}) {
    const next = extractFirstUrl(raw) || String(raw || '').trim();
    if (!next || !/^https?:\/\//i.test(next)) return false;
    busyRef.current = true;
    setPhase('sending');
    setToast('Pulling link…');
    setHeadline('Pulling link…');
    setSubline(next);
    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: next, note: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.hint || data.detail || data.error || `import_${res.status}`);
      }
      if (fingerprint) accepted.current.add(fingerprint);
      setPhase('done');
      setToast('Sent ✓');
      setHeadline('Saved to history');
      setSubline(`Imported ${data.record?.filename || 'link'}`);
      setCandidate(null);
      clearPreviewUrl();
      await refresh();
      return true;
    } catch (err) {
      setPhase('waiting');
      setToast('Import failed');
      setHeadline('Could not pull link');
      setSubline(err.message);
      armPasteTrap('Paste the link here');
      return false;
    } finally {
      busyRef.current = false;
    }
  }

  async function readClipboardIntoCandidate() {
    if (busyRef.current) return;
    setPanel('drop');
    setCandidate(null);
    clearPreviewUrl();
    setPhase('boot');
    setToast('Reading clipboard…');
    setHeadline('Checking clipboard');
    setSubline('Looking for a copied image or link…');
    setDebugNote('');

    let readError = '';
    let sawText = '';
    let foundImage = false;

    // Images + rich content (often blocked on iPhone PWA).
    try {
      if (!navigator.clipboard?.read) {
        readError = 'This browser has no clipboard.read()';
      } else {
        const items = await navigator.clipboard.read();
        setDebugNote(`clipboard.read() → ${items.length} item(s)`);
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            foundImage = true;
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const file = new File([blob], `clipboard-${Date.now()}.${ext}`, {
              type: imageType,
            });
            const previewUrl = await fileToSafePreview(file);
            presentCandidate({
              kind: 'image',
              family: 'image',
              title: 'Clipboard image',
              detail: `${Math.round(file.size / 1024)} KB · ${imageType}`,
              files: [file],
              previewUrl,
              fingerprint: clipboardFingerprint(
                'image',
                `${file.size}:${file.type}`
              ),
            });
            return;
          }
          if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            sawText = await blob.text();
          }
        }
        const found = extractFirstUrl(sawText);
        if (found) {
          presentCandidate({
            kind: 'url',
            family: guessFamily(found),
            title:
              guessFamily(found) === 'suno'
                ? 'Suno link'
                : guessFamily(found) === 'midjourney'
                  ? 'Midjourney link'
                  : 'Copied link',
            detail: found,
            url: found,
            fingerprint: clipboardFingerprint('url', found),
          });
          return;
        }
      }
    } catch (err) {
      readError = String(err?.message || err || 'clipboard.read blocked');
    }

    // Text-only fallback.
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        sawText = text || sawText;
        const found = extractFirstUrl(text);
        if (found) {
          presentCandidate({
            kind: 'url',
            family: guessFamily(found),
            title:
              guessFamily(found) === 'suno'
                ? 'Suno link'
                : guessFamily(found) === 'midjourney'
                  ? 'Midjourney link'
                  : 'Copied link',
            detail: found,
            url: found,
            fingerprint: clipboardFingerprint('url', found),
          });
          return;
        }
      }
    } catch (err) {
      if (!readError) readError = String(err?.message || err);
    }

    // iPhone almost never exposes images via Clipboard API. Arm paste.
    const why = foundImage
      ? 'Found image metadata but could not load bytes.'
      : readError
        ? `Auto-read blocked (${readError}).`
        : sawText?.trim()
          ? 'Clipboard has text, but no http link.'
          : 'Clipboard looked empty to the browser.';

    setDebugNote(why);
    setHeadline('Paste your image or link');
    setSubline(
      'iPhone usually will not hand images to web apps automatically. Long-press the box and choose Paste.'
    );
    armPasteTrap('Long-press → Paste');
  }

  async function acceptCandidate() {
    if (!candidate || busyRef.current) return;
    setFlash('accept');
    if (candidate.kind === 'image' || candidate.kind === 'file') {
      await uploadFiles(candidate.files, { fingerprint: candidate.fingerprint });
    } else if (candidate.kind === 'url') {
      await importUrl(candidate.url, { fingerprint: candidate.fingerprint });
    }
    setFlash(null);
    setDragX(0);
    dragXRef.current = 0;
  }

  function dismissCandidate() {
    if (!candidate || busyRef.current) return;
    setFlash('dismiss');
    clearPreviewUrl();
    setCandidate(null);
    setPhase('waiting');
    setToast('Dismissed');
    setHeadline('Dismissed');
    setSubline('Copy something else, or paste into the box.');
    armPasteTrap('Ready for next paste');
    setTimeout(() => {
      setFlash(null);
      setDragX(0);
      dragXRef.current = 0;
    }, 160);
  }

  function finishSwipe() {
    const x = dragXRef.current;
    setDragging(false);
    if (x > SWIPE_COMMIT) {
      acceptCandidate();
      return;
    }
    if (x < -SWIPE_COMMIT) {
      dismissCandidate();
      return;
    }
    setDragX(0);
    dragXRef.current = 0;
  }

  function onPointerDown(event) {
    if (!candidate || busyRef.current) return;
    pointerStart.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging || pointerStart.current == null) return;
    const delta = event.clientX - pointerStart.current;
    const clamped = Math.max(-180, Math.min(180, delta));
    dragXRef.current = clamped;
    setDragX(clamped);
  }

  function onPointerUp() {
    if (!dragging) return;
    pointerStart.current = null;
    finishSwipe();
  }

  async function fileToSafePreview(file) {
    if (!file?.type?.startsWith('image/')) return null;
    if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name || '')) {
      return null;
    }
    try {
      if (typeof createImageBitmap !== 'function') {
        return URL.createObjectURL(file);
      }
      const bitmap = await createImageBitmap(file);
      const maxEdge = 720;
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.82)
      );
      if (!blob) return null;
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  async function ingestFromClipboardEvent(clipboard) {
    if (!clipboard) return false;

    const imageItems = [...(clipboard.items || [])].filter((item) =>
      item.type?.startsWith('image/')
    );
    if (imageItems.length) {
      const files = imageItems
        .map((item, i) => {
          const file = item.getAsFile();
          if (!file) return null;
          return new File([file], file.name || `paste-${Date.now()}-${i}.png`, {
            type: file.type || 'image/png',
          });
        })
        .filter(Boolean);
      if (!files.length) {
        setToast('Paste blocked');
        setHeadline('Could not read that image');
        setSubline('Use Choose photo instead — iPhone paste is flaky for some images.');
        return true; // still preventDefault so Safari does not inject HTML
      }
      const file = files[0];
      const previewUrl = await fileToSafePreview(file);
      presentCandidate({
        kind: 'image',
        family: 'image',
        title: 'Pasted image',
        detail: `${Math.round(file.size / 1024)} KB${previewUrl ? '' : ' · preview skipped'}`,
        files,
        previewUrl,
        fingerprint: clipboardFingerprint('image', `${file.size}:${file.type}`),
      });
      return true;
    }

    const text = clipboard.getData('text') || '';
    const found = extractFirstUrl(text);
    if (found) {
      presentCandidate({
        kind: 'url',
        family: guessFamily(found),
        title: 'Pasted link',
        detail: found,
        url: found,
        fingerprint: clipboardFingerprint('url', found),
      });
      return true;
    }

    if (text.trim()) {
      setToast('No link found');
      setHeadline('That paste was plain text');
      setSubline('Copy an image or an http link, then paste again.');
      setDebugNote(`Pasted text (${text.length} chars) had no URL.`);
      return true;
    }

    setToast('Empty paste');
    setHeadline('Paste was empty');
    setSubline('Copy the image first, then paste here — or Choose photo.');
    return true;
  }

  function handlePaste(event) {
    // ALWAYS stop Safari from inserting a giant <img> into the DOM (that crash
    // is what produced the Vercel/Safari "page couldn't load" screen).
    event.preventDefault();
    event.stopPropagation();
    ingestFromClipboardEvent(event.clipboardData).catch((err) => {
      setToast('Paste failed');
      setHeadline('Paste failed');
      setSubline(String(err?.message || err));
    });
  }

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') === '1') {
      setPhase('done');
      setToast('Shared ✓');
      setHeadline('Saved to history');
      setSubline('Shared item saved.');
      window.history.replaceState({}, '', '/');
      refresh().catch(() => {});
    } else if (params.get('import')) {
      const incoming = params.get('import');
      presentCandidate({
        kind: 'url',
        family: guessFamily(incoming),
        title: 'Shared link',
        detail: incoming,
        url: incoming,
        fingerprint: clipboardFingerprint('url', incoming),
      });
      window.history.replaceState({}, '', '/');
    } else {
      // Don't auto-fight iOS on first paint — arm paste + offer Recheck.
      armPasteTrap('Copy something, then Recheck or Paste');
      setHeadline('Drop into Abbie');
      setSubline(
        'Copy a Midjourney image / Suno link, then tap Recheck — or long-press Paste.'
      );
    }
    return () => clearPreviewUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptGlow = Math.max(0, dragX) / SWIPE_COMMIT;
  const dismissGlow = Math.max(0, -dragX) / SWIPE_COMMIT;
  const cardRotate = dragX * 0.04;
  const busy = phase === 'sending' || phase === 'boot';

  return (
    <main className="stage" onPaste={handlePaste}>
      <div className="stage-glow" aria-hidden />

      <header className="topbar">
        <div>
          <p className="brand">AW Drop</p>
          <p className="who">{email}</p>
        </div>
        <a className="ghost" href="/auth/logout">
          Out
        </a>
      </header>

      <nav className="tabs" aria-label="AW Drop panels">
        <button
          type="button"
          className={panel === 'drop' ? 'tab on' : 'tab'}
          onClick={() => setPanel('drop')}
        >
          Drop
        </button>
        <button
          type="button"
          className={panel === 'history' ? 'tab on' : 'tab'}
          onClick={() => {
            setPanel('history');
            refresh().catch(() => {});
          }}
        >
          History ({records.length})
        </button>
      </nav>

      {!serverConfigured && (
        <div className="banner warn">Storage not ready — Abbie&apos;s World server not configured.</div>
      )}

      {panel === 'drop' ? (
        <section className="deck" aria-live="polite">
          <div className={`toast ${busy ? 'busy' : ''} ${phase}`}>
            {toast}
          </div>
          <p className="phase-kicker">{headline}</p>
          <p className="phase-copy">{subline}</p>
          {debugNote ? <p className="debug">{debugNote}</p> : null}

          {candidate ? (
            <div className="swipe-arena">
              <div
                className="rail left"
                style={{ opacity: Math.min(1, dismissGlow) }}
                aria-hidden
              >
                Dismiss
              </div>
              <div
                className="rail right"
                style={{ opacity: Math.min(1, acceptGlow) }}
                aria-hidden
              >
                Send
              </div>

              <article
                className={`verify-card ${flash || ''} ${dragging ? 'dragging' : ''}`}
                style={{
                  transform: `translateX(${dragX}px) rotate(${cardRotate}deg)`,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <div className="verify-media">
                  {candidate.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={candidate.previewUrl} alt="Clipboard preview" />
                  ) : (
                    <div className={`verify-glyph family-${candidate.family}`}>
                      {kindEmoji(candidate.kind, candidate.family)}
                    </div>
                  )}
                </div>
                <div className="verify-meta">
                  <span className="pill">{candidate.family}</span>
                  <h2>{candidate.title}</h2>
                  <p>{candidate.detail}</p>
                </div>
                <p className="swipe-hint">← dismiss · send →</p>
              </article>
            </div>
          ) : (
            <div className="waiting-stack">
              <button
                type="button"
                className="recheck"
                disabled={busy}
                onClick={() => readClipboardIntoCandidate()}
              >
                {busy ? 'Reading…' : 'Recheck clipboard'}
              </button>

              <button
                type="button"
                className="chip-btn accept block"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Choose photo / file
              </button>

              <textarea
                ref={pasteTrapRef}
                className={`paste-trap ${pasteArmed ? 'armed' : ''}`}
                aria-label="Paste image or link here"
                placeholder="Long-press here → Paste link or image"
                value=""
                readOnly={false}
                onChange={() => {
                  // Links typed/pasted as text are handled in onPaste; keep empty.
                }}
                onPaste={handlePaste}
                rows={4}
              />
              <p className="debug">
                Tip: for Midjourney screenshots, Choose photo is the most reliable
                on iPhone. Paste is for links (and some images).
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,audio/*,video/*,.heic,.mp3,.wav,.m4a,.mp4,.mov"
                multiple
                hidden
                disabled={busy}
                onChange={async (e) => {
                  const files = [...(e.target.files || [])];
                  e.target.value = '';
                  if (!files.length) return;
                  const file = files[0];
                  const previewUrl = file.type?.startsWith('image/')
                    ? await fileToSafePreview(file)
                    : null;
                  presentCandidate({
                    kind: file.type?.startsWith('image/') ? 'image' : 'file',
                    family: file.type?.startsWith('audio/') ? 'suno' : 'file',
                    title: file.name || 'Chosen file',
                    detail: `${Math.round(file.size / 1024)} KB`,
                    files,
                    previewUrl,
                    fingerprint: clipboardFingerprint(
                      'file',
                      `${file.name}:${file.size}`
                    ),
                  });
                }}
              />
            </div>
          )}

          {candidate && (
            <div className="verify-actions">
              <button
                type="button"
                className="chip-btn dismiss"
                disabled={busy}
                onClick={dismissCandidate}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="chip-btn accept"
                disabled={busy}
                onClick={acceptCandidate}
              >
                Send
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="history-panel">
          <div className="inbox-head">
            <div>
              <h3>History</h3>
              <p className="phase-copy tight">
                Everything you already sent into Abbie&apos;s inbox.
              </p>
            </div>
            <button
              type="button"
              className="ghost tiny"
              onClick={() => refresh()}
            >
              Refresh
            </button>
          </div>
          <div className="inbox-list">
            {records.length === 0 && (
              <p className="empty-note">
                Nothing sent yet. Switch to Drop, paste something, swipe right.
              </p>
            )}
            {records.map((record) => (
              <article key={record.id} className="inbox-item">
                {record.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={record.blob?.url} alt={record.filename} />
                ) : (
                  <div className="inbox-glyph">
                    {kindEmoji(record.kind, record.family)}
                  </div>
                )}
                <div>
                  <strong>{record.filename}</strong>
                  <p>
                    {record.family} ·{' '}
                    {new Date(record.uploadedAt).toLocaleString()} ·{' '}
                    {Math.round((record.size || 0) / 1024)} KB
                  </p>
                  {record.blob?.url && (
                    <a href={record.blob.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
