// The in-game What's new viewer (Evan, 2026-10-23: "keep these going and make sure I can review them ... just make an
// in game viewer"). Every card from /whats-new.json in one glass sheet over the game, Unread / All / Read, each with
// Open (its study or place) and Mark read. Read = dismissed: the same 'aw-notices-dismissed' list the update card
// (app-feedback.js) and the Notices page (theme/aw.mjs) use, so dismissing anywhere marks it read everywhere.
// Presentation layer only: it is drawn for the player and nothing in the world can perceive it.
const KEY = 'aw-notices-dismissed', TAB = 'aw-new-tab';
const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const day = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});

const CSS = `
.awn{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));background:transparent;border:0;margin:0;max-width:none;max-height:none;width:100%;height:100%;box-sizing:border-box}
.awn::backdrop{background:transparent}
.awn-sheet{display:grid;grid-template-rows:auto 1fr;width:min(980px,100%);height:min(860px,100%);border-radius:26px;overflow:hidden;color:var(--aw-ink,var(--app-ink,#4c4330));font:15px/1.45 var(--aw-font,var(--app-font,system-ui,sans-serif));
 background:linear-gradient(160deg,color-mix(in srgb,var(--aw-surface,#fffcf0) 94%,#fff),color-mix(in srgb,var(--aw-surface,#fffcf0) 86%,transparent));
 box-shadow:inset 0 1px 0 #fff9,inset 0 -1px 0 #0001,0 2px 6px #0002,0 24px 60px #2b281f55;border:1px solid color-mix(in srgb,#fff 50%,transparent);animation:awn-in .3s cubic-bezier(.2,.9,.3,1.1)}
@keyframes awn-in{from{opacity:0;transform:translateY(18px) scale(.98)}}
.awn-top{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--aw-line,#0001)}
.awn-top h2{margin:0;flex:1;font:700 21px/1.1 var(--aw-display,var(--app-heading,inherit))}
.awn-tabs{display:flex;gap:4px;padding:3px;border-radius:999px;background:color-mix(in srgb,currentColor 7%,transparent)}
.awn-tabs button{all:unset;cursor:pointer;padding:7px 14px;border-radius:999px;font-weight:600;font-size:14px;opacity:.7}
.awn-tabs button[aria-selected=true]{opacity:1;background:var(--aw-surface,#fff);box-shadow:0 1px 3px #0002}
.awn-tabs i{font-style:normal;margin-left:6px;font-size:11px;padding:1px 6px;border-radius:9px;background:var(--aw-accent,#b64932);color:var(--aw-on-accent,#fff)}
.awn-tabs i:empty{display:none}
.awn-x{all:unset;cursor:pointer;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;font-size:24px;line-height:1;background:color-mix(in srgb,currentColor 7%,transparent)}
.awn-body{overflow-y:auto;padding:4px 16px 24px;overscroll-behavior:contain}
.awn-bar{display:flex;align-items:center;gap:10px;margin:12px 0 2px;font-size:13px;opacity:.75}
.awn-bar button{all:unset;cursor:pointer;margin-left:auto;font-weight:700;color:var(--aw-accent,#b64932)}
.awn-day{margin:18px 0 10px;font:700 12px/1 inherit;letter-spacing:.1em;text-transform:uppercase;opacity:.6}
.awn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.awn-card{position:relative;display:grid;grid-template-rows:auto auto 1fr;border-radius:18px;overflow:hidden;background:var(--aw-bg,#fff);border:1px solid var(--aw-line,#0001);box-shadow:0 1px 2px #0001,0 6px 18px #0001}
.awn-card.read{opacity:.7}
.awn-pic{display:block;aspect-ratio:16/10;background:color-mix(in srgb,currentColor 6%,transparent)}
.awn-pic img{width:100%;height:100%;object-fit:contain;display:block}
.awn-new{position:absolute;top:10px;left:10px;padding:3px 9px;border-radius:999px;background:var(--aw-accent,#b64932);color:var(--aw-on-accent,#fff);font:800 11px/1.4 inherit;letter-spacing:.08em}
.awn-acts{display:flex;gap:6px;padding:10px 12px 0}
.awn-acts a,.awn-acts button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:999px;font-weight:700;font-size:13px;border:1px solid var(--aw-line,#0002)}
.awn-acts a{background:var(--aw-accent,#b64932);color:var(--aw-on-accent,#fff);border-color:transparent}
.awn-txt{display:grid;gap:4px;padding:8px 14px 14px;align-content:start}
.awn-txt h3{margin:0;font:700 17px/1.25 var(--aw-display,var(--app-heading,inherit))}
.awn-txt p{margin:0;font-size:14px;opacity:.78}
.awn-txt small{font-size:12px;opacity:.6}
.awn-empty{padding:48px 0;text-align:center;opacity:.7}
.awn :focus-visible{outline:2px solid var(--aw-accent,#b64932);outline-offset:2px}
@media (max-width:560px){.awn{padding:0}.awn-sheet{border-radius:0;height:100%}.awn-top{flex-wrap:wrap}.awn-tabs{order:3;width:100%}.awn-tabs button{flex:1;text-align:center}}
@media (prefers-reduced-motion:reduce){.awn-sheet{animation:none}}`;

