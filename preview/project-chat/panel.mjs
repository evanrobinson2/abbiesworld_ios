// Project chat panel (AW-STUDY-0061): a right-side glass chat that passes Evan's words to the project (api/project-chat.js).
// Presentation layer only: nothing here enters the world. Mount it once; it stays hidden unless the API says it is enabled for
// the signed-in owner, so players never see it. Hex hookup for the board: dispatch
//   window.dispatchEvent(new CustomEvent('aw:hex-selected', {detail: {id, label}}))   (detail null clears it)
// and give mountProjectChat a `mount` element (default document.body).
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
#pc-open{position:fixed;right:10px;top:12px;z-index:31;display:none;font:700 14px ui-rounded,system-ui;color:#fff8ee;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:14px;padding:8px 12px;cursor:pointer;backdrop-filter:blur(12px)}`;
  document.head.append(s);
}
export async function mountProjectChat({mount = document.body, api = '/api/project-chat', fetcher = fetch, poll = 8000} = {}) {
  let st; try { st = await (await fetcher(api, {credentials: 'same-origin'})).json(); } catch { return null; }
  if (!st?.enabled) return null;                                   // players: nothing is drawn at all
  installProjectChatStyle(); let hex = null; const items = [];
  const open = document.createElement('button'); open.id = 'pc-open'; open.textContent = 'Project chat'; open.style.display = 'block';
  const box = document.createElement('aside'); box.id = 'pc'; box.setAttribute('aria-label', 'Project chat');
  box.innerHTML = `<header><b>Project chat</b><button type="button" class="x" aria-label="Close">×</button></header><div class="hex"></div><div class="log"></div><form><textarea placeholder="${st.ready ? 'Tell the project what you want…' : 'Not connected yet'}" maxlength="2000"></textarea><button>Send</button></form>`;
  mount.append(open, box); const log = box.querySelector('.log'), hexEl = box.querySelector('.hex'), ta = box.querySelector('textarea');
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
    try { const r = await fetcher(api, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({message: text, hex, page: location.pathname})}); const j = await r.json(); if (!r.ok) throw j; it.issue = j.issue; track(it); }
    catch (err) { it.error = err?.error || 'Could not send. Try again.'; paint(it); }
  };
  addEventListener('aw:hex-selected', e => { hex = e.detail || null; hexEl.textContent = hex ? 'Selected hex: ' + (hex.label || hex.id) : ''; });
  open.onclick = () => box.classList.toggle('open'); box.querySelector('.x').onclick = () => box.classList.remove('open');
  return {box, open, items};
}
