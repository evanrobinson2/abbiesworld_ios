// One theme system (docs/design/look/LOOK.md, "One theme system"). Load this first in <head>, as a plain script, so a
// page paints in the chosen style with no flash. It writes the style's tokens on <html>: the --aw-* names every new
// piece reads, plus the older names the existing pages already use (--app-* everywhere; look.css and study names when
// <html data-aw-skin="look study"> asks for them). The style and settings are chosen in theme/aw.mjs and kept in
// localStorage 'aw-look'; every open page and study frame follows a change at once.
(() => {
  const r = document.documentElement, KEY = 'aw-look';
  const ABBIE = {id: 'abbie', index: 0, name: 'Abbie', kind: 'light', feel: 'flat', display: 'Roboto', body: 'Roboto', gf: ['Roboto:wght@400;500;700;900'], radius: '16px',
    bg: '#f3eee3', surface: '#fbf8f2', raised: '#ffffff', ink: '#2b2218', soft: '#6b5d4c', line: '#e2d8c6', accent: '#7a5236', onAccent: '#ffffff', accent2: '#2f8b87', earth: '#bcc491', air: '#9ebfc1', timber: '#c67b4e'};
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const mix = (a, n, b = 'transparent') => `color-mix(in srgb,${a} ${n}%,${b})`;
  function tokens(t = ABBIE, p = {}) {
    const dark = t.kind === 'dark', fam = n => `'${n}'`;
    const font = (p.readable ? fam('Atkinson Hyperlegible') : fam(t.body)) + ",system-ui,-apple-system,'Segoe UI',sans-serif";
    const display = (p.readable ? fam('Atkinson Hyperlegible') : fam(t.display)) + ',' + font;
    const mono = "'IBM Plex Mono',ui-monospace,Menlo,monospace";
    const soft = p.contrast ? t.ink : t.soft, line = p.contrast ? mix(t.ink, 55) : t.line;
    const edge = mix(t.accent, 30, t.line), toy = t.feel === 'toy';
    const shadow = toy ? `0 5px 0 ${edge},0 18px 30px -14px rgba(0,0,0,${dark ? .6 : .3})` : `0 1px 2px rgba(0,0,0,${dark ? .3 : .07}),0 12px 30px -18px rgba(0,0,0,${dark ? .7 : .35})`;
    const base = {'--aw-bg': t.bg, '--aw-surface': t.surface, '--aw-raised': t.raised, '--aw-ink': t.ink, '--aw-soft': soft, '--aw-line': line,
      '--aw-accent': t.accent, '--aw-on-accent': t.onAccent, '--aw-accent2': t.accent2, '--aw-earth': t.earth, '--aw-air': t.air, '--aw-timber': t.timber,
      '--aw-font': font, '--aw-display': display, '--aw-mono': mono, '--aw-radius': t.radius, '--aw-shadow': shadow, '--aw-edge': edge,
      '--aw-glass': p.solid ? t.surface : mix(t.surface, dark ? 74 : 62), '--aw-rim': dark ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.82)',
      '--app-canvas': t.bg, '--app-paper': t.surface, '--app-ink': t.ink, '--app-muted': soft, '--app-border': line, '--app-accent': t.accent,
      '--app-focus': t.accent, '--app-on-accent': t.onAccent, '--app-radius': t.radius, '--app-font': font, '--app-heading': display,
      '--b3-panel': t.surface, '--b3-text': t.ink, '--b3-quiet': soft, '--b3-gold': t.accent};
    const look = {'--bg': t.bg, '--surface': t.surface, '--line': line, '--ink': t.ink, '--ink-soft': soft, '--sign': t.accent, '--active': t.accent2,
      '--font': font, '--display': display, '--radius': t.radius, '--shadow': shadow, '--sky-top': t.air, '--sky-low': t.bg, '--tile': t.surface,
      '--tile-edge': edge, '--signc': t.accent, '--hill': t.earth, '--hill-far': mix(t.earth, 55, t.bg)};
    const study = {'--fg': t.ink, '--muted': soft, '--soft': soft, '--panel': t.raised, '--paper': t.surface, '--rule': line, '--accent': t.accent,
      '--body': font, '--mono': mono, '--dusk': t.bg, '--deep': t.surface, '--lift': t.raised, '--sun': t.accent, '--teal-soft': mix(t.accent2, 16), '--spine': t.accent};
    return {base, look, study};
  }
  let applied = [];
  function apply(state = read()) {
    const t = state.theme && state.theme.bg ? state.theme : ABBIE, p = state.prefs || {};
    const skin = (r.dataset.awSkin || '').split(/\s+/), set = tokens(t, p);
    const vars = Object.assign({}, set.base, skin.includes('look') ? set.look : {}, skin.includes('study') ? set.study : {});
    applied.forEach(k => { if (!(k in vars)) r.style.removeProperty(k); });
    for (const k in vars) r.style.setProperty(k, vars[k]);
    applied = Object.keys(vars);
    r.style.colorScheme = t.kind === 'dark' ? 'dark' : 'light';
    r.dataset.awTheme = t.id; r.dataset.awKind = t.kind; r.dataset.awFeel = t.feel;
    r.dataset.appStyle = String((t.index || 0) + 1); r.dataset.appStyleName = t.name;
    if (skin.includes('look')) r.dataset.mode = t.feel === 'toy' ? 'game' : 'app';
    const reduce = p.reduceMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    [['aw-reduce-motion', reduce], ['aw-big-text', p.bigText], ['aw-contrast', p.contrast], ['aw-solid', p.solid], ['aw-readable', p.readable]].forEach(([c, on]) => r.classList.toggle(c, !!on));
    const fams = [...(t.gf || []), ...(p.readable ? ['Atkinson+Hyperlegible:wght@400;700'] : []), ...(skin.includes('study') ? ['IBM+Plex+Mono:wght@400;500'] : [])];
    let link = document.getElementById('aw-fonts');
    if (!link) { link = document.createElement('link'); link.id = 'aw-fonts'; link.rel = 'stylesheet'; document.head.append(link); }
    const href = 'https://fonts.googleapis.com/css2?' + fams.map(f => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap';
    if (link.href !== href) link.href = href;
    window.AWLook.state = {theme: t, prefs: p};
    return window.AWLook.state;
  }
  window.AWLook = {KEY, ABBIE, read, tokens, apply, state: null};
  if (!document.querySelector('link[data-aw-css]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/theme/aw.css?v=2'; l.dataset.awCss = ''; document.head.append(l); }
  apply();
  // Mute: every sound that starts playing on this page starts muted.
  document.addEventListener('play', e => { if (window.AWLook.state?.prefs?.mute && e.target && 'muted' in e.target) e.target.muted = true; }, true);
  addEventListener('storage', e => { if (e.key === KEY) { const s = apply(); dispatchEvent(new CustomEvent('aw-look-change', {detail: s})); dispatchEvent(new CustomEvent('app-style-change', {detail: {index: s.theme.index || 0, name: s.theme.name}})); } });
})();