let dlg, entries = [], f = get(TAB, 'unread');
const read = () => new Set(get(KEY, []));
function mark(ids, on){
 const d = read(); for (const id of ids) on ? d.add(id) : d.delete(id); set(KEY, [...d].slice(-600));
 dispatchEvent(new CustomEvent('aw-notices-change')); draw();
}
function draw(){
 const R = read(), unread = entries.filter(e => !R.has(e.id));
 dlg.querySelector('#awn-n').textContent = unread.length || '';
 for (const b of dlg.querySelectorAll('.awn-tabs button')) b.setAttribute('aria-selected', String(b.dataset.f === f));
 const list = f === 'unread' ? unread : f === 'read' ? entries.filter(e => R.has(e.id)) : entries;
 let html = `<div class="awn-bar"><span>${unread.length} unread of ${entries.length}</span>${unread.length && f !== 'read' ? '<button type="button" data-all>Mark all read</button>' : ''}</div>`;
 if (!list.length) html += `<p class="awn-empty">${f === 'unread' ? 'You’re all caught up.' : 'Nothing here yet.'}</p>`;
 let last = '';
 for (const e of list) {
  if (e.date !== last) { if (last) html += '</div>'; html += `<h4 class="awn-day">${esc(day(e.date))}</h4><div class="awn-grid">`; last = e.date; }
  const isRead = R.has(e.id), link = e.link ? esc(e.link) : '';
  html += `<article class="awn-card${isRead ? ' read' : ''}">${link ? `<a class="awn-pic" href="${link}">` : '<div class="awn-pic">'}${e.image ? `<img src="${esc(e.image)}" alt="" loading="lazy">` : ''}${link ? '</a>' : '</div>'}
   ${isRead ? '' : '<span class="awn-new">NEW</span>'}
   <div class="awn-acts">${link ? `<a href="${link}">Open</a>` : ''}<button type="button" data-id="${esc(e.id)}" data-on="${isRead ? '' : '1'}">${isRead ? 'Mark unread' : 'Mark read'}</button></div>
   <div class="awn-txt"><h3>${esc(e.title)}</h3><p>${esc(e.line)}</p>${e.threadTitle ? `<small>${esc(e.threadTitle)}</small>` : ''}</div></article>`;
 }
 dlg.querySelector('.awn-body').innerHTML = html + (last ? '</div>' : '');
}
function build(){
 const s = document.createElement('style'); s.textContent = CSS; s.dataset.feedbackUi = ''; document.head.append(s);
 dlg = document.createElement('dialog'); dlg.className = 'awn'; dlg.setAttribute('aria-label', "What's new"); dlg.dataset.feedbackUi = '';
 dlg.innerHTML = `<div class="awn-sheet"><div class="awn-top"><h2>What's new</h2><div class="awn-tabs" role="tablist" aria-label="Show">
  <button type="button" role="tab" data-f="unread">Unread<i id="awn-n"></i></button><button type="button" role="tab" data-f="all">All</button><button type="button" role="tab" data-f="read">Read</button></div>
  <button type="button" class="awn-x" aria-label="Close">×</button></div><div class="awn-body"></div></div>`;
 dlg.addEventListener('click', e => {
  if (e.target === dlg || e.target.closest('.awn-x')) return dlg.close();
  const t = e.target.closest('[data-f]'); if (t) { f = t.dataset.f; set(TAB, f); draw(); return; }
  const b = e.target.closest('button[data-id]'); if (b) return mark([b.dataset.id], !!b.dataset.on);
  if (e.target.closest('[data-all]')) mark(entries.map(x => x.id), true);
 });
 addEventListener('storage', e => { if (e.key === KEY && dlg.open) draw(); });
 document.body.append(dlg);
}
export async function openWhatsNew(show){
 if (!dlg) build();
 if (show) f = show;
 try { entries = ((await (await fetch('/whats-new.json', {cache: 'no-store'})).json()).entries || []).filter(e => e && e.id); } catch {}
 draw(); if (!dlg.open) dlg.showModal();
}
