// The in-game corner button for profile and settings. The style picker, settings and profile now live in one sheet
// shared by every page (theme/aw.mjs, docs/design/look/LOOK.md "One theme system"); the styles are theme/themes.mjs,
// and app-style-presets.mjs serves them to the world (earth, air, timber) as before through data-app-style.
import {mountProfileButton} from '/theme/aw.mjs';
if (!document.getElementById('app-settings-toggle')) {
  const sheet = href => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.append(l); };
  if (!document.querySelector('link[href^="/app-style.css"]')) sheet('/app-style.css?v=sunroom-1');
  if (!document.getElementById('app-appearance-css')) { sheet('/app-appearance.css?v=2'); document.head.lastElementChild.id = 'app-appearance-css'; }
  const toggle = mountProfileButton(document.body, {size: 38});
  toggle.id = 'app-settings-toggle';
  toggle.title = 'Profile and settings';
  // pages that listened for the old picker still hear the style once on load
  queueMicrotask(() => window.dispatchEvent(new CustomEvent('app-style-change', {detail: {index: Number(document.documentElement.dataset.appStyle || 1) - 1, name: document.documentElement.dataset.appStyleName}})));
}
