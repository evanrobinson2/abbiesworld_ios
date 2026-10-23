// The app's left navigation (docs/design/look/LOOK.md, "App nav"): Studies, Models, Cards, Sounds and Play, with you at
// the bottom. It folds to a rail of icons and remembers; on a phone it is a drawer behind the menu button.
//   import {mountAppNav} from '/theme/appnav.mjs'; mountAppNav({current: 'models'});
import {mountProfileButton, getProfile, currentTheme} from './aw.mjs';
const I = {
  studies: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10l2 2h6.5A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/>',
  models: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  cards: '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
  sounds: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  fold: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16M15 10l-2 2 2 2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
const ITEMS = [['studies', 'Studies', '/studies/'], ['models', 'Models', '/models'], ['cards', 'Cards', '/cards'], ['sounds', 'Sounds', '/sounds'], ['play', 'Play', '/sandbox']];
export function mountAppNav({current = ''} = {}) {
  if (document.getElementById('aw-nav')) return document.getElementById('aw-nav');
  const r = document.documentElement;
  let folded = innerWidth < 1400; try { const v = localStorage.getItem('aw-nav-folded'); if (v) folded = v === 'true'; } catch {}
  const nav = document.createElement('nav');
  nav.id = 'aw-nav'; nav.setAttribute('aria-label', 'Abbie’s World');
  nav.innerHTML = `<a class="awn-mark" href="/studies/"><b>AW</b><span>Abbie’s World</span></a>
    <div class="awn-items">${ITEMS.map(([k, l, h]) => `<a href="${h}" class="awn-item"${k === current ? ' aria-current="page"' : ''} title="${l}">${svg(k)}<span>${l}</span></a>`).join('')}</div>
    <div class="awn-foot"><div class="awn-me"><span><b></b><small></small></span></div>
    <button type="button" class="awn-fold" aria-label="Fold the menu" title="Fold the menu">${svg('fold')}<span>Fold</span></button></div>`;
  const open = document.createElement('button');
  open.type = 'button'; open.className = 'awn-open'; open.setAttribute('aria-label', 'Menu'); open.innerHTML = svg('menu');
  document.body.prepend(nav, open);
  const me = nav.querySelector('.awn-me');
  me.prepend(mountProfileButton(me, {size: 34}));
  me.addEventListener('click', e => { if (!e.target.closest('.aw-me')) me.querySelector('.aw-me').click(); });
  const who = () => { const p = getProfile(); me.querySelector('b').textContent = p.name || 'You'; me.querySelector('small').textContent = currentTheme().name; };
  who(); for (const ev of ['aw-look-change', 'aw-profile-change', 'storage']) addEventListener(ev, who);
  const set = f => { folded = f; r.classList.toggle('awn-folded', f); try { localStorage.setItem('aw-nav-folded', String(f)); } catch {} };
  r.classList.add('has-awn'); set(folded);
  nav.querySelector('.awn-fold').onclick = () => { if (r.classList.contains('awn-drawer')) r.classList.remove('awn-drawer'); else set(!folded); };
  open.onclick = () => r.classList.toggle('awn-drawer');
  addEventListener('keydown', e => { if (e.key === 'Escape') r.classList.remove('awn-drawer'); });
  return nav;
}
