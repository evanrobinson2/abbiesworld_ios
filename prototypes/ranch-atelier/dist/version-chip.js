// Version label for Evan: plain small text (white with a crisp dark outline, so it reads on any background) in the bottom-right corner with the live version
// (v1.<PR>.<date>.<time>, local time). Tapping it opens the build queue: changes merged into main that wait for the
// next 10-minute deploy batch (docs/architecture/DEPLOYS.md). Presentation layer only; hidden from snapshots.
(() => {
  'use strict';
  if (window.VersionChip || typeof document === 'undefined') return;
  window.VersionChip = true;
  const REPO = 'evanrobinson2/abbiesworld_ios';
  const getJSON = url => fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const el = (tag, attrs = {}, ...children) => { const node = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'text') node.textContent = v; else if (k.startsWith('on')) node.addEventListener(k.slice(2), v); else node.setAttribute(k, v); } node.append(...children); return node; };
  const ago = iso => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !isFinite(m) ? '' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
  // Version name: v1.<PR number of the live merge or squash commit>.<local date>.<local time>, e.g. v1.181.2026.10.23.1248AM.
  const version = rel => {
    const d = new Date(rel?.builtAt), msg = String(rel?.message || ''), pr = (msg.match(/^Merge pull request #(\d+)/) || msg.split('\n')[0].match(/\(#(\d+)\)\s*$/) || [])[1] || '0';
    if (isNaN(d)) return 'v1.' + pr;
    const p2 = n => String(n).padStart(2, '0'), h = d.getHours() % 12 || 12;
    return `v1.${pr}.${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}.${h}${p2(d.getMinutes())}${d.getHours() < 12 ? 'AM' : 'PM'}`;
  };
  // A merge commit's PR title is its third line; anything else uses its first line.
  const title = message => { const lines = String(message || '').split('\n'); return (/^Merge pull request/.test(lines[0]) && lines[2]) || lines[0]; };

  const css = `
  .vchip{position:fixed;z-index:10005;right:max(10px,env(safe-area-inset-right));bottom:max(6px,env(safe-area-inset-bottom));padding:2px 0;border:0;background:none;color:#fff;font:700 12px/16px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.03em;-webkit-font-smoothing:antialiased;text-shadow:1px 0 #111,-1px 0 #111,0 1px #111,0 -1px #111,1px 1px #111,-1px -1px #111,1px -1px #111,-1px 1px #111;cursor:pointer}
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
      el('ul', {}, row(title(release?.message) || 'This version', `${version(release)} · ${(release?.sha || '').slice(0, 7)}`)),
      el('b', { text: 'Waiting for the next batch' }), list);
    document.body.append(pop);
    chip.setAttribute('aria-expanded', 'true');
    queue(list);
  }
  chip.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', e => { if (pop && !pop.contains(e.target)) toggle(); });

  getJSON('/app-release.json').then(rel => {
    release = rel;
    chip.textContent = rel?.sha ? version(rel) : 'dev';
    (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => document.body.append(chip));
  });
})();
