// Project chat panel (AW-STUDY-0061): a right-side glass chat that passes Evan's words to the project (api/project-chat.js).
// Presentation layer only: nothing here enters the world. Mount it once; it stays hidden unless the API says it is enabled for
// the signed-in owner, so players never see it. Hex hookup for the board: dispatch
//   window.dispatchEvent(new CustomEvent('aw:hex-selected', {detail: {id, label}}))   (detail null clears it)
// and give mountProjectChat a `mount` element (default document.body).
import {buildPacks, search, allowed, summary} from './packs.mjs';
const STEPS = ['sent', 'received', 'working', 'result'], LABEL = {sent: 'Sent', received: 'Received', working: 'Working on it', result: 'Done: see below'};
export function installProjectChatStyle() {
  if (document.getElementById('pc-style')) return; const s = document.createElement('style'); s.id = 'pc-style';
  s.textContent = `#pc{position:fixed;right:10px;top:70px;bottom:12px;width:min(340px,92vw);display:none;flex-direction:column;gap:8px;padding:10px;z-index:30;color:#fff8ee;font:600 14px ui-rounded,system-ui,sans-serif;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:18px;backdrop-filter:blur(14px) saturate(1.4);box-shadow:0 8px 28px #0006,inset 0 1px 0 #fff4}
#pc.open{display:flex}#pc header{display:flex;justify-content:space-between;align-items:center}#pc .hex{font-size:12px;color:#d9cbe8;min-height:16px}
#pc .log{flex:1;overflow:auto;display:grid;gap:8px;align-content:start;-webkit-user-select:text;user-select:text}#pc .m{padding:8px 10px;border-radius:12px;font-weight:500;white-space:pre-wrap}
#pc .you{background:#ffffff30;justify-self:end;max-width:92%}#pc .proj{background:#0005;max-width:96%}#pc .steps{display:flex;gap:4px;margin-top:6px}
#pc .steps i{flex:1;height:5px;border-radius:3px;background:#ffffff30}#pc .steps i.on{background:#5ee08a}#pc small{display:block;margin-top:4px;color:#d9cbe8;font-weight:600;font-size:12px}
#pc form{display:flex;gap:6px}#pc textarea{flex:1;resize:none;height:44px;font:inherit;color:#fff8ee;background:#0006;border:1px solid rgba(255,255,255,.28);border-radius:12px;padding:8px 10px}
#pc button{font:inherit;color:#fff8ee;background:#ffffff1c;border:1px solid rgba(255,255,255,.28);border-radius:12px;padding:8px 12px;cursor:pointer}
#pc .tabs{display:flex;gap:6px}#pc .tabs button.on{background:#ffffff40}#pc .packs{flex:1;overflow:auto;display:none;gap:8px;align-content:start}#pc.packsview .packs{display:grid}#pc.packsview .log,#pc.packsview form{display:none}
#pc .pk{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:6px;border-radius:12px;background:#0004;border:2px solid transparent;cursor:pointer;text-align:left}
#pc .pk.inc{border-color:#5ee08a}#pc .pk.exc{border-color:#ff6b6b;opacity:.75}#pc .pk .th{display:grid;grid-template-columns:1fr 1fr;width:44px;height:44px;border-radius:8px;overflow:hidden;background:#ffffff18}#pc .pk .th img{width:22px;height:22px;object-fit:cover}
#pc .pk b{font-size:13px}#pc .pk small{display:block;color:#d9cbe8;font-weight:600;font-size:11px}#pc .pk em{font-style:normal;font-size:12px}#pc .packs h4{margin:6px 2px 0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#d9cbe8}
#pc .pkfoot{font-size:12px;color:#d9cbe8;display:none}#pc.packsview .pkfoot{display:block}#pc .packs input{font:inherit;color:#fff8ee;background:#0006;border:1px solid rgba(255,255,255,.28);border-radius:12px;padding:8px 10px}
#pc-open{position:fixed;right:10px;top:12px;z-index:31;display:none;font:700 14px ui-rounded,system-ui;color:#fff8ee;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:14px;padding:8px 12px;cursor:pointer;backdrop-filter:blur(12px)}`;
  document.head.append(s);
}
export async function mountProjectChat({mount = document.body, api = '/api/project-chat', fetcher = fetch, poll = 8000, library = '/models/library.json', thumbBase = ''} = {}) {
  let st; try { st = await (await fetcher(api, {credentials: 'same-origin'})).json(); } catch { return null; }
  if (!st?.enabled) return null;                                   // players: nothing is drawn at all
  installProjectChatStyle(); let hex = null; const items = [];
  const open = document.createElement('button'); open.id = 'pc-open'; open.textContent = 'Project chat'; open.style.display = 'block';
  const box = document.createElement('aside'); box.id = 'pc'; box.setAttribute('aria-label', 'Project chat');
  box.innerHTML = `<header><b>Project chat</b><button type="button" class="x" aria-label="Close">×</button></header><div class="tabs"><button type="button" data-tab="chat" class="on">Chat</button><button type="button" data-tab="packs">Packs</button></div><div class="hex"></div><div class="log"></div><div class="packs"></div><div class="pkfoot"></div><form><textarea placeholder="${st.ready ? 'Tell the project what you want…' : 'Not connected yet'}" maxlength="2000"></textarea><button>Send</button></form>`;
  mount.append(open, box); const log = box.querySelector('.log'), hexEl = box.querySelector('.hex'), ta = box.querySelector('textarea');
  // Packs: include or exclude groups of library models; the choice rides along with every message.
  let items_ = [], packs = [], state = {include: new Set(), exclude: new Set()}; try { const j = JSON.parse(localStorage.getItem('aw-project-packs')); if (j) state = {include: new Set(j.include), exclude: new Set(j.exclude)}; } catch {}
  const packsEl = box.querySelector('.packs'), foot = box.querySelector('.pkfoot'), save = () => { try { localStorage.setItem('aw-project-packs', JSON.stringify({include: [...state.include], exclude: [...state.exclude]})); } catch {} };
  const sum = () => summary(packs, state, allowed(items_, packs, state).size, items_.length);
  const drawPacks = (extra = null) => {
    packsEl.innerHTML = ''; const find = document.createElement('input'); find.placeholder = 'Describe a pack: zombies, cozy kitchen, space…'; find.value = extra?.text || ''; find.onkeydown = e => { if (e.key === 'Enter') { const r = search(items_, find.value); drawPacks(r.keys.length ? {text: find.value, pack: {id: 'q:' + r.title, title: r.title + ' (search)', kind: 'your search', keys: r.keys, thumbs: r.keys.slice(0, 4).map(k => items_.find(i => i.key === k)?.thumb).filter(Boolean)}} : {text: find.value}); } }; packsEl.append(find);
    const all = extra?.pack ? [extra.pack, ...packs.filter(p => p.id !== extra.pack.id)] : packs; if (extra?.pack && !packs.some(p => p.id === extra.pack.id)) packs.unshift(extra.pack);
    let kind = ''; for (const p of (extra?.pack ? packs : all)) { if (p.kind !== kind) { kind = p.kind; const h = document.createElement('h4'); h.textContent = kind; packsEl.append(h); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pk' + (state.include.has(p.id) ? ' inc' : state.exclude.has(p.id) ? ' exc' : '');
      b.innerHTML = `<span class="th">${p.thumbs.map(t => `<img alt="" src="${thumbBase}${t}" onerror="this.remove()">`).join('')}</span><span><b></b><small>${p.keys.length} models</small></span><em>${state.include.has(p.id) ? '✓ in' : state.exclude.has(p.id) ? '✕ out' : 'tap'}</em>`; b.querySelector('b').textContent = p.title;
      b.onclick = () => { if (state.include.has(p.id)) { state.include.delete(p.id); state.exclude.add(p.id); } else if (state.exclude.has(p.id)) state.exclude.delete(p.id); else state.include.add(p.id); save(); drawPacks(extra); }; packsEl.append(b); }
    const n = allowed(items_, packs, state).size; foot.textContent = `${n} of ${items_.length} models allowed${state.include.size ? ' · only the ✓ packs' : ''}${state.exclude.size ? ' · minus the ✕ packs' : ''}. Tap: in, out, off.`;
  };
  (async () => { try { items_ = Array.isArray(library) ? library : (await (await fetcher(library)).json()).items; packs = buildPacks(items_); drawPacks(); } catch {} })();
  box.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { box.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b)); box.classList.toggle('packsview', b.dataset.tab === 'packs'); });
  const paint = it => { it.el.innerHTML = ''; const t = document.createElement('div'); t.textContent = it.text; it.el.append(t);
    const bar = document.createElement('div'); bar.className = 'steps'; STEPS.forEach((s, i) => { const b = document.createElement('i'); if (i <= STEPS.indexOf(it.status)) b.className = 'on'; bar.append(b); }); it.el.append(bar);
    const sm = document.createElement('small'); sm.textContent = it.error || LABEL[it.status]; it.el.append(sm); };
  const say = (cls, txt) => { const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = txt; log.append(d); log.scrollTop = 1e9; return d; };
  async function track(it) {
    if (!it.issue || it.status === 'result') return;
    try { const j = await (await fetcher(`${api}?issue=${it.issue}`, {credentials: 'same-origin'})).json(); if (j.status) { it.status = j.status; paint(it); (j.comments || []).filter(c => !it.seen.has(c.at + c.text)).forEach(c => { it.seen.add(c.at + c.text); say('proj', c.text); }); } } catch {}
    if (it.status !== 'result') setTimeout(() => track(it), poll);
  }
  box.querySelector('form').onsubmit = async e => {
    e.preventDefault(); const text = ta.value.trim(); if (!text) return; ta.value = '';
    const it = {text, status: 'sent', seen: new Set(), el: say('you', '')}; items.push(it); paint(it);
    try { const r = await fetcher(api, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: text, hex, page: location.pathname, packs: items_.length ? sum() : undefined})}); const j = await r.json(); if (!r.ok) throw j; it.issue = j.issue; track(it); }
    catch (err) { it.error = err?.error || 'Could not send. Try again.'; paint(it); }
  };
  addEventListener('aw:hex-selected', e => { hex = e.detail || null; hexEl.textContent = hex ? 'Selected hex: ' + (hex.label || hex.id) : ''; });
  open.onclick = () => box.classList.toggle('open'); box.querySelector('.x').onclick = () => box.classList.remove('open');
  return {box, open, items, packState: () => ({state, allowed: () => allowed(items_, packs, state)})};
}
