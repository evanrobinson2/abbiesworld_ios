# Context engineering card

Evan, 2026-10-23: every study shows, on its right side, the context it was engineered from: Oracle consultation,
game dev blogs, game design blogs and game design tutorials (plus research, our canon and references). Org-wide.

- Data: `prototypes/ranch-atelier/dist/studies/context.json`. One entry per study id (the ids in `studies/index.html`).
  Each item is `{k, t, href, note}` with `k` one of the `kinds`. A study can `use` a shared digest (for example
  `blender-techniques`) or be the `same` as another study. The four kinds Evan named always show; an empty one reads
  "None recorded".
- Studies site: the right panel's **Context** tab (`look/context-card.mjs`, `look/context-card.css`).
- A study page opened on its own: `<script type="module" src="/look/context-card.mjs" data-context-study="ID"></script>`.
- Artifacts: `node tools/context-card/snippet.mjs ID` prints the same card as static HTML to paste into the artifact.
- New study: add its entry in the PR that ships it, as you work (the Oracle records you consulted, every blog, talk
  and tutorial you read, the canon docs you followed).
