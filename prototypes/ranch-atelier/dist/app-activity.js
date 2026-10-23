// The workshop: what the factory is making right now, inside the app (no Claude or ChatGPT on the phone).
// Toasts fly in when concept art or a model arrives, when a job asks a question, finishes or fails.
// The workshop panel shows every job (stages, partial progress, pictures, models in 3D) and the machines.
// Feed: /api/activity (dispatch bridge); ?activity=sample shows activity-sample.json. See FEEDBACK.md.
(() => {
  'use strict';
  if (window.AppActivity || typeof document === 'undefined') return;
  const sample = new URLSearchParams(location.search).get('activity') === 'sample';
  const FEED = sample ? '/activity-sample.json' : '/api/activity';
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };
  const el = (tag, attrs = {}, ...children) => { const node = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'text') node.textContent = v; else if (k.startsWith('on')) node.addEventListener(k.slice(2), v); else node.setAttribute(k, v === true ? '' : v); } node.append(...children.filter(c => c != null && c !== false)); return node; };
  const ago = at => { const s = Math.max(0, (Date.now() - Date.parse(at)) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`; };
  const safeUrl = url => typeof url === 'string' && /^(https:\/\/|\/(?!\/))/.test(url) ? url : null;
  const STATUS = { queued: 'Queued', running: 'Working', blocked: 'Waiting for you', done: 'Done', failed: 'Stopped' };
  const MACHINE = { working: 'Working', quiet: 'Thinking', waiting_for_evan: 'Waiting for you', idle: 'Idle', ready: 'Ready', offline: 'Offline' };

  const css = `
  .aw-fab{position:fixed;z-index:10010;left:12px;bottom:calc(env(safe-area-inset-bottom) + 176px);width:44px;height:44px;border-radius:50%;border:1px solid var(--app-border,#ded5b2);background:color-mix(in srgb,var(--app-paper,#fffcf0) 88%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 18px #2b281f2e;display:grid;place-items:center;color:var(--app-ink,#4c4330);cursor:pointer;padding:0}
  .aw-fab svg{width:24px;height:24px}
  .aw-fab.working::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid transparent;border-top-color:var(--app-accent,#b64932);animation:aw-spin 1.6s linear infinite}
  .aw-fab .aw-count{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--app-accent,#b64932);color:#fff;font:800 11px/18px var(--app-font,system-ui,sans-serif);text-align:center}
  .aw-fab .aw-count.ask{background:#d08a1c}
  @keyframes aw-spin{to{transform:rotate(360deg)}}
  .aw-toasts{position:fixed;z-index:10025;top:max(10px,env(safe-area-inset-top));right:10px;display:flex;flex-direction:column;gap:8px;width:min(92vw,360px);pointer-events:none}
  .aw-toast{pointer-events:auto;display:flex;gap:10px;align-items:center;padding:8px 12px 8px 8px;border-radius:18px;background:var(--app-paper,#fffcf0);border:1px solid var(--app-border,#ded5b2);box-shadow:0 14px 36px #2b281f38;font-family:var(--app-font,system-ui,sans-serif);color:var(--app-ink,#4c4330);cursor:pointer;animation:aw-fly .5s cubic-bezier(.2,.9,.3,1.25);text-align:left}
  .aw-toast img,.aw-toast .aw-glyph{width:56px;height:56px;border-radius:12px;object-fit:cover;flex:none;background:#e9e3cf;display:grid;place-items:center;font-size:24px}
  .aw-toast b{display:block;font-size:13px;font-weight:800}
  .aw-toast span{display:block;font-size:12px;line-height:1.3;color:var(--app-muted,#797058);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  @keyframes aw-fly{from{opacity:0;transform:translate(40px,-10px) scale(.85) rotate(4deg)}}
  .aw-panel{position:fixed;z-index:10022;inset:auto 0 0 0;margin:0 auto;width:min(100vw,560px);height:min(88vh,860px);background:var(--app-paper,#fffcf0);color:var(--app-ink,#4c4330);border-radius:24px 24px 0 0;box-shadow:0 -18px 48px #2b281f40;font-family:var(--app-font,system-ui,sans-serif);display:flex;flex-direction:column;animation:aw-up .32s cubic-bezier(.2,.9,.3,1.05)}
  @keyframes aw-up{from{transform:translateY(40px);opacity:0}}
  .aw-scrim{position:fixed;inset:0;z-index:10021;background:#2b281f40}
  .aw-head{display:flex;align-items:center;gap:10px;padding:16px 16px 8px}
  .aw-head h2{flex:1;margin:0;font:700 22px var(--app-heading,Georgia,serif)}
  .aw-x{width:44px;height:44px;border-radius:50%;border:1px solid var(--app-border,#ded5b2);background:transparent;color:inherit;font-size:20px;cursor:pointer}
  .aw-tabs{display:flex;gap:6px;padding:0 16px 8px}
  .aw-tab{min-height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--app-border,#ded5b2);background:transparent;color:inherit;font:700 14px var(--app-font,system-ui,sans-serif);cursor:pointer}
  .aw-tab[aria-selected="true"]{background:var(--app-ink,#4c4330);color:#fff;border-color:transparent}
  .aw-body{flex:1;overflow:auto;padding:4px 16px calc(env(safe-area-inset-bottom) + 20px);-webkit-overflow-scrolling:touch}
  .aw-note{font-size:12px;color:var(--app-muted,#797058);margin:2px 0 10px}
  .aw-job{border:1px solid var(--app-border,#ded5b2);border-radius:18px;padding:12px;margin-bottom:10px;background:#fff8;cursor:pointer;text-align:left;width:100%;color:inherit;font:inherit;display:block}
  .aw-job.ask{border-color:#d08a1c;box-shadow:0 0 0 2px #d08a1c33}
  .aw-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .aw-title{font-weight:800;font-size:15px;flex:1;min-width:0}
  .aw-chip{font-size:11px;font-weight:800;letter-spacing:.04em;padding:3px 8px;border-radius:9px;background:#ece5cf;color:var(--app-ink,#4c4330);text-transform:uppercase}
  .aw-chip.serious{background:#3d4a3a;color:#f5efd9}
  .aw-chip.running{background:#dfe9d6;color:#2f5b2a}.aw-chip.blocked{background:#f6e2bd;color:#7a4b06}.aw-chip.done{background:#e3e0d6}.aw-chip.failed{background:#f3d3cc;color:#8b2a17}
  .aw-steps{display:flex;gap:3px;margin:10px 0 6px}
  .aw-steps i{flex:1;height:6px;border-radius:3px;background:#e4ddc6}
  .aw-steps i.done{background:var(--app-ink,#4c4330)}
  .aw-steps i.now{background:var(--app-accent,#b64932);animation:aw-glow 1.4s ease-in-out infinite}
  @keyframes aw-glow{50%{opacity:.45}}
  .aw-stage{font-size:12px;color:var(--app-muted,#797058)}
  .aw-bar{height:8px;border-radius:4px;background:#e4ddc6;overflow:hidden;margin-top:6px}
  .aw-bar b{display:block;height:100%;background:var(--app-accent,#b64932);border-radius:4px;transition:width .6s}
  .aw-strip{display:flex;gap:6px;margin-top:10px;overflow-x:auto}
  .aw-strip img,.aw-strip .aw-3d{width:64px;height:64px;border-radius:10px;object-fit:cover;flex:none;background:#e9e3cf;display:grid;place-items:center;font:800 12px var(--app-font,system-ui,sans-serif)}
  .aw-machines{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
  .aw-machine{border:1px solid var(--app-border,#ded5b2);border-radius:18px;padding:12px;background:#fff8}
  .aw-machine .aw-kind{font-size:28px}
  .aw-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#b8b19c;margin-right:6px}
  .aw-dot.working{background:#4f9a45;animation:aw-glow 1.2s infinite}.aw-dot.waiting_for_evan{background:#d08a1c}.aw-dot.ready{background:#4f9a45}.aw-dot.offline{background:#c0442c}.aw-dot.quiet{background:#7aa7c7}
  .aw-back{border:0;background:none;color:var(--app-accent,#b64932);font:700 14px var(--app-font,system-ui,sans-serif);padding:6px 0;cursor:pointer}
  .aw-gallery{display:grid;gap:10px;margin:10px 0}
  @media (min-width:520px){.aw-gallery.pair{grid-template-columns:1fr 1fr}}
  .aw-gallery model-viewer{display:block}
  .aw-gallery img,.aw-gallery model-viewer{width:100%;aspect-ratio:1;border-radius:16px;background:#ece6d2;object-fit:cover}
  .aw-gallery figure{margin:0}.aw-gallery figcaption{font-size:11px;color:var(--app-muted,#797058);margin-top:4px}
  .aw-timeline{list-style:none;padding:0;margin:12px 0}
  .aw-timeline li{border-left:2px solid #e4ddc6;padding:0 0 12px 12px;position:relative;font-size:13px;line-height:1.4}
  .aw-timeline li::before{content:'';position:absolute;left:-6px;top:3px;width:10px;height:10px;border-radius:50%;background:var(--app-paper,#fffcf0);border:2px solid var(--app-ink,#4c4330)}
  .aw-timeline small{display:block;color:var(--app-muted,#797058);font-size:11px}
  .aw-reply textarea{width:100%;box-sizing:border-box;min-height:70px;padding:10px 12px;border-radius:14px;border:1px solid var(--app-border,#ded5b2);background:#fff;color:inherit;font:16px/1.4 var(--app-font,system-ui,sans-serif)}
  .aw-reply button{margin-top:8px;min-height:44px;padding:0 18px;border-radius:14px;border:0;background:var(--app-accent,#b64932);color:#fff;font:700 15px var(--app-font,system-ui,sans-serif);cursor:pointer}
  .aw-empty{padding:30px 10px;text-align:center;color:var(--app-muted,#797058);font-size:14px}
  @media (prefers-reduced-motion:reduce){.aw-toast,.aw-panel{animation:none}.aw-fab.working::after{animation:none}}`;
  document.head.append(el('style', { 'data-feedback-ui': '' }, css));

  let data = { jobs: [], machines: [], events: [], source: 'offline' }, panel = null, view = { tab: 'jobs', job: null }, timer = null;
  const toasts = el('div', { class: 'aw-toasts', 'aria-live': 'polite', 'data-feedback-ui': '' });
  const fab = el('button', { class: 'aw-fab', type: 'button', 'aria-label': 'Workshop: what is being made', 'data-feedback-ui': '' });
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20.5V10l5 3V10l5 3V10l5 3V4.5h3v16Z"/><path d="M7 17h2M12 17h2"/></svg>';
  const count = el('span', { class: 'aw-count', hidden: true });
  fab.append(count);
  fab.addEventListener('click', () => open());

  const jobOf = id => data.jobs.find(j => j.parcel_id === id);
  const serious = job => job?.mode === 'bespoke' || data.events.some(e => e.jobId === job?.parcel_id && e.jobKind === 'serious');
  const fraction = job => job.progress?.fraction ?? (job.progress?.total ? job.progress.done / job.progress.total : null);
  const stageIndex = job => Math.max(0, (job.stages || []).findIndex(s => s.name === job.stage));

  // Toasts for new pictures, models, questions, finishes and failures.
  const notable = e => e.image || e.model || e.images?.length || ['blocked', 'done', 'failed'].includes(e.status) || e.kind === 'question';
  function toast(e) {
    const image = safeUrl(e.image || e.images?.[0]);
    const what = e.model ? 'Model ready' : e.image || e.images?.length ? (e.checkpoint === 'concept_art' ? 'Concept art' : 'New picture') : e.status === 'blocked' || e.kind === 'question' ? 'Needs you' : e.status === 'done' ? 'Finished' : e.status === 'failed' ? 'Stopped' : 'Update';
    const node = el('button', { class: 'aw-toast', type: 'button', onclick: () => { node.remove(); open(e.jobId); } },
      image ? el('img', { src: image, alt: '' }) : el('div', { class: 'aw-glyph', text: e.model ? '◆' : e.status === 'done' ? '✓' : e.status === 'failed' ? '!' : '?' }),
      el('div', {}, el('b', { text: `${what} · ${e.jobTitle || 'Job'}` }), el('span', { text: e.message || STATUS[e.status] || '' })));
    toasts.prepend(node);
    while (toasts.children.length > 3) toasts.lastChild.remove();
    setTimeout(() => node.remove(), 8000);
  }

  async function poll() {
    clearTimeout(timer);
    if (!document.hidden) {
      const next = await fetch(FEED, { cache: 'no-store' }).then(r => r.ok ? r.json() : r.status === 401 ? { source: 'offline', error: 'Sign in on ranch.abbies.world to see the workshop' } : null).catch(() => null);
      if (next) {
        data = { jobs: next.jobs || [], machines: next.machines || [], events: next.events || [], source: next.source || 'live', error: next.error };
        const since = store.get('aw-seen-at');
        const fresh = data.events.filter(e => e.at && (since ? e.at > since : sample || Date.now() - Date.parse(e.at) < 15 * 60000) && notable(e));
        fresh.slice(0, 3).reverse().forEach(toast);
        const newest = data.events.map(e => e.at).filter(Boolean).sort().pop();
        if (newest && (!since || newest > since)) store.set('aw-seen-at', newest);
        render();
      }
    }
    const busy = data.jobs.some(j => j.status === 'running' || j.status === 'queued');
    timer = setTimeout(poll, busy ? 15000 : 60000);
  }

  function render() {
    const running = data.jobs.filter(j => j.status === 'running' || j.status === 'queued').length;
    const asks = data.jobs.filter(j => j.needs_input || j.status === 'blocked').length;
    fab.classList.toggle('working', running > 0);
    count.hidden = !(running + asks);
    count.textContent = asks || running;
    count.classList.toggle('ask', asks > 0);
    // Redraw only when what the panel shows changed, so an open 3D model is not reloaded on every poll.
    const shown = JSON.stringify(view.job ? [jobOf(view.job), data.events.filter(e => e.jobId === view.job)] : [data.jobs, data.machines, data.source]);
    if (panel && shown !== lastShown) draw();
  }
  let lastShown = '';

  function jobCard(job) {
    const f = fraction(job), i = stageIndex(job), arts = (job.artifacts || []).slice().reverse();
    return el('button', { class: `aw-job${job.needs_input || job.status === 'blocked' ? ' ask' : ''}`, type: 'button', onclick: () => { view.job = job.parcel_id; draw(); } },
      el('div', { class: 'aw-row' }, el('span', { class: 'aw-title', text: job.title || job.parcel_id }),
        serious(job) && el('span', { class: 'aw-chip serious', text: 'Serious' }),
        el('span', { class: `aw-chip ${job.status}`, text: STATUS[job.status] || job.status })),
      job.stages?.length ? el('div', { class: 'aw-steps', 'aria-hidden': 'true' }, ...job.stages.map((s, k) => el('i', { class: k < i || job.status === 'done' ? 'done' : k === i ? (job.status === 'running' ? 'now' : 'done') : '' }))) : null,
      el('div', { class: 'aw-stage', text: [job.stage, job.progress?.total ? `${job.progress.done} of ${job.progress.total} ${job.progress.unit || ''}`.trim() : null].filter(Boolean).join(' · ') }),
      f != null && job.status !== 'done' ? el('div', { class: 'aw-bar' }, el('b', { style: `width:${Math.round(Math.min(1, Math.max(0, f)) * 100)}%` })) : null,
      arts.length ? el('div', { class: 'aw-strip' }, ...arts.slice(0, 6).map(a => a.type === 'model' ? el('div', { class: 'aw-3d', text: '3D' }) : safeUrl(a.url) && el('img', { src: safeUrl(a.url), alt: a.stage || '', loading: 'lazy' }))) : null);
  }

  let viewerLoading = null;
  const loadViewer = () => viewerLoading ||= new Promise(resolve => { if (customElements.get('model-viewer')) return resolve(); const s = el('script', { type: 'module', src: 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js' }); s.onload = resolve; s.onerror = resolve; document.head.append(s); });

  function jobDetail(job) {
    const events = data.events.filter(e => e.jobId === job.parcel_id);
    const pictures = [...new Set([...(job.artifacts || []).filter(a => a.type === 'image').map(a => a.url), ...events.flatMap(e => [e.image, ...(e.images || [])])].map(safeUrl).filter(Boolean))];
    const models = [...new Set([...(job.artifacts || []).filter(a => a.type === 'model').map(a => a.url), ...events.flatMap(e => [e.model, ...(e.models || [])])].map(safeUrl).filter(Boolean))];
    if (models.length) loadViewer();
    // Rule: a model made to match a picture sits next to that picture, turnable.
    const gallery = el('div', { class: `aw-gallery${models.length && pictures.length ? ' pair' : ''}` },
      ...models.slice(0, 1).map(src => el('figure', {}, el('model-viewer', { src, 'camera-controls': true, 'auto-rotate': true, 'shadow-intensity': '1', 'touch-action': 'pan-y', alt: job.title || '3D model' }), el('figcaption', { text: 'Turn it with your finger' }))),
      ...pictures.slice(0, 6).map(src => el('figure', {}, el('img', { src, alt: '', loading: 'lazy' }))));
    const box = el('textarea', { placeholder: job.needs_input || job.status === 'blocked' ? 'Answer the question…' : 'Change something while it works…', 'aria-label': 'Note for this job' });
    const send = el('button', { type: 'button', text: sample ? 'Send (demo)' : 'Send to this job' });
    send.addEventListener('click', async () => {
      if (!box.value.trim()) return box.focus();
      send.disabled = true; send.textContent = 'Sending…';
      const ok = sample || await fetch('/api/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dispatch_id: job.parcel_id, instructions: box.value }) }).then(r => r.ok || r.status).catch(() => false);
      send.textContent = ok === true ? 'Sent. It picks this up at its next step.' : ok === 401 ? 'Sign in on ranch.abbies.world first.' : 'Could not send. Try again.';
      if (ok === true) box.value = ''; send.disabled = false;
    });
    const i = stageIndex(job);
    return el('div', {},
      el('button', { class: 'aw-back', type: 'button', text: '‹ All jobs', onclick: () => { view.job = null; draw(); } }),
      el('div', { class: 'aw-row' }, el('span', { class: 'aw-title', text: job.title }), serious(job) && el('span', { class: 'aw-chip serious', text: 'Serious' }), el('span', { class: `aw-chip ${job.status}`, text: STATUS[job.status] || job.status })),
      job.stages?.length ? el('div', { class: 'aw-steps' }, ...job.stages.map((s, k) => el('i', { title: s.name, class: k < i || job.status === 'done' ? 'done' : k === i ? (job.status === 'running' ? 'now' : 'done') : '' }))) : null,
      el('div', { class: 'aw-stage', text: (job.stages || []).map((s, k) => (k === i ? `▸ ${s.name}` : s.name)).join('  ·  ') }),
      fraction(job) != null && job.status !== 'done' ? el('div', { class: 'aw-bar' }, el('b', { style: `width:${Math.round(fraction(job) * 100)}%` })) : null,
      pictures.length || models.length ? gallery : el('div', { class: 'aw-empty', text: 'No pictures yet. They appear here as each stage finishes.' }),
      el('div', { class: 'aw-reply' }, box, send),
      el('ul', { class: 'aw-timeline' }, ...events.map(e => el('li', {}, el('small', { text: `${ago(e.at)} · ${e.stage || ''}` }), e.message || STATUS[e.status] || ''))));
  }

  function draw() {
    lastShown = JSON.stringify(view.job ? [jobOf(view.job), data.events.filter(e => e.jobId === view.job)] : [data.jobs, data.machines, data.source]);
    const body = panel.querySelector('.aw-body');
    for (const t of panel.querySelectorAll('.aw-tab')) t.setAttribute('aria-selected', String(t.dataset.tab === view.tab));
    panel.querySelector('.aw-tabs').hidden = !!view.job;
    const scroll = body.scrollTop;
    body.replaceChildren();
    if (data.source !== 'live') body.append(el('p', { class: 'aw-note', text: data.source === 'sample' ? 'Demo jobs (real feed off).' : data.error || 'Workshop feed offline.' }));
    const job = view.job && jobOf(view.job);
    if (job) { body.append(jobDetail(job)); return; }
    view.job = null;
    if (view.tab === 'jobs') {
      const order = { blocked: 0, running: 1, queued: 2, failed: 3, done: 4 };
      const jobs = data.jobs.slice().sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5));
      body.append(...(jobs.length ? jobs.map(jobCard) : [el('div', { class: 'aw-empty', text: 'Nothing in the workshop right now.' })]));
    } else {
      const machines = data.machines.length ? data.machines : [];
      body.append(machines.length ? el('div', { class: 'aw-machines' }, ...machines.map(m => {
        const doing = data.jobs.find(j => j.machine?.kind === m.kind && j.machine?.state === m.state && j.status !== 'done');
        return el('div', { class: 'aw-machine' }, el('div', { class: 'aw-kind', text: m.kind === 'midjourney' ? '🎨' : m.kind === 'claude' ? '🛠' : '⚙️' }),
          el('div', { class: 'aw-title', text: m.id || m.kind }),
          el('div', { class: 'aw-stage' }, el('span', { class: `aw-dot ${m.state}` }), MACHINE[m.state] || m.state || ''),
          doing && el('div', { class: 'aw-stage', text: `On: ${doing.title}` }));
      })) : el('div', { class: 'aw-empty', text: 'No machines reporting.' }));
    }
    body.scrollTop = scroll;
  }

  function open(jobId = null) {
    view.job = jobId; if (panel) return draw();
    const scrim = el('div', { class: 'aw-scrim', 'data-feedback-ui': '' });
    const close = () => { panel?.remove(); scrim.remove(); panel = null; };
    scrim.addEventListener('click', close);
    panel = el('section', { class: 'aw-panel', role: 'dialog', 'aria-label': 'Workshop', 'data-feedback-ui': '' },
      el('div', { class: 'aw-head' }, el('h2', { text: 'Workshop' }), el('button', { class: 'aw-x', type: 'button', 'aria-label': 'Close', text: '×', onclick: close })),
      el('div', { class: 'aw-tabs', role: 'tablist' }, ...[['jobs', 'Jobs'], ['machines', 'Machines']].map(([tab, label]) => el('button', { class: 'aw-tab', role: 'tab', type: 'button', 'data-tab': tab, text: label, onclick: () => { view = { tab, job: null }; draw(); } }))),
      el('div', { class: 'aw-body' }));
    document.body.append(scrim, panel);
    draw();
    poll();
  }

  const mount = () => { document.body.append(toasts, fab); poll(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
  window.AppActivity = { open, refresh: poll, data: () => data };
})();
