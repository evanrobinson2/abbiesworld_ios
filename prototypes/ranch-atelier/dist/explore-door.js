// The door from the game to Explore (the library of models, cards, HUDs and reports). Loaded on every page by view-context.js;
// it sits with the feedback and workshop buttons on the left edge and is left out of Explore itself.
(() => {
  if (typeof document === 'undefined' || document.querySelector('.ex-door') || location.pathname.startsWith('/explore') || /^explore\./.test(location.hostname)) return;
  // Same host, so the door works on www, ranch and the vercel.app address alike; explore.abbies.world serves the same page.
  const href = '/explore';
  const css = document.createElement('style');
  css.textContent = `
  .ex-door{position:fixed;z-index:10010;left:12px;bottom:calc(env(safe-area-inset-bottom) + 228px);width:44px;height:44px;border-radius:50%;border:1px solid var(--app-border,#ded5b2);background:color-mix(in srgb,var(--app-paper,#fffcf0) 88%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 18px #2b281f2e;display:grid;place-items:center;color:var(--app-ink,#4c4330);transition:transform .45s cubic-bezier(.34,1.56,.64,1),box-shadow .3s}
  .ex-door svg{width:24px;height:24px;transition:transform .5s cubic-bezier(.34,1.56,.64,1)}
  .ex-door:hover{transform:scale(1.12);box-shadow:0 10px 26px #2b281f40}
  .ex-door:hover svg{transform:rotate(-12deg)}
  .ex-door:active{transform:scale(.88)}
  .ex-door.leaving{transform:scale(1.5);opacity:0;transition:transform .35s cubic-bezier(.5,0,.75,0),opacity .35s}
  @media (prefers-reduced-motion:reduce){.ex-door,.ex-door svg{transition:none}}`;
  const a = document.createElement('a');
  a.className = 'ex-door'; a.href = href; a.title = 'Explore'; a.setAttribute('aria-label', 'Explore the library of models, cards, HUDs and reports'); a.dataset.feedbackUi = '';
  // A little treasure chest: the library is where everything made for the world is kept.
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1H4z"/><path d="M4 11h16v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M10.5 11v3h3v-3"/><path d="M8 5.4V11M16 5.4V11"/></svg>';
  a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault(); a.classList.add('leaving'); setTimeout(() => { location.href = href; }, 300);
  });
  const add = () => { document.head.append(css); document.body.append(a); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, {once: true}); else add();
})();
