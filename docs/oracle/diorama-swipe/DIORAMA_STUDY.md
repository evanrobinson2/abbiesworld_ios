# AW-STUDY-0060 Hot dog, not hot dog: the swipe-to-rate diorama builder

Status: **drafted** (preview page, not in the game). Evan, 2026-10-24 01:39Z: arrow left if I like, right if I hate;
3D card tiles along the bottom, and he builds a world from the ones he likes; the generator learns which assets a human prefers.

Preview: https://app.abbies.world/r2/previews/diorama-swipe/index.html (source `preview/diorama-swipe/`).

## What it does
- Generates small hex dioramas from the model library (668 usable models from `dist/models/library.json`, rebuilt by
  `tools/diorama-swipe/build_data.py`). Five decks: by setting, by role, by scale, odd couples (two places), upgrade pass.
- Arrow-left = liked ("hot dog"), arrow-right = hated ("not hot dog"), also swipe, also two buttons. The legend is always on
  screen; the "⇄" chip flips the direction in one tap (Tinder habit costs nothing). Z undoes, B toggles the board.
- A liked diorama becomes a hex tile card in the bottom row. Tap a card to put it on the board; the board is a hex grid of
  the tiles he picked (tap one there to take it off). Putting a tile on the board counts as a stronger like.
- Models load from ranch.abbies.world; any model that fails to load stays as a coloured stand-in shape, so the page never breaks.
  `?offline` forces stand-ins, `?base=` points at another host.

## How it learns (`preview/diorama-swipe/engine.mjs`)
Every vote is replayed into Beta counts per asset, per group (kind, place, place+kind, collection, source, pass) and per
asset pair. An asset with few votes borrows its groups' rate as a prior. The next batch (5 at a time, 70% best guess, 30%
random pool picks, plus 18% of slots ignoring taste) is built by Thompson sampling with a pair bonus. The Taste drawer shows the
hot dog rate per 10 votes with the generator's own guess as a tick, the assets and kinds it has learned, and a "pretend human"
demo. `node tools/diorama-swipe/test.mjs`: against a hidden taste the hot dog rate goes from about 40% (first batch) to 80%
(last 50 votes) while the no-learning control stays near 44%.

## The vote file (portable on purpose)
`{format:"aw-diorama-votes", version:1, study, direction, votes:[{id, deck, label, keys[], guess, vote:"liked"|"hated", t, batch, placed?, dio?}], board:[ids]}`.
It says liked/hated, never left/right. Download, copy and import buttons are in the Taste drawer, so another calibration game
(ChatGPT is building one) can write the same shape, or be imported with a small mapper. Votes live in localStorage on the device.

## Honest decisions and what is next
- Votes are **local first**. No sync yet: the preview host is static. Next step, once Evan agrees, is committing exports under
  `data/diorama-votes/` or an API route on the Ranch project; no paid AI call is involved anywhere (no `wallet().charge` needed).
- The tile cards are 3D snapshots of the diorama on hex cards, not the Winchester hand's own card component (that needs the
  live town scene). Wiring them to `town-tiles.mjs` is a follow-up.
- Roles are the library's `type` and `place`, not yet the Winchester inventory roles.
- Not in the game: no scene or passing in-game test yet, so per the invariants it stays a study. Next: play the top-rated
  dioramas as real tiles behind `?exp=diorama`. Tour: **false** (study only). No sounds, no MIDI.
- Rebuild the page after editing the template: `python3 tools/diorama-swipe/build_page.py`.
