// Version chip for Evan: a tiny glass pill in the bottom-right corner with the live version (short sha and
// deploy time, local time). Tapping it opens the build queue: changes merged into main that wait for the
// next 10-minute deploy batch (docs/architecture/DEPLOYS.md). Presentation layer only; hidden from snapshots.
(() => {
  'use strict';
  if (window.VersionChip || typeof document === 'undefined') return;
  window.VersionChip = true;
  const REPO = 'evanrobinson2/abbiesworld_ios';
  const getJSON = url => fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const el = (tag, attrs = {}, ...children) => { const node = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'text') node.textContent = v; else if (k.startsWith('on')) node.addEventListener(k.slice(2), v); else node.setAttribute(k, v); } node.append(...children); return node; };
  const when = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !isFinite(m) ? '' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
  // A merge commit's PR title is its third line; anything else uses its first line.
  const title = message => { const lines = String(message || '').split('\n'); return (/^Merge pull request/.test(lines[0]) && lines[2]) || lines[0]; };

  const css = `
  .vchip{position:fixed;z-index:10005;right:max(10px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));height:22px;padding:0 9px;border-radius:999px;border:1px solid #ffffff73;background:linear-gradient(180deg,#ffffff59,#ffffff26);backdrop-filter:blur(10px) saturate(1.4);-webkit-backdrop-filter:blur(10px) saturate(1.4);box-shadow:0 2px 8px #2b281f26,inset 0 1px 0 #ffffffa6;color:#3d3627c7;font:600 10px/22px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.02em;cursor:pointer;opacity:.78;transition:opacity .15s}
  .vchip:hover,.vchip[aria-expanded=true]{opacity:1}
  .vchip-pop{position:fixed;z-index:10006;right:max(10px,env(safe-area-inset-right));bottom:calc(max(8px,env(safe-area-inset-bottom)) + 30px);width:min(86vw,320px);max-height:50vh;overflow:auto;padding:12px 14px;border-radius:18px;border:1px solid #ffffff80;background:color-mix(in srgb,var(--app-paper,#fffcf0) 90%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 14px 36px #2b281f40;color:var(--app-ink,#4c4330);font:13px/1.35 var(--app-font,system-ui,sans-serif);animation:vchip-up .2s ease-out}
  @keyframes vchip-up{from{opacity:0;transform:translateY(8px)}}
  .vchip-pop b{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--app-muted,#797058);margin:8px 0 4px}
  .vchip-pop b:first-child{margin-top:0}
  .vchip-pop ul{list-style:none;margin:0;padding:0}
  .vchip-pop li{padding:4px 0;border-top:1px solid #0000000f}
  .vchip-pop li:first-child{border-top:0}
  .vchip-pop small{color:var(--app-muted,#797058);font-size:11px}
  .vchip-pop code{font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace}`;
  document.head.append(el('style', { text: css }));

  let release = null, pop = null;
  const chip = el('button', { class: 'vchip', type: 'button', 'aria-label': 'Version and build queue', 'aria-expanded': 'false', 'data-feedback-ui': '' });

  const row = (main, sub) => el('li', {}, el('div', { text: main }), el('small', { text: sub }));
  async function queue(list) {
    if (!release?.sha) { list.replaceChildren(row('Unknown', 'This build has no version stamp')); return; }
    const cmp = await getJSON(`https://api.github.com/repos/${REPO}/compare/${release.sha}...main`);
    if (!cmp) { list.replaceChildren(row('Could not reach GitHub', 'Try again in a minute')); return; }
    // Main's own history (first parents from the head back to the live sha): one row per merged PR or direct commit.
    const bySha = new Map((cmp.commits || []).map(c => [c.sha, c]));
    const shown = [];
    for (let c = (cmp.commits || []).at(-1); c; c = bySha.get(c.parents?.[0]?.sha)) shown.push(c);
    list.replaceChildren(...(shown.length
      ? shown.map(c => row(title(c.commit.message), `${c.sha.slice(0, 7)} · merged ${ago(c.commit.committer?.date)}`))
      : [row('Nothing waiting', 'Everything on main is live')]));
  }

  function toggle() {
    if (pop) { pop.remove(); pop = null; chip.setAttribute('aria-expanded', 'false'); return; }
    const list = el('ul', {}, row('Checking…', ''));
    pop = el('section', { class: 'vchip-pop', role: 'dialog', 'aria-label': 'Build queue', 'data-feedback-ui': '' },
      el('b', { text: 'Live now' }),
      el('ul', {}, row(title(release?.message) || 'This version', `${(release?.sha || '').slice(0, 7)} · ${when(release?.builtAt)}`)),
      el('b', { text: 'Waiting for the next batch' }), list);
    document.body.append(pop);
    chip.setAttribute('aria-expanded', 'true');
    queue(list);
  }
  chip.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', e => { if (pop && !pop.contains(e.target)) toggle(); });

  getJSON('/app-release.json').then(rel => {
    release = rel;
    chip.textContent = rel?.sha ? `${rel.sha.slice(0, 7)} · ${when(rel.builtAt)}` : 'dev';
    (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => document.body.append(chip));
  });
})();
