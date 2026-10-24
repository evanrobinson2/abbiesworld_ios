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

## Round 2: step into the tile, and talk to it (drafted)
Evan 2026-10-24 02:11Z: first person on a tile if he chooses, and a chat box to the AI gateway that organises or adjusts the assets on the tile from the database.

**Is it possible?** Mostly yes, built from what already exists: the AI Gateway (`openai/gpt-6-luna`, as `api/advisor.js`, `invent.js`, `ai-compose.js`), the wallet caps ($1 person, $100 public, $1000 owner; `lib/wallet.cjs`), the PG screen and live guard, sign-in, and `simulations/first-person.mjs`.
Missing before this round: any chat that edits a tile, and first person outside the sandbox (the preview copies the game's module, so there is still one implementation).

**Slice drafted**
- `simulations/tile-chat/contract.mjs`: the only verbs the chat may use (move, swap, add, remove, rotate, scale, restyle). Every edit is resolved against the model library and clamped to the hex, applied to a copy, and logged with the previous layout so each edit undoes. Removing and bringing in assets also feeds the taste learner.
- Free helper (no AI, no cost): plain phrases such as "remove the cow", "swap the house for a barn", "add 2 chickens", "make everything moon base", "undo". It says so when it cannot find a thing in the library.
- `api/tile-chat.js` (new, `TILE_CHAT_ENABLED=false` switches it off): same-origin, signed-in, PG screen, guard charged at `guardCall`, plan charged at `tileChatCall` ($0.01) before the Gateway is called. The AI returns words for the verbs only, never code or asset keys. Tests: `tests/tile-chat.test.cjs`.
- Preview: Step in (F) puts the camera at eye height on the tile; Chat opens the helper; each edit shows an Undo.

**Not working yet:** the AI path cannot be tried from the instant preview (static host, no game sign-in), so the preview falls back to the free helper and says so; the endpoint is merged but only goes live with the next Ranch deploy batch. First person was tested with stand-in shapes only. Edits live on the tile in memory and in the liked card; there is no server-side tile save yet. Not in the game: still a study, tour: false.
