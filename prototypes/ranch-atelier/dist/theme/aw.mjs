// Profile and settings for every page (docs/design/look/LOOK.md, "Profile and settings"). One sheet, the same
// everywhere: Profile (avatar, name, the Auth0 account), Style (the 20 styles in theme/themes.mjs), Sound, Controls,
// Accessibility and Places. Presentation layer only: plain DOM over the page, nothing in any world scene.
//
//   import {mountProfileButton, openSettings, setTheme} from '/theme/aw.mjs';
//   mountProfileButton(container)   // the round avatar that opens the sheet
//   openSettings('style')
import {THEMES, themeById} from './themes.mjs';

if (!window.AWLook) await new Promise(ok => { const s = document.createElement('script'); s.src = '/theme/boot.js?v=1'; s.onload = ok; s.onerror = ok; document.head.append(s); });
const L = window.AWLook, PROFILE = 'aw-profile';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const AVATARS = ['🦊', '🐰', '🐻', '🐼', '🦉', '🐢', '🐙', '🦄', '🐝', '🐸', '🐱', '🐴'];
export const getProfile = () => ({name: '', avatar: '🦊', color: '', ...load(PROFILE, {})});
export function setProfile(patch) { const p = {...getProfile(), ...patch}; save(PROFILE, p); refreshButtons(); dispatchEvent(new CustomEvent('aw-profile-change', {detail: p})); return p; }
export const currentTheme = () => L.state?.theme || L.ABBIE;
export const prefs = () => ({...(L.state?.prefs || {})});

function commit(state) {
  const saved = save(L.KEY, state);
  const s = L.apply(state);
  dispatchEvent(new CustomEvent('aw-look-change', {detail: s}));
  dispatchEvent(new CustomEvent('app-style-change', {detail: {index: s.theme.index || 0, name: s.theme.name}}));
  return saved;
}
export function setTheme(id) { const t = themeById(id); return commit({theme: {...t, index: THEMES.indexOf(t)}, prefs: prefs()}); }
export function setPref(key, value) { return commit({theme: currentTheme(), prefs: {...prefs(), [key]: value}}); }
// Keep the stored style in step with themes.mjs, so an edit to a style reaches every device.
{ const t = THEMES.find(x => x.id === currentTheme().id); if (t && JSON.stringify({...t, index: THEMES.indexOf(t)}) !== JSON.stringify(currentTheme())) setTheme(t.id); }

export function avatar(p = getProfile(), size = 36) {
  const bg = p.color || 'var(--aw-accent)';
  return `<span class="aw-avatar" style="--s:${size}px;background:${bg}" aria-hidden="true">${esc(p.avatar || '🦊')}</span>`;
}
const buttons = new Set();
function refreshButtons() { for (const b of buttons) b.innerHTML = avatar(getProfile(), Number(b.dataset.size) || 36); }
export function mountProfileButton(target, {size = 36, floating = false} = {}) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'aw-me' + (floating ? ' float' : ''); b.dataset.size = size;
  b.setAttribute('aria-label', 'Profile and settings'); b.setAttribute('aria-haspopup', 'dialog');
  b.onclick = () => openSettings();
  buttons.add(b); refreshButtons();
  (target || document.body).append(b);
  return b;
}
addEventListener('storage', e => { if (e.key === PROFILE) refreshButtons(); });

