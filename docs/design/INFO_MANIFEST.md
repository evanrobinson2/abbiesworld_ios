# Scene information manifest

Each scene volunteers what it knows, so any UI, a bot or the voice controller can pick how to show it. The scene
doesn't draw its own HUD; it says what information exists, how it is structured, who it is for, and the ways it could
be shown across the five modes. Code: `prototypes/ranch-atelier/dist/simulations/presentation-layer.mjs` on the live
branch (`volunteer`, `readManifest`, `window.RanchInfo`). Principles: `CLAUDE.md`, "How Abbie's World shows information".

Evan (2026-10-23): strongly support diegetic transmission of simulation information; prefer overlays for quick hits.
Each scene could volunteer a list of panels, how the information is structured, suggestions on how it could be
displayed, and even helper vector or SVG representations.

## Shape

```js
volunteer('coffee-shop', {
  place: 'coffee shop',
  dialect: 'playful-tense',            // the place's accent on the shared grammar
  items: [{
    id: 'rush',
    says: 'the morning rush',          // what a player would call it, never an internal name
    kind: 'level',                     // level | count | state | event | list | timer | place | ledger
    who: 'characters',                 // characters know it, or only the player knows it
    for: ['player', 'director'],       // audiences: player (the child), grown-up (parent/owner view), director (AI)
    read: () => shop.rush,             // current value, structured (number, object, list)
    prefer: ['diegetic', 'meta'],      // best first; none | diegetic | spatial | meta | overlay
    ways: {                            // one suggestion per mode it supports
      diegetic: 'queue out the door; the bell over the door rings faster',
      meta: 'music lifts a step; a little steam puffs at the screen corners',
      overlay: 'a cup that fills (quick hit only)'
    },
    glyph: '<svg viewBox="0 0 24 24">…</svg>'   // optional helper vector for overlay or spatial use
  }, {
    id: 'income', says: 'income statement', kind: 'ledger', who: 'player', for: ['grown-up'],
    read: () => shop.ledger,           // {revenue, costs: {espressoMachine: 5000, …}, net}
    prefer: ['overlay'], ways: {overlay: 'ledger page in the grown-up workbench'}
  }]
});
```

## Rules the validator checks

- Every item has `says`, `who` and at least one `prefer` mode, and a `ways` entry for each preferred mode except none.
- If the characters know it, it can't lead with overlay: lead with diegetic or none.
- Grown-up only items live in the grown-up view (overlay or none), never in the world or over play. Abbie never sees
  the income statement; she feels the rush. Evan sees she spent $5K on a new espresso machine.
- `readManifest(sceneId, {audience})` returns only the items for that audience, with their current values.

## Who consumes it

- The play HUD picks at most a few `player` items and shows them in their preferred mode, within the 8% budget.
- The grown-up workbench lists `grown-up` items (ledgers, logs, statistics) as pages, away from play.
- The voice controller and AI directors read `director` and `player` items instead of scraping the screen.
- Sandbox v2 is the first consumer.
