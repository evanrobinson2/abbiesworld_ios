// The context engineering card: what a study drew on (Evan, 2026-10-23: "a right side card that lists your context
// engineering ... oracle consultation, game dev blogs, game design blogs, game design tutorials ... org-wide").
// One data file, /studies/context.json, feeds the Studies right panel, a study page opened on its own, and the static
// copy pasted into a study's artifact (tools/context-card/snippet.mjs). Kinds Evan named always show, even when empty.
const EDIT = 'https://github.com/evanrobinson2/abbiesworld_ios/blob/main/prototypes/ranch-atelier/dist/studies/context.json';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// A study can keep its own file in the aw.context-engineering.v1 shape ({groups: [{kind, items: [{title, url|ref, used}]}]},
// first written by the Facial Expressions study); the central entry points to it with `file`, relative to /studies/.
const REPO = 'https://github.com/evanrobinson2/abbiesworld_ios/blob/main/';
const KIND = [[/oracle/i, 'oracle'], [/dev|talk/i, 'devblog'], [/design/i, 'design'], [/tutorial/i, 'tutorial'], [/research|paper/i, 'research'], [/canon/i, 'canon']];
export function fromStudyFile(f){
 return (f?.groups || []).flatMap(g => {
  const k = (KIND.find(([re]) => re.test(g.kind)) || [, 'reference'])[1];
  return (g.items || []).map(x => ({k, t: x.title, href: x.url || (x.ref && !x.ref.includes('*') ? REPO + x.ref.replace(/^\/?studies\//, 'prototypes/ranch-atelier/dist/studies/') : undefined), note: x.used}));
 });
}

let cache;
export function loadContext(url = '/studies/context.json'){
 return cache ??= fetch(url).then(r => r.ok ? r.json() : null).then(async data => {
  if (!data) return null;
  const base = new URL(url, location.href);
  await Promise.all(Object.values(data.studies).filter(e => e.file).map(e =>
   fetch(new URL(e.file, base)).then(r => r.ok ? r.json() : null).then(f => { if (f) e.items = [...fromStudyFile(f), ...(e.items || [])]; }).catch(() => {})));
  return data;
 }).catch(() => null);
}

// {kinds: [{k, label, items, required}], recorded, count} for one study, following `same` and `use`.
export function resolveContext(data, id){
 const S = data?.studies || {}; let e = S[id], seen = new Set();
 while (e?.same && !seen.has(e.same)) { seen.add(e.same); e = S[e.same]; }
 const items = [...(e?.items || [])];
 for (const u of e?.use || []) {
  const d = data.digests?.[u]; if (!d) continue;
  items.push({k: 'canon', t: d.t, href: d.href});
  for (const x of d.items) items.push({...x, via: d.t});
 }
 const kinds = Object.entries(data?.kinds || {}).map(([k, label]) => ({k, label, required: (data.required || []).includes(k), items: items.filter(x => x.k === k)}))
  .filter(g => g.required || g.items.length);
 return {kinds, recorded: e?.recorded || '', count: items.length, known: !!e};
}

const item = x => `<li>${x.href ? `<a href="${esc(x.href)}" target="_blank" rel="noopener">${esc(x.t)}</a>` : `<span>${esc(x.t)}</span>`}${x.note || x.via ? `<small>${esc(x.note || 'via ' + x.via)}</small>` : ''}</li>`;

export function contextHTML(data, id){
 const r = resolveContext(data, id);
 return `<section class="ctx-card" aria-label="Context engineering"><h3>Context engineering</h3>
  <p class="ctx-lead">${r.known ? 'What this study drew on.' : 'Nothing recorded for this study yet.'}</p>
  ${r.kinds.map(g => `<details class="ctx-kind"${g.items.length <= 6 ? ' open' : ''}><summary><b>${esc(g.label)}</b><i>${g.items.length || ''}</i></summary>
   ${g.items.length ? `<ul>${g.items.map(item).join('')}</ul>` : '<p class="ctx-none">None recorded</p>'}</details>`).join('')}
  <p class="ctx-foot">${r.recorded ? `Recorded ${esc(r.recorded)}. ` : ''}<a href="${EDIT}" target="_blank" rel="noopener">Sources file</a></p></section>`;
}

export async function mountContext(el, id){
 const data = await loadContext();
 el.innerHTML = data ? contextHTML(data, id) : '<p class="ctx-none">The sources file did not load.</p>';
}

// On a study page opened on its own: <script type="module" src="/look/context-card.mjs" data-context-study="id">.
// Adds a small "Context" tab on the right edge that opens the card.
const tag = typeof document !== 'undefined' && document.querySelector('script[data-context-study]');
if (tag && !document.querySelector('.ctx-float')) {
 const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/look/context-card.css?v=1'; document.head.append(css);
 const box = document.createElement('aside'); box.className = 'ctx-float'; box.hidden = true;
 const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ctx-tab'; btn.textContent = 'Context';
 btn.onclick = async () => { box.hidden = !box.hidden; if (!box.hidden && !box.firstChild) await mountContext(box, tag.dataset.contextStudy); };
 document.body.append(btn, box);
}