// ---------- the sheet ----------
const PAGES = [['profile', 'Profile'], ['style', 'Style'], ['sound', 'Sound'], ['controls', 'Controls'], ['access', 'Accessibility'], ['places', 'Places']];
const ICON = {
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  style: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.6" fill="currentColor"/><circle cx="12" cy="7.5" r="1.6" fill="currentColor"/><circle cx="16" cy="10" r="1.6" fill="currentColor"/><path d="M12 21c-1.5 0-2-1-2-2s1-2 2-2h2a3 3 0 0 0 3-3"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  controls: '<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/>',
  access: '<circle cx="12" cy="4.5" r="2"/><path d="M4 8.5l8 1.5 8-1.5M12 10v5l-3 6M12 15l3 6"/>',
  places: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
const sw = (id, label, on, hint = '') => `<label class="aws-row"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" role="switch" data-pref="${id}" ${on ? 'checked' : ''}></label>`;
let dlg = null, me = null, filter = 'all';

function stylePage() {
  const cur = currentTheme().id, chips = [['all', 'All'], ['light', 'Light'], ['dark', 'Dark'], ['toy', 'Toy']];
  const shown = THEMES.filter(t => filter === 'all' || (filter === 'toy' ? t.feel === 'toy' : t.kind === filter));
  return `<div class="aws-chips" role="group" aria-label="Show">${chips.map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${filter === k}">${l}</button>`).join('')}</div>
  <div class="aws-styles">${shown.map(t => `<button type="button" class="aws-style" data-theme="${t.id}" aria-pressed="${t.id === cur}" aria-label="${esc(t.name)}">
    <span class="mock" style="background:${t.bg};border-radius:calc(${t.radius} / 2 + 6px)">
      <span class="card" style="background:${t.surface};color:${t.ink};border-color:${t.line};border-radius:${t.radius};${t.feel === 'toy' ? `box-shadow:0 4px 0 color-mix(in srgb,${t.accent} 30%,${t.line})` : ''}">
        <b style="font-family:'${t.display}',sans-serif">Aa</b><i style="background:${t.accent}"></i><i style="background:${t.accent2}"></i>
        <s style="background:${t.soft}"></s><s style="background:${t.line};width:60%"></s></span></span>
    <span class="nm"><b>${esc(t.name)}</b><small>${esc(t.blurb)}</small></span></button>`).join('')}</div>`;
}
function profilePage() {
  const p = getProfile(), cols = ['', ...new Set(THEMES.map(t => t.accent))].slice(0, 11);
  const acct = !me ? `<p class="aws-quiet">Checking your account…</p>`
    : me.signedIn ? `<div class="aws-acct"><span><b>Signed in</b><small>Your worlds are kept with your account and follow you to any device.${me.left != null ? ` AI left: $${Number(me.left).toFixed(2)}.` : ''}</small></span><a class="aws-btn" href="/api/auth/logout">Sign out</a></div>`
    : me.signInReady === false ? `<div class="aws-acct"><span><b>Playing on this device</b><small>Sign-in isn't switched on here yet.</small></span></div>`
    : `<div class="aws-acct"><span><b>Playing on this device</b><small>Sign in with Google to keep your worlds on every device. A grown-up signs in; it is free.</small></span><a class="aws-btn primary" href="/api/auth/login?return=${encodeURIComponent(location.pathname + location.search + location.hash)}">Sign in</a></div>`;
  return `<div class="aws-hero">${avatar(p, 76)}<label class="aws-name"><small>Name</small><input type="text" id="aws-name" maxlength="24" placeholder="Your name" value="${esc(p.name)}" autocomplete="nickname"></label></div>
  <h3>Avatar</h3><div class="aws-avatars">${AVATARS.map(a => `<button type="button" data-avatar="${a}" aria-pressed="${p.avatar === a}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div>
  <h3>Colour</h3><div class="aws-colors">${cols.map(c => `<button type="button" data-color="${c}" aria-pressed="${(p.color || '') === c}" style="background:${c || 'var(--aw-accent)'}" aria-label="${c ? 'Colour ' + c : 'Match my style'}">${c ? '' : 'A'}</button>`).join('')}</div>
  <h3>Account</h3>${acct}<p class="aws-quiet">Your name, avatar and settings stay on this device.</p>`;
}
function soundPage() {
  const p = prefs(), jb = load('abbies-jukebox-v1', {}), vol = Math.round((Number.isFinite(jb.volume) ? jb.volume : .45) * 100);
  return `${sw('mute', 'Mute everything', p.mute, 'Music, voices and effects start silent.')}
  <label class="aws-row col"><span><b>Music volume</b><small>The jukebox, on every page.</small></span><input type="range" id="aws-music" min="0" max="100" value="${vol}" aria-label="Music volume"></label>`;
}
function controlsPage() {
  let dev = false; try { dev = localStorage.getItem('sandbox-developer') === 'true'; } catch {}
  const k = (a, b) => `<div class="aws-key"><kbd>${a}</kbd><span>${b}</span></div>`;
  return `<h3>In the world</h3><div class="aws-keys">${k('Drag', 'Turn around')}${k('Scroll · Pinch', 'Zoom')}${k('Shift-drag · Two fingers', 'Slide the view')}${k('Tap', 'Look at a person or thing')}${k('Esc', 'Close a card')}</div>
  <h3>In Studies</h3><div class="aws-keys">${k('[', 'Hide or show the list')}${k(']', 'Hide or show the details')}${k('Drag an edge', 'Make a panel wider')}</div>
  <h3>For grown-ups</h3><label class="aws-row"><span><b>Developer mode</b><small>Shows building tools in the sandbox. Takes effect when the sandbox next opens.</small></span><input type="checkbox" role="switch" id="aws-dev" ${dev ? 'checked' : ''}></label>`;
}
function accessPage() {
  const p = prefs();
  return sw('reduceMotion', 'Reduce motion', p.reduceMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches, 'Stops wobbles, slides and spins.')
    + sw('bigText', 'Larger text', p.bigText, 'Everything outside the game world gets bigger.')
    + sw('contrast', 'More contrast', p.contrast, 'Darker lines and stronger quiet text.')
    + sw('solid', 'Solid panels', p.solid, 'Glass becomes solid, nothing shows through.')
    + sw('readable', 'Easy-reading letters', p.readable, 'Atkinson Hyperlegible, made for low vision.');
}
function placesPage() {
  const a = (href, t, s) => `<a class="aws-place" href="${href}"><b>${t}</b><small>${s}</small></a>`;
  return `<div class="aws-places">${a('/studies/', 'Studies', 'Every study, newest first')}${a('/models', 'Models', 'Each model beside its picture')}${a('/cards', 'Cards', 'Open a pack, browse the binder')}${a('/sounds', 'Sounds', 'Every sound in the game')}${a('/live-voice', 'Voice', 'How Suzy sounds and listens')}${a('/sandbox', 'Play', 'Back to the world')}</div>`;
}
const RENDER = {profile: profilePage, style: stylePage, sound: soundPage, controls: controlsPage, access: accessPage, places: placesPage};

function show(page) {
  dlg.dataset.page = page;
  dlg.querySelectorAll('.aws-nav [data-page]').forEach(b => b.setAttribute('aria-current', b.dataset.page === page ? 'page' : 'false'));
  const body = dlg.querySelector('.aws-body');
  body.innerHTML = `<h2>${PAGES.find(p => p[0] === page)[1]}</h2>${RENDER[page]()}`;
  body.scrollTop = 0;
}
function head() {
  const p = getProfile();
  dlg.querySelector('.aws-who').innerHTML = `${avatar(p, 44)}<span><b>${esc(p.name || 'You')}</b><small>${me?.signedIn ? 'Signed in' : 'On this device'} · ${esc(currentTheme().name)}</small></span>`;
}
function build() {
  dlg = document.createElement('dialog');
  dlg.id = 'aw-settings'; dlg.className = 'aw-sheet'; dlg.setAttribute('aria-label', 'Profile and settings');
  dlg.innerHTML = `<div class="aws-shell"><nav class="aws-nav" aria-label="Settings"><div class="aws-who"></div>
    ${PAGES.map(([k, l]) => `<button type="button" data-page="${k}">${svg(k)}<span>${l}</span></button>`).join('')}</nav>
    <div class="aws-body"></div><button type="button" class="aws-x" aria-label="Close">×</button></div>`;
  document.body.append(dlg);
  // the sheet shows every style's letters, so fetch the display faces once
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?' + [...new Set(THEMES.map(t => t.gf[0]))].map(f => 'family=' + f).join('&') + '&display=swap';
  document.head.append(l);
  dlg.querySelector('.aws-x').onclick = () => dlg.close();
  dlg.addEventListener('click', e => {
    if (e.target === dlg) return dlg.close();
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.page) show(t.dataset.page);
    else if (t.dataset.theme) { setTheme(t.dataset.theme); show('style'); head(); }
    else if (t.dataset.filter) { filter = t.dataset.filter; show('style'); }
    else if (t.dataset.avatar) { setProfile({avatar: t.dataset.avatar}); show('profile'); head(); }
    else if (t.dataset.color !== undefined) { setProfile({color: t.dataset.color}); show('profile'); head(); }
  });
  dlg.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.pref) setPref(t.dataset.pref, t.checked);
    else if (t.id === 'aws-dev') { try { localStorage.setItem('sandbox-developer', String(t.checked)); } catch {} }
  });
  dlg.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'aws-name') { setProfile({name: t.value.trim()}); head(); }
    else if (t.id === 'aws-music') {
      const v = Number(t.value) / 100; save('abbies-jukebox-v1', {...load('abbies-jukebox-v1', {}), volume: v});
      const a = document.getElementById('app-jukebox-audio'); if (a) a.volume = v;
    }
  });
  dlg.addEventListener('keydown', e => e.stopPropagation());
  dlg.addEventListener('pointerdown', e => e.stopPropagation());
}
export async function openSettings(page = 'profile') {
  if (!dlg) build();
  head(); show(page);
  if (!dlg.open) dlg.showModal();
  dlg.querySelector(`.aws-nav [data-page="${page}"]`)?.focus();
  if (!me) {
    try { const r = await fetch('/api/me', {cache: 'no-store'}); me = r.ok ? await r.json() : {signedIn: false, signInReady: false}; } catch { me = {signedIn: false, signInReady: false}; }
    head(); if (dlg.dataset.page === 'profile') show('profile');
  }
}
export const settingsOpen = () => !!dlg?.open;
window.AWSettings = {open: openSettings, setTheme, setPref, mountProfileButton};
